'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import KpiCard from '@/app/canales/mall/components/KpiCard'
import PipelineDonut from '@/app/canales/mall/components/PipelineDonut'
import { useAnim } from '@/app/canales/mall/hooks/useAnim'
import { getSedeColor } from '@/lib/constants'
import FunnelBars, { type FunnelStageView } from './components/FunnelBars'
import MentorTable, { type MentorRowView } from './components/MentorTable'
import BreakdownTable, { type BreakdownRowView } from './components/BreakdownTable'

// ─── Tokens (mismo bloque que VentasDashboard / FinanceDashboard) ────────────
const BLUE = '#1D429B', NAVY = '#21274E', ORANGE = '#F89B24'
const GREEN = '#1E9E62', GREY = '#6B7388'
const BORDER = '#E7ECF6'
const SHADOW_MD = '0 8px 24px rgba(33,39,78,0.10)'
const PAGE_BG = `
  radial-gradient(1100px 520px at 12% -8%, #E2EAFB 0%, transparent 60%),
  radial-gradient(900px 480px at 100% 4%, #FBE9D0 0%, transparent 55%),
  linear-gradient(180deg, #EEF2F9 0%, #E9EDF6 100%)`
const SANS = "'Montserrat', sans-serif"
const DISPLAY = "'Bebas Neue', sans-serif"

const CARD: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 24, boxShadow: SHADOW_MD,
  padding: '26px 28px', fontFamily: SANS,
}
const EYEBROW: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: BLUE, marginBottom: 4,
}
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: NAVY, marginBottom: 8,
}
const ACCENT_RULE: React.CSSProperties = {
  width: 72, height: 3, borderRadius: 999, background: ORANGE,
  boxShadow: '0 0 8px rgba(248,155,36,.5)', marginBottom: 20,
}

// El glass vive solo en la barra de filtros — regla del design system:
// nada de glass sobre blanco.
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.38)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 8px 30px rgba(33,39,78,0.16), inset 0 1px 1px rgba(255,255,255,0.85), inset 0 -1px 2px rgba(33,39,78,0.06)',
}

const SOURCE_HUES = ['#1D429B', '#F89B24', '#22C7E6', '#1FD79B', '#9B6BFF', '#FF5D6C', '#5B8CFF', '#8A8A8F']

// ─── Tipos de la respuesta del API ──────────────────────────────────────────
interface SourceRowView {
  source: string; llamados: number; citados: number; asistieron: number; salesTeam: number
}
interface Kpis {
  llamados: number; citados: number; asistieron: number; conReunion: number
  tasaCita: number | null; showRate: number | null; noShows: number
  citadosDesdeVentana: number; coberturaVentana: number | null; fastTrack: number
  presentesEnFecha: number; presentesCitadosAqui: number
  graduados: number; conVenta: number
  tasaGraduacion: number | null; tasaPrimeraVenta: number | null
  diasMedianosPrimeraVenta: number | null
}
interface AnchorWindow {
  solarFrom?: string; solarTo?: string
  llamadoFrom?: string; llamadoTo?: string
  lookbackDays: number
}
interface Summary {
  dataSource: 'redshift' | 'fixture' | 'none'
  window: AnchorWindow | null
  lastDate: string | null
  total: number
  universo: number
  options: { sedes: string[]; horarios: string[]; sources: string[]; formularios: string[]; solarDates: SolarDate[] }
  kpis: Kpis | null
  funnel: FunnelStageView[]
  sources: SourceRowView[]
  breakdown: { source: BreakdownRowView[]; sede: BreakdownRowView[]; formulario: BreakdownRowView[] }
  mentores: MentorRowView[]
  outcomesDisponibles: boolean
  sesionesColapsadas: boolean
}

const LOOKBACK_OPTIONS = [7, 14, 21, 30]

function fmtFecha(iso?: string): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${Number(d)} ${meses[Number(m) - 1]}`
}

type PieMode = 'citados' | 'asistieron'
interface SolarDate { date: string; asistieron: number }

/** Piso para considerar una fecha un Solar real y no una sesión suelta. */
const SOLAR_MIN_ASISTENTES = 5

type BreakdownDim = 'source' | 'sede' | 'formulario'
const DIM_LABEL: Record<BreakdownDim, string> = { source: 'Source', sede: 'Localidad', formulario: 'Formulario' }

export default function ReclutamientoDashboard() {
  const rootRef = useRef<HTMLDivElement>(null)
  const animOn = useAnim(rootRef)

  const [sede, setSede] = useState('')
  const [horario, setHorario] = useState('')
  const [source, setSource] = useState('')
  const [formulario, setFormulario] = useState('')
  // Un solo ancla: el rango del Solar. Arranca vacío y se fija al último Solar
  // con asistencia en cuanto llegan las opciones.
  const [solar, setSolar] = useState({ from: '', to: '' })
  const [lookback, setLookback] = useState(7)
  const [anchored, setAnchored] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [pieMode, setPieMode] = useState<PieMode>('citados')
  const [dim, setDim] = useState<BreakdownDim>('source')

  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams()
    if (sede) qs.set('sede', sede)
    if (horario) qs.set('horario', horario)
    if (source) qs.set('source', source)
    if (formulario) qs.set('formulario', formulario)
    if (solar.from) qs.set('solarFrom', solar.from)
    if (solar.to) qs.set('solarTo', solar.to)
    qs.set('lookbackDays', String(lookback))

    // Cancelamos la respuesta anterior: cambiar filtros rápido podía dejar en
    // pantalla el resultado de un fetch más viejo que llegó después.
    const ac = new AbortController()

    const run = async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/reclutamiento/summary?${qs}`, { signal: ac.signal })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
        setData(j as Summary)
        setError(null)
      } catch (e: unknown) {
        if ((e as Error).name === 'AbortError') return
        setError((e as Error).message)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }
    run()

    return () => ac.abort()
  }, [sede, horario, source, formulario, solar, lookback])

  // Sin ancla el header no dice nada útil, así que nos paramos en el último
  // Solar con volumen real. Ojo: NO la fecha máxima — la data trae fechas
  // sueltas de 1–2 personas (alguien que tomó la academia fuera de cadencia) y
  // anclar ahí abría el dashboard en un funnel de 1.
  useEffect(() => {
    if (anchored) return
    const fechas = data?.options.solarDates
    if (!fechas?.length) return
    const d = fechas.find(x => x.asistieron >= SOLAR_MIN_ASISTENTES)?.date ?? fechas[0].date
    setAnchored(true)
    setSolar({ from: d, to: d })
  }, [data, anchored])

  const pieSegments = useMemo(() => {
    if (!data?.sources) return []
    const key = pieMode === 'citados' ? 'citados' as const : 'asistieron' as const
    return data.sources
      .map((s, i) => ({ name: s.source, value: s[key], color: SOURCE_HUES[i % SOURCE_HUES.length] }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [data, pieMode])

  const filtrosActivos = [sede, horario, source, formulario].filter(Boolean).length + (lookback !== 7 ? 1 : 0)

  const pieTotal = pieSegments.reduce((a, s) => a + s.value, 0)

  // Sin la columna «Presencial o Virtual» todo cae en "Sin sede": la tabla
  // renderiza igual pero con una sola fila, así que conviene avisarlo.
  const sedeSinDatos = useMemo(() => {
    const rows = data?.breakdown?.sede ?? []
    return rows.length <= 1 && (data?.options.sedes ?? []).every(x => x === 'Sin sede')
  }, [data])
  const k = data?.kpis

  const resetFilters = () => {
    setSede(''); setHorario(''); setSource(''); setFormulario('')
    setLookback(7)
    const fechas = data?.options.solarDates ?? []
    const d = fechas.find(x => x.asistieron >= SOLAR_MIN_ASISTENTES)?.date ?? fechas[0]?.date
    setSolar(d ? { from: d, to: d } : { from: '', to: '' })
  }

  return (
    <div
      ref={rootRef}
      className="-mx-4 -mt-6 px-4 pb-16 min-h-screen"
      style={{ background: PAGE_BG, backgroundAttachment: 'fixed', fontFamily: SANS }}
    >
      {/* ── Encabezado ── */}
      <div style={{ paddingTop: 30, marginBottom: 18 }}>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 1, margin: 0 }}>
          <span style={{ color: NAVY }}>Reclutamiento </span>
          <span style={{ color: ORANGE }}>Solar Academy</span>
        </h1>
        <p style={{ color: GREY, fontSize: 13.5, marginTop: 8 }}>
          Del primer llamado a la primera venta.
          {data && (
            <>
              {' · '}
              <strong style={{ color: NAVY }}>{data.total.toLocaleString('en-US')}</strong> de{' '}
              {data.universo.toLocaleString('en-US')} records
              {data.dataSource === 'fixture' && (
                <span style={{
                  marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#fff',
                  background: ORANGE, borderRadius: 999, padding: '2px 10px',
                }}>
                  fixture CSV — Redshift no disponible
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* ── Barra de filtros liquid glass (sticky) ── */}
      <div style={{ position: 'sticky', top: 16, zIndex: 50, marginBottom: 22 }}>
        <div style={{ ...GLASS, borderRadius: 26, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Lo plegable: todo menos la fila de Solares, que es el control
              principal y se queda siempre a la vista. */}
          {filtrosAbiertos && (
          <>
          {/* Pills de sede */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>Sede</span>
            <Pill label="Todas" on={!sede} onClick={() => setSede('')} />
            {data?.options.sedes.map(s => (
              <Pill key={s} label={s} on={sede === s} onClick={() => setSede(s)} dot={getSedeColor(s)} />
            ))}
          </div>

          {/* Horario + source + reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>Horario</span>
            <Pill label="Todos" on={!horario} onClick={() => setHorario('')} small />
            {data?.options.horarios.map(h => (
              <Pill key={h} label={h} on={horario === h} onClick={() => setHorario(h)} small />
            ))}

            <span style={{ width: 1, height: 22, background: 'rgba(33,39,78,.14)', margin: '0 4px' }} />

            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>Source</span>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              style={{
                border: `1px solid ${BORDER}`, borderRadius: 999, padding: '6px 12px',
                fontSize: 12.5, fontFamily: SANS, background: '#fff', color: NAVY, fontWeight: 600,
              }}
            >
              <option value="">Todos</option>
              {data?.options.sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>Formulario</span>
            <select
              value={formulario}
              onChange={e => setFormulario(e.target.value)}
              title="Por cuál formulario se registró la persona. Es un eje de atribución aparte del source, no una sede."
              style={{
                border: `1px solid ${BORDER}`, borderRadius: 999, padding: '6px 12px',
                fontSize: 12.5, fontFamily: SANS, background: '#fff', color: NAVY, fontWeight: 600,
              }}
            >
              <option value="">Todos</option>
              {data?.options.formularios.map(x => <option key={x} value={x}>{x}</option>)}
            </select>

            <button
              onClick={resetFilters}
              style={{
                marginLeft: 'auto', border: 'none', background: 'transparent',
                color: BLUE, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: SANS,
              }}
            >
              Limpiar filtros
            </button>
          </div>

          {/* Un solo ancla de fecha: el Solar Academy. La ventana de llamadas se
              deriva de ella, así que la misma fecha siempre da el mismo número
              (antes cambiaba según en qué campo la pusieras). */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
            <DateRange
              label="Fecha del Solar"
              value={solar}
              onChange={v => { setAnchored(true); setSolar(v) }}
              hint="ancla todo el funnel"
            />

            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase', marginBottom: 5 }}>
                Ventana de llamadas
              </div>
              <select
                value={lookback}
                onChange={e => setLookback(Number(e.target.value))}
                style={{
                  border: `1px solid ${BORDER}`, borderRadius: 10, padding: '5px 10px',
                  fontSize: 12, fontFamily: SANS, background: '#fff', color: NAVY, fontWeight: 600,
                }}
              >
                {LOOKBACK_OPTIONS.map(d => <option key={d} value={d}>{d} días antes</option>)}
              </select>
            </div>

            {/* Qué se está contando, explícito: si el usuario no ve la ventana
                derivada no puede confiar en el primer número del funnel. */}
            {data?.window && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 3 }}>
                <WindowChip
                  label="Llamadas"
                  value={`${fmtFecha(data.window.llamadoFrom)} → ${fmtFecha(data.window.llamadoTo)}`}
                />
                <WindowChip
                  label="Solar"
                  value={data.window.solarFrom === data.window.solarTo
                    ? fmtFecha(data.window.solarFrom)
                    : `${fmtFecha(data.window.solarFrom)} → ${fmtFecha(data.window.solarTo)}`}
                />
              </div>
            )}
          </div>

          </>
          )}

          {/* Atajos a cada Solar — siempre visibles */}
          {!!data?.options.solarDates?.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>
                Solares
              </span>
              {data.options.solarDates
                .filter(x => x.asistieron >= SOLAR_MIN_ASISTENTES)
                .slice(0, 8)
                .map(x => (
                  <Pill
                    key={x.date}
                    label={`${fmtFecha(x.date)} · ${x.asistieron}`}
                    on={solar.from === x.date && solar.to === x.date}
                    onClick={() => { setAnchored(true); setSolar({ from: x.date, to: x.date }) }}
                    small
                  />
                ))}
              <Pill
                label="Últimos 3 meses"
                on={!solar.from && !solar.to}
                onClick={() => { setAnchored(true); setSolar({ from: '', to: '' }) }}
                small
              />

              <button
                onClick={() => setFiltrosAbiertos(o => !o)}
                style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: '1px solid rgba(33,39,78,.14)', background: 'rgba(255,255,255,0.55)',
                  borderRadius: 999, padding: '6px 14px', cursor: 'pointer',
                  fontFamily: SANS, fontSize: 12, fontWeight: 700, color: '#3A4156',
                }}
                aria-expanded={filtrosAbiertos}
              >
                {filtrosAbiertos ? 'Ocultar filtros' : 'Más filtros'}
                {filtrosActivos > 0 && !filtrosAbiertos && (
                  <span style={{
                    background: BLUE, color: '#fff', borderRadius: 999,
                    padding: '1px 7px', fontSize: 10.5, fontWeight: 800,
                  }}>{filtrosActivos}</span>
                )}
                <span style={{
                  display: 'inline-block', transition: 'transform .2s ease',
                  transform: filtrosAbiertos ? 'rotate(180deg)' : 'none', fontSize: 10,
                }}>▾</span>
              </button>
            </div>
          )}

          {/* Plegado: qué filtros quedan activos, para no perderlos de vista */}
          {!filtrosAbiertos && filtrosActivos > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              {sede && <ActiveChip label={sede} onClear={() => setSede('')} />}
              {horario && <ActiveChip label={horario} onClear={() => setHorario('')} />}
              {source && <ActiveChip label={source} onClear={() => setSource('')} />}
              {formulario && <ActiveChip label={formulario} onClear={() => setFormulario('')} />}
              {lookback !== 7 && <ActiveChip label={`${lookback} días antes`} onClear={() => setLookback(7)} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Estados ── */}
      {loading && (
        <div style={{ ...CARD, textAlign: 'center', color: GREY }}>Cargando…</div>
      )}
      {error && (
        <div style={{ ...CARD, borderLeft: `4px solid #D64545`, color: '#D64545' }}>
          No se pudo cargar: {error}
        </div>
      )}
      {!loading && !error && data?.dataSource === 'none' && (
        <div style={{ ...CARD }}>
          <p style={EYEBROW}>Esperando el ETL</p>
          <h2 style={SECTION_TITLE}>Sin fuente de datos</h2>
          <div style={ACCENT_RULE} />
          <p style={{ color: GREY, fontSize: 13.5, lineHeight: 1.6, maxWidth: 620 }}>
            El módulo <strong>Sales Recruitment</strong> todavía no está en el warehouse como{' '}
            <code>dw_zoho.dim_sales_recruitment</code>, y la API de Zoho está cerrada por permiso
            de perfil. Ver <code>scripts/ETL-REQUEST-sales-recruitment.md</code>.
            <br /><br />
            Para desarrollar mientras tanto, exportá el módulo desde Zoho y guardá el CSV en{' '}
            <code>data/recruitment-seed.csv</code>.
          </p>
        </div>
      )}

      {!loading && !error && k && data && data.dataSource !== 'none' && (
        <>
          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 22 }}>
            <KpiCard
              label="Tasa de cita" color={BLUE} glow={BLUE} animOn={animOn}
              isGauge gaugePct={(k.tasaCita ?? 0) / 100}
              sub={`${k.citados.toLocaleString('en-US')} citados · ${k.llamados.toLocaleString('en-US')} llamadas en la ventana`}
            />
            <KpiCard
              label="Show rate" color={GREEN} glow={GREEN} animOn={animOn}
              isGauge gaugePct={(k.showRate ?? 0) / 100}
              sub={`${k.asistieron.toLocaleString('en-US')} asistieron · ${k.noShows.toLocaleString('en-US')} no-shows${k.fastTrack ? ` · ${k.fastTrack} fast-track` : ''}`}
            />
            <KpiCard
              label="Tasa de graduación" color={ORANGE} glow={ORANGE} animOn={animOn}
              isGauge gaugePct={(k.tasaGraduacion ?? 0) / 100}
              sub={data.outcomesDisponibles
                ? `${k.graduados.toLocaleString('en-US')} de ${k.asistieron.toLocaleString('en-US')} promovidos a Consultor`
                : 'requiere el link a Sales Team'}
            />
            <KpiCard
              label="Con primera venta" color="#9B6BFF" glow="#9B6BFF" animOn={animOn}
              isGauge gaugePct={(k.tasaPrimeraVenta ?? 0) / 100}
              sub={data.outcomesDisponibles
                ? `${k.conVenta.toLocaleString('en-US')} de ${k.asistieron.toLocaleString('en-US')} vendieron · mediana ${k.diasMedianosPrimeraVenta ?? '—'} días`
                : 'requiere el link a Sales Team'}
            />
          </div>

          {/* ── Sources (izq) + Funnel (der) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 2fr) minmax(320px, 3fr)', gap: 16, marginBottom: 22 }}>

            {/* Pie de sources */}
            <div style={CARD}>
              <p style={EYEBROW}>Por fuente de reclutamiento</p>
              <h2 style={SECTION_TITLE}>Sources</h2>
              <div style={ACCENT_RULE} />

              <div style={{ display: 'flex', background: '#EEF3FD', borderRadius: 999, padding: 4, gap: 2, marginBottom: 18, width: 'fit-content' }}>
                {(['citados', 'asistieron'] as PieMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setPieMode(m)}
                    style={{
                      border: 'none', borderRadius: 999, padding: '7px 18px', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 600, fontFamily: SANS,
                      transition: 'all .25s ease',
                      color: pieMode === m ? '#fff' : BLUE,
                      background: pieMode === m ? 'linear-gradient(180deg, #3D6BFF, #1D429B)' : 'transparent',
                      boxShadow: pieMode === m ? '0 4px 14px rgba(61,107,255,0.35)' : 'none',
                    }}
                  >
                    {m === 'citados' ? 'Citados al Solar' : 'Llegaron al Solar'}
                  </button>
                ))}
              </div>

              {pieTotal > 0
                ? <PipelineDonut segments={pieSegments} total={pieTotal} animOn={animOn} />
                : <p style={{ color: GREY, fontSize: 13 }}>Sin datos para este corte.</p>}
            </div>

            {/* Funnel */}
            <div style={CARD}>
              <p style={EYEBROW}>Anclado en la fecha del Solar</p>
              <h2 style={SECTION_TITLE}>Conversion funnel</h2>
              <div style={ACCENT_RULE} />
              <FunnelBars stages={data.funnel} animOn={animOn} />

              {/* El puente honesto: si la ventana cubre poco, el primer
                  porcentaje del funnel se está comparando contra llamadas que
                  no produjeron estas citas. */}
              {k.coberturaVentana !== null && (
                <div style={{
                  marginTop: 18, padding: '12px 14px', borderRadius: 14,
                  background: k.coberturaVentana >= 70 ? '#F2FAF6' : '#FFF8EE',
                  border: `1px solid ${k.coberturaVentana >= 70 ? '#CDEBDC' : '#F6E2C2'}`,
                }}>
                  <p style={{ fontSize: 11.5, color: NAVY, lineHeight: 1.5, margin: 0 }}>
                    <strong>{k.citadosDesdeVentana.toLocaleString('en-US')}</strong> de los{' '}
                    <strong>{k.citados.toLocaleString('en-US')}</strong> citados
                    {' '}({k.coberturaVentana.toFixed(0)}%) salieron de llamadas dentro de esta ventana
                    de {data.window?.lookbackDays} días.
                    {k.coberturaVentana < 70 && ' El resto viene de llamadas más viejas — ampliá la ventana para que la tasa de cita compare poblaciones parecidas.'}
                  </p>
                </div>
              )}

              {/* Hay Solares fuera de la cadencia semanal a los que llega gente
                  citada para otro día. El funnel sigue a la cohorte citada, así
                  que esos no salen ahí — pero conviene verlos. */}
              {k.presentesEnFecha > k.presentesCitadosAqui && (
                <div style={{
                  marginTop: 10, padding: '12px 14px', borderRadius: 14,
                  background: '#F4F6FC', border: '1px solid #DFE6F4',
                }}>
                  <p style={{ fontSize: 11.5, color: NAVY, lineHeight: 1.5, margin: 0 }}>
                    Ese día estuvieron presentes <strong>{k.presentesEnFecha}</strong> personas, pero
                    solo <strong>{k.presentesCitadosAqui}</strong> estaban citadas para este Solar
                    — el resto venía citado de otra fecha. El funnel sigue a los citados, así que
                    esos {k.presentesEnFecha - k.presentesCitadosAqui} aparecen en el Solar para el
                    que sí fueron citados.
                  </p>
                </div>
              )}

              <p style={{ fontSize: 10.5, color: '#8A8A8F', marginTop: 14, lineHeight: 1.5 }}>
                El funnel sigue a la cohorte <strong>citada para este Solar</strong>: de esos,
                cuántos aparecieron y cuántos llegaron a la reunión con mentor.{' '}
                {data.sesionesColapsadas
                  ? 'Las cuatro sesiones (Oportunidad, Training I, Training II, Crea y Max) se sellan el mismo día en este rango, así que cuentan como una etapa.'
                  : 'En este rango las cuatro sesiones cayeron en fechas distintas, así que cada una se muestra con su propia caída — el formato del Solar cambió a un solo día en 2026.'}
              </p>
            </div>
          </div>

          {/* ── Desglose por dimensión ── */}
          <div style={{ ...CARD, marginBottom: 22 }}>
            <p style={EYEBROW}>El mismo funnel, abierto</p>
            <h2 style={SECTION_TITLE}>Desglose</h2>
            <div style={ACCENT_RULE} />

            <div style={{ display: 'flex', background: '#EEF3FD', borderRadius: 999, padding: 4, gap: 2, marginBottom: 18, width: 'fit-content' }}>
              {(['source', 'sede', 'formulario'] as BreakdownDim[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDim(d)}
                  style={{
                    border: 'none', borderRadius: 999, padding: '7px 18px', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 600, fontFamily: SANS,
                    transition: 'all .25s ease',
                    color: dim === d ? '#fff' : BLUE,
                    background: dim === d ? 'linear-gradient(180deg, #3D6BFF, #1D429B)' : 'transparent',
                    boxShadow: dim === d ? '0 4px 14px rgba(61,107,255,0.35)' : 'none',
                  }}
                >
                  {DIM_LABEL[d]}
                </button>
              ))}
            </div>

            <BreakdownTable
              rows={data.breakdown?.[dim] ?? []}
              dimLabel={DIM_LABEL[dim]}
              outcomesDisponibles={data.outcomesDisponibles}
              emptyHint={dim === 'sede' && sedeSinDatos
                ? 'Esta fuente no trae «Presencial o Virtual», así que todo cae en una sola localidad.'
                : undefined}
            />
          </div>

          {/* ── Mentores ── */}
          <div style={CARD}>
            <p style={EYEBROW}>Carga y resultados por mentor</p>
            <h2 style={SECTION_TITLE}>Mentores</h2>
            <div style={ACCENT_RULE} />
            <MentorTable rows={data.mentores} outcomesDisponibles={data.outcomesDisponibles} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Controles ───────────────────────────────────────────────────────────────

/** Filtro activo mientras el panel está plegado, con su botón para quitarlo. */
function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(29,66,155,0.10)', border: '1px solid rgba(29,66,155,0.20)',
      borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, color: BLUE,
    }}>
      {label}
      <button
        onClick={onClear}
        aria-label={`Quitar filtro ${label}`}
        style={{ border: 'none', background: 'transparent', color: BLUE, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
      >×</button>
    </span>
  )
}

/** Chip de solo lectura que muestra una ventana derivada. */
function WindowChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 6,
      background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
      borderRadius: 999, padding: '6px 12px', fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 800, letterSpacing: '.08em', color: '#8A8A8F', textTransform: 'uppercase', fontSize: 9.5 }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, color: NAVY }}>{value}</span>
    </span>
  )
}

function Pill({ label, on, onClick, dot, small }: {
  label: string; on: boolean; onClick: () => void; dot?: string; small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.04)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: SANS, fontSize: small ? 12 : 12.5, fontWeight: 700, letterSpacing: '.01em',
        padding: small ? '6px 14px' : '8px 17px', border: 'none', borderRadius: 999,
        cursor: 'pointer', transition: 'all .25s ease', whiteSpace: 'nowrap',
        color: on ? '#fff' : '#3A4156',
        background: on ? 'linear-gradient(180deg, #2A56C4 0%, #1D429B 100%)' : 'rgba(255,255,255,0.55)',
        boxShadow: on
          ? '0 4px 14px rgba(29,66,155,0.45), inset 0 1px 1px rgba(255,255,255,0.4)'
          : 'inset 0 1px 1px rgba(255,255,255,0.6)',
      }}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#fff' : dot }} />}
      {label}
    </button>
  )
}

function DateRange({ label, value, onChange, hint }: {
  label: string
  value: { from: string; to: string }
  onChange: (v: { from: string; to: string }) => void
  hint: string
}) {
  const input: React.CSSProperties = {
    border: `1px solid ${BORDER}`, borderRadius: 10, padding: '5px 9px',
    fontSize: 12, fontFamily: SANS, background: '#fff', color: NAVY,
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: '#3A4156', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: '#8A8A8F' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} style={input} />
        <span style={{ color: '#8A8A8F', fontSize: 12 }}>→</span>
        <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} style={input} />
        {(value.from || value.to) && (
          <button
            onClick={() => onChange({ from: '', to: '' })}
            title="Quitar este filtro"
            style={{ border: 'none', background: 'transparent', color: '#8A8A8F', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

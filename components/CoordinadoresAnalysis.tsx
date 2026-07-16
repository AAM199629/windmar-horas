'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CoordinadoresAnalysis, CoordinadorAnalysis, ConsultorStat } from '@/lib/coordinadores'
import KpiCard from '@/app/canales/mall/components/KpiCard'
import { useAnim } from '@/app/canales/mall/hooks/useAnim'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}
function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_ES[m] ?? m} ${y}`
}
function getMonths(): string[] {
  const months: string[] = []
  const now = new Date()
  const start = new Date(2026, 0, 1)
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d >= start) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return months
}
function pct(n: number): string { return `${Math.round(n * 100)}%` }
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
function effColor(eff: number): string {
  if (eff >= 0.9)  return '#1FA971'  // verde
  if (eff >= 0.72) return '#1D429B'  // azul
  if (eff >= 0.55) return '#F89B24'  // naranja
  return '#E0334B'                   // rojo
}
function effBadge(eff: number): { label: string; color: string; bg: string } {
  if (eff >= 0.75) return { label: 'ALTA ASISTENCIA',   color: '#065F46', bg: '#D1FAE5' }
  if (eff >= 0.55) return { label: 'ASISTENCIA MEDIA',  color: '#92400E', bg: '#FEF3C7' }
  return { label: 'REQUIERE ATENCIÓN', color: '#9F1239', bg: '#FFE4E6' }
}

// ── Design tokens (blanco/mall) ─────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 24,
  boxShadow: '0 8px 24px rgba(33,39,78,.10)',
  padding: '28px 30px', fontFamily: "'Montserrat', sans-serif",
}
const EYEBROW: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: '#1D429B', marginBottom: 4,
}
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, lineHeight: 1,
  color: '#21274E', marginBottom: 8,
}
const ACCENT_RULE: React.CSSProperties = {
  width: 72, height: 3, borderRadius: 999, background: '#F89B24',
  boxShadow: '0 0 8px rgba(248,155,36,.5)', marginBottom: 20,
}
const TH: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFFFF',
  background: '#21274E', fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap',
}
const TH_C: React.CSSProperties = { ...TH, textAlign: 'center' }
const TD: React.CSSProperties = {
  padding: '11px 14px', borderBottom: '1px solid #F1F2F5', fontSize: 13,
  fontFamily: "'Montserrat', sans-serif", verticalAlign: 'middle',
}
const TD_C: React.CSSProperties = { ...TD, textAlign: 'center' }

// ── SectionHead ───────────────────────────────────────────────────────────────

function SectionHead({ eyebrow, title, chip }: { eyebrow: string; title: string; chip?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <p style={EYEBROW}>{eyebrow}</p>
        <h3 style={SECTION_TITLE}>{title}</h3>
        <div style={ACCENT_RULE} />
      </div>
      {chip && (
        <div style={{
          background: '#F1F2F5', border: '1px solid #E4E5E9', borderRadius: 999,
          padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#4B4B4E',
          whiteSpace: 'nowrap', alignSelf: 'center',
        }}>{chip}</div>
      )}
    </div>
  )
}

// ── Ranking de barras ───────────────────────────────────────────────────────

function RankBars({ items, animOn, fmt, colorFn, suffix }: {
  items: { name: string; value: number; display: number }[]
  animOn: boolean
  fmt: (n: number) => string
  colorFn: (n: number) => string
  suffix?: string
}) {
  const max = Math.max(...items.map(i => i.display), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => {
        const barPct = (it.display / max) * 100
        const color = colorFn(it.value)
        return (
          <div key={it.name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 52px', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#21274E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.name}
            </span>
            <div style={{ height: 10, borderRadius: 999, background: '#EEF3FD', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: color,
                width: animOn ? `${barPct}%` : '0%',
                transition: `width 1200ms cubic-bezier(.2,.8,.2,1) ${i * 55}ms`,
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(it.value)}{suffix ?? ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Tarjeta liquid-glass de coordinador ─────────────────────────────────────

function GlassStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, lineHeight: 1, color: color ?? '#21274E', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A6072', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function CoordGlassCard({ c }: { c: CoordinadorAnalysis }) {
  const badge = effBadge(c.efectividad)
  const eColor = effColor(c.efectividad)
  const complPct = c.total > 0 ? (c.compl / c.total) * 100 : 0
  return (
    <div style={{
      flex: '0 0 340px', width: 340, scrollSnapAlign: 'start',
      borderRadius: 24, overflow: 'hidden',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.6)',
      boxShadow: '0 8px 32px rgba(33,39,78,.22)',
      fontFamily: "'Montserrat', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header navy translúcido */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(33,39,78,.94), rgba(29,66,155,.88))',
        padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#FFFFFF', letterSpacing: '0.05em',
        }}>{initials(c.nombre)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</div>
          {c.region && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{c.region}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#F89B24', lineHeight: 1 }}>{c.casosPorTurno.toFixed(2)}</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Casos/turno</div>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <GlassStat label="Compl." value={String(c.compl)} color="#1D429B" />
          <GlassStat label="Missed" value={String(c.missed)} color={c.missed > 0 ? '#E0334B' : '#B9BdC9'} />
          <GlassStat label="Total" value={String(c.total)} />
          <GlassStat label="Casos" value={String(c.casos)} color="#1FA971" />
        </div>

        {/* Efectividad + badge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: eColor, lineHeight: 1 }}>{pct(c.efectividad)}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: badge.color, background: badge.bg, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.04em' }}>{badge.label}</span>
          </div>
          {/* Barra compl vs missed */}
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(224,51,75,.28)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${complPct}%`, background: eColor, borderRadius: 999 }} />
          </div>
        </div>

        {/* Consultores */}
        {c.consultores.length > 0 && (
          <div style={{ borderRadius: 14, background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.7)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 46px', padding: '8px 12px', borderBottom: '1px solid rgba(33,39,78,.08)' }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A8F' }}>Consultor</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D429B', textAlign: 'center' }}>Turnos</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1FA971', textAlign: 'center' }}>Casos</span>
            </div>
            <div style={{ maxHeight: 176, overflowY: 'auto' }}>
              {c.consultores.map(cons => (
                <div key={cons.email} style={{ display: 'grid', gridTemplateColumns: '1fr 46px 46px', padding: '7px 12px', borderBottom: '1px solid rgba(33,39,78,.05)', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#21274E', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cons.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1D429B', textAlign: 'center' }}>{cons.turnos}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cons.casos > 0 ? '#1FA971' : '#C5C5C9', textAlign: 'center' }}>{cons.casos}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carrusel liquid-glass ────────────────────────────────────────────────────

function GlassCarousel({ coords }: { coords: CoordinadorAnalysis[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const STEP = 356 // ancho tarjeta + gap

  function scrollTo(i: number) {
    const n = Math.max(0, Math.min(i, coords.length - 1))
    setIdx(n)
    scroller.current?.scrollTo({ left: n * STEP, behavior: 'smooth' })
  }
  function onScroll() {
    if (!scroller.current) return
    setIdx(Math.round(scroller.current.scrollLeft / STEP))
  }

  return (
    <div style={{
      borderRadius: 28, padding: '26px 24px 22px',
      background: 'radial-gradient(120% 120% at 15% 0%, #2B4CC4 0%, #21274E 55%, #171B36 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* glows decorativos */}
      <div style={{ position: 'absolute', top: -60, right: -30, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,107,255,.45), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,155,36,.22), transparent 70%)', pointerEvents: 'none' }} />

      {/* Header del carrusel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ ...EYEBROW, color: 'rgba(255,255,255,.6)' }}>PERFILES · DETALLE POR COORDINADOR</p>
          <h3 style={{ ...SECTION_TITLE, color: '#FFFFFF', marginBottom: 0 }}>Tarjetas de coordinadores</h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NavBtn dir="prev" disabled={idx <= 0} onClick={() => scrollTo(idx - 1)} />
          <NavBtn dir="next" disabled={idx >= coords.length - 1} onClick={() => scrollTo(idx + 1)} />
        </div>
      </div>

      {/* Track */}
      <div
        ref={scroller}
        onScroll={onScroll}
        style={{
          display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
          paddingBottom: 6, scrollbarWidth: 'none', position: 'relative',
        }}
        className="wm-glass-track"
      >
        {coords.map(c => <CoordGlassCard key={c.nombre} c={c} />)}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 16, position: 'relative' }}>
        {coords.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Ir a tarjeta ${i + 1}`}
            style={{
              width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: i === idx ? '#F89B24' : 'rgba(255,255,255,.35)',
              transition: 'all .3s ease', padding: 0,
            }}
          />
        ))}
      </div>

      <style>{`.wm-glass-track::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

function NavBtn({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Anterior' : 'Siguiente'}
      style={{
        width: 38, height: 38, borderRadius: '50%', cursor: disabled ? 'default' : 'pointer',
        background: disabled ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.16)',
        border: '1px solid rgba(255,255,255,.28)',
        color: disabled ? 'rgba(255,255,255,.3)' : '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', transition: 'background .2s',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ transform: dir === 'next' ? 'rotate(180deg)' : undefined }}>
        <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// ── Observación / consultor destacado ────────────────────────────────────────

function ObsCard({ accent, title, children }: { accent: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px 20px', boxShadow: '0 8px 24px rgba(33,39,78,.08)', borderLeft: `4px solid ${accent}`, fontFamily: "'Montserrat', sans-serif" }}>
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#4B4B4E', margin: 0 }}>{children}</p>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CoordinadoresAnalysis({ analysis, month }: { analysis: CoordinadoresAnalysis; month: string }) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const animOn = useAnim(rootRef)
  const months = getMonths()

  const { coordinadores, totals, sinCoordinador, topConsultores } = analysis
  const activos = coordinadores.filter(c => c.total > 0 || c.casos > 0)

  // Observaciones dinámicas
  const conTurnos = activos.filter(c => c.total > 0)
  const maxEff = [...conTurnos].sort((a, b) => b.efectividad - a.efectividad || b.compl - a.compl)[0]
  const maxConv = [...conTurnos].sort((a, b) => b.casosPorTurno - a.casosPorTurno)[0]
  const minEff = [...conTurnos].sort((a, b) => a.efectividad - b.efectividad)[0]

  const rankEff = [...conTurnos].sort((a, b) => b.efectividad - a.efectividad)
    .map(c => ({ name: c.nombre.split(' ').slice(0, 2).join(' '), value: c.efectividad, display: c.efectividad }))
  const rankCasos = [...activos].filter(c => c.casos > 0).sort((a, b) => b.casos - a.casos)
    .map(c => ({ name: c.nombre.split(' ').slice(0, 2).join(' '), value: c.casos, display: c.casos }))

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

      {/* ── Filtro de mes ─────────────────────────────────────────── */}
      <div style={{ ...CARD_STYLE, padding: '14px 24px', borderRadius: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B' }}>Mes</span>
          <div style={{ background: '#F1F2F5', border: '1px solid #E4E5E9', borderRadius: 12, padding: '6px 14px' }}>
            <select
              value={month}
              onChange={e => router.push(`/canales/cambaceo?view=dashboard&month=${e.target.value}`)}
              style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#21274E', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', outline: 'none', padding: 0 }}
            >
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          </div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8A8A8F' }}>
          Turnos completados vs. missed, efectividad y casos cerrados por coordinador de cambaceo
        </span>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        <KpiCard label="Turnos Programados" value={totals.total} sub={`${totals.coordinadores} coordinadores`} color="#21274E" glow="#3D6BFF" animOn={animOn} />
        <KpiCard label="Completados" value={totals.compl} sub="turnos trabajados" color="#1D429B" glow="#3D6BFF" animOn={animOn} />
        <KpiCard label="Missed" value={totals.missed} sub="turnos no cubiertos" color="#E0334B" glow="#FF5D6C" animOn={animOn} />
        <KpiCard label="Efectividad Global" value={Math.round(totals.efectividad * 100)} sub="completados / total" color={effColor(totals.efectividad)} glow="#3D6BFF" animOn={animOn} isGauge gaugePct={totals.efectividad} />
        <KpiCard label="Casos Cerrados" value={totals.casos} sub={`${totals.leads} leads · ${fmtMonth(month)}`} color="#1FA971" glow="#1FD79B" animOn={animOn} />
      </div>

      {/* ── Nota metodológica ─────────────────────────────────────── */}
      <div style={{ background: '#FFF8EE', border: '1px solid #F6D9A8', borderRadius: 16, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F89B24', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: 15 }}>!</div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B45309', margin: '2px 0 4px' }}>Nota metodológica · fuentes</p>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#7A5B27', margin: 0 }}>
            Turnos por <strong>import de CSV (STIP)</strong>, contados por shift único; el coordinador se deriva del nombre del turno.
            Leads y casos por coordinador desde <strong>Redshift</strong> (lead source canvassing). Los turnos de carpas y eventos sin coordinador
            asignado ({sinCoordinador.total}: {sinCoordinador.compl} compl · {sinCoordinador.missed} missed, {pct(sinCoordinador.efectividad)} efectividad) no se incluyen en la tabla por coordinador.
          </p>
        </div>
      </div>

      {/* ── Tabla desglose ────────────────────────────────────────── */}
      <div style={CARD_STYLE}>
        <SectionHead eyebrow="CANVASSING · DESGLOSE" title="Por coordinador" chip={`${activos.length} coordinadores`} />
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #F1F2F5' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={TH}>Coordinador</th>
                <th style={TH_C}>Compl.</th>
                <th style={TH_C}>Missed</th>
                <th style={TH_C}>Total</th>
                <th style={TH}>Efectividad</th>
                <th style={TH_C}>Casos</th>
                <th style={TH_C}>Casos/turno</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((c, i) => (
                <tr key={c.nombre} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                  <td style={TD}>
                    <p style={{ fontWeight: 700, color: '#21274E', margin: 0, lineHeight: 1.25 }}>{c.nombre}</p>
                    {c.region && <p style={{ fontSize: 11, color: '#8A8A8F', margin: 0 }}>{c.region}</p>}
                  </td>
                  <td style={{ ...TD_C, fontWeight: 700, color: '#1D429B' }}>{c.compl}</td>
                  <td style={TD_C}><span style={{ fontWeight: 700, color: c.missed > 0 ? '#E0334B' : '#C5C5C9' }}>{c.missed}</span></td>
                  <td style={{ ...TD_C, color: '#4B4B4E' }}>{c.total}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 70, height: 8, borderRadius: 999, background: '#EEF3FD', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: effColor(c.efectividad), width: animOn ? pct(c.efectividad) : '0%', transition: `width 1100ms cubic-bezier(.2,.8,.2,1) ${i * 55}ms` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: effColor(c.efectividad), width: 34, textAlign: 'right' }}>{pct(c.efectividad)}</span>
                    </div>
                  </td>
                  <td style={{ ...TD_C, fontWeight: 700, color: '#1FA971' }}>{c.casos}</td>
                  <td style={{ ...TD_C, fontVariantNumeric: 'tabular-nums', color: '#4B4B4E' }}>{c.casosPorTurno.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#21274E' }}>
                <td style={{ ...TD, color: '#FFFFFF', fontWeight: 700, borderBottom: 'none' }}>TOTAL · {activos.length} coordinadores</td>
                <td style={{ ...TD_C, color: '#FFFFFF', fontWeight: 700, borderBottom: 'none' }}>{totals.compl}</td>
                <td style={{ ...TD_C, color: '#FF8A99', fontWeight: 700, borderBottom: 'none' }}>{totals.missed}</td>
                <td style={{ ...TD_C, color: '#FFFFFF', fontWeight: 700, borderBottom: 'none' }}>{totals.total}</td>
                <td style={{ ...TD, color: '#F89B24', fontWeight: 700, borderBottom: 'none' }}>{pct(totals.efectividad)} efectividad</td>
                <td style={{ ...TD_C, color: '#1FD79B', fontWeight: 700, borderBottom: 'none' }}>{totals.casos}</td>
                <td style={{ ...TD_C, color: '#FFFFFF', fontWeight: 700, borderBottom: 'none' }}>{totals.casosPorTurno.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Rankings ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={CARD_STYLE}>
          <SectionHead eyebrow="% completados sobre programados" title="Efectividad de turnos" />
          <RankBars items={rankEff} animOn={animOn} fmt={pct} colorFn={effColor} />
        </div>
        <div style={CARD_STYLE}>
          <SectionHead eyebrow="Casos atribuidos" title="Casos cerrados" />
          <RankBars items={rankCasos} animOn={animOn} fmt={n => String(n)} colorFn={() => '#1D429B'} />
        </div>
      </div>

      {/* ── Observaciones clave ───────────────────────────────────── */}
      {maxEff && maxConv && minEff && (
        <div>
          <SectionHead eyebrow="Lectura del mes" title="Observaciones clave" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <ObsCard accent="#1FA971" title="Máxima asistencia">
              <strong>{maxEff.nombre.split(' ').slice(0, 2).join(' ')}</strong> lideró con {pct(maxEff.efectividad)} de efectividad ({maxEff.compl} de {maxEff.total} turnos) y {maxEff.casos} casos.
            </ObsCard>
            <ObsCard accent="#1D429B" title="Mayor conversión">
              <strong>{maxConv.nombre.split(' ').slice(0, 2).join(' ')}</strong> encabeza casos por turno ({maxConv.casosPorTurno.toFixed(2)}) — más casos que turnos completados.
            </ObsCard>
            <ObsCard accent="#E0334B" title="Requiere atención">
              <strong>{minEff.nombre.split(' ').slice(0, 2).join(' ')}</strong> ({pct(minEff.efectividad)}) tiene la menor asistencia. Revisar cobertura y confirmación de turnos.
            </ObsCard>
          </div>
        </div>
      )}

      {/* ── Consultores destacados ────────────────────────────────── */}
      {topConsultores.length > 0 && (
        <div style={CARD_STYLE}>
          <SectionHead eyebrow="Mayor cierre de casos" title="Consultores destacados" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {topConsultores.map((cons, i) => (
              <ConsultorHero key={cons.email} c={cons} rank={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Carrusel liquid-glass ─────────────────────────────────── */}
      {activos.length > 0 && <GlassCarousel coords={activos} />}

      {/* ── Tagline ───────────────────────────────────────────────── */}
      <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 500, color: '#1D429B', fontSize: 17, fontFamily: "'Montserrat', sans-serif", padding: '4px 0 12px' }}>
        No es solo energía, es tranquilidad para ti y tu familia.
      </p>
    </div>
  )
}

function ConsultorHero({ c, rank }: { c: ConsultorStat; rank: number }) {
  const leader = rank === 0
  return (
    <div style={{
      borderRadius: 18, padding: '18px 20px', fontFamily: "'Montserrat', sans-serif",
      background: leader ? 'linear-gradient(135deg, #1D429B, #21274E)' : '#F7F8FA',
      border: leader ? 'none' : '1px solid #EDEFF3',
      color: leader ? '#FFFFFF' : '#21274E', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: leader ? 'rgba(255,255,255,.18)' : '#E4EAF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: leader ? '#FFFFFF' : '#1D429B' }}>{initials(c.name)}</div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 999, background: leader ? '#F89B24' : '#E4EAF6', color: leader ? '#FFFFFF' : '#1D429B' }}>{leader ? 'LÍDER' : `${rank + 1}.º`}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>{c.name}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, lineHeight: 1, color: leader ? '#FFFFFF' : '#1FA971' }}>{c.casos}</span>
        <span style={{ fontSize: 11.5, color: leader ? 'rgba(255,255,255,.65)' : '#8A8A8F' }}>casos · {c.turnos} turnos</span>
      </div>
    </div>
  )
}

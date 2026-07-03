'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Tipos (espejo de /api/finance/summary) ──────────────────────────────────────
interface HomeDepotTienda { nombre: string; deals: number; amount: number; paneles: number | null; baterias: number | null; ingreso: number | null; epcSolarRoofing: number; ventasWaterAnker: number; gananciaPipeline: number }
interface MallFinance     { nombre: string; costoMensual: number; mesesActivos: number; costoPeriodo: number; epcSolarRoofing: number; ventasWaterAnker: number; ganancia: number; pctMeta: number }
interface BoothEvent      { nombre: string; fechaInicio: string; fechaFin: string; dias: number; mesesActivos: number; ventas: number; costo: number; ingreso: number; gananciaNeta: number }
interface Coordinador     { nombre: string; ventas: number; amount: number; comision: number; guagua: number; salario: number; costoTotal: number; gananciaCompania: number; gananciaNeta: number }
interface Canal           { nombre: string; ingreso: number; costo: number; neto: number }

interface FinanceData {
  from: string; to: string; meses: number; rangeLabel: string
  hdUnitsReady: boolean; cambaseoComision: { rate: number | null; variable: boolean }
  resumen: { ingreso: number; costo: number; gananciaNeta: number; margenPct: number; canales: Canal[] }
  homeDepot: { stores: HomeDepotTienda[]; metaSemestre: number; metaPorTienda: number; prorrateoPeriodo: number }
  malls: MallFinance[]
  booths: BoothEvent[]
  coordinadores: Coordinador[]
}

// ── Brand tokens (WindMar HOME) ─────────────────────────────────────────────────
const BLUE = '#1D429B', NAVY = '#21274E', VIBRANT = '#0079C0', ORANGE = '#F89B24'
const ORANGE600 = '#E28312', GREEN = '#1E9E62', RED = '#D64545', FLAT = '#9AA3B5'
const GREY = '#6B7388', BORDER = '#E7ECF6', ROWLINE = '#EDF0F5', ZEBRA = '#F8FAFD', TOTALROW = '#EFF3FA'
const HEADERB = '#2E3866'
const HERO_GRAD = 'linear-gradient(180deg, #1D429B 0%, #21274E 100%)'
const CARD_GRAD = 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FE 100%)'
const SHADOW_MD = '0 8px 24px rgba(33,39,78,0.10)'
const SHADOW_BLUE = '0 18px 40px rgba(29,66,155,0.25)'
const PAGE_BG = `
  radial-gradient(1100px 520px at 12% -8%, #E2EAFB 0%, transparent 60%),
  radial-gradient(900px 480px at 100% 4%, #FBE9D0 0%, transparent 55%),
  linear-gradient(180deg, #EEF2F9 0%, #E9EDF6 100%)`
const SANS = "'Montserrat', sans-serif"
const DISPLAY = "'Bebas Neue', sans-serif"

const SEGMENTS = [
  { id: 'sec-resumen',   label: 'Resumen'            },
  { id: 'sec-hd',        label: 'Home Depot'         },
  { id: 'sec-malls',     label: 'Centros Comerciales'},
  { id: 'sec-booths',    label: 'Booths & Eventos'   },
  { id: 'sec-cambaseo',  label: 'Cambaseo'           },
]

// ── Formatters ──────────────────────────────────────────────────────────────────
function money(n: number | null | undefined): string {
  if (n == null) return '—'
  const v = Math.round(n)
  return `$${v.toLocaleString('en-US')}`
}
function moneyShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (a >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n)}`
}
function pct1(x: number): string { return `${(x * 100).toFixed(1)}%` }
function num(n: number | null | undefined): string { return n == null ? '—' : n.toLocaleString('es-PR') }

function semaforo(p: number): { label: string; color: string } {
  if (p >= 1)    return { label: 'Productiva', color: GREEN }
  if (p >= 0.85) return { label: 'En meta',    color: ORANGE600 }
  return { label: 'Mejorar', color: RED }
}

// ── Donut (SVG arcs — válido en PDF) ────────────────────────────────────────────
function ConicDonut({ size, hole, data, colors }: { size: number; hole: number; data: { value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const c = size / 2, R = size / 2, ri = hole / 2, ringW = R - ri, midR = (R + ri) / 2
  if (total <= 0) return <svg width={size} height={size}><circle cx={c} cy={c} r={midR} fill="none" stroke={BORDER} strokeWidth={ringW} /></svg>
  const nonZero = data.map((d, i) => ({ d, i })).filter(x => x.d.value > 0)
  if (nonZero.length === 1) {
    const color = colors[nonZero[0].i % colors.length]
    return <svg width={size} height={size}><circle cx={c} cy={c} r={midR} fill="none" stroke={color} strokeWidth={ringW} /></svg>
  }
  const START = -Math.PI / 2
  const before = data.reduce<number[]>((acc, _d, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + Math.max(0, data[i - 1].value)); return acc }, [])
  const paths = data.map((d, i) => {
    if (d.value <= 0) return null
    const a0 = START + (before[i] / total) * 2 * Math.PI
    const a1 = START + ((before[i] + d.value) / total) * 2 * Math.PI
    const large = a1 - a0 > Math.PI ? 1 : 0
    const x0o = c + R * Math.cos(a0), y0o = c + R * Math.sin(a0), x1o = c + R * Math.cos(a1), y1o = c + R * Math.sin(a1)
    const x1i = c + ri * Math.cos(a1), y1i = c + ri * Math.sin(a1), x0i = c + ri * Math.cos(a0), y0i = c + ri * Math.sin(a0)
    return <path key={i} d={`M${x0o} ${y0o}A${R} ${R} 0 ${large} 1 ${x1o} ${y1o}L${x1i} ${y1i}A${ri} ${ri} 0 ${large} 0 ${x0i} ${y0i}Z`} fill={colors[i % colors.length]} />
  })
  return <svg width={size} height={size}>{paths}</svg>
}
function Dot({ color, size = 11 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

// ── Table primitives ────────────────────────────────────────────────────────────
function Th({ children, align = 'right', bg = NAVY, radius, onClick }: { children: React.ReactNode; align?: 'left' | 'right'; bg?: string; radius?: 'l' | 'r'; onClick?: () => void }) {
  return (
    <th onClick={onClick} style={{
      padding: '14px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
      color: '#fff', textAlign: align, whiteSpace: 'nowrap', background: bg, cursor: onClick ? 'pointer' : undefined,
      borderTopLeftRadius: radius === 'l' ? 10 : 0, borderTopRightRadius: radius === 'r' ? 10 : 0,
    }}>{children}</th>
  )
}
function Td({ children, align = 'right', bold, color, muted }: { children: React.ReactNode; align?: 'left' | 'right'; bold?: boolean; color?: string; muted?: boolean }) {
  return (
    <td style={{
      padding: '13px 16px', fontSize: 14, textAlign: align, whiteSpace: 'nowrap',
      color: muted ? FLAT : (color ?? NAVY), fontWeight: bold ? 800 : (align === 'left' ? 500 : 400),
    }}>{children}</td>
  )
}
function bodyRowStyle(i: number): React.CSSProperties { return { borderBottom: `1px solid ${ROWLINE}`, background: i % 2 === 1 ? ZEBRA : undefined } }
const totalRowStyle: React.CSSProperties = { background: TOTALROW, borderTop: `2px solid ${NAVY}` }

function SectionCard({ id, title, right, children }: { id?: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="pdf-break" style={{ scrollMarginTop: 96, background: CARD_GRAD, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: SHADOW_MD, padding: '30px 34px', marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 5, height: 26, background: BLUE, borderRadius: 999 }} />
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: NAVY }}>{title}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

// KPI card simple (acento superior)
function Kpi({ label, value, sub, accent, valueColor }: { label: string; value: string; sub?: string; accent: string; valueColor?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, boxShadow: SHADOW_MD, padding: '22px 22px 20px', borderTop: `4px solid ${accent}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: GREY }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.02em', color: valueColor ?? NAVY, margin: '14px 0 8px' }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: FLAT, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

// Barra horizontal (aporte por canal): ingreso vs línea de costo + neto
function ChannelBar({ canal, scale }: { canal: Canal; scale: number }) {
  const ingW = scale > 0 ? Math.min(100, (canal.ingreso / scale) * 100) : 0
  const costPos = scale > 0 ? Math.min(100, (canal.costo / scale) * 100) : 0
  const pos = canal.neto >= 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 130px', gap: 16, alignItems: 'center', padding: '10px 0' }} className="max-md:!grid-cols-1">
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{canal.nombre}</div>
      <div style={{ position: 'relative', height: 26, background: '#EEF2FA', borderRadius: 8 }}>
        <div style={{ position: 'absolute', inset: 0, width: `${ingW}%`, background: `linear-gradient(90deg, ${BLUE}, ${VIBRANT})`, borderRadius: 8, transition: 'width .8s ease' }} />
        {/* línea punteada de costo */}
        <div style={{ position: 'absolute', top: -4, bottom: -4, left: `${costPos}%`, borderLeft: `2px dashed ${ORANGE}`, zIndex: 2 }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>{money(canal.ingreso)}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: pos ? GREEN : RED }}>{pos ? '+' : ''}{money(canal.neto)}</div>
      </div>
    </div>
  )
}

// Barra de avance (malls): ganancia ÷ costo
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const w = Math.min(100, Math.max(0, pct * 100))
  return (
    <div style={{ height: 14, background: '#EEF2FA', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 999, transition: 'width .8s ease' }} />
    </div>
  )
}

type SortDir = 'asc' | 'desc'

// Helpers de rango (YYYY-MM-DD)
function monthToRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`]
}
interface Preset { label: string; range: (y: number) => [string, string] }
const PRESETS: Preset[] = [
  { label: '1er Semestre', range: y => [`${y}-01-01`, `${y}-06-30`] },
  { label: '2do Semestre', range: y => [`${y}-07-01`, `${y}-12-31`] },
  { label: 'Año completo', range: y => [`${y}-01-01`, `${y}-12-31`] },
]

export default function FinanceDashboard({ initMonth }: { initMonth: string }) {
  const [initFrom, initTo] = monthToRange(initMonth)
  const [from, setFrom] = useState(initFrom)
  const [to, setTo] = useState(initTo)
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [active, setActive] = useState('sec-resumen')
  const [hdView, setHdView] = useState<'tienda' | 'meta' | 'progreso'>('tienda')
  const [hdSort, setHdSort] = useState<{ key: string; dir: SortDir }>({ key: 'ingreso', dir: 'desc' })
  const contentRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (f: string, t: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/finance/summary?from=${f}&to=${t}`)
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error ?? `HTTP ${res.status}`) }
      setData(await res.json())
    } catch (e: any) { setError(e.message ?? 'Error cargando datos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(initFrom, initTo) }, [])

  useEffect(() => {
    if (loading || error || !data) return
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }), { rootMargin: '-45% 0px -50% 0px', threshold: 0 })
    SEGMENTS.forEach(s => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [loading, error, data])

  function goTo(id: string) {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' })
    setActive(id)
  }
  function handleApply() { fetchData(from, to) }
  function applyPreset(p: Preset) {
    const year = Number(from.slice(0, 4)) || new Date().getFullYear()
    const [f, t] = p.range(year)
    setFrom(f); setTo(t); fetchData(f, t)
  }

  async function generatePDF() {
    if (!contentRef.current || pdfLoading) return
    setPdfLoading(true)
    try {
      window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 150))
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
      const el = contentRef.current
      const ignored = Array.from(el.querySelectorAll('[data-pdf-ignore]')) as HTMLElement[]
      const prev = ignored.map(e => e.style.display); ignored.forEach(e => { e.style.display = 'none' })
      await new Promise(r => setTimeout(r, 80))
      const elRect = el.getBoundingClientRect()
      const breaks = Array.from(el.querySelectorAll('.pdf-break')).map(b => b.getBoundingClientRect().top - elRect.top)
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#EEF2F9', scrollY: -window.scrollY, windowWidth: el.scrollWidth })
      ignored.forEach((e, i) => { e.style.display = prev[i] })
      const ratio = canvas.width / el.offsetWidth
      const breaksPx = breaks.map(b => b * ratio)
      const A4W = 210, A4H = 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageH = Math.round((A4H / A4W) * canvas.width)
      let srcY = 0, first = true
      while (srcY < canvas.height) {
        let endY = Math.min(srcY + pageH, canvas.height)
        const cut = srcY + pageH * 0.35
        const cand = breaksPx.filter(b => b > cut && b < endY)
        if (cand.length) endY = Math.max(...cand)
        const sliceH = endY - srcY
        const sc = document.createElement('canvas'); sc.width = canvas.width; sc.height = sliceH
        sc.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const img = sc.toDataURL('image/jpeg', 0.93)
        if (!first) pdf.addPage(); first = false
        pdf.addImage(img, 'JPEG', 0, 0, A4W, (sliceH / canvas.width) * A4W)
        srcY = endY
      }
      pdf.save(`windmar-finanzas-${from}_${to}.pdf`)
    } finally { setPdfLoading(false) }
  }

  return (
    <div className="-mx-4 -mt-6 px-4 pb-16 min-h-screen" style={{ background: PAGE_BG, backgroundAttachment: 'fixed', fontFamily: SANS }}>
      <div ref={contentRef} style={{ maxWidth: 1320, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ background: HERO_GRAD, borderRadius: '0 0 28px 28px', padding: '40px 44px 38px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: SHADOW_BLUE, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -60, top: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,155,36,.18), transparent 70%)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 28, height: 3, background: ORANGE, borderRadius: 999 }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#AFC3EE' }}>
                Finanzas & ROI de Canales · {data?.rangeLabel ?? '—'}
              </span>
            </div>
            <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(42px, 6vw, 64px)', lineHeight: 0.92, letterSpacing: '.01em', color: '#fff', textTransform: 'uppercase' }}>
              Dashboard <span style={{ color: ORANGE }}>de Finanzas</span>
            </h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/windmar-white-yellow.png" alt="WindMar HOME" style={{ position: 'relative', height: 78, width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* PERIOD BAR */}
        <div data-pdf-ignore="true" style={{ background: '#fff', borderRadius: 20, boxShadow: SHADOW_MD, padding: '22px 28px', marginTop: 28, display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: NAVY, marginBottom: 10 }}>Desde</div>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: NAVY, border: '1.5px solid #DDE3EE', borderRadius: 12, padding: '10px 14px' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: NAVY, marginBottom: 10 }}>Hasta</div>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: NAVY, border: '1.5px solid #DDE3EE', borderRadius: 12, padding: '10px 14px' }} />
          </div>
          <button onClick={handleApply} style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#fff', background: NAVY, border: 'none', borderRadius: 12, padding: '12px 30px', cursor: 'pointer' }}>Aplicar</button>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: BLUE, background: '#EEF2FA', border: `1px solid ${BORDER}`, borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>{p.label}</button>
            ))}
          </div>
          <button onClick={generatePDF} disabled={pdfLoading} style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#fff', background: ORANGE, border: 'none', borderRadius: 12, padding: '12px 26px', cursor: 'pointer', opacity: pdfLoading ? 0.6 : 1 }}>{pdfLoading ? 'Generando…' : '↓ Descargar PDF'}</button>
        </div>

        {/* STICKY NAV */}
        <div data-pdf-ignore="true" style={{ position: 'sticky', top: 16, zIndex: 50, display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <div style={{ display: 'flex', gap: 4, padding: 6, borderRadius: 999, background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 8px 30px rgba(33,39,78,0.16)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {SEGMENTS.map(s => {
              const on = active === s.id
              return <button key={s.id} onClick={() => goTo(s.id)} style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '9px 18px', border: 'none', borderRadius: 999, cursor: 'pointer', transition: 'all .25s ease', whiteSpace: 'nowrap', color: on ? '#fff' : '#3A4156', background: on ? 'linear-gradient(180deg, #2A56C4 0%, #1D429B 100%)' : 'transparent' }}>{s.label}</button>
            })}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: NAVY }} /><span className="text-sm" style={{ color: GREY }}>Cargando datos…</span></div></div>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm" style={{ marginTop: 22 }}>Error: {error}</div>}

        {!loading && !error && data && (
          <>
            {/* ── RESUMEN EJECUTIVO ── */}
            <div id="sec-resumen" style={{ scrollMarginTop: 96, marginTop: 22 }} className="pdf-break">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }} className="max-md:!grid-cols-2">
                <Kpi label="Ingreso del Período" value={money(data.resumen.ingreso)} sub="Generado por canales" accent={BLUE} />
                <Kpi label="Costo / Pago del Período" value={money(data.resumen.costo)} sub={`${data.meses} ${data.meses === 1 ? 'mes' : 'meses'} · HD ${money(data.homeDepot.prorrateoPeriodo)}`} accent={NAVY} />
                <Kpi label="Ganancia Neta del Período" value={money(data.resumen.gananciaNeta)} sub={`Margen ${pct1(data.resumen.margenPct)}`} accent={data.resumen.gananciaNeta >= 0 ? GREEN : RED} valueColor={data.resumen.gananciaNeta >= 0 ? GREEN : RED} />
                <Kpi label="Margen" value={pct1(data.resumen.margenPct)} sub="Ganancia ÷ ingreso" accent={ORANGE} />
              </div>

              <SectionCard title="Aporte por Canal">
                {(() => {
                  const scale = Math.max(1, ...data.resumen.canales.map(c => Math.max(c.ingreso, c.costo)))
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: GREY }}><Dot color={BLUE} /> Ingreso generado</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: GREY }}><span style={{ width: 14, borderTop: `2px dashed ${ORANGE}` }} /> Costo del canal</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: GREY }}><Dot color={GREEN} /> Neto</span>
                      </div>
                      {data.resumen.canales.map(c => <ChannelBar key={c.nombre} canal={c} scale={scale} />)}
                    </>
                  )
                })()}
                {!data.hdUnitsReady && (
                  <p style={{ fontSize: 12, color: ORANGE600, marginTop: 14 }}>
                    ⚠ Home Depot: el ingreso por placas/baterías aún no se cuenta porque <strong>System Size</strong> y <strong>Battery Qty</strong> no están en Redshift todavía.
                  </p>
                )}
              </SectionCard>
            </div>

            {/* ── HOME DEPOT ── */}
            {(() => {
              const stores = data.homeDepot.stores
              const metaStore = data.homeDepot.metaPorTienda   // $50K por tienda (semestre)
              const metaTotal = data.homeDepot.metaSemestre    // $500K (semestre)
              const totalIngreso = stores.reduce((s, t) => s + (t.ingreso ?? 0), 0)
              const totalPaneles = stores.reduce((s, t) => s + (t.paneles ?? 0), 0)
              const totalBaterias = stores.reduce((s, t) => s + (t.baterias ?? 0), 0)
              const cobertura = metaTotal > 0 ? totalIngreso / metaTotal : 0
              const sorted = [...stores].sort((a, b) => {
                const dir = hdSort.dir === 'asc' ? 1 : -1
                const get = (t: HomeDepotTienda) => hdSort.key === 'nombre' ? t.nombre : (t as any)[hdSort.key] ?? 0
                const av = get(a), bv = get(b)
                if (typeof av === 'string') return av.localeCompare(bv as string) * dir
                return ((av as number) - (bv as number)) * dir
              })
              const setSort = (key: string) => setHdSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
              return (
                <SectionCard id="sec-hd" title="Home Depot" right={
                  <span data-pdf-ignore="true" style={{ fontSize: 12, fontWeight: 700, color: GREY, background: '#EEF2FA', borderRadius: 999, padding: '7px 14px' }}>Acumulado del rango vs meta semestral</span>
                }>
                  {!data.hdUnitsReady && (
                    <div style={{ background: '#FFF6E9', border: `1px solid ${ORANGE}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#7A5418' }}>
                      ⚠ <strong>Pendiente de data:</strong> el cálculo de placas (System Size × 2.49) y baterías (Battery Qty) requiere que esas columnas existan en Redshift. Mientras tanto se muestran los <strong>deals</strong> y el <strong>$ generado</strong> por tienda; placas/baterías/ingreso aparecen como “—”.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }} className="max-md:!grid-cols-2">
                    <Kpi label="Generado (rango)" value={money(data.hdUnitsReady ? totalIngreso : null)} sub={`Acumulado ${data.rangeLabel}`} accent={BLUE} />
                    <Kpi label="Meta Semestral" value={money(metaTotal)} sub="Pago a Home Depot ($500K)" accent={NAVY} />
                    <Kpi label="% Cobertura Meta" value={data.hdUnitsReady ? pct1(cobertura) : '—'} sub="Generado ÷ $500K semestre" accent={ORANGE} valueColor={data.hdUnitsReady ? semaforo(cobertura).color : undefined} />
                    <Kpi label="Unidades" value={data.hdUnitsReady ? `${num(totalPaneles)} / ${num(totalBaterias)}` : '—'} sub="Placas / Baterías" accent={VIBRANT} />
                  </div>

                  {/* 3 vistas */}
                  <div data-pdf-ignore="true" style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                    {([['tienda', 'Por tienda'], ['meta', 'Aporte a meta'], ['progreso', 'Progreso']] as const).map(([k, lbl]) => (
                      <button key={k} onClick={() => setHdView(k)} style={{ border: `1px solid ${hdView === k ? BLUE : BORDER}`, background: hdView === k ? BLUE : '#fff', color: hdView === k ? '#fff' : GREY, borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
                    ))}
                  </div>

                  {hdView === 'tienda' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stores.map(t => {
                        const val = data.hdUnitsReady ? (t.ingreso ?? 0) : t.amount
                        const max = Math.max(1, ...stores.map(s => data.hdUnitsReady ? (s.ingreso ?? 0) : s.amount))
                        const p = data.hdUnitsReady && metaStore > 0 ? (t.ingreso ?? 0) / metaStore : 0
                        return (
                          <div key={t.nombre} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 110px', gap: 14, alignItems: 'center' }} className="max-md:!grid-cols-1">
                            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{t.nombre.replace('Home Depot - ', '')}</div>
                            <div style={{ position: 'relative', height: 22, background: '#EEF2FA', borderRadius: 8 }}>
                              <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (val / max) * 100)}%`, background: data.hdUnitsReady ? semaforo(p).color : VIBRANT, borderRadius: 8, transition: 'width .8s ease' }} />
                              {data.hdUnitsReady && metaStore > 0 && (
                                <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${Math.min(100, (metaStore / max) * 100)}%`, borderLeft: `2px dashed ${ORANGE}` }} />
                              )}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: NAVY }}>{data.hdUnitsReady ? money(t.ingreso) : `${t.deals} deals`}</div>
                          </div>
                        )
                      })}
                      <div style={{ fontSize: 12, color: FLAT, marginTop: 6 }}>Línea punteada naranja = meta por tienda ({money(metaStore)}).</div>
                    </div>
                  )}

                  {hdView === 'meta' && (
                    <div>
                      <div style={{ display: 'flex', height: 34, borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                        {data.hdUnitsReady ? stores.map((t, i) => {
                          const w = metaTotal > 0 ? Math.min(100, ((t.ingreso ?? 0) / metaTotal) * 100) : 0
                          const palette = [NAVY, BLUE, VIBRANT, ORANGE, GREEN, ORANGE600, '#7C5CFC', '#1FA8A0', '#C0567E', '#6B7388']
                          return w > 0 ? <div key={t.nombre} title={`${t.nombre}: ${money(t.ingreso)}`} style={{ width: `${w}%`, background: palette[i % palette.length] }} /> : null
                        }) : <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAT, fontSize: 13 }}>Pendiente de unidades</div>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
                        <span style={{ color: GREEN, fontWeight: 700 }}>Generado: {money(data.hdUnitsReady ? totalIngreso : null)}</span>
                        <span style={{ color: GREY }}>Faltante: {money(data.hdUnitsReady ? Math.max(0, metaTotal - totalIngreso) : null)}</span>
                        <span style={{ color: NAVY, fontWeight: 700 }}>Meta: {money(metaTotal)}</span>
                      </div>
                    </div>
                  )}

                  {hdView === 'progreso' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <ConicDonut size={180} hole={120} data={[{ value: data.hdUnitsReady ? totalIngreso : 0 }, { value: data.hdUnitsReady ? Math.max(0, metaTotal - totalIngreso) : 1 }]} colors={[semaforo(cobertura).color, '#EEF2FA']} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: DISPLAY, fontSize: 40, color: NAVY }}>{data.hdUnitsReady ? pct1(cobertura) : '—'}</span>
                          <span style={{ fontSize: 11, color: GREY, textTransform: 'uppercase', letterSpacing: '.08em' }}>cobertura</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div><div style={{ fontSize: 12, color: GREY, textTransform: 'uppercase', letterSpacing: '.07em' }}>Generado</div><div style={{ fontSize: 24, fontWeight: 900, color: GREEN }}>{money(data.hdUnitsReady ? totalIngreso : null)}</div></div>
                        <div><div style={{ fontSize: 12, color: GREY, textTransform: 'uppercase', letterSpacing: '.07em' }}>Pago</div><div style={{ fontSize: 24, fontWeight: 900, color: NAVY }}>{money(metaTotal)}</div></div>
                        <div><div style={{ fontSize: 12, color: GREY, textTransform: 'uppercase', letterSpacing: '.07em' }}>Diferencia</div><div style={{ fontSize: 24, fontWeight: 900, color: ORANGE600 }}>{money(data.hdUnitsReady ? totalIngreso - metaTotal : null)}</div></div>
                      </div>
                    </div>
                  )}

                  {/* Tabla ranking */}
                  <div style={{ overflowX: 'auto', marginTop: 26 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <Th align="left" radius="l" onClick={() => setSort('nombre')}>Tienda</Th>
                        <Th onClick={() => setSort('deals')}>Deals</Th>
                        <Th onClick={() => setSort('paneles')}>Placas</Th>
                        <Th onClick={() => setSort('baterias')}>Baterías</Th>
                        <Th onClick={() => setSort('ingreso')}>Ingreso</Th>
                        <Th radius="r">Estado</Th>
                      </tr></thead>
                      <tbody>
                        {sorted.map((t, i) => {
                          const p = metaStore > 0 ? (t.ingreso ?? 0) / metaStore : 0
                          const sem = semaforo(p)
                          return (
                            <tr key={t.nombre} style={bodyRowStyle(i)}>
                              <Td align="left">{t.nombre.replace('Home Depot - ', '')}</Td>
                              <Td>{num(t.deals)}</Td>
                              <Td>{num(t.paneles)}</Td>
                              <Td>{num(t.baterias)}</Td>
                              <Td bold>{money(t.ingreso)}</Td>
                              <Td bold color={data.hdUnitsReady ? sem.color : FLAT}>{data.hdUnitsReady ? sem.label : '—'}</Td>
                            </tr>
                          )
                        })}
                        <tr style={totalRowStyle}>
                          <Td align="left" bold>TOTAL</Td>
                          <Td bold>{num(stores.reduce((s, t) => s + t.deals, 0))}</Td>
                          <Td bold>{num(data.hdUnitsReady ? totalPaneles : null)}</Td>
                          <Td bold>{num(data.hdUnitsReady ? totalBaterias : null)}</Td>
                          <Td bold>{money(data.hdUnitsReady ? totalIngreso : null)}</Td>
                          <Td bold color={data.hdUnitsReady ? semaforo(cobertura).color : FLAT}>{data.hdUnitsReady ? pct1(cobertura) : '—'}</Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Comparación de métodos de ingreso */}
                  {(() => {
                    const totalPipeline = stores.reduce((s, t) => s + t.gananciaPipeline, 0)
                    const coberturaPipe = metaTotal > 0 ? totalPipeline / metaTotal : 0
                    const sortedCmp = [...stores].sort((a, b) => b.gananciaPipeline - a.gananciaPipeline)
                    return (
                      <div style={{ marginTop: 34 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>Comparación de métodos de ingreso</span>
                        </div>
                        <p style={{ fontSize: 13, color: GREY, marginBottom: 18, maxWidth: 760 }}>
                          Dos formas de medir lo que genera Home Depot, ambas contra la meta de <strong>{money(metaTotal)}</strong> semestral:
                          el <strong>método actual</strong> ($50/placa + $200/batería) y el <strong>método por % del EPC</strong> (15% del EPC solar/roofing + 10% water/Anker).
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 22 }} className="max-md:!grid-cols-2">
                          <Kpi label="Placas / Baterías" value={money(data.hdUnitsReady ? totalIngreso : null)} sub={`Cobertura ${data.hdUnitsReady ? pct1(cobertura) : '—'}`} accent={BLUE} valueColor={data.hdUnitsReady ? semaforo(cobertura).color : undefined} />
                          <Kpi label="% del EPC" value={money(totalPipeline)} sub={`Cobertura ${pct1(coberturaPipe)}`} accent={VIBRANT} valueColor={semaforo(coberturaPipe).color} />
                          <Kpi label="Diferencia" value={money(data.hdUnitsReady ? totalPipeline - totalIngreso : null)} sub="EPC − Placas/Bat" accent={ORANGE} />
                          <Kpi label="Meta Semestral" value={money(metaTotal)} sub="Pago a Home Depot" accent={NAVY} />
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>
                              <Th align="left" bg={VIBRANT} radius="l">Tienda</Th>
                              <Th bg={VIBRANT}>Placas/Bat ($)</Th>
                              <Th bg={HEADERB}>EPC Solar/Roofing</Th>
                              <Th bg={HEADERB}>Water/Anker</Th>
                              <Th bg={VIBRANT}>% del EPC</Th>
                              <Th bg={VIBRANT} radius="r">Δ vs Placas/Bat</Th>
                            </tr></thead>
                            <tbody>
                              {sortedCmp.map((t, i) => {
                                const diff = (t.gananciaPipeline) - (t.ingreso ?? 0)
                                return (
                                  <tr key={t.nombre} style={bodyRowStyle(i)}>
                                    <Td align="left">{t.nombre.replace('Home Depot - ', '')}</Td>
                                    <Td bold>{money(t.ingreso)}</Td>
                                    <Td muted>{money(t.epcSolarRoofing)}</Td>
                                    <Td muted>{money(t.ventasWaterAnker)}</Td>
                                    <Td bold>{money(t.gananciaPipeline)}</Td>
                                    <Td bold color={data.hdUnitsReady ? (diff >= 0 ? GREEN : RED) : FLAT}>{data.hdUnitsReady ? `${diff >= 0 ? '+' : ''}${money(diff)}` : '—'}</Td>
                                  </tr>
                                )
                              })}
                              <tr style={totalRowStyle}>
                                <Td align="left" bold>TOTAL</Td>
                                <Td bold>{money(data.hdUnitsReady ? totalIngreso : null)}</Td>
                                <Td bold>{money(stores.reduce((s, t) => s + t.epcSolarRoofing, 0))}</Td>
                                <Td bold>{money(stores.reduce((s, t) => s + t.ventasWaterAnker, 0))}</Td>
                                <Td bold>{money(totalPipeline)}</Td>
                                <Td bold color={data.hdUnitsReady ? (totalPipeline - totalIngreso >= 0 ? GREEN : RED) : FLAT}>{data.hdUnitsReady ? `${totalPipeline - totalIngreso >= 0 ? '+' : ''}${money(totalPipeline - totalIngreso)}` : '—'}</Td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}
                </SectionCard>
              )
            })()}

            {/* ── CENTROS COMERCIALES ── */}
            <SectionCard id="sec-malls" title="Centros Comerciales">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {data.malls.map(m => {
                  const sem = semaforo(m.pctMeta)
                  return (
                    <div key={m.nombre}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{m.nombre.replace('Malls - ', '')}</span>
                        <span style={{ fontSize: 13, color: GREY }}>Ganancia <strong style={{ color: sem.color }}>{money(m.ganancia)}</strong> / Costo {money(m.costoPeriodo)} · <strong style={{ color: sem.color }}>{pct1(m.pctMeta)}</strong></span>
                      </div>
                      <ProgressBar pct={m.pctMeta} color={sem.color} />
                      <div style={{ fontSize: 12, color: FLAT, marginTop: 6 }}>
                        EPC Solar/Roofing {money(m.epcSolarRoofing)} → 15% = {money(m.epcSolarRoofing * 0.15)} · Water/Anker {money(m.ventasWaterAnker)} → 10% = {money(m.ventasWaterAnker * 0.10)} · Renta {money(m.costoMensual)}/mes × {m.mesesActivos} {m.mesesActivos === 1 ? 'mes' : 'meses'}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 12, color: GREY, marginTop: 18 }}>Costo del período = renta mensual del mall × meses activos en el rango (fechas del Channel Info).</p>
            </SectionCard>

            {/* ── BOOTHS & EVENTOS ── */}
            <SectionCard id="sec-booths" title="Booths & Eventos">
              {data.booths.length === 0 ? (
                <p style={{ fontSize: 14, color: FLAT }}>
                  Sin booths/eventos configurados. El costo fijo (“inversión fija”) vive en Zoho (Channel Info) pero aún no está en Redshift.
                  Agrega los eventos en <code style={{ background: '#EEF2FA', padding: '2px 6px', borderRadius: 6 }}>lib/finance-config.ts</code> (arreglo <strong>EVENTS</strong>).
                </p>
              ) : (() => {
                const totNet = data.booths.reduce((s, b) => s + b.gananciaNeta, 0)
                const totCost = data.booths.reduce((s, b) => s + b.costo, 0)
                const totIngreso = data.booths.reduce((s, b) => s + b.ingreso, 0)
                const totVentas = data.booths.reduce((s, b) => s + (b.ventas ?? 0), 0)
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }} className="max-md:!grid-cols-2">
                      <Kpi label="Ventas Totales" value={num(totVentas)} sub="Deals atribuidos por Channel Info" accent={BLUE} />
                      <Kpi label="Ingreso Total" value={money(totIngreso)} sub="15% EPC + 10% water/Anker" accent={VIBRANT} />
                      <Kpi label="Costo Total" value={money(totCost)} accent={NAVY} />
                      <Kpi label="Ganancia Neta Total" value={money(totNet)} accent={totNet >= 0 ? GREEN : RED} valueColor={totNet >= 0 ? GREEN : RED} />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                          <Th align="left" radius="l">Booth / Evento</Th><Th align="left">Período</Th><Th>Ventas</Th><Th>Días</Th><Th>Ingreso</Th><Th>Costo</Th><Th>Ganancia/Día</Th><Th radius="r">Ganancia Neta</Th>
                        </tr></thead>
                        <tbody>
                          {data.booths.map((b, i) => (
                            <tr key={b.nombre} style={bodyRowStyle(i)}>
                              <Td align="left">{b.nombre}</Td>
                              <Td align="left" muted>{b.fechaInicio} → {b.fechaFin}</Td>
                              <Td bold>{num(b.ventas)}</Td>
                              <Td>{num(b.dias)}</Td>
                              <Td>{money(b.ingreso)}</Td>
                              <Td>{money(b.costo)}</Td>
                              <Td>{money(b.dias > 0 ? b.gananciaNeta / b.dias : 0)}</Td>
                              <Td bold color={b.gananciaNeta >= 0 ? GREEN : RED}>{money(b.gananciaNeta)}</Td>
                            </tr>
                          ))}
                          <tr style={totalRowStyle}>
                            <Td align="left" bold>TOTAL</Td>
                            <Td align="left" muted>—</Td>
                            <Td bold>{num(totVentas)}</Td>
                            <Td bold>{num(data.booths.reduce((s, b) => s + b.dias, 0))}</Td>
                            <Td bold>{money(totIngreso)}</Td>
                            <Td bold>{money(totCost)}</Td>
                            <Td bold>—</Td>
                            <Td bold color={totNet >= 0 ? GREEN : RED}>{money(totNet)}</Td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 12, color: GREY, marginTop: 14 }}>“Ventas” = deals cerrados atribuidos al lugar por su Record ID de Channel Info (todas las líneas de negocio). El ingreso solo cuenta solar/roofing (15%) y water/Anker (10%).</p>
                  </>
                )
              })()}
            </SectionCard>

            {/* ── CAMBASEO ── */}
            <SectionCard id="sec-cambaseo" title="Cambaseo — Coordinadores">
              {(() => {
                const c = data.coordinadores
                const totVentas = c.reduce((s, x) => s + x.ventas, 0)
                const totCosto = c.reduce((s, x) => s + x.costoTotal, 0)
                const totComision = c.reduce((s, x) => s + x.comision, 0)
                const totNeto = c.reduce((s, x) => s + x.gananciaNeta, 0)
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }} className="max-md:!grid-cols-2">
                      <Kpi label="Ventas Solar/Roofing" value={num(totVentas)} sub={data.cambaseoComision.variable ? 'Comisión $50/$100 según el mes' : `Comisión $${data.cambaseoComision.rate}/venta`} accent={BLUE} />
                      <Kpi label="Costo Operativo" value={money(totCosto)} sub="Guagua + salario + comisión" accent={NAVY} />
                      <Kpi label="Comisiones Pagadas" value={money(totComision)} accent={ORANGE} />
                      <Kpi label="Ganancia Neta" value={money(totNeto)} accent={totNeto >= 0 ? GREEN : RED} valueColor={totNeto >= 0 ? GREEN : RED} />
                    </div>
                    {c.length === 0 ? <p style={{ fontSize: 14, color: FLAT }}>Sin ventas de coordinadores para este período.</p> : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead><tr>
                            <Th align="left" bg={BLUE} radius="l">Coordinador</Th>
                            <Th bg={BLUE}>Ventas</Th><Th bg={BLUE}>Comisión</Th><Th bg={HEADERB}>Guagua</Th><Th bg={HEADERB}>Salario</Th><Th bg={BLUE}>Costo Total</Th><Th bg={BLUE} radius="r">Ganancia Neta</Th>
                          </tr></thead>
                          <tbody>
                            {c.map((x, i) => (
                              <tr key={x.nombre} style={bodyRowStyle(i)}>
                                <Td align="left">{x.nombre}</Td>
                                <Td bold>{num(x.ventas)}</Td>
                                <Td>{money(x.comision)}</Td>
                                <Td muted>{money(x.guagua)}</Td>
                                <Td muted>{money(x.salario)}</Td>
                                <Td>{money(x.costoTotal)}</Td>
                                <Td bold color={x.gananciaNeta >= 0 ? GREEN : RED}>{money(x.gananciaNeta)}</Td>
                              </tr>
                            ))}
                            <tr style={totalRowStyle}>
                              <Td align="left" bold>TOTAL</Td>
                              <Td bold>{num(totVentas)}</Td>
                              <Td bold>{money(totComision)}</Td>
                              <Td bold>{money(c.reduce((s, x) => s + x.guagua, 0))}</Td>
                              <Td bold>{money(c.reduce((s, x) => s + x.salario, 0))}</Td>
                              <Td bold>{money(totCosto)}</Td>
                              <Td bold color={totNeto >= 0 ? GREEN : RED}>{money(totNeto)}</Td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: GREY, marginTop: 16 }}>Ganancia compañía = 15% del EPC por venta de solar/roofing. Comisión: solar/roofing $50 (abr–sep) / $100 (oct–mar) + water/PPS $10/venta. Guagua $1,500/mes + salario $600/sem × {data.meses} {data.meses === 1 ? 'mes' : 'meses'} del rango.</p>
                  </>
                )
              })()}
            </SectionCard>

            <div style={{ textAlign: 'center', fontSize: 12, color: FLAT, padding: '18px 0 0' }}>
              Windmar Home · Dashboard de Finanzas & ROI · {data.rangeLabel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

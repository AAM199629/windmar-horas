'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MALL_BOOTH_LOCATIONS, EMPLEADO_ROLES } from '@/lib/constants'

// ── Types ──────────────────────────────────────────────────────────────────────
interface SalesGroupRow    { salesRole: string; leadSource: string; ventas: number }
interface CoordinadorRow   { coordinador: string; leads: number; ventas: number }
interface BoothSaleRow     { booth: string; ventas: number }
interface IndepBoothRow    { leadSource: string; boothName: string; ventas: number }
interface SellersSummaryRow { total: number; asalariados: number; fullCommission: number }

interface SummaryData {
  salesA:    SalesGroupRow[]
  salesB:    SalesGroupRow[]
  cambaceoA: CoordinadorRow[]
  cambaceoB: CoordinadorRow[]
  indepA:    IndepBoothRow[]
  indepB:    IndepBoothRow[]
  boothA?:  BoothSaleRow[]
  boothB?:  BoothSaleRow[]
  sellers?: SellersSummaryRow
}

interface SaleDealDetail {
  dealName:    string | null
  vendedor:    string
  salesRole:   string
  closingDate: string
  pipeline:    string
  leadSource:  string
  amount:      number | null
  isCdbg:      boolean
  zohoId:      string
}

interface SaleModalState {
  title:   string
  deals:   SaleDealDetail[]
  loading: boolean
  error:   string | null
}

// ── Brand tokens (from WindMar HOME design system) ──────────────────────────────
const BLUE      = '#1D429B'  // azul marca
const NAVY      = '#21274E'  // azul profundo
const VIBRANT   = '#0079C0'  // azul vibrante
const HEADERB   = '#2E3866'  // header columna período B
const ORANGE    = '#F89B24'
const ORANGE600 = '#E28312'  // naranja sobre claro
const ORANGE300 = '#FBC074'
const GREEN     = '#1E9E62'
const RED       = '#D64545'
const FLAT      = '#9AA3B5'
const GREY      = '#6B7388'
const BORDER    = '#E7ECF6'
const ROWLINE   = '#EDF0F5'
const ZEBRA     = '#F8FAFD'
const TOTALROW  = '#EFF3FA'

const HERO_GRAD   = 'linear-gradient(180deg, #1D429B 0%, #21274E 100%)'
const CARD_GRAD   = 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FE 100%)'
const SHADOW_MD   = '0 8px 24px rgba(33,39,78,0.10)'
const SHADOW_BLUE = '0 18px 40px rgba(29,66,155,0.25)'
const PAGE_BG = `
  radial-gradient(1100px 520px at 12% -8%, #E2EAFB 0%, transparent 60%),
  radial-gradient(900px 480px at 100% 4%, #FBE9D0 0%, transparent 55%),
  linear-gradient(180deg, #EEF2F9 0%, #E9EDF6 100%)`

const SANS    = "'Montserrat', sans-serif"
const DISPLAY = "'Bebas Neue', sans-serif"

// Lead-source donut palette (matches handoff legend order, applied to top sources by value)
const LEAD_COLORS = [NAVY, ORANGE, BLUE, GREY, GREEN, VIBRANT, ORANGE300, RED]

const SEGMENTS = [
  { id: 'sec-kpi',        label: 'Resumen'     },
  { id: 'sec-asalariado', label: 'Asalariado'  },
  { id: 'sec-lead',       label: 'Lead Source' },
  { id: 'sec-booths',     label: 'Booths'      },
  { id: 'sec-cambaceo',   label: 'Cambaceo'    },
]

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseLocal(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function fmtRange(from: string, to: string) {
  const f = parseLocal(from), t = parseLocal(to)
  const base: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${f.toLocaleDateString('es-PR', base)} – ${t.toLocaleDateString('es-PR', { ...base, year: 'numeric' })}`
}
function colLabel(from: string, to: string) {
  const f  = parseLocal(from), t = parseLocal(to)
  const mf = f.toLocaleDateString('es-PR', { month: 'short' })
  const mt = t.toLocaleDateString('es-PR', { month: 'short' })
  if (mf === mt) return `${mf} ${f.getDate()}–${t.getDate()}`
  return `${mf} ${f.getDate()} – ${mt} ${t.getDate()}`
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('es-PR') }
function pct(a: number, total: number) {
  return total === 0 ? '—' : `${((a / total) * 100).toFixed(1)}%`
}
// Variation: green ▲ / red ▼ / flat — (matches prototype v(n))
function varOf(diff: number) {
  if (!diff) return { text: '—', color: FLAT }
  if (diff > 0) return { text: `▲ +${diff}`, color: GREEN }
  return { text: `▼ –${Math.abs(diff)}`, color: RED }
}

// ── Aggregation helpers ───────────────────────────────────────────────────────
function sumVentas(rows: SalesGroupRow[]) { return rows.reduce((s, r) => s + r.ventas, 0) }
function byRole(rows: SalesGroupRow[], role: string) {
  return rows.filter(r => r.salesRole === role).reduce((s, r) => s + r.ventas, 0)
}
function boothVentas(rows: BoothSaleRow[] | undefined, location: string) {
  return rows?.find(r => r.booth === location)?.ventas ?? 0
}
function indepKey(r: IndepBoothRow) {
  return r.boothName ? `${r.leadSource}||${r.boothName}` : r.leadSource
}
function indepDisplay(r: IndepBoothRow) {
  return r.boothName ? `${r.leadSource} › ${r.boothName}` : r.leadSource
}

// ── Conic donut (pure CSS, matches handoff) ─────────────────────────────────────
function conicBg(data: { value: number }[], colors: string[]) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return BORDER
  let acc = 0
  const stops = data.map((d, i) => {
    const start = (acc / total) * 100
    acc += d.value
    const end = (acc / total) * 100
    return `${colors[i % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}
function ConicDonut({ size, hole, data, colors }: {
  size: number; hole: number; data: { value: number }[]; colors: string[]
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: conicBg(data, colors),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: hole, height: hole, borderRadius: '50%', background: '#fff' }} />
    </div>
  )
}
function Dot({ color, size = 11 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

// ── Table primitives (wm-th / wm-td) ────────────────────────────────────────────
function Th({ children, align = 'right', bg = NAVY, radius }: {
  children: React.ReactNode; align?: 'left' | 'right'; bg?: string; radius?: 'l' | 'r'
}) {
  return (
    <th style={{
      padding: '14px 18px', fontSize: 12, fontWeight: 800, letterSpacing: '.06em',
      textTransform: 'uppercase', color: '#fff', textAlign: align, whiteSpace: 'nowrap',
      background: bg,
      borderTopLeftRadius:  radius === 'l' ? 10 : 0,
      borderTopRightRadius: radius === 'r' ? 10 : 0,
    }}>{children}</th>
  )
}
function Td({ children, align = 'right', bold, color, muted, onClick, title }: {
  children: React.ReactNode; align?: 'left' | 'right'; bold?: boolean
  color?: string; muted?: boolean; onClick?: () => void; title?: string
}) {
  return (
    <td
      onClick={onClick}
      title={title}
      style={{
        padding: '13px 18px', fontSize: 14, textAlign: align, whiteSpace: 'nowrap',
        color: muted ? FLAT : (color ?? NAVY),
        fontWeight: bold ? 800 : (align === 'left' ? 500 : 400),
        cursor: onClick ? 'pointer' : undefined,
      }}
      className={onClick ? 'hover:underline' : undefined}
    >{children}</td>
  )
}
function bodyRowStyle(i: number): React.CSSProperties {
  return { borderBottom: `1px solid ${ROWLINE}`, background: i % 2 === 1 ? ZEBRA : undefined }
}
const totalRowStyle: React.CSSProperties = { background: TOTALROW, borderTop: `2px solid ${NAVY}` }

// ── Section card shell ──────────────────────────────────────────────────────────
function SectionCard({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="pdf-break"
      style={{
        scrollMarginTop: 96, background: CARD_GRAD, border: `1px solid ${BORDER}`,
        borderRadius: 20, boxShadow: SHADOW_MD, padding: '30px 34px', marginTop: 26,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 5, height: 26, background: BLUE, borderRadius: 999 }} />
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: NAVY }}>{title}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Sale Deal Modal ───────────────────────────────────────────────────────────
function SaleDealModal({ state, onClose }: { state: SaleModalState; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function fmtAmt(n: number | null) {
    if (n == null) return '—'
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 rounded-t-2xl" style={{ background: NAVY }}>
          <div>
            <h2 className="text-base font-semibold text-white">{state.title}</h2>
            {!state.loading && !state.error && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {state.deals.length} venta{state.deals.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="overflow-auto flex-1 px-5 py-4">
          {state.loading && (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: NAVY }} />
              <span className="text-sm">Cargando ventas…</span>
            </div>
          )}
          {state.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
              Error: {state.error}
            </div>
          )}
          {!state.loading && !state.error && (
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr style={{ background: NAVY }} className="text-left text-xs text-white uppercase tracking-wide">
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Case #</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Vendedor</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Rol</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha Cierre</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Pipeline</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Lead Source</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {state.deals.map((d, i) => (
                  <tr key={d.zohoId || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 border border-slate-200 font-mono text-xs" style={{ color: NAVY }}>{d.dealName ?? '—'}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-800 font-medium">{d.vendedor}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600 text-xs">{d.salesRole}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{d.closingDate}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-700">{d.pipeline}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600 max-w-[140px] truncate" title={d.leadSource}>{d.leadSource || '—'}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-800 text-right font-mono">{fmtAmt(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props { fromA: string; toA: string; fromB: string; toB: string }

export default function VentasDashboard({
  fromA: initFromA, toA: initToA, fromB: initFromB, toB: initToB,
}: Props) {
  const [fromA, setFromA] = useState(initFromA)
  const [toA,   setToA]   = useState(initToA)
  const [fromB, setFromB] = useState(initFromB)
  const [toB,   setToB]   = useState(initToB)
  const [applied, setApplied] = useState({ fromA: initFromA, toA: initToA, fromB: initFromB, toB: initToB })
  const [data,       setData]       = useState<SummaryData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [saleModal,  setSaleModal]  = useState<SaleModalState | null>(null)
  const [active,     setActive]     = useState('sec-kpi')
  const contentRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (fa: string, ta: string, fb: string, tb: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/ventas/summary?from_a=${fa}&to_a=${ta}&from_b=${fb}&to_b=${tb}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(initFromA, initToA, initFromB, initToB) }, [])

  // Scroll-spy: highlight the segment of the section in view
  useEffect(() => {
    if (loading || error || !data) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )
    SEGMENTS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [loading, error, data])

  function goTo(id: string) {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' })
    setActive(id)
  }

  function handleApply() {
    const r = { fromA, toA, fromB, toB }
    setApplied(r)
    fetchData(r.fromA, r.toA, r.fromB, r.toB)
  }

  function openSaleModal(title: string, roles: string[], from: string, to: string, exclude = false) {
    setSaleModal({ title, deals: [], loading: true, error: null })
    const params = new URLSearchParams({ from, to })
    roles.forEach(r => params.append('role', r))
    if (exclude) params.set('exclude', '1')
    fetch(`/api/ventas/deals?${params}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setSaleModal(prev => prev ? { ...prev, deals: d, loading: false } : null)
        else setSaleModal(prev => prev ? { ...prev, loading: false, error: d.error ?? 'Error' } : null)
      })
      .catch(e => setSaleModal(prev => prev ? { ...prev, loading: false, error: e.message } : null))
  }

  async function generatePDF() {
    if (!contentRef.current || pdfLoading) return
    setPdfLoading(true)
    try {
      window.scrollTo(0, 0)
      await new Promise(r => setTimeout(r, 150))

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])

      const el = contentRef.current

      const ignoredEls = Array.from(el.querySelectorAll('[data-pdf-ignore]')) as HTMLElement[]
      const prevDisplays = ignoredEls.map(e => e.style.display)
      ignoredEls.forEach(e => { e.style.display = 'none' })
      await new Promise(r => setTimeout(r, 80))

      const elRect = el.getBoundingClientRect()
      const breakPositions = Array.from(el.querySelectorAll('.pdf-break'))
        .map(b => b.getBoundingClientRect().top - elRect.top)

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#EEF2F9',
        scrollY: -window.scrollY,
        windowWidth: el.scrollWidth,
      })

      ignoredEls.forEach((e, i) => { e.style.display = prevDisplays[i] })

      const scaleRatio = canvas.width / el.offsetWidth
      const breaksPx   = breakPositions.map(b => b * scaleRatio)

      const A4W = 210, A4H = 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageHeightPx = Math.round((A4H / A4W) * canvas.width)

      let srcY = 0, firstPage = true
      while (srcY < canvas.height) {
        let endY = Math.min(srcY + pageHeightPx, canvas.height)
        const cutWindow = srcY + pageHeightPx * 0.35
        const candidates = breaksPx.filter(b => b > cutWindow && b < endY)
        if (candidates.length > 0) endY = Math.max(...candidates)

        const sliceH = endY - srcY
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width  = canvas.width
        sliceCanvas.height = sliceH
        sliceCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

        const imgData  = sliceCanvas.toDataURL('image/jpeg', 0.93)
        const sliceHMM = (sliceH / canvas.width) * A4W

        if (!firstPage) pdf.addPage()
        firstPage = false
        pdf.addImage(imgData, 'JPEG', 0, 0, A4W, sliceHMM)
        srcY = endY
      }

      pdf.save(`windmar-ventas-${applied.fromA}-${applied.toA}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  const rangeA = fmtRange(applied.fromA, applied.toA)
  const rangeB = fmtRange(applied.fromB, applied.toB)
  const colA   = colLabel(applied.fromA, applied.toA)
  const colB   = colLabel(applied.fromB, applied.toB)

  // ── Derived values ────────────────────────────────────────────────────────
  const totalA = data ? sumVentas(data.salesA) : 0
  const totalB = data ? sumVentas(data.salesB) : 0
  const salA   = data ? EMPLEADO_ROLES.reduce((s, r) => s + byRole(data.salesA, r), 0) : 0
  const salB   = data ? EMPLEADO_ROLES.reduce((s, r) => s + byRole(data.salesB, r), 0) : 0
  const fcA    = totalA - salA
  const fcB    = totalB - salB
  const diffTot = totalA - totalB

  const leadMapA = new Map<string, number>()
  const leadMapB = new Map<string, number>()
  if (data) {
    for (const r of data.salesA) { if (r.leadSource?.trim()) leadMapA.set(r.leadSource, (leadMapA.get(r.leadSource) ?? 0) + r.ventas) }
    for (const r of data.salesB) { if (r.leadSource?.trim()) leadMapB.set(r.leadSource, (leadMapB.get(r.leadSource) ?? 0) + r.ventas) }
  }
  const allSrcA    = Array.from(leadMapA.entries()).sort((a, b) => b[1] - a[1])
  const totalSrcA  = allSrcA.reduce((s, [, v]) => s + v, 0)
  const totalSrcB  = Array.from(leadMapB.values()).reduce((s, v) => s + v, 0)
  const pieSrcData = allSrcA.slice(0, 8).map(([name, value]) => ({ name, value }))

  const sellTotal = data?.sellers?.total ?? 0
  const sellAsl   = data?.sellers?.asalariados ?? 0
  const sellFc    = data?.sellers?.fullCommission ?? 0

  const hdLocs     = (MALL_BOOTH_LOCATIONS as unknown as readonly string[]).filter(l => l.startsWith('Home Depot'))
  const mallLocs   = (MALL_BOOTH_LOCATIONS as unknown as readonly string[]).filter(l => l.startsWith('Malls'))
  const hdTotalA   = hdLocs.reduce((s, l) => s + boothVentas(data?.boothA ?? [], l), 0)
  const hdTotalB   = hdLocs.reduce((s, l) => s + boothVentas(data?.boothB ?? [], l), 0)
  const mallTotalA = mallLocs.reduce((s, l) => s + boothVentas(data?.boothA ?? [], l), 0)
  const mallTotalB = mallLocs.reduce((s, l) => s + boothVentas(data?.boothB ?? [], l), 0)

  const coordNames = new Set<string>()
  data?.cambaceoA.forEach(r => coordNames.add(r.coordinador))
  data?.cambaceoB.forEach(r => coordNames.add(r.coordinador))
  const coordList  = Array.from(coordNames).sort()
  const coordMapA  = new Map(data?.cambaceoA.map(r => [r.coordinador, r]) ?? [])
  const coordMapB  = new Map(data?.cambaceoB.map(r => [r.coordinador, r]) ?? [])

  const indepKeys = new Set<string>()
  data?.indepA.forEach(r => indepKeys.add(indepKey(r)))
  data?.indepB.forEach(r => indepKeys.add(indepKey(r)))
  const indepList    = Array.from(indepKeys).sort()
  const indepMapA    = new Map<string, IndepBoothRow>(data?.indepA.map(r => [indepKey(r), r]) ?? [])
  const indepMapB    = new Map<string, IndepBoothRow>(data?.indepB.map(r => [indepKey(r), r]) ?? [])
  const activeIndepA = data?.indepA.filter(r => r.ventas > 0).length ?? 0
  const indepTotalA  = data?.indepA.reduce((s, r) => s + r.ventas, 0) ?? 0
  const indepTotalB  = data?.indepB.reduce((s, r) => s + r.ventas, 0) ?? 0

  const today = new Date()
  const reportLabel = today.toLocaleDateString('es-PR', { month: 'long', year: 'numeric' })

  // ── KPI config ───────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Ventas Totales', value: fmt(totalA), sub: colA, prev: fmt(totalB), accent: BLUE },
    { label: 'Variación',
      value: totalB === 0 ? '—' : `${diffTot > 0 ? '+' : ''}${diffTot}`,
      sub: totalB === 0 ? '—' : `${((diffTot / totalB) * 100).toFixed(1)}% vs ${colB}`,
      prev: '—', accent: ORANGE },
    { label: 'Asalariados', value: fmt(salA), sub: colA, prev: fmt(salB), accent: VIBRANT },
    { label: '% Asalariados', value: pct(salA, totalA), sub: colA, prev: pct(salB, totalB), accent: NAVY },
    { label: 'Full Commission', value: fmt(fcA), sub: colA, prev: fmt(fcB), accent: ORANGE },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="-mx-4 -mt-6 px-4 pb-16 min-h-screen"
      style={{ background: PAGE_BG, backgroundAttachment: 'fixed', fontFamily: SANS }}
    >
      {saleModal && <SaleDealModal state={saleModal} onClose={() => setSaleModal(null)} />}

      <div ref={contentRef} style={{ maxWidth: 1320, margin: '0 auto' }}>

        {/* ── HEADER BAND ── */}
        <div style={{
          background: HERO_GRAD, borderRadius: '0 0 28px 28px', padding: '40px 44px 38px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: SHADOW_BLUE, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -60, top: -80, width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,155,36,.18), transparent 70%)',
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 28, height: 3, background: ORANGE, borderRadius: 999 }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#AFC3EE' }}>
                Fuerza de Venta y Canales · Reporte Ejecutivo · Zoho CRM
              </span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(42px, 6vw, 64px)',
              lineHeight: 0.92, letterSpacing: '.01em', color: '#fff', textTransform: 'uppercase',
            }}>
              Dashboard <span style={{ color: ORANGE }}>de Ventas</span>
            </h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/windmar-white-yellow.png" alt="WindMar HOME"
            style={{ position: 'relative', height: 78, width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* ── PERIOD FILTER BAR (screen only) ── */}
        <div data-pdf-ignore="true" style={{
          background: '#fff', borderRadius: 20, boxShadow: SHADOW_MD, padding: '22px 28px',
          marginTop: 28, display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Dot color={NAVY} size={9} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: NAVY }}>Período A — Actual</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" value={fromA} onChange={e => setFromA(e.target.value)} style={dateInputStyle} />
              <span style={{ color: FLAT, fontWeight: 700 }}>–</span>
              <input type="date" value={toA} onChange={e => setToA(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Dot color={FLAT} size={9} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: GREY }}>Período B — Comparación</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" value={fromB} onChange={e => setFromB(e.target.value)} style={dateInputStyle} />
              <span style={{ color: FLAT, fontWeight: 700 }}>–</span>
              <input type="date" value={toB} onChange={e => setToB(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
          <button onClick={handleApply} style={{
            fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#fff', background: NAVY,
            border: 'none', borderRadius: 12, padding: '12px 30px', cursor: 'pointer',
          }}>Aplicar</button>
          <button onClick={generatePDF} disabled={pdfLoading} style={{
            marginLeft: 'auto', fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#fff',
            background: ORANGE, border: 'none', borderRadius: 12, padding: '12px 26px',
            cursor: 'pointer', opacity: pdfLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
          }}>{pdfLoading ? 'Generando…' : '↓ Descargar PDF'}</button>
        </div>

        {/* ── PERIOD LEGEND ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 18, padding: '0 8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Dot color={NAVY} size={10} />
            <span style={{ fontWeight: 800, color: NAVY, fontSize: 14, letterSpacing: '.04em' }}>PERÍODO A</span>
            <span style={{ color: GREY, fontSize: 14 }}>{rangeA}</span>
          </div>
          <span style={{ width: 1, height: 22, background: '#D5DCEA' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Dot color={FLAT} size={10} />
            <span style={{ fontWeight: 800, color: GREY, fontSize: 14, letterSpacing: '.04em' }}>PERÍODO B</span>
            <span style={{ color: GREY, fontSize: 14 }}>{rangeB}</span>
          </div>
        </div>

        {/* ── LIQUID GLASS SEGMENTED NAV (sticky) ── */}
        <div data-pdf-ignore="true" style={{ position: 'sticky', top: 16, zIndex: 50, display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <div style={{
            display: 'flex', gap: 4, padding: 6, borderRadius: 999,
            background: 'rgba(255,255,255,0.38)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow: '0 8px 30px rgba(33,39,78,0.16), inset 0 1px 1px rgba(255,255,255,0.85), inset 0 -1px 2px rgba(33,39,78,0.06)',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {SEGMENTS.map(s => {
              const on = active === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                  style={{
                    fontFamily: SANS, fontSize: 13.5, fontWeight: 700, letterSpacing: '.01em',
                    padding: '9px 20px', border: 'none', borderRadius: 999, cursor: 'pointer',
                    transition: 'all .25s ease', whiteSpace: 'nowrap',
                    color: on ? '#fff' : '#3A4156',
                    background: on ? 'linear-gradient(180deg, #2A56C4 0%, #1D429B 100%)' : 'transparent',
                    boxShadow: on ? '0 4px 14px rgba(29,66,155,0.45), inset 0 1px 1px rgba(255,255,255,0.4)' : 'none',
                  }}
                >{s.label}</button>
              )
            })}
          </div>
        </div>

        {/* ── LOADING / ERROR ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: NAVY }} />
              <span className="text-sm" style={{ color: GREY }}>Cargando datos…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm" style={{ marginTop: 22 }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── KPI CARDS ── */}
            <div id="sec-kpi" style={{ scrollMarginTop: 96, marginTop: 22 }} className="pdf-break">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18 }} className="max-md:!grid-cols-2">
                {kpis.map(k => (
                  <div key={k.label} style={{
                    background: '#fff', borderRadius: 18, boxShadow: SHADOW_MD,
                    padding: '22px 22px 20px', borderTop: `4px solid ${k.accent}`,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: GREY }}>{k.label}</div>
                    <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1, letterSpacing: '-.02em', color: NAVY, margin: '14px 0 8px' }}>{k.value}</div>
                    <div style={{ fontSize: 13, color: FLAT, fontWeight: 500 }}>{k.sub}</div>
                    <div style={{ borderTop: `1px solid ${ROWLINE}`, marginTop: 16, paddingTop: 12, fontSize: 13, color: GREY }}>
                      {colB}: <span style={{ fontWeight: 800, color: NAVY }}>{k.prev}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── VENDEDORES ACTIVOS + MIX ── */}
              <div style={{
                background: CARD_GRAD, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: SHADOW_MD,
                padding: '30px 34px', marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr',
                gap: 36, alignItems: 'center',
              }} className="max-lg:!grid-cols-1">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: GREY }}>Vendedores Activos</div>
                  <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, color: NAVY, margin: '10px 0 6px' }}>{fmt(sellTotal)}</div>
                  <div style={{ fontSize: 14, fontStyle: 'italic', color: FLAT }}>Status &quot;Activo&quot; en Sales Teams</div>
                </div>
                <div style={{ display: 'flex', gap: 28, borderLeft: `1px solid ${ROWLINE}`, paddingLeft: 32 }} className="max-lg:!border-l-0 max-lg:!pl-0">
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: NAVY }}>Asalariados</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: NAVY, margin: '8px 0 4px' }}>{fmt(sellAsl)}</div>
                    <div style={{ fontSize: 13, color: FLAT }}>{pct(sellAsl, sellTotal)} del equipo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: ORANGE600 }}>Full Commission</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: ORANGE, margin: '8px 0 4px' }}>{fmt(sellFc)}</div>
                    <div style={{ fontSize: 13, color: FLAT }}>{pct(sellFc, sellTotal)} del equipo</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 26, borderLeft: `1px solid ${ROWLINE}`, paddingLeft: 32 }} className="max-lg:!border-l-0 max-lg:!pl-0">
                  <ConicDonut size={130} hole={74} data={[{ value: sellAsl }, { value: sellFc }]} colors={[NAVY, ORANGE]} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: FLAT, marginBottom: 12 }}>Mix de Vendedores</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Dot color={NAVY} /><span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>Asalariados: {fmt(sellAsl)}</span><span style={{ color: FLAT, fontSize: 14 }}>({pct(sellAsl, sellTotal)})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Dot color={ORANGE} /><span style={{ fontWeight: 700, color: ORANGE600, fontSize: 14 }}>Full Commission: {fmt(sellFc)}</span><span style={{ color: FLAT, fontSize: 14 }}>({pct(sellFc, sellTotal)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PROGRAMA ASALARIADO ── */}
            <SectionCard id="sec-asalariado" title="Programa Asalariado">
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'center' }} className="max-lg:!grid-cols-1">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" radius="l">Rol</Th>
                        <Th>{colA}</Th>
                        <Th>%</Th>
                        <Th bg={HEADERB}>{colB}</Th>
                        <Th bg={HEADERB}>%</Th>
                        <Th radius="r">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {EMPLEADO_ROLES.map((role, i) => {
                        const va = byRole(data.salesA ?? [], role)
                        const vb = byRole(data.salesB ?? [], role)
                        const v  = varOf(va - vb)
                        return (
                          <tr key={role} style={bodyRowStyle(i)}>
                            <Td align="left">{role}</Td>
                            <Td bold onClick={va > 0 ? () => openSaleModal(`${role} — ${colA}`, [role], applied.fromA, applied.toA) : undefined}>{fmt(va)}</Td>
                            <Td muted>{pct(va, totalA)}</Td>
                            <Td onClick={vb > 0 ? () => openSaleModal(`${role} — ${colB}`, [role], applied.fromB, applied.toB) : undefined}>{fmt(vb)}</Td>
                            <Td muted>{pct(vb, totalB)}</Td>
                            <Td bold color={v.color}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={{ background: TOTALROW }}>
                        <Td align="left" bold>TOTAL Asalariados</Td>
                        <Td bold onClick={salA > 0 ? () => openSaleModal(`Asalariados — ${colA}`, [...EMPLEADO_ROLES], applied.fromA, applied.toA) : undefined}>{fmt(salA)}</Td>
                        <Td bold>{pct(salA, totalA)}</Td>
                        <Td onClick={salB > 0 ? () => openSaleModal(`Asalariados — ${colB}`, [...EMPLEADO_ROLES], applied.fromB, applied.toB) : undefined}>{fmt(salB)}</Td>
                        <Td>{pct(salB, totalB)}</Td>
                        <Td bold color={varOf(salA - salB).color}>{varOf(salA - salB).text}</Td>
                      </tr>
                      <tr style={totalRowStyle}>
                        <Td align="left" bold color={ORANGE600}>Full Commission</Td>
                        <Td bold onClick={fcA > 0 ? () => openSaleModal(`Full Commission — ${colA}`, [...EMPLEADO_ROLES], applied.fromA, applied.toA, true) : undefined}>{fmt(fcA)}</Td>
                        <Td bold>{pct(fcA, totalA)}</Td>
                        <Td onClick={fcB > 0 ? () => openSaleModal(`Full Commission — ${colB}`, [...EMPLEADO_ROLES], applied.fromB, applied.toB, true) : undefined}>{fmt(fcB)}</Td>
                        <Td>{pct(fcB, totalB)}</Td>
                        <Td bold color={varOf(fcA - fcB).color}>{varOf(fcA - fcB).text}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: FLAT, marginBottom: 18 }}>Mix de Ventas — {colA}</div>
                  <ConicDonut size={168} hole={92} data={[{ value: salA }, { value: fcA }]} colors={[NAVY, ORANGE]} />
                  <div style={{ display: 'flex', gap: 22, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Dot color={NAVY} /><span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>Asalariados: {fmt(salA)} ({pct(salA, totalA)})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Dot color={ORANGE} /><span style={{ fontWeight: 700, color: ORANGE600, fontSize: 14 }}>Full Commission: {fmt(fcA)} ({pct(fcA, totalA)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── VENTAS POR LEAD SOURCE ── */}
            <SectionCard id="sec-lead" title="Ventas por Lead Source">
              <div style={{ display: 'grid', gridTemplateColumns: '.85fr 1.4fr', gap: 40, alignItems: 'start' }} className="max-lg:!grid-cols-1">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: FLAT, marginBottom: 18 }}>Top Sources — {colA}</div>
                  <ConicDonut size={178} hole={96} data={pieSrcData} colors={LEAD_COLORS} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 22 }}>
                    {pieSrcData.map((l, i) => (
                      <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Dot color={LEAD_COLORS[i % LEAD_COLORS.length]} size={10} />
                        <span style={{ fontSize: 13, color: '#4B4B4E' }} title={l.name}>{l.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" bg={BLUE} radius="l">Lead Source</Th>
                        <Th bg={BLUE}>{colA}</Th>
                        <Th bg={BLUE}>%</Th>
                        <Th bg={HEADERB}>{colB}</Th>
                        <Th bg={BLUE} radius="r">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSrcA.map(([source, va], i) => {
                        const vb = leadMapB.get(source) ?? 0
                        const v  = varOf(va - vb)
                        return (
                          <tr key={source} style={bodyRowStyle(i)}>
                            <Td align="left" title={source}>{source}</Td>
                            <Td bold>{fmt(va)}</Td>
                            <Td muted>{pct(va, totalSrcA)}</Td>
                            <Td>{fmt(vb)}</Td>
                            <Td bold color={v.color}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={totalRowStyle}>
                        <Td align="left" bold>TOTAL</Td>
                        <Td bold>{fmt(totalSrcA)}</Td>
                        <Td bold>100%</Td>
                        <Td>{fmt(totalSrcB)}</Td>
                        <Td bold color={varOf(totalSrcA - totalSrcB).color}>{varOf(totalSrcA - totalSrcB).text}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            {/* ── BOOTHS — MALL & HOME DEPOT ── */}
            <SectionCard id="sec-booths" title="Booths — Mall & Home Depot">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }} className="max-lg:!grid-cols-1">
                {/* Home Depot */}
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: BLUE }}>Home Depot</span>{' '}
                    <span style={{ fontSize: 13, color: FLAT }}>({hdLocs.length} ubicaciones)</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" radius="l">Ubicación</Th>
                        <Th>{colA}</Th>
                        <Th bg={HEADERB}>{colB}</Th>
                        <Th radius="r">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {hdLocs.map((loc, i) => {
                        const va = boothVentas(data.boothA ?? [], loc)
                        const vb = boothVentas(data.boothB ?? [], loc)
                        const v  = varOf(va - vb)
                        return (
                          <tr key={loc} style={bodyRowStyle(i)}>
                            <Td align="left">{loc.replace('Home Depot - ', '')}</Td>
                            <Td bold>{fmt(va)}</Td>
                            <Td>{fmt(vb)}</Td>
                            <Td bold color={v.color}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={totalRowStyle}>
                        <Td align="left" bold>TOTAL HD</Td>
                        <Td bold>{fmt(hdTotalA)}</Td>
                        <Td>{fmt(hdTotalB)}</Td>
                        <Td bold color={varOf(hdTotalA - hdTotalB).color}>{varOf(hdTotalA - hdTotalB).text}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Malls */}
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: BLUE }}>Malls</span>{' '}
                    <span style={{ fontSize: 13, color: FLAT }}>({mallLocs.length} ubicaciones)</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" radius="l">Ubicación</Th>
                        <Th>{colA}</Th>
                        <Th bg={HEADERB}>{colB}</Th>
                        <Th radius="r">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {mallLocs.map((loc, i) => {
                        const va = boothVentas(data.boothA ?? [], loc)
                        const vb = boothVentas(data.boothB ?? [], loc)
                        const v  = varOf(va - vb)
                        return (
                          <tr key={loc} style={bodyRowStyle(i)}>
                            <Td align="left">{loc.replace('Malls - ', '')}</Td>
                            <Td bold>{fmt(va)}</Td>
                            <Td>{fmt(vb)}</Td>
                            <Td bold color={v.color}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={totalRowStyle}>
                        <Td align="left" bold>TOTAL Malls</Td>
                        <Td bold>{fmt(mallTotalA)}</Td>
                        <Td>{fmt(mallTotalB)}</Td>
                        <Td bold color={varOf(mallTotalA - mallTotalB).color}>{varOf(mallTotalA - mallTotalB).text}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            {/* ── CAMBACEO ── */}
            <SectionCard id="sec-cambaceo" title="Cambaceo — Coordinadores">
              {coordList.length === 0 ? (
                <p style={{ fontSize: 14, color: FLAT }}>Sin datos de coordinadores para este período.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" bg={BLUE} radius="l">Coordinador</Th>
                        <Th bg={BLUE}>Leads {colA}</Th>
                        <Th bg={BLUE}>Ventas {colA}</Th>
                        <Th bg={HEADERB}>Leads {colB}</Th>
                        <Th bg={HEADERB}>Ventas {colB}</Th>
                        <Th bg={BLUE} radius="r">Var. Vtas</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {coordList.map((coord, i) => {
                        const ra = coordMapA.get(coord)
                        const rb = coordMapB.get(coord)
                        const la = ra?.leads  ?? 0
                        const lb = rb?.leads  ?? 0
                        const va = ra?.ventas ?? 0
                        const vb = rb?.ventas ?? 0
                        const vv = varOf(va - vb)
                        return (
                          <tr key={coord} style={bodyRowStyle(i)}>
                            <Td align="left">{coord}</Td>
                            <Td>{fmt(la)}</Td>
                            <Td bold>{fmt(va)}</Td>
                            <Td>{fmt(lb)}</Td>
                            <Td>{fmt(vb)}</Td>
                            <Td bold color={vv.color}>{vv.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={totalRowStyle}>
                        <Td align="left" bold>TOTAL</Td>
                        <Td bold>{fmt(coordList.reduce((s, c) => s + (coordMapA.get(c)?.leads ?? 0), 0))}</Td>
                        <Td bold>{fmt(coordList.reduce((s, c) => s + (coordMapA.get(c)?.ventas ?? 0), 0))}</Td>
                        <Td>{fmt(coordList.reduce((s, c) => s + (coordMapB.get(c)?.leads ?? 0), 0))}</Td>
                        <Td>{fmt(coordList.reduce((s, c) => s + (coordMapB.get(c)?.ventas ?? 0), 0))}</Td>
                        <Td>{''}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* ── BOOTHS INDEPENDIENTES & EVENTOS ── */}
            <SectionCard title="Booths Independientes & Eventos">
              <div style={{
                display: 'inline-block', background: ORANGE, color: '#fff', fontSize: 12, fontWeight: 700,
                letterSpacing: '.04em', padding: '7px 16px', borderRadius: 999, marginBottom: 18,
              }}>{activeIndepA} fuentes activas · {colA}</div>
              {indepList.length === 0 ? (
                <p style={{ fontSize: 14, color: FLAT }}>Sin datos para este período.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th align="left" radius="l">Booth / Fuente</Th>
                        <Th>{colA}</Th>
                        <Th>%</Th>
                        <Th bg={HEADERB}>{colB}</Th>
                        <Th radius="r">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {indepList.map((key, i) => {
                        const rowA = indepMapA.get(key)
                        const rowB = indepMapB.get(key)
                        const va   = rowA?.ventas ?? 0
                        const vb   = rowB?.ventas ?? 0
                        const v    = varOf(va - vb)
                        const name = indepDisplay((rowA ?? rowB)!)
                        return (
                          <tr key={key} style={bodyRowStyle(i)}>
                            <Td align="left" title={name}>{name}</Td>
                            <Td bold>{fmt(va)}</Td>
                            <Td muted>{pct(va, indepTotalA)}</Td>
                            <Td>{fmt(vb)}</Td>
                            <Td bold color={v.color}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <tr style={totalRowStyle}>
                        <Td align="left" bold>TOTAL</Td>
                        <Td bold>{fmt(indepTotalA)}</Td>
                        <Td bold>100%</Td>
                        <Td>{fmt(indepTotalB)}</Td>
                        <Td bold color={varOf(indepTotalA - indepTotalB).color}>{varOf(indepTotalA - indepTotalB).text}</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* ── FOOTER ── */}
            <div style={{ textAlign: 'center', fontSize: 12, color: FLAT, padding: '18px 0 0' }}>
              Windmar Home · Dashboard Ejecutivo · {reportLabel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const dateInputStyle: React.CSSProperties = {
  fontFamily: SANS, fontSize: 15, fontWeight: 600, color: '#21274E',
  border: '1.5px solid #DDE3EE', borderRadius: 12, padding: '10px 14px',
}

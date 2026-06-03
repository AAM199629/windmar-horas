'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
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

// ── Brand palette ─────────────────────────────────────────────────────────────
const PALETTE = ['#0D1654','#E88B0C','#1565C0','#00A651','#64748b','#2196F3','#F5A623','#DC2626','#7C3AED','#0891B2']
const NAVY    = '#0D1654'
const ORANGE  = '#E88B0C'
const BLUE    = '#1565C0'

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
function varLabel(a: number, b: number) {
  if (b === 0) return { text: '—', color: '#94a3b8' }
  const diff = a - b
  if (diff > 0) return { text: `▲ +${diff}`, color: '#16a34a' }
  if (diff < 0) return { text: `▼ ${diff}`, color: '#dc2626' }
  return { text: '—', color: '#94a3b8' }
}

// ── Aggregation helpers ───────────────────────────────────────────────────────
function sumVentas(rows: SalesGroupRow[]) { return rows.reduce((s, r) => s + r.ventas, 0) }
function byRole(rows: SalesGroupRow[], role: string) {
  return rows.filter(r => r.salesRole === role).reduce((s, r) => s + r.ventas, 0)
}
function bySource(rows: SalesGroupRow[], src: string) {
  return rows.filter(r => r.leadSource === src).reduce((s, r) => s + r.ventas, 0)
}
function boothVentas(rows: BoothSaleRow[] | undefined, location: string) {
  return rows?.find(r => r.booth === location)?.ventas ?? 0
}

// ── Indep booth helpers ───────────────────────────────────────────────────────
function indepKey(r: IndepBoothRow) {
  return r.boothName ? `${r.leadSource}||${r.boothName}` : r.leadSource
}
function indepDisplay(r: IndepBoothRow) {
  return r.boothName ? `${r.leadSource} › ${r.boothName}` : r.leadSource
}

// ── Donut (custom SVG — no Recharts layout quirks) ───────────────────────────
function DonutMini({
  data, colors, size = 120,
}: { data: { name: string; value: number }[]; colors: string[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ width: size, height: size }} />
  const cx = size / 2, cy = size / 2
  const R = size * 0.44, ri = size * 0.27
  let θ = -Math.PI / 2
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const θ0 = θ; θ += sweep
    const [c0, s0, c1, s1] = [Math.cos(θ0), Math.sin(θ0), Math.cos(θ), Math.sin(θ)]
    const lg = sweep > Math.PI ? 1 : 0
    const path = `M${cx+R*c0} ${cy+R*s0} A${R} ${R} 0 ${lg} 1 ${cx+R*c1} ${cy+R*s1} L${cx+ri*c1} ${cy+ri*s1} A${ri} ${ri} 0 ${lg} 0 ${cx+ri*c0} ${cy+ri*s0}Z`
    return { path, color: colors[i % colors.length], ...d }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
    </svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title, badge, accent = NAVY, children,
}: { title: string; badge?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm print:shadow-none print:border print:border-slate-300">
      <div style={{ background: accent }} className="px-6 py-3 flex items-center justify-between gap-4">
        <h2
          className="text-base font-bold uppercase tracking-widest text-white"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
        >
          {title}
        </h2>
        {badge && (
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="bg-white p-6 print:p-4">{children}</div>
    </div>
  )
}

function KpiCard({ label, primary, sub, secondary, secondaryLabel }: {
  label: string; primary: string | number; sub?: string
  secondary?: string | number; secondaryLabel?: string
}) {
  return (
    <div
      style={{ borderTop: `3px solid ${ORANGE}` }}
      className="rounded-xl bg-white shadow-sm px-5 py-4 flex flex-col gap-0.5 print:shadow-none print:border print:border-slate-300"
    >
      <span className="text-xs font-semibold uppercase tracking-widest truncate" style={{ color: '#94a3b8' }}>
        {label}
      </span>
      <span className="text-3xl font-bold leading-tight" style={{ color: NAVY, fontFamily: 'Bebas Neue, sans-serif' }}>
        {primary}
      </span>
      {sub && <span className="text-xs" style={{ color: '#94a3b8' }}>{sub}</span>}
      {secondary !== undefined && (
        <div className="mt-1 pt-1.5 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            {secondaryLabel}: <span className="font-semibold text-slate-500">{secondary}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// Th with correct style merge (bg + any extra style prop)
function Th({
  children, className = '', bg = NAVY, style: styleProp, ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { className?: string; bg?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap ${className}`}
      style={{ background: bg, ...styleProp }}
      {...rest}
    >
      {children}
    </th>
  )
}

function Td({ children, className = '', ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return <td className={`px-3 py-2 text-sm ${className}`} {...rest}>{children}</td>
}

function TotalRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="font-bold text-sm border-t-2" style={{ background: 'rgba(13,22,84,0.07)', borderTopColor: NAVY }}>
      {children}
    </tr>
  )
}

function PeriodPill({ label, range, color }: { label: string; range: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      <span className="text-xs text-slate-500">{range}</span>
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
  const [data,         setData]         = useState<SummaryData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [pdfLoading,   setPdfLoading]   = useState(false)
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

  function handleApply() {
    const r = { fromA, toA, fromB, toB }
    setApplied(r)
    fetchData(r.fromA, r.toA, r.fromB, r.toB)
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

      // Hide ignored elements BEFORE measuring so layout matches the canvas exactly
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
        backgroundColor: '#EEF1F8',
        scrollY: -window.scrollY,
        windowWidth: el.scrollWidth,
      })

      // Restore hidden elements
      ignoredEls.forEach((e, i) => { e.style.display = prevDisplays[i] })

      const scaleRatio = canvas.width / el.offsetWidth
      const breaksPx   = breakPositions.map(b => b * scaleRatio)

      const A4W = 297, A4H = 210
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageHeightPx = Math.round((A4H / A4W) * canvas.width)

      let srcY = 0, firstPage = true
      while (srcY < canvas.height) {
        let endY = Math.min(srcY + pageHeightPx, canvas.height)
        // look for break markers from 35% of the page onward; take the LATEST one to
        // maximise page content while still never cutting mid-section
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

  const leadMapA = new Map<string, number>()
  const leadMapB = new Map<string, number>()
  if (data) {
    for (const r of data.salesA) { if (r.leadSource?.trim()) leadMapA.set(r.leadSource, (leadMapA.get(r.leadSource) ?? 0) + r.ventas) }
    for (const r of data.salesB) { if (r.leadSource?.trim()) leadMapB.set(r.leadSource, (leadMapB.get(r.leadSource) ?? 0) + r.ventas) }
  }
  const allSrcA    = Array.from(leadMapA.entries()).sort((a, b) => b[1] - a[1])
  const totalSrcA  = allSrcA.reduce((s, [, v]) => s + v, 0)
  const pieSrcData = allSrcA.slice(0, 8).map(([name, value]) => ({ name, value }))

  const pieSalData = [
    { name: 'Asalariados',     value: salA },
    { name: 'Full Commission', value: fcA  },
  ]

  const sellTotal = data?.sellers?.total ?? 0
  const sellAsl   = data?.sellers?.asalariados ?? 0
  const sellFc    = data?.sellers?.fullCommission ?? 0
  const pieSellerData = [
    { name: 'Asalariados',     value: sellAsl },
    { name: 'Full Commission', value: sellFc  },
  ]

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

  // Indep: key by "leadSource||boothName" to handle rows with same leadSource but different booths
  const indepKeys = new Set<string>()
  data?.indepA.forEach(r => indepKeys.add(indepKey(r)))
  data?.indepB.forEach(r => indepKeys.add(indepKey(r)))
  const indepList  = Array.from(indepKeys).sort()
  const indepMapA  = new Map<string, IndepBoothRow>(data?.indepA.map(r => [indepKey(r), r]) ?? [])
  const indepMapB  = new Map<string, IndepBoothRow>(data?.indepB.map(r => [indepKey(r), r]) ?? [])
  const activeIndepA = data?.indepA.filter(r => r.ventas > 0).length ?? 0
  const indepTotalA  = data?.indepA.reduce((s, r) => s + r.ventas, 0) ?? 0
  const indepTotalB  = data?.indepB.reduce((s, r) => s + r.ventas, 0) ?? 0

  const today = new Date()
  const reportLabel = today.toLocaleDateString('es-PR', { month: 'long', year: 'numeric' })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={contentRef} className="min-h-screen" style={{ background: '#EEF1F8' }}>

      {/* ── HEADER ── */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2870 100%)` }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Image src="/windmar-logo.png" alt="Windmar" width={120} height={36} className="brightness-0 invert" />
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }} className="pl-5">
              <div
                className="text-white font-bold text-2xl"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
              >
                DASHBOARD DE VENTAS
              </div>
              <div className="text-white/55 text-xs mt-0.5 uppercase tracking-widest">
                Fuerza de Venta y Canales · Reporte Ejecutivo
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 print:hidden" data-pdf-ignore="true">
            <span className="text-white/40 text-sm capitalize">{reportLabel}</span>
            <button
              onClick={generatePDF}
              disabled={pdfLoading}
              style={{ background: ORANGE }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {pdfLoading ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>
          <div className="hidden print:block text-right">
            <span className="text-white/60 text-xs capitalize">{reportLabel}</span>
          </div>
        </div>
      </div>

      {/* ── DATE CONTROLS (screen only) ── */}
      <div className="print:hidden max-w-7xl mx-auto px-6 py-4" data-pdf-ignore="true">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: NAVY }}>
              <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: NAVY }} />
              Período A — Actual
            </p>
            <div className="flex items-center gap-2">
              <input type="date" value={fromA} onChange={e => setFromA(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D1654]" />
              <span className="text-slate-400 text-sm">–</span>
              <input type="date" value={toA} onChange={e => setToA(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0D1654]" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: '#64748b' }}>
              <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: '#64748b' }} />
              Período B — Comparación
            </p>
            <div className="flex items-center gap-2">
              <input type="date" value={fromB} onChange={e => setFromB(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#64748b]" />
              <span className="text-slate-400 text-sm">–</span>
              <input type="date" value={toB} onChange={e => setToB(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#64748b]" />
            </div>
          </div>
          <button
            onClick={handleApply}
            style={{ background: NAVY }}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* ── PERIOD LEGEND BAR ── */}
      <div className="max-w-7xl mx-auto px-6 print:px-4 print:pt-4">
        <div className="bg-white/80 print:bg-white rounded-xl px-5 py-3 flex flex-wrap gap-6 items-center border border-white/60 print:border-slate-300 print:mb-4 shadow-sm print:shadow-none">
          <PeriodPill label="Período A" range={rangeA} color={NAVY} />
          <div className="w-px h-4 bg-slate-200" />
          <PeriodPill label="Período B" range={rangeB} color="#64748b" />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 pb-12 pt-4 space-y-6 print:px-4 print:pt-2 print:pb-0 print:space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0D1654] rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Cargando datos…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm">
            Error: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── KPI STRIP ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5">
              <KpiCard
                label="Ventas Totales"
                primary={fmt(totalA)} sub={colA}
                secondary={fmt(totalB)} secondaryLabel={colB}
              />
              <KpiCard
                label="Variación"
                primary={totalB === 0 ? '—' : `${totalA - totalB > 0 ? '+' : ''}${totalA - totalB}`}
                sub={totalB === 0 ? undefined : `${(((totalA - totalB) / totalB) * 100).toFixed(1)}% vs ${colB}`}
              />
              <KpiCard
                label="Asalariados"
                primary={fmt(salA)} sub={colA}
                secondary={fmt(salB)} secondaryLabel={colB}
              />
              <KpiCard
                label="% Asalariados"
                primary={pct(salA, totalA)} sub={colA}
                secondary={pct(salB, totalB)} secondaryLabel={colB}
              />
              <KpiCard
                label="Full Commission"
                primary={fmt(fcA)} sub={colA}
                secondary={fmt(fcB)} secondaryLabel={colB}
              />
            </div>

            {/* ── FUERZA DE VENTAS — vendedores activos + pie ── */}
            <div className="rounded-xl overflow-hidden shadow-sm print:shadow-none print:border print:border-slate-300 bg-white">
              <div className="px-6 py-4 flex flex-wrap items-center gap-6 lg:gap-10">
                {/* Stat block */}
                <div className="flex flex-col gap-0.5 min-w-[130px]">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                    Vendedores Activos
                  </span>
                  <span className="text-4xl font-bold leading-tight" style={{ color: NAVY, fontFamily: 'Bebas Neue, sans-serif' }}>
                    {sellTotal}
                  </span>
                  <span className="text-xs italic" style={{ color: '#94a3b8' }}>Status "Activo" en Sales Teams</span>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px self-stretch bg-slate-100" />

                {/* Breakdown numbers */}
                <div className="flex gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: PALETTE[0] }}>Asalariados</span>
                    <span className="text-2xl font-bold" style={{ color: NAVY, fontFamily: 'Bebas Neue, sans-serif' }}>{sellAsl}</span>
                    <span className="text-xs text-slate-400">{sellTotal > 0 ? pct(sellAsl, sellTotal) : '—'} del equipo</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: PALETTE[1] }}>Full Commission</span>
                    <span className="text-2xl font-bold" style={{ color: NAVY, fontFamily: 'Bebas Neue, sans-serif' }}>{sellFc}</span>
                    <span className="text-xs text-slate-400">{sellTotal > 0 ? pct(sellFc, sellTotal) : '—'} del equipo</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px self-stretch bg-slate-100" />

                {/* Mini donut — hand-drawn SVG, zero clipping risk */}
                {sellTotal > 0 && (
                  <div className="flex-shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">Mix de Vendedores</p>
                    <div className="flex items-center gap-5">
                      <DonutMini data={pieSellerData} colors={[PALETTE[0], PALETTE[1]]} size={110} />
                      <div className="flex flex-col gap-2.5">
                        {pieSellerData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i] }} />
                            <span className="text-xs text-slate-600">
                              <span className="font-semibold" style={{ color: PALETTE[i] }}>{d.name}:</span>{' '}
                              <strong style={{ color: NAVY }}>{fmt(d.value)}</strong>{' '}
                              <span className="text-slate-400">({pct(d.value, sellTotal)})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pdf-break h-0" />
            {/* ── PROGRAMA ASALARIADO ── */}
            <SectionCard title="Programa Asalariado" badge={`${colA} vs ${colB}`} accent={NAVY}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div className="lg:col-span-3 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <Th>Rol</Th>
                        <Th className="text-right">{colA}</Th>
                        <Th className="text-right">%</Th>
                        <Th className="text-right" bg="#334155">{colB}</Th>
                        <Th className="text-right" bg="#334155">%</Th>
                        <Th className="text-right">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {EMPLEADO_ROLES.map((role, i) => {
                        const va = byRole(data.salesA ?? [], role)
                        const vb = byRole(data.salesB ?? [], role)
                        const v  = varLabel(va, vb)
                        return (
                          <tr key={role} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td className="font-medium">{role}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right text-xs text-slate-400">{pct(va, totalA)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right text-xs text-slate-400">{pct(vb, totalB)}</Td>
                            <Td className="text-right font-semibold" style={{ color: v.color }}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL Asalariados</Td>
                        <Td className="text-right">{fmt(salA)}</Td>
                        <Td className="text-right text-xs">{pct(salA, totalA)}</Td>
                        <Td className="text-right">{fmt(salB)}</Td>
                        <Td className="text-right text-xs">{pct(salB, totalB)}</Td>
                        <Td className="text-right" style={{ color: varLabel(salA, salB).color }}>{varLabel(salA, salB).text}</Td>
                      </TotalRow>
                      <TotalRow>
                        <Td>Full Commission</Td>
                        <Td className="text-right">{fmt(fcA)}</Td>
                        <Td className="text-right text-xs">{pct(fcA, totalA)}</Td>
                        <Td className="text-right">{fmt(fcB)}</Td>
                        <Td className="text-right text-xs">{pct(fcB, totalB)}</Td>
                        <Td className="text-right" style={{ color: varLabel(fcA, fcB).color }}>{varLabel(fcA, fcB).text}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
                {/* Donut — no inline labels, Legend only */}
                <div className="lg:col-span-2 flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                    Mix de Ventas — {colA}
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieSalData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        isAnimationActive={false}
                        label={false}
                      >
                        {pieSalData.map((_, idx) => <Cell key={idx} fill={PALETTE[idx]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Ventas']} />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={(value: string, entry: any) =>
                          `${value}: ${fmt(entry.payload?.value ?? 0)} (${pct(entry.payload?.value ?? 0, totalA)})`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </SectionCard>

            <div className="pdf-break h-0" />
            {/* ── VENTAS POR LEAD SOURCE ── */}
            <SectionCard title="Ventas por Lead Source" badge={`${colA} vs ${colB}`} accent={BLUE}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Donut */}
                <div className="lg:col-span-2 flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-400">
                    Top Sources — {colA}
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieSrcData}
                        cx="50%"
                        cy="42%"
                        innerRadius={52}
                        outerRadius={82}
                        dataKey="value"
                        isAnimationActive={false}
                        label={false}
                      >
                        {pieSrcData.map((_, idx) => <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Ventas']} />
                      <Legend iconType="circle" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Table */}
                <div className="lg:col-span-3 overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0">
                      <tr>
                        <Th bg={BLUE}>Lead Source</Th>
                        <Th bg={BLUE} className="text-right">{colA}</Th>
                        <Th bg={BLUE} className="text-right">%</Th>
                        <Th bg="#334155" className="text-right">{colB}</Th>
                        <Th bg={BLUE} className="text-right">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSrcA.map(([source, va], i) => {
                        const vb = leadMapB.get(source) ?? 0
                        const v  = varLabel(va, vb)
                        return (
                          <tr key={source} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td className="max-w-[180px] truncate" title={source}>{source}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right text-xs text-slate-400">{pct(va, totalSrcA)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right font-semibold" style={{ color: v.color }}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL</Td>
                        <Td className="text-right">{fmt(totalSrcA)}</Td>
                        <Td className="text-right">100%</Td>
                        <Td className="text-right">{fmt(Array.from(leadMapB.values()).reduce((s, v) => s + v, 0))}</Td>
                        <Td>{''}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <div className="pdf-break h-0" />
            {/* ── BOOTHS — MALL & HOME DEPOT ── */}
            <SectionCard title="Booths — Mall &amp; Home Depot" badge={`${colA} vs ${colB}`} accent={NAVY}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Home Depot */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BLUE }}>Home Depot</span>
                    <span className="text-xs text-slate-400">({hdLocs.length} ubicaciones)</span>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <Th>Ubicación</Th>
                        <Th className="text-right">{colA}</Th>
                        <Th className="text-right" bg="#334155">{colB}</Th>
                        <Th className="text-right">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {hdLocs.map((loc, i) => {
                        const va = boothVentas(data.boothA ?? [], loc)
                        const vb = boothVentas(data.boothB ?? [], loc)
                        const v  = varLabel(va, vb)
                        return (
                          <tr key={loc} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td>{loc.replace('Home Depot - ', '')}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right font-semibold" style={{ color: v.color }}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL HD</Td>
                        <Td className="text-right">{fmt(hdTotalA)}</Td>
                        <Td className="text-right">{fmt(hdTotalB)}</Td>
                        <Td className="text-right" style={{ color: varLabel(hdTotalA, hdTotalB).color }}>{varLabel(hdTotalA, hdTotalB).text}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
                {/* Malls */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BLUE }}>Malls</span>
                    <span className="text-xs text-slate-400">({mallLocs.length} ubicaciones)</span>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <Th>Ubicación</Th>
                        <Th className="text-right">{colA}</Th>
                        <Th className="text-right" bg="#334155">{colB}</Th>
                        <Th className="text-right">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {mallLocs.map((loc, i) => {
                        const va = boothVentas(data.boothA ?? [], loc)
                        const vb = boothVentas(data.boothB ?? [], loc)
                        const v  = varLabel(va, vb)
                        return (
                          <tr key={loc} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td>{loc.replace('Malls - ', '')}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right font-semibold" style={{ color: v.color }}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL Malls</Td>
                        <Td className="text-right">{fmt(mallTotalA)}</Td>
                        <Td className="text-right">{fmt(mallTotalB)}</Td>
                        <Td className="text-right" style={{ color: varLabel(mallTotalA, mallTotalB).color }}>{varLabel(mallTotalA, mallTotalB).text}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            <div className="pdf-break h-0" />
            {/* ── CAMBACEO ── */}
            <SectionCard title="Cambaceo — Coordinadores" badge={`${colA} vs ${colB}`} accent="#16537E">
              {coordList.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos de coordinadores para este período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <Th bg="#16537E">Coordinador</Th>
                        <Th bg="#16537E" className="text-right">Leads {colA}</Th>
                        <Th bg="#16537E" className="text-right">Ventas {colA}</Th>
                        <Th bg="#334155" className="text-right">Leads {colB}</Th>
                        <Th bg="#334155" className="text-right">Ventas {colB}</Th>
                        <Th bg="#16537E" className="text-right">Var. Vtas</Th>
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
                        const vv = varLabel(va, vb)
                        return (
                          <tr key={coord} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td className="font-medium">{coord}</Td>
                            <Td className="text-right">{fmt(la)}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right">{fmt(lb)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right font-semibold" style={{ color: vv.color }}>{vv.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL</Td>
                        <Td className="text-right">{fmt(coordList.reduce((s, c) => s + (coordMapA.get(c)?.leads ?? 0), 0))}</Td>
                        <Td className="text-right">{fmt(coordList.reduce((s, c) => s + (coordMapA.get(c)?.ventas ?? 0), 0))}</Td>
                        <Td className="text-right">{fmt(coordList.reduce((s, c) => s + (coordMapB.get(c)?.leads ?? 0), 0))}</Td>
                        <Td className="text-right">{fmt(coordList.reduce((s, c) => s + (coordMapB.get(c)?.ventas ?? 0), 0))}</Td>
                        <Td>{''}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <div className="pdf-break h-0" />
            {/* ── BOOTHS INDEPENDIENTES ── */}
            <SectionCard title="Booths Independientes &amp; Eventos" badge={`${colA} vs ${colB}`} accent={NAVY}>
              <div className="mb-4">
                <span
                  style={{ background: ORANGE }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                >
                  {activeIndepA} fuentes activas · {colA}
                </span>
              </div>
              {indepList.length === 0 ? (
                <p className="text-sm text-slate-400">Sin datos para este período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <Th>Booth / Fuente</Th>
                        <Th className="text-right">{colA}</Th>
                        <Th className="text-right">%</Th>
                        <Th className="text-right" bg="#334155">{colB}</Th>
                        <Th className="text-right">Var.</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {indepList.map((key, i) => {
                        const rowA = indepMapA.get(key)
                        const rowB = indepMapB.get(key)
                        const va   = rowA?.ventas ?? 0
                        const vb   = rowB?.ventas ?? 0
                        const v    = varLabel(va, vb)
                        const src  = rowA ?? rowB!
                        const name = indepDisplay(src)
                        return (
                          <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <Td className="max-w-[260px] truncate" title={name}>{name}</Td>
                            <Td className="text-right font-bold" style={{ color: NAVY }}>{fmt(va)}</Td>
                            <Td className="text-right text-xs text-slate-400">{pct(va, indepTotalA)}</Td>
                            <Td className="text-right">{fmt(vb)}</Td>
                            <Td className="text-right font-semibold" style={{ color: v.color }}>{v.text}</Td>
                          </tr>
                        )
                      })}
                      <TotalRow>
                        <Td>TOTAL</Td>
                        <Td className="text-right">{fmt(indepTotalA)}</Td>
                        <Td className="text-right">100%</Td>
                        <Td className="text-right">{fmt(indepTotalB)}</Td>
                        <Td>{''}</Td>
                      </TotalRow>
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* ── FOOTER ── */}
            <div className="text-center text-xs text-slate-400 py-2 print:py-1">
              Windmar Home · Dashboard Ejecutivo · {reportLabel}
            </div>
          </>
        )}
      </div>

      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          header, nav { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4 landscape; }
        }
      `}</style>
    </div>
  )
}

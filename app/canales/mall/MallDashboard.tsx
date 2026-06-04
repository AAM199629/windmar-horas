'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { MallBoothDealDetail, MallBoothLeadDetail } from '@/lib/redshift'
import DealModal from './DealModal'
import LeadModal from './LeadModal'

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
}

const LOCATION_ORDER = [
  'Home Depot - Caguas',
  'Home Depot - Colobos',
  'Home Depot - Escorial',
  'Home Depot - Hatillo',
  'Home Depot - Humacao',
  'Home Depot - Mayaguez',
  'Home Depot - Montehiedra',
  'Home Depot - Plaza del Sol',
  'Home Depot - Ponce',
  'Home Depot - Rexville',
  'Malls - Aguadilla Mall',
  'Malls - Plaza del Caribe',
  'Malls - Plaza las Americas',
  'Malls - Santa Rosa',
]

const LOCATION_DISPLAY: Record<string, string> = {
  'Malls - Aguadilla Mall':     'Aguadilla Mall',
  'Malls - Plaza del Caribe':   'Plaza del Caribe',
  'Malls - Plaza las Americas': 'Plaza las Américas',
  'Malls - Santa Rosa':         'Santa Rosa Mall',
}
function locLabel(loc: string): string {
  return LOCATION_DISPLAY[loc] ?? loc
}

const PIPELINES = [
  'Residential Solar',
  'Commercial Solar',
  'Roofing',
  'PPS',
  'Water Products',
]

const PIPELINE_SHORT: Record<string, string> = {
  'Residential Solar': 'Res. Solar',
  'Commercial Solar':  'Com. Solar',
  'Roofing':           'Roofing',
  'PPS':               'PPS',
  'Water Products':    'Water',
}

const LEAD_PIPELINES = [...PIPELINES, 'Sin producto']

const BAR_COLORS = [
  '#0D1654', '#1e40af', '#0891b2', '#059669', '#7c3aed',
  '#d97706', '#dc2626', '#db2777', '#65a30d', '#0284c7',
  '#0f766e', '#b45309', '#9333ea', '#c026d3',
]

interface ModalState {
  deals: MallBoothDealDetail[]
  title: string
}

function openable(n: number) { return n > 0 }

// ── Liquid Glass spinner ─────────────────────────────────────────────────────
function LeadsSpinner() {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
      <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Cargando leads…
    </div>
  )
}

export default function MallDashboard({ year }: { year: number }) {
  const [allDeals, setAllDeals] = useState<MallBoothDealDetail[]>([])
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modal, setModal]       = useState<ModalState | null>(null)

  const [allLeads, setAllLeads]     = useState<MallBoothLeadDetail[] | null>(null)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [leadModal, setLeadModal]   = useState<{ leads: MallBoothLeadDetail[]; title: string } | null>(null)

  const today    = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(`${year}-01-01`)
  const [toDate,   setToDate]   = useState(today)

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    fetch('/api/canales/mall/deals')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllDeals(data)
        else setFetchError(data.error ?? 'Error al cargar datos')
      })
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false))

    fetch(`/api/canales/mall/leads?year=${year}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllLeads(data)
        else { setLeadsError(data.error ?? 'Error desconocido al cargar leads'); setAllLeads([]) }
      })
      .catch(e => { setLeadsError(e.message); setAllLeads([]) })
  }, [])

  const fromMonth = Math.max(1, Math.min(12, Number(fromDate.slice(5, 7))))
  const toMonth   = Math.max(1, Math.min(12, Number(toDate.slice(5, 7))))

  const months = useMemo(() => {
    const r: number[] = []
    for (let m = fromMonth; m <= toMonth; m++) r.push(m)
    return r
  }, [fromMonth, toMonth])

  const filtered = useMemo(
    () => allDeals.filter(d => d.month >= fromMonth && d.month <= toMonth),
    [allDeals, fromMonth, toMonth],
  )

  const locations = useMemo(() => {
    const present = new Set(filtered.map(d => d.location))
    return LOCATION_ORDER.filter(l => present.has(l))
  }, [filtered])

  // Section 1
  const salesByLocation = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of filtered) {
      if (!d.isCancelled) map[d.location] = (map[d.location] ?? 0) + 1
    }
    return LOCATION_ORDER
      .filter(l => l in map)
      .map(l => [l, map[l]] as [string, number])
      .sort((a, b) => b[1] - a[1])
  }, [filtered])

  const maxSales = salesByLocation[0]?.[1] ?? 1

  // Section 2
  const monthlyData = useMemo(() => {
    const data: Record<string, Record<number, { ventas: MallBoothDealDetail[]; canceladas: MallBoothDealDetail[] }>> = {}
    for (const d of filtered) {
      if (!data[d.location]) data[d.location] = {}
      if (!data[d.location][d.month]) data[d.location][d.month] = { ventas: [], canceladas: [] }
      if (d.isCancelled) data[d.location][d.month].canceladas.push(d)
      else data[d.location][d.month].ventas.push(d)
    }
    return data
  }, [filtered])

  // Section 3
  const pipelineData = useMemo(() => {
    const data: Record<string, Record<string, Record<number, MallBoothDealDetail[]>>> = {}
    for (const p of PIPELINES) data[p] = {}
    for (const d of filtered) {
      if (d.isCancelled) continue
      const key = PIPELINES.find(p => p.toLowerCase() === d.pipeline.toLowerCase()) ?? d.pipeline
      if (!data[key]) data[key] = {}
      if (!data[key][d.location]) data[key][d.location] = {}
      if (!data[key][d.location][d.month]) data[key][d.location][d.month] = []
      data[key][d.location][d.month].push(d)
    }
    return data
  }, [filtered])

  const pipelineLocations = useMemo(() =>
    locations.filter(loc =>
      PIPELINES.some(p => months.some(m => (pipelineData[p]?.[loc]?.[m]?.length ?? 0) > 0)),
    ),
    [locations, pipelineData, months],
  )

  // Section 4 — Leads
  const filteredLeads = useMemo(() => {
    if (!allLeads) return null
    return allLeads.filter(l => l.month >= fromMonth && l.month <= toMonth)
  }, [allLeads, fromMonth, toMonth])

  // 4a: [location][month]
  const leadsByLocation = useMemo(() => {
    if (!filteredLeads) return null
    const data: Record<string, Record<number, MallBoothLeadDetail[]>> = {}
    for (const l of filteredLeads) {
      if (!data[l.location]) data[l.location] = {}
      if (!data[l.location][l.month]) data[l.location][l.month] = []
      data[l.location][l.month].push(l)
    }
    return data
  }, [filteredLeads])

  // 4b: [seller][location]
  const leadsBySellerAndLocation = useMemo(() => {
    if (!filteredLeads) return null
    const data: Record<string, Record<string, MallBoothLeadDetail[]>> = {}
    for (const l of filteredLeads) {
      if (!data[l.registradoPor]) data[l.registradoPor] = {}
      if (!data[l.registradoPor][l.location]) data[l.registradoPor][l.location] = []
      data[l.registradoPor][l.location].push(l)
    }
    return data
  }, [filteredLeads])

  // 4c: [pipeline][location][month]
  const leadsByProduct = useMemo(() => {
    if (!filteredLeads) return null
    const data: Record<string, Record<string, Record<number, MallBoothLeadDetail[]>>> = {}
    for (const p of LEAD_PIPELINES) data[p] = {}
    for (const l of filteredLeads) {
      const key = l.dealPipeline
        ? (PIPELINES.find(p => p.toLowerCase() === l.dealPipeline!.toLowerCase()) ?? l.dealPipeline)
        : 'Sin producto'
      if (!data[key]) data[key] = {}
      if (!data[key][l.location]) data[key][l.location] = {}
      if (!data[key][l.location][l.month]) data[key][l.location][l.month] = []
      data[key][l.location][l.month].push(l)
    }
    return data
  }, [filteredLeads])

  function openModal(deals: MallBoothDealDetail[], title: string) {
    if (deals.length === 0) return
    setModal({ deals, title })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <svg className="animate-spin h-6 w-6 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Cargando datos de Redshift…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Error al cargar datos: {fetchError}
      </div>
    )
  }

  // Sellers sorted by total leads desc for 4b
  const sellerList = leadsBySellerAndLocation
    ? Object.entries(leadsBySellerAndLocation)
        .map(([seller, locMap]) => ({
          seller,
          total: Object.values(locMap).reduce((s, arr) => s + arr.length, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .map(e => e.seller)
    : []

  // Locations with lead data for 4b header
  const activeLeadLocs = LOCATION_ORDER.filter(loc =>
    filteredLeads?.some(l => l.location === loc),
  )

  // Locations active within a given pipeline for 4c
  function pipelineLocs(pipeline: string) {
    return LOCATION_ORDER.filter(loc =>
      months.some(m => (leadsByProduct?.[pipeline]?.[loc]?.[m]?.length ?? 0) > 0),
    )
  }

  return (
    <>
      {modal && (
        <DealModal deals={modal.deals} title={modal.title} onClose={() => setModal(null)} />
      )}
      {leadModal && (
        <LeadModal leads={leadModal.leads} title={leadModal.title} onClose={() => setLeadModal(null)} />
      )}

      <div className="space-y-6">

        {/* Date range filter */}
        <div className="flex flex-wrap gap-4 items-center p-4 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/60 shadow-md border-l-4 border-l-[#0D1654]">
          <span className="text-sm font-medium text-slate-700">Período:</span>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-slate-500">Desde</label>
            <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white/70" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-slate-500">Hasta</label>
            <input type="date" value={toDate} min={fromDate} max={today} onChange={e => setToDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white/70" />
          </div>
          <span className="text-xs text-slate-400">Click en cualquier número para ver el detalle</span>
        </div>

        {/* ── Section 1: Bar chart ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Ventas por Ubicación</h2>
          {salesByLocation.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin datos para el período seleccionado.</p>
          ) : (
            <div className="space-y-2">
              {salesByLocation.map(([loc, cnt], i) => (
                <div
                  key={loc}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => openModal(
                    filtered.filter(d => d.location === loc && !d.isCancelled),
                    `${locLabel(loc)} — todas las ventas`,
                  )}
                >
                  <span className="w-52 text-sm text-right text-[#0D1654] group-hover:text-[#1565C0] truncate flex-shrink-0 transition-colors font-medium" title={locLabel(loc)}>
                    {locLabel(loc)}
                  </span>
                  <div className="flex-1 bg-[#E8EEF8]/70 rounded-full h-7 overflow-hidden group-hover:ring-2 ring-[#0D1654]/30 transition-all">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max((cnt / maxSales) * 100, 4)}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="w-8 text-sm font-bold text-[#0D1654] text-right flex-shrink-0">{cnt}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Monthly breakdown ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Detalle Mensual por Ubicación</h2>
          {locations.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin datos para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0D1654]/90">
                    <th className="text-left px-3 py-2 border border-white/20 font-medium text-white min-w-[200px]">Ubicación</th>
                    {months.map(m => (
                      <th key={m} colSpan={2} className="text-center px-2 py-2 border border-white/20 font-medium text-white min-w-[90px]">
                        {MONTH_LABELS[m]}
                      </th>
                    ))}
                    <th colSpan={2} className="text-center px-2 py-2 border border-white/20 font-semibold text-white bg-[#0a1040]/90">Total</th>
                  </tr>
                  <tr className="bg-[#0D1654]/5 text-xs text-[#0D1654]">
                    <th className="px-3 py-1 border border-slate-200/50" />
                    {months.map(m => (
                      <Fragment key={m}>
                        <th className="px-2 py-1 border border-slate-200/50 text-emerald-700 font-medium">Vtas</th>
                        <th className="px-2 py-1 border border-slate-200/50 text-red-600 font-medium">Canc</th>
                      </Fragment>
                    ))}
                    <th className="px-2 py-1 border border-slate-200/50 text-emerald-700 font-medium">Vtas</th>
                    <th className="px-2 py-1 border border-slate-200/50 text-red-600 font-medium">Canc</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc, i) => {
                    const row = monthlyData[loc] ?? {}
                    const totalV = months.reduce((s, m) => s + (row[m]?.ventas.length ?? 0), 0)
                    const totalC = months.reduce((s, m) => s + (row[m]?.canceladas.length ?? 0), 0)
                    return (
                      <tr key={loc} className={i % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}>
                        <td className="px-3 py-2 border border-slate-200/50 text-slate-700 font-medium">{locLabel(loc)}</td>
                        {months.map(m => {
                          const v = row[m]?.ventas ?? []
                          const c = row[m]?.canceladas ?? []
                          return (
                            <Fragment key={m}>
                              <td
                                className={`px-2 py-2 border border-slate-200/50 text-center text-slate-800 ${openable(v.length) ? 'cursor-pointer hover:bg-emerald-50/60 font-medium text-emerald-800' : ''}`}
                                onClick={() => openModal(v, `${locLabel(loc)} · ${MONTH_LABELS[m]} — ventas`)}
                              >
                                {v.length || ''}
                              </td>
                              <td
                                className={`px-2 py-2 border border-slate-200/50 text-center text-red-600 ${openable(c.length) ? 'cursor-pointer hover:bg-red-50/60 font-medium' : ''}`}
                                onClick={() => openModal(c, `${locLabel(loc)} · ${MONTH_LABELS[m]} — canceladas`)}
                              >
                                {c.length || ''}
                              </td>
                            </Fragment>
                          )
                        })}
                        <td
                          className={`px-2 py-2 border border-slate-200/50 text-center font-semibold text-slate-900 ${openable(totalV) ? 'cursor-pointer hover:bg-emerald-50/60' : ''}`}
                          onClick={() => openModal(months.flatMap(m => monthlyData[loc]?.[m]?.ventas ?? []), `${locLabel(loc)} — total ventas`)}
                        >
                          {totalV || ''}
                        </td>
                        <td
                          className={`px-2 py-2 border border-slate-200/50 text-center font-semibold text-red-600 ${openable(totalC) ? 'cursor-pointer hover:bg-red-50/60' : ''}`}
                          onClick={() => openModal(months.flatMap(m => monthlyData[loc]?.[m]?.canceladas ?? []), `${locLabel(loc)} — total canceladas`)}
                        >
                          {totalC || ''}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-[#0D1654]/10 font-semibold">
                    <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654]">Total</td>
                    {months.map(m => {
                      const v = locations.reduce((s, loc) => s + (monthlyData[loc]?.[m]?.ventas.length ?? 0), 0)
                      const c = locations.reduce((s, loc) => s + (monthlyData[loc]?.[m]?.canceladas.length ?? 0), 0)
                      return (
                        <Fragment key={m}>
                          <td
                            className={`px-2 py-2 border border-slate-200/50 text-center text-slate-900 ${openable(v) ? 'cursor-pointer hover:bg-emerald-100/50' : ''}`}
                            onClick={() => openModal(filtered.filter(d => d.month === m && !d.isCancelled), `Todas las ubicaciones · ${MONTH_LABELS[m]}`)}
                          >
                            {v || ''}
                          </td>
                          <td
                            className={`px-2 py-2 border border-slate-200/50 text-center text-red-700 ${openable(c) ? 'cursor-pointer hover:bg-red-100/50' : ''}`}
                            onClick={() => openModal(filtered.filter(d => d.month === m && d.isCancelled), `Todas las ubicaciones · ${MONTH_LABELS[m]} — canceladas`)}
                          >
                            {c || ''}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center text-slate-900 ${openable(filtered.filter(d => !d.isCancelled).length) ? 'cursor-pointer hover:bg-emerald-100/50' : ''}`}
                      onClick={() => openModal(filtered.filter(d => !d.isCancelled), 'Todas las ubicaciones — total ventas')}
                    >
                      {filtered.filter(d => !d.isCancelled).length || ''}
                    </td>
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center text-red-700 ${openable(filtered.filter(d => d.isCancelled).length) ? 'cursor-pointer hover:bg-red-100/50' : ''}`}
                      onClick={() => openModal(filtered.filter(d => d.isCancelled), 'Todas las ubicaciones — total canceladas')}
                    >
                      {filtered.filter(d => d.isCancelled).length || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 3: Pipeline pivot ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Ventas por Pipeline</h2>
          {pipelineLocations.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin datos para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0D1654]/90">
                    <th
                      rowSpan={2}
                      className="text-left px-3 py-2 border border-white/20 font-medium text-white min-w-[200px] align-bottom sticky left-0 z-20 bg-[#0D1654]/90 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.25)]"
                    >
                      Ubicación
                    </th>
                    {months.map(m => (
                      <th key={m} colSpan={PIPELINES.length} className="text-center px-2 py-2 border border-white/20 font-semibold text-white">
                        {MONTH_LABELS[m]}
                      </th>
                    ))}
                    <th rowSpan={2} className="text-center px-2 py-2 border border-white/20 font-semibold text-white bg-[#0a1040]/90 min-w-[60px] align-bottom">
                      Total
                    </th>
                  </tr>
                  <tr className="bg-[#0D1654]/5 text-xs text-[#0D1654]">
                    {months.map(m =>
                      PIPELINES.map(p => (
                        <th key={`${m}-${p}`} className="px-1 py-1 border border-slate-200/50 font-medium text-center min-w-[72px] whitespace-nowrap">
                          {PIPELINE_SHORT[p] ?? p}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pipelineLocations.map((loc, i) => {
                    const rowTotal = PIPELINES.reduce((s, p) =>
                      s + months.reduce((ms, m) => ms + (pipelineData[p]?.[loc]?.[m]?.length ?? 0), 0), 0,
                    )
                    return (
                      <tr key={loc} className={i % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}>
                        <td className={`px-3 py-2 border border-slate-200/50 text-slate-700 font-medium sticky left-0 z-10 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)] ${i % 2 === 0 ? 'bg-white/90' : 'bg-slate-50/90'}`}>
                          {locLabel(loc)}
                        </td>
                        {months.map(m =>
                          PIPELINES.map(p => {
                            const cellDeals = pipelineData[p]?.[loc]?.[m] ?? []
                            const cnt = cellDeals.length
                            return (
                              <td
                                key={`${m}-${p}`}
                                className={`px-1 py-2 border border-slate-200/50 text-center text-slate-800 ${openable(cnt) ? 'cursor-pointer hover:bg-blue-50/60 font-semibold text-[#0D1654]' : ''}`}
                                onClick={() => openModal(cellDeals, `${locLabel(loc)} · ${MONTH_LABELS[m]} · ${p}`)}
                              >
                                {cnt || ''}
                              </td>
                            )
                          }),
                        )}
                        <td
                          className={`px-2 py-2 border border-slate-200/50 text-center font-semibold text-slate-900 ${openable(rowTotal) ? 'cursor-pointer hover:bg-blue-50/60' : ''}`}
                          onClick={() => openModal(filtered.filter(d => d.location === loc && !d.isCancelled), `${locLabel(loc)} — todas las ventas`)}
                        >
                          {rowTotal || ''}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-[#0D1654]/10 font-semibold">
                    <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654] sticky left-0 z-10 bg-[#0D1654]/10 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)]">Total</td>
                    {months.map(m =>
                      PIPELINES.map(p => {
                        const colDeals = pipelineLocations.flatMap(loc => pipelineData[p]?.[loc]?.[m] ?? [])
                        const cnt = colDeals.length
                        return (
                          <td
                            key={`${m}-${p}`}
                            className={`px-1 py-2 border border-slate-200/50 text-center text-slate-900 ${openable(cnt) ? 'cursor-pointer hover:bg-blue-100/50' : ''}`}
                            onClick={() => openModal(colDeals, `Todas las ubicaciones · ${MONTH_LABELS[m]} · ${p}`)}
                          >
                            {cnt || ''}
                          </td>
                        )
                      }),
                    )}
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center text-slate-900 ${openable(filtered.filter(d => !d.isCancelled).length) ? 'cursor-pointer hover:bg-blue-100/50' : ''}`}
                      onClick={() => openModal(filtered.filter(d => !d.isCancelled), 'Todas las ubicaciones — total ventas')}
                    >
                      {filtered.filter(d => !d.isCancelled).length || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 4a: Leads por Ubicación y Mes ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Leads por Ubicación y Mes</h2>
          {allLeads === null ? <LeadsSpinner />
          : leadsError ? (
            <div className="p-3 bg-red-50/70 border border-red-200/70 rounded-xl text-red-700 text-sm">
              Error al cargar leads: {leadsError}
            </div>
          ) : (filteredLeads?.length ?? 0) === 0 ? (
            <p className="text-slate-500 text-sm">Sin leads para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-[#0D1654]/90">
                    <th className="text-left px-3 py-2 border border-white/20 font-medium text-white min-w-[200px]">Ubicación</th>
                    {months.map(m => (
                      <th key={m} className="text-center px-2 py-2 border border-white/20 font-medium text-white min-w-[70px]">
                        {MONTH_LABELS[m]}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 border border-white/20 font-semibold text-white bg-[#0a1040]/90">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {LOCATION_ORDER.filter(loc =>
                    months.some(m => (leadsByLocation?.[loc]?.[m]?.length ?? 0) > 0),
                  ).map((loc, i) => {
                    const rowTotal = months.reduce((s, m) => s + (leadsByLocation?.[loc]?.[m]?.length ?? 0), 0)
                    return (
                      <tr key={loc} className={i % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}>
                        <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654] font-medium">{locLabel(loc)}</td>
                        {months.map(m => {
                          const cell = leadsByLocation?.[loc]?.[m] ?? []
                          const cnt  = cell.length
                          return (
                            <td
                              key={m}
                              className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 font-semibold text-[#0D1654]' : 'text-slate-300'}`}
                              onClick={() => cnt > 0 && setLeadModal({ leads: cell, title: `${locLabel(loc)} · ${MONTH_LABELS[m]} — leads` })}
                            >
                              {cnt || ''}
                            </td>
                          )
                        })}
                        <td
                          className={`px-2 py-2 border border-slate-200/50 text-center font-semibold ${rowTotal > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                          onClick={() => rowTotal > 0 && setLeadModal({
                            leads: months.flatMap(m => leadsByLocation?.[loc]?.[m] ?? []),
                            title: `${locLabel(loc)} — total leads`,
                          })}
                        >
                          {rowTotal || ''}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-[#0D1654]/10 font-semibold">
                    <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654]">Total</td>
                    {months.map(m => {
                      const allForMonth = LOCATION_ORDER.flatMap(loc => leadsByLocation?.[loc]?.[m] ?? [])
                      const cnt = allForMonth.length
                      return (
                        <td
                          key={m}
                          className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                          onClick={() => cnt > 0 && setLeadModal({ leads: allForMonth, title: `Todas las ubicaciones · ${MONTH_LABELS[m]} — leads` })}
                        >
                          {cnt || ''}
                        </td>
                      )
                    })}
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center ${(filteredLeads?.length ?? 0) > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                      onClick={() => (filteredLeads?.length ?? 0) > 0 && setLeadModal({ leads: filteredLeads ?? [], title: 'Todas las ubicaciones — total leads' })}
                    >
                      {filteredLeads?.length || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 4b: Leads por Vendedor y Ubicación ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Leads por Vendedor y Ubicación</h2>
          {allLeads === null ? <LeadsSpinner />
          : (filteredLeads?.length ?? 0) === 0 ? (
            <p className="text-slate-500 text-sm">Sin leads para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-[#0D1654]/90">
                    <th className="text-left px-3 py-2 border border-white/20 font-medium text-white min-w-[180px]">Vendedor</th>
                    {activeLeadLocs.map(loc => (
                      <th key={loc} className="text-center px-2 py-2 border border-white/20 font-medium text-white min-w-[90px] text-xs leading-tight">
                        {locLabel(loc)}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 border border-white/20 font-semibold text-white bg-[#0a1040]/90">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerList.map((seller, i) => {
                    const locMap = leadsBySellerAndLocation?.[seller] ?? {}
                    const rowTotal = Object.values(locMap).reduce((s, arr) => s + arr.length, 0)
                    return (
                      <tr key={seller} className={i % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}>
                        <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654] font-medium">{seller}</td>
                        {activeLeadLocs.map(loc => {
                          const cell = locMap[loc] ?? []
                          const cnt = cell.length
                          return (
                            <td
                              key={loc}
                              className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 font-semibold text-[#0D1654]' : 'text-slate-300'}`}
                              onClick={() => cnt > 0 && setLeadModal({ leads: cell, title: `${seller} · ${locLabel(loc)} — leads` })}
                            >
                              {cnt || ''}
                            </td>
                          )
                        })}
                        <td
                          className={`px-2 py-2 border border-slate-200/50 text-center font-semibold ${rowTotal > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                          onClick={() => rowTotal > 0 && setLeadModal({
                            leads: Object.values(locMap).flat(),
                            title: `${seller} — total leads`,
                          })}
                        >
                          {rowTotal || ''}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-[#0D1654]/10 font-semibold">
                    <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654]">Total</td>
                    {activeLeadLocs.map(loc => {
                      const allForLoc = filteredLeads?.filter(l => l.location === loc) ?? []
                      const cnt = allForLoc.length
                      return (
                        <td
                          key={loc}
                          className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                          onClick={() => cnt > 0 && setLeadModal({ leads: allForLoc, title: `${locLabel(loc)} — todos los leads` })}
                        >
                          {cnt || ''}
                        </td>
                      )
                    })}
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center ${(filteredLeads?.length ?? 0) > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                      onClick={() => (filteredLeads?.length ?? 0) > 0 && setLeadModal({ leads: filteredLeads ?? [], title: 'Todos los vendedores — total leads' })}
                    >
                      {filteredLeads?.length || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 4c: Leads por Producto, Ubicación y Mes ── */}
        <section className="bg-white/50 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-[#0D1654] mb-4">Leads por Producto, Ubicación y Mes</h2>
          {allLeads === null ? <LeadsSpinner />
          : (filteredLeads?.length ?? 0) === 0 ? (
            <p className="text-slate-500 text-sm">Sin leads para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0D1654]/90">
                    <th className="text-left px-3 py-2 border border-white/20 font-medium text-white min-w-[180px] sticky left-0 z-20 bg-[#0D1654]/90 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.25)]">
                      Producto / Ubicación
                    </th>
                    {months.map(m => (
                      <th key={m} className="text-center px-2 py-2 border border-white/20 font-medium text-white min-w-[70px]">
                        {MONTH_LABELS[m]}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 border border-white/20 font-semibold text-white bg-[#0a1040]/90">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAD_PIPELINES.map(pipeline => {
                    const locs = pipelineLocs(pipeline)
                    if (locs.length === 0) return null
                    const pipelineTotal = locs.reduce((s, loc) =>
                      s + months.reduce((ms, m) => ms + (leadsByProduct?.[pipeline]?.[loc]?.[m]?.length ?? 0), 0), 0,
                    )
                    return (
                      <Fragment key={pipeline}>
                        {/* Pipeline group header */}
                        <tr className="bg-[#0D1654]/15">
                          <td
                            className="px-3 py-2 border border-slate-200/50 font-bold text-[#0D1654] text-xs uppercase tracking-wide sticky left-0 z-10 bg-[#0D1654]/15 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)]"
                            colSpan={months.length + 2}
                          >
                            {pipeline}
                          </td>
                        </tr>
                        {locs.map((loc, i) => {
                          const rowTotal = months.reduce((s, m) => s + (leadsByProduct?.[pipeline]?.[loc]?.[m]?.length ?? 0), 0)
                          return (
                            <tr key={loc} className={i % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40'}>
                              <td className={`px-3 py-2 border border-slate-200/50 text-slate-600 pl-6 sticky left-0 z-10 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)] ${i % 2 === 0 ? 'bg-white/90' : 'bg-slate-50/90'}`}>
                                {locLabel(loc)}
                              </td>
                              {months.map(m => {
                                const cell = leadsByProduct?.[pipeline]?.[loc]?.[m] ?? []
                                const cnt = cell.length
                                return (
                                  <td
                                    key={m}
                                    className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 font-semibold text-[#0D1654]' : 'text-slate-300'}`}
                                    onClick={() => cnt > 0 && setLeadModal({
                                      leads: cell,
                                      title: `${pipeline} · ${locLabel(loc)} · ${MONTH_LABELS[m]} — leads`,
                                    })}
                                  >
                                    {cnt || ''}
                                  </td>
                                )
                              })}
                              <td
                                className={`px-2 py-2 border border-slate-200/50 text-center font-semibold ${rowTotal > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                                onClick={() => rowTotal > 0 && setLeadModal({
                                  leads: months.flatMap(m => leadsByProduct?.[pipeline]?.[loc]?.[m] ?? []),
                                  title: `${pipeline} · ${locLabel(loc)} — total leads`,
                                })}
                              >
                                {rowTotal || ''}
                              </td>
                            </tr>
                          )
                        })}
                        {/* Pipeline subtotal */}
                        <tr className="bg-[#0D1654]/10 font-semibold text-xs">
                          <td className="px-3 py-1.5 border border-slate-200/50 text-[#0D1654] pl-4 sticky left-0 z-10 bg-[#0D1654]/10 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)]">
                            Subtotal {pipeline}
                          </td>
                          {months.map(m => {
                            const monthTotal = locs.reduce((s, loc) => s + (leadsByProduct?.[pipeline]?.[loc]?.[m]?.length ?? 0), 0)
                            return (
                              <td
                                key={m}
                                className={`px-2 py-1.5 border border-slate-200/50 text-center ${monthTotal > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                                onClick={() => monthTotal > 0 && setLeadModal({
                                  leads: locs.flatMap(loc => leadsByProduct?.[pipeline]?.[loc]?.[m] ?? []),
                                  title: `${pipeline} · ${MONTH_LABELS[m]} — leads`,
                                })}
                              >
                                {monthTotal || ''}
                              </td>
                            )
                          })}
                          <td
                            className={`px-2 py-1.5 border border-slate-200/50 text-center ${pipelineTotal > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                            onClick={() => pipelineTotal > 0 && setLeadModal({
                              leads: locs.flatMap(loc => months.flatMap(m => leadsByProduct?.[pipeline]?.[loc]?.[m] ?? [])),
                              title: `${pipeline} — total leads`,
                            })}
                          >
                            {pipelineTotal || ''}
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  {/* Grand total */}
                  <tr className="bg-[#0D1654]/10 font-bold">
                    <td className="px-3 py-2 border border-slate-200/50 text-[#0D1654] sticky left-0 z-10 bg-[#0D1654]/10 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)]">Total</td>
                    {months.map(m => {
                      const allForMonth = filteredLeads?.filter(l => l.month === m) ?? []
                      const cnt = allForMonth.length
                      return (
                        <td
                          key={m}
                          className={`px-2 py-2 border border-slate-200/50 text-center ${cnt > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                          onClick={() => cnt > 0 && setLeadModal({ leads: allForMonth, title: `Todas las ubicaciones · ${MONTH_LABELS[m]} — leads` })}
                        >
                          {cnt || ''}
                        </td>
                      )
                    })}
                    <td
                      className={`px-2 py-2 border border-slate-200/50 text-center ${(filteredLeads?.length ?? 0) > 0 ? 'cursor-pointer hover:bg-[#E8EEF8]/60 text-[#0D1654]' : 'text-slate-300'}`}
                      onClick={() => (filteredLeads?.length ?? 0) > 0 && setLeadModal({ leads: filteredLeads ?? [], title: 'Todos los productos — total leads' })}
                    >
                      {filteredLeads?.length || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </>
  )
}

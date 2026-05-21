'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VendedorPerformanceRow, CoordinadorRow } from '@/lib/performance'
import type { CambaceoDealDetail } from '@/lib/redshift'

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadDetail {
  leadId: string | null
  createdDate: string
  createdAt: string
  coordinador: string
  leadSource: string
  canvaserName: string | null
  dealId: string | null
  dealClosingDate: string | null
  dealPipeline: string | null
  dealVendedor: string | null
}

type ModalState =
  | { type: 'deals'; title: string; deals: CambaceoDealDetail[] }
  | { type: 'leads'; title: string; leads: LeadDetail[] }
  | null

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero',    '02': 'Febrero',   '03': 'Marzo',     '04': 'Abril',
  '05': 'Mayo',     '06': 'Junio',     '07': 'Julio',     '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_ES[m] ?? m} ${y}`
}

function getMonths(): string[] {
  const months: string[] = []
  const now   = new Date()
  const start = new Date(2026, 0, 1)
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d >= start) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return months
}

function fmtAmount(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ── KPI Box ───────────────────────────────────────────────────────────────────

function KpiBox({ label, value, color = 'text-slate-900' }: {
  label: string; value: string; color?: string
}) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-lg shadow-slate-200/50 px-5 py-4 min-w-[130px]">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ state, onClose }: { state: NonNullable<ModalState>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0D1654] rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-white">{state.title}</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              {state.type === 'deals'
                ? `${state.deals.length} venta${state.deals.length !== 1 ? 's' : ''}`
                : `${state.leads.length} lead${state.leads.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors p-1 rounded"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 px-5 py-4">
          {state.type === 'deals' ? (
            <table className="text-sm border-collapse w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0D1654] text-left text-xs text-white uppercase tracking-wide">
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Vendedor</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha Cierre</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Pipeline</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold text-right">Monto</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Canvassing</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {state.deals.map((d, i) => (
                  <tr key={d.zohoId || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 border border-slate-200 font-medium text-slate-800">{d.vendedor}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{d.closingDate}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-700">{d.pipeline}</td>
                    <td className="px-3 py-2 border border-slate-200 text-right font-mono text-slate-800">{fmtAmount(d.amount)}</td>
                    <td className="px-3 py-2 border border-slate-200 text-center">
                      {d.isCanvassing
                        ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Sí</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2 border border-slate-200">
                      {d.onHoldStatus || d.cancellationReason
                        ? <span className="text-xs text-red-700">{d.cancellationReason ?? d.onHoldStatus}</span>
                        : <span className="text-xs text-emerald-700 font-medium">Activo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="text-sm border-collapse w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0D1654] text-left text-xs text-white uppercase tracking-wide">
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Lead ID</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha Creación</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Canvaser</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Lead Source</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">¿Vendido?</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha Venta</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Vendedor</th>
                  <th className="px-3 py-2 border border-[#1565C0] font-semibold">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {state.leads.map((l, i) => (
                  <tr key={l.leadId ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 border border-slate-200 text-slate-500 font-mono text-xs">
                      {l.leadId ? l.leadId.slice(-8) : '—'}
                    </td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{l.createdDate}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-700">{l.canvaserName ?? '—'}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-500 text-xs">{l.leadSource}</td>
                    <td className="px-3 py-2 border border-slate-200 text-center">
                      {l.dealId
                        ? <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Sí</span>
                        : <span className="text-xs text-slate-400">No</span>}
                    </td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{l.dealClosingDate ?? '—'}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-700 font-medium">{l.dealVendedor ?? '—'}</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{l.dealPipeline ?? '—'}</td>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CambaceoPerformance({
  vendedores,
  coordinadores,
  month,
}: {
  vendedores: VendedorPerformanceRow[]
  coordinadores: CoordinadorRow[]
  month: string
}) {
  const router = useRouter()
  const months = getMonths()

  // All deals for the month, loaded lazily on first click
  const [allDeals, setAllDeals]     = useState<CambaceoDealDetail[] | null>(null)
  const [allLeads, setAllLeads]     = useState<LeadDetail[] | null>(null)
  const [loadingDeals, setLoadingDeals] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [modal, setModal]           = useState<ModalState>(null)

  const totalTurnos = vendedores.reduce((s, v) => s + v.turnos, 0)
  const totalMissed = vendedores.reduce((s, v) => s + v.missed, 0)
  const totalVentas = vendedores.reduce((s, v) => s + v.ventasCanal, 0)
  const totalLeads  = coordinadores.reduce((s, c) => s + c.leads, 0)

  // Fetch deals (cached per month)
  const ensureDeals = useCallback(async () => {
    if (allDeals) return allDeals
    setLoadingDeals(true)
    try {
      const res = await fetch(`/api/canales/cambaceo/deals?month=${month}`)
      const data = await res.json()
      if (Array.isArray(data)) { setAllDeals(data); return data }
      return []
    } finally {
      setLoadingDeals(false)
    }
  }, [allDeals, month])

  // Fetch leads (cached per month)
  const ensureLeads = useCallback(async () => {
    if (allLeads) return allLeads
    setLoadingLeads(true)
    try {
      const res = await fetch(`/api/canales/cambaceo/leads?month=${month}`)
      const data = await res.json()
      if (Array.isArray(data)) { setAllLeads(data); return data }
      return []
    } finally {
      setLoadingLeads(false)
    }
  }, [allLeads, month])

  async function openDealModal(filter: (d: CambaceoDealDetail) => boolean, title: string) {
    const deals = await ensureDeals()
    setModal({ type: 'deals', title, deals: deals.filter(filter) })
  }

  async function openLeadModal(filter: (l: LeadDetail) => boolean, title: string) {
    const leads = await ensureLeads()
    setModal({ type: 'leads', title, leads: leads.filter(filter) })
  }

  const isBusy = loadingDeals || loadingLeads

  return (
    <>
      {modal && <Modal state={modal} onClose={() => setModal(null)} />}
      {isBusy && (
        <div className="fixed bottom-4 right-4 z-40 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-slate-600">
          <svg className="animate-spin h-4 w-4 text-[#0D1654]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Cargando detalle…
        </div>
      )}

      <div className="space-y-8">
        {/* Month selector + KPIs */}
        <div className="flex flex-wrap items-start gap-4">
          <select
            value={month}
            onChange={e => {
              setAllDeals(null)
              setAllLeads(null)
              router.push(`/canales/cambaceo?view=performance&month=${e.target.value}`)
            }}
            className="border border-slate-200/70 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#00A651] bg-white/70 backdrop-blur-md shadow-sm"
          >
            {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
          <div className="flex flex-wrap gap-3">
            <KpiBox label="Vendedores" value={String(vendedores.length)} />
            <KpiBox label="Turnos" value={String(totalTurnos)} />
            <KpiBox label="Missed" value={String(totalMissed)} color={totalMissed > 0 ? 'text-red-500' : 'text-slate-900'} />
            <KpiBox label="Ventas Canv." value={String(totalVentas)} color="text-[#00A651]" />
            <KpiBox label="Leads" value={String(totalLeads)} color="text-[#1565C0]" />
          </div>
        </div>

        {/* ── Sección 1 (ahora arriba): Coordinadores ── */}
        <div>
          <h2 className="text-base font-semibold text-[#0D1654] mb-3">Por Coordinador de Canvaseo</h2>
          <p className="text-xs text-slate-400 mb-2">
            Click en cualquier número para ver el detalle · Leads creados en {fmtMonth(month)}
          </p>
          {coordinadores.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">
              No hay data de coordinadores para {fmtMonth(month)}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0D1654]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase">Coordinador</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase">Leads</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase">Ventas</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase">Conv. %</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinadores.map((c, idx) => {
                    const convRate = c.leads > 0 ? ((c.ventas / c.leads) * 100).toFixed(1) : '—'
                    return (
                      <tr key={`${c.coordinador}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#0D1654]">{c.coordinador}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            className="font-bold text-[#1565C0] hover:text-[#0D47A1] hover:underline transition-colors"
                            onClick={() => openLeadModal(
                              l => l.coordinador === c.coordinador,
                              `${c.coordinador} — Leads · ${fmtMonth(month)}`,
                            )}
                          >
                            {c.leads}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {c.ventas > 0 ? (
                            <button
                              className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                              onClick={() => openLeadModal(
                                l => l.coordinador === c.coordinador && l.dealId != null,
                                `${c.coordinador} — Leads convertidos · ${fmtMonth(month)}`,
                              )}
                            >
                              {c.ventas}
                            </button>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-500 text-xs font-medium">
                          {convRate !== '—' ? `${convRate}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals */}
                  <tr className="bg-slate-100 font-semibold border-t border-slate-200">
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-slate-700 text-xs uppercase">Total</td>
                    <td className="px-4 py-2.5 text-center text-[#1565C0]">
                      {coordinadores.reduce((s, c) => s + c.leads, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-emerald-700">
                      {coordinadores.reduce((s, c) => s + c.ventas, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-400 text-xs">
                      {coordinadores.reduce((s, c) => s + c.leads, 0) > 0
                        ? `${((coordinadores.reduce((s, c) => s + c.ventas, 0) / coordinadores.reduce((s, c) => s + c.leads, 0)) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sección 2: Vendedores ── */}
        <div>
          <h2 className="text-base font-semibold text-[#0D1654] mb-3">Vendedores</h2>
          <p className="text-xs text-slate-400 mb-2">
            Click en Ventas Canv. o Total Ventas para ver el detalle
          </p>
          {vendedores.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">
              No hay turnos de cambaceo en {fmtMonth(month)}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0D1654]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase">Vendedor</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase">Turnos</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase">Missed</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase whitespace-nowrap">Ventas Canv.</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-white uppercase whitespace-nowrap">Total Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((v, idx) => (
                    <tr key={v.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-[#0D1654] leading-tight">{v.name}</p>
                        <p className="text-[10px] text-slate-400">{v.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium text-slate-700">{v.turnos}</td>
                      <td className="px-4 py-2.5 text-center font-medium">
                        <span className={v.missed > 0 ? 'text-red-500' : 'text-slate-300'}>{v.missed}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">
                        {v.ventasCanal > 0 ? (
                          <button
                            className="text-[#00A651] hover:text-[#007a3c] hover:underline transition-colors"
                            onClick={() => openDealModal(
                              d => d.email === v.email && d.isCanvassing,
                              `${v.name} — Ventas Canvassing · ${fmtMonth(month)}`,
                            )}
                          >
                            {v.ventasCanal}
                          </button>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium">
                        {v.totalVentas > 0 ? (
                          <button
                            className="text-slate-700 hover:text-slate-900 hover:underline transition-colors"
                            onClick={() => openDealModal(
                              d => d.email === v.email,
                              `${v.name} — Todas las ventas · ${fmtMonth(month)}`,
                            )}
                          >
                            {v.totalVentas}
                          </button>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

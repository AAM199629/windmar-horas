'use client'

import { useState, useMemo, useTransition } from 'react'
import type { AsalariadoData } from './page'
import type { MonthMetrics } from '@/lib/ventas'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const COMUNICADO_LABEL: Record<string, { label: string; color: string }> = {
  none:        { label: 'Al día',         color: 'bg-green-100 text-green-700' },
  comunicado1: { label: 'Comunicado 1',   color: 'bg-amber-100 text-amber-700' },
  comunicado2: { label: 'Comunicado 2',   color: 'bg-orange-100 text-orange-700' },
  terminacion: { label: 'Terminación',    color: 'bg-red-100 text-red-700' },
}

function fmt(n: number) { return n % 1 === 0 ? String(n) : n.toFixed(1) }

function MonthBar({ m }: { m: MonthMetrics }) {
  if (m.isGrace) {
    return (
      <div className="flex flex-col items-center gap-1 w-10" title="Mes de gracia">
        <span className="text-[10px] text-slate-300">G</span>
        <div className="w-full h-14 bg-slate-100 rounded-sm overflow-hidden flex flex-col justify-end">
          <div style={{ height: '12%', background: '#cbd5e1' }} className="w-full rounded-sm" />
        </div>
        <span className="text-[9px] text-slate-400">{MONTH_NAMES[m.month - 1]}</span>
      </div>
    )
  }
  const pct = Math.min((m.total / m.meta) * 100, 100)
  const color = m.met ? '#00A651' : m.total > 0 ? '#E88B0C' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1 w-10">
      <span className="text-[10px] font-bold" style={{ color }}>
        {fmt(m.total)}
      </span>
      <div className="w-full h-14 bg-slate-100 rounded-sm overflow-hidden flex flex-col justify-end">
        <div
          style={{ height: `${pct}%`, background: color }}
          className="w-full rounded-sm transition-all"
        />
      </div>
      <span className="text-[9px] text-slate-400">{MONTH_NAMES[m.month - 1]}</span>
    </div>
  )
}

function ComunicadoBadge({ status, pending }: { status: string; pending: boolean }) {
  const cfg = COMUNICADO_LABEL[status] ?? COMUNICADO_LABEL.none
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
      {pending && status !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {cfg.label}
      {pending && status !== 'none' && <span className="opacity-60 font-normal">pendiente</span>}
    </span>
  )
}

function ApprovalModal({
  emp,
  onClose,
  onApprove,
}: {
  emp: AsalariadoData
  onClose: () => void
  onApprove: (nombre: string, status: string, memos: { memo1?: string; memo2?: string; memo3?: string }) => void
}) {
  const effectiveStatus =
    emp.redshiftStatus !== 'none' ? emp.redshiftStatus :
    (emp.approved?.status && emp.approved.status !== 'none' ? emp.approved.status : emp.pendingStatus)
  const [status, setStatus] = useState<'none' | 'comunicado1' | 'comunicado2' | 'terminacion'>(
    effectiveStatus as 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  )
  const [memo1, setMemo1] = useState(emp.approved?.memo1 ?? emp.memo1Date ?? '')
  const [memo2, setMemo2] = useState(emp.approved?.memo2 ?? emp.memo2Date ?? '')
  const [memo3, setMemo3] = useState(emp.approved?.memo3 ?? emp.terminacionDate ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div style={{ background: '#0D1654' }} className="px-6 py-4 flex items-center gap-3">
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-bold text-lg tracking-wide flex-1">
            COMUNICADO — {emp.nombre.toUpperCase()}
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'none' | 'comunicado1' | 'comunicado2' | 'terminacion')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C] bg-white"
            >
              <option value="none">Al día (sin comunicado)</option>
              <option value="comunicado1">Comunicado 1</option>
              <option value="comunicado2">Comunicado 2</option>
              <option value="terminacion">Terminación</option>
            </select>
          </div>
          {(status === 'comunicado1' || status === 'comunicado2' || status === 'terminacion') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Comunicado 1</label>
              <input type="date" value={memo1} onChange={e => setMemo1(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]" />
            </div>
          )}
          {(status === 'comunicado2' || status === 'terminacion') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Comunicado 2</label>
              <input type="date" value={memo2} onChange={e => setMemo2(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]" />
            </div>
          )}
          {status === 'terminacion' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Terminación</label>
              <input type="date" value={memo3} onChange={e => setMemo3(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Cancelar
            </button>
            <button
              onClick={() => onApprove(emp.nombre, status, { memo1: memo1 || undefined, memo2: memo2 || undefined, memo3: memo3 || undefined })}
              style={{ background: '#E88B0C' }}
              className="px-5 py-2 text-white font-semibold rounded-lg text-sm hover:opacity-90 transition">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AsalariadoCard({
  emp,
  recentMonths,
  isAdmin,
  onEditComunicado,
}: {
  emp: AsalariadoData
  recentMonths: Array<{ year: number; month: number }>
  isAdmin: boolean
  onEditComunicado: (emp: AsalariadoData) => void
}) {
  const [open, setOpen] = useState(false)

  const displayStatus =
    emp.redshiftStatus !== 'none' ? emp.redshiftStatus :
    (emp.approved?.status && emp.approved.status !== 'none' ? emp.approved.status : emp.pendingStatus)
  const isPending = emp.pendingStatus !== 'none' && emp.redshiftStatus === 'none' && !emp.approved

  const lastMonth = emp.months[emp.months.length - 1]

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#F4F6FB] transition-colors text-left"
      >
        <span className={`text-[#1565C0] transition-transform duration-200 text-xs ${open ? 'rotate-90' : ''}`}>▶</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              className="font-bold text-[#0D1654] text-lg leading-tight truncate">
              {emp.nombre}
            </p>
            <span style={{ background: '#0D1654' }} className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
              {emp.salesRole}
            </span>
            {emp.ciudad && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                📍 {emp.ciudad}
              </span>
            )}
          </div>
          {emp.email && <p className="text-xs text-slate-400 truncate">{emp.email}</p>}
        </div>

        {/* Month mini-bars (hidden on small screens) */}
        <div className="hidden lg:flex items-end gap-1 h-10">
          {emp.months.map((m, i) => {
            if (m.isGrace) {
              return (
                <div key={i} title={`${MONTH_NAMES[m.month - 1]} ${m.year}: Mes de gracia`}
                  className="w-4 h-full bg-slate-100 rounded-sm overflow-hidden flex flex-col justify-end">
                  <div style={{ height: '12%', background: '#cbd5e1' }} className="w-full" />
                </div>
              )
            }
            const pct = Math.min((m.total / m.meta) * 100, 100)
            const color = m.met ? '#00A651' : m.total > 0 ? '#E88B0C' : '#ef4444'
            return (
              <div key={i} title={`${MONTH_NAMES[m.month - 1]} ${m.year}: ${fmt(m.total)}/${m.meta}`}
                className="w-4 h-full bg-slate-100 rounded-sm overflow-hidden flex flex-col justify-end">
                <div style={{ height: `${pct}%`, background: color }} className="w-full" />
              </div>
            )
          })}
        </div>

        {/* Status + metrics */}
        <div className="flex items-center gap-4 shrink-0">
          <ComunicadoBadge status={displayStatus} pending={isPending} />
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Mes actual</p>
            <p className={`font-bold ${lastMonth.met ? 'text-green-600' : 'text-red-500'}`}>
              {fmt(lastMonth.total)}/{lastMonth.meta}
            </p>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Monthly chart */}
          <div className="flex gap-2 items-end mb-4">
            {emp.months.map((m, i) => <MonthBar key={i} m={m} />)}
          </div>

          {/* Breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-1 font-semibold">Mes</th>
                  <th className="pb-1 font-semibold text-right">Solar/Roof</th>
                  <th className="pb-1 font-semibold text-right">CDBG</th>
                  <th className="pb-1 font-semibold text-right">Water</th>
                  <th className="pb-1 font-semibold text-right">Anker</th>
                  <th className="pb-1 font-semibold text-right">Asist.</th>
                  <th className="pb-1 font-semibold text-right">Total</th>
                  <th className="pb-1 font-semibold text-right">Meta</th>
                  <th className="pb-1 font-semibold text-right">✓</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {emp.months.map((m, i) => (
                  <tr key={i} className={m.isGrace ? 'bg-slate-50/60' : m.met ? '' : 'bg-red-50/50'}>
                    <td className="py-1.5 font-medium text-slate-700">{MONTH_NAMES[m.month - 1]} {m.year}</td>
                    {m.isGrace ? (
                      <td colSpan={8} className="py-1.5 text-slate-400 text-xs italic">Mes de gracia — no cuenta para comunicados</td>
                    ) : (
                      <>
                        <td className="py-1.5 text-right">{m.solar}</td>
                        <td className="py-1.5 text-right">{m.cdbg}</td>
                        <td className="py-1.5 text-right">{m.water > 0 ? `${m.water} (${fmt(m.water * 0.5)})` : '—'}</td>
                        <td className="py-1.5 text-right">{m.anker > 0 ? `${m.anker} (${fmt(m.anker * 0.5)})` : '—'}</td>
                        <td className="py-1.5 text-right">{m.asistidas > 0 ? `${m.asistidas} (${fmt(m.asistidas * 0.5)})` : '—'}</td>
                        <td className="py-1.5 text-right font-bold">{fmt(m.total)}</td>
                        <td className="py-1.5 text-right text-slate-400">{m.meta}</td>
                        <td className="py-1.5 text-right">{m.met ? '✓' : <span className="text-red-500">✗</span>}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leads / Citas / Orientaciones */}
          {(emp.leads != null || emp.citas != null || emp.orientaciones != null) && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Leads</p>
                <p className="text-lg font-bold text-blue-700">{emp.leads ?? '—'}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Citas Creadas</p>
                <p className="text-lg font-bold text-indigo-700">{emp.citas ?? '—'}</p>
              </div>
              <div className="bg-violet-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">Citas Realizadas</p>
                <p className="text-lg font-bold text-violet-700">{emp.orientaciones ?? '—'}</p>
              </div>
            </div>
          )}

          {/* Hire date */}
          {emp.hireDate && (
            <p className="text-xs text-slate-400 mt-3">
              Inicio como asalariado: <span className="font-semibold text-slate-600">{emp.hireDate}</span>
            </p>
          )}

          {/* Comunicado history — Redshift (Zoho) dates take priority over KV */}
          {(emp.memo1Date || emp.memo2Date || emp.terminacionDate ||
            (emp.approved && (emp.approved.memo1 || emp.approved.memo2 || emp.approved.memo3))) && (
            <div className="mt-3 flex flex-wrap gap-3">
              {(emp.memo1Date || emp.approved?.memo1) && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-200">
                  Comunicado 1: {emp.memo1Date || emp.approved?.memo1}
                </span>
              )}
              {(emp.memo2Date || emp.approved?.memo2) && (
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-200">
                  Comunicado 2: {emp.memo2Date || emp.approved?.memo2}
                </span>
              )}
              {(emp.terminacionDate || emp.approved?.memo3) && (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg border border-red-200">
                  Terminación: {emp.terminacionDate || emp.approved?.memo3}
                </span>
              )}
            </div>
          )}

          {/* Admin approve button */}
          {isAdmin && emp.pendingStatus !== 'none' && (
            <div className="mt-3">
              <button
                onClick={() => onEditComunicado(emp)}
                style={{ background: isPending ? '#E88B0C' : '#0D1654' }}
                className="px-4 py-1.5 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition">
                {isPending ? '⚠ Aprobar / Editar comunicado' : '✎ Editar comunicado'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export default function AsalariadosClient({
  asalariados,
  recentMonths,
  isAdmin,
}: {
  asalariados: AsalariadoData[]
  recentMonths: Array<{ year: number; month: number }>
  isAdmin: boolean
}) {
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingEmp, setEditingEmp] = useState<AsalariadoData | null>(null)
  const [saving, setSaving]         = useState(false)
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({})
  const [, startTransition]         = useTransition()

  const filtered = useMemo(() => asalariados.filter(e => {
    if (roleFilter && e.salesRole !== roleFilter) return false
    if (statusFilter) {
      const eff = localOverrides[e.nombre] ??
        (e.redshiftStatus !== 'none' ? e.redshiftStatus :
        (e.approved?.status && e.approved.status !== 'none' ? e.approved.status : e.pendingStatus))
      if (eff !== statusFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!e.nombre.toLowerCase().includes(q) && !(e.email ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }), [asalariados, roleFilter, statusFilter, search, localOverrides])

  // Group by supervisor
  const grouped = useMemo(() => {
    const map = new Map<string, AsalariadoData[]>()
    for (const e of filtered) {
      const key = e.supervisorRegional ?? '__sin__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [filtered])

  const sortedRegions = useMemo(() => {
    const keys = Array.from(grouped.keys()).filter(k => k !== '__sin__').sort()
    if (grouped.has('__sin__')) keys.push('__sin__')
    return keys
  }, [grouped])

  const totalPending = asalariados.filter(e =>
    e.pendingStatus !== 'none' && e.redshiftStatus === 'none' && !e.approved
  ).length

  async function handleApprove(
    nombre: string,
    status: string,
    memos: { memo1?: string; memo2?: string; memo3?: string },
  ) {
    setSaving(true)
    await fetch('/api/asalariados/comunicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, status, ...memos }),
    })
    setLocalOverrides(prev => ({ ...prev, [nombre]: status }))
    setEditingEmp(null)
    setSaving(false)
    startTransition(() => { window.location.reload() })
  }

  const roleOptions = [...new Set(asalariados.map(e => e.salesRole))].sort()

  return (
    <div>
      {/* Pending alert */}
      {totalPending > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 font-bold text-lg">⚠</span>
          <p className="text-amber-800 text-sm font-medium">
            {totalPending} empleado{totalPending !== 1 ? 's' : ''} con comunicado pendiente de aprobación
          </p>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Empleados" value={filtered.length} />
        <Stat label="Cumplen meta" value={filtered.filter(e => e.months[e.months.length - 1].met).length} green />
        <Stat label="Comunicados pendientes" value={filtered.filter(e => e.pendingStatus !== 'none' && e.redshiftStatus === 'none' && !e.approved).length} warn />
        <Stat label="Con comunicado activo" value={filtered.filter(e => {
          const eff = e.redshiftStatus !== 'none' ? e.redshiftStatus : (e.approved?.status ?? 'none')
          return eff !== 'none'
        }).length} />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5 flex flex-wrap gap-3 items-center shadow-sm">
        <input
          type="text"
          placeholder="Buscar empleado…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C] w-44"
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E88B0C]">
          <option value="">Todos los roles</option>
          {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E88B0C]">
          <option value="">Todos los estados</option>
          <option value="none">Al día</option>
          <option value="comunicado1">Comunicado 1</option>
          <option value="comunicado2">Comunicado 2</option>
          <option value="terminacion">Terminación</option>
        </select>
        {(search || roleFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}
            className="text-xs text-slate-400 hover:text-red-500 transition">
            ✕ Limpiar
          </button>
        )}
        {isAdmin && (
          <a
            href="/api/asalariados/export"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition hover:opacity-90"
            style={{ background: '#00A651' }}
          >
            ↓ Exportar Excel
          </a>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">Sin datos de ventas</p>
          <p className="text-sm mt-1">Sube el CSV de Ventas Follow Up desde la página de Inicio.</p>
        </div>
      )}

      {/* Grouped employees */}
      <div className="space-y-6">
        {sortedRegions.map(regionKey => {
          const group = grouped.get(regionKey)!
          const label = regionKey === '__sin__' ? 'Sin Región Asignada' : regionKey
          const isSin = regionKey === '__sin__'
          return (
            <div key={regionKey}>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ background: isSin ? '#94a3b8' : '#0D1654' }} className="h-1 w-6 rounded-full" />
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", color: isSin ? '#64748b' : '#0D1654' }}
                  className="text-lg font-bold tracking-wide uppercase">
                  {label}
                </h2>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {group.length} empleado{group.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">
                  {group.filter(e => {
                    const eff = e.redshiftStatus !== 'none' ? e.redshiftStatus :
                      (e.approved?.status && e.approved.status !== 'none' ? e.approved.status : e.pendingStatus)
                    return eff !== 'none'
                  }).length} con comunicado
                </span>
              </div>
              <div className="space-y-2">
                {group.map(emp => (
                  <AsalariadoCard
                    key={emp.nombre}
                    emp={emp}
                    recentMonths={recentMonths}
                    isAdmin={isAdmin}
                    onEditComunicado={setEditingEmp}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approval modal */}
      {editingEmp && (
        <ApprovalModal
          emp={editingEmp}
          onClose={() => setEditingEmp(null)}
          onApprove={saving ? () => {} : handleApprove}
        />
      )}
    </div>
  )
}

function Stat({ label, value, green, warn }: { label: string; value: number; green?: boolean; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${green ? 'text-[#00A651]' : warn ? 'text-amber-600' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )
}

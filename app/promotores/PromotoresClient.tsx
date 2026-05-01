'use client'

import { useState, useMemo } from 'react'
import type { PromotorData } from './page'
import type { DayShiftSummary } from '@/lib/types'

const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmt(n: number) { return n.toFixed(1) }

function num(n: number | null, fallback = '—') {
  return n === null ? fallback : String(n)
}

function statusColor(status: string, aco: string) {
  if (status === 'Completed' && aco !== 'Yes') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'Completed' && aco === 'Yes')  return 'bg-amber-100 text-amber-800 border-amber-200'
  if (status === 'Missed')                       return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'Cancelled')                    return 'bg-slate-100 text-slate-500 border-slate-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

function KpiBox({ label, value, sub, color = 'text-slate-900' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 min-w-[130px]">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ShiftRow({ shift }: { shift: DayShiftSummary }) {
  const colorClass = statusColor(shift.shiftStatus, shift.autoClockedOut)
  const dayName = DAYS_FULL[shift.dayOfWeek] ?? ''
  return (
    <tr className={`text-xs border-b border-slate-100 last:border-0`}>
      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
        {dayName} {shift.date.slice(5)}
      </td>
      <td className="px-3 py-2 text-slate-700">{shift.location || '—'}</td>
      <td className="px-3 py-2 text-slate-500">{shift.canal ?? '—'}</td>
      <td className="px-3 py-2">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
          {shift.shiftStatus}
          {shift.autoClockedOut === 'Yes' ? ' ⚠' : ''}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-semibold text-slate-700">
        {shift.shiftStatus === 'Completed' ? `${fmt(shift.hoursDecimal)}h` : '—'}
      </td>
    </tr>
  )
}

function PromotorCard({ p }: { p: PromotorData }) {
  const [open, setOpen] = useState(false)

  const sortedShifts = [...p.shifts].sort((a, b) => a.date.localeCompare(b.date))
  const completedShifts = sortedShifts.filter(s => s.shiftStatus === 'Completed')

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#F4F6FB] transition-colors text-left"
      >
        <span className={`text-[#1565C0] transition-transform duration-200 text-xs ${open ? 'rotate-90' : ''}`}>▶</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
               className="font-bold text-[#0D1654] text-lg leading-tight">
              {p.nombre}
            </p>
            {p.ciudad && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                📍 {p.ciudad}
              </span>
            )}
            {p.supervisorRegional && (
              <span className="text-[10px] font-semibold text-[#00A651] bg-[#00A651]/10 px-2 py-0.5 rounded-full shrink-0">
                {p.supervisorRegional.split(' ')[0]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{p.email}</p>
        </div>

        {/* Right-side badges */}
        <div className="flex gap-4 shrink-0 text-right">
          <div>
            <p className="text-xs text-slate-400">Leads mes</p>
            <p className="font-bold text-[#0D1654]">{num(p.leadsThisMonth, '—')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Esta sem.</p>
            <p className="font-bold text-[#1565C0]">{num(p.leadsThisWeek, '—')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Ventas</p>
            <p className="font-bold text-[#00A651]">{num(p.ventasFromLeads, '—')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Horas</p>
            <p className={`font-bold ${p.horasConACO > 0 ? 'text-[#0D1654]' : 'text-slate-300'}`}>
              {p.horasConACO > 0 ? `${fmt(p.horasConACO)}h` : '—'}
            </p>
          </div>
        </div>
      </button>

      {/* Hours bar */}
      {p.horasConACO > 0 && (
        <div className="h-0.5 bg-slate-100">
          <div
            style={{ width: `${Math.min((p.horasConACO / 40) * 100, 100)}%`, background: '#1565C0' }}
            className="h-full"
          />
        </div>
      )}

      {/* Expanded */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-5">
          {/* KPI detail row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Leads este mes', value: num(p.leadsThisMonth) },
              { label: 'Leads esta semana', value: num(p.leadsThisWeek) },
              { label: 'Ventas de leads', value: num(p.ventasFromLeads), color: 'text-[#00A651]' },
              { label: 'Citas', value: num(p.citas) },
              { label: 'Horas semana', value: p.horasConACO > 0 ? `${fmt(p.horasConACO)}h` : '—' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${color ?? 'text-slate-800'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Exposure locations */}
          {p.locations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Exposición esta semana
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.locations.map(loc => (
                  <span key={loc}
                    className="text-xs bg-[#0D1654]/10 text-[#0D1654] font-medium px-3 py-1 rounded-full">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shifts table */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Turnos {p.shifterWeekKey ? `· ${p.shifterWeekKey}` : ''}
            </p>
            {sortedShifts.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <th className="px-3 py-2 text-left font-semibold">Día</th>
                      <th className="px-3 py-2 text-left font-semibold">Ubicación</th>
                      <th className="px-3 py-2 text-left font-semibold">Canal</th>
                      <th className="px-3 py-2 text-left font-semibold">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShifts.map((s, i) => <ShiftRow key={i} shift={s} />)}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-2">Sin turnos esta semana</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PromotoresClient({
  promotores,
  weekKey,
}: {
  promotores: PromotorData[]
  weekKey: string | null
}) {
  const [search, setSearch]     = useState('')
  const [ciudadFilter, setCiudad] = useState('')
  const [supFilter, setSup]     = useState('')

  const ciudades   = useMemo(() => [...new Set(promotores.map(p => p.ciudad).filter(Boolean))].sort() as string[], [promotores])
  const supervisores = useMemo(() => [...new Set(promotores.map(p => p.supervisorRegional).filter(Boolean))].sort() as string[], [promotores])

  const filtered = useMemo(() => promotores.filter(p => {
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false
    if (ciudadFilter && p.ciudad !== ciudadFilter) return false
    if (supFilter && p.supervisorRegional !== supFilter) return false
    return true
  }), [promotores, search, ciudadFilter, supFilter])

  // Summary totals
  const totalLeadsMes    = promotores.reduce((s, p) => s + (p.leadsThisMonth ?? 0), 0)
  const totalLeadsSemana = promotores.reduce((s, p) => s + (p.leadsThisWeek ?? 0), 0)
  const totalVentas      = promotores.reduce((s, p) => s + (p.ventasFromLeads ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="flex flex-wrap gap-3">
        <KpiBox label="Promotores Activos" value={String(promotores.length)} />
        <KpiBox label="Leads este mes" value={String(totalLeadsMes)} color="text-[#1565C0]" />
        <KpiBox label="Leads esta semana" value={String(totalLeadsSemana)} sub={weekKey ?? undefined} color="text-[#1565C0]" />
        <KpiBox label="Ventas de leads" value={String(totalVentas)} color="text-[#00A651]" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar promotor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00A651] w-56"
        />
        {ciudades.length > 1 && (
          <select
            value={ciudadFilter}
            onChange={e => setCiudad(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {supervisores.length > 1 && (
          <select
            value={supFilter}
            onChange={e => setSup(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00A651]"
          >
            <option value="">Todos los supervisores</option>
            {supervisores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {(search || ciudadFilter || supFilter) && (
          <button
            onClick={() => { setSearch(''); setCiudad(''); setSup('') }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          {promotores.length === 0
            ? 'No se encontraron promotores activos en Redshift. Verifica que el sales_role sea "Promotor" o similar.'
            : 'Ningún promotor coincide con los filtros.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => <PromotorCard key={p.email} p={p} />)}
        </div>
      )}
    </div>
  )
}

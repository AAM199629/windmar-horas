'use client'

import { useState } from 'react'
import type { ChannelMetrics, ShiftRow } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  Completed: 'bg-green-100 text-green-800',
  Missed:    'bg-red-100 text-red-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-slate-100 text-slate-500',
}

function pct(num: number, den: number) {
  if (!den) return '0%'
  return ((num / den) * 100).toFixed(0) + '%'
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color ?? 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ShiftRow_({ shift, showName }: { shift: ShiftRow; showName?: boolean }) {
  const isUnassigned = !shift.email || shift.email === '---'
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 text-sm">
      <td className="py-2 px-3">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[shift.shiftStatus] ?? 'bg-slate-100 text-slate-600'}`}>
          {shift.shiftStatus}
        </span>
      </td>
      <td className="py-2 px-3 text-slate-500">{shift.date}</td>
      <td className="py-2 px-3">
        <p className="font-medium text-slate-800">{shift.shiftName}</p>
        <p className="text-xs text-slate-400">{shift.location}</p>
      </td>
      <td className="py-2 px-3 text-slate-500">{shift.startTime}–{shift.endTime}</td>
      {showName && (
        <td className="py-2 px-3">
          {isUnassigned
            ? <span className="text-slate-400 italic text-xs">Sin asignar</span>
            : <span className="text-slate-700">{shift.name}</span>
          }
        </td>
      )}
      <td className="py-2 px-3 text-slate-500">
        {shift.clockIn !== '---' ? shift.clockIn : '–'}
      </td>
      <td className="py-2 px-3 text-slate-500">
        {shift.clockOut !== '---' ? shift.clockOut : '–'}
      </td>
      <td className="py-2 px-3">
        {shift.autoClockedOut === 'Yes'
          ? <span className="text-xs text-yellow-700 font-medium">ACO</span>
          : <span className="text-xs text-slate-300">–</span>
        }
      </td>
      <td className="py-2 px-3 text-slate-600 font-medium">{shift.shiftHours || '–'}</td>
    </tr>
  )
}

type FilterState = { status: string; ampm: string; search: string }

export default function ChannelView({
  metrics,
  weekStart,
  weekEnd,
}: {
  metrics: ChannelMetrics
  weekStart: string
  weekEnd: string
}) {
  const [filters, setFilters] = useState<FilterState>({ status: 'all', ampm: 'all', search: '' })
  const [showTable, setShowTable] = useState(false)

  const { shifts } = metrics
  const assignedShifts = shifts.filter(s => s.email && s.email !== '---')

  // By-day breakdown (assigned only)
  const byDay: Record<string, ShiftRow[]> = {}
  for (const s of assignedShifts) {
    byDay[s.date] = byDay[s.date] ?? []
    byDay[s.date].push(s)
  }
  const sortedDays = Object.keys(byDay).sort()

  // Filtered table rows
  const filtered = shifts.filter(s => {
    if (filters.status !== 'all' && s.shiftStatus !== filters.status) return false
    if (filters.ampm === 'am' && !(s.startTime < '12:00')) return false
    if (filters.ampm === 'pm' && !(s.startTime >= '12:00')) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !s.shiftName.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const ponchPct = pct(metrics.turnosPonchados, metrics.turnosAsignados)

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard label="Turnos creados"   value={metrics.turnosCreados} />
        <MetricCard label="Asignados"        value={metrics.turnosAsignados}  sub={pct(metrics.turnosAsignados, metrics.turnosCreados)} />
        <MetricCard label="Ponchados"        value={metrics.turnosPonchados}  sub={ponchPct} color="text-[#00A651]" />
        <MetricCard label="Missed"           value={metrics.turnosMissed} color="text-red-600" />
        <MetricCard label="AM"               value={metrics.turnosAM} />
        <MetricCard label="PM"               value={metrics.turnosPM} />
        <MetricCard label="Individuos"       value={metrics.individuosUnicos} color="text-[#00A651]" />
        <MetricCard label="Sin asignar"      value={metrics.turnosCreados - metrics.turnosAsignados} color="text-slate-500" />
      </div>

      {/* Ponch bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Tasa de ponche: {ponchPct} ({metrics.turnosPonchados}/{metrics.turnosAsignados})</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00A651] rounded-full transition-all"
            style={{ width: ponchPct }}
          />
        </div>
      </div>

      {/* Day-by-day summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-2">Por día</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {sortedDays.map(date => {
            const dayRows = byDay[date]
            const comp = dayRows.filter(s => s.shiftStatus === 'Completed').length
            const miss = dayRows.filter(s => s.shiftStatus === 'Missed').length
            const uniq = new Set(dayRows.map(s => s.email)).size
            const dow = new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short' })
            return (
              <div key={date} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-400 font-medium uppercase">{dow}</p>
                <p className="text-xs text-slate-500">{date.slice(5)}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{dayRows.length}</p>
                <div className="flex justify-center gap-2 mt-1 text-xs">
                  <span className="text-green-700">{comp}✓</span>
                  {miss > 0 && <span className="text-red-600">{miss}✗</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{uniq} ind.</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Shift table toggle */}
      <div>
        <button
          onClick={() => setShowTable(v => !v)}
          className="text-sm font-medium text-[#00A651] hover:underline"
        >
          {showTable ? '▲ Ocultar detalle de turnos' : '▼ Ver todos los turnos'}
        </button>

        {showTable && (
          <div className="mt-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="all">Todos los estados</option>
                <option value="Completed">Completed</option>
                <option value="Missed">Missed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select
                value={filters.ampm}
                onChange={e => setFilters(f => ({ ...f, ampm: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="all">AM + PM</option>
                <option value="am">Solo AM</option>
                <option value="pm">Solo PM</option>
              </select>
              <input
                type="text"
                placeholder="Buscar nombre / turno / lugar..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-48"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="py-2 px-3 text-left">Estado</th>
                    <th className="py-2 px-3 text-left">Fecha</th>
                    <th className="py-2 px-3 text-left">Turno</th>
                    <th className="py-2 px-3 text-left">Horario</th>
                    <th className="py-2 px-3 text-left">Persona</th>
                    <th className="py-2 px-3 text-left">Clock In</th>
                    <th className="py-2 px-3 text-left">Clock Out</th>
                    <th className="py-2 px-3 text-left">ACO</th>
                    <th className="py-2 px-3 text-left">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <ShiftRow_ key={i} shift={s} showName />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-1">{filtered.length} turnos</p>
          </div>
        )}
      </div>
    </div>
  )
}

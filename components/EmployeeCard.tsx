'use client'

import { useState } from 'react'
import type { EmployeeSummary, DayShiftSummary } from '@/lib/types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmt(n: number) {
  return n.toFixed(2)
}

function statusBadge(status: string, aco: string) {
  if (status === 'Completed' && aco === 'Yes')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">ACO</span>
  if (status === 'Completed')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">✓ Ponchado</span>
  if (status === 'Missed')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-medium">Missed</span>
  if (status === 'Cancelled')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Cancelado</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">{status}</span>
}

function ShiftDetail({ shift }: { shift: DayShiftSummary }) {
  return (
    <div className="border-l-2 border-[#00A651]/30 pl-3 py-1.5">
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <span className="text-xs font-semibold text-slate-600">{DAYS_FULL[shift.dayOfWeek]} {shift.date}</span>
        {statusBadge(shift.shiftStatus, shift.autoClockedOut)}
        {shift.hoursDecimal > 0 && (
          <span className="text-xs text-slate-500">{fmt(shift.hoursDecimal)}h</span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-800">{shift.shiftName}</p>
      <p className="text-xs text-slate-500">{shift.location} · {shift.startTime}–{shift.endTime}</p>
      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
        {shift.clockIn && shift.clockIn !== '---' && (
          <span>Clock in: <span className="text-slate-700 font-medium">{shift.clockIn}</span></span>
        )}
        {shift.clockOut && shift.clockOut !== '---' && (
          <span>Clock out: <span className="text-slate-700 font-medium">{shift.clockOut}</span></span>
        )}
        {shift.autoClockedOut === 'Yes' && (
          <span className="text-yellow-700">ACO: {shift.reasonForLeaving}</span>
        )}
      </div>
    </div>
  )
}

export default function EmployeeCard({ emp }: { emp: EmployeeSummary }) {
  const [open, setOpen] = useState(false)

  const diffHours = emp.horasConACO - emp.horasSinACO
  const acoPercent = emp.horasConACO > 0 ? (diffHours / emp.horasConACO) * 100 : 0

  // Sort shifts by date
  const sortedShifts = [...emp.shifts].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Arrow */}
        <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{emp.name}</p>
          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
        </div>

        {/* Metrics */}
        <div className="flex gap-6 shrink-0 text-right">
          <div>
            <p className="text-xs text-slate-400">Sin ACO</p>
            <p className="font-bold text-slate-800">{fmt(emp.horasSinACO)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Con ACO</p>
            <p className="font-bold text-[#00A651]">{fmt(emp.horasConACO)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Turnos</p>
            <p className="font-bold text-slate-800">{emp.totalTurnos}</p>
          </div>
          {diffHours > 0 && (
            <div>
              <p className="text-xs text-slate-400">ACO diff</p>
              <p className="font-bold text-yellow-600">+{fmt(diffHours)}h</p>
            </div>
          )}
        </div>
      </button>

      {/* ACO bar */}
      {emp.horasConACO > 0 && (
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-[#00A651]"
            style={{ width: `${100 - acoPercent}%` }}
          />
        </div>
      )}

      {/* Expanded shift details */}
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100">
          {/* Day grid overview */}
          <div className="flex gap-1 mb-3">
            {DAYS.map((day, i) => {
              const dayShifts = sortedShifts.filter(s => s.dayOfWeek === i)
              const completed = dayShifts.filter(s => s.shiftStatus === 'Completed').length
              const hasACO = dayShifts.some(s => s.autoClockedOut === 'Yes')
              return (
                <div
                  key={day}
                  className={`flex-1 rounded text-center py-1 text-xs font-medium ${
                    completed > 0 && !hasACO ? 'bg-green-100 text-green-800' :
                    completed > 0 && hasACO  ? 'bg-yellow-100 text-yellow-800' :
                    dayShifts.length > 0      ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  <div>{day}</div>
                  <div>{dayShifts.length > 0 ? dayShifts.length : '–'}</div>
                </div>
              )
            })}
          </div>

          {/* Shift list */}
          <div className="space-y-2">
            {sortedShifts.map((s, i) => <ShiftDetail key={i} shift={s} />)}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { EmployeeSummary, DayShiftSummary } from '@/lib/types'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmt(n: number) { return n.toFixed(2) }

function statusColor(status: string, aco: string) {
  if (status === 'Completed' && aco !== 'Yes') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'Completed' && aco === 'Yes')  return 'bg-amber-100 text-amber-800 border-amber-200'
  if (status === 'Missed')                       return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'Cancelled')                    return 'bg-slate-100 text-slate-500 border-slate-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

function ShiftCell({ shift }: { shift: DayShiftSummary }) {
  const colorClass = statusColor(shift.shiftStatus, shift.autoClockedOut)
  return (
    <div className={`rounded-lg border p-2 text-xs space-y-1 ${colorClass}`}>
      <p className="font-semibold leading-tight">{shift.shiftName}</p>
      <p className="opacity-75 leading-tight">{shift.location}</p>
      <p className="font-medium">{shift.startTime}–{shift.endTime}</p>
      {shift.shiftStatus === 'Completed' && (
        <div className="space-y-0.5 pt-0.5 border-t border-current/20">
          <div className="flex justify-between">
            <span className="opacity-60">In</span>
            <span className="font-medium">{shift.clockIn !== '---' ? shift.clockIn : '–'}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">Out</span>
            <span className="font-medium">{shift.clockOut !== '---' ? shift.clockOut : '–'}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">Hrs</span>
            <span className="font-bold">{fmt(shift.hoursDecimal)}</span>
          </div>
          {shift.autoClockedOut === 'Yes' && (
            <p className="text-amber-700 font-medium">ACO ⚠</p>
          )}
          {shift.autoClockedOut === 'Yes' && shift.reasonForLeaving && shift.reasonForLeaving !== '---' && (
            <p className="opacity-75 leading-tight">{shift.reasonForLeaving}</p>
          )}
        </div>
      )}
      {shift.shiftStatus === 'Missed' && (
        <p className="font-semibold">Missed ✗</p>
      )}
    </div>
  )
}

export default function EmployeeCard({ emp }: { emp: EmployeeSummary }) {
  const [open, setOpen] = useState(false)

  const diffHours = emp.horasConACO - emp.horasSinACO
  const sortedShifts = [...emp.shifts].sort((a, b) => a.date.localeCompare(b.date))

  // Group shifts by day of week
  const byDay: Record<number, DayShiftSummary[]> = {}
  for (const s of sortedShifts) {
    byDay[s.dayOfWeek] = byDay[s.dayOfWeek] ?? []
    byDay[s.dayOfWeek].push(s)
  }

  // Find which days have any shifts to show (0–6)
  const activeDays = DAYS.map((_, i) => i).filter(i => (byDay[i]?.length ?? 0) > 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#F4F6FB] transition-colors text-left"
      >
        <span className={`text-[#1565C0] transition-transform duration-200 text-xs ${open ? 'rotate-90' : ''}`}>▶</span>

        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-[#0D1654] text-lg leading-tight truncate">
            {emp.name}
          </p>
          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
        </div>

        {/* Mini day dots */}
        <div className="hidden sm:flex gap-1">
          {DAYS.map((d, i) => {
            const dayShifts = byDay[i] ?? []
            const comp = dayShifts.filter(s => s.shiftStatus === 'Completed').length
            const hasACO = dayShifts.some(s => s.autoClockedOut === 'Yes')
            return (
              <div
                key={d}
                title={DAYS_FULL[i]}
                className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                  comp > 0 && !hasACO ? 'bg-green-100 text-green-700' :
                  comp > 0 && hasACO  ? 'bg-amber-100 text-amber-700' :
                  dayShifts.length > 0 ? 'bg-red-100 text-red-600' :
                  'bg-slate-100 text-slate-300'
                }`}
              >
                {d[0]}
              </div>
            )
          })}
        </div>

        {/* Metrics */}
        <div className="flex gap-5 shrink-0 text-right">
          <div>
            <p className="text-xs text-slate-400">Sin ACO</p>
            <p className="font-bold text-[#0D1654]">{fmt(emp.horasSinACO)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Con ACO</p>
            <p className="font-bold text-[#1565C0]">{fmt(emp.horasConACO)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Turnos</p>
            <p className="font-bold text-[#0D1654]">{emp.totalTurnos}</p>
          </div>
          {diffHours > 0.01 && (
            <div>
              <p className="text-xs text-slate-400">ACO +</p>
              <p className="font-bold text-amber-600">+{fmt(diffHours)}h</p>
            </div>
          )}
        </div>
      </button>

      {/* Progress bar */}
      {emp.horasConACO > 0 && (
        <div className="h-1 bg-slate-100">
          <div
            style={{ width: `${(emp.horasSinACO / emp.horasConACO) * 100}%`, background: '#1565C0' }}
            className="h-full transition-all"
          />
        </div>
      )}

      {/* Expanded — horizontal calendar */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {activeDays.map(dayIdx => {
              const dayShifts = byDay[dayIdx] ?? []
              const date = dayShifts[0]?.date ?? ''
              return (
                <div key={dayIdx} className="w-44 shrink-0">
                  {/* Day header */}
                  <div
                    style={{ background: '#0D1654', fontFamily: "'Barlow Condensed', sans-serif" }}
                    className="rounded-t-lg px-3 py-1.5 text-center mb-2"
                  >
                    <p className="text-white font-bold text-sm tracking-wide">{DAYS_FULL[dayIdx]}</p>
                    {date && <p className="text-[#F5A623] text-xs">{date.slice(5)}</p>}
                  </div>

                  {/* Shifts stacked */}
                  <div className="space-y-2">
                    {dayShifts.map((s, i) => <ShiftCell key={i} shift={s} />)}
                  </div>
                </div>
              )
            })}

            {activeDays.length === 0 && (
              <p className="text-slate-400 text-sm py-4">Sin turnos esta semana</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

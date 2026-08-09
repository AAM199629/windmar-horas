import type { Canal, ShiftRow, EmployeeSummary, ChannelMetrics, WeeklyReport, DayShiftSummary } from './types'

// ── Canal mapping ──────────────────────────────────────────────────────────

const EXCLUDED_PATTERNS = [
  'showroom',
  'to showroom',
  'meeting room',
  'reuniones',
  'media tour',
  'asalariados',
]

export function resolveCanal(shiftType: string): Canal | null {
  const n = shiftType.trim().toLowerCase()
  if (EXCLUDED_PATTERNS.some(p => n.includes(p))) return null
  if (n.includes('canvaseo') || n.includes('cambaceo') || n.includes('canvaceo')) return 'cambaceo'
  if (n === 'booth malls' || n === 'booth mall' || n.startsWith('home depot')) return 'mall'
  return 'independiente'
}

// ── HH:MM → decimal hours ──────────────────────────────────────────────────

export function parseHoursDecimal(hhmm: string): number {
  if (!hhmm || hhmm === '---') return 0
  const parts = hhmm.split(':')
  if (parts.length !== 2) return 0
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return 0
  return h + m / 60
}

// ── Day of week from date string ───────────────────────────────────────────

function dayOfWeek(dateStr: string): number {
  // Returns 0=Sun, 1=Mon … 6=Sat
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay()
}

// ── Week key from date ─────────────────────────────────────────────────────

export function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekBounds(shifts: ShiftRow[]): { weekStart: string; weekEnd: string } {
  const dates = shifts.map(s => s.date).filter(Boolean).sort()
  return { weekStart: dates[0] ?? '', weekEnd: dates[dates.length - 1] ?? '' }
}

// ── Build WeeklyReport from raw rows ──────────────────────────────────────

export function buildWeeklyReport(rows: ShiftRow[]): WeeklyReport {
  const validRows = rows.filter(r => r.date && r.shiftType)
  const dates = validRows.map(r => r.date).sort()
  const weekKey = dates[0] ? getWeekKey(dates[0]) : 'unknown'
  const { weekStart, weekEnd } = weekBounds(validRows)

  // ── Employee summaries (assigned rows only) ──────────────────────────────
  const empMap = new Map<string, { shifts: DayShiftSummary[]; name: string; userId: string }>()

  for (const row of validRows) {
    if (!row.email || row.email === '---') continue
    if (!row.userId || row.userId === '---') continue

    const key = row.email
    if (!empMap.has(key)) empMap.set(key, { shifts: [], name: row.name, userId: row.userId })

    const hours = parseHoursDecimal(row.shiftHours)
    empMap.get(key)!.shifts.push({
      dayOfWeek:        dayOfWeek(row.date),
      date:             row.date,
      shiftName:        row.shiftName,
      shiftType:        row.shiftType,
      location:         row.location,
      shiftStatus:      row.shiftStatus,
      startTime:        row.startTime,
      endTime:          row.endTime,
      clockIn:          row.clockIn,
      clockOut:         row.clockOut,
      autoClockedOut:   row.autoClockedOut,
      hoursDecimal:     hours,
      reasonForLeaving: row.reasonForLeaving,
      canal:            row.canal,
    })
  }

  const employees: EmployeeSummary[] = Array.from(empMap.entries()).map(([email, { name, userId, shifts }]) => {
    const completed = shifts.filter(s => s.shiftStatus === 'Completed')
    const horasConACO = completed.reduce((acc, s) => acc + s.hoursDecimal, 0)
    const horasSinACO = completed.filter(s => s.autoClockedOut !== 'Yes').reduce((acc, s) => acc + s.hoursDecimal, 0)
    return { name, email, userId, horasSinACO, horasConACO, totalTurnos: shifts.length, shifts }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // ── Channel metrics ──────────────────────────────────────────────────────
  const canales: Canal[] = ['cambaceo', 'mall', 'independiente']
  const channels = {} as Record<Canal, ChannelMetrics>

  for (const canal of canales) {
    const cRows = validRows.filter(r => r.canal === canal)
    const assigned = cRows.filter(r => r.email && r.email !== '---')
    const completed = assigned.filter(r => r.shiftStatus === 'Completed')
    const am = cRows.filter(r => r.startTime && r.startTime < '12:00')
    const pm = cRows.filter(r => r.startTime && r.startTime >= '12:00')
    const uniqEmps = new Set(completed.map(r => r.email)).size

    channels[canal] = {
      canal,
      turnosCreados:    cRows.length,
      turnosAsignados:  assigned.length,
      turnosPonchados:  completed.length,
      turnosMissed:     assigned.filter(r => r.shiftStatus === 'Missed').length,
      turnosAM:         am.length,
      turnosPM:         pm.length,
      individuosUnicos: uniqEmps,
      shifts:           cRows,
    }
  }

  return {
    weekKey,
    weekStart,
    weekEnd,
    uploadedAt: new Date().toISOString(),
    employees,
    channels,
    allShifts: validRows,
  }
}

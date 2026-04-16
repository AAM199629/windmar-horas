// ── Channel types ──────────────────────────────────────────────────────────

export type Canal = 'cambaceo' | 'mall' | 'independiente'

// ── Raw shift from Shifter CSV ─────────────────────────────────────────────

export interface ShiftRow {
  name: string
  email: string
  shiftId: string
  shiftName: string
  location: string
  shiftType: string
  shiftStatus: 'Completed' | 'Missed' | 'Confirmed' | 'Cancelled' | string
  date: string          // YYYY-MM-DD
  startTime: string     // HH:MM
  endTime: string       // HH:MM
  region: string
  userId: string
  clockIn: string
  adminClockIn: string
  clockOut: string
  adminClockOut: string
  autoClockedOut: 'Yes' | 'No' | string
  shiftHours: string    // HH:MM  e.g. "05:24"
  reasonForLeaving: string
  canal: Canal | null   // null = excluded (Showroom, Meeting Rooms, etc.)
}

// ── Processed per-employee summary ────────────────────────────────────────

export interface DayShiftSummary {
  dayOfWeek: number     // 0=Sun…6=Sat
  date: string
  shiftName: string
  shiftType: string
  location: string
  shiftStatus: string
  startTime: string
  endTime: string
  clockIn: string
  clockOut: string
  autoClockedOut: 'Yes' | 'No' | string
  hoursDecimal: number
  reasonForLeaving: string
  canal: Canal | null
}

export interface EmployeeSummary {
  name: string
  email: string
  userId: string
  horasSinACO: number
  horasConACO: number
  totalTurnos: number
  shifts: DayShiftSummary[]
}

// ── Channel metrics ────────────────────────────────────────────────────────

export interface ChannelMetrics {
  canal: Canal
  turnosCreados: number       // total shift slots (including unassigned)
  turnosAsignados: number     // slots with a real employee
  turnosPonchados: number     // Completed shifts
  turnosMissed: number
  turnosAM: number            // start time < 12:00
  turnosPM: number            // start time >= 12:00
  individuosUnicos: number    // distinct employees who worked
  shifts: ShiftRow[]          // all rows (assigned + unassigned)
}

// ── Stored weekly report ───────────────────────────────────────────────────

export interface WeeklyReport {
  weekKey: string             // e.g. "2026-W15"
  weekStart: string           // YYYY-MM-DD (Sunday)
  weekEnd: string             // YYYY-MM-DD (Saturday)
  uploadedAt: string          // ISO timestamp
  employees: EmployeeSummary[]
  channels: Record<Canal, ChannelMetrics>
  allShifts: ShiftRow[]
}

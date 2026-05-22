import mysql from 'mysql2/promise'
import type { ShiftRow } from './types'
import { resolveCanal } from './shifter'

let pool: mysql.Pool | null = null

function getStipPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.STIP_HOST!,
      port:     Number(process.env.STIP_PORT ?? 3306),
      database: process.env.STIP_DB!,
      user:     process.env.STIP_USER!,
      password: process.env.STIP_PASSWORD!,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: 'Z',
    })
  }
  return pool
}

// Parse "MM/DD/YYYY HH:MM:SS" → Date (returns null if blank/invalid)
function parseStipDateTime(val: string): Date | null {
  if (!val || val === '---') return null
  // MM/DD/YYYY HH:MM:SS
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  return new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:${m[6]}`)
}

// Returns "HH:MM" decimal-hours string like the CSV shiftHours field
function calcShiftHours(clockIn: string, clockOut: string): string {
  const inDt  = parseStipDateTime(clockIn)
  const outDt = parseStipDateTime(clockOut)
  if (!inDt || !outDt) return '00:00'
  const diffMs = outDt.getTime() - inDt.getTime()
  if (diffMs <= 0) return '00:00'
  const totalMinutes = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Midnight clock-out (auto-clocked-out by system at 00:00:00 next day)
function isAutoClockedOut(clockOut: string): 'Yes' | 'No' {
  if (!clockOut || clockOut === '---') return 'No'
  return clockOut.endsWith('00:00:00') ? 'Yes' : 'No'
}

interface StipRow {
  id:            number
  shift_id:      number
  shift_name:    string
  shift_date:    string   // YYYY-MM-DD
  shift_time:    string   // HH:MM:SS
  user_id:       number
  user_name:     string
  user_email:    string
  user_status:   string
  user_clock_in: string
  user_clock_out: string
  user_zoho_id:  string
  shift_region:  string
  shift_type:    string
  shift_location: string
}

export async function getShiftRowsForRange(
  weekStart: string,  // YYYY-MM-DD
  weekEnd:   string,  // YYYY-MM-DD
): Promise<ShiftRow[]> {
  const db = getStipPool()

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT id, shift_id, shift_name, shift_date, shift_time,
            user_id, user_name, user_email, user_status,
            user_clock_in, user_clock_out, user_zoho_id,
            shift_region, shift_type, shift_location
     FROM shift_instances
     WHERE shift_date BETWEEN ? AND ?
       AND user_id != 0
     ORDER BY shift_date, user_name`,
    [weekStart, weekEnd],
  )

  return (rows as StipRow[]).map(r => {
    const shiftHours = calcShiftHours(r.user_clock_in, r.user_clock_out)
    const autoClockedOut = isAutoClockedOut(r.user_clock_out)

    // Parse shift_time (HH:MM:SS) → HH:MM
    const startTime = r.shift_time ? r.shift_time.slice(0, 5) : ''

    return {
      name:             r.user_name   ?? '',
      email:            (r.user_email ?? '').toLowerCase(),
      shiftId:          String(r.shift_id),
      shiftName:        r.shift_name  ?? '',
      location:         r.shift_location ?? '',
      shiftType:        r.shift_type  ?? '',
      shiftStatus:      r.user_status ?? '',
      date:             r.shift_date  ?? '',
      startTime,
      endTime:          '',   // not stored separately in shift_instances
      region:           r.shift_region ?? '',
      userId:           String(r.user_id),
      clockIn:          r.user_clock_in  ?? '',
      adminClockIn:     r.user_clock_in  ?? '',
      clockOut:         r.user_clock_out ?? '',
      adminClockOut:    r.user_clock_out ?? '',
      autoClockedOut,
      shiftHours,
      reasonForLeaving: '',
      canal:            resolveCanal(r.shift_type ?? ''),
    }
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { saveWeeklyReport, getWeeklyReport } from '@/lib/kv'
import { buildWeeklyReport, resolveCanal, getWeekKey } from '@/lib/shifter'
import type { ShiftRow } from '@/lib/types'

const SECRET = process.env.SHIFTER_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-shifter-secret')
  if (SECRET && secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, shift_id, date } = body
  if (!date || !shift_id) {
    return NextResponse.json({ error: 'Missing required fields: date, shift_id' }, { status: 400 })
  }

  const weekKey = getWeekKey(date)
  const existing = await getWeeklyReport(weekKey)
  let allShifts: ShiftRow[] = existing?.allShifts ?? []

  // Remove the previous version of this shift (if any)
  allShifts = allShifts.filter(s => s.shiftId !== shift_id)

  // Add the updated shift unless it was cancelled
  if (event !== 'cancelled') {
    const row: ShiftRow = {
      name:             body.name             ?? '',
      email:            (body.email           ?? '').toLowerCase(),
      shiftId:          shift_id,
      shiftName:        body.shift_name        ?? '',
      location:         body.location          ?? '',
      shiftType:        body.shift_type        ?? '',
      shiftStatus:      mapStatus(event),
      date:             date,
      startTime:        body.start_time        ?? '',
      endTime:          body.end_time          ?? '',
      region:           body.region            ?? '',
      userId:           body.user_id           ?? '',
      clockIn:          body.clock_in          ?? '',
      adminClockIn:     '',
      clockOut:         body.clock_out         ?? '',
      adminClockOut:    '',
      autoClockedOut:   body.auto_clocked_out ? 'Yes' : 'No',
      shiftHours:       body.shift_hours       ?? '',
      reasonForLeaving: body.reason_for_leaving ?? '',
      canal:            resolveCanal(body.shift_type ?? ''),
    }
    allShifts.push(row)
  }

  const report = buildWeeklyReport(allShifts)
  await saveWeeklyReport(report)

  return NextResponse.json({ ok: true, weekKey, event, shifts: allShifts.length })
}

function mapStatus(event: string): string {
  switch (event) {
    case 'shift_completed':  return 'Completed'
    case 'auto_clocked_out': return 'Completed'
    case 'clocked_out':      return 'Completed'
    case 'cancelled':        return 'Cancelled'
    default:                 return 'Confirmed'
  }
}

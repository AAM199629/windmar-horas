import { NextRequest, NextResponse } from 'next/server'
import { getShiftRowsForRange } from '@/lib/stip'
import { buildWeeklyReport } from '@/lib/shifter'
import { saveWeeklyReport } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const { weekStart, weekEnd } = await req.json()

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: 'weekStart y weekEnd requeridos (YYYY-MM-DD)' }, { status: 400 })
    }

    const rows = await getShiftRowsForRange(weekStart, weekEnd)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron turnos para ese período' }, { status: 404 })
    }

    const report = buildWeeklyReport(rows)
    await saveWeeklyReport(report)

    return NextResponse.json({
      ok:          true,
      weekKey:     report.weekKey,
      weekStart:   report.weekStart,
      weekEnd:     report.weekEnd,
      employees:   report.employees.length,
      totalShifts: rows.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

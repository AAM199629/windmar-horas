import { NextRequest, NextResponse } from 'next/server'
import { getShiftRowsForRange } from '@/lib/stip'
import { buildWeeklyReport } from '@/lib/shifter'
import { getWeeklyReport, listWeekKeys } from '@/lib/kv'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from y to requeridos (YYYY-MM-DD)' }, { status: 400 })
    }

    const rows = await getShiftRowsForRange(from, to)

    if (rows.length > 0) {
      return NextResponse.json(buildWeeklyReport(rows))
    }

    // Fallback: search all stored CSV reports for one that overlaps the requested range
    const allKeys = await listWeekKeys()
    for (const key of allKeys) {
      const kvReport = await getWeeklyReport(key)
      if (!kvReport) continue
      if (kvReport.weekStart > to || kvReport.weekEnd < from) continue
      const filtered = kvReport.allShifts.filter(s => s.date >= from && s.date <= to)
      if (filtered.length > 0) {
        return NextResponse.json({ ...buildWeeklyReport(filtered), source: 'csv' })
      }
    }

    return NextResponse.json({ error: 'No hay turnos para ese período' }, { status: 404 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getShiftRowsForRange } from '@/lib/stip'
import { buildWeeklyReport } from '@/lib/shifter'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from y to requeridos (YYYY-MM-DD)' }, { status: 400 })
    }

    const rows = await getShiftRowsForRange(from, to)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No hay turnos para ese período' }, { status: 404 })
    }

    const report = buildWeeklyReport(rows)
    return NextResponse.json(report)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

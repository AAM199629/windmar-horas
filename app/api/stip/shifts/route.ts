import { NextRequest, NextResponse } from 'next/server'
import { getShifterShiftRows } from '@/lib/shifter-api'
import { buildWeeklyReport } from '@/lib/shifter'

// Fuente única: API de Shifter (UWE). Data fresca de turnos y ponches —
// incluye los ponches de admin que el sync de STIP se comía.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from = searchParams.get('from')
    const to   = searchParams.get('to')
    const regionParam = searchParams.get('region')
    const region = regionParam === 'FL' || regionParam === 'all' ? regionParam : 'PR'

    if (!from || !to) {
      return NextResponse.json({ error: 'from y to requeridos (YYYY-MM-DD)' }, { status: 400 })
    }

    const rows = await getShifterShiftRows(from, to, { region })
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No hay turnos para ese período' }, { status: 404 })
    }

    return NextResponse.json({ ...buildWeeklyReport(rows), source: 'shifter' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

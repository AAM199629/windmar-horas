import { NextRequest, NextResponse } from 'next/server'
import { parseShifterCSV, buildWeeklyReport } from '@/lib/shifter'
import { saveWeeklyReport } from '@/lib/kv'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseShifterCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vacío o formato inválido' }, { status: 400 })
    }

    const report = buildWeeklyReport(rows)
    await saveWeeklyReport(report)

    return NextResponse.json({
      ok: true,
      weekKey: report.weekKey,
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      employees: report.employees.length,
      totalShifts: rows.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

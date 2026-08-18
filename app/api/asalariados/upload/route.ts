import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { parseVentasCSV } from '@/lib/ventas'
import { saveVentasRows } from '@/lib/asalariados-kv'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') return null
  return session
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseVentasCSV(text)

  if (!rows.length) {
    return NextResponse.json({ error: 'El CSV no tiene filas válidas. Verifica que sea el export de Ventas Follow Up.' }, { status: 400 })
  }

  await saveVentasRows(rows)
  return NextResponse.json({ ok: true, count: rows.length })
}

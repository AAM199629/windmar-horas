import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { setComunicado, getComunicado, getAllComunicados } from '@/lib/asalariados-kv'

async function requireAdminOrSupervisor() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || (role !== 'admin' && role !== 'supervisor')) return null
  return session
}

// GET /api/asalariados/comunicados — list all stored comunicado records
export async function GET() {
  if (!await requireAdminOrSupervisor()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const records = await getAllComunicados()
  return NextResponse.json(records)
}

// POST /api/asalariados/comunicados — approve / update a comunicado
export async function POST(req: NextRequest) {
  if (!await requireAdminOrSupervisor()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { nombre, status, memo1, memo2, memo3 } = body

  if (!nombre || !status) {
    return NextResponse.json({ error: 'nombre y status son requeridos' }, { status: 400 })
  }

  const existing = await getComunicado(nombre) ?? { nombre, status: 'none', updatedAt: '' }

  const record = {
    ...existing,
    nombre,
    status,
    ...(memo1 !== undefined && { memo1 }),
    ...(memo2 !== undefined && { memo2 }),
    ...(memo3 !== undefined && { memo3 }),
    updatedAt: new Date().toISOString(),
  }

  await setComunicado(record)
  return NextResponse.json({ ok: true, record })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getNomina, saveNomina } from '@/lib/nomina-kv'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') return null
  return session
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { week } = await params
  const record = await getNomina(week)
  return NextResponse.json(record ?? null)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { week } = await params
  const body = await req.json()
  const record = { ...body, weekKey: week, updatedAt: new Date().toISOString() }
  await saveNomina(record)
  return NextResponse.json({ ok: true })
}

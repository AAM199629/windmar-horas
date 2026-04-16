import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { hash } from 'bcryptjs'
import { auth } from '@/auth'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const emails = await redis.smembers('horas:users')
  if (!emails.length) return NextResponse.json([])

  const users = await Promise.all(
    emails.map(async (email) => {
      const raw = await redis.get<any>(`horas:user:${email}`)
      if (!raw) return null
      const u = typeof raw === 'string' ? JSON.parse(raw) : raw
      return { id: u.id, email: u.email, name: u.name, role: u.role }
    })
  )

  return NextResponse.json(users.filter(Boolean))
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name, password, role } = await req.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name y password son requeridos' }, { status: 400 })
  }

  const existing = await redis.get(`horas:user:${email.toLowerCase()}`)
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)
  const user = {
    id:           crypto.randomUUID(),
    email:        email.toLowerCase(),
    name,
    passwordHash,
    role:         role ?? 'viewer',
  }

  await redis.set(`horas:user:${user.email}`, JSON.stringify(user))
  await redis.sadd('horas:users', user.email)
  return NextResponse.json({ ok: true, email: user.email, name: user.name, role: user.role })
}

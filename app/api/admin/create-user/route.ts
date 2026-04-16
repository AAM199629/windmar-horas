import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { hash } from 'bcryptjs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name, password, role } = await req.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name y password son requeridos' }, { status: 400 })
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

import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export type AppRole = 'admin' | 'supervisor' | 'canal' | 'ventas'

/**
 * Guard for API route handlers. Returns a 401 NextResponse if the current
 * session's role is not in `allowed`, or `null` if the request is authorized.
 *
 *   export async function GET() {
 *     const denied = await requireRole(['admin'])
 *     if (denied) return denied
 *     ...
 *   }
 */
export async function requireRole(allowed: AppRole[]): Promise<NextResponse | null> {
  const session = await auth()
  const role = (session?.user as any)?.role as AppRole | undefined
  if (!session || !role || !allowed.includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

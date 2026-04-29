import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteWeeklyReport } from '@/lib/kv'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ week: string }> }
) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { week } = await params
  await deleteWeeklyReport(week)
  return NextResponse.json({ ok: true })
}

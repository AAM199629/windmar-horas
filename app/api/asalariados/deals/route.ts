import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { getAsalariadoDealDetails, getAsalariadoCancelledDeals } from '@/lib/redshift'

export async function GET(req: NextRequest) {
  const denied = await requireRole(['admin'])
  if (denied) return denied
  const { searchParams } = req.nextUrl
  const name      = searchParams.get('name')
  const year      = Number(searchParams.get('year'))
  const month     = Number(searchParams.get('month'))
  const cancelled = searchParams.get('cancelled') === '1'

  if (!name || !year || !month) {
    return NextResponse.json({ error: 'Missing params: name, year, month' }, { status: 400 })
  }

  try {
    const deals = cancelled
      ? await getAsalariadoCancelledDeals(name, year, month)
      : await getAsalariadoDealDetails(name, year, month)
    return NextResponse.json(deals)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error' }, { status: 500 })
  }
}

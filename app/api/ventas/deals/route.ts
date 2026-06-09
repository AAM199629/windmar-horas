import { NextRequest, NextResponse } from 'next/server'
import { getSalesDealDetailsByRoles } from '@/lib/redshift'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')
  const roles   = searchParams.getAll('role')
  const exclude = searchParams.get('exclude') === '1'

  if (!from || !to || roles.length === 0) {
    return NextResponse.json({ error: 'Missing params: from, to, role' }, { status: 400 })
  }

  try {
    const deals = await getSalesDealDetailsByRoles(from, to, roles, exclude)
    return NextResponse.json(deals)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error' }, { status: 500 })
  }
}

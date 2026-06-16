import { NextRequest, NextResponse } from 'next/server'
import { getMallBoothLeadDetails } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const yearParam = searchParams.get('year')
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    const leads = await getMallBoothLeadDetails(year)
    return NextResponse.json(leads)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

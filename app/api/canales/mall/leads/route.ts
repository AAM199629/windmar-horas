import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMallBoothLeadDetails } from '@/lib/redshift'

function getCachedLeads(year: number) {
  return unstable_cache(
    () => getMallBoothLeadDetails(year),
    [`mall-booth-lead-details-${year}`],
    { revalidate: 300 },
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const yearParam = searchParams.get('year')
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    const leads = await getCachedLeads(year)()
    return NextResponse.json(leads)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

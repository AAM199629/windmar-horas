import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getIndepDealDetails } from '@/lib/redshift'

const getCachedDeals = unstable_cache(
  getIndepDealDetails,
  ['indep-deal-details-v2'],
  { revalidate: 300 },
)

export async function GET() {
  try {
    const year = new Date().getFullYear()
    const deals = await getCachedDeals(year)
    return NextResponse.json(deals)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

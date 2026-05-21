import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getMallBoothDealDetails } from '@/lib/redshift'

const getCachedDeals = unstable_cache(
  getMallBoothDealDetails,
  ['mall-booth-deal-details'],
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

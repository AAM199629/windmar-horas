import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCambaceoEarningsDeals } from '@/lib/redshift'

function makeCachedFn(from: string, to: string) {
  return unstable_cache(
    () => getCambaceoEarningsDeals(from, to),
    [`cambaceo-earnings-${from}-${to}`],
    { revalidate: 300 },
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const month = searchParams.get('month')

    let dateFrom: string, dateTo: string

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'month param must be YYYY-MM' }, { status: 400 })
      }
      const [year, mm] = month.split('-')
      const lastDay    = new Date(Number(year), Number(mm), 0).getDate()
      dateFrom = `${year}-${mm}-01`
      dateTo   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    } else {
      const now    = new Date()
      const year   = now.getFullYear()
      const mm     = String(now.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      dateFrom = `${year}-${mm}-01`
      dateTo   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    }

    const deals = await makeCachedFn(dateFrom, dateTo)()
    return NextResponse.json(deals)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

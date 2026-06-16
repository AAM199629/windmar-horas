import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCambaceoDealDetails } from '@/lib/redshift'

function makeCachedFn(from: string, to: string) {
  return unstable_cache(
    () => getCambaceoDealDetails(from, to),
    [`cambaceo-deals-${from}-${to}`],
    { revalidate: 300 },
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from  = searchParams.get('from')
    const to    = searchParams.get('to')
    const month = searchParams.get('month')

    let dateFrom: string, dateTo: string

    if (from && to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 })
      }
      dateFrom = from
      dateTo   = to
    } else if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'month param must be YYYY-MM' }, { status: 400 })
      }
      const [year, mm] = month.split('-')
      const lastDay    = new Date(Number(year), Number(mm), 0).getDate()
      dateFrom = `${year}-${mm}-01`
      dateTo   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    } else {
      return NextResponse.json({ error: 'Provide from+to (YYYY-MM-DD) or month (YYYY-MM)' }, { status: 400 })
    }

    const deals = await makeCachedFn(dateFrom, dateTo)()
    return NextResponse.json(deals)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

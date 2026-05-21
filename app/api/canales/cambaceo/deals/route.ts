import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCambaceoDealDetails } from '@/lib/redshift'

function makeCachedFn(monthStart: string, monthEnd: string) {
  return unstable_cache(
    () => getCambaceoDealDetails(monthStart, monthEnd),
    [`cambaceo-deals-${monthStart}`],
    { revalidate: 300 },
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const month = searchParams.get('month') ?? ''
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
    }
    const [year, mm] = month.split('-')
    const lastDay    = new Date(Number(year), Number(mm), 0).getDate()
    const monthStart = `${year}-${mm}-01`
    const monthEnd   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

    const deals = await makeCachedFn(monthStart, monthEnd)()
    return NextResponse.json(deals)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getLastSalesDataUpdate } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

export async function GET() {
  const lastUpdated = await getLastSalesDataUpdate().catch(() => null)
  return NextResponse.json({ lastUpdated })
}

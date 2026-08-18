import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import {
  getSalesGroupedByPeriod,
  getIndependienteBoothSummary,
  getMallBoothSalesByPeriod,
  getMonthLeadsByCoordinator,
  getActiveSellersSummary,
} from '@/lib/redshift'

export async function GET(req: NextRequest) {
  const denied = await requireRole(['admin', 'supervisor', 'ventas'])
  if (denied) return denied
  const { searchParams } = req.nextUrl
  const fromA = searchParams.get('from_a')
  const toA   = searchParams.get('to_a')
  const fromB = searchParams.get('from_b')
  const toB   = searchParams.get('to_b')

  if (!fromA || !toA || !fromB || !toB) {
    return NextResponse.json({ error: 'Missing date params' }, { status: 400 })
  }

  const [salesA, salesB, cambaceoA, cambaceoB, indepA, indepB, boothA, boothB, sellers] = await Promise.all([
    getSalesGroupedByPeriod(fromA, toA),
    getSalesGroupedByPeriod(fromB, toB),
    getMonthLeadsByCoordinator(fromA, toA),
    getMonthLeadsByCoordinator(fromB, toB),
    getIndependienteBoothSummary(fromA, toA),
    getIndependienteBoothSummary(fromB, toB),
    getMallBoothSalesByPeriod(fromA, toA),
    getMallBoothSalesByPeriod(fromB, toB),
    getActiveSellersSummary(),
  ])

  return NextResponse.json({ salesA, salesB, cambaceoA, cambaceoB, indepA, indepB, boothA, boothB, sellers })
}

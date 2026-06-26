import { NextResponse } from 'next/server'
import { getRedshiftPool } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

// ── Mapeo financing_source (ID Zoho) → nombre legible ────────────────────────────
const NAME: Record<string, string> = {
  '4258103001059404766': 'Cash (Donación)', '4258103002765731257': 'Water - WH Financial (No usar)',
  '4258103002769234106': 'Water-Synchrony', '4258103002771037711': 'Oriental-Personal Loan',
  '4258103002671563476': 'Enfin', '4258103002652610957': 'Generac-DOE',
  '4258103002405268325': 'Fundación Windmar', '4258103000000357142': 'Oriental',
  '4258103002973129016': 'Home Depot', '4258103003187537947': 'Sunrun - Service Partner',
  '4258103001153757261': 'CDBG', '4258103002765731334': 'Roofing - WH Financial (No usar)',
  '4258103002914335684': 'PPS Placeholder', '4258103002765731292': 'PPS - Cash (No usar)',
  '4258103002765731299': 'Synchrony', '4258103002765731285': 'Pending Flip',
  '4258103002765731264': 'Cancellation Penalty', '4258103002586985126': 'WH Financial',
  '4258103002973129023': 'Thompson', '4258103002765731250': 'Water - Cash (No usar)',
  '4258103002765731313': 'Roofing - Cash (No usar)', '4258103002765731271': 'Commercial - Cash',
  '4258103000000357048': 'Sunnova', '4258103002936161741': 'Kiwi',
  '4258103002791936398': 'Coop COOPACA', '4258103002791936327': 'Coop La Puertorriqueña',
  '4258103002765731278': 'Legal Collection', '4258103002976847085': 'No Finance Selected',
  '4258103002765731327': 'Roofing - Sunnova (No usar)', '4258103002765731320': 'Roofing - Oriental (No usar)',
  '4258103002765731306': 'PPS - WH Financial (No usar)', '4258103002125648825': 'CDBG',
  '4258103001909137234': 'Sunnova-DOE', '4258103000000357106': 'Cash',
  '4258103002952627977': 'Lightreach', '4258103002791936334': 'Coop Oriental',
  '4258103003134953763': 'Third Party',
}
const CASH = new Set(['Cash', 'Cash (Donación)', 'Commercial - Cash', 'Water - Cash (No usar)', 'Roofing - Cash (No usar)', 'PPS - Cash (No usar)', 'Fundación Windmar'])
const DOE = new Set(['Generac-DOE', 'Sunnova-DOE', 'CDBG'])
const OTROS = new Set(['Sin asignar', 'No Finance Selected', 'Pending Flip', 'Legal Collection', 'Cancellation Penalty', 'PPS Placeholder', 'Third Party', 'Sunrun - Service Partner'])
function cat(n: string): string {
  if (CASH.has(n)) return 'Contado'
  if (DOE.has(n)) return 'DOE / Programa'
  if (!n || OTROS.has(n)) return 'Otros / Sin asignar'
  return 'Financiado'
}
const nm = (k: string | null) => (k && NAME[k]) || (k ? 'ID ' + String(k).slice(-6) : 'Sin asignar')

// Rango móvil: últimos 12 meses calendario hasta hoy.
function range() {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  return { from, to }
}

export async function GET() {
  try {
    const pool = getRedshiftPool()
    const { from, to } = range()

    const factsRes = await pool.query(`
      SELECT TO_CHAR(fd.closing_date,'YYYY-MM-DD') AS d, dp.pipeline AS pipe, dfl.financing_source AS k,
             REPLACE(dsr.on_hold_status,'On Hold - ','') AS hold,
             COUNT(*)::int AS deals, ROUND(COALESCE(SUM(fd.amount),0))::float8 AS amount
      FROM dwh.fact_deals fd
      JOIN dwh.dim_profiles dp        ON dp.id_profile        = fd.id_profile
      JOIN dwh.dim_finance_legal dfl  ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
      JOIN dwh.dim_status_reason dsr  ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
      WHERE fd.closing_date >= $1 AND fd.closing_date <= $2 AND dsr.cancellation_reason IS NULL
      GROUP BY 1,2,3,4
    `, [from, to])

    const promoRes = await pool.query(`
      SELECT TO_CHAR(fd.closing_date,'YYYY-MM-DD') AS d, dp.pipeline AS pipe,
             CASE WHEN dp.promo_items ILIKE '%firma y gana%'   THEN 1 ELSE 0 END AS firma,
             CASE WHEN dp.promo_items ILIKE '%instala y gana%' THEN 1 ELSE 0 END AS instala,
             COUNT(*)::int AS deals
      FROM dwh.fact_deals fd
      JOIN dwh.dim_profiles dp       ON dp.id_profile        = fd.id_profile
      JOIN dwh.dim_status_reason dsr ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
      WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
        AND dsr.cancellation_reason IS NULL AND dsr.on_hold_status IS NULL
        AND (dp.promo_items ILIKE '%firma y gana%' OR dp.promo_items ILIKE '%instala y gana%')
      GROUP BY 1,2,3,4
    `, [from, to])

    // ── Construir lookups (mismo formato que el dashboard embebido) ──
    const pipes: string[] = [], fins: string[] = [], finCat: string[] = [], reasons: string[] = []
    const pIdx = (n: string) => { let i = pipes.indexOf(n); if (i < 0) { i = pipes.length; pipes.push(n) } return i }
    const fIdx = (n: string) => { let i = fins.indexOf(n); if (i < 0) { i = fins.length; fins.push(n); finCat.push(cat(n)) } return i }
    const rIdx = (n: string | null) => { if (!n) return -1; let i = reasons.indexOf(n); if (i < 0) { i = reasons.length; reasons.push(n) } return i }

    const facts = factsRes.rows.map((r: any) => [r.d, pIdx(r.pipe), fIdx(nm(r.k)), rIdx(r.hold), Number(r.deals), Math.round(Number(r.amount))])
    const promoFacts = promoRes.rows.map((r: any) => [r.d, pIdx(r.pipe), Number(r.firma), Number(r.instala), Number(r.deals)])

    let minDate = '9999', maxDate = '0000'
    for (const f of facts) { if (f[0] < minDate) minDate = f[0] as string; if (f[0] > maxDate) maxDate = f[0] as string }

    return NextResponse.json({
      minDate, maxDate, pipes, fins, finCat, reasons, facts, promoFacts,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error cargando financiamientos' }, { status: 500 })
  }
}

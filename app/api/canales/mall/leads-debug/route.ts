import { NextResponse } from 'next/server'
import { getRedshiftPool } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pool = getRedshiftPool()
  const result: Record<string, any> = {}

  // What lead_source values exist in dim_lead_source that look like booths?
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT lead_source
      FROM dwh.dim_lead_source
      WHERE LOWER(lead_source) LIKE '%home depot%'
         OR LOWER(lead_source) LIKE '%mall%'
         OR LOWER(lead_source) LIKE '%booth%'
         OR LOWER(lead_source) LIKE '%plaza%'
         OR LOWER(lead_source) LIKE '%aguadilla%'
      ORDER BY lead_source
    `)
    result.booth_lead_sources = rows.map((r: any) => r.lead_source)
  } catch (e: any) { result.booth_lead_sources_error = e.message }

  // Count leads in fact_leads for 2026
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS total_leads_2026
      FROM dwh.fact_leads fl
      JOIN dwh.dim_audit_system_leads dasl ON dasl.id_audit_system = fl.id_audit_system
      WHERE dasl.created_time >= '2026-01-01'
        AND dasl.created_time <  '2027-01-01'
    `)
    result.total_leads_2026 = rows[0]?.total_leads_2026
  } catch (e: any) { result.total_leads_2026_error = e.message }

  // Top lead sources for 2026
  try {
    const { rows } = await pool.query(`
      SELECT dls.lead_source, COUNT(*) AS cnt
      FROM dwh.fact_leads fl
      JOIN dwh.dim_audit_system_leads dasl ON dasl.id_audit_system = fl.id_audit_system
      JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
      WHERE dasl.created_time >= '2026-01-01'
        AND dasl.created_time <  '2027-01-01'
      GROUP BY dls.lead_source
      ORDER BY cnt DESC
      LIMIT 20
    `)
    result.top_lead_sources_2026 = rows.map((r: any) => `${r.lead_source} (${r.cnt})`)
  } catch (e: any) { result.top_lead_sources_2026_error = e.message }

  return NextResponse.json(result)
}

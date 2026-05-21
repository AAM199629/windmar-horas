import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRedshiftPool } from '@/lib/redshift'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pool = getRedshiftPool()

    // Test the exact leads query used in /api/canales/cambaceo/leads
    let leadsQueryResult: any = null
    let leadsQueryError: string | null = null
    try {
      const r = await pool.query(`
        SELECT
          fl.zoho_lead_id                           AS lead_id,
          TO_CHAR(dasl.created_time, 'YYYY-MM-DD')  AS created_date,
          dasl.created_time                          AS created_at,
          de.coordinador_de_canvaseo                AS coordinador,
          dls.lead_source,
          COALESCE(de.staff, de.sales_rep_email)    AS canvaser_name,
          fd.zoho_deal_id                           AS deal_id,
          TO_CHAR(fd.closing_date, 'YYYY-MM-DD')    AS deal_closing_date,
          dp.pipeline                               AS deal_pipeline,
          COALESCE(stm.full_name, ds.sale_rep_email) AS deal_vendedor
        FROM dwh.fact_leads fl
        JOIN dwh.dim_employee de
          ON de.id_employee = fl.id_employee AND de.is_current = true
        JOIN dwh.dim_lead_source dls
          ON dls.id_lead_source = fl.id_lead_source
        JOIN dwh.dim_audit_system_leads dasl
          ON dasl.id_audit_system = fl.id_audit_system
        LEFT JOIN dwh.fact_deals fd
          ON fd.associated_lead = fl.zoho_lead_id
        LEFT JOIN dwh.dim_profiles dp
          ON dp.id_profile = fd.id_profile
        LEFT JOIN dwh.dim_staff ds
          ON ds.id_staff = fd.id_staff AND ds.is_current = true
        LEFT JOIN dw_zoho.dim_sales_team_member stm
          ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
        WHERE LOWER(dls.lead_source) LIKE '%canvass%'
          AND de.coordinador_de_canvaseo IS NOT NULL
          AND DATE(dasl.created_time) >= '2026-05-01'
          AND DATE(dasl.created_time) <= '2026-05-31'
        ORDER BY dasl.created_time DESC
        LIMIT 5
      `)
      leadsQueryResult = r.rows
    } catch (e: any) {
      leadsQueryError = e.message
    }

    // dim_employee columns to find the correct name field
    const empCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dwh' AND table_name = 'dim_employee'
      ORDER BY ordinal_position
    `)

    // Sample dim_employee row to see actual values
    const empSample = await pool.query(`
      SELECT * FROM dwh.dim_employee WHERE is_current = true LIMIT 2
    `)

    // dim_audit_system_leads columns to verify lead_name / first_name / last_name
    const auditCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dwh' AND table_name = 'dim_audit_system_leads'
      ORDER BY ordinal_position
    `)

    // Sample dim_audit_system_leads to see actual values
    const auditSample = await pool.query(`
      SELECT * FROM dwh.dim_audit_system_leads LIMIT 2
    `)

    // Sample lead_source values for mall/HD leads
    const mallLeadSources = await pool.query(`
      SELECT DISTINCT dls.lead_source, COUNT(*) AS cnt
      FROM dwh.fact_leads fl
      JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
      WHERE LOWER(dls.lead_source) LIKE '%home depot%'
         OR LOWER(dls.lead_source) LIKE '%mall%'
         OR LOWER(dls.lead_source) LIKE '%aguadilla%'
         OR LOWER(dls.lead_source) LIKE '%plaza%'
      GROUP BY dls.lead_source
      ORDER BY cnt DESC
      LIMIT 30
    `)

    return NextResponse.json({
      leads_query_error:          leadsQueryError,
      dim_employee_columns:       empCols.rows,
      dim_employee_sample:        empSample.rows,
      dim_audit_system_leads_cols: auditCols.rows,
      dim_audit_system_leads_sample: auditSample.rows,
      mall_lead_sources:          mallLeadSources.rows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

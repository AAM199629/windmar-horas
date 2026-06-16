import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getRedshiftPool } from '@/lib/redshift'

async function fetchLeadDetails(dateFrom: string, dateTo: string) {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      fl.zoho_lead_id                           AS lead_id,
      TO_CHAR(dasl.created_time, 'YYYY-MM-DD')  AS created_date,
      dasl.created_time                          AS created_at,
      de.coordinador_de_canvaseo                AS coordinador,
      dls.lead_source,
      COALESCE(de.staff, stm_emp.full_name, de.sales_rep_email) AS canvaser_name,
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
    LEFT JOIN dw_zoho.dim_sales_team_member stm_emp
      ON LOWER(stm_emp.email) = LOWER(de.sales_rep_email)
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
      AND DATE(dasl.created_time) >= $1
      AND DATE(dasl.created_time) <= $2
    ORDER BY dasl.created_time DESC
  `, [dateFrom, dateTo])

  return rows.map((r: any) => ({
    leadId:          r.lead_id as string,
    createdDate:     r.created_date as string,
    createdAt:       r.created_at as string,
    coordinador:     r.coordinador as string,
    leadSource:      r.lead_source as string,
    canvaserName:    r.canvaser_name as string | null,
    dealId:          r.deal_id as string | null,
    dealClosingDate: r.deal_closing_date as string | null,
    dealPipeline:    r.deal_pipeline as string | null,
    dealVendedor:    r.deal_vendedor as string | null,
  }))
}

function makeCachedFn(dateFrom: string, dateTo: string) {
  return unstable_cache(
    () => fetchLeadDetails(dateFrom, dateTo),
    [`cambaceo-leads-${dateFrom}-${dateTo}`],
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

    const leads = await makeCachedFn(dateFrom, dateTo)()
    return NextResponse.json(leads)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

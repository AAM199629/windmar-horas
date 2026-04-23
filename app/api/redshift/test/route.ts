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

    const [pipelines, financing, sampleDeal, timeline] = await Promise.all([
      // Distinct pipeline values
      pool.query(`SELECT DISTINCT pipeline, COUNT(*) as cnt FROM dwh.dim_profiles WHERE pipeline IS NOT NULL GROUP BY pipeline ORDER BY cnt DESC LIMIT 20`),

      // Distinct financing_source values (mapped via dim_finance_legal)
      pool.query(`SELECT DISTINCT financing_source, COUNT(*) as cnt FROM dwh.dim_finance_legal WHERE financing_source IS NOT NULL GROUP BY financing_source ORDER BY cnt DESC LIMIT 20`),

      // A real deal with sale_rep_email filled, joined across tables
      pool.query(`
        SELECT
          fd.zoho_deal_id,
          fd.closing_date,
          fd.amount,
          ds.sale_rep_email,
          ds.sales_rep,
          ds.trainee_sales,
          dp.pipeline,
          dsr.on_hold_status,
          dsr.cancellation_reason,
          dfl.cdbg_number,
          dfl.financing_source
        FROM dwh.fact_deals fd
        JOIN dwh.dim_staff ds ON ds.id_staff = fd.id_staff AND ds.is_current = true
        JOIN dwh.dim_profiles dp ON dp.id_profile = fd.id_profile
        JOIN dwh.dim_status_reason dsr ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
        JOIN dwh.dim_finance_legal dfl ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
        WHERE ds.sale_rep_email IS NOT NULL
          AND fd.closing_date >= '2026-01-01'
        LIMIT 5
      `),

      // Check dim_timeline for installation completion date
      pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'dwh' AND table_name = 'dim_timeline' ORDER BY ordinal_position`),
    ])

    return NextResponse.json({
      pipelines: pipelines.rows,
      financing_sources: financing.rows,
      sample_deal: sampleDeal.rows,
      dim_timeline_columns: timeline.rows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

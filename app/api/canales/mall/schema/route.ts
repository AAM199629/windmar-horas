import { NextResponse } from 'next/server'
import { getRedshiftPool } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pool = getRedshiftPool()
  const result: Record<string, any> = {}

  // Columns in dwh.fact_deals
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dwh' AND table_name = 'fact_deals'
      ORDER BY ordinal_position
    `)
    result.fact_deals_columns = rows.map((r: any) => `${r.column_name} (${r.data_type})`)
  } catch (e: any) {
    result.fact_deals_error = e.message
  }

  // Columns in dwh.dim_timeline
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dwh' AND table_name = 'dim_timeline'
      ORDER BY ordinal_position
    `)
    result.dim_timeline_columns = rows.map((r: any) => `${r.column_name} (${r.data_type})`)
  } catch (e: any) {
    result.dim_timeline_error = e.message
  }

  // All tables in dw_zoho schema
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'dw_zoho'
      ORDER BY table_name
    `)
    result.dw_zoho_tables = rows.map((r: any) => r.table_name)
  } catch (e: any) {
    result.dw_zoho_tables_error = e.message
  }

  // If dw_zoho.dim_deals exists, get its columns
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dw_zoho' AND table_name = 'dim_deals'
      ORDER BY ordinal_position
    `)
    if (rows.length > 0) {
      result.dw_zoho_dim_deals_columns = rows.map((r: any) => `${r.column_name} (${r.data_type})`)
    }
  } catch (e: any) {
    result.dw_zoho_dim_deals_error = e.message
  }

  // All tables in dwh schema that mention 'deal' or 'audit'
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'dwh'
        AND (LOWER(table_name) LIKE '%deal%' OR LOWER(table_name) LIKE '%audit%')
      ORDER BY table_name
    `)
    result.dwh_deal_tables = rows.map((r: any) => r.table_name)
  } catch (e: any) {
    result.dwh_deal_tables_error = e.message
  }

  // Distinct lead_source values in dim_lead_source that look like Mall/Home Depot
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT lead_source
      FROM dwh.dim_lead_source
      WHERE LOWER(lead_source) LIKE '%home depot%'
         OR LOWER(lead_source) LIKE '%mall%'
         OR LOWER(lead_source) LIKE '%depot%'
         OR LOWER(lead_source) LIKE '%booth%'
      ORDER BY lead_source
    `)
    result.mall_lead_sources = rows.map((r: any) => r.lead_source)
  } catch (e: any) {
    result.mall_lead_sources_error = e.message
  }

  // Also: total count in dim_lead_source and first 20 rows
  try {
    const { rows } = await pool.query(`
      SELECT lead_source, COUNT(*) as cnt
      FROM dwh.dim_lead_source
      GROUP BY lead_source
      ORDER BY cnt DESC
      LIMIT 30
    `)
    result.lead_source_top30 = rows.map((r: any) => `${r.lead_source} (${r.cnt})`)
  } catch (e: any) {
    result.lead_source_top30_error = e.message
  }

  // Also: check dim_lead_source columns
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'dwh' AND table_name = 'dim_lead_source'
      ORDER BY ordinal_position
    `)
    result.dim_lead_source_columns = rows.map((r: any) => `${r.column_name} (${r.data_type})`)
  } catch (e: any) {
    result.dim_lead_source_error = e.message
  }

  return NextResponse.json(result)
}

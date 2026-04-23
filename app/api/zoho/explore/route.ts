import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRedshiftPool } from '@/lib/redshift'

// GET /api/zoho/explore
// Lists all columns in dw_zoho.dim_sales_team_member to find memo date fields
export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pool = getRedshiftPool()

    const [columns, sample] = await Promise.all([
      pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'dw_zoho'
          AND table_name   = 'dim_sales_team_member'
        ORDER BY ordinal_position
      `),
      pool.query(`
        SELECT *
        FROM dw_zoho.dim_sales_team_member
        WHERE status = 'Activo'
          AND empleado_consultor_start_date IS NOT NULL
        LIMIT 2
      `),
    ])

    return NextResponse.json({
      columns:        columns.rows,
      sample_records: sample.rows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRedshiftPool } from '@/lib/redshift'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const TARGET_TABLES = [
    { schema: 'dwh', table: 'dim_staff' },
    { schema: 'dwh', table: 'dim_profiles' },
    { schema: 'dwh', table: 'dim_status_reason' },
    { schema: 'dwh', table: 'dim_finance_legal' },
    { schema: 'dwh', table: 'dim_operations_details' },
    { schema: 'dwh', table: 'dim_product_sale' },
  ]

  try {
    const pool = getRedshiftPool()
    const result: Record<string, any> = {}

    for (const { schema, table } of TARGET_TABLES) {
      const { rows: cols } = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table])

      const { rows: sample } = await pool.query(
        `SELECT * FROM "${schema}"."${table}" LIMIT 2`
      )

      result[`${schema}.${table}`] = { columns: cols, sample }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

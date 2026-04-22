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
    const { rows } = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `)
    return NextResponse.json({ tables: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

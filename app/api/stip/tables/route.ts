import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

function getPool(): mysql.Pool {
  return mysql.createPool({
    host:     process.env.STIP_HOST!,
    port:     Number(process.env.STIP_PORT ?? 3306),
    database: process.env.STIP_DB!,
    user:     process.env.STIP_USER!,
    password: process.env.STIP_PASSWORD!,
    waitForConnections: true,
    connectionLimit: 3,
    timezone: '+00:00',
  })
}

export async function GET() {
  try {
    const db = getPool()

    // All tables with row counts
    const [tables] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         t.TABLE_NAME,
         t.TABLE_ROWS,
         t.CREATE_TIME,
         t.UPDATE_TIME
       FROM information_schema.TABLES t
       WHERE t.TABLE_SCHEMA = DATABASE()
       ORDER BY t.TABLE_ROWS DESC`,
    )

    // All columns grouped by table
    const [columns] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         TABLE_NAME,
         COLUMN_NAME,
         DATA_TYPE,
         IS_NULLABLE,
         ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    )

    // Group columns by table
    const colsByTable: Record<string, { name: string; type: string; nullable: string }[]> = {}
    for (const col of columns as any[]) {
      if (!colsByTable[col.TABLE_NAME]) colsByTable[col.TABLE_NAME] = []
      colsByTable[col.TABLE_NAME].push({
        name:     col.COLUMN_NAME,
        type:     col.DATA_TYPE,
        nullable: col.IS_NULLABLE,
      })
    }

    const result = (tables as any[]).map(t => ({
      table:    t.TABLE_NAME,
      rows:     t.TABLE_ROWS,
      created:  t.CREATE_TIME,
      updated:  t.UPDATE_TIME,
      columns:  colsByTable[t.TABLE_NAME] ?? [],
    }))

    await db.end()

    return NextResponse.json({ tableCount: result.length, tables: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

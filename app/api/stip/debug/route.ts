import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from  = searchParams.get('from')  // YYYY-MM-DD
    const to    = searchParams.get('to')    // YYYY-MM-DD
    const email = searchParams.get('email') // optional: filter to one person

    if (!from || !to) {
      return NextResponse.json({ error: 'from y to requeridos (YYYY-MM-DD)' }, { status: 400 })
    }

    const db = getPool()

    // 1. What columns does shift_instances actually have?
    const [colRows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shift_instances'
       ORDER BY ORDINAL_POSITION`,
    )

    // 2. What distinct user_status values exist in this range?
    const [statusRows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT DISTINCT user_status, COUNT(*) AS cnt
       FROM shift_instances
       WHERE shift_date BETWEEN ? AND ?
       GROUP BY user_status ORDER BY cnt DESC`,
      [from, to],
    )

    // 3. What distinct shift_type values exist in this range?
    const [typeRows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT DISTINCT shift_type, COUNT(*) AS cnt
       FROM shift_instances
       WHERE shift_date BETWEEN ? AND ?
       GROUP BY shift_type ORDER BY cnt DESC`,
      [from, to],
    )

    // 4a. When filtering by email: include ALL rows (even user_id=0) to detect
    //     shifts that are assigned by email but missing a user_id
    // 4b. Without email filter: only non-zero user_id to avoid empty slots
    const [rawRows] = email
      ? await db.execute<mysql.RowDataPacket[]>(
          `SELECT * FROM shift_instances
           WHERE shift_date BETWEEN ? AND ?
             AND LOWER(user_email) = LOWER(?)
           ORDER BY shift_date, shift_name
           LIMIT 500`,
          [from, to, email],
        )
      : await db.execute<mysql.RowDataPacket[]>(
          `SELECT * FROM shift_instances
           WHERE shift_date BETWEEN ? AND ?
             AND user_id != 0
           ORDER BY shift_date, user_name
           LIMIT 500`,
          [from, to],
        )

    await db.end()

    return NextResponse.json({
      columns:     colRows,
      statusValues: statusRows,
      shiftTypes:  typeRows,
      rowCount:    rawRows.length,
      rows:        rawRows,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

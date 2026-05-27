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

// Queries both `shifts` and `shift_instances` for a given email + date range
// so we can compare what each table has for an employee.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const from  = searchParams.get('from')   // YYYY-MM-DD
    const to    = searchParams.get('to')     // YYYY-MM-DD
    const email = searchParams.get('email')

    if (!from || !to || !email) {
      return NextResponse.json(
        { error: 'from, to y email requeridos' },
        { status: 400 },
      )
    }

    const db = getPool()

    // From `shifts` (old table) joined with users
    const [shiftsRows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         s.id,
         s.shift_id,
         s.shift_account_name,
         s.job_type,
         s.region,
         s.shift_start_time,
         s.shift_end_time,
         s.clock_in_time,
         s.clock_out_time,
         s.auto_clock_out,
         s.cancelled,
         s.notes,
         u.name   AS user_name,
         u.email  AS user_email
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       WHERE LOWER(u.email) = LOWER(?)
         AND DATE(s.shift_start_time) BETWEEN ? AND ?
       ORDER BY s.shift_start_time`,
      [email, from, to],
    )

    // From `shift_instances_view` (has parsed datetime columns)
    const [instancesRows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         id,
         shift_id,
         shift_name,
         shift_date,
         shift_type,
         shift_location,
         user_status,
         shift_datetime,
         user_clock_in_datetime,
         user_clock_out_datetime
       FROM shift_instances_view
       WHERE LOWER(user_email) = LOWER(?)
         AND shift_date BETWEEN ? AND ?
       ORDER BY shift_date`,
      [email, from, to],
    )

    await db.end()

    return NextResponse.json({
      email,
      from,
      to,
      shifts_table:     { count: (shiftsRows as any[]).length,    rows: shiftsRows },
      shift_instances:  { count: (instancesRows as any[]).length, rows: instancesRows },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

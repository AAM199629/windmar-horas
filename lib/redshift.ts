import { Pool } from 'pg'

let pool: Pool | null = null

export function getRedshiftPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host:     process.env.REDSHIFT_HOST,
      port:     Number(process.env.REDSHIFT_PORT ?? 5439),
      database: process.env.REDSHIFT_DB,
      user:     process.env.REDSHIFT_USER,
      password: process.env.REDSHIFT_PASSWORD,
      ssl:      { rejectUnauthorized: false },
    })
  }
  return pool
}

export interface AsalariadoRedshiftData {
  email: string
  hireDate: string | null
  terminationDate: string | null
}

const SALARIED_ROLES = ['Empleado - Consultor', 'Empleado - Lider', 'Empleado - Gerente']

export async function getAsalariadoData(): Promise<Map<string, AsalariadoRedshiftData>> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(email) AS email,
      TO_CHAR(empleado_consultor_start_date, 'YYYY-MM-DD') AS hire_date,
      TO_CHAR(fecha_terminacion_asalariado,  'YYYY-MM-DD') AS termination_date
    FROM dw_zoho.dim_sales_team_member
    WHERE sales_role = ANY($1)
      AND email IS NOT NULL
  `, [SALARIED_ROLES])

  const map = new Map<string, AsalariadoRedshiftData>()
  for (const row of rows) {
    map.set(row.email, {
      email:           row.email,
      hireDate:        row.hire_date        ?? null,
      terminationDate: row.termination_date ?? null,
    })
  }
  return map
}

export interface ActiveAsalariado {
  email: string
  fullName: string
  salesRole: string
  ciudad: string | null
}

export async function getActiveAsalariados(): Promise<ActiveAsalariado[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(email)  AS email,
      full_name,
      sales_role,
      ciudad
    FROM dw_zoho.dim_sales_team_member
    WHERE sales_role = ANY($1)
      AND status = 'Activo'
      AND empleado_consultor_start_date IS NOT NULL
      AND (
        consultor_asalariado_end_date IS NULL
        OR empleado_consultor_start_date > consultor_asalariado_end_date
      )
      AND email IS NOT NULL
    ORDER BY full_name
  `, [SALARIED_ROLES])

  return rows.map(r => ({
    email:     r.email,
    fullName:  r.full_name,
    salesRole: r.sales_role,
    ciudad:    r.ciudad ?? null,
  }))
}

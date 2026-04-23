import { Pool } from 'pg'
import type { VentaRow } from './ventas'

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

export async function getVentasFromRedshift(): Promise<VentaRow[]> {
  const pool = getRedshiftPool()

  const lookbackDate = new Date()
  lookbackDate.setMonth(lookbackDate.getMonth() - 12)
  const lookback = lookbackDate.toISOString().slice(0, 10)

  const { rows } = await pool.query(`
    SELECT DISTINCT
      COALESCE(stm.full_name, ds.sale_rep_email)              AS sales_team_name,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                  AS closing_date,
      CASE WHEN dfl.cdbg_number IS NOT NULL THEN 'CDBG' ELSE '' END AS finance_company,
      COALESCE(TO_CHAR(dt.installation_completion_date, 'YYYY-MM-DD'), '') AS installation_completion_date,
      dp.pipeline
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email) AND stm.is_current = true
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    JOIN dwh.dim_finance_legal dfl
      ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
    LEFT JOIN dwh.dim_timeline dt
      ON dt.zoho_deal_id = fd.zoho_deal_id AND dt.is_current = true
    WHERE ds.sale_rep_email IS NOT NULL
      AND dsr.cancellation_reason IS NULL
      AND dsr.on_hold_status IS NULL
      AND fd.closing_date >= $1
  `, [lookback])

  return rows.map(r => ({
    salesTeamName:              r.sales_team_name ?? '',
    salesRole:                  '',
    closingDate:                r.closing_date ?? '',
    cancellationDate:           '',
    onHoldStatus:               '',
    financeCompany:             r.finance_company ?? '',
    installationCompletionDate: r.installation_completion_date ?? '',
    pipeline:                   r.pipeline ?? '',
    productSold:                r.pipeline ?? '',
    salesRepAssistTrainee:      '',
    recruitedBy:                '',
    traineeSales:               '',
  }))
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

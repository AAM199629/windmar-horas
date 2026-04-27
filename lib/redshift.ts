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
  hireDate: string | null
  memo1Date: string | null
  memo2Date: string | null
  memoLevel: number | null
  terminacionDate: string | null
}

export async function getVentasFromRedshift(): Promise<VentaRow[]> {
  const pool = getRedshiftPool()

  const lookbackDate = new Date()
  lookbackDate.setMonth(lookbackDate.getMonth() - 12)
  const lookback = lookbackDate.toISOString().slice(0, 10)

  const { rows } = await pool.query(`
    SELECT DISTINCT
      -- Own deal: trainee_sales is null → consultant is the deal owner
      -- Assisted deal: trainee_sales is set → sale_rep_email is the assist consultant
      CASE
        WHEN ds.trainee_sales IS NULL THEN COALESCE(stm.full_name, ds.sale_rep_email)
        ELSE ''
      END AS sales_team_name,
      CASE
        WHEN ds.trainee_sales IS NOT NULL THEN COALESCE(stm.full_name, ds.sale_rep_email)
        ELSE ''
      END AS sales_rep_assist_trainee,
      ds.trainee_sales,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                  AS closing_date,
      CASE WHEN dfl.cdbg_number IS NOT NULL THEN 'CDBG' ELSE '' END AS finance_company,
      COALESCE(TO_CHAR(dt.installation_completion_date, 'YYYY-MM-DD'), '') AS installation_completion_date,
      dp.pipeline
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
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
    salesRepAssistTrainee:      r.sales_rep_assist_trainee ?? '',
    recruitedBy:                '',
    traineeSales:               r.trainee_sales ?? '',
  }))
}

export async function getActiveAsalariados(): Promise<ActiveAsalariado[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(email)  AS email,
      full_name,
      sales_role,
      ciudad,
      TO_CHAR(empleado_consultor_start_date, 'YYYY-MM-DD') AS hire_date,
      TO_CHAR(fecha_de_memo_1, 'YYYY-MM-DD')              AS memo_1_date,
      TO_CHAR(fecha_de_memo_2, 'YYYY-MM-DD')              AS memo_2_date,
      memo,
      TO_CHAR(fecha_terminacion_asalariado, 'YYYY-MM-DD') AS terminacion_date
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

  return rows.map(r => {
    const lvl = r.memo ? parseInt(r.memo, 10) : NaN
    return {
      email:          r.email,
      fullName:       r.full_name,
      salesRole:      r.sales_role,
      ciudad:         r.ciudad ?? null,
      hireDate:       r.hire_date ?? null,
      memo1Date:      r.memo_1_date ?? null,
      memo2Date:      r.memo_2_date ?? null,
      memoLevel:      isNaN(lvl) ? null : lvl,
      terminacionDate: r.terminacion_date ?? null,
    }
  })
}

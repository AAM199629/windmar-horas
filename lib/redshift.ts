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
      -- The deal's rep (trainee or own) always goes in sales_team_name
      COALESCE(stm.full_name, ds.sale_rep_email) AS sales_team_name,
      -- For trainee deals (1st–4th Sale): mentor = the rep's sponsor in dim_sales_team_member
      CASE
        WHEN ds.trainee_sales IN ('1st Sale','2nd Sale','3rd Sale','4th Sale')
        THEN COALESCE(stm_mentor.full_name, stm.sponsor_name)
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
    LEFT JOIN dw_zoho.dim_sales_team_member stm_mentor
      ON stm.sponsor_id = stm_mentor.member_id
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

export interface FollowUpRedshiftEntry {
  email: string
  fullName: string
  leads: number | null
  citas: number | null
  citasRealizadas: number | null
}

export interface ActivePromotor {
  email: string
  fullName: string
  salesRole: string
  ciudad: string | null
  hireDate: string | null
}

export async function getActivePromotores(): Promise<ActivePromotor[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(email)  AS email,
      full_name,
      sales_role,
      ciudad,
      TO_CHAR(empleado_consultor_start_date, 'YYYY-MM-DD') AS hire_date
    FROM dw_zoho.dim_sales_team_member
    WHERE sales_role ILIKE '%Promotor%'
      AND status = 'Activo'
      AND email IS NOT NULL
    ORDER BY full_name
  `)

  return rows.map(r => ({
    email:     r.email,
    fullName:  r.full_name,
    salesRole: r.sales_role,
    ciudad:    r.ciudad ?? null,
    hireDate:  r.hire_date ?? null,
  }))
}

export async function getLastSalesDataUpdate(): Promise<string | null> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT MAX(modified_time) AS last_updated
    FROM dw_zoho.fact_sales_performance
  `)
  return rows[0]?.last_updated ? new Date(rows[0].last_updated).toISOString() : null
}

export interface MonthDealRow {
  email: string
  fullName: string
  ventasCanvassing: number
  totalVentas: number
}

export async function getMonthDeals(
  monthStart: string,
  monthEnd: string
): Promise<MonthDealRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(ds.sale_rep_email) AS email,
      COALESCE(stm.full_name, ds.sale_rep_email) AS full_name,
      SUM(CASE WHEN LOWER(dms.lead_source) LIKE '%canvass%' THEN 1 ELSE 0 END)
        AS ventas_canvassing,
      COUNT(*) AS total_ventas
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.stage <> 'Cancelled'
      AND ds.sale_rep_email IS NOT NULL AND ds.sale_rep_email <> ''
    GROUP BY LOWER(ds.sale_rep_email), COALESCE(stm.full_name, ds.sale_rep_email)
  `, [monthStart, monthEnd])

  return rows.map((r: any) => ({
    email:            r.email as string,
    fullName:         r.full_name as string,
    ventasCanvassing: Number(r.ventas_canvassing),
    totalVentas:      Number(r.total_ventas),
  }))
}

export interface CoordinadorRow {
  coordinador: string
  leads: number
}

export async function getMonthLeadsByCoordinator(
  monthStart: string,
  monthEnd: string
): Promise<CoordinadorRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      de.coordinador_de_canvaseo AS coordinador,
      COUNT(*) AS leads
    FROM dwh.fact_leads fl
    JOIN dwh.dim_employee de
      ON de.id_employee = fl.id_employee AND de.is_current = true
    JOIN dwh.dim_lead_source dls
      ON dls.id_lead_source = fl.id_lead_source
    JOIN dwh.dim_audit_system_leads dasl
      ON dasl.id_audit_system = fl.id_audit_system
    WHERE LOWER(dls.lead_source) LIKE '%canvass%'
      AND de.coordinador_de_canvaseo IS NOT NULL
      AND DATE(dasl.created_time) >= $1
      AND DATE(dasl.created_time) <= $2
    GROUP BY de.coordinador_de_canvaseo
    ORDER BY leads DESC
  `, [monthStart, monthEnd])

  return rows.map((r: any) => ({
    coordinador: r.coordinador as string,
    leads:       Number(r.leads),
  }))
}

export async function getFollowUpFromRedshift(): Promise<Map<string, FollowUpRedshiftEntry>> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(stm.email) AS email,
      stm.full_name,
      sp.num_leads_creados  AS leads,
      sp.num_citas          AS citas,
      sp.num_citas_ejecutadas AS citas_realizadas
    FROM dw_zoho.fact_sales_performance sp
    JOIN dw_zoho.dim_sales_team_member stm ON stm.member_id = sp.member_id
    WHERE EXTRACT(YEAR  FROM sp.modified_time) = EXTRACT(YEAR  FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM sp.modified_time) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND sp.num_leads_creados IS NOT NULL
      AND stm.email IS NOT NULL
  `)

  const map = new Map<string, FollowUpRedshiftEntry>()
  for (const row of rows) {
    const entry: FollowUpRedshiftEntry = {
      email:           row.email,
      fullName:        row.full_name,
      leads:           row.leads           != null ? Number(row.leads)            : null,
      citas:           row.citas           != null ? Number(row.citas)            : null,
      citasRealizadas: row.citas_realizadas != null ? Number(row.citas_realizadas) : null,
    }
    map.set(row.email, entry)
    map.set(row.full_name.toLowerCase(), entry)
  }
  return map
}

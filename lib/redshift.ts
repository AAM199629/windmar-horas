import { Pool } from 'pg'
import type { VentaRow } from './ventas'
import { MALL_BOOTH_LOCATIONS } from './constants'

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
      -- Always populate the sponsor so the recruiter credit path works even when trainee_sales is empty
      COALESCE(stm_mentor.full_name, stm.sponsor_name, '') AS recruited_by,
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
    recruitedBy:                r.recruited_by ?? '',
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
  ventas: number
}

export async function getMonthLeadsByCoordinator(
  monthStart: string,
  monthEnd: string
): Promise<CoordinadorRow[]> {
  const pool = getRedshiftPool()

  // Try to count how many leads were converted to deals via fact_deals.associated_lead
  const { rows } = await pool.query(`
    SELECT
      de.coordinador_de_canvaseo AS coordinador,
      COUNT(DISTINCT fl.id_fact_lead) AS leads,
      COUNT(DISTINCT fd.zoho_deal_id) AS ventas
    FROM dwh.fact_leads fl
    JOIN dwh.dim_employee de
      ON de.id_employee = fl.id_employee AND de.is_current = true
    JOIN dwh.dim_lead_source dls
      ON dls.id_lead_source = fl.id_lead_source
    JOIN dwh.dim_audit_system_leads dasl
      ON dasl.id_audit_system = fl.id_audit_system
    LEFT JOIN dwh.fact_deals fd
      ON fd.associated_lead = fl.zoho_lead_id
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
    ventas:      Number(r.ventas ?? 0),
  }))
}

export interface CambaceoDealDetail {
  email: string
  vendedor: string
  closingDate: string
  pipeline: string
  amount: number | null
  onHoldStatus: string | null
  cancellationReason: string | null
  isCdbg: boolean
  isCanvassing: boolean
  zohoId: string
}

export async function getCambaceoDealDetails(
  monthStart: string,
  monthEnd: string,
): Promise<CambaceoDealDetail[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(ds.sale_rep_email)                               AS email,
      COALESCE(stm.full_name, ds.sale_rep_email)            AS vendedor,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                AS closing_date,
      dp.pipeline,
      fd.amount,
      dsr.on_hold_status,
      dsr.cancellation_reason,
      (dfl.cdbg_number IS NOT NULL)                         AS is_cdbg,
      (LOWER(dms.lead_source) LIKE '%canvass%')             AS is_canvassing,
      fd.zoho_deal_id
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.dim_finance_legal dfl
      ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.stage <> 'Cancelled'
      AND ds.sale_rep_email IS NOT NULL
    ORDER BY fd.closing_date DESC
  `, [monthStart, monthEnd])

  return rows.map((r: any) => ({
    email:              r.email as string,
    vendedor:           r.vendedor as string,
    closingDate:        r.closing_date as string,
    pipeline:           r.pipeline as string,
    amount:             r.amount != null ? Number(r.amount) : null,
    onHoldStatus:       r.on_hold_status ?? null,
    cancellationReason: r.cancellation_reason ?? null,
    isCdbg:             Boolean(r.is_cdbg),
    isCanvassing:       Boolean(r.is_canvassing),
    zohoId:             r.zoho_deal_id as string,
  }))
}

export interface MallBoothDealDetail {
  location: string
  closingDate: string          // YYYY-MM-DD
  month: number                // 1–12
  pipeline: string
  isCancelled: boolean
  vendedor: string
  amount: number | null
  onHoldStatus: string | null
  cancellationReason: string | null
  isCdbg: boolean
  zohoId: string
  dealName: string | null
}

export { MALL_BOOTH_LOCATIONS } from './constants'

export async function getMallBoothDealDetails(year: number): Promise<MallBoothDealDetail[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      dod.booth                                               AS location,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                 AS closing_date,
      EXTRACT(MONTH FROM fd.closing_date)::int               AS month,
      dp.pipeline,
      (dsr.on_hold_status IS NOT NULL)                       AS is_cancelled,
      COALESCE(stm.full_name, ds.sale_rep_email)             AS vendedor,
      fd.amount,
      dsr.on_hold_status,
      dsr.cancellation_reason,
      (dfl.cdbg_number IS NOT NULL)                          AS is_cdbg,
      fd.zoho_deal_id,
      dp.case_number                                          AS deal_name
    FROM dwh.fact_deals fd
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.dim_operations_details dod
      ON dod.id_operations_details = fd.id_operations_details
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_finance_legal dfl
      ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
    WHERE dod.booth = ANY($1)
      AND EXTRACT(YEAR FROM fd.closing_date) = $2
    ORDER BY fd.closing_date DESC
  `, [MALL_BOOTH_LOCATIONS, year])

  return rows.map((r: any) => ({
    location:           r.location as string,
    closingDate:        r.closing_date as string,
    month:              Number(r.month),
    pipeline:           r.pipeline as string,
    isCancelled:        Boolean(r.is_cancelled),
    vendedor:           r.vendedor as string,
    amount:             r.amount != null ? Number(r.amount) : null,
    onHoldStatus:       r.on_hold_status ?? null,
    cancellationReason: r.cancellation_reason ?? null,
    isCdbg:             Boolean(r.is_cdbg),
    zohoId:             r.zoho_deal_id as string,
    dealName:           (r.deal_name as string | null) ?? null,
  }))
}

export interface MallBoothLeadDetail {
  leadId:        string
  leadName:      string | null
  location:      string
  createdDate:   string
  month:         number
  registradoPor: string
  ciudad:        string | null
  isSold:        boolean
  dealPipeline:  string | null
}

const BOOTH_LEAD_SOURCES = ['booths malls', 'booth pequeño / evento', 'trailer booth', 'booths']

export async function getMallBoothLeadDetails(year: number): Promise<MallBoothLeadDetail[]> {
  const pool = getRedshiftPool()
  const yearStart = `${year}-01-01`
  const yearEnd   = `${year + 1}-01-01`
  // Lead source in Zoho for booth leads is a generic category ("Booths Malls"), not the
  // specific booth name. We infer the specific booth from the employee's most recent deal
  // at one of our 14 MALL_BOOTH_LOCATIONS.
  const { rows } = await pool.query(`
    WITH emp_booth AS (
      -- Each employee's current booth based on their most recent deal
      SELECT email, booth FROM (
        SELECT
          LOWER(ds.sale_rep_email) AS email,
          dod.booth,
          ROW_NUMBER() OVER (PARTITION BY LOWER(ds.sale_rep_email) ORDER BY fd.closing_date DESC NULLS LAST) AS rn
        FROM dwh.fact_deals fd
        JOIN dwh.dim_staff ds
          ON ds.id_staff = fd.id_staff AND ds.is_current = true
        JOIN dwh.dim_operations_details dod
          ON dod.id_operations_details = fd.id_operations_details
        WHERE dod.booth = ANY($1)
      ) t WHERE t.rn = 1
    ),
    de_current AS (
      SELECT id_employee, sales_rep_email FROM (
        SELECT id_employee, sales_rep_email,
               ROW_NUMBER() OVER (PARTITION BY id_employee ORDER BY is_current DESC) AS rn
        FROM dwh.dim_employee
      ) t WHERE t.rn = 1
    ),
    booth_leads AS (
      SELECT
        fl.zoho_lead_id,
        fl.id_employee,
        dasl.created_time
      FROM dwh.fact_leads fl
      JOIN dwh.dim_audit_system_leads dasl
        ON dasl.id_audit_system = fl.id_audit_system
      JOIN dwh.dim_lead_source dls
        ON dls.id_lead_source = fl.id_lead_source
      WHERE dasl.created_time >= $2
        AND dasl.created_time <  $3
        AND LOWER(TRIM(dls.lead_source)) = ANY($4)
    )
    SELECT
      b.zoho_lead_id                                         AS lead_id,
      COALESCE(dl.full_name, TRIM(COALESCE(dl.first_name, '') || ' ' || COALESCE(dl.last_name, ''))) AS lead_name,
      eb.booth                                               AS location,
      TO_CHAR(b.created_time, 'YYYY-MM-DD')                 AS created_date,
      EXTRACT(MONTH FROM b.created_time)::int                AS month,
      COALESCE(stm_emp.full_name, de.sales_rep_email)        AS registrado_por,
      stm_emp.ciudad                                         AS ciudad,
      (fd.zoho_deal_id IS NOT NULL
        AND dsr.on_hold_status IS NULL)                      AS is_sold,
      dp.pipeline                                            AS deal_pipeline
    FROM booth_leads b
    JOIN de_current de
      ON de.id_employee = b.id_employee
    JOIN emp_booth eb
      ON eb.email = LOWER(de.sales_rep_email)
    LEFT JOIN dwh.dim_lead dl
      ON  dl.zoho_lead_id = b.zoho_lead_id AND dl.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm_emp
      ON  LOWER(stm_emp.email) = LOWER(de.sales_rep_email)
    LEFT JOIN (
      SELECT associated_lead, zoho_deal_id, id_status_reason, id_profile
      FROM (
        SELECT associated_lead, zoho_deal_id, id_status_reason, id_profile,
               ROW_NUMBER() OVER (PARTITION BY associated_lead ORDER BY closing_date DESC NULLS LAST) AS rn
        FROM dwh.fact_deals
      ) t WHERE t.rn = 1
    ) fd ON fd.associated_lead = b.zoho_lead_id
    LEFT JOIN dwh.dim_status_reason dsr
      ON  dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_profiles dp
      ON  dp.id_profile = fd.id_profile
    ORDER BY b.created_time DESC
  `, [MALL_BOOTH_LOCATIONS, yearStart, yearEnd, BOOTH_LEAD_SOURCES])

  return rows.map((r: any) => ({
    leadId:        r.lead_id as string,
    leadName:      (r.lead_name as string)?.trim() || null,
    location:      r.location as string,
    createdDate:   r.created_date as string,
    month:         Number(r.month),
    registradoPor: r.registrado_por as string,
    ciudad:        (r.ciudad as string | null) ?? null,
    isSold:        Boolean(r.is_sold),
    dealPipeline:  r.deal_pipeline ?? null,
  }))
}

export interface BoothSaleRow {
  booth:  string
  ventas: number
}

export async function getMallBoothSalesByPeriod(from: string, to: string): Promise<BoothSaleRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      dod.booth     AS booth,
      COUNT(*)::int AS ventas
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_operations_details dod
      ON dod.id_operations_details = fd.id_operations_details
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL
      AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
      AND dod.booth = ANY($3)
    GROUP BY dod.booth
    ORDER BY dod.booth
  `, [from, to, MALL_BOOTH_LOCATIONS])

  return rows.map((r: any) => ({
    booth:  r.booth  as string,
    ventas: Number(r.ventas),
  }))
}

export interface SalesGroupRow {
  salesRole: string
  leadSource: string
  ventas: number
}

export async function getSalesGroupedByPeriod(
  from: string,
  to: string,
): Promise<SalesGroupRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      COALESCE(stm.sales_role, 'Sin Rol') AS sales_role,
      COALESCE(dms.lead_source, '')        AS lead_source,
      COUNT(*)::int                        AS ventas
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL
      AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
    GROUP BY stm.sales_role, dms.lead_source
  `, [from, to])

  return rows.map((r: any) => ({
    salesRole:  r.sales_role  as string,
    leadSource: r.lead_source as string,
    ventas:     Number(r.ventas),
  }))
}

export interface IndepBoothRow {
  leadSource: string
  boothName:  string   // from dim_operations_details.booth; empty when not set
  ventas:     number
}

export async function getIndependienteBoothSummary(
  from: string,
  to: string,
): Promise<IndepBoothRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      COALESCE(dms.lead_source, '') AS lead_source,
      COALESCE(dod.booth, '')       AS booth_name,
      COUNT(*)::int                 AS ventas
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.dim_operations_details dod
      ON dod.id_operations_details = fd.id_operations_details
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL
      AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
      AND dms.lead_source IS NOT NULL
      AND TRIM(dms.lead_source) <> ''
      AND LOWER(dms.lead_source) NOT LIKE '%mall%'
      AND LOWER(dms.lead_source) NOT LIKE '%centro comercial%'
      AND LOWER(dms.lead_source) NOT LIKE '%plaza%'
      AND LOWER(dms.lead_source) NOT LIKE '%home depot%'
      AND LOWER(dms.lead_source) NOT LIKE '%canvass%'
      AND LOWER(dms.lead_source) NOT LIKE '%redes sociales%'
      AND LOWER(dms.lead_source) NOT LIKE '%cuenta propia%'
      AND LOWER(dms.lead_source) NOT LIKE '%telemarketing%'
      AND LOWER(dms.lead_source) NOT LIKE '%showroom%'
    GROUP BY dms.lead_source, dod.booth
    ORDER BY ventas DESC
  `, [from, to])

  return rows.map((r: any) => ({
    leadSource: r.lead_source as string,
    boothName:  r.booth_name  as string,
    ventas:     Number(r.ventas),
  }))
}

export interface SellersSummaryRow {
  total:          number
  asalariados:    number
  fullCommission: number
}

export async function getActiveSellersSummary(): Promise<SellersSummaryRow> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query<{ total: string; asalariados: string }>(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE
        WHEN sales_role IN ('Empleado - Consultor','Empleado - Lider','Empleado - Gerente')
        THEN 1
      END)::int AS asalariados
    FROM dw_zoho.dim_sales_team_member
    WHERE status = 'Activo'
      AND email IS NOT NULL
  `)
  const r = rows[0]
  const total = Number(r.total)
  const asal  = Number(r.asalariados)
  return { total, asalariados: asal, fullCommission: total - asal }
}

export interface SaleDealDetail {
  dealName:    string | null
  vendedor:    string
  salesRole:   string
  closingDate: string
  pipeline:    string
  leadSource:  string
  amount:      number | null
  isCdbg:      boolean
  zohoId:      string
}

export interface AsalariadoSaleDeal {
  dealNumber:   string | null
  closingDate:  string
  pipeline:     string
  clientName:   string | null
  sellerName:   string
  traineeSales: string
  isAssisted:   boolean
}

export async function getAsalariadoDealDetails(
  employeeName: string,
  year: number,
  month: number,
): Promise<AsalariadoSaleDeal[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    WITH own_deals AS (
      SELECT
        dp.case_number                                                      AS deal_number,
        TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                             AS closing_date,
        dp.pipeline,
        NULLIF(TRIM(COALESCE(dl.full_name,
          COALESCE(dl.first_name,'') || ' ' || COALESCE(dl.last_name,''))), '') AS client_name,
        COALESCE(stm.full_name, ds.sale_rep_email)                         AS seller_name,
        COALESCE(ds.trainee_sales, '')                                     AS trainee_sales,
        false                                                               AS is_assisted
      FROM dwh.fact_deals fd
      JOIN dwh.dim_staff ds
        ON ds.id_staff = fd.id_staff AND ds.is_current = true
      LEFT JOIN dw_zoho.dim_sales_team_member stm
        ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
      JOIN dwh.dim_profiles dp
        ON dp.id_profile = fd.id_profile
      JOIN dwh.dim_status_reason dsr
        ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
      LEFT JOIN dwh.dim_lead dl
        ON dl.zoho_lead_id = fd.associated_lead AND dl.is_current = true
      WHERE EXTRACT(YEAR  FROM fd.closing_date)::int = $1
        AND EXTRACT(MONTH FROM fd.closing_date)::int = $2
        AND dsr.cancellation_reason IS NULL
        AND dsr.on_hold_status IS NULL
        AND LOWER(COALESCE(stm.full_name, ds.sale_rep_email)) = LOWER($3)
    ),
    assisted_deals AS (
      SELECT
        dp.case_number                                                      AS deal_number,
        TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                             AS closing_date,
        dp.pipeline,
        NULLIF(TRIM(COALESCE(dl.full_name,
          COALESCE(dl.first_name,'') || ' ' || COALESCE(dl.last_name,''))), '') AS client_name,
        COALESCE(stm.full_name, ds.sale_rep_email)                         AS seller_name,
        COALESCE(ds.trainee_sales, '')                                     AS trainee_sales,
        true                                                                AS is_assisted
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
      LEFT JOIN dwh.dim_lead dl
        ON dl.zoho_lead_id = fd.associated_lead AND dl.is_current = true
      WHERE EXTRACT(YEAR  FROM fd.closing_date)::int = $1
        AND EXTRACT(MONTH FROM fd.closing_date)::int = $2
        AND dsr.cancellation_reason IS NULL
        AND dsr.on_hold_status IS NULL
        AND LOWER(ds.trainee_sales) IN ('1st sale','2nd sale','3rd sale','4th sale')
        AND LOWER(COALESCE(stm_mentor.full_name, stm.sponsor_name, '')) = LOWER($3)
    )
    SELECT * FROM own_deals
    UNION ALL
    SELECT * FROM assisted_deals
    ORDER BY closing_date DESC
  `, [year, month, employeeName])

  return rows.map((r: any) => ({
    dealNumber:   r.deal_number ?? null,
    closingDate:  r.closing_date as string,
    pipeline:     r.pipeline as string,
    clientName:   r.client_name ?? null,
    sellerName:   r.seller_name as string,
    traineeSales: r.trainee_sales as string,
    isAssisted:   Boolean(r.is_assisted),
  }))
}

export interface AsalariadoCancelledDeal {
  dealNumber:         string | null
  closingDate:        string
  pipeline:           string
  clientName:         string | null
  sellerName:         string
  cancellationReason: string | null
}

export async function getAsalariadoCancelledDeals(
  employeeName: string,
  year: number,
  month: number,
): Promise<AsalariadoCancelledDeal[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      dp.case_number                                                        AS deal_number,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                               AS closing_date,
      dp.pipeline,
      NULLIF(TRIM(COALESCE(dl.full_name,
        COALESCE(dl.first_name,'') || ' ' || COALESCE(dl.last_name,''))), '') AS client_name,
      COALESCE(stm.full_name, ds.sale_rep_email)                           AS seller_name,
      dsr.cancellation_reason
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_lead dl
      ON dl.zoho_lead_id = fd.associated_lead AND dl.is_current = true
    WHERE EXTRACT(YEAR  FROM fd.closing_date)::int = $1
      AND EXTRACT(MONTH FROM fd.closing_date)::int = $2
      AND (dsr.cancellation_reason IS NOT NULL OR dsr.on_hold_status IS NOT NULL)
      AND LOWER(COALESCE(stm.full_name, ds.sale_rep_email)) = LOWER($3)
    ORDER BY fd.closing_date DESC
  `, [year, month, employeeName])

  return rows.map((r: any) => ({
    dealNumber:         r.deal_number ?? null,
    closingDate:        r.closing_date as string,
    pipeline:           r.pipeline as string,
    clientName:         r.client_name ?? null,
    sellerName:         r.seller_name as string,
    cancellationReason: r.cancellation_reason ?? null,
  }))
}

export async function getSalesDealDetailsByRoles(
  from: string,
  to: string,
  roles: string[],
  exclude = false,
): Promise<SaleDealDetail[]> {
  const pool = getRedshiftPool()
  const roleFilter = exclude
    ? `AND COALESCE(stm.sales_role, 'Sin Rol') <> ALL($3)`
    : `AND COALESCE(stm.sales_role, 'Sin Rol') = ANY($3)`

  const { rows } = await pool.query(`
    SELECT
      dp.case_number                                         AS deal_name,
      COALESCE(stm.full_name, ds.sale_rep_email)            AS vendedor,
      COALESCE(stm.sales_role, 'Sin Rol')                   AS sales_role,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                AS closing_date,
      dp.pipeline,
      COALESCE(dms.lead_source, '')                         AS lead_source,
      fd.amount,
      (dfl.cdbg_number IS NOT NULL)                         AS is_cdbg,
      fd.zoho_deal_id
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.dim_finance_legal dfl
      ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL
      AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
      ${roleFilter}
    ORDER BY fd.closing_date DESC
  `, [from, to, roles])

  return rows.map((r: any) => ({
    dealName:    r.deal_name ?? null,
    vendedor:    r.vendedor as string,
    salesRole:   r.sales_role as string,
    closingDate: r.closing_date as string,
    pipeline:    r.pipeline as string,
    leadSource:  r.lead_source as string,
    amount:      r.amount != null ? Number(r.amount) : null,
    isCdbg:      Boolean(r.is_cdbg),
    zohoId:      r.zoho_deal_id as string,
  }))
}

// ─── Canal Independiente ─────────────────────────────────────────────────────

export async function getIndepDealDetails(year: number): Promise<MallBoothDealDetail[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      COALESCE(dod.booth, dms.lead_source, 'Sin Ubicación') AS location,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')                AS closing_date,
      EXTRACT(MONTH FROM fd.closing_date)::int               AS month,
      dp.pipeline,
      (dsr.on_hold_status IS NOT NULL)                       AS is_cancelled,
      COALESCE(stm.full_name, ds.sale_rep_email)             AS vendedor,
      fd.amount,
      dsr.on_hold_status,
      dsr.cancellation_reason,
      (dfl.cdbg_number IS NOT NULL)                          AS is_cdbg,
      fd.zoho_deal_id,
      dp.case_number                                         AS deal_name
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.dim_operations_details dod
      ON dod.id_operations_details = fd.id_operations_details
    JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_finance_legal dfl
      ON dfl.id_finance_legal = fd.id_finance_legal AND dfl.is_current = true
    WHERE EXTRACT(YEAR FROM fd.closing_date) = $1
      AND LOWER(TRIM(dms.lead_source)) LIKE '%booth peq%'
    ORDER BY fd.closing_date DESC
  `, [year])

  return rows.map((r: any) => ({
    location:           r.location as string,
    closingDate:        r.closing_date as string,
    month:              Number(r.month),
    pipeline:           r.pipeline as string,
    isCancelled:        Boolean(r.is_cancelled),
    vendedor:           r.vendedor as string,
    amount:             r.amount != null ? Number(r.amount) : null,
    onHoldStatus:       r.on_hold_status ?? null,
    cancellationReason: r.cancellation_reason ?? null,
    isCdbg:             Boolean(r.is_cdbg),
    zohoId:             r.zoho_deal_id as string,
    dealName:           (r.deal_name as string | null) ?? null,
  }))
}

export async function getIndepLeadDetails(year: number): Promise<MallBoothLeadDetail[]> {
  const pool = getRedshiftPool()
  const yearStart = `${year}-01-01`
  const yearEnd   = `${year + 1}-01-01`
  const { rows } = await pool.query(`
    WITH emp_booth AS (
      -- Ubicación más reciente del vendedor en Booth Peq & Evento (Channel Info)
      SELECT email, booth FROM (
        SELECT
          LOWER(ds.sale_rep_email) AS email,
          dod.booth,
          ROW_NUMBER() OVER (PARTITION BY LOWER(ds.sale_rep_email) ORDER BY fd.closing_date DESC NULLS LAST) AS rn
        FROM dwh.fact_deals fd
        JOIN dwh.dim_staff ds
          ON ds.id_staff = fd.id_staff AND ds.is_current = true
        JOIN dwh.dim_operations_details dod
          ON dod.id_operations_details = fd.id_operations_details
        LEFT JOIN dwh.dim_marketing_source dms
          ON dms.id_marketing_source = fd.id_marketing_source
        WHERE dod.booth IS NOT NULL
          AND TRIM(dod.booth) <> ''
          AND LOWER(TRIM(dms.lead_source)) LIKE '%booth peq%'
      ) t WHERE t.rn = 1
    ),
    de_current AS (
      SELECT id_employee, sales_rep_email FROM (
        SELECT id_employee, sales_rep_email,
               ROW_NUMBER() OVER (PARTITION BY id_employee ORDER BY is_current DESC) AS rn
        FROM dwh.dim_employee
      ) t WHERE t.rn = 1
    ),
    booth_leads AS (
      SELECT
        fl.zoho_lead_id,
        fl.id_employee,
        dasl.created_time,
        dls.lead_source
      FROM dwh.fact_leads fl
      JOIN dwh.dim_audit_system_leads dasl
        ON dasl.id_audit_system = fl.id_audit_system
      JOIN dwh.dim_lead_source dls
        ON dls.id_lead_source = fl.id_lead_source
      WHERE dasl.created_time >= $1
        AND dasl.created_time <  $2
        AND LOWER(TRIM(dls.lead_source)) LIKE '%booth peq%'
    )
    SELECT
      b.zoho_lead_id                                                   AS lead_id,
      COALESCE(dl.full_name, TRIM(COALESCE(dl.first_name,'') || ' ' || COALESCE(dl.last_name,''))) AS lead_name,
      COALESCE(eb.booth, b.lead_source)                               AS location,
      TO_CHAR(b.created_time, 'YYYY-MM-DD')                           AS created_date,
      EXTRACT(MONTH FROM b.created_time)::int                         AS month,
      COALESCE(stm_emp.full_name, de.sales_rep_email)                  AS registrado_por,
      stm_emp.ciudad                                                   AS ciudad,
      (fd.zoho_deal_id IS NOT NULL AND dsr.on_hold_status IS NULL)     AS is_sold,
      dp.pipeline                                                      AS deal_pipeline
    FROM booth_leads b
    JOIN de_current de
      ON de.id_employee = b.id_employee
    LEFT JOIN emp_booth eb
      ON eb.email = LOWER(de.sales_rep_email)
    LEFT JOIN dwh.dim_lead dl
      ON dl.zoho_lead_id = b.zoho_lead_id AND dl.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm_emp
      ON LOWER(stm_emp.email) = LOWER(de.sales_rep_email)
    LEFT JOIN (
      SELECT associated_lead, zoho_deal_id, id_status_reason, id_profile
      FROM (
        SELECT associated_lead, zoho_deal_id, id_status_reason, id_profile,
               ROW_NUMBER() OVER (PARTITION BY associated_lead ORDER BY closing_date DESC NULLS LAST) AS rn
        FROM dwh.fact_deals
      ) t WHERE t.rn = 1
    ) fd ON fd.associated_lead = b.zoho_lead_id
    LEFT JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_profiles dp
      ON dp.id_profile = fd.id_profile
    ORDER BY b.created_time DESC
  `, [yearStart, yearEnd])

  return rows.map((r: any) => ({
    leadId:        r.lead_id as string,
    leadName:      (r.lead_name as string)?.trim() || null,
    location:      r.location as string,
    createdDate:   r.created_date as string,
    month:         Number(r.month),
    registradoPor: r.registrado_por as string,
    ciudad:        (r.ciudad as string | null) ?? null,
    isSold:        Boolean(r.is_sold),
    dealPipeline:  r.deal_pipeline ?? null,
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

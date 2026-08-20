import { getRedshiftPool } from '../lib/redshift.ts'

const pool = getRedshiftPool()
const YEAR = 2026
const MONTHS = [3, 4, 5, 6]
const MONTH_NAMES: Record<number, string> = { 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio' }

// 1) Find Roberto Pacheco
const who = await pool.query(`
  SELECT member_id, full_name, LOWER(email) AS email, status
  FROM dw_zoho.dim_sales_team_member
  WHERE LOWER(full_name) LIKE '%roberto%pacheco%'
  ORDER BY (status = 'Activo') DESC
`)
const roberto = who.rows[0]
const memberId = roberto.member_id
console.log(`Usando: ${roberto.full_name} (${roberto.email}) member_id=${memberId}\n`)

for (const MONTH of MONTHS) {
  // Roberto's own deals
  const own = await pool.query(`
    SELECT COUNT(*)::int AS n, COALESCE(SUM(fd.amount),0) AS monto
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds ON ds.id_staff = fd.id_staff AND ds.is_current = true
    LEFT JOIN dw_zoho.dim_sales_team_member stm ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_status_reason dsr ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    WHERE EXTRACT(YEAR FROM fd.closing_date)::int = $1
      AND EXTRACT(MONTH FROM fd.closing_date)::int = $2
      AND dsr.on_hold_status IS NULL AND COALESCE(dsr.stage,'') <> 'Cancelled'
      AND stm.member_id = $3
  `, [YEAR, MONTH, memberId])

  // Direct trainees' deals, grouped by seller
  const trainees = await pool.query(`
    SELECT COALESCE(stm.full_name, ds.sale_rep_email) AS vendedor,
           COUNT(*)::int AS n, COALESCE(SUM(fd.amount),0) AS monto
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dw_zoho.dim_sales_team_member stm ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    JOIN dwh.dim_status_reason dsr ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    WHERE EXTRACT(YEAR FROM fd.closing_date)::int = $1
      AND EXTRACT(MONTH FROM fd.closing_date)::int = $2
      AND dsr.on_hold_status IS NULL AND COALESCE(dsr.stage,'') <> 'Cancelled'
      AND stm.sponsor_id = $3
    GROUP BY 1 ORDER BY n DESC
  `, [YEAR, MONTH, memberId])

  const ownN = own.rows[0].n
  const ownMonto = Number(own.rows[0].monto)
  const trN = trainees.rows.reduce((s: number, r: any) => s + r.n, 0)
  const trMonto = trainees.rows.reduce((s: number, r: any) => s + Number(r.monto), 0)

  console.log(`\n══════════ ${MONTH_NAMES[MONTH]} ${YEAR} ══════════`)
  console.log(`Ventas propias Roberto: ${ownN}  ($${ownMonto.toLocaleString()})`)
  console.log(`Ventas trainees directos: ${trN}  ($${trMonto.toLocaleString()})  |  vendedores activos: ${trainees.rows.length}`)
  console.log(`TOTAL combinado: ${ownN + trN}  ($${(ownMonto + trMonto).toLocaleString()})`)
  console.table(trainees.rows.map((r: any) => ({ vendedor: r.vendedor, ventas: r.n, monto: Number(r.monto) })))
}

await pool.end()

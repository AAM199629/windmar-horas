// Inspección read-only: ¿cómo se relacionan vendedores con los 6 supervisores?
import { getRedshiftPool } from '../lib/redshift.ts'
import { SUPERVISORES_ACTIVOS } from '../lib/ventas.ts'
const pool = getRedshiftPool()
const norm = (s: any) => String(s ?? '').toLowerCase().trim()

// 1) status y sales_role distintos (solo activos)
const { rows: st } = await pool.query(`
  SELECT status, COUNT(*)::int n FROM dw_zoho.dim_sales_team_member GROUP BY status ORDER BY n DESC
`)
console.log('status:', st.map((r:any)=>`${r.status}=${r.n}`).join('  '))

const { rows: roles } = await pool.query(`
  SELECT sales_role, COUNT(*)::int n
  FROM dw_zoho.dim_sales_team_member
  WHERE LOWER(status)='activo'
  GROUP BY sales_role ORDER BY n DESC
`)
console.log('\nsales_role (activos):')
for (const r of roles) console.log(`  ${String(r.sales_role).padEnd(34)} ${r.n}`)

// 2) ¿Los 6 supervisores aparecen como owner_name / upline_level_1..2?
for (const field of ['owner_name','upline_level_1','upline_level_2','sponsor_name']) {
  const { rows } = await pool.query(`
    SELECT ${field} AS v, COUNT(*)::int n
    FROM dw_zoho.dim_sales_team_member
    WHERE LOWER(status)='activo'
    GROUP BY ${field}
  `)
  const hits = rows.filter((r:any)=> SUPERVISORES_ACTIVOS.some(s=>norm(s)===norm(r.v)))
  console.log(`\n${field}: ${hits.length} de 6 supervisores presentes`)
  for (const h of hits) console.log(`   ${String(h.v).padEnd(38)} n=${h.n}`)
}

// 3) lead_distribution_regions distintos (para ver formato de región)
const { rows: ldr } = await pool.query(`
  SELECT lead_distribution_regions AS v, COUNT(*)::int n
  FROM dw_zoho.dim_sales_team_member
  WHERE LOWER(status)='activo' AND lead_distribution_regions IS NOT NULL AND TRIM(lead_distribution_regions)<>''
  GROUP BY lead_distribution_regions ORDER BY n DESC LIMIT 20
`)
console.log('\nlead_distribution_regions (top):')
for (const r of ldr) console.log(`  ${String(r.v).padEnd(40)} ${r.n}`)

process.exit(0)

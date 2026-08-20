// Cuantifica el problema de channel_info NULL en leads de booth/evento.
import { getRedshiftPool } from '../lib/redshift.ts'
const pool = getRedshiftPool()

const { rows } = await pool.query(`
  SELECT dls.lead_source AS ls,
         COUNT(*)::int AS leads_total,
         SUM(CASE WHEN dls.channel_info IS NULL OR TRIM(dls.channel_info)='' THEN 1 ELSE 0 END)::int AS leads_sin_ci,
         COUNT(DISTINCT dls.channel_info)::int AS ci_distintos
  FROM dwh.dim_lead_source dls
  WHERE LOWER(dls.lead_source) LIKE '%booth%'
  GROUP BY dls.lead_source
  ORDER BY leads_total DESC
`)
console.log('lead_source                       leads    sin channel_info    channel_info distintos')
for (const r of rows) {
  const pct = ((r.leads_sin_ci / r.leads_total) * 100).toFixed(0)
  console.log(`  ${r.ls.padEnd(28)} ${String(r.leads_total).padStart(7)}    ${String(r.leads_sin_ci).padStart(7)} (${pct}%)      ${r.ci_distintos}`)
}
process.exit(0)

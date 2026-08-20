import { getRedshiftPool } from '../lib/redshift.ts'
const pool = getRedshiftPool()

// Leads de booth peq creados desde jun 2026: ¿qué channel_info traen y a qué evento mapea?
const { rows } = await pool.query(`
  SELECT COALESCE(dci.name, CASE WHEN dls.channel_info IS NULL THEN '(NULL)' ELSE 'ID sin match: '||dls.channel_info END) AS evento,
         TO_CHAR(dci.fecha_inicio,'YYYY-MM-DD') AS ini,
         COUNT(DISTINCT fl.zoho_lead_id)::int AS leads
  FROM dwh.fact_leads fl
  JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
  JOIN dwh.dim_audit_system_leads dasl ON dasl.id_audit_system = fl.id_audit_system
  LEFT JOIN dwh.dim_channel_info dci ON dci.zoho_channel_id = dls.channel_info
  WHERE dls.lead_source = 'Booth Pequeño / Evento'
    AND dasl.created_time >= '2026-06-01'
  GROUP BY 1, 2
  ORDER BY leads DESC
  LIMIT 25
`)
console.log('Leads booth-peq creados desde 2026-06-01, por evento al que su channel_info mapea:')
let tot = 0, nullc = 0, nomatch = 0
for (const r of rows) {
  console.log(`  leads=${String(r.leads).padStart(4)}  ini=${r.ini ?? '   —    '}  ${r.evento}`)
}
const { rows: agg } = await pool.query(`
  SELECT
    COUNT(DISTINCT fl.zoho_lead_id)::int AS total,
    COUNT(DISTINCT CASE WHEN dls.channel_info IS NULL THEN fl.zoho_lead_id END)::int AS sin_ci,
    COUNT(DISTINCT CASE WHEN dls.channel_info IS NOT NULL AND dci.zoho_channel_id IS NULL THEN fl.zoho_lead_id END)::int AS ci_sin_match
  FROM dwh.fact_leads fl
  JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
  JOIN dwh.dim_audit_system_leads dasl ON dasl.id_audit_system = fl.id_audit_system
  LEFT JOIN dwh.dim_channel_info dci ON dci.zoho_channel_id = dls.channel_info
  WHERE dls.lead_source = 'Booth Pequeño / Evento' AND dasl.created_time >= '2026-06-01'
`)
console.log(`\nTotal leads booth-peq desde jun: ${agg[0].total}  |  con channel_info NULL: ${agg[0].sin_ci}  |  channel_info sin match en dim_channel_info: ${agg[0].ci_sin_match}`)
process.exit(0)

import { getRedshiftPool } from '../lib/redshift.ts'
const pool = getRedshiftPool()

// ¿Qué formato tiene channel_info? Muestra distintos y su lead_source asociado.
const { rows: sample } = await pool.query(`
  SELECT dls.channel_info AS ci, dls.lead_source AS ls, COUNT(*)::int AS n
  FROM dwh.dim_lead_source dls
  WHERE dls.channel_info IS NOT NULL AND TRIM(dls.channel_info) <> ''
  GROUP BY dls.channel_info, dls.lead_source
  ORDER BY n DESC
  LIMIT 40
`)
console.log('Top channel_info por # de lead_source rows:')
for (const r of sample) console.log(`  ${String(r.ci).padEnd(22)} n=${String(r.n).padStart(4)}  lead_source="${r.ls}"`)

// ¿Cuántos channel_info distintos hay y cuántos son numéricos tipo Zoho ID (19 díg)?
const { rows: fmt } = await pool.query(`
  SELECT
    COUNT(DISTINCT channel_info)::int AS distintos,
    SUM(CASE WHEN channel_info ~ '^[0-9]{18,19}$' THEN 1 ELSE 0 END)::int AS numeric_rows,
    COUNT(*)::int AS total_rows
  FROM dwh.dim_lead_source
  WHERE channel_info IS NOT NULL AND TRIM(channel_info) <> ''
`)
console.log('\nFormato channel_info:', fmt[0])

// Eventos "booth pequeño" recientes: busca lead_source que parezca booth/evento
const { rows: booths } = await pool.query(`
  SELECT dls.lead_source AS ls, dls.channel_info AS ci, COUNT(DISTINCT fl.zoho_lead_id)::int AS leads
  FROM dwh.dim_lead_source dls
  JOIN dwh.fact_leads fl ON fl.id_lead_source = dls.id_lead_source
  WHERE LOWER(dls.lead_source) LIKE '%booth peq%'
  GROUP BY dls.lead_source, dls.channel_info
  ORDER BY leads DESC LIMIT 30
`)
console.log('\nlead_source "booth peq%" → channel_info values:')
for (const r of booths) console.log(`  ci=${String(r.ci ?? 'NULL').padEnd(22)} leads=${String(r.leads).padStart(4)}  ls="${r.ls}"`)
process.exit(0)

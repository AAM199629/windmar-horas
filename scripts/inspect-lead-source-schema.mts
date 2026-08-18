import { getRedshiftPool } from '../lib/redshift.ts'
const pool = getRedshiftPool()

// Columnas de dim_lead_source
const { rows: cols } = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='dwh' AND table_name='dim_lead_source'
  ORDER BY ordinal_position
`)
console.log('dwh.dim_lead_source columnas:')
for (const c of cols) console.log(`  ${c.column_name.padEnd(28)} ${c.data_type}`)

// Grano: ¿cuántas filas, cuántos lead_source distintos, cuántos channel_info distintos?
const { rows: grain } = await pool.query(`
  SELECT COUNT(*)::int AS filas,
         COUNT(DISTINCT lead_source)::int AS lead_sources,
         COUNT(DISTINCT channel_info)::int AS channel_infos
  FROM dwh.dim_lead_source
`)
console.log('\nGrano dim_lead_source:', grain[0])

// ¿channel_info es 1:1 con lead_source o hay muchos channel_info por lead_source?
const { rows: perLs } = await pool.query(`
  SELECT lead_source, COUNT(DISTINCT channel_info)::int AS n_ci
  FROM dwh.dim_lead_source
  WHERE lead_source ILIKE '%booth%'
  GROUP BY lead_source ORDER BY n_ci DESC
`)
console.log('\nchannel_info distintos por lead_source (booths):')
for (const r of perLs) console.log(`  "${r.lead_source}" → ${r.n_ci} channel_info distintos`)
process.exit(0)

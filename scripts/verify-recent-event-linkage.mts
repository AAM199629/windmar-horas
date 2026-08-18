import { getRedshiftPool } from '../lib/redshift.ts'
const pool = getRedshiftPool()

// ¿Los eventos creados recientemente en dim_channel_info logran enlazar leads?
// Si NINGÚN evento reciente enlaza → el ETL de tagging de leads va atrasado.
// Si SÍ enlazan otros recientes → los 9 nuestros simplemente no tienen ventas aún.
const { rows } = await pool.query(`
  WITH recent AS (
    SELECT zoho_channel_id, name, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS ini, booths_status
    FROM dwh.dim_channel_info
    WHERE lead_source = 'Booth Pequeño / Evento'
      AND fecha_inicio >= '2026-06-01'
  )
  SELECT r.name, r.ini, r.booths_status,
         COUNT(DISTINCT fl.zoho_lead_id)::int AS leads
  FROM recent r
  LEFT JOIN dwh.dim_lead_source dls ON dls.channel_info = r.zoho_channel_id
  LEFT JOIN dwh.fact_leads fl ON fl.id_lead_source = dls.id_lead_source
  GROUP BY r.name, r.ini, r.booths_status
  ORDER BY leads DESC, r.ini
`)
console.log('Eventos "Booth Pequeño / Evento" con fecha_inicio >= 2026-06-01 (todos, no solo los nuestros):')
console.log(`Total eventos recientes: ${rows.length}`)
const conLeads = rows.filter((r:any)=>r.leads>0)
console.log(`Con >=1 lead enlazado: ${conLeads.length}   |   Con 0 leads: ${rows.length-conLeads.length}\n`)
for (const r of rows.slice(0, 30)) console.log(`  leads=${String(r.leads).padStart(4)}  ${r.ini}  ${r.booths_status.padEnd(9)}  ${r.name}`)

// ¿Cuál es el lead más reciente que SÍ trae channel_info? (para ver hasta dónde llegó el tagging)
const { rows: last } = await pool.query(`
  SELECT MAX(TO_CHAR(dasl.created_time,'YYYY-MM-DD')) AS max_lead_con_ci
  FROM dwh.fact_leads fl
  JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
  JOIN dwh.dim_audit_system_leads dasl ON dasl.id_audit_system = fl.id_audit_system
  JOIN dwh.dim_channel_info dci ON dci.zoho_channel_id = dls.channel_info
  WHERE dls.lead_source = 'Booth Pequeño / Evento'
`)
console.log(`\nLead más reciente con channel_info válido (booth peq): ${last[0].max_lead_con_ci}`)
process.exit(0)

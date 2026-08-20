import { getRedshiftPool } from '../lib/redshift.ts'
import { EVENTS, MALLS } from '../lib/finance-config.ts'
const pool = getRedshiftPool()

// 1) ¿Están nuestros 14 EVENTS (por zoho_channel_id)? Traer fecha/inversión del warehouse.
const ids = EVENTS.map(e => e.channelInfoId)
const { rows: found } = await pool.query(`
  SELECT zoho_channel_id, id_channel_info, name, nombre_channel_info, pueblo, tipo_de_evento,
         booths_status, lead_source,
         TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS ini, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fin,
         inversion_fija, inversion_variable
  FROM dwh.dim_channel_info WHERE zoho_channel_id = ANY($1)
`, [ids])
const byZoho = new Map(found.map((r: any) => [String(r.zoho_channel_id), r]))
console.log('── ¿Están los 14 EVENTS de la config? (config vs warehouse) ──')
for (const e of EVENTS) {
  const r: any = byZoho.get(e.channelInfoId)
  if (!r) { console.log(`  ❌ ${e.nombre.padEnd(42)} ${e.channelInfoId}  NO ESTÁ`); continue }
  const invMatch = Number(r.inversion_fija ?? 0) === e.inversionFija ? '=' : `≠(dw:${r.inversion_fija})`
  console.log(`  ✅ ${e.nombre.slice(0,42).padEnd(42)} dw:[${r.name}] fechas ${r.ini}→${r.fin ?? '∞'} inv ${invMatch} status=${r.booths_status}`)
}

// 2) Linkage: ¿fact_leads/dim_lead_source tienen id_channel_info FK? Revisar columnas.
for (const tbl of ['fact_leads', 'dim_lead_source', 'fact_deals']) {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='dwh' AND table_name=$1 AND column_name ILIKE '%channel%'
  `, [tbl])
  console.log(`\n${tbl} columnas *channel*: ${rows.map((r:any)=>r.column_name).join(', ') || '(ninguna)'}`)
}

// 3) ¿dim_lead_source.channel_info = dim_channel_info.zoho_channel_id? Probar join por un evento cargado.
const { rows: linktest } = await pool.query(`
  SELECT dci.name, COUNT(DISTINCT fl.zoho_lead_id)::int AS leads
  FROM dwh.dim_channel_info dci
  JOIN dwh.dim_lead_source dls ON dls.channel_info = dci.zoho_channel_id
  JOIN dwh.fact_leads fl ON fl.id_lead_source = dls.id_lead_source
  WHERE dci.zoho_channel_id = ANY($1)
  GROUP BY dci.name ORDER BY leads DESC
`, [ids])
console.log('\n── Link dim_lead_source.channel_info = dim_channel_info.zoho_channel_id (leads por evento) ──')
for (const r of linktest) console.log(`  ${r.name.padEnd(44)} leads=${r.leads}`)
if (!linktest.length) console.log('  (sin matches por esta ruta)')
process.exit(0)

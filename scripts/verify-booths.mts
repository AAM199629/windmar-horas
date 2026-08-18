// Diagnóstico de atribución de Booths & Eventos por channel_info.
import { getRedshiftPool } from '../lib/redshift.ts'
import { EVENTS } from '../lib/finance-config.ts'

const pool = getRedshiftPool()
const ids = EVENTS.map(e => e.channelInfoId)

// 1) ¿Existen esos channel_info en dim_lead_source? ¿Cuántas filas?
const { rows: exist } = await pool.query(`
  SELECT channel_info, COUNT(*)::int AS lead_source_rows
  FROM dwh.dim_lead_source WHERE channel_info = ANY($1)
  GROUP BY channel_info
`, [ids])
const existMap = new Map(exist.map((r: any) => [String(r.channel_info), r.lead_source_rows]))

// 2) Leads totales por channel_info (todo el tiempo) y deals asociados
const { rows: leadCounts } = await pool.query(`
  SELECT dls.channel_info AS ci, COUNT(*)::int AS leads
  FROM dwh.fact_leads fl
  JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
  WHERE dls.channel_info = ANY($1)
  GROUP BY dls.channel_info
`, [ids])
const leadMap = new Map(leadCounts.map((r: any) => [String(r.ci), r.leads]))

// 3) Deals (sin filtro de fecha, sin filtro cancelado) enlazados vía associated_lead
const { rows: dealCounts } = await pool.query(`
  SELECT dls.channel_info AS ci,
         COUNT(*)::int AS deals,
         MIN(TO_CHAR(fd.closing_date,'YYYY-MM-DD')) AS min_close,
         MAX(TO_CHAR(fd.closing_date,'YYYY-MM-DD')) AS max_close
  FROM dwh.fact_deals fd
  JOIN dwh.fact_leads fl       ON fl.zoho_lead_id    = fd.associated_lead
  JOIN dwh.dim_lead_source dls ON dls.id_lead_source = fl.id_lead_source
  WHERE dls.channel_info = ANY($1)
  GROUP BY dls.channel_info
`, [ids])
const dealMap = new Map(dealCounts.map((r: any) => [String(r.ci), r]))

console.log('\nchannel_info                  evento                                        LS-rows  leads  deals(all-time)  rango')
for (const e of EVENTS) {
  const d: any = dealMap.get(e.channelInfoId)
  console.log(
    `${e.channelInfoId}  ${e.nombre.slice(0,42).padEnd(43)} ${String(existMap.get(e.channelInfoId) ?? 0).padStart(5)}  ${String(leadMap.get(e.channelInfoId) ?? 0).padStart(5)}  ${String(d?.deals ?? 0).padStart(6)}          ${d ? d.min_close + '→' + d.max_close : ''}`
  )
}
process.exit(0)

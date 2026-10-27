// Verificación del módulo Sales Recruitment en Redshift (schema sales_recruitment).
// Correr con: npx tsx --env-file=.env.local scripts/inspect-dim-sales-recruitment.mts
//
// El ETL entregó un star schema (fact_sales_recruitment + 7 dimensiones) en vez
// de la tabla plana que pedía scripts/ETL-REQUEST-sales-recruitment.md.

import { getRedshiftPool } from '../lib/redshift.ts'
import {
  RECRUIT_SCHEMA, recruitTableExists, loadRecruitRows, getFilterOptions,
  buildCohorts, buildFunnel, buildKpis, buildBreakdown, buildMentorRoster,
  sessionsCollapse, asistioDate,
} from '../lib/reclutamiento.ts'
import { parseSolarAcademySede } from '../lib/constants.ts'

const pool = getRedshiftPool()
const h = (s: string) => console.log(`\n${'─'.repeat(74)}\n${s}\n${'─'.repeat(74)}`)
const SR = RECRUIT_SCHEMA

h('1. ¿Está el schema?')
const exists = await recruitTableExists()
console.log(exists ? `✅ ${SR}.fact_sales_recruitment presente` : '❌ no está — ver scripts/ETL-REQUEST-sales-recruitment.md')

if (exists) {
  h('2. Tablas y volumen')
  const tabs = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1`, [SR])
  for (const { table_name } of tabs.rows) {
    const { rows } = await pool.query(`SELECT COUNT(*) n FROM ${SR}.${table_name}`)
    console.log(`  ${table_name.padEnd(26)} ${String(rows[0].n).padStart(7)} filas`)
  }

  h('3. Las tres peticiones de la spec')
  const { rows: [k] } = await pool.query(`
    SELECT
      SUM(CASE WHEN st.sales_team_matching_id IS NOT NULL THEN 1 ELSE 0 END) con_matching,
      SUM(CASE WHEN st.sales_team_matching_id IS NOT NULL AND m1.member_id IS NULL THEN 1 ELSE 0 END) matching_huerfanos,
      SUM(CASE WHEN st.mentor_asignado_id IS NOT NULL THEN 1 ELSE 0 END) con_mentor,
      SUM(CASE WHEN st.mentor_asignado_id IS NOT NULL AND m2.member_id IS NULL THEN 1 ELSE 0 END) mentor_huerfanos,
      SUM(CASE WHEN st.email_corporativo_mentor IS NOT NULL THEN 1 ELSE 0 END) con_email_mentor
    FROM ${SR}.fact_sales_recruitment f
    LEFT JOIN ${SR}.dim_recruit_staff st ON st.id_recruit_staff = f.id_recruit_staff
    LEFT JOIN dw_zoho.dim_sales_team_member m1 ON m1.member_id = st.sales_team_matching_id
    LEFT JOIN dw_zoho.dim_sales_team_member m2 ON m2.member_id = st.mentor_asignado_id`)
  console.log(`  ① sales_team_matching_id: ${k.con_matching} con valor · ${k.matching_huerfanos} huérfanos ${Number(k.matching_huerfanos) <= 1 ? '✅' : '❌'}`)
  console.log(`     mentor_asignado_id:     ${k.con_mentor} con valor · ${k.mentor_huerfanos} huérfanos ${Number(k.mentor_huerfanos) === 0 ? '✅' : '❌'}`)
  console.log(`  ② email_corporativo_mentor: ${k.con_email_mentor} con valor ✅`)
  const { rows: tipos } = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'dim_recruit_timeline'
       AND column_name IN ('llamado','citado','asistio_oportunidad','asistio_crea_y_max','reunion_con_mentor','sales_team_created_date')`, [SR])
  const textos = tipos.filter((t: { data_type: string }) => t.data_type.includes('character'))
  console.log(`  ③ fechas como date: ${textos.length === 0 ? '✅ todas' : `❌ ${textos.map((t: {column_name:string}) => t.column_name).join(', ')} son texto`}`)

  h('4. Fan-out del join por el fact')
  const { rows: [fo] } = await pool.query(`
    SELECT (SELECT COUNT(*) FROM ${SR}.fact_sales_recruitment) spine,
           COUNT(*) resultado
    FROM ${SR}.fact_sales_recruitment f
    JOIN ${SR}.dim_recruit_timeline t ON t.id_recruit_timeline = f.id_recruit_timeline
    JOIN ${SR}.dim_recruit r ON r.id_recruit = f.id_recruit
    LEFT JOIN ${SR}.dim_recruit_source src ON src.id_recruit_source = f.id_recruit_source
    LEFT JOIN ${SR}.dim_recruit_geography g ON g.id_recruit_geography = f.id_recruit_geography
    LEFT JOIN ${SR}.dim_recruit_staff st ON st.id_recruit_staff = f.id_recruit_staff
    LEFT JOIN dw_zoho.dim_sales_team_member m ON m.member_id = st.mentor_asignado_id`)
  console.log(`  spine=${fo.spine} → resultado=${fo.resultado} ${fo.spine === fo.resultado ? '✅ sin fan-out' : '❌ FAN-OUT'}`)

  h('5. Picklist de sede: ¿lo normaliza parseSolarAcademySede?')
  const { rows: sedes } = await pool.query(
    `SELECT presencial_o_virtual v, COUNT(*) n FROM ${SR}.dim_recruit_geography GROUP BY 1 ORDER BY 2 DESC`)
  const agrupado = new Map<string, number>()
  for (const r of sedes) {
    const { sede, horario } = parseSolarAcademySede(r.v)
    const kk = `${sede} · ${horario}`
    agrupado.set(kk, (agrupado.get(kk) ?? 0) + Number(r.n))
  }
  console.log(`  ${sedes.length} valores crudos → ${agrupado.size} combinaciones sede×horario`)
  for (const [kk, n] of [...agrupado].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(6)}  ${kk}`)
  }

  h('6. ¿Las 4 sesiones se sellan el mismo día? (cambió con el tiempo)')
  const { rows: porAnio } = await pool.query(`
    SELECT EXTRACT(year FROM asistio_oportunidad) anio, COUNT(*) con_op,
           SUM(CASE WHEN asistio_crea_y_max = asistio_oportunidad THEN 1 ELSE 0 END) mismo_dia
    FROM ${SR}.dim_recruit_timeline
    WHERE asistio_oportunidad >= '2023-01-01' GROUP BY 1 ORDER BY 1`)
  for (const r of porAnio) {
    const pct = Number(r.con_op) ? (100 * Number(r.mismo_dia) / Number(r.con_op)) : 0
    console.log(`  ${r.anio}  ${String(r.con_op).padStart(5)} con Oportunidad · ${pct.toFixed(0)}% mismo día → ${pct >= 90 ? 'colapsa en 1 etapa' : 'se muestran las 4'}`)
  }
}

h('7. La capa de datos end-to-end')
const opts = await getFilterOptions()
console.log(`sedes:    ${opts.sedes.join(' · ')}`)
console.log(`horarios: ${opts.horarios.join(' · ')}`)
console.log(`sources:  ${opts.sources.join(' · ')}`)
console.log(`Solares (18m): ${opts.solarDates.length} → ${opts.solarDates.slice(0, 6).join(' · ')}`)

const D = opts.solarDates[0]
for (const [name, f] of [
  [`último Solar (${D})`, { solarFrom: D, solarTo: D, lookbackDays: 7 }],
  ['últimos 3 meses',     { solarFrom: '2026-06-15', solarTo: '2026-09-10', lookbackDays: 7 }],
  ['2024 (4 sesiones)',   { solarFrom: '2024-03-01', solarTo: '2024-03-31', lookbackDays: 7 }],
  ['sin ancla',           { lookbackDays: 7 }],
] as [string, Record<string, unknown>][]) {
  const t0 = Date.now()
  const ds = await loadRecruitRows(f)
  const ms = Date.now() - t0
  const c = buildCohorts(ds.rows, f)
  const kp = buildKpis(c)
  const fn = buildFunnel(c)
  const pc = (x: number | null) => x === null ? '—' : `${x.toFixed(0)}%`
  console.log(`\n▸ ${name}  · ${ds.rows.length} filas de la query en ${ms}ms · fuente=${ds.source}`)
  console.log(`  sesiones ${sessionsCollapse(c.asistieron) ? 'colapsadas' : 'expandidas (4 etapas)'}`)
  console.log('  ' + fn.map(s => `${s.label}=${s.count}${s.convFromPrev !== null ? ` (${s.convFromPrev.toFixed(0)}%${s.crossPopulation ? '⁓' : ''})` : ''}`).join(' → '))
  console.log(`  cobertura ventana ${kp.citadosDesdeVentana}/${kp.citados}=${pc(kp.coberturaVentana)} · no-shows=${kp.noShows} · fast-track=${kp.fastTrack} · presentes=${kp.presentesEnFecha}(${kp.presentesCitadosAqui})`)
  const bd = buildBreakdown(c, 'sede')
  const tot = bd.reduce((a, r) => a + r.citados, 0)
  console.log(`  desglose: ${bd.length} sedes (citados suman ${tot}${tot === kp.citados ? ' ✅' : ' ❌'}) · ${buildMentorRoster(c).length} mentores`)
  const over = [...buildBreakdown(c, 'source'), ...bd].filter(r => r.showRate !== null && r.showRate > 100)
  if (over.length) console.log(`  ❌ ${over.length} filas con show rate > 100%`)
}

// El caso que motivó los dos ejes: citado un mes, asistió otro.
h('8. Citados en un mes y asistidos en otro')
const ds = await loadRecruitRows({ solarFrom: '2026-06-01', solarTo: '2026-09-10', lookbackDays: 7 })
const cruzados = ds.rows.filter(r => {
  const a = asistioDate(r)
  return r.stages.citado && a && r.stages.citado.slice(0, 7) !== a.slice(0, 7)
})
console.log(`${cruzados.length} records — los que un solo eje de fecha escondería`)
for (const r of cruzados.slice(0, 5)) console.log(`  ${r.name.padEnd(36)} citado ${r.stages.citado} → asistió ${asistioDate(r)}`)

process.exit(0)

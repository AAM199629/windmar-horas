import { getRedshiftPool } from '../lib/redshift.ts'
import { EVENTS } from '../lib/finance-config.ts'
const pool = getRedshiftPool()

// 1) ¿Existe la tabla? Columnas.
const { rows: cols } = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='dwh' AND table_name='dim_channel_info'
  ORDER BY ordinal_position
`)
if (!cols.length) { console.log('❌ dwh.dim_channel_info NO existe o está vacía de columnas'); process.exit(1) }
console.log('✅ dwh.dim_channel_info columnas:')
for (const c of cols) console.log(`   ${c.column_name.padEnd(32)} ${c.data_type}`)

// 2) Conteo de filas
const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS n FROM dwh.dim_channel_info`)
console.log(`\nFilas: ${cnt[0].n}`)

// 3) Muestra de 8 filas (todas las columnas)
const { rows: sample } = await pool.query(`SELECT * FROM dwh.dim_channel_info LIMIT 8`)
console.log('\nMuestra:')
for (const r of sample) console.log('  ' + JSON.stringify(r))
process.exit(0)

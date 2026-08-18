// Verificación directa de la capa de datos de Finanzas & ROI (sin HTTP/auth).
// Corre: npx tsx --env-file=.env.local scripts/verify-finance.mts [from] [to]
import {
  getHomeDepotFinance, getMallFinance, getBoothEventFinance,
  getCambaseoFinance, homeDepotUnitsReady, monthsInRange,
  getShiftCoverageByLocation,
} from '../lib/finance.ts'
import { HD_LUMP_SUM_SEMESTRAL } from '../lib/finance-config.ts'

const from = process.argv[2] ?? '2026-06-01'
const to   = process.argv[3] ?? '2026-06-30'
const meses = monthsInRange(from, to)
const mesesCount = meses.length
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

console.log(`\n════ Finanzas & ROI · ${from} → ${to} (${mesesCount} mes/es) ════\n`)

const cov = await getShiftCoverageByLocation(from, to)
const cobFmt = (p: number | null, po: number, cr: number) => p == null ? '—' : `${(p*100).toFixed(0)}% (${po}/${cr})`
const [hd, malls, booths, coords, hdReady] = await Promise.all([
  getHomeDepotFinance(from, to, cov),
  getMallFinance(from, to, cov),
  getBoothEventFinance(from, to, cov),
  getCambaseoFinance(from, to, mesesCount),
  homeDepotUnitsReady(),
])

console.log(`hdUnitsReady (columnas placas/baterías en warehouse): ${hdReady}\n`)

console.log('── HOME DEPOT ──')
for (const s of hd) {
  console.log(`  ${s.nombre.padEnd(28)} deals=${String(s.deals).padStart(3)} amt=${money(s.amount).padStart(12)} ingreso(%EPC)=${money(s.gananciaPipeline).padStart(9)} cobertura=${cobFmt(s.coberturaTurnos, s.turnosPonchados, s.turnosCreados)}`)
}
const hdIngreso = hd.reduce((a, s) => a + (s.ingreso ?? 0), 0)
const hdCosto = (HD_LUMP_SUM_SEMESTRAL / 6) * mesesCount
console.log(`  TOTAL ingreso(placas)=${money(hdIngreso)}  costo(prorrateo ${mesesCount}mes)=${money(hdCosto)}  neto=${money(hdIngreso - hdCosto)}\n`)

console.log('── CENTROS COMERCIALES ──')
for (const m of malls) {
  console.log(`  ${m.nombre.padEnd(30)} costo=${money(m.costoPeriodo).padStart(8)} ganancia=${money(m.ganancia)} %meta=${(m.pctMeta*100).toFixed(0)}% cobertura=${cobFmt(m.coberturaTurnos, m.turnosPonchados, m.turnosCreados)}`)
}
const mallIng = malls.reduce((a, m) => a + m.ganancia, 0), mallCost = malls.reduce((a, m) => a + m.costoPeriodo, 0)
console.log(`  TOTAL ganancia=${money(mallIng)}  costo=${money(mallCost)}  neto=${money(mallIng - mallCost)}\n`)

console.log('── BOOTHS & EVENTOS ──')
for (const b of booths) {
  console.log(`  ${b.nombre.padEnd(42)} dias=${String(b.dias).padStart(3)} ventas=${String(b.ventas).padStart(3)} cobertura=${cobFmt(b.coberturaTurnos, b.turnosPonchados, b.turnosCreados).padStart(13)} costo=${money(b.costo).padStart(8)} ingreso=${money(b.ingreso).padStart(8)} neto=${money(b.gananciaNeta).padStart(9)}`)
}
const bIng = booths.reduce((a, b) => a + b.ingreso, 0), bCost = booths.reduce((a, b) => a + b.costo, 0)
console.log(`  TOTAL ingreso=${money(bIng)}  costo=${money(bCost)}  neto=${money(bIng - bCost)}\n`)

console.log('── CAMBASEO (por coordinador) ──')
for (const c of coords) {
  console.log(`  ${c.nombre.padEnd(32)} ventas=${String(c.ventas).padStart(3)} EPC=${money(c.amount).padStart(11)} comision=${money(c.comision).padStart(7)} guagua=${money(c.guagua)} salario=${money(c.salario)} costoT=${money(c.costoTotal).padStart(8)} gananciaCia=${money(c.gananciaCompania).padStart(9)} neto=${money(c.gananciaNeta).padStart(10)}`)
}
const cIng = coords.reduce((a, c) => a + c.gananciaCompania, 0), cCost = coords.reduce((a, c) => a + c.costoTotal, 0)
console.log(`  TOTAL gananciaCia=${money(cIng)}  costo=${money(cCost)}  neto=${money(cIng - cCost)}\n`)

const ingreso = hdIngreso + mallIng + bIng + cIng
const costo = hdCosto + mallCost + bCost + cCost
console.log('════ RESUMEN EJECUTIVO ════')
console.log(`  Ingreso total : ${money(ingreso)}`)
console.log(`  Costo total   : ${money(costo)}`)
console.log(`  Ganancia neta : ${money(ingreso - costo)}  (margen ${ingreso > 0 ? ((ingreso-costo)/ingreso*100).toFixed(1) : '—'}%)`)
process.exit(0)

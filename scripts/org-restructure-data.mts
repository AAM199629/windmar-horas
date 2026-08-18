// Extracción read-only para el diagrama de reestructuración del departamento.
// Corre con:  npx tsx --env-file=.env.local scripts/org-restructure-data.mts
//
// Nota: el mapeo supervisor→vendedor vive solo en Smartsheet (cache KV frío / sin
// token) y los campos de jerarquía en Redshift (upline/owner/sponsor) son el árbol
// MLM, no la supervisión regional. Por eso el estado ACTUAL se ancla por REGIÓN
// (ciudad→región de la fuerza activa) — cada Supervisor Regional = un territorio.

import { writeFileSync } from 'node:fs'
import { getRedshiftPool } from '../lib/redshift.ts'
import { getSellerRegion, MALL_BOOTH_LOCATIONS, BOOTH_REGIONS, BOOTH_REGIONS_ORDER } from '../lib/constants.ts'
import { MALLS } from '../lib/finance-config.ts'

const pool = getRedshiftPool()
const norm = (s: any) => String(s ?? '').toLowerCase().trim()

// ── 1) Fuerza de venta ACTIVA por rol y región (Redshift) ────────────────────
const { rows: members } = await pool.query(`
  SELECT sales_role, ciudad
  FROM dw_zoho.dim_sales_team_member
  WHERE LOWER(status) = 'activo'
`)

function roleGroup(role: string): string {
  const r = norm(role)
  if (r === 'supervisor regional') return 'supervisores'
  if (r === 'canvassing coordinator') return 'coordinadores'
  if (r.startsWith('empleado')) return 'asalariados'
  if (['consultor', 'trainee', 'lider', 'gerente'].includes(r)) return 'vendedores'
  return 'otros'
}

const REGIONS = [...BOOTH_REGIONS_ORDER] as string[]
const ROLE_GROUPS = ['vendedores', 'asalariados', 'coordinadores', 'supervisores', 'otros']

// region -> roleGroup -> count
const byRegion: Record<string, Record<string, number>> = {}
for (const reg of [...REGIONS, 'Sin región']) {
  byRegion[reg] = Object.fromEntries(ROLE_GROUPS.map(g => [g, 0]))
}
const roleTotals: Record<string, number> = Object.fromEntries(ROLE_GROUPS.map(g => [g, 0]))
for (const m of members) {
  const reg = getSellerRegion(m.ciudad)
  const g = roleGroup(m.sales_role)
  byRegion[reg][g]++
  roleTotals[g]++
}

// ── 2) Inventario canal Independiente (Redshift dim_channel_info) ─────────────
const { rows: ciRows } = await pool.query(`
  SELECT nombre_channel_info AS nombre, pueblo, tipo_de_evento AS tipo,
         booths_status AS status, inversion_fija AS inversion
  FROM dwh.dim_channel_info
`)

// Tipos que son booths/eventos FÍSICOS del canal independiente (buz independiente).
// Se excluyen: Home Depot y Centro Comercial (canal Mall), Vans (canvassing),
// y los digitales/indirectos (Social Networks, Web, Publicidad, Referidos, etc.).
const INDEP_FISICO = new Set(['supermercados', 'ferreterias', 'eventos especiales', 'estacion de gasolina'])
const isActive = (s: string | null) => norm(s) === 'activo'

const indepActivos = ciRows.filter(r => isActive(r.status) && INDEP_FISICO.has(norm(r.tipo)))
const indepPorRegion: Record<string, number> = {}
const indepPorTipo: Record<string, number> = {}
let indepInversion = 0
for (const r of indepActivos) {
  const reg = getSellerRegion(r.pueblo)
  indepPorRegion[reg] = (indepPorRegion[reg] ?? 0) + 1
  const t = (r.tipo ?? 'Sin tipo').trim()
  indepPorTipo[t] = (indepPorTipo[t] ?? 0) + 1
  indepInversion += Number(r.inversion ?? 0) || 0
}

// Inventario amplio (todos los activos por tipo) para contexto.
const activosPorTipo: Record<string, number> = {}
for (const r of ciRows.filter(r => isActive(r.status))) {
  const t = (r.tipo ?? 'Sin tipo').trim() || 'Sin tipo'
  activosPorTipo[t] = (activosPorTipo[t] ?? 0) + 1
}

// ── 3) Inventario Mall / Home Depot (config) por región ──────────────────────
const mallPorRegion: Record<string, number> = {}
for (const loc of MALL_BOOTH_LOCATIONS) {
  const reg = BOOTH_REGIONS[loc] ?? 'Sin región'
  mallPorRegion[reg] = (mallPorRegion[reg] ?? 0) + 1
}

// ── 4) Vista por región consolidada ──────────────────────────────────────────
const regionView = REGIONS.map(reg => ({
  region: reg,
  vendedores: byRegion[reg].vendedores,
  asalariados: byRegion[reg].asalariados,
  coordinadores: byRegion[reg].coordinadores,
  supervisores: byRegion[reg].supervisores,
  mallBooths: mallPorRegion[reg] ?? 0,
  indepBooths: indepPorRegion[reg] ?? 0,
}))

const out = {
  nota: 'ACTUAL anclado en Redshift: fuerza activa por rol/región + inventario booths. Mapeo supervisor→vendedor NO disponible (Smartsheet cache frío); estructura por región.',
  totalActivos: members.length,
  roleTotals,
  regionOrder: REGIONS,
  regionView,
  sinRegion: byRegion['Sin región'],
  independiente: {
    activosFisicos: indepActivos.length,
    inversionMensual: indepInversion,
    porRegion: indepPorRegion,
    porTipo: indepPorTipo,
    contextoActivosPorTipo: activosPorTipo,
  },
  mall: {
    totalBooths: MALL_BOOTH_LOCATIONS.length,
    homeDepot: (MALL_BOOTH_LOCATIONS as readonly string[]).filter(l => l.startsWith('Home Depot')).length,
    malls: MALLS.length,
    porRegion: mallPorRegion,
  },
}

const outPath = new URL('./org-restructure-data.json', import.meta.url).pathname
writeFileSync(outPath, JSON.stringify(out, null, 2))

console.log(`Total activos: ${members.length}`)
console.log('Role totals:', roleTotals)
console.log('\n── Por región ──')
console.log('region'.padEnd(18), 'vend', 'asal', 'coord', 'sup', 'mall', 'indep')
for (const r of regionView) {
  console.log(r.region.padEnd(18), String(r.vendedores).padStart(4), String(r.asalariados).padStart(4),
    String(r.coordinadores).padStart(5), String(r.supervisores).padStart(3), String(r.mallBooths).padStart(4), String(r.indepBooths).padStart(5))
}
console.log('Sin región:', byRegion['Sin región'])
console.log('\nIndependiente físico activo:', indepActivos.length, '| inversión/mes $' + indepInversion.toLocaleString())
console.log('  por región:', indepPorRegion)
console.log('  por tipo:', indepPorTipo)
console.log(`\n✅ JSON → ${outPath}`)
process.exit(0)

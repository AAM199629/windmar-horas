// Descubrimiento/validación para el Análisis de Coordinadores.
// Corre: npx tsx --env-file=.env.local scripts/inspect-coordinadores.mts [YYYY-MM]
import { listWeekKeys, getWeeklyReport } from '../lib/kv.ts'
import { getMonthLeadsByCoordinator } from '../lib/redshift.ts'
import type { ShiftRow } from '../lib/types.ts'

const month = process.argv[2] ?? '2026-06'
const [year, mm] = month.split('-')
const lastDay = new Date(Number(year), Number(mm), 0).getDate()
const monthStart = `${year}-${mm}-01`
const monthEnd   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

console.log(`\n════ Validación coordinadores · ${monthStart} → ${monthEnd} ════\n`)

// ── Matcher: coordinador desde el nombre del turno ────────────────────────
function norm(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
type Region = 'Mayagüez' | 'Ponce' | 'San Juan' | 'Hatillo' | null
function regionOf(location: string): Region {
  const l = norm(location)
  if (l.includes('mayaguez')) return 'Mayagüez'
  if (l.includes('ponce'))    return 'Ponce'
  if (l.includes('san juan')) return 'San Juan'
  if (l.includes('hatillo'))  return 'Hatillo'
  return null
}
interface CoordSpec { canon: string; region: Region; tokens: string[]; regionPrimary?: boolean }
const COORDS: CoordSpec[] = [
  { canon: 'Roberto Luis Irizarry Alicea',     region: 'Mayagüez', tokens: ['irizarry', 'roberto'], regionPrimary: true },
  { canon: 'Javier Andres Larregoity',         region: 'Mayagüez', tokens: ['larregoity'] },
  { canon: 'Javier Alberto Gonzalez Acevedo',  region: 'Ponce',    tokens: [] },
  { canon: 'Orlando Pena Ayala',               region: 'Ponce',    tokens: ['orlando', 'pena'], regionPrimary: true },
  { canon: 'Abdiel Edmundo Oliveras Rivera',   region: 'San Juan', tokens: ['abdiel', 'oliveras'], regionPrimary: true },
  { canon: 'Christian Ariel Gonzalez Jimenez', region: 'San Juan', tokens: ['christian'] },
  { canon: 'Nashualiz Marquez Febres',         region: 'San Juan', tokens: ['nashualiz', 'marquez'] },
  { canon: 'Lorenzo Trinidad Adorno',          region: 'Hatillo',  tokens: ['lorenzo', 'trinidad'], regionPrimary: true },
]
// Carpas, eventos y orientaciones NO se atribuyen a un coordinador.
const EVENT_KW = ['carpa', 'carpaceo', 'evento', 'windmarteresponde', 'orientacion', 'orientaciones', 'especial', 'actividad', 'bakery', 'bongo', 'nuxor']
function isEvent(n: string): boolean { return EVENT_KW.some(k => n.includes(k)) }

function matchCoord(shiftName: string, location: string): string | null {
  const n = norm(shiftName)
  const region = regionOf(location)
  // 1) tokens distintivos
  for (const c of COORDS) {
    if (c.tokens.some(t => n.includes(t))) return c.canon
  }
  // 2) "javier" solo → desambiguar por región
  if (n.includes('javier')) {
    if (region === 'Ponce') return 'Javier Alberto Gonzalez Acevedo'
    if (region === 'Mayagüez') return 'Javier Andres Larregoity'
  }
  // 3) "gonzalez" solo sin nombre → por región
  if (n.includes('gonzalez')) {
    if (region === 'Ponce') return 'Javier Alberto Gonzalez Acevedo'
    if (region === 'San Juan') return 'Christian Ariel Gonzalez Jimenez'
  }
  // 4) turno regular de cambaceo/canvaseo sin nombre (no evento) → coordinador primario de la región
  if (!isEvent(n) && region) {
    const primary = COORDS.find(c => c.region === region && c.regionPrimary)
    if (primary) return primary.canon
  }
  return null
}

// ── Turnos: shifts únicos (shiftId) desde allShifts ───────────────────────
const weekKeys = await listWeekKeys()
const reports = await Promise.all(weekKeys.map(k => getWeeklyReport(k)))

const seen = new Set<string>()
const byCoord = new Map<string, { compl: number; missed: number }>()
let noCoordCompl = 0, noCoordMissed = 0
const noCoordNames = new Map<string, number>()
let totalCompl = 0, totalMissed = 0

for (const report of reports) {
  if (!report) continue
  if (report.weekEnd < monthStart || report.weekStart > monthEnd) continue
  for (const sh of (report.allShifts ?? []) as ShiftRow[]) {
    if (sh.canal !== 'cambaceo') continue
    if (sh.date < monthStart || sh.date > monthEnd) continue
    if (!sh.shiftId || seen.has(sh.shiftId)) continue
    seen.add(sh.shiftId)
    const isMissed = sh.shiftStatus === 'Missed'
    // Solo cuenta Completed y Missed como "programados" (ignora Confirmed/Cancelled)
    if (sh.shiftStatus !== 'Missed' && sh.shiftStatus !== 'Completed') continue
    if (isMissed) totalMissed++; else totalCompl++
    const coord = matchCoord(sh.shiftName, sh.location)
    if (!coord) {
      if (isMissed) noCoordMissed++; else noCoordCompl++
      noCoordNames.set(sh.shiftName, (noCoordNames.get(sh.shiftName) ?? 0) + 1)
      continue
    }
    if (!byCoord.has(coord)) byCoord.set(coord, { compl: 0, missed: 0 })
    const c = byCoord.get(coord)!
    if (isMissed) c.missed++; else c.compl++
  }
}

console.log(`── Turnos únicos (shiftId) cambaceo: ${totalCompl} compl · ${totalMissed} missed · total ${totalCompl + totalMissed} ──`)
console.log(`   (PDF: 140 compl · 63 missed · 203 total)\n`)
console.log('── Por coordinador (shift único, coordinador del nombre del turno) ──')
const PDF: Record<string, string> = {
  'Roberto Luis Irizarry Alicea':     '18/10/28',
  'Javier Alberto Gonzalez Acevedo':  '21/6/27',
  'Abdiel Edmundo Oliveras Rivera':   '26/0/26',
  'Nashualiz Marquez Febres':         '7/6/13',
  'Orlando Pena Ayala':               '20/6/26',
  'Christian Ariel Gonzalez Jimenez': '23/9/32',
  'Lorenzo Trinidad Adorno':          '9/14/23',
  'Javier Andres Larregoity':         '16/12/28',
}
for (const [coord, c] of [...byCoord.entries()].sort((a, b) => (b[1].compl) - (a[1].compl))) {
  const total = c.compl + c.missed
  console.log(`  ${coord.padEnd(34)} compl=${String(c.compl).padStart(3)} missed=${String(c.missed).padStart(3)} total=${String(total).padStart(3)}   PDF=${PDF[coord] ?? '—'}`)
}
console.log(`\n  SIN COORDINADOR (carpas/eventos/orientaciones): ${noCoordCompl} compl · ${noCoordMissed} missed   (PDF: 21/4)`)
console.log(`  nombres sin match:`)
for (const [name, n] of [...noCoordNames.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(3)}×  ${name}`)
}

// ── Leads/casos por coordinador (Redshift, como hoy) ───────────────────────
const leadsByCoord = await getMonthLeadsByCoordinator(monthStart, monthEnd)
console.log(`\n── Leads/casos por coordinador (getMonthLeadsByCoordinator) ──`)
for (const c of leadsByCoord.filter(c => !norm(c.coordinador).startsWith('oficina'))) {
  console.log(`  ${c.coordinador.padEnd(34)} leads=${String(c.leads).padStart(4)} casos(ventas)=${String(c.ventas).padStart(3)}`)
}

process.exit(0)

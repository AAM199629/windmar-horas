import { getShifterShiftRows } from '@/lib/shifter-api'
import { getMonthLeadsByCoordinator, getMonthDeals } from '@/lib/redshift'
import type { ShiftRow } from '@/lib/types'

// ── Análisis de Coordinadores de Cambaceo/Canvaseo ─────────────────────────
//
// Fuentes (misma metodología que el reporte mensual del PDF):
//  • Turnos / missed → import de CSV (STIP en KV). Se cuentan por SHIFT ÚNICO
//    (shiftId) y el coordinador se deriva del NOMBRE del turno (shiftName).
//  • Leads / casos por coordinador → Redshift `getMonthLeadsByCoordinator`
//    (lead_source LIKE '%canvass%', agrupado por dim_employee.coordinador_de_canvaseo).
//  • Casos por consultor (tarjetas) → Redshift `getMonthDeals` (ventas canvassing
//    por email del vendedor).
//
// El roster de coordinadores (nombre canónico + tokens para reconocerlos en el
// shiftName + región) es config: no existe un campo estructurado de coordinador
// en el CSV, así que se identifica por el nombre del turno. Los NÚMEROS sí se
// recalculan en vivo cada mes. Si entra/sale un coordinador, edítese COORDS.

export type Region = 'Mayagüez' | 'Ponce' | 'San Juan' | 'Hatillo'

interface CoordSpec {
  canon: string          // debe coincidir con dim_employee.coordinador_de_canvaseo
  region: Region
  tokens: string[]       // substrings (sin acentos, minúsculas) que identifican al coord en el shiftName
  regionPrimary?: boolean // recibe los turnos regulares de su región que no traen nombre
}

const COORDS: CoordSpec[] = [
  { canon: 'Roberto Luis Irizarry Alicea',     region: 'Mayagüez', tokens: ['irizarry', 'roberto'], regionPrimary: true },
  { canon: 'Javier Andres Larregoity',         region: 'Mayagüez', tokens: ['larregoity'] },
  { canon: 'Javier Alberto Gonzalez Acevedo',  region: 'Ponce',    tokens: [] },
  { canon: 'Orlando Pena Ayala',               region: 'Ponce',    tokens: ['orlando', 'pena'], regionPrimary: true },
  { canon: 'Abdiel Edmundo Oliveras Rivera',   region: 'San Juan', tokens: ['abdiel', 'oliveras'], regionPrimary: true },
  { canon: 'Christian Ariel Gonzalez Jimenez', region: 'San Juan', tokens: ['christian'] },
  { canon: 'Nashualiz Marquez Febres',         region: 'San Juan', tokens: ['nashualiz', 'marquez'] },
  { canon: 'Lorenzo Trinidad Adorno',          region: 'Hatillo',  tokens: ['lorenzo', 'trinidad'] },
]

const REGION_LABEL: Record<Region, string> = {
  'Mayagüez':  'Cambaceo Mayagüez',
  'Ponce':     'Cambaceo Ponce',
  'San Juan':  'Canvassing San Juan',
  'Hatillo':   'Canvaceo Hatillo',
}

// Carpas, eventos y orientaciones NO se atribuyen a un coordinador.
const EVENT_KW = ['carpa', 'carpaceo', 'evento', 'windmarteresponde', 'orientacion', 'orientaciones', 'especial', 'actividad', 'bakery', 'bongo', 'nuxor']

function norm(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function regionOf(location: string): Region | null {
  const l = norm(location)
  if (l.includes('mayaguez')) return 'Mayagüez'
  if (l.includes('ponce'))    return 'Ponce'
  if (l.includes('san juan')) return 'San Juan'
  if (l.includes('hatillo'))  return 'Hatillo'
  return null
}

function isEvent(n: string): boolean {
  return EVENT_KW.some(k => n.includes(k))
}

/** Deriva el coordinador canónico desde el nombre del turno (y la región del location). */
export function matchCoord(shiftName: string, location: string): string | null {
  const n = norm(shiftName)
  const region = regionOf(location)
  // 1) tokens distintivos
  for (const c of COORDS) {
    if (c.tokens.some(t => n.includes(t))) return c.canon
  }
  // 2) "javier" solo → desambiguar por región
  if (n.includes('javier')) {
    if (region === 'Ponce')    return 'Javier Alberto Gonzalez Acevedo'
    if (region === 'Mayagüez') return 'Javier Andres Larregoity'
  }
  // 3) "gonzalez" solo sin nombre → por región
  if (n.includes('gonzalez')) {
    if (region === 'Ponce')    return 'Javier Alberto Gonzalez Acevedo'
    if (region === 'San Juan') return 'Christian Ariel Gonzalez Jimenez'
  }
  // 4) turno regular de cambaceo/canvaseo sin nombre (no evento) → coordinador primario de la región
  if (!isEvent(n) && region) {
    const primary = COORDS.find(c => c.region === region && c.regionPrimary)
    if (primary) return primary.canon
  }
  return null
}

// ── Tipos de salida ────────────────────────────────────────────────────────

export interface ConsultorStat {
  name: string
  email: string
  turnos: number
  casos: number
}

export interface CoordinadorAnalysis {
  nombre: string
  region: string | null       // etiqueta legible (ej. "Cambaceo Ponce")
  compl: number
  missed: number
  total: number
  efectividad: number         // compl / total  (0–1)
  leads: number
  casos: number               // ventas (leads convertidos) por coordinador
  casosPorTurno: number       // casos / compl
  consultores: ConsultorStat[]
}

export interface CoordinadoresAnalysis {
  month: string
  coordinadores: CoordinadorAnalysis[]
  totals: {
    compl: number
    missed: number
    total: number
    efectividad: number
    leads: number
    casos: number
    casosPorTurno: number
    coordinadores: number
  }
  sinCoordinador: {           // carpas / eventos / orientaciones
    compl: number
    missed: number
    total: number
    efectividad: number
  }
  topConsultores: ConsultorStat[]
}

// ── Cómputo principal ────────────────────────────────────────────────────────

export async function computeCoordinadoresAnalysis(month: string): Promise<CoordinadoresAnalysis> {
  const [year, mm] = month.split('-')
  const lastDayNum = new Date(Number(year), Number(mm), 0).getDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd   = `${year}-${mm}-${String(lastDayNum).padStart(2, '0')}`

  const [shiftRows, leadsRows, dealRows] = await Promise.all([
    getShifterShiftRows(monthStart, monthEnd).catch(() => [] as ShiftRow[]),
    getMonthLeadsByCoordinator(monthStart, monthEnd).catch(() => []),
    getMonthDeals(monthStart, monthEnd).catch(() => []),
  ])

  // Ventas canvassing por email (para casos por consultor)
  const casosByEmail = new Map<string, number>()
  for (const d of dealRows) casosByEmail.set(d.email.toLowerCase(), d.ventasCanvassing)

  // Turnos por coordinador (shift único) + consultores que participaron
  const turnos = new Map<string, { compl: number; missed: number }>()
  const consultores = new Map<string, Map<string, { name: string; turnos: number }>>()
  const sin = { compl: 0, missed: 0 }
  const seenShift = new Set<string>()

  {
    for (const sh of shiftRows) {
      if (sh.canal !== 'cambaceo') continue
      if (sh.date < monthStart || sh.date > monthEnd) continue
      if (sh.shiftStatus !== 'Completed' && sh.shiftStatus !== 'Missed') continue

      const coord = matchCoord(sh.shiftName, sh.location)
      const isMissed = sh.shiftStatus === 'Missed'

      // Turnos: se cuentan por shift ÚNICO (shiftId), atribuidos por nombre del turno
      if (sh.shiftId && !seenShift.has(sh.shiftId)) {
        seenShift.add(sh.shiftId)
        if (!coord) {
          if (isMissed) sin.missed++; else sin.compl++
        } else {
          if (!turnos.has(coord)) turnos.set(coord, { compl: 0, missed: 0 })
          const t = turnos.get(coord)!
          if (isMissed) t.missed++; else t.compl++
        }
      }

      // Consultores que participaron: por empleado (fila), turnos completados bajo ese coordinador
      if (coord && !isMissed && sh.email) {
        const email = sh.email.toLowerCase()
        if (!consultores.has(coord)) consultores.set(coord, new Map())
        const m = consultores.get(coord)!
        if (!m.has(email)) m.set(email, { name: sh.name || email, turnos: 0 })
        m.get(email)!.turnos++
      }
    }
  }

  // Leads/casos por coordinador (Redshift)
  const leadMap = new Map<string, { leads: number; ventas: number }>()
  for (const r of leadsRows) {
    if (norm(r.coordinador).startsWith('oficina')) continue
    leadMap.set(r.coordinador, { leads: r.leads, ventas: r.ventas })
  }

  // Roster = coordinadores conocidos (COORDS) ∪ los que aparezcan en leads
  const roster = new Set<string>([...COORDS.map(c => c.canon), ...leadMap.keys()])
  const specByCanon = new Map(COORDS.map(c => [c.canon, c]))

  const coordinadores: CoordinadorAnalysis[] = []
  for (const nombre of roster) {
    const t = turnos.get(nombre) ?? { compl: 0, missed: 0 }
    const l = leadMap.get(nombre) ?? { leads: 0, ventas: 0 }
    const spec = specByCanon.get(nombre)
    const total = t.compl + t.missed

    const consList: ConsultorStat[] = [...(consultores.get(nombre)?.entries() ?? [])]
      .map(([email, c]) => ({ email, name: c.name, turnos: c.turnos, casos: casosByEmail.get(email) ?? 0 }))
      .sort((a, b) => b.casos - a.casos || b.turnos - a.turnos)

    coordinadores.push({
      nombre,
      region:        spec ? REGION_LABEL[spec.region] : null,
      compl:         t.compl,
      missed:        t.missed,
      total,
      efectividad:   total > 0 ? t.compl / total : 0,
      leads:         l.leads,
      casos:         l.ventas,
      casosPorTurno: t.compl > 0 ? l.ventas / t.compl : 0,
      consultores:   consList,
    })
  }

  // Orden por casos (criterio ganador del reporte), luego efectividad
  coordinadores.sort((a, b) => b.casos - a.casos || b.efectividad - a.efectividad)

  // Totales
  const tCompl  = coordinadores.reduce((s, c) => s + c.compl, 0)
  const tMissed = coordinadores.reduce((s, c) => s + c.missed, 0)
  const tTotal  = tCompl + tMissed
  const tCasos  = coordinadores.reduce((s, c) => s + c.casos, 0)
  const tLeads  = coordinadores.reduce((s, c) => s + c.leads, 0)

  // Top consultores globales (por casos), deduplicados por email
  const consGlobal = new Map<string, ConsultorStat>()
  for (const c of coordinadores) {
    for (const cons of c.consultores) {
      if (!consGlobal.has(cons.email)) consGlobal.set(cons.email, { ...cons })
      else {
        const g = consGlobal.get(cons.email)!
        g.turnos += cons.turnos
        // casos ya es por email (mismo valor), no sumar
      }
    }
  }
  const topConsultores = [...consGlobal.values()]
    .sort((a, b) => b.casos - a.casos || b.turnos - a.turnos)
    .slice(0, 3)

  return {
    month,
    coordinadores,
    totals: {
      compl:         tCompl,
      missed:        tMissed,
      total:         tTotal,
      efectividad:   tTotal > 0 ? tCompl / tTotal : 0,
      leads:         tLeads,
      casos:         tCasos,
      casosPorTurno: tCompl > 0 ? tCasos / tCompl : 0,
      coordinadores: coordinadores.filter(c => c.total > 0 || c.casos > 0).length,
    },
    sinCoordinador: {
      compl:       sin.compl,
      missed:      sin.missed,
      total:       sin.compl + sin.missed,
      efectividad: (sin.compl + sin.missed) > 0 ? sin.compl / (sin.compl + sin.missed) : 0,
    },
    topConsultores,
  }
}

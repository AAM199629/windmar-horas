import { readFileSync } from 'fs'
import path from 'path'
import { getRedshiftPool } from './redshift'
import { parseSolarAcademySede, sortSedes, formLabel, type SolarAcademyHorario } from './constants'

// ─────────────────────────────────────────────────────────────────────────────
// Reclutamiento / Solar Academy
//
// Fuente de producción: dw_zoho.dim_sales_recruitment (ver
// scripts/ETL-REQUEST-sales-recruitment.md). Mientras el ETL no aterrice se lee
// un fixture CSV exportado del módulo (data/recruitment-seed.csv, gitignored)
// para poder desarrollar y validar contra data real.
//
// Las dos rutas producen el mismo RecruitRow, así que todo lo de abajo —
// filtros, funnel, agregaciones — corre igual con cualquiera de las dos.
// ─────────────────────────────────────────────────────────────────────────────

export const RECRUIT_SCHEMA = 'sales_recruitment'
const SEED_PATH = path.join(process.cwd(), 'data', 'recruitment-seed.csv')

/** Las 7 etapas del grupo "Solar Academy - Fechas y Detalles", en orden. */
export const STAGE_KEYS = [
  'llamado',
  'citado',
  'asistioOportunidad',
  'asistioTrainingI',
  'asistioTrainingII',
  'asistioCreaYMax',
  'reunionMentor',
] as const
export type StageKey = (typeof STAGE_KEYS)[number]

/** Encabezados del export de Zoho, en el mismo orden que STAGE_KEYS. */
const STAGE_CSV_HEADERS: Record<StageKey, string> = {
  llamado:            '(1) Llamado',
  citado:             '(2) Citado',
  asistioOportunidad: '(3) Asistio - Oportunidad',
  asistioTrainingI:   '(4) Asistio - Training I Basicos',
  asistioTrainingII:  '(5) Asistio - Training II Generando',
  asistioCreaYMax:    '(6) Asistio - Crea y Max',
  reunionMentor:      '(7) Reunión con Mentor',
}

export interface RecruitRow {
  recruitmentId: string
  name: string
  source: string
  sede: string
  horario: SolarAcademyHorario
  mentor: string | null
  /** Etiqueta legible del formulario de registro (dim_recruit_source.form_id).
   *  Segundo eje de atribución junto a `source`, no es una sede. */
  formulario: string
  salesTeamCreatedDate: string | null
  salesTeamMatchingId: string | null
  /** ISO date (YYYY-MM-DD) o null, por etapa. */
  stages: Record<StageKey, string | null>
}

export const SOURCE_VACIO = 'Sin source'
export const MENTOR_SIN_ASIGNAR = 'Sin mentor'

// ─── Etapas visibles del funnel ──────────────────────────────────────────────
// Las cuatro sesiones (3)–(6) se sellan el mismo día en 173 de 174 records del
// export: el Solar Academy es un evento de un día que cubre los 4 módulos.
// Mostrarlas como 4 barras daría 4 barras idénticas, así que se colapsan en una
// sola etapa cuyo "alcanzado" es la primera de las cuatro.

export interface FunnelStage {
  key: string
  label: string
  /** Etapas subyacentes; se alcanza si cualquiera de ellas tiene fecha. */
  members: StageKey[]
}

export const FUNNEL_STAGES: FunnelStage[] = [
  { key: 'llamado',  label: 'Llamados',          members: ['llamado'] },
  { key: 'citado',   label: 'Citados al Solar',  members: ['citado'] },
  { key: 'asistio',  label: 'Asistió al Solar',  members: ['asistioOportunidad', 'asistioTrainingI', 'asistioTrainingII', 'asistioCreaYMax'] },
  { key: 'reunion',  label: 'Reunión con Mentor', members: ['reunionMentor'] },
]

// ─── Filtros: el modelo anclado ──────────────────────────────────────────────
//
// El Solar Academy es un evento semanal (14 fechas distintas entre jun y ago
// 2026, cadencia de miércoles). Tener tres ejes de fecha independientes hacía
// que la misma fecha diera números muy distintos según en qué campo la pusieras.
//
// Ahora hay UN ancla: la fecha del Solar. Todo lo demás se deriva de ella:
//
//   Llamados   → sa_1_llamado ∈ [solarFrom − lookback, solarTo]
//   Citados    → sa_2_citado  ∈ [solarFrom, solarTo]      (citados PARA ese Solar)
//   Asistieron → primera fecha de asistencia ∈ [solarFrom, solarTo]
//   Reunión    → de los que asistieron, los que tienen (7)
//
// Cada etapa tiene su propia población: NO es una cadena de subconjuntos. En el
// export de jun–ago 2026 solo el 65% de los citados para un día fue llamado
// dentro de los 7 días previos (85% con 14 días, 95% con 30). Por eso el
// primer porcentaje es el rendimiento de esa ventana de llamadas, no una
// conversión, y `citadosDesdeVentana` expone el solapamiento real.

export const DEFAULT_LOOKBACK_DAYS = 7
export const LOOKBACK_OPTIONS = [7, 14, 21, 30] as const

export interface RecruitFilters {
  sede?: string
  horario?: SolarAcademyHorario
  source?: string
  /** Etiqueta de formulario, ya normalizada por formLabel(). */
  formulario?: string
  /** Ancla: rango de fechas del Solar Academy. */
  solarFrom?: string
  solarTo?: string
  /** Días hacia atrás desde solarFrom para contar llamadas. */
  lookbackDays?: number
}

export type SolarAcademyHorarioFilter = SolarAcademyHorario | undefined

function shiftDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sin límites igual exige que la fecha exista: "citados" sin ancla son los que
 *  tienen fecha de cita, no todo el universo. */
function inRange(date: string | null, from?: string, to?: string): boolean {
  if (!date) return false
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

/** Primera fecha de asistencia real (cualquiera de las 4 sesiones). */
export function asistioDate(row: RecruitRow): string | null {
  const ds = FUNNEL_STAGES[2].members.map(m => row.stages[m]).filter(Boolean) as string[]
  return ds.length ? ds.sort()[0] : null
}

/** Los atributos que no son de fecha; se aplican a todas las etapas por igual. */
function matchesAttrs(r: RecruitRow, f: RecruitFilters): boolean {
  if (f.sede    && r.sede    !== f.sede)    return false
  if (f.horario && r.horario !== f.horario) return false
  if (f.source  && r.source  !== f.source)  return false
  if (f.formulario && r.formulario !== f.formulario) return false
  return true
}

export interface AnchorWindow {
  /** Ventana de llamadas derivada. */
  llamadoFrom?: string
  llamadoTo?: string
  /** Rango del Solar tal como lo pidió el usuario. */
  solarFrom?: string
  solarTo?: string
  lookbackDays: number
}

export function resolveWindow(f: RecruitFilters): AnchorWindow {
  const lookbackDays = f.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  return {
    solarFrom: f.solarFrom,
    solarTo: f.solarTo,
    llamadoFrom: f.solarFrom ? shiftDays(f.solarFrom, -lookbackDays) : undefined,
    llamadoTo: f.solarTo ?? f.solarFrom,
    lookbackDays,
  }
}

/** Las cuatro poblaciones del funnel anclado. */
export interface Cohorts {
  llamados: RecruitRow[]
  citados: RecruitRow[]
  asistieron: RecruitRow[]
  conReunion: RecruitRow[]
  /** Citados para este Solar que nunca lo tomaron pero sí tuvieron reunión con
   *  mentor: el mentor les dio el Solar Academy directo. Cuentan como
   *  completados, no como no-shows. */
  fastTrack: RecruitRow[]
  /** Presentes en esa fecha sin importar para qué Solar estaban citados.
   *  Métrica de asistencia física, fuera del funnel. */
  presentesEnFecha: RecruitRow[]
  window: AnchorWindow
}

export function buildCohorts(rows: RecruitRow[], f: RecruitFilters): Cohorts {
  const w = resolveWindow(f)
  const base = rows.filter(r => matchesAttrs(r, f))

  const llamados = base.filter(r => inRange(r.stages.llamado, w.llamadoFrom, w.llamadoTo))

  // El ancla: los citados PARA este Solar. De aquí en adelante el funnel sigue
  // a esta misma cohorte, así que es una cadena de subconjuntos real.
  const citados = base.filter(r => inRange(r.stages.citado, w.solarFrom, w.solarTo))

  // El fast-track no deja fecha de asistencia: el mentor da el Solar Academy
  // directo. Sin esto se contarían como no-shows habiendo completado.
  const fastTrack = citados.filter(r => !asistioDate(r) && Boolean(r.stages.reunionMentor))
  const asistieron = citados.filter(r => Boolean(asistioDate(r)) || Boolean(r.stages.reunionMentor))
  const conReunion = asistieron.filter(r => r.stages.reunionMentor)

  // Quiénes estuvieron físicamente en esa fecha, vengan de la cita que vengan.
  // No es el funnel: hay Solares fuera de la cadencia semanal a los que llega
  // gente citada para otro día, y contarlos como numerador daba show rates
  // arriba de 100%.
  const presentesEnFecha = base.filter(r => inRange(asistioDate(r), w.solarFrom, w.solarTo))

  return { llamados, citados, asistieron, conReunion, fastTrack, presentesEnFecha, window: w }
}

/** Población para las vistas de detalle (pie de sources, tabla de mentores):
 *  todo el que estuvo involucrado con ese Solar, citado o presente. */
export function cohortUniverse(c: Cohorts): RecruitRow[] {
  const seen = new Set<string>()
  const out: RecruitRow[] = []
  for (const r of [...c.citados, ...c.presentesEnFecha]) {
    if (seen.has(r.recruitmentId)) continue
    seen.add(r.recruitmentId)
    out.push(r)
  }
  return out
}

// ─── Agregaciones ────────────────────────────────────────────────────────────

export interface FunnelStageResult {
  key: string
  label: string
  /** Qué población cuenta esta etapa, para que la barra no se lea como subconjunto. */
  hint: string
  count: number
  /** % respecto a la etapa anterior. null en la primera. */
  convFromPrev: number | null
  /** % respecto a la primera etapa. */
  convFromTop: number
  /** El % contra la etapa anterior compara dos poblaciones distintas, no un
   *  subconjunto. Solo aplica al salto Llamados → Citados. */
  crossPopulation: boolean
}

/**
 * ¿Las 4 sesiones del Solar Academy se sellan el mismo día?
 *
 * El formato cambió: en 2026 el Solar es un evento de un día que cubre los 4
 * módulos (854 de 855 con la misma fecha), pero en 2024–2025 eran sesiones
 * separadas con caída real entre ellas (op=2,850 → t1=2,626 → t2=2,201 →
 * cym=2,162). Así que el colapso no se puede hardcodear: se decide por la data
 * de la ventana seleccionada.
 */
export function sessionsCollapse(rows: RecruitRow[]): boolean {
  const conOp = rows.filter(r => r.stages.asistioOportunidad)
  if (conOp.length < 5) return true   // muy poca data: el colapso es lo simple
  const iguales = conOp.filter(r =>
    r.stages.asistioTrainingI === r.stages.asistioOportunidad &&
    r.stages.asistioTrainingII === r.stages.asistioOportunidad &&
    r.stages.asistioCreaYMax === r.stages.asistioOportunidad).length
  return iguales / conOp.length >= 0.9
}

const SESSION_LABELS: Record<StageKey, string> = {
  llamado:            'Llamados',
  citado:             'Citados',
  asistioOportunidad: 'Oportunidad',
  asistioTrainingI:   'Training I · Básicos',
  asistioTrainingII:  'Training II · Generando',
  asistioCreaYMax:    'Crea y Max',
  reunionMentor:      'Reunión con mentor',
}

export function buildFunnel(c: Cohorts): FunnelStageResult[] {
  const w = c.window
  const collapse = sessionsCollapse(c.asistieron)

  type Spec = { key: string; label: string; hint: string; rows: RecruitRow[]; cross: boolean }
  const specs: Spec[] = [
    { key: 'llamados', label: `Llamados (${w.lookbackDays}d antes)`, hint: w.llamadoFrom ? `llamadas del ${w.llamadoFrom} al ${w.llamadoTo}` : 'llamadas del período', rows: c.llamados, cross: false },
    { key: 'citados',  label: 'Citados para el Solar',               hint: 'tienen ese Solar como fecha de cita',                                                 rows: c.citados,  cross: true  },
  ]

  if (collapse) {
    specs.push({
      key: 'asistieron',
      label: 'Asistieron',
      hint: c.fastTrack.length ? `de los citados (+${c.fastTrack.length} por fast-track)` : 'de los citados',
      rows: c.asistieron,
      cross: false,
    })
  } else {
    // Las sesiones divergen en esta ventana: cada una es una etapa con su
    // propia caída, siempre contada sobre la cohorte citada.
    for (const k of ['asistioOportunidad', 'asistioTrainingI', 'asistioTrainingII', 'asistioCreaYMax'] as StageKey[]) {
      specs.push({
        key: k,
        label: SESSION_LABELS[k],
        hint: 'de los citados',
        rows: c.citados.filter(r => r.stages[k]),
        cross: false,
      })
    }
  }

  specs.push({
    key: 'reunion',
    label: 'Reunión con mentor',
    hint: 'de los que asistieron',
    rows: c.conReunion,
    cross: false,
  })

  const top = specs[0].rows.length || 0
  return specs.map((s, i) => {
    const prev = i > 0 ? specs[i - 1].rows.length : 0
    return {
      key: s.key,
      label: s.label,
      hint: s.hint,
      count: s.rows.length,
      convFromPrev: i === 0 ? null : prev ? (s.rows.length / prev) * 100 : 0,
      convFromTop: top ? (s.rows.length / top) * 100 : 0,
      crossPopulation: s.cross,
    }
  })
}

export interface SourceRow {
  source: string
  llamados: number
  citados: number
  asistieron: number
  salesTeam: number
}

export function buildSourceBreakdown(c: Cohorts): SourceRow[] {
  const map = new Map<string, SourceRow>()
  const bump = (r: RecruitRow, field: keyof Omit<SourceRow, 'source'>) => {
    let s = map.get(r.source)
    if (!s) { s = { source: r.source, llamados: 0, citados: 0, asistieron: 0, salesTeam: 0 }; map.set(r.source, s) }
    s[field]++
  }
  for (const r of c.llamados)   bump(r, 'llamados')
  for (const r of c.citados)    bump(r, 'citados')
  for (const r of c.asistieron) bump(r, 'asistieron')
  for (const r of cohortUniverse(c)) if (r.salesTeamCreatedDate) bump(r, 'salesTeam')
  return [...map.values()].sort((a, b) => b.citados - a.citados || b.llamados - a.llamados)
}

// ─── Desglose por dimensión ──────────────────────────────────────────────────

export type BreakdownDim = 'source' | 'sede' | 'formulario'

export const BREAKDOWN_DIMS: Array<{ key: BreakdownDim; label: string }> = [
  { key: 'source',     label: 'Source' },
  { key: 'sede',       label: 'Localidad' },
  { key: 'formulario', label: 'Formulario' },
]

export interface BreakdownRow {
  key: string
  llamados: number
  citados: number
  asistieron: number
  noShows: number
  fastTrack: number
  conReunion: number
  salesTeam: number
  /** Asistieron / Citados. Subconjunto real, nunca pasa de 100%. */
  showRate: number | null
  /** Citados / Llamados de la ventana. Cruza poblaciones (ver buildFunnel). */
  tasaCita: number | null
}

/**
 * Mismo funnel que la vista principal pero abierto por source o por localidad.
 * Cada fila usa exactamente las mismas cohortes, así que los totales cuadran
 * con los KPIs de arriba.
 */
export function buildBreakdown(c: Cohorts, dim: BreakdownDim): BreakdownRow[] {
  const keyOf = (r: RecruitRow) =>
    dim === 'source' ? r.source : dim === 'sede' ? r.sede : r.formulario
  const map = new Map<string, BreakdownRow>()

  const row = (k: string): BreakdownRow => {
    let x = map.get(k)
    if (!x) {
      x = { key: k, llamados: 0, citados: 0, asistieron: 0, noShows: 0, fastTrack: 0,
            conReunion: 0, salesTeam: 0, showRate: null, tasaCita: null }
      map.set(k, x)
    }
    return x
  }

  for (const r of c.llamados)   row(keyOf(r)).llamados++
  for (const r of c.citados)    row(keyOf(r)).citados++
  for (const r of c.asistieron) row(keyOf(r)).asistieron++
  for (const r of c.fastTrack)  row(keyOf(r)).fastTrack++
  for (const r of c.conReunion) row(keyOf(r)).conReunion++
  for (const r of cohortUniverse(c)) if (r.salesTeamCreatedDate) row(keyOf(r)).salesTeam++

  for (const x of map.values()) {
    x.noShows  = Math.max(x.citados - x.asistieron, 0)
    x.showRate = x.citados  ? (x.asistieron / x.citados) * 100 : null
    x.tasaCita = x.llamados ? (x.citados / x.llamados) * 100 : null
  }

  return [...map.values()].sort((a, b) => b.citados - a.citados || b.llamados - a.llamados)
}

export interface MentorRow {
  mentor: string
  /** Trainees con este mentor asignado. Ojo: la asignación es paralela al
   *  funnel, no posterior — en el export 316 de 453 nunca asistieron. */
  asignados: number
  asistieron: number
  reunionMentor: number
  salesTeam: number
  graduados: number
  conVenta: number
}

export function buildMentorRoster(
  c: Cohorts,
  outcomes: Map<string, MemberOutcome> = new Map(),
): MentorRow[] {
  const asistieronIds = new Set(c.asistieron.map(r => r.recruitmentId))
  const map = new Map<string, MentorRow>()

  for (const r of cohortUniverse(c)) {
    const key = r.mentor || MENTOR_SIN_ASIGNAR
    let m = map.get(key)
    if (!m) { m = { mentor: key, asignados: 0, asistieron: 0, reunionMentor: 0, salesTeam: 0, graduados: 0, conVenta: 0 }; map.set(key, m) }
    m.asignados++
    if (asistieronIds.has(r.recruitmentId)) m.asistieron++
    if (r.stages.reunionMentor) m.reunionMentor++
    if (r.salesTeamCreatedDate) m.salesTeam++
    const o = r.salesTeamMatchingId ? outcomes.get(r.salesTeamMatchingId) : undefined
    if (o?.graduado) m.graduados++
    if (o?.firstSale) m.conVenta++
  }
  return [...map.values()].sort((a, b) => b.asignados - a.asignados)
}

export interface RecruitKpis {
  llamados: number
  citados: number
  asistieron: number
  conReunion: number
  /** Citados / Llamados de la ventana. Rendimiento de la ventana de llamadas,
   *  no una conversión de subconjunto (ver crossPopulation). */
  tasaCita: number | null
  /** Cuántos de los citados salieron efectivamente de la ventana de llamadas.
   *  Es el puente honesto: si es muy bajo, la ventana es demasiado corta. */
  citadosDesdeVentana: number
  /** citadosDesdeVentana / citados */
  coberturaVentana: number | null
  /** Asistieron / Citados. Este sí es prácticamente un subconjunto: de los que
   *  asistieron, 162 de 174 estaban citados para el mismo día. */
  showRate: number | null
  noShows: number
  /** Completaron por fast-track (el mentor dio el Solar directo). */
  fastTrack: number
  /** Presentes en esa fecha, vengan de la cita que vengan. */
  presentesEnFecha: number
  /** De los presentes, cuántos estaban citados para este Solar. */
  presentesCitadosAqui: number
  graduados: number
  conVenta: number
  /** Graduados / Asistieron */
  tasaGraduacion: number | null
  /**
   * Con venta / Asistieron. El denominador NO son los graduados: un Trainee
   * puede vender sin haber sido promovido a Consultor, así que las ventas no
   * son subconjunto de las graduaciones. Medido en la ventana de jun–sep 2026:
   * 14 con venta contra 5 graduados, o sea un 280% si se dividiera por
   * graduados. Ambas tasas comparten denominador para ser comparables.
   */
  tasaPrimeraVenta: number | null
  /** Mediana de días desde la asistencia hasta la primera venta. */
  diasMedianosPrimeraVenta: number | null
}

export function buildKpis(c: Cohorts, outcomes: Map<string, MemberOutcome> = new Map()): RecruitKpis {
  const llamados   = c.llamados.length
  const citados    = c.citados.length
  const asistieron = c.asistieron.length

  // El solapamiento real entre la ventana de llamadas y los citados.
  const llamadosIds = new Set(c.llamados.map(r => r.recruitmentId))
  const citadosIds  = new Set(c.citados.map(r => r.recruitmentId))
  const citadosDesdeVentana = c.citados.filter(r => llamadosIds.has(r.recruitmentId)).length

  let graduados = 0, conVenta = 0
  const lags: number[] = []
  for (const r of c.asistieron) {
    const o = r.salesTeamMatchingId ? outcomes.get(r.salesTeamMatchingId) : undefined
    if (o?.graduado) graduados++
    if (o?.firstSale) {
      conVenta++
      const base = asistioDate(r)
      if (base) {
        const d = Math.round((Date.parse(o.firstSale) - Date.parse(base)) / 86_400_000)
        if (Number.isFinite(d)) lags.push(d)
      }
    }
  }

  return {
    llamados, citados, asistieron,
    conReunion: c.conReunion.length,
    tasaCita: llamados ? (citados / llamados) * 100 : null,
    citadosDesdeVentana,
    coberturaVentana: citados ? (citadosDesdeVentana / citados) * 100 : null,
    showRate: citados ? (asistieron / citados) * 100 : null,
    noShows: Math.max(citados - asistieron, 0),
    fastTrack: c.fastTrack.length,
    presentesEnFecha: c.presentesEnFecha.length,
    presentesCitadosAqui: c.presentesEnFecha.filter(r => citadosIds.has(r.recruitmentId)).length,
    graduados, conVenta,
    tasaGraduacion:   asistieron ? (graduados / asistieron) * 100 : null,
    tasaPrimeraVenta: asistieron ? (conVenta / asistieron) * 100 : null,
    diasMedianosPrimeraVenta: median(lags),
  }
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

// ─── Opciones de filtro ──────────────────────────────────────────────────────

export interface SolarDate {
  date: string
  asistieron: number
}

/** Un Solar "real" para efectos del ancla por defecto y de los atajos. */
export const SOLAR_MIN_ASISTENTES = 5

/** El Solar más reciente con volumen real; si ninguno llega al piso, el más
 *  reciente que haya. */
export function defaultSolarDate(dates: SolarDate[]): string | null {
  return dates.find(d => d.asistieron >= SOLAR_MIN_ASISTENTES)?.date ?? dates[0]?.date ?? null
}

export interface FilterOptions {
  sedes: string[]
  horarios: SolarAcademyHorario[]
  sources: string[]
  formularios: string[]
  /**
   * Fechas con asistencia registrada, más nuevas primero, con cuántos
   * asistieron. El conteo importa: además de los Solares reales (miércoles,
   * 13–14 asistentes) la data trae fechas sueltas de 1–2 personas — alguien que
   * tomó la academia fuera de cadencia. Anclar el dashboard en la fecha máxima
   * sin mirar el volumen lo abría en un funnel de 1.
   */
  solarDates: SolarDate[]
}

/** Derivadas de la data, nunca de una lista fija: una sede o source nuevo en
 *  Zoho debe aparecer en el dashboard, no desaparecer. */
export function buildFilterOptions(rows: RecruitRow[]): FilterOptions {
  const sedes = sortSedes([...new Set(rows.map(r => r.sede))])
  const horarios = (['Diurno', 'Nocturno'] as SolarAcademyHorario[])
    .filter(h => rows.some(r => r.horario === h))
  const sources = [...new Set(rows.map(r => r.source))].sort((a, b) => a.localeCompare(b, 'es'))
  const formularios = [...new Set(rows.map(r => r.formulario))].sort((a, b) => a.localeCompare(b, 'es'))
  const conteo = new Map<string, number>()
  for (const r of rows) {
    const d = asistioDate(r)
    if (d) conteo.set(d, (conteo.get(d) ?? 0) + 1)
  }
  const solarDates: SolarDate[] = [...conteo.entries()]
    .map(([date, asistieron]) => ({ date, asistieron }))
    .sort((a, b) => b.date.localeCompare(a.date))
  return { sedes, horarios, sources, formularios, solarDates }
}

// ─── Resultados en Sales Team (graduación y primera venta) ───────────────────

export interface MemberOutcome {
  memberId: string
  /** Graduado = promovido de Trainee a Consultor. */
  graduado: boolean
  /** ISO date de la primera venta activa, o null. */
  firstSale: string | null
}

/**
 * Para los reclutas que ya hicieron matching a Sales Team, trae su graduación y
 * su primera venta.
 *
 * Ojo con el fan-out documentado en lib/redshift.ts: hay emails duplicados en
 * dim_sales_team_member, así que la primera venta se agrega por email en un CTE
 * aparte antes de unirla al miembro, en vez de hacer DISTINCT sobre columnas de
 * deal.
 */
export async function getMemberOutcomes(memberIds: string[]): Promise<Map<string, MemberOutcome>> {
  const out = new Map<string, MemberOutcome>()
  if (!memberIds.length) return out

  const pool = getRedshiftPool()
  const { rows } = await pool.query(
    `
    WITH stm AS (
      SELECT member_id,
             LOWER(email) AS em,
             consultor_start_date,
             sales_role
      FROM dw_zoho.dim_sales_team_member
      WHERE member_id = ANY($1)
    ),
    ventas AS (
      SELECT LOWER(ds.sale_rep_email) AS em,
             MIN(fd.closing_date)     AS first_sale
      FROM dwh.fact_deals fd
      JOIN dwh.dim_staff ds
        ON ds.id_staff = fd.id_staff AND ds.is_current = true
      JOIN dwh.dim_status_reason dsr
        ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
      WHERE dsr.on_hold_status IS NULL
        AND COALESCE(dsr.stage, '') <> 'Cancelled'
        AND ds.sale_rep_email IS NOT NULL
      GROUP BY 1
    )
    SELECT stm.member_id,
           stm.consultor_start_date,
           stm.sales_role,
           v.first_sale
    FROM stm
    LEFT JOIN ventas v ON v.em = stm.em
    `,
    [memberIds],
  )

  for (const r of rows) {
    out.set(String(r.member_id), {
      memberId: String(r.member_id),
      graduado: Boolean(r.consultor_start_date) || (Boolean(r.sales_role) && r.sales_role !== 'Trainee'),
      firstSale: r.first_sale ? toIso(r.first_sale) : null,
    })
  }
  return out
}

// ─── Carga desde Redshift ────────────────────────────────────────────────────
//
// El ETL entregó un star schema en el schema `sales_recruitment`, no la tabla
// plana que pedimos: fact_sales_recruitment + 7 dimensiones (dim_recruit,
// _source, _geography, _staff, _profile, _timeline, _audit). El fact es el
// spine y ya resuelve a la fila vigente de cada SCD-2 — verificado: el join
// completo devuelve 59,971 filas de 59,971, sin fan-out, así que no hace falta
// repetir `is_current = true` por esta ruta.
//
// Son ~60,000 records, demasiados para cargarlos en memoria por request. La
// query trae solo la rebanada relevante a la ventana seleccionada; el cálculo
// de cohortes sigue en TS sobre ese subconjunto.

const SR = 'sales_recruitment'

/** Ventana por defecto cuando no hay ancla de fecha. */
export const NO_ANCHOR_MONTHS = 3

/** Columnas del timeline, en el mismo orden que STAGE_KEYS. */
const STAGE_COLUMNS: Record<StageKey, string> = {
  llamado:            'llamado',
  citado:             'citado',
  asistioOportunidad: 'asistio_oportunidad',
  asistioTrainingI:   'asistio_training1_basicos',
  asistioTrainingII:  'asistio_training2_generando',
  asistioCreaYMax:    'asistio_crea_y_max',
  reunionMentor:      'reunion_con_mentor',
}

let _schemaExists: boolean | null = null

/** Probe cacheado en módulo, igual que _hdUnitsAvailable en lib/finance.ts. */
export async function recruitTableExists(): Promise<boolean> {
  if (_schemaExists !== null) return _schemaExists
  try {
    const pool = getRedshiftPool()
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'fact_sales_recruitment'`,
      [SR],
    )
    _schemaExists = rows.length > 0
  } catch {
    _schemaExists = false
  }
  return _schemaExists
}

export type RecruitSource = 'redshift' | 'fixture' | 'none'

const SELECT_ROW = `
  SELECT f.zoho_recruitment_id,
         r.sales_recruitment_name,
         r.nombre_completo,
         r.recruitment_status,
         src.source,
         src.form_id,
         g.presencial_o_virtual,
         g.ciudad,
         mentor.full_name        AS mentor_nombre,
         st.sales_team_matching_id,
         t.llamado,
         t.citado,
         t.asistio_oportunidad,
         t.asistio_training1_basicos,
         t.asistio_training2_generando,
         t.asistio_crea_y_max,
         t.reunion_con_mentor,
         t.sales_team_created_date
  FROM ${SR}.fact_sales_recruitment f
  JOIN ${SR}.dim_recruit_timeline  t   ON t.id_recruit_timeline    = f.id_recruit_timeline
  JOIN ${SR}.dim_recruit           r   ON r.id_recruit             = f.id_recruit
  LEFT JOIN ${SR}.dim_recruit_source    src ON src.id_recruit_source    = f.id_recruit_source
  LEFT JOIN ${SR}.dim_recruit_geography g   ON g.id_recruit_geography   = f.id_recruit_geography
  LEFT JOIN ${SR}.dim_recruit_staff     st  ON st.id_recruit_staff      = f.id_recruit_staff
  LEFT JOIN dw_zoho.dim_sales_team_member mentor ON mentor.member_id = st.mentor_asignado_id`

/** Cualquiera de las 4 sesiones sirve como "asistió". */
const ASISTIO_SQL = `COALESCE(t.asistio_oportunidad, t.asistio_training1_basicos,
                              t.asistio_training2_generando, t.asistio_crea_y_max)`

export interface RecruitDataset {
  rows: RecruitRow[]
  source: RecruitSource
  lastDate: string | null
}

/**
 * Trae solo los records que alguna cohorte de esta ventana puede necesitar:
 * llamados dentro de la ventana de llamadas, citados para el Solar, o presentes
 * en esas fechas. Sin ancla cae a los últimos 18 meses para no arrastrar la
 * historia completa (hay `llamado` de 1945 en la data).
 */
export async function loadRecruitRows(f: RecruitFilters = {}): Promise<RecruitDataset> {
  if (!(await recruitTableExists())) {
    const rows = loadFromFixture()
    return { rows, source: rows.length ? 'fixture' : 'none', lastDate: maxDate(rows) }
  }

  const w = resolveWindow(f)
  const pool = getRedshiftPool()

  let where: string
  const params: string[] = []
  if (w.solarFrom || w.solarTo) {
    const sFrom = w.solarFrom ?? '1900-01-01'
    const sTo   = w.solarTo   ?? '2999-12-31'
    const lFrom = w.llamadoFrom ?? sFrom
    const lTo   = w.llamadoTo   ?? sTo
    params.push(lFrom, lTo, sFrom, sTo)
    where = `WHERE (t.llamado BETWEEN $1 AND $2)
                OR (t.citado  BETWEEN $3 AND $4)
                OR (${ASISTIO_SQL} BETWEEN $3 AND $4)`
  } else {
    // Sin ancla no se traen los 60k records: con 18 meses la query tardaba 31s
    // y devolvía 16,150 filas. Tres meses baja a ~2.4s. La UI etiqueta este
    // caso como "Últimos 3 meses", no como "Todos", para no mentir.
    where = `WHERE COALESCE(t.citado, ${ASISTIO_SQL}, t.llamado) >= DATEADD(month, -${NO_ANCHOR_MONTHS}, CURRENT_DATE)`
  }

  const { rows } = await pool.query(`${SELECT_ROW}\n  ${where}`, params)
  const mapped = rows.map(mapRow)
  return { rows: mapped, source: 'redshift', lastDate: maxDate(mapped) }
}

/** Opciones de los filtros, sobre el universo completo y en una sola query. */
export async function getFilterOptions(): Promise<FilterOptions> {
  if (!(await recruitTableExists())) return buildFilterOptions(loadFromFixture())

  const pool = getRedshiftPool()
  const [sedes, sources, forms, fechas] = await Promise.all([
    pool.query(`SELECT DISTINCT presencial_o_virtual AS v FROM ${SR}.dim_recruit_geography`),
    pool.query(`SELECT DISTINCT source AS v FROM ${SR}.dim_recruit_source WHERE source IS NOT NULL`),
    pool.query(`SELECT DISTINCT form_id AS v FROM ${SR}.dim_recruit_source`),
    // Fechas reales de Solar: donde hubo asistencia, con su volumen. Limitado a
    // 18 meses para que los atajos del header sean los relevantes.
    pool.query(
      `SELECT ${ASISTIO_SQL} AS d, COUNT(*) AS n
       FROM ${SR}.dim_recruit_timeline t
       WHERE ${ASISTIO_SQL} >= DATEADD(month, -18, CURRENT_DATE)
       GROUP BY 1 ORDER BY 1 DESC`,
    ),
  ])

  const parsed = sedes.rows.map((r: { v: string | null }) => parseSolarAcademySede(r.v))
  return {
    sedes: sortSedes([...new Set(parsed.map(p => p.sede))]),
    horarios: (['Diurno', 'Nocturno'] as SolarAcademyHorario[])
      .filter(h => parsed.some(p => p.horario === h)),
    sources: sources.rows.map((r: { v: string }) => r.v).sort((a, b) => a.localeCompare(b, 'es')),
    formularios: [...new Set(forms.rows.map((r: { v: string | null }) => formLabel(r.v)))]
      .sort((a, b) => a.localeCompare(b, 'es')),
    solarDates: fechas.rows.map((r: { d: unknown; n: string }) => ({ date: toIso(r.d), asistieron: Number(r.n) })),
  }
}

function mapRow(r: Record<string, unknown>): RecruitRow {
  const { sede, horario } = parseSolarAcademySede((r.presencial_o_virtual as string) ?? null)
  const stages = {} as Record<StageKey, string | null>
  for (const k of STAGE_KEYS) {
    const v = r[STAGE_COLUMNS[k]]
    stages[k] = v ? toIso(v) : null
  }
  return {
    recruitmentId: String(r.zoho_recruitment_id ?? ''),
    name: (r.sales_recruitment_name as string) || (r.nombre_completo as string) || '',
    source: ((r.source as string) ?? '').trim() || SOURCE_VACIO,
    sede, horario,
    mentor: ((r.mentor_nombre as string) ?? '').trim() || null,
    formulario: formLabel((r.form_id as string) ?? null),
    salesTeamCreatedDate: r.sales_team_created_date ? toIso(r.sales_team_created_date) : null,
    salesTeamMatchingId: r.sales_team_matching_id ? String(r.sales_team_matching_id) : null,
    stages,
  }
}

function maxDate(rows: RecruitRow[]): string | null {
  let max: string | null = null
  for (const r of rows) {
    for (const k of STAGE_KEYS) {
      const d = r.stages[k]
      if (d && (!max || d > max)) max = d
    }
  }
  return max
}

function toIso(v: unknown): string {
  if (v instanceof Date) {
    // Fecha de calendario: usar los componentes UTC para no correrla un día.
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  return String(v).slice(0, 10)
}

function pad(n: number): string { return String(n).padStart(2, '0') }

// ─── Fixture CSV (desarrollo) ────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** El export de Zoho usa "Aug 18, 2026". */
function parseZohoDate(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  const m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})$/.exec(t)
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()]
    if (mo) return `${m[3]}-${pad(mo)}-${pad(Number(m[2]))}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return null
}

/** Parser de CSV mínimo: comillas dobles y comas dentro de campos. */
function parseCsv(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else quoted = false
      } else cell += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(cell); cell = ''
    } else if (c === '\n') {
      row.push(cell); out.push(row); row = []; cell = ''
    } else if (c !== '\r') {
      cell += c
    }
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}

let _fixture: RecruitRow[] | null = null

function loadFromFixture(): RecruitRow[] {
  if (_fixture) return _fixture

  let text: string
  try {
    text = readFileSync(SEED_PATH, 'utf8')
  } catch {
    _fixture = []
    return _fixture
  }

  const table = parseCsv(text.replace(/^﻿/, ''))
  // El export trae un preámbulo (título, "Generated by…", "Record Count : N").
  const hi = table.findIndex(r => r[0]?.trim() === 'Sales Recruitment Name')
  if (hi === -1) { _fixture = []; return _fixture }

  const header = table[hi].map(h => h.trim())
  const idx = (name: string) => header.indexOf(name)
  const iName   = idx('Sales Recruitment Name')
  const iSource = idx('Source')
  const iMentor = idx('Mentor Asignado')
  const iST     = idx('Sales Team Created Date')
  const iSede   = idx('Presencial o Virtual')   // no viene en todos los exports

  const rows: RecruitRow[] = []
  for (let r = hi + 1; r < table.length; r++) {
    const cells = table[r]
    const name = (cells[iName] ?? '').trim()
    if (!name) continue

    const stages = {} as Record<StageKey, string | null>
    for (const k of STAGE_KEYS) {
      const i = idx(STAGE_CSV_HEADERS[k])
      stages[k] = i === -1 ? null : parseZohoDate(cells[i] ?? '')
    }

    const { sede, horario } = parseSolarAcademySede(iSede === -1 ? null : (cells[iSede] ?? null))
    const st = iST === -1 ? null : parseZohoDate(cells[iST] ?? '')

    rows.push({
      // El export no trae el record id; el nombre + índice sirve como llave local.
      recruitmentId: `fixture-${r}`,
      name,
      source: (cells[iSource] ?? '').trim() || SOURCE_VACIO,
      sede, horario,
      mentor: (cells[iMentor] ?? '').trim() || null,
      // El export CSV no trae form_id.
      formulario: formLabel(null),
      salesTeamCreatedDate: st,
      // El fixture no trae el ID del lookup, así que no hay outcomes de Sales Team.
      salesTeamMatchingId: null,
      stages,
    })
  }

  _fixture = rows
  return rows
}

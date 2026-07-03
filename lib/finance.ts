// ─────────────────────────────────────────────────────────────────────────────
// Capa de datos de Finanzas & ROI. Lee de Redshift (data de Zoho vía ETL) y
// aplica las fórmulas de negocio. Reusa getRedshiftPool() de ./redshift.
// ─────────────────────────────────────────────────────────────────────────────

import { getRedshiftPool } from './redshift'
import {
  SOLAR_ROOFING_PIPELINES, WATER_ANKER_PIPELINES,
  MALL_RATE_SOLAR_ROOFING, MALL_RATE_WATER_ANKER,
  HD_PRECIO_PANEL, HD_PRECIO_BATERIA, HD_PANELS_PER_KW, HD_STORES,
  MALLS,
  CAMBASEO_GUAGUA_MENSUAL, CAMBASEO_SALARIO_MENSUAL, CAMBASEO_COST_OVERRIDES,
  CAMBASEO_COMPANY_MARGIN_RATE, cambaseoComisionPorMes, CAMBASEO_EXCLUDE,
  CAMBASEO_COMISION_WATER_PPS, EVENTS,
} from './finance-config'

// Columnas en dwh.fact_deals para el cálculo exacto de placas/baterías de Home
// Depot (ya cargadas por el ETL). system_size_kw1 viene en WATTS pese al nombre.
const HD_SYSTEM_SIZE_COL = 'system_size_kw1'
const HD_BATTERY_QTY_COL = 'battery_qty'

// ── Tipos normalizados (consumidos por el frontend) ─────────────────────────────
export interface HomeDepotTienda {
  nombre: string
  deals: number
  amount: number
  paneles: number | null   // null si System Size aún no está en el warehouse
  baterias: number | null  // null si Battery Qty aún no está en el warehouse
  ingreso: number | null   // método actual: paneles*50 + baterias*200
  // Método alterno (igual que malls): % del EPC según pipeline, para comparar.
  epcSolarRoofing: number   // ventas solar/roofing (amount)
  ventasWaterAnker: number  // ventas water/Anker (amount)
  gananciaPipeline: number  // 0.15*solar + 0.10*water
}
export interface MallFinance {
  nombre: string
  costoMensual: number   // renta por mes (tarifa)
  mesesActivos: number   // meses del rango en que el mall estuvo activo
  costoPeriodo: number   // costoMensual * mesesActivos
  epcSolarRoofing: number
  ventasWaterAnker: number
  ganancia: number
  pctMeta: number        // ganancia / costoPeriodo
}
export interface BoothEvent {
  nombre: string
  fechaInicio: string
  fechaFin: string
  dias: number          // días activos dentro del rango seleccionado
  mesesActivos: number  // meses del rango en que el evento estuvo activo
  ventas: number        // # de ventas (deals) atribuidas al lugar por channel_info
  costo: number         // inversión fija * mesesActivos (no se prorratea)
  ingreso: number
  gananciaNeta: number
}
export interface Coordinador {
  nombre: string
  ventas: number
  amount: number
  comision: number
  guagua: number
  salario: number
  costoTotal: number
  gananciaCompania: number
  gananciaNeta: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

let _hdUnitsAvailable: boolean | null = null
async function hdUnitsAvailable(): Promise<boolean> {
  if (_hdUnitsAvailable !== null) return _hdUnitsAvailable
  const pool = getRedshiftPool()
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'dwh' AND table_name = 'fact_deals' AND column_name = ANY($1)`,
    [[HD_SYSTEM_SIZE_COL, HD_BATTERY_QTY_COL]],
  )
  const cols = new Set(rows.map((r: any) => r.column_name))
  _hdUnitsAvailable = cols.has(HD_SYSTEM_SIZE_COL) && cols.has(HD_BATTERY_QTY_COL)
  return _hdUnitsAvailable
}

interface BoothPipelineRow { booth: string; pipeline: string; deals: number; amount: number }

// Ventas (excluye canceladas) por booth + pipeline, para un conjunto de booths.
async function getBoothPipelineRows(from: string, to: string, booths: string[]): Promise<BoothPipelineRow[]> {
  if (!booths.length) return []
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT dod.booth AS booth, dp.pipeline AS pipeline,
           COUNT(*)::int AS deals, COALESCE(SUM(fd.amount), 0)::float8 AS amount
    FROM dwh.fact_deals fd
    JOIN dwh.dim_operations_details dod ON dod.id_operations_details = fd.id_operations_details
    JOIN dwh.dim_profiles dp            ON dp.id_profile             = fd.id_profile
    JOIN dwh.dim_status_reason dsr      ON dsr.id_status_reason      = fd.id_status_reason AND dsr.is_current = true
    JOIN dwh.dim_staff ds               ON ds.id_staff               = fd.id_staff        AND ds.is_current = true
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
      AND dod.booth = ANY($3)
    GROUP BY dod.booth, dp.pipeline
  `, [from, to, booths])
  return rows.map((r: any) => ({
    booth: r.booth, pipeline: r.pipeline, deals: Number(r.deals), amount: Number(r.amount),
  }))
}

// ── Home Depot ──────────────────────────────────────────────────────────────────
export async function getHomeDepotFinance(from: string, to: string): Promise<HomeDepotTienda[]> {
  const rows = await getBoothPipelineRows(from, to, HD_STORES)

  // Unidades reales (placas/baterías) solo si el ETL ya cargó las columnas.
  const unitsByBooth = new Map<string, { systemSizeW: number; batteryQty: number }>()
  if (await hdUnitsAvailable()) {
    const pool = getRedshiftPool()
    const { rows: u } = await pool.query(`
      SELECT dod.booth AS booth,
             COALESCE(SUM(fd.${HD_SYSTEM_SIZE_COL}), 0)::float8 AS system_size_w,
             COALESCE(SUM(fd.${HD_BATTERY_QTY_COL}), 0)::float8 AS battery_qty
      FROM dwh.fact_deals fd
      JOIN dwh.dim_operations_details dod ON dod.id_operations_details = fd.id_operations_details
      JOIN dwh.dim_status_reason dsr      ON dsr.id_status_reason      = fd.id_status_reason AND dsr.is_current = true
      JOIN dwh.dim_staff ds               ON ds.id_staff               = fd.id_staff        AND ds.is_current = true
      WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
        AND dsr.cancellation_reason IS NULL AND dsr.on_hold_status IS NULL
        AND ds.sale_rep_email IS NOT NULL
        AND dod.booth = ANY($3)
      GROUP BY dod.booth
    `, [from, to, HD_STORES])
    for (const r of u) unitsByBooth.set(r.booth, { systemSizeW: Number(r.system_size_w), batteryQty: Number(r.battery_qty) })
  }

  const solarSet = new Set(SOLAR_ROOFING_PIPELINES.map(normalize))
  const waterSet = new Set(WATER_ANKER_PIPELINES.map(normalize))

  return HD_STORES.map(store => {
    const booth = rows.filter(r => r.booth === store)
    const deals = booth.reduce((s, r) => s + r.deals, 0)
    const amount = booth.reduce((s, r) => s + r.amount, 0)
    const units = unitsByBooth.get(store)
    const paneles  = units ? Math.round((units.systemSizeW / 1000) * HD_PANELS_PER_KW) : null
    const baterias = units ? Math.round(units.batteryQty) : null
    const ingreso  = paneles != null && baterias != null
      ? paneles * HD_PRECIO_PANEL + baterias * HD_PRECIO_BATERIA
      : null
    // Método malls: % del EPC según pipeline (para comparar contra el de placas/baterías).
    const epcSolarRoofing  = booth.filter(r => solarSet.has(normalize(r.pipeline))).reduce((s, r) => s + r.amount, 0)
    const ventasWaterAnker = booth.filter(r => waterSet.has(normalize(r.pipeline))).reduce((s, r) => s + r.amount, 0)
    const gananciaPipeline = epcSolarRoofing * MALL_RATE_SOLAR_ROOFING + ventasWaterAnker * MALL_RATE_WATER_ANKER
    return { nombre: store, deals, amount, paneles, baterias, ingreso, epcSolarRoofing, ventasWaterAnker, gananciaPipeline }
  })
}

// ── Centros Comerciales (malls) ─────────────────────────────────────────────────
export async function getMallFinance(from: string, to: string): Promise<MallFinance[]> {
  // Solo malls activos en el período (traslape con su ventana del Channel Info).
  // fechaFin null = indefinido. El costo mensual se imputa completo si está activo.
  const meses = monthsInRange(from, to)
  const active = MALLS.filter(m => overlapDays(m.fechaInicio, m.fechaFin ?? FAR_FUTURE, from, to) > 0)
  if (!active.length) return []

  const rows = await getBoothPipelineRows(from, to, active.map(m => m.nombre))
  const solarSet = new Set(SOLAR_ROOFING_PIPELINES.map(normalize))
  const waterSet = new Set(WATER_ANKER_PIPELINES.map(normalize))

  return active.map(mall => {
    const booth = rows.filter(r => r.booth === mall.nombre)
    const epcSolarRoofing  = booth.filter(r => solarSet.has(normalize(r.pipeline))).reduce((s, r) => s + r.amount, 0)
    const ventasWaterAnker = booth.filter(r => waterSet.has(normalize(r.pipeline))).reduce((s, r) => s + r.amount, 0)
    const ganancia    = epcSolarRoofing * MALL_RATE_SOLAR_ROOFING + ventasWaterAnker * MALL_RATE_WATER_ANKER
    const mesesActivos = meses.filter(mm => overlapDays(mall.fechaInicio, mall.fechaFin ?? FAR_FUTURE, mm.start, mm.end) > 0).length
    const costoPeriodo = mall.costoMensual * mesesActivos
    const pctMeta     = costoPeriodo > 0 ? ganancia / costoPeriodo : 0
    return { nombre: mall.nombre, costoMensual: mall.costoMensual, mesesActivos, costoPeriodo, epcSolarRoofing, ventasWaterAnker, ganancia, pctMeta }
  })
}

// Días traslapados (inclusive) entre [aStart,aEnd] y [bStart,bEnd], en YYYY-MM-DD.
function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const s = aStart > bStart ? aStart : bStart
  const e = aEnd   < bEnd   ? aEnd   : bEnd
  if (e < s) return 0
  return Math.round((Date.parse(e) - Date.parse(s)) / 86_400_000) + 1
}

// Meses calendario tocados por [from,to], cada uno recortado al rango. Se usa para
// escalar costos fijos MENSUALES (renta malls, salario cambaseo, inversión fija de
// eventos) por cada mes activo → P&L acumulado real en rangos multi-mes.
export interface MonthSpan { year: number; month: number; start: string; end: string }
export function monthsInRange(from: string, to: string): MonthSpan[] {
  const out: MonthSpan[] = []
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7))
  const endY = Number(to.slice(0, 4)), endM = Number(to.slice(5, 7))
  while (y < endY || (y === endY && m <= endM)) {
    const mm = String(m).padStart(2, '0')
    const lastDay = new Date(y, m, 0).getDate()
    const mStart = `${y}-${mm}-01`
    const mEnd   = `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
    out.push({ year: y, month: m, start: mStart > from ? mStart : from, end: mEnd < to ? mEnd : to })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

// Ventas (excluye canceladas) por channel_info + pipeline. El ingreso de un evento
// se atribuye por el Record ID del Channel Info (dim_lead_source.channel_info), que
// identifica el evento EXACTO — el deal se enlaza vía associated_lead → fact_leads.
interface EventPipelineRow { channelInfoId: string; pipeline: string; deals: number; amount: number }
async function getEventPipelineRows(from: string, to: string, ids: string[]): Promise<EventPipelineRow[]> {
  if (!ids.length) return []
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT dls.channel_info AS channel_info, dp.pipeline AS pipeline,
           COUNT(*)::int AS deals, COALESCE(SUM(fd.amount), 0)::float8 AS amount
    FROM dwh.fact_deals fd
    JOIN dwh.fact_leads fl              ON fl.zoho_lead_id     = fd.associated_lead
    JOIN dwh.dim_lead_source dls        ON dls.id_lead_source  = fl.id_lead_source
    JOIN dwh.dim_profiles dp            ON dp.id_profile       = fd.id_profile
    JOIN dwh.dim_status_reason dsr      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    JOIN dwh.dim_staff ds               ON ds.id_staff         = fd.id_staff         AND ds.is_current = true
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL AND dsr.on_hold_status IS NULL
      AND ds.sale_rep_email IS NOT NULL
      AND dls.channel_info = ANY($3)
    GROUP BY dls.channel_info, dp.pipeline
  `, [from, to, ids])
  return rows.map((r: any) => ({ channelInfoId: String(r.channel_info), pipeline: r.pipeline, deals: Number(r.deals), amount: Number(r.amount) }))
}

// ── Booths & Eventos independientes ─────────────────────────────────────────────
// Costo = inversión fija TAL CUAL (no se prorratea). Las fechas solo cuentan los
// días activos dentro del mes para "ganancia / día". Solo se incluyen los eventos
// que traslapan el período seleccionado. fechaFin null = indefinido (sigue activo).
// TODO: cuando Channel Info entre a Redshift, leer inversión fija + fechas del
// warehouse (keyed por el mismo channel_info id) en vez de EVENTS.
const FAR_FUTURE = '9999-12-31'
export async function getBoothEventFinance(from: string, to: string): Promise<BoothEvent[]> {
  if (!EVENTS.length) return []
  const meses = monthsInRange(from, to)
  const active = EVENTS.filter(ev => overlapDays(ev.fechaInicio, ev.fechaFin ?? FAR_FUTURE, from, to) > 0)
  if (!active.length) return []

  const rows = await getEventPipelineRows(from, to, active.map(e => e.channelInfoId))
  const solarSet = new Set(SOLAR_ROOFING_PIPELINES.map(normalize))
  const waterSet = new Set(WATER_ANKER_PIPELINES.map(normalize))

  return active.map(ev => {
    const r = rows.filter(x => x.channelInfoId === ev.channelInfoId)
    const ventas = r.reduce((s, x) => s + x.deals, 0)   // # de ventas atribuidas al lugar
    const solar = r.filter(x => solarSet.has(normalize(x.pipeline))).reduce((s, x) => s + x.amount, 0)
    const water = r.filter(x => waterSet.has(normalize(x.pipeline))).reduce((s, x) => s + x.amount, 0)
    const ingreso = solar * MALL_RATE_SOLAR_ROOFING + water * MALL_RATE_WATER_ANKER
    // Inversión fija se imputa completa por cada mes activo (no se prorratea).
    const mesesActivos = meses.filter(mm => overlapDays(ev.fechaInicio, ev.fechaFin ?? FAR_FUTURE, mm.start, mm.end) > 0).length
    const costo = ev.inversionFija * mesesActivos
    return {
      nombre: ev.nombre,
      fechaInicio: ev.fechaInicio,
      fechaFin: ev.fechaFin ?? 'Indefinido',
      dias: overlapDays(ev.fechaInicio, ev.fechaFin ?? FAR_FUTURE, from, to),
      mesesActivos,
      ventas,
      costo,
      ingreso,
      gananciaNeta: ingreso - costo,
    }
  })
}

// ── Cambaseo (por coordinador) ──────────────────────────────────────────────────
export async function getCambaseoFinance(from: string, to: string, mesesCount: number): Promise<Coordinador[]> {
  const pool = getRedshiftPool()
  // Traemos solar/roofing + water/PPS agrupado por MES: la comisión de solar/roofing
  // cambia según el mes ($50 abr-sep / $100 oct-mar), así que se calcula por mes.
  // water/PPS = $10 fijo todo el año. guagua+salario = mensual × meses del rango.
  const allPipelines = [...SOLAR_ROOFING_PIPELINES, ...WATER_ANKER_PIPELINES]
  const { rows } = await pool.query(`
    SELECT de.coordinador_de_canvaseo AS coordinador, dp.pipeline AS pipeline,
           EXTRACT(MONTH FROM fd.closing_date)::int AS mes,
           COUNT(*)::int AS ventas, COALESCE(SUM(fd.amount), 0)::float8 AS amount
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds          ON ds.id_staff          = fd.id_staff        AND ds.is_current = true
    JOIN dwh.dim_profiles dp       ON dp.id_profile        = fd.id_profile
    JOIN dwh.dim_status_reason dsr ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dwh.fact_leads fl    ON fl.zoho_lead_id      = fd.associated_lead
    LEFT JOIN dwh.dim_employee de  ON de.id_employee       = fl.id_employee     AND de.is_current = true
    WHERE fd.closing_date >= $1 AND fd.closing_date <= $2
      AND dsr.cancellation_reason IS NULL AND dsr.on_hold_status IS NULL
      AND (LOWER(dms.lead_source) LIKE '%canvass%' OR LOWER(dms.lead_source) LIKE '%cambaceo%')
      AND dp.pipeline = ANY($3)
      AND de.coordinador_de_canvaseo IS NOT NULL
      AND LOWER(de.coordinador_de_canvaseo) NOT LIKE 'oficina%'
    GROUP BY de.coordinador_de_canvaseo, dp.pipeline, EXTRACT(MONTH FROM fd.closing_date)
  `, [from, to, allPipelines])

  const solarSet = new Set(SOLAR_ROOFING_PIPELINES.map(normalize))
  const meses = Math.max(1, mesesCount)

  // Merge de duplicados por acentos/espacios (ej. "Pena" vs "Peña"), acumulando la
  // comisión solar por mes (tarifa según el mes) y separando water/PPS.
  interface Acc { nombre: string; ventasSolar: number; amountSolar: number; ventasWater: number; amountWater: number; comisionSolar: number }
  const merged = new Map<string, Acc>()
  for (const r of rows) {
    const key = normalize(r.coordinador)
    if (CAMBASEO_EXCLUDE.includes(key)) continue
    const acc = merged.get(key) ?? { nombre: r.coordinador, ventasSolar: 0, amountSolar: 0, ventasWater: 0, amountWater: 0, comisionSolar: 0 }
    const ventas = Number(r.ventas), amount = Number(r.amount)
    if (solarSet.has(normalize(r.pipeline))) {
      acc.ventasSolar += ventas; acc.amountSolar += amount
      acc.comisionSolar += ventas * cambaseoComisionPorMes(Number(r.mes))
    } else {
      acc.ventasWater += ventas; acc.amountWater += amount
    }
    merged.set(key, acc)
  }

  return Array.from(merged.values()).map(c => {
    const ov = CAMBASEO_COST_OVERRIDES[normalize(c.nombre)] ?? {}
    const guagua  = (ov.guagua ?? CAMBASEO_GUAGUA_MENSUAL) * meses
    const salario = (ov.salarioMensual ?? CAMBASEO_SALARIO_MENSUAL) * meses
    const comision = c.comisionSolar + c.ventasWater * CAMBASEO_COMISION_WATER_PPS
    const costoTotal = guagua + salario + comision
    // Ganancia compañía = 15% del EPC de solar/roofing (confirmado, jul 2026).
    const gananciaCompania = c.amountSolar * CAMBASEO_COMPANY_MARGIN_RATE
    return {
      nombre: c.nombre, ventas: c.ventasSolar, amount: c.amountSolar,
      comision, guagua, salario, costoTotal,
      gananciaCompania, gananciaNeta: gananciaCompania - costoTotal,
    }
  }).sort((a, b) => b.gananciaNeta - a.gananciaNeta)
}

// ── Metadata: ¿están disponibles las unidades de Home Depot? ─────────────────────
export async function homeDepotUnitsReady(): Promise<boolean> {
  return hdUnitsAvailable()
}

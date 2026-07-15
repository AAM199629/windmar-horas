// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Finanzas & ROI — valores que NO viven en Zoho/Redshift.
// Edita los marcados con TODO con los números reales de la operación.
// ─────────────────────────────────────────────────────────────────────────────

import { MALL_BOOTH_LOCATIONS } from './constants'

// ── Categorías de pipeline (confirmadas contra dim_profiles.pipeline) ──────────
// Solar/Roofing → 15% del EPC (amount).  Water/Anker → 10% de la venta (amount).
export const SOLAR_ROOFING_PIPELINES = ['Residential Solar', 'Commercial Solar', 'Roofing']
export const WATER_ANKER_PIPELINES   = ['Water Products', 'PPS'] // PPS = Anker / portable power

export const MALL_RATE_SOLAR_ROOFING = 0.15
export const MALL_RATE_WATER_ANKER   = 0.10

// ── Home Depot ────────────────────────────────────────────────────────────────
export const HD_LUMP_SUM_SEMESTRAL = 500_000        // pago semestral a Home Depot
export const HD_PRECIO_PANEL       = 50             // ingreso por panel vendido
export const HD_PRECIO_BATERIA     = 200            // ingreso por batería vendida
export const HD_META_POR_TIENDA    = HD_LUMP_SUM_SEMESTRAL / 10  // $50,000

// Cálculo de # placas a partir de System Size (W):
//   placas = (system_size_w / 1000) * PANELS_PER_KW
// Placas de 410W ⇒ ≈2.49 placas por kW de sistema.
export const HD_PANELS_PER_KW = 2.49

export const HD_STORES = (MALL_BOOTH_LOCATIONS as readonly string[])
  .filter(l => l.startsWith('Home Depot'))

// ── Cobertura de turnos (Shifter) ────────────────────────────────────────────
// El campo `location` de los turnos (Shifter) usa nombres cortos que NO coinciden
// con los nombres canónicos de HD/Malls ni con los nombres de Zoho de los eventos.
// Se mapea explícito. El canal se infiere por sección: HD/Malls → 'mall',
// booths/eventos → 'independiente' (necesario porque, p. ej., "Hatillo" existe en
// ambos canales: HD y el Econo de Hatillo).
export const HD_SHIFT_LOCATIONS: Record<string, string[]> = {
  'Home Depot - Caguas':        ['Caguas', 'Caguas Roofing'],
  'Home Depot - Colobos':       ['Los Colobos', 'Colobos Roofing'],
  'Home Depot - Escorial':      ['Escorial', 'Escorial Roofing'],
  'Home Depot - Hatillo':       ['Hatillo', 'Hatillo Roofing'],
  'Home Depot - Humacao':       ['Humacao', 'Humacao Roofing'],
  'Home Depot - Mayaguez':      ['Mayagüez', 'Mayaguez Roofing'],
  'Home Depot - Montehiedra':   ['Montehiedra', 'Montehiedra Roofing'],
  'Home Depot - Plaza del Sol': ['Plaza del Sol', 'Plaza del Sol Roofing'],
  'Home Depot - Ponce':         ['Ponce', 'Ponce Roofing'],
  'Home Depot - Rexville':      ['Rexville', 'Rexville Roofing'],
}

// ── Centros Comerciales (malls) ─────────────────────────────────────────────────
// Costo mensual fijo por mall (inversión fija del Channel Info, "Booths Malls").
// Confirmado contra el reporte de Channel Info (jun 2026). Montehiedra es un 5.º
// mall que no estaba en MALL_BOOTH_LOCATIONS; se incluye aquí.
//
// El costo es MENSUAL recurrente, pero solo se imputa en los meses donde el mall
// está ACTIVO según sus fechas del Channel Info (getMallFinance filtra por traslape
// con el período). fechaFin null = indefinido (sigue activo). Ej: Santa Rosa abrió
// mar 9 2026 y cierra jul 9 2026 → no cobra fuera de esa ventana.
export interface MallConfig {
  nombre: string
  costoMensual: number
  fechaInicio: string
  fechaFin: string | null
  shiftLocations: string[]   // nombres del campo `location` en Shifter (canal 'mall')
}
export const MALLS: MallConfig[] = [
  { nombre: 'Malls - Plaza las Americas', costoMensual: 6_800, fechaInicio: '2020-01-01', fechaFin: null,         shiftLocations: ['Plaza las Américas'] },
  { nombre: 'Malls - Montehiedra',        costoMensual: 5_000, fechaInicio: '2020-01-01', fechaFin: null,         shiftLocations: ['Montehiedra Mall'] },
  { nombre: 'Malls - Plaza del Caribe',   costoMensual: 4_000, fechaInicio: '2020-01-01', fechaFin: null,         shiftLocations: ['Plaza del Caribe'] },
  { nombre: 'Malls - Santa Rosa',         costoMensual: 2_000, fechaInicio: '2026-03-09', fechaFin: '2026-07-09', shiftLocations: ['Santa Rosa Mall'] },
  { nombre: 'Malls - Aguadilla Mall',     costoMensual: 1_750, fechaInicio: '2024-04-01', fechaFin: null,         shiftLocations: ['Aguadilla Mall'] },
]

// ── Cambaseo (canvassing) ──────────────────────────────────────────────────────
// Costos por coordinador. Se aplican a todos por defecto; usa OVERRIDES si varían.
export const CAMBASEO_GUAGUA_MENSUAL  = 1_500          // renta guagua $1,500/mes
export const CAMBASEO_SALARIO_SEMANAL = 600            // $600/semana
export const CAMBASEO_WEEKS_PER_MONTH = 4.33
export const CAMBASEO_SALARIO_MENSUAL = CAMBASEO_SALARIO_SEMANAL * CAMBASEO_WEEKS_PER_MONTH // ≈$2,598

// Comisión por venta de solar/roofing según el mes del período:
//   abril–septiembre → $50 ; octubre–marzo → $100
export function cambaseoComisionPorMes(month1to12: number): number {
  return month1to12 >= 4 && month1to12 <= 9 ? 50 : 100
}

// Comisión por venta de PPS (Anker) y Water: $10 todo el año.
export const CAMBASEO_COMISION_WATER_PPS = 10

// Ganancia para la compañía por cada venta canvasseada = 15% del EPC de solar/roofing
// (igual que malls). Confirmado con el usuario (jul 2026).
export const CAMBASEO_COMPANY_MARGIN_RATE = 0.15

// Overrides opcionales de costo por coordinador (nombre normalizado → costos).
// Vacío = todos usan los defaults de arriba.
export const CAMBASEO_COST_OVERRIDES: Record<string, { guagua?: number; salarioMensual?: number }> = {
  // 'javier alberto gonzalez acevedo': { guagua: 600 },
}

// Nombres que aparecen en coordinador_de_canvaseo pero NO son coordinadores reales.
export const CAMBASEO_EXCLUDE = ['cuenta propia'] // 'oficina%' se excluye por patrón
// TODO: la spec listaba 7 coordinadores (Orlando Fuentes, Abtiel, Javier Gonzalez,
// Nachualis Marquez, Lorenzo, Javier Larrey Goiti, Roberto Nieves) + 1 por confirmar.
// El warehouse usa nombres formales completos (ej. "Abdiel Edmundo Oliveras Rivera").
// Confirmar el roster oficial para filtrar/renombrar si hace falta.

// ── Booths & Eventos independientes (Booth Pequeño / Evento) ─────────────────────
// La "inversión fija" y las fechas del booth viven en Zoho (módulo Channel Info) y
// aún NO están en Redshift, así que se listan aquí desde el reporte de Channel Info.
//
// El ingreso se atribuye por `channelInfoId` = el Record ID del Channel Info, que en
// el warehouse es `dwh.dim_lead_source.channel_info`. Ese ID identifica el evento
// EXACTO (no la categoría gruesa de `dod.booth`, donde 4 "SuperMax" caerían juntos).
//
// Convención (confirmada con el usuario):
//   • inversionFija = costo del booth para su período → se usa TAL CUAL (no se
//     prorratea). Cada mes que el evento esté activo se imputa su inversión completa.
//   • fechaInicio / fechaFin = duración. Se usan solo para contar los días activos
//     dentro del mes seleccionado (métrica "ganancia / día"). fechaFin null =
//     indefinido (sigue activo).
//
// TODO (cuando Channel Info entre a Redshift): reemplazar esta lista por una lectura
// del warehouse keyed por el mismo channel_info id (inversión fija + fechas).
export interface EventConfig {
  channelInfoId: string    // Record ID de Zoho = dwh.dim_lead_source.channel_info
  nombre: string           // etiqueta para el dashboard
  inversionFija: number    // costo del booth para su período (se usa tal cual)
  fechaInicio: string      // YYYY-MM-DD
  fechaFin: string | null  // YYYY-MM-DD, o null si es indefinido
  // Nombres del campo `location` en Shifter (canal 'independiente') para calcular
  // la cobertura de turnos. Vacío = sin turnos rastreables (cobertura no aplica).
  // ⚠ Los marcados con "// ?" son mapeos por confirmar (nombre en Shifter difiere).
  shiftLocations: string[]
}
export const EVENTS: EventConfig[] = [
  { channelInfoId: '4258103003238947219', nombre: 'BSI - Festival de las Flores - Aibonito', inversionFija: 4_500, fechaInicio: '2026-06-26', fechaFin: '2026-07-05', shiftLocations: ['Evento - Festival de las Flores', 'Evento - Festival de las Flores (trailer)'] },
  { channelInfoId: '4258103003236715021', nombre: 'Supermax - De Diego - San Juan',          inversionFija: 2_200, fechaInicio: '2026-06-22', fechaFin: '2026-07-19', shiftLocations: ['Supermax - De Diego'] },
  { channelInfoId: '4258103003236715011', nombre: 'Supermax - Guaynabo',                     inversionFija: 1_100, fechaInicio: '2026-06-22', fechaFin: '2026-07-05', shiftLocations: ['Supermax Los Frailes - Guaynabo'] }, // ?
  { channelInfoId: '4258103003236715001', nombre: 'Hospital San Lucas - Ponce',              inversionFija:   450, fechaInicio: '2026-06-22', fechaFin: '2026-09-22', shiftLocations: ['Hospital San Lucas'] },
  { channelInfoId: '4258103003223893444', nombre: 'Amigo - Ceiba',                           inversionFija: 1_200, fechaInicio: '2026-06-15', fechaFin: '2026-07-14', shiftLocations: ['Supermercado Amigo Monte sol - Ceiba'] },
  { channelInfoId: '4258103003223893105', nombre: 'Supermax - Cidra',                        inversionFija: 1_900, fechaInicio: '2026-04-13', fechaFin: '2026-07-05', shiftLocations: ['Supermax - Cidra'] },
  { channelInfoId: '4258103003223893010', nombre: 'Econo Los Colobos - Carolina',            inversionFija: 1_600, fechaInicio: '2026-06-01', fechaFin: '2026-07-30', shiftLocations: ['Los Colobos - Carolina'] },
  { channelInfoId: '4258103003223031859', nombre: 'Econo - Florida',                         inversionFija:   600, fechaInicio: '2026-06-08', fechaFin: '2026-07-07', shiftLocations: ['Florida'] },
  { channelInfoId: '4258103003221652173', nombre: 'National Ferretería - Manatí',            inversionFija: 1_000, fechaInicio: '2026-06-01', fechaFin: '2026-08-02', shiftLocations: ['National - Manatí'] },
  { channelInfoId: '4258103003221652172', nombre: 'Supermax - Dorado',                       inversionFija: 2_000, fechaInicio: '2026-06-08', fechaFin: '2026-07-05', shiftLocations: ['Supermax - Dorado'] },
  { channelInfoId: '4258103003221652170', nombre: 'Cooperativa Floricoop - Florida',         inversionFija:     0, fechaInicio: '2026-04-27', fechaFin: null,         shiftLocations: ['Cooperativa - Floridacoop'] },
  { channelInfoId: '4258103003221652169', nombre: 'Pueblo Las Cumbres - Guaynabo',           inversionFija: 1_500, fechaInicio: '2026-05-05', fechaFin: '2026-07-03', shiftLocations: ['Supermercado Pueblo - Las Cumbres'] },
  { channelInfoId: '4258103003221652164', nombre: 'Econo - Hatillo',                         inversionFija: 1_500, fechaInicio: '2023-10-01', fechaFin: null,         shiftLocations: ['Hatillo'] }, // ?
  { channelInfoId: '4258103002341384844', nombre: 'Econo - Naranjito',                       inversionFija: 1_250, fechaInicio: '2025-01-16', fechaFin: '2026-07-01', shiftLocations: ['Naranjito'] },
]

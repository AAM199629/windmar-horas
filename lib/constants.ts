export const MALL_BOOTH_LOCATIONS = [
  'Home Depot - Caguas',
  'Home Depot - Colobos',
  'Home Depot - Escorial',
  'Home Depot - Hatillo',
  'Home Depot - Humacao',
  'Home Depot - Mayaguez',
  'Home Depot - Montehiedra',
  'Home Depot - Plaza del Sol',
  'Home Depot - Ponce',
  'Home Depot - Rexville',
  'Malls - Plaza las Americas',
  'Malls - Plaza del Caribe',
  'Malls - Santa Rosa',
  'Malls - Aguadilla Mall',
] as const

export const LOCATION_ORDER = [
  'Home Depot - Caguas',
  'Home Depot - Colobos',
  'Home Depot - Escorial',
  'Home Depot - Hatillo',
  'Home Depot - Humacao',
  'Home Depot - Mayaguez',
  'Home Depot - Montehiedra',
  'Home Depot - Plaza del Sol',
  'Home Depot - Ponce',
  'Home Depot - Rexville',
  'Malls - Aguadilla Mall',
  'Malls - Plaza del Caribe',
  'Malls - Plaza las Americas',
  'Malls - Santa Rosa',
] as const

export const EMPLEADO_ROLES = [
  'Empleado - Consultor',
  'Empleado - Lider',
  'Empleado - Gerente',
] as const

// ─── Regiones Windmar (según foto de oficinas regionales) ────────────────────

export const REGION_TOWNS: Record<string, string[]> = {
  'Mayagüez':      ['Moca','Aguada','Rincón','Añasco','Las Marías','Mayagüez','Maricao','Hormigueros','Sabana Grande','San Germán','Cabo Rojo','Lajas','Guánica','Aguadilla'],
  'Hatillo':       ['Isabela','Quebradillas','San Sebastián','Hatillo','Camuy','Lares','Morrovis','Utuado','Arecibo','Florida','Barceloneta','Ciales','Orocovis','Manatí'],
  'Ponce':         ['Adjuntas','Yauco','Villalba','Guayanilla','Santa Isabel','Jayuya','Peñuelas','Ponce','Coamo','Aibonito','Salinas','Juana Díaz'],
  'San Juan I y III': ['Dorado','Corozal','Cataño','Toa Baja','Naranjito','Guaynabo','Bayamón','Trujillo Alto','Vega Baja','Barranquitas','San Juan','Carolina','Canóvanas','Loíza','Río Grande','Luquillo','Fajardo','Vega Alta'],
  'San Juan II':   ['Comerío','Gurabo','Juncos','Naguabo','Ceiba','Caguas','Las Piedras','Humacao','Aguas Buenas','Cayey','Cidra','Guayama','Patillas','Arroyo','Yabucoa','Maunabo','San Lorenzo'],
}

export const BOOTH_REGIONS: Record<string, string> = {
  'Home Depot - Caguas':           'San Juan II',
  'Home Depot - Colobos':          'San Juan I y III',
  'Home Depot - Escorial':         'San Juan I y III',
  'Home Depot - Hatillo':          'Hatillo',
  'Home Depot - Humacao':          'San Juan II',
  'Home Depot - Mayaguez':         'Mayagüez',
  'Home Depot - Montehiedra':      'San Juan I y III',
  'Home Depot - Plaza del Sol':    'San Juan I y III',
  'Home Depot - Ponce':            'Ponce',
  'Home Depot - Rexville':         'San Juan I y III',
  'Malls - Plaza las Americas':    'San Juan I y III',
  'Malls - Plaza del Caribe':      'Ponce',
  'Malls - Santa Rosa':            'San Juan I y III',
  'Malls - Aguadilla Mall':        'Mayagüez',
}

export const BOOTH_REGIONS_ORDER = ['San Juan I y III', 'San Juan II', 'Ponce', 'Hatillo', 'Mayagüez'] as const

export function getSellerRegion(ciudad: string | null): string {
  if (!ciudad) return 'Sin región'
  const norm = ciudad.toLowerCase().trim()
  for (const [region, towns] of Object.entries(REGION_TOWNS)) {
    if (towns.some(t => t.toLowerCase() === norm)) return region
  }
  return 'Sin región'
}

// ─── Solar Academy (reclutamiento) ───────────────────────────────────────────
// El campo `presencial_o_virtual` del módulo Sales Recruitment mete dos ejes en
// un solo string: la sede y el horario. Ej: 'Presencial Ponce' vs
// 'Presencial Ponce Nocturno'. Los separamos para que el header tenga pills de
// sede (~6) y un toggle aparte de horario, en vez de ~10 pills.
//
// Ojo: esto NO es el mismo eje que REGION_TOWNS / getSellerRegion(). Ahí la
// región sale de la ciudad del vendedor; aquí sale de dónde se dio la academia.

export type SolarAcademyHorario = 'Diurno' | 'Nocturno'

export interface SolarAcademySede {
  sede: string
  horario: SolarAcademyHorario
}

export const SEDE_SIN_DEFINIR = 'Sin sede'

/** Orden de los pills. Solo fija orden y color — nunca filtra: una sede nueva
 *  en Zoho debe aparecer en el dashboard, no desaparecer. */
export const SOLAR_ACADEMY_SEDES = [
  'Sabana Seca',
  'San Juan',
  'Ponce',
  'Hatillo',
  'Mayagüez',
  'Virtual',
  'Solar Academy Móvil',
] as const

export const SEDE_COLORS: Record<string, string> = {
  'Sabana Seca':         '#1D429B',
  'San Juan':            '#2E6BC4',
  'Ponce':               '#E87722',
  'Hatillo':             '#5B8CFF',
  'Mayagüez':            '#7C3AED',
  'Virtual':             '#22C7E6',
  'Solar Academy Móvil': '#1FD79B',
  [SEDE_SIN_DEFINIR]:    '#8A8A8F',
}

/** Quita acentos y baja a minúsculas, para comparar sin importar la grafía. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const SEDE_BY_FOLDED = new Map(SOLAR_ACADEMY_SEDES.map(s => [fold(s), s as string]))

/**
 * Parsea un valor del picklist `presencial_o_virtual` en sus dos ejes.
 *
 *   'Presencial Ponce'            → { sede: 'Ponce',     horario: 'Diurno'   }
 *   'Presencial Ponce Nocturno'   → { sede: 'Ponce',     horario: 'Nocturno' }
 *   'Virtual'                     → { sede: 'Virtual',   horario: 'Diurno'   }
 *   null                          → { sede: 'Sin sede',  horario: 'Diurno'   }
 *
 * La data de Redshift trae el picklist sucio y hay que normalizarlo o la misma
 * sede sale partida en varios pills. Casos reales medidos sobre 59,971 records:
 *
 *   'Presencial  San Juan'        (doble espacio)  2,777 filas
 *   'Presencial San Juan'                          1,130 filas
 *   'Presencial Mayaguez'         (sin acento)     1,451 filas
 *   'Presencial Mayagüez'         (con acento)       172 filas
 *   'Presencial San Juan Nocturn' (truncado)          25 filas
 *
 * De ahí que se colapse el espacio, se acepte 'Nocturn' sin la o final, y se
 * canonicalice la sede comparando sin acentos.
 */
export function parseSolarAcademySede(value: string | null): SolarAcademySede {
  const raw = (value ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return { sede: SEDE_SIN_DEFINIR, horario: 'Diurno' }

  // 'Nocturn' y 'Nocturno' son el mismo turno; el truncado existe en la data.
  const nocturno = /\bnocturnos?\b\s*$/i.test(raw) || /\bnocturn\b\s*$/i.test(raw)
  const horario: SolarAcademyHorario = nocturno ? 'Nocturno' : 'Diurno'

  let sede = raw
    .replace(/\s*\bnocturnos?\b\s*$/i, '')
    .replace(/\s*\bnocturn\b\s*$/i, '')
    .replace(/^presencial\b\s*/i, '')
    .trim()

  if (!sede) return { sede: SEDE_SIN_DEFINIR, horario }

  // Canonicaliza la grafía (Mayaguez → Mayagüez) sin descartar valores nuevos.
  sede = SEDE_BY_FOLDED.get(fold(sede)) ?? sede

  return { sede, horario }
}

/** Ordena sedes por SOLAR_ACADEMY_SEDES; las desconocidas van al final, alfabéticas. */
export function sortSedes(sedes: string[]): string[] {
  const rank = (s: string) => {
    const i = (SOLAR_ACADEMY_SEDES as readonly string[]).indexOf(s)
    return i === -1 ? SOLAR_ACADEMY_SEDES.length : i
  }
  return [...sedes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'es'))
}

export function getSedeColor(sede: string): string {
  return SEDE_COLORS[sede] ?? '#8A8A8F'
}

// ─── Formularios de reclutamiento ────────────────────────────────────────────
// `dim_recruit_source.form_id` es el formulario / landing por el que la persona
// se registró. Es un segundo eje de atribución junto a `source`, NO una sede:
// los 6 records de 'Solar-Academy-Alverio' traen source='Referido - Vendedor' y
// 4 de ellos sede 'Presencial Sabana Seca Nocturno'.

export const FORM_SIN_DEFINIR = 'Sin formulario'

/** Nombres legibles para los form_id que el negocio reconoce por nombre. */
export const FORM_LABELS: Record<string, string> = {
  'Solar-Academy-Alverio':        'Solar Academy Móvil',
  'formFeriaReclutamientoSanJuan': 'Feria Reclutamiento San Juan',
  'formFeriaReclutamiento':        'Feria Reclutamiento',
  'Reclutamiento':                 'Formulario Reclutamiento',
}

/**
 * Etiqueta legible de un form_id. Los IDs numéricos son formularios de Meta y
 * los `LP_Reclutamiento_<id>` son landing pages generadas: se agrupan por
 * familia en vez de mostrar decenas de IDs sueltos en la tabla.
 */
export function formLabel(formId: string | null): string {
  const raw = (formId ?? '').trim()
  if (!raw) return FORM_SIN_DEFINIR
  if (FORM_LABELS[raw]) return FORM_LABELS[raw]
  if (/^LP_Reclutamiento_/i.test(raw)) return 'Landing pages'
  if (/^consultor-/i.test(raw)) return 'Landing pages'
  if (/^\d+$/.test(raw)) return 'Formularios Meta'
  return raw
}

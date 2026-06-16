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

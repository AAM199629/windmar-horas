import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface Vendedor {
  name: string
  email: string | null
  salesRole: string | null
  ciudad: string | null
  supervisorRegional: string | null
}

// Column IDs from REAL VENDEDORES DIRECTOS (sheet 3063424633595780)
const SHEET_ID   = '3063424633595780'
const COL_NAME   = '614455598966660'
const COL_EMAIL  = '1740355505809284'
const COL_ROLE   = '9003701401610116'
const COL_CIUDAD = '8468361738407812'
const COL_SUPER  = '8388371799664516'

const CACHE_KEY = 'horas:vendedores'
const CACHE_TTL = 60 * 60 * 6 // 6 hours

function parseRows(data: any): Vendedor[] {
  const rows: any[] = data.rows ?? []
  return rows.map((row: any) => {
    const cells: Record<string, string> = {}
    for (const cell of row.cells ?? []) {
      cells[String(cell.columnId)] = cell.displayValue ?? cell.value ?? ''
    }
    return {
      name:               cells[COL_NAME]   || '',
      email:              cells[COL_EMAIL]  ? cells[COL_EMAIL].toLowerCase() : null,
      salesRole:          cells[COL_ROLE]   || null,
      ciudad:             cells[COL_CIUDAD] || null,
      supervisorRegional: cells[COL_SUPER]  || null,
    }
  })
}

export async function getVendedores(): Promise<Vendedor[]> {
  // Try Redis cache
  const cached = await redis.get<any>(CACHE_KEY)
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached as Vendedor[]

  const token = process.env.SMARTSHEET_API_TOKEN
  if (!token) return []

  const url = `https://api.smartsheet.com/2.0/sheets/${SHEET_ID}` +
    `?columnIds=${COL_NAME},${COL_EMAIL},${COL_ROLE},${COL_CIUDAD},${COL_SUPER}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return []

  const data = await res.json()
  const vendedores = parseRows(data)
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(vendedores))
  return vendedores
}

export function buildVendedorMap(vendedores: Vendedor[]): Map<string, Vendedor> {
  const map = new Map<string, Vendedor>()
  for (const v of vendedores) {
    if (v.email) map.set(v.email.toLowerCase(), v)
  }
  return map
}

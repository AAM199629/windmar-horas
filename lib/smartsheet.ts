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

// ── Individual Follow Up sheet ────────────────────────────────────────────────

const FU_SHEET_ID   = '8150231922567044'
const FU_COL_NOMBRE = '7647964410734468'
const FU_COL_EMAIL  = '5475470548461444'
const FU_COL_LEADS  = '2018464876521348'
const FU_COL_CITAS  = '222712743389060'
const FU_COL_ORIENT = '2765184940435332'

const FU_CACHE_KEY = 'horas:followup'
const FU_CACHE_TTL = 60 * 60 * 6

export interface FollowUpEntry {
  nombre: string
  email: string | null
  leads: number | null
  citas: number | null
  orientaciones: number | null
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function parseFollowUpRows(data: any): FollowUpEntry[] {
  return (data.rows ?? []).map((row: any) => {
    const cells: Record<string, any> = {}
    for (const cell of row.cells ?? []) {
      cells[String(cell.columnId)] = cell.displayValue ?? cell.value ?? null
    }
    return {
      nombre:        String(cells[FU_COL_NOMBRE] ?? ''),
      email:         cells[FU_COL_EMAIL] ? String(cells[FU_COL_EMAIL]).toLowerCase() : null,
      leads:         toNum(cells[FU_COL_LEADS]),
      citas:         toNum(cells[FU_COL_CITAS]),
      orientaciones: toNum(cells[FU_COL_ORIENT]),
    }
  }).filter((e: FollowUpEntry) => e.nombre.trim())
}

export async function getIndividualFollowUpData(): Promise<Map<string, FollowUpEntry>> {
  const cached = await redis.get<any>(FU_CACHE_KEY)
  if (cached) {
    const entries: FollowUpEntry[] = typeof cached === 'string' ? JSON.parse(cached) : cached
    return buildFollowUpMap(entries)
  }

  const token = process.env.SMARTSHEET_API_TOKEN
  if (!token) return new Map()

  const url = `https://api.smartsheet.com/2.0/sheets/${FU_SHEET_ID}` +
    `?columnIds=${FU_COL_NOMBRE},${FU_COL_EMAIL},${FU_COL_LEADS},${FU_COL_CITAS},${FU_COL_ORIENT}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return new Map()

  const data = await res.json()
  const entries = parseFollowUpRows(data)
  await redis.setex(FU_CACHE_KEY, FU_CACHE_TTL, JSON.stringify(entries))
  return buildFollowUpMap(entries)
}

function buildFollowUpMap(entries: FollowUpEntry[]): Map<string, FollowUpEntry> {
  const map = new Map<string, FollowUpEntry>()
  for (const e of entries) {
    if (e.email) map.set(e.email, e)
    map.set(e.nombre.toLowerCase(), e)
  }
  return map
}

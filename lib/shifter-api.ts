// ── Shifter (UWE) API client ───────────────────────────────────────────────
//
// Fuente de verdad para turnos y ponches (reemplaza el gap de sincronización de
// STIP). Login por email/contraseña → JWT de 7 días; luego se consulta el motor
// genérico de entidades UWE. Toda la documentación verificada vive en
// shifter-api-guia-consumidor.md (NO versionado).
//
// Gotchas manejados aquí:
//   • shiftAllocations viene como STRING JSON (hay que parsear).
//   • allocation.userId es un OBJETO {id,name,email,…}, no un escalar.
//   • clockIn/clockOut vienen en UTC en dos formatos (ISO-8601 y MM/DD/YYYY);
//     se convierten a hora LOCAL por región (PR = AST fijo, FL = US Eastern/DST)
//     para cuadrar con el export manual y la UI existente.
//   • La cuenta de servicio ve PR + FL; por defecto filtramos a PR.

import type { ShiftRow } from './types'
import { resolveCanal } from './shifter'

const BASE = process.env.SHIFTER_BASE_URL ?? 'https://backend.windmar.akcelita.com'
const ENTITY_TYPE = 'Shift Instance'

// ── Auth: token cacheado en memoria del proceso, re-login al expirar ────────

let cachedToken: string | null = null

function tokenExpired(tok: string): boolean {
  try {
    const payload = tok.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    // margen de 60s para no usar un token a punto de vencer
    return (json.exp ?? 0) < Date.now() / 1000 + 60
  } catch {
    return true
  }
}

async function getToken(): Promise<string> {
  if (cachedToken && !tokenExpired(cachedToken)) return cachedToken

  const email = process.env.SHIFTER_EMAIL
  const password = process.env.SHIFTER_PASSWORD
  if (!email || !password) {
    throw new Error('SHIFTER_EMAIL / SHIFTER_PASSWORD no configurados en el entorno')
  }

  const res = await fetch(`${BASE}/api/security/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Shifter login falló (HTTP ${res.status})`)

  const j = await res.json()
  const token: string | undefined = j?.data?.token
  if (!token) throw new Error('Shifter login: token ausente en la respuesta')

  cachedToken = token
  return token
}

// ── Listado paginado de Shift Instances por rango de fecha ──────────────────

interface ShifterItem {
  id: number
  metadata: {
    jobStatus?: string
    shiftDate?: string
    jobTypeTitle?: string
    locationName?: string
    name?: string
    startTime?: string
    endTime?: string
    region?: string
    shiftAllocations?: string
  }
}

// El backend redondea size a múltiplos de 10 (máx 15000). Ordenar por shiftDate
// (no único) hace inestable la paginación entre páginas (filas que saltan de
// página → conteos que varían entre llamadas). Con un rango acotado por fecha
// el volumen cabe holgado en una sola página, así que pedimos el máximo y
// evitamos el problema por completo. El loop queda como respaldo por si un
// rango excepcional excede 15000 filas.
const PAGE_SIZE = 15000

async function fetchShiftInstances(from: string, to: string): Promise<ShifterItem[]> {
  const token = await getToken()
  const items: ShifterItem[] = []
  let offset = 0

  // safety: un rango normal (semana/mes) no debería exceder ~15 páginas
  for (let page = 0; page < 30; page++) {
    const qs = new URLSearchParams({
      offset: String(offset),
      size: String(PAGE_SIZE),
      sortBy: 'metadata.shiftDate',
      list: 'all',            // incluye no-asignados a la cuenta
      closedStatus: 'both',   // incluye cerrados (Cancelled/Missed además de open)
      'metadata-date-greaterthanorequal-shiftDate': from,
      'metadata-date-lessthanorequal-shiftDate': to,
    })
    const url = `${BASE}/api/uwe-entities/${encodeURIComponent(ENTITY_TYPE)}/list?${qs}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Shifter list falló (HTTP ${res.status})`)

    const j = await res.json()
    const pageItems: ShifterItem[] = j?.items ?? []
    const count: number = j?.count ?? pageItems.length
    items.push(...pageItems)

    if (pageItems.length === 0 || items.length >= count) break
    offset += PAGE_SIZE
  }

  return items
}

// ── Helpers de parseo/timezone ──────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Timestamp UTC (ISO-8601 con Z, o "MM/DD/YYYY HH:MM:SS" almacenado en UTC) → Date
function parseUtc(val?: string | null): Date | null {
  if (!val || val === '---') return null
  if (val.includes('T')) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const d = new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:${m[6]}Z`)
  return isNaN(d.getTime()) ? null : d
}

function tzForRegion(region?: string): string {
  const r = (region ?? '').toLowerCase()
  // PR es AST todo el año (sin DST); FL (Orlando/Tampa/Miami) usa US Eastern con DST.
  if (r.includes('puerto rico') || r === 'pr') return 'America/Puerto_Rico'
  return 'America/New_York'
}

// Date UTC → "HH:MM" en la zona local de la región
function toLocalHHMM(d: Date | null, tz: string): string {
  if (!d) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00'
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${hh}:${mm}`
}

// Duración clockIn→clockOut como "HH:MM" (formato del campo shiftHours del CSV)
function durationHHMM(inDt: Date | null, outDt: Date | null): string {
  if (!inDt || !outDt) return ''
  const ms = outDt.getTime() - inDt.getTime()
  if (ms <= 0) return '00:00'
  const mins = Math.round(ms / 60000) // el export manual redondea al minuto
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
}

// ── Allocation cruda dentro de metadata.shiftAllocations ────────────────────

interface Allocation {
  userId?: { id?: number | string; name?: string; email?: string }
  status?: string
  clockIn?: string
  clockOut?: string
  secondClockIn?: string
  secondClockOut?: string
  adminClockInFlag?: boolean
  adminClockOutFlag?: boolean
  adminClockOut?: string // "Admin Clock Out Time" (timestamp)
  autoClockout?: boolean
  reasonForLeaving?: string
}

function parseAllocations(raw?: string): Allocation[] {
  if (!raw || raw.trim() === '' || raw === '[]') return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// ── Normalización Shifter → ShiftRow[] ──────────────────────────────────────

type RegionFilter = 'PR' | 'FL' | 'all'

function inRegion(region: string | undefined, filter: RegionFilter): boolean {
  if (filter === 'all') return true
  const isPR = (region ?? '').toLowerCase().includes('puerto rico')
  return filter === 'PR' ? isPR : !isPR
}

function itemsToRows(items: ShifterItem[], filter: RegionFilter): ShiftRow[] {
  const rows: ShiftRow[] = []

  for (const it of items) {
    const m = it.metadata ?? {}
    if (!inRegion(m.region, filter)) continue

    const shiftType = m.jobTypeTitle ?? ''
    const canal = resolveCanal(shiftType)
    const tz = tzForRegion(m.region)
    const base = {
      shiftId:     String(it.id),
      shiftName:   m.name ?? '',
      location:    m.locationName ?? '',
      shiftType,
      shiftStatus: m.jobStatus ?? '',   // paridad con la columna "Shift Status" del export
      date:        m.shiftDate ?? '',
      startTime:   (m.startTime ?? '').slice(0, 5),
      endTime:     (m.endTime ?? '').slice(0, 5),
      region:      m.region ?? '',
      canal,
    }

    const allocs = parseAllocations(m.shiftAllocations)

    if (allocs.length === 0) {
      // turno vacío (típicamente Missed/Cancelled) → una fila sin persona,
      // igual que la fila "---" del export manual (cuenta como turno creado).
      rows.push({
        ...base,
        name: '', email: '', userId: '',
        clockIn: '', adminClockIn: 'No', clockOut: '', adminClockOut: 'No',
        autoClockedOut: 'No', shiftHours: '', reasonForLeaving: '',
      })
      continue
    }

    for (const a of allocs) {
      const inDt  = parseUtc(a.clockIn)
      const outDt = parseUtc(a.clockOut) ?? parseUtc(a.adminClockOut) // fallback a admin clock-out time
      rows.push({
        ...base,
        name:             a.userId?.name ?? '',
        email:            (a.userId?.email ?? '').toLowerCase(),
        userId:           a.userId?.id != null ? String(a.userId.id) : '',
        clockIn:          toLocalHHMM(inDt, tz),
        adminClockIn:     a.adminClockInFlag ? 'Yes' : 'No',
        clockOut:         toLocalHHMM(outDt, tz),
        adminClockOut:    a.adminClockOutFlag ? 'Yes' : 'No',
        autoClockedOut:   a.autoClockout ? 'Yes' : 'No',
        shiftHours:       durationHHMM(inDt, outDt),
        reasonForLeaving: a.reasonForLeaving ?? '',
      })
    }
  }

  return rows
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Trae los turnos (turno × persona asignada) de Shifter para el rango dado,
 * normalizados al mismo ShiftRow que produce el CSV manual y STIP.
 * Por defecto filtra a Puerto Rico (paridad con el export manual histórico).
 */
export async function getShifterShiftRows(
  from: string, // YYYY-MM-DD
  to: string,   // YYYY-MM-DD
  opts: { region?: RegionFilter } = {},
): Promise<ShiftRow[]> {
  const items = await fetchShiftInstances(from, to)
  return itemsToRows(items, opts.region ?? 'PR')
}

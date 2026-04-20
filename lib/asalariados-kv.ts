import { Redis } from '@upstash/redis'
import type { VentaRow } from './ventas'

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const VENTAS_ROWS_KEY    = 'asalariados:ventas:rows'
const VENTAS_DATE_KEY    = 'asalariados:ventas:uploadedAt'
const COMUNICADO_PREFIX  = 'asalariados:comunicado:'

// ── Ventas rows ───────────────────────────────────────────────────────────────

export async function saveVentasRows(rows: VentaRow[]): Promise<void> {
  await redis.set(VENTAS_ROWS_KEY, JSON.stringify(rows))
  await redis.set(VENTAS_DATE_KEY, new Date().toISOString())
}

export async function getVentasRows(): Promise<VentaRow[]> {
  const raw = await redis.get<string | VentaRow[]>(VENTAS_ROWS_KEY)
  if (!raw) return []
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function getVentasUploadedAt(): Promise<string | null> {
  return redis.get<string>(VENTAS_DATE_KEY)
}

// ── Comunicado approvals ──────────────────────────────────────────────────────

export interface ComunicadoRecord {
  nombre: string
  status: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  memo1?: string   // ISO date approved
  memo2?: string
  memo3?: string
  updatedAt: string
}

export async function getComunicado(nombre: string): Promise<ComunicadoRecord | null> {
  const key = COMUNICADO_PREFIX + encodeURIComponent(nombre.toLowerCase())
  const raw = await redis.get<string | ComunicadoRecord>(key)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function setComunicado(record: ComunicadoRecord): Promise<void> {
  const key = COMUNICADO_PREFIX + encodeURIComponent(record.nombre.toLowerCase())
  await redis.set(key, JSON.stringify({ ...record, updatedAt: new Date().toISOString() }))
}

export async function getAllComunicados(): Promise<ComunicadoRecord[]> {
  const keys = await redis.keys(`${COMUNICADO_PREFIX}*`)
  if (!keys.length) return []
  const vals = await Promise.all(keys.map(k => redis.get<string | ComunicadoRecord>(k)))
  return vals
    .filter(Boolean)
    .map(v => (typeof v === 'string' ? JSON.parse(v) : v) as ComunicadoRecord)
}

import { Redis } from '@upstash/redis'
import type { WeeklyReport } from './types'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const KEY_PREFIX = 'horas:week:'
const INDEX_KEY  = 'horas:weeks'

export async function saveWeeklyReport(report: WeeklyReport): Promise<void> {
  const key = KEY_PREFIX + report.weekKey
  await redis.set(key, JSON.stringify(report))
  await redis.sadd(INDEX_KEY, report.weekKey)
}

export async function getWeeklyReport(weekKey: string): Promise<WeeklyReport | null> {
  const raw = await redis.get<string>(KEY_PREFIX + weekKey)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw as WeeklyReport
}

export async function listWeekKeys(): Promise<string[]> {
  const keys = await redis.smembers<string[]>(INDEX_KEY)
  return keys.sort().reverse()
}

export async function getLatestReport(): Promise<WeeklyReport | null> {
  const keys = await listWeekKeys()
  if (!keys.length) return null
  return getWeeklyReport(keys[0])
}

export async function deleteWeeklyReport(weekKey: string): Promise<void> {
  await redis.del(KEY_PREFIX + weekKey)
  await redis.srem(INDEX_KEY, weekKey)
}

// ── Bingo data (written by bingo.windmar.com) ──────────────────────────────

export async function getBingoPlayers(month: string): Promise<string[]> {
  const members = await redis.smembers<string[]>(`bingo:players:${month}`)
  return members ?? []
}

export async function getBingoBoard(email: string, month: string): Promise<boolean[] | null> {
  const raw = await redis.get(`bingo:board:${email}:${month}`)
  if (raw == null) return null
  if (Array.isArray(raw)) return raw as boolean[]
  if (typeof raw === 'string') return JSON.parse(raw) as boolean[]
  return null
}

export async function getBingoUserName(email: string): Promise<string | null> {
  const raw = await redis.get(`bingo:user:${email}`)
  if (raw == null) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && 'name' in (raw as object)) return (raw as Record<string, string>).name
  return String(raw)
}

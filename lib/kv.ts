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

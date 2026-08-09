import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

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

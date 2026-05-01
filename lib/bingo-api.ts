export interface BingoLBRow {
  email: string
  name: string
  board: boolean[]
  lines: number
  completed: number
  earned: number
}

export async function getBingoLeaderboard(month: string): Promise<BingoLBRow[]> {
  const base  = process.env.BINGO_APP_URL?.replace(/\/$/, '')
  const token = process.env.BINGO_API_TOKEN
  if (!base || !token) return []

  const res = await fetch(
    `${base}/api/bingo/leaderboard?month=${month}&token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.leaderboard ?? []
}

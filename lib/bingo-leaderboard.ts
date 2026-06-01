import { getBingoPlayers, getBingoBoard, getBingoUserName } from './kv'

export interface BingoLBRow {
  email: string
  name: string
  board: boolean[]   // 25 elements — board[12] = FREE center
  lines: number
  completed: number  // 0-24, excludes FREE
  earned: number
}

// 5 rows + 5 cols + 2 diagonals
const BINGO_LINES: number[][] = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
  [0,6,12,18,24], [4,8,12,16,20],
]

const LINE_PRIZE = 175
const FULL_PRIZE = 700

function computeLines(board: boolean[]): number {
  return BINGO_LINES.filter(line => line.every(i => board[i])).length
}

export async function computeBingoLeaderboard(month: string): Promise<BingoLBRow[]> {
  const players = await getBingoPlayers(month)
  if (!players.length) return []

  const rows: BingoLBRow[] = []

  await Promise.all(players.map(async (email) => {
    const [board, name] = await Promise.all([
      getBingoBoard(email, month),
      getBingoUserName(email),
    ])

    if (!board) return

    const lines     = computeLines(board)
    const completed = board.filter((v, i) => v && i !== 12).length
    const earned    = lines * LINE_PRIZE + (completed === 24 ? FULL_PRIZE : 0)

    rows.push({ email, name: name ?? email, board, lines, completed, earned })
  }))

  return rows.sort((a, b) => b.completed - a.completed || b.lines - a.lines)
}

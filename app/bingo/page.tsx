import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getBingoLeaderboard } from '@/lib/bingo-api'
import BingoClient from './BingoClient'

export const dynamic = 'force-dynamic'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function BingoPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || (role !== 'admin' && role !== 'supervisor')) redirect('/')

  const { month: qMonth } = await searchParams
  const month = qMonth ?? currentMonth()

  const leaderboard = await getBingoLeaderboard(month).catch(() => [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bingo — Leaderboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Retos completados y premios ganados · {leaderboard.length} vendedores
        </p>
      </div>
      <BingoClient leaderboard={leaderboard} month={month} />
    </div>
  )
}

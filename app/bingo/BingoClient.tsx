'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { BingoLBRow } from '@/lib/bingo-leaderboard'

// Matches UNIFIED_BOARD.cells in windmar-bingo/lib/challenges.ts
// Challenge index i maps to board[i < 12 ? i : i + 1] (board[12] is FREE center)
const CELLS = [
  { icon: '🏠', text: 'Cierra 5 ventas en la semana' },
  { icon: '⚡', text: 'Primera venta antes del mediodía' },
  { icon: '📋', text: 'Genera 10 leads calificados en un día' },
  { icon: '🔥', text: 'Cierra 3 ventas en un solo día' },
  { icon: '🌟', text: 'Convierte 5 leads en citas en un día' },
  { icon: '💡', text: 'Una venta por LightReach' },
  { icon: '🏬', text: 'Trabaja 2 fines de semana corridos en Booth Malls' },
  { icon: '🏪', text: 'Trabaja 1 domingo en HD' },
  { icon: '☀️', text: 'Vende sistema >10 kW' },
  { icon: '🚀', text: 'Vende combo solar + batería' },
  { icon: '🚶', text: 'Participa en 3 cambaceos en una semana' },
  { icon: '🚶', text: '3 ventas de Canvassing' },
  { icon: '✅', text: 'Ponches perfectos en una semana' },
  { icon: '🎯', text: 'Participa en los 3 canales en una misma semana' },
  { icon: '🌙', text: '2 turnos 4-9pm en una semana' },
  { icon: '📦', text: '1 venta de cada producto en el mes' },
  { icon: '🌅', text: 'Primera venta antes de las 10am' },
  { icon: '📝', text: 'Registra leads en todos tus turnos de la semana' },
  { icon: '🛒', text: '3 ventas por Booth y Eventos' },
  { icon: '🗓️', text: 'Genera 3 citas en un turno' },
  { icon: '💪', text: '5 días consecutivos prospectando' },
  { icon: '📊', text: 'Genera leads en 5 turnos consecutivos' },
  { icon: '🏅', text: '3 cierres de Booth Malls & HD' },
  { icon: '🔥', text: 'Genera leads en cada canal en una misma semana' },
]

const MONTH_LABELS: Record<string, string> = {
  '01': 'Enero',    '02': 'Febrero',   '03': 'Marzo',     '04': 'Abril',
  '05': 'Mayo',     '06': 'Junio',     '07': 'Julio',     '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MONTH_LABELS[m] ?? m} ${y}`
}

function getMonths(): string[] {
  const months: string[] = []
  const now   = new Date()
  const start = new Date(2026, 0, 1)
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d >= start) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return months
}

function cellDone(board: boolean[], challengeIdx: number): boolean {
  return board?.[challengeIdx < 12 ? challengeIdx : challengeIdx + 1] ?? false
}

function KpiBox({ label, value, color = 'text-slate-900' }: {
  label: string; value: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 min-w-[130px]">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function BingoClient({
  leaderboard,
  month,
}: {
  leaderboard: BingoLBRow[]
  month: string
}) {
  const router   = useRouter()
  const months   = getMonths()
  const totalEarned = leaderboard.reduce((s, r) => s + r.earned, 0)
  const withLines   = leaderboard.filter(r => r.lines > 0).length

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  function showTooltip(e: React.MouseEvent<HTMLTableCellElement>, text: string) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top })
  }

  return (
    <div className="space-y-6">
      {/* Fixed-position tooltip — not clipped by overflow-x-auto */}
      {tooltip && (
        <div
          className="fixed z-[9999] px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Month selector + KPIs */}
      <div className="flex flex-wrap items-start gap-4">
        <select
          value={month}
          onChange={e => router.push(`/bingo?month=${e.target.value}`)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#00A651] bg-white"
        >
          {months.map(m => (
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-3">
          <KpiBox label="Vendedores" value={String(leaderboard.length)} />
          <KpiBox label="Con líneas" value={String(withLines)} color="text-[#1565C0]" />
          <KpiBox label="Total ganado" value={`$${totalEarned.toLocaleString()}`} color="text-[#00A651]" />
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          No hay datos para {fmtMonth(month)}.
          {!process.env.NEXT_PUBLIC_BINGO_CONFIGURED
            ? ' Verifica que BINGO_APP_URL y BINGO_API_TOKEN estén configurados en Vercel.'
            : ' Verifica que el sync del Bingo se haya corrido para este mes.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase sticky left-10 bg-slate-50 z-10 min-w-[180px]">Vendedor</th>
                {CELLS.map((c, i) => (
                  <th
                    key={i}
                    className="px-0.5 py-2.5 text-center w-8 text-base font-normal cursor-default"
                    onMouseEnter={e => showTooltip(e, c.text)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {c.icon}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Hecho</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Líneas</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Ganado</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr
                  key={row.email}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-2 py-2.5 sticky left-0 bg-white z-10 text-center w-10">
                    {idx < 3
                      ? <span className="text-base leading-none">{MEDALS[idx]}</span>
                      : <span className="text-slate-400 text-xs font-medium">{idx + 1}</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 sticky left-10 bg-white z-10 min-w-[180px]">
                    <p className="font-semibold text-[#0D1654] leading-tight truncate max-w-[220px]">{row.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{row.email}</p>
                  </td>
                  {CELLS.map((_, i) => (
                    <td key={i} className="px-0.5 py-2.5 text-center w-8">
                      {cellDone(row.board, i)
                        ? <span className="text-[#00A651] font-bold text-sm leading-none">✓</span>
                        : <span className="text-slate-200 text-sm leading-none select-none">·</span>
                      }
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">
                    {row.completed}/24
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-[#1565C0]">
                    {row.lines}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${row.earned > 0 ? 'text-[#00A651]' : 'text-slate-300'}`}>
                    {row.earned > 0 ? `$${row.earned.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

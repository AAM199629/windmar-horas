'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  weeks: string[]
  isAdmin: boolean
}

export default function WeeksManager({ weeks, isAdmin }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmWeek, setConfirmWeek] = useState<string | null>(null)

  async function handleDelete(week: string) {
    setDeleting(week)
    setConfirmWeek(null)
    await fetch(`/api/upload/${week}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  if (weeks.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Semanas guardadas</h2>
      <div className="flex flex-wrap gap-2">
        {weeks.map(w => (
          <div key={w} className="flex items-center gap-1">
            <Link
              href={`/horas?week=${w}`}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-[#00A651] hover:text-[#00A651] transition-colors"
            >
              {w}
            </Link>

            {isAdmin && confirmWeek !== w && (
              <button
                onClick={() => setConfirmWeek(w)}
                disabled={deleting === w}
                title="Borrar este import"
                className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
              >
                ✕
              </button>
            )}

            {isAdmin && confirmWeek === w && (
              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <span className="text-xs text-red-700 font-medium">¿Borrar {w}?</span>
                <button
                  onClick={() => handleDelete(w)}
                  disabled={deleting === w}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                >
                  {deleting === w ? '…' : 'Sí'}
                </button>
                <button
                  onClick={() => setConfirmWeek(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-1"
                >
                  No
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

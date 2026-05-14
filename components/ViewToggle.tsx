'use client'

import { useRouter } from 'next/navigation'

export default function ViewToggle({
  currentView,
  hrefHoras,
  hrefPerformance,
}: {
  currentView: 'horas' | 'performance'
  hrefHoras: string
  hrefPerformance: string
}) {
  const router = useRouter()

  const base     = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
  const active   = `${base} bg-[#0D1654] text-white`
  const inactive = `${base} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50`

  return (
    <div className="flex gap-2">
      <button
        className={currentView === 'horas' ? active : inactive}
        onClick={() => router.push(hrefHoras)}
      >
        Horas
      </button>
      <button
        className={currentView === 'performance' ? active : inactive}
        onClick={() => router.push(hrefPerformance)}
      >
        Performance
      </button>
    </div>
  )
}

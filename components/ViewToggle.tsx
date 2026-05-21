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

  const active   = 'px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#0D1654] text-white shadow-md transition-all'
  const inactive = 'px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all'

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 shadow-md shadow-slate-200/50">
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

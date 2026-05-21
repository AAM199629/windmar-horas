'use client'

import { useRouter } from 'next/navigation'

export default function MallViewToggle({ current }: { current: 'dashboard' | 'turnos' }) {
  const router = useRouter()
  const base     = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
  const active   = `${base} bg-[#0D1654] text-white`
  const inactive = `${base} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50`

  return (
    <div className="flex gap-2">
      <button
        className={current === 'dashboard' ? active : inactive}
        onClick={() => router.push('/canales/mall?view=dashboard')}
      >
        Dashboard
      </button>
      <button
        className={current === 'turnos' ? active : inactive}
        onClick={() => router.push('/canales/mall?view=turnos')}
      >
        Turnos
      </button>
    </div>
  )
}

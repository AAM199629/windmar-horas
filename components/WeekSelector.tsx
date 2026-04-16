'use client'

import { useRouter } from 'next/navigation'

export default function WeekSelector({ weeks, current }: { weeks: string[]; current: string }) {
  const router = useRouter()
  return (
    <select
      value={current}
      onChange={e => router.push(`?week=${e.target.value}`)}
      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 shadow-sm"
    >
      {weeks.map(w => (
        <option key={w} value={w}>{w}</option>
      ))}
    </select>
  )
}

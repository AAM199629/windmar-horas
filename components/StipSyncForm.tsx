'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function StipSyncForm() {
  const router = useRouter()
  const today = new Date()
  const monday = getMondayOfWeek(today)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const [weekStart, setWeekStart] = useState(toDateInput(monday))
  const [weekEnd,   setWeekEnd]   = useState(toDateInput(sunday))
  const [state,     setState]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result,    setResult]    = useState<Record<string, unknown> | null>(null)

  async function handleSync() {
    setState('loading')
    setResult(null)
    try {
      const res = await fetch('/api/upload/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, weekEnd }),
      })
      const json = await res.json()
      if (res.ok) {
        setState('success')
        setResult(json)
        router.refresh()
      } else {
        setState('error')
        setResult(json)
      }
    } catch (e: any) {
      setState('error')
      setResult({ error: e.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1654]/30"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
          <input
            type="date"
            value={weekEnd}
            onChange={e => setWeekEnd(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1654]/30"
          />
        </div>
      </div>

      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="w-full bg-[#0D1654] hover:bg-[#1a2a7a] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {state === 'loading' ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
            </svg>
            Sincronizando…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
            </svg>
            Sincronizar desde STIP
          </>
        )}
      </button>

      {state === 'success' && result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-800">Sincronización exitosa</p>
          <p className="text-emerald-700 mt-0.5">
            Semana <strong>{String(result.weekKey)}</strong> · {String(result.employees)} empleados · {String(result.totalShifts)} turnos
          </p>
        </div>
      )}

      {state === 'error' && result && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-red-700 mt-0.5">{String((result as any).error)}</p>
        </div>
      )}
    </div>
  )
}

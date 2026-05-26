'use client'

import { useState, useEffect, useCallback } from 'react'
import ChannelView from './ChannelView'
import type { Canal, WeeklyReport } from '@/lib/types'

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  return m
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [y, m, day] = iso.split('-')
  return `${day}/${m}/${y}`
}

interface Props {
  canal: Canal
}

export default function StipTurnosView({ canal }: Props) {
  const today  = new Date()
  const monday = getMondayOfWeek(today)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const [from,    setFrom]    = useState(toISO(monday))
  const [to,      setTo]      = useState(toISO(sunday))
  const [report,  setReport]  = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stip/shifts?from=${f}&to=${t}`)
      if (res.status === 404) { setReport(null); setLoading(false); return }
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Error desconocido')
      }
      setReport(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(from, to) }, [load, from, to])

  const metrics = report?.channels[canal]

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1654]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1654]/30"
          />
        </div>
        {report && (
          <p className="text-xs text-slate-400 pb-1">
            {formatDate(report.weekStart)} → {formatDate(report.weekEnd)}
            {' · '}{metrics?.turnosPonchados ?? 0} turnos completados
          </p>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 py-16 justify-center text-slate-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
          Cargando turnos desde STIP…
        </div>
      )}

      {!loading && error && (
        <div className="py-8 text-center text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && !metrics && (
        <div className="py-16 text-center text-slate-400">
          No hay turnos de {canal} para ese período.
        </div>
      )}

      {!loading && !error && metrics && (
        <ChannelView
          metrics={metrics}
          weekStart={report!.weekStart}
          weekEnd={report!.weekEnd}
        />
      )}
    </div>
  )
}

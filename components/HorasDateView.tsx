'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import HorasClient from './HorasClient'
import NominaSection from './NominaSection'
import type { WeeklyReport, EmployeeSummary } from '@/lib/types'
import type { SalariadoForNomina } from './NominaSection'

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

const JOB_TITLE_MAP: Record<string, string> = {
  'Empleado - Consultor': 'Consultor Energético',
  'Empleado - Lider':     'Líder Energético',
  'Empleado - Gerente':   'Gerente de Ventas - Asalariado',
}

type VEntry = { ciudad: string | null; salesRole: string | null; supervisorRegional: string | null }
type AEntry = { hireDate: string | null; terminationDate: string | null }
type ActiveAsalariado = {
  email:           string
  fullName:        string
  salesRole:       string
  hireDate:        string | null
  terminacionDate: string | null
}
type ActivePromotor = {
  email:     string
  fullName:  string
  salesRole: string
  hireDate:  string | null
}

interface Props {
  vendedorMap:       Record<string, VEntry>
  asalariadoMap:     Record<string, AEntry>
  activeAsalariados: ActiveAsalariado[]
  activePromotores:  ActivePromotor[]
  promotorEmails:    string[]
  role:              string | undefined
}

export default function HorasDateView({ vendedorMap, asalariadoMap, activeAsalariados, activePromotores, promotorEmails, role }: Props) {
  const promotorSet = new Set(promotorEmails)
  const searchParams = useSearchParams()
  const today  = new Date()
  const monday = getMondayOfWeek(today)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  // Honor ?from&to from the URL (e.g. when opened from an imported file row),
  // otherwise default to the current week.
  const [from,    setFrom]    = useState(searchParams.get('from') ?? toISO(monday))
  const [to,      setTo]      = useState(searchParams.get('to')   ?? toISO(sunday))
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

  const enriched = (report?.employees ?? []).map(emp => {
    const key = emp.email.toLowerCase()
    const workerType: 'promotor' | 'asalariado' | 'otro' =
      asalariadoMap[key] ? 'asalariado' : promotorSet.has(key) ? 'promotor' : 'otro'
    return {
      ...emp,
      ciudad:             vendedorMap[key]?.ciudad             ?? null,
      salesRole:          vendedorMap[key]?.salesRole          ?? null,
      supervisorRegional: vendedorMap[key]?.supervisorRegional ?? null,
      workerType,
    }
  })

  // Nómina debe listar TODOS los asalariados activos (Consultor/Líder/Gerente),
  // hayan o no reportado horas esta semana. Los que no reportaron salen con 0h
  // para que nóminas los registre como que no cumplieron.
  const reportedByEmail = new Map(enriched.map(e => [e.email.toLowerCase(), e]))
  const byEmail = new Map<string, SalariadoForNomina>()

  for (const a of activeAsalariados) {
    const jobTitle = JOB_TITLE_MAP[a.salesRole]
    if (!jobTitle) continue
    const key   = a.email.toLowerCase()
    const rep   = reportedByEmail.get(key)
    const horas = rep?.horasConACO ?? 0
    byEmail.set(key, {
      name:            a.fullName,
      email:           a.email,
      jobTitle,
      horasWorked:     horas,
      metHoursAuto:    horas >= 24.5,
      hireDate:        a.hireDate ?? asalariadoMap[key]?.hireDate ?? null,
      terminationDate: a.terminacionDate ?? asalariadoMap[key]?.terminationDate ?? null,
    })
  }

  // Incluir también a quien reportó horas como asalariado pero no figura en el
  // roster activo (p. ej. terminado recientemente pero trabajó esta semana).
  for (const e of enriched) {
    const key = e.email.toLowerCase()
    if (byEmail.has(key)) continue
    if (!(e.salesRole && JOB_TITLE_MAP[e.salesRole])) continue
    const rd = asalariadoMap[key]
    byEmail.set(key, {
      name:            e.name,
      email:           e.email,
      jobTitle:        JOB_TITLE_MAP[e.salesRole!],
      horasWorked:     e.horasConACO,
      metHoursAuto:    e.horasConACO >= 24.5,
      hireDate:        rd?.hireDate        ?? null,
      terminationDate: rd?.terminationDate ?? null,
    })
  }

  const salariadosForNomina: SalariadoForNomina[] = [...byEmail.values()]
    .sort((a, b) => a.name.localeCompare(b.name))

  // Roster de promotores para el reporte de nómina de promotores. Mismo patrón:
  // TODOS los promotores activos + horas de quien reportó esta semana. Sin umbral
  // de "cumplió" (metHoursAuto siempre false; se marca manualmente si aplica).
  const promotorByEmail = new Map<string, SalariadoForNomina>()
  for (const p of activePromotores) {
    const key   = p.email.toLowerCase()
    const rep   = reportedByEmail.get(key)
    const horas = rep?.horasConACO ?? 0
    promotorByEmail.set(key, {
      name:            p.fullName,
      email:           p.email,
      jobTitle:        p.salesRole || 'Promotor',
      horasWorked:     horas,
      metHoursAuto:    false,
      hireDate:        p.hireDate ?? null,
      terminationDate: null,
    })
  }
  for (const e of enriched) {
    const key = e.email.toLowerCase()
    if (promotorByEmail.has(key)) continue
    if (e.workerType !== 'promotor') continue
    promotorByEmail.set(key, {
      name:            e.name,
      email:           e.email,
      jobTitle:        e.salesRole || 'Promotor',
      horasWorked:     e.horasConACO,
      metHoursAuto:    false,
      hireDate:        null,
      terminationDate: null,
    })
  }
  const promotoresForNomina: SalariadoForNomina[] = [...promotorByEmail.values()]
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
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
            {report.weekStart} → {report.weekEnd} · {report.employees.length} empleados
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-16 justify-center text-slate-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
          Cargando turnos desde Shifter…
        </div>
      )}

      {!loading && error && (
        <div className="py-8 text-center text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && !report && (
        <div className="py-16 text-center text-slate-400">
          No hay turnos para ese período.
        </div>
      )}

      {!loading && !error && report && (
        <>
          <HorasClient employees={enriched} />

          {(role === 'admin' || role === 'supervisor') && (
            <NominaSection
              weekKey={report.weekKey}
              weekStart={report.weekStart}
              weekEnd={report.weekEnd}
              salaried={salariadosForNomina}
              promotores={promotoresForNomina}
            />
          )}
        </>
      )}
    </div>
  )
}

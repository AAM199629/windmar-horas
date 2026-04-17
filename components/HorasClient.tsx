'use client'

import { useState, useMemo } from 'react'
import EmployeeCard from './EmployeeCard'
import type { EmployeeSummary } from '@/lib/types'

type EnrichedEmployee = EmployeeSummary & {
  ciudad: string | null
  salesRole: string | null
  supervisorRegional: string | null
}

const ROLES = [
  'Consultor',
  'Empleado - Consultor',
  'Empleado - Lider',
  'Empleado - Gerente',
  'Lider',
  'Gerente',
  'Trainee',
]

export default function HorasClient({ employees }: { employees: EnrichedEmployee[] }) {
  const [roleFilter, setRoleFilter]     = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [search, setSearch]             = useState('')

  const allRegions = useMemo(() => {
    const set = new Set<string>()
    employees.forEach(e => { if (e.supervisorRegional) set.add(e.supervisorRegional) })
    return Array.from(set).sort()
  }, [employees])

  const filtered = useMemo(() => employees.filter(e => {
    if (roleFilter   && e.salesRole !== roleFilter) return false
    if (regionFilter === '__sin__' && e.supervisorRegional) return false
    if (regionFilter && regionFilter !== '__sin__' && e.supervisorRegional !== regionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false
    }
    return true
  }), [employees, roleFilter, regionFilter, search])

  const totalSinACO = filtered.reduce((a, e) => a + e.horasSinACO, 0)
  const totalConACO = filtered.reduce((a, e) => a + e.horasConACO, 0)
  const totalTurnos = filtered.reduce((a, e) => a + e.totalTurnos, 0)

  // Group by supervisorRegional; those without go to '__sin__'
  const grouped = useMemo(() => {
    const map = new Map<string, EnrichedEmployee[]>()
    for (const e of filtered) {
      const key = e.supervisorRegional ?? '__sin__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [filtered])

  const sortedRegions = useMemo(() => {
    const keys = Array.from(grouped.keys()).filter(k => k !== '__sin__').sort()
    if (grouped.has('__sin__')) keys.push('__sin__')
    return keys
  }, [grouped])

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Empleados" value={filtered.length} />
        <Stat label="Turnos totales" value={totalTurnos} />
        <Stat label="Horas sin ACO" value={totalSinACO.toFixed(1) + 'h'} green />
        <Stat label="Horas con ACO" value={totalConACO.toFixed(1) + 'h'} />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5 flex flex-wrap gap-3 items-center shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>

        <input
          type="text"
          placeholder="Buscar empleado…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C] w-44"
        />

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E88B0C]"
        >
          <option value="">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E88B0C]"
        >
          <option value="">Todas las regiones</option>
          {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="__sin__">Sin región asignada</option>
        </select>

        {(roleFilter || regionFilter || search) && (
          <button
            onClick={() => { setRoleFilter(''); setRegionFilter(''); setSearch('') }}
            className="text-xs text-slate-400 hover:text-red-500 transition ml-auto"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* Grouped employees */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No hay empleados con estos filtros.</p>
      ) : (
        <div className="space-y-6">
          {sortedRegions.map(regionKey => {
            const group = grouped.get(regionKey)!
            const label = regionKey === '__sin__' ? 'Sin Región Asignada' : regionKey
            const isSin = regionKey === '__sin__'
            return (
              <div key={regionKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    style={{ background: isSin ? '#94a3b8' : '#0D1654' }}
                    className="h-1 w-6 rounded-full"
                  />
                  <h2
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", color: isSin ? '#64748b' : '#0D1654' }}
                    className="text-lg font-bold tracking-wide uppercase"
                  >
                    {label}
                  </h2>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {group.length} empleado{group.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.map(emp => (
                    <EmployeeCard
                      key={emp.email}
                      emp={emp}
                      badge={emp.salesRole ?? undefined}
                      ciudad={emp.ciudad ?? undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, green }: { label: string; value: string | number; green?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${green ? 'text-[#00A651]' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

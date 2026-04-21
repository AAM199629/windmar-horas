'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SalariadoForNomina {
  name: string
  email: string
  jobTitle: string
  horasWorked: number
  metHoursAuto: boolean
}

interface EntryState {
  name: string
  email: string
  jobTitle: string
  horasWorked: number
  metHoursAuto: boolean
  hireDate: string
  metHoursOverride: boolean | null
  sickHours: number
  vacationHours: number
  paid: boolean
  comments: string
  terminationDate: string
}

interface Props {
  weekKey: string
  weekStart: string
  weekEnd: string
  salaried: SalariadoForNomina[]
}

const JOB_ORDER = ['Consultor Energético', 'Gerente de Ventas - Asalariado', 'Líder Energético']

export default function NominaSection({ weekKey, weekStart, weekEnd, salaried }: Props) {
  const [entries, setEntries] = useState<Record<string, EntryState>>({})
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const initEntries = useCallback((saved: Record<string, any> | null) => {
    const init: Record<string, EntryState> = {}
    for (const s of salaried) {
      const sv = saved?.[s.email]
      init[s.email] = {
        name:             s.name,
        email:            s.email,
        jobTitle:         s.jobTitle,
        horasWorked:      s.horasWorked,
        metHoursAuto:     s.metHoursAuto,
        hireDate:         sv?.hireDate          ?? '',
        metHoursOverride: sv?.metHoursOverride  ?? null,
        sickHours:        sv?.sickHours         ?? 0,
        vacationHours:    sv?.vacationHours      ?? 0,
        paid:             sv?.paid              ?? s.metHoursAuto,
        comments:         sv?.comments          ?? '',
        terminationDate:  sv?.terminationDate   ?? '',
      }
    }
    return init
  }, [salaried])

  useEffect(() => {
    fetch(`/api/nomina/${weekKey}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        if (data?.entries) {
          const savedMap: Record<string, any> = {}
          for (const e of data.entries) savedMap[e.email] = e
          setEntries(initEntries(savedMap))
        } else {
          setEntries(initEntries(null))
        }
      })
  }, [weekKey, initEntries])

  function update(email: string, field: keyof EntryState, value: any) {
    setEntries(prev => ({ ...prev, [email]: { ...prev[email], [field]: value } }))
  }

  function metHours(e: EntryState) {
    return e.metHoursOverride !== null ? e.metHoursOverride : e.metHoursAuto
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/nomina/${weekKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, weekEnd, entries: Object.values(entries) }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Guardado' : '✗ Error al guardar')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleExport() {
    await handleSave()
    window.open(`/api/nomina/${weekKey}/export`, '_blank')
  }

  const active     = Object.values(entries).filter(e => !e.terminationDate)
  const terminados = Object.values(entries).filter(e => !!e.terminationDate)

  const activeGroups = JOB_ORDER.map(jt => ({
    jobTitle: jt,
    employees: active.filter(e => e.jobTitle === jt),
  })).filter(g => g.employees.length > 0)

  const termGroups = JOB_ORDER.map(jt => ({
    jobTitle: jt,
    employees: terminados.filter(e => e.jobTitle === jt),
  })).filter(g => g.employees.length > 0)

  const colHeaders = (
    <tr className="bg-slate-100 text-slate-600 text-xs uppercase">
      <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
      <th className="px-3 py-2.5 text-left font-semibold">Puesto</th>
      <th className="px-3 py-2.5 text-center font-semibold">Horas</th>
      <th className="px-3 py-2.5 text-center font-semibold">Hire Date</th>
      <th className="px-3 py-2.5 text-center font-semibold">Cumplió</th>
      <th className="px-3 py-2.5 text-center font-semibold">Sick Hrs</th>
      <th className="px-3 py-2.5 text-center font-semibold">Vacation Hrs</th>
      <th className="px-3 py-2.5 text-center font-semibold">Paid</th>
      <th className="px-3 py-2.5 text-center font-semibold">Termination Date</th>
      <th className="px-3 py-2.5 text-left font-semibold">Comentarios</th>
    </tr>
  )

  function renderRow(emp: EntryState) {
    const met = metHours(emp)
    const isTerminado = !!emp.terminationDate
    return (
      <tr key={emp.email} className={`hover:bg-slate-50 ${isTerminado ? 'bg-orange-50/40' : ''}`}>
        <td className="px-3 py-2 font-medium text-slate-800">{emp.name}</td>
        <td className="px-3 py-2 text-slate-500 text-xs">{emp.jobTitle}</td>
        <td className="px-3 py-2 text-center">
          <span className={`text-xs font-semibold ${emp.horasWorked >= 40 ? 'text-green-600' : 'text-orange-600'}`}>
            {emp.horasWorked.toFixed(1)}h
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          <input type="date" value={emp.hireDate}
            onChange={e => update(emp.email, 'hireDate', e.target.value)}
            className="text-xs border border-slate-200 rounded px-1.5 py-1 w-32 focus:outline-none focus:border-[#00A651]"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => update(emp.email, 'metHoursOverride', !met)}
            className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
              met ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
            }`}
            title={met ? 'Cumplió — clic para cambiar' : 'No cumplió — clic para cambiar'}
          >
            {met ? '✓' : '✗'}
          </button>
        </td>
        <td className="px-3 py-2 text-center">
          <input type="number" min={0} value={emp.sickHours || ''}
            onChange={e => update(emp.email, 'sickHours', Number(e.target.value))}
            className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#00A651]"
            placeholder="0"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <input type="number" min={0} value={emp.vacationHours || ''}
            onChange={e => update(emp.email, 'vacationHours', Number(e.target.value))}
            className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#00A651]"
            placeholder="0"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <input type="checkbox" checked={emp.paid}
            onChange={e => update(emp.email, 'paid', e.target.checked)}
            className="w-4 h-4 accent-[#00A651]"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <input type="date" value={emp.terminationDate}
            onChange={e => update(emp.email, 'terminationDate', e.target.value)}
            className="text-xs border border-slate-200 rounded px-1.5 py-1 w-32 focus:outline-none focus:border-orange-400"
            title="Llenar solo si fue terminado esta semana"
          />
        </td>
        <td className="px-3 py-2">
          <input type="text" value={emp.comments}
            onChange={e => update(emp.email, 'comments', e.target.value)}
            className="w-full min-w-[180px] text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#00A651]"
            placeholder="Comentario…"
          />
        </td>
      </tr>
    )
  }

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Confirmación de Nómina</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Semana {weekKey} · {salaried.length} asalariados
            {terminados.length > 0 && <span className="text-orange-600 ml-2">· {terminados.length} terminado{terminados.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={handleExport} disabled={saving}
            className="px-4 py-2 bg-[#00A651] text-white text-sm font-medium rounded-lg hover:bg-[#008f44] disabled:opacity-50 transition-colors">
            Exportar Excel
          </button>
          {msg && <span className={`self-center text-sm font-medium ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
        </div>
      </div>

      {/* Active employees */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>{colHeaders}</thead>
          <tbody className="divide-y divide-slate-100">
            {activeGroups.map(({ jobTitle, employees }) => (
              <>
                <tr key={`grp-${jobTitle}`} className="bg-[#003320]/5">
                  <td colSpan={10} className="px-3 py-1.5 text-xs font-bold text-[#003320] uppercase tracking-wide">
                    {jobTitle} ({employees.length})
                  </td>
                </tr>
                {employees.map(renderRow)}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Terminados */}
      {terminados.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-orange-700 mb-3">
            Fuera del Programa — Terminados ({terminados.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-orange-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>{colHeaders}</thead>
              <tbody className="divide-y divide-orange-100">
                {termGroups.map(({ jobTitle, employees }) => (
                  <>
                    <tr key={`tgrp-${jobTitle}`} className="bg-orange-50">
                      <td colSpan={10} className="px-3 py-1.5 text-xs font-bold text-orange-700 uppercase tracking-wide">
                        {jobTitle} ({employees.length})
                      </td>
                    </tr>
                    {employees.map(renderRow)}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Para quitar de terminados, borra la fecha de terminación.</p>
        </div>
      )}
    </div>
  )
}

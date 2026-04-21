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
}

interface Terminado {
  terminationDate: string
  name: string
  jobTitle: string
  metHours: boolean
  sickHours: number
  vacationHours: number
  comments: string
}

interface Props {
  weekKey: string
  weekStart: string
  weekEnd: string
  salaried: SalariadoForNomina[]
}

const JOB_ORDER = ['Consultor Energético', 'Gerente de Ventas - Asalariado', 'Líder Energético']

const BLANK_TERM: Terminado = {
  terminationDate: '', name: '', jobTitle: 'Consultor Energético',
  metHours: false, sickHours: 0, vacationHours: 0, comments: '',
}

export default function NominaSection({ weekKey, weekStart, weekEnd, salaried }: Props) {
  const [entries, setEntries]       = useState<Record<string, EntryState>>({})
  const [terminados, setTerminados] = useState<Terminado[]>([])
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [addingTerm, setAddingTerm] = useState(false)
  const [newTerm, setNewTerm]       = useState<Terminado>(BLANK_TERM)

  // Initialize entries from salaried list
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
        hireDate:         sv?.hireDate         ?? '',
        metHoursOverride: sv?.metHoursOverride ?? null,
        sickHours:        sv?.sickHours        ?? 0,
        vacationHours:    sv?.vacationHours     ?? 0,
        paid:             sv?.paid             ?? s.metHoursAuto,
        comments:         sv?.comments         ?? '',
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
          setTerminados(data.terminados ?? [])
        } else {
          setEntries(initEntries(null))
        }
      })
  }, [weekKey, initEntries])

  function updateEntry(email: string, field: keyof EntryState, value: any) {
    setEntries(prev => ({ ...prev, [email]: { ...prev[email], [field]: value } }))
  }

  function metHours(e: EntryState) {
    return e.metHoursOverride !== null ? e.metHoursOverride : e.metHoursAuto
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const payload = {
      weekStart,
      weekEnd,
      entries: Object.values(entries),
      terminados,
    }
    const res = await fetch(`/api/nomina/${weekKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Guardado' : '✗ Error al guardar')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleExport() {
    await handleSave()
    window.open(`/api/nomina/${weekKey}/export`, '_blank')
  }

  function addTerminado() {
    if (!newTerm.name.trim()) return
    setTerminados(prev => [...prev, { ...newTerm }])
    setNewTerm(BLANK_TERM)
    setAddingTerm(false)
  }

  const groups = JOB_ORDER.map(jt => ({
    jobTitle: jt,
    employees: Object.values(entries).filter(e => e.jobTitle === jt),
  })).filter(g => g.employees.length > 0)

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Confirmación de Nómina</h2>
          <p className="text-sm text-slate-500 mt-0.5">Semana {weekKey} · {salaried.length} asalariados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleExport}
            disabled={saving}
            className="px-4 py-2 bg-[#00A651] text-white text-sm font-medium rounded-lg hover:bg-[#008f44] disabled:opacity-50 transition-colors"
          >
            Exportar Excel
          </button>
          {msg && <span className={`self-center text-sm font-medium ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
        </div>
      </div>

      {/* Employee table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase">
              <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
              <th className="px-3 py-2.5 text-left font-semibold">Puesto</th>
              <th className="px-3 py-2.5 text-center font-semibold">Horas</th>
              <th className="px-3 py-2.5 text-center font-semibold">Hire Date</th>
              <th className="px-3 py-2.5 text-center font-semibold">Cumplió</th>
              <th className="px-3 py-2.5 text-center font-semibold">Sick Hrs</th>
              <th className="px-3 py-2.5 text-center font-semibold">Vacation Hrs</th>
              <th className="px-3 py-2.5 text-center font-semibold">Paid</th>
              <th className="px-3 py-2.5 text-left font-semibold">Comentarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map(({ jobTitle, employees }) => (
              <>
                <tr key={`grp-${jobTitle}`} className="bg-[#003320]/5">
                  <td colSpan={9} className="px-3 py-1.5 text-xs font-bold text-[#003320] uppercase tracking-wide">
                    {jobTitle} ({employees.length})
                  </td>
                </tr>
                {employees.map(emp => {
                  const met = metHours(emp)
                  return (
                    <tr key={emp.email} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{emp.name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{emp.jobTitle}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${emp.horasWorked >= 40 ? 'text-green-600' : 'text-orange-600'}`}>
                          {emp.horasWorked.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="date"
                          value={emp.hireDate}
                          onChange={e => updateEntry(emp.email, 'hireDate', e.target.value)}
                          className="text-xs border border-slate-200 rounded px-1.5 py-1 w-32 focus:outline-none focus:border-[#00A651]"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => updateEntry(emp.email, 'metHoursOverride', !met)}
                          className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                            met
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : 'bg-red-100 border-red-400 text-red-700'
                          }`}
                          title={met ? 'Cumplió (clic para cambiar)' : 'No cumplió (clic para cambiar)'}
                        >
                          {met ? '✓' : '✗'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={emp.sickHours || ''}
                          onChange={e => updateEntry(emp.email, 'sickHours', Number(e.target.value))}
                          className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#00A651]"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={emp.vacationHours || ''}
                          onChange={e => updateEntry(emp.email, 'vacationHours', Number(e.target.value))}
                          className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-[#00A651]"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={emp.paid}
                          onChange={e => updateEntry(emp.email, 'paid', e.target.checked)}
                          className="w-4 h-4 accent-[#00A651]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={emp.comments}
                          onChange={e => updateEntry(emp.email, 'comments', e.target.value)}
                          className="w-full min-w-[180px] text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#00A651]"
                          placeholder="Comentario…"
                        />
                      </td>
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Terminados section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-700">Fuera del Programa — Terminados</h3>
          <button
            onClick={() => setAddingTerm(true)}
            className="text-sm px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:border-slate-400 text-slate-700 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {terminados.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-orange-50 text-slate-600 text-xs uppercase">
                  <th className="px-3 py-2 text-left font-semibold">Termination Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Puesto</th>
                  <th className="px-3 py-2 text-center font-semibold">Cumplió</th>
                  <th className="px-3 py-2 text-center font-semibold">Sick Hrs</th>
                  <th className="px-3 py-2 text-center font-semibold">Vacation Hrs</th>
                  <th className="px-3 py-2 text-left font-semibold">Comentarios</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {terminados.map((t, i) => (
                  <tr key={i} className="hover:bg-orange-50/50">
                    <td className="px-3 py-2 text-xs text-slate-600">{t.terminationDate}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{t.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{t.jobTitle}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold ${t.metHours ? 'text-green-600' : 'text-red-600'}`}>
                        {t.metHours ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">{t.sickHours || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs">{t.vacationHours || '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{t.comments}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setTerminados(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {addingTerm && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Agregar Terminado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Termination Date</label>
                <input type="date" value={newTerm.terminationDate}
                  onChange={e => setNewTerm(p => ({ ...p, terminationDate: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre Completo</label>
                <input type="text" value={newTerm.name}
                  onChange={e => setNewTerm(p => ({ ...p, name: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                  placeholder="Apellido, Nombre"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Puesto</label>
                <select value={newTerm.jobTitle}
                  onChange={e => setNewTerm(p => ({ ...p, jobTitle: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                >
                  {JOB_ORDER.map(jt => <option key={jt} value={jt}>{jt}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sick Hrs</label>
                  <input type="number" min={0} value={newTerm.sickHours || ''}
                    onChange={e => setNewTerm(p => ({ ...p, sickHours: Number(e.target.value) }))}
                    className="w-16 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Vacation</label>
                  <input type="number" min={0} value={newTerm.vacationHours || ''}
                    onChange={e => setNewTerm(p => ({ ...p, vacationHours: Number(e.target.value) }))}
                    className="w-16 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={newTerm.metHours}
                  onChange={e => setNewTerm(p => ({ ...p, metHours: e.target.checked }))}
                  className="accent-[#00A651]"
                />
                Cumplió las horas
              </label>
              <input type="text" value={newTerm.comments}
                onChange={e => setNewTerm(p => ({ ...p, comments: e.target.value }))}
                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A651]"
                placeholder="Comentarios (opcional)"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addTerminado}
                className="px-4 py-1.5 bg-[#003320] text-white text-sm rounded-lg hover:bg-[#004d2e] transition-colors">
                Agregar
              </button>
              <button onClick={() => { setAddingTerm(false); setNewTerm(BLANK_TERM) }}
                className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:border-slate-400 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

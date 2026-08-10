'use client'

import { useState, useEffect, useCallback } from 'react'

function scrollToEmployee(email: string) {
  const id = `emp-${email.replace(/[^a-zA-Z0-9]/g, '-')}`
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // Expand the card if it's currently collapsed
  const isExpanded = !!el.querySelector('.border-t.border-slate-100')
  if (!isExpanded) {
    const toggleBtn = el.querySelector<HTMLButtonElement>('button')
    toggleBtn?.click()
  }
}

function tiempoEnPrograma(hireDate: string | null, refDate: string): string {
  if (!hireDate) return '—'
  const hire = new Date(hireDate)
  const ref  = new Date(refDate)
  let years  = ref.getFullYear() - hire.getFullYear()
  let months = ref.getMonth()    - hire.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years > 0) {
    return months > 0
      ? `${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`
      : `${years} año${years > 1 ? 's' : ''}`
  }
  return months > 0 ? `${months} mes${months > 1 ? 'es' : ''}` : '< 1 mes'
}

export interface SalariadoForNomina {
  name: string
  email: string
  jobTitle: string
  horasWorked: number
  metHoursAuto: boolean
  hireDate: string | null
  terminationDate: string | null
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

type Mode = 'asalariado' | 'promotor'

interface Props {
  weekKey: string
  weekStart: string
  weekEnd: string
  salaried: SalariadoForNomina[]
  promotores: SalariadoForNomina[]
}

const JOB_ORDER = ['Consultor Energético', 'Gerente de Ventas - Asalariado', 'Líder Energético']

// Los promotores no tienen umbral de horas: la columna "Cumplió" arranca sin
// marcar (null) y sólo se marca manualmente. Los asalariados sí traen su valor
// automático (>= 24.5h) como default.
const storageKeyFor = (weekKey: string, mode: Mode) =>
  mode === 'asalariado' ? weekKey : `${weekKey}-promotores`

export default function NominaSection({ weekKey, weekStart, weekEnd, salaried, promotores }: Props) {
  const [mode, setMode]         = useState<Mode>('asalariado')
  const [entriesA, setEntriesA] = useState<Record<string, EntryState>>({})
  const [entriesP, setEntriesP] = useState<Record<string, EntryState>>({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const roster       = mode === 'asalariado' ? salaried : promotores
  const entries      = mode === 'asalariado' ? entriesA : entriesP
  const setEntries   = mode === 'asalariado' ? setEntriesA : setEntriesP
  const storageKey   = storageKeyFor(weekKey, mode)

  const buildEntries = useCallback((list: SalariadoForNomina[], saved: Record<string, any> | null) => {
    const init: Record<string, EntryState> = {}
    for (const s of list) {
      const sv = saved?.[s.email]
      init[s.email] = {
        name:             s.name,
        email:            s.email,
        jobTitle:         s.jobTitle,
        horasWorked:      s.horasWorked,
        metHoursAuto:     s.metHoursAuto,
        hireDate:         sv?.hireDate         ?? s.hireDate        ?? '',
        metHoursOverride: sv?.metHoursOverride ?? null,
        sickHours:        sv?.sickHours        ?? 0,
        vacationHours:    sv?.vacationHours    ?? 0,
        paid:             sv?.paid             ?? s.metHoursAuto,
        comments:         sv?.comments         ?? '',
        terminationDate:  sv?.terminationDate  ?? s.terminationDate ?? '',
      }
    }
    return init
  }, [])

  const loadMode = useCallback((m: Mode, list: SalariadoForNomina[], setter: (v: Record<string, EntryState>) => void) => {
    fetch(`/api/nomina/${storageKeyFor(weekKey, m)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        const savedMap: Record<string, any> = {}
        if (data?.entries) for (const e of data.entries) savedMap[e.email] = e
        setter(buildEntries(list, data?.entries ? savedMap : null))
      })
  }, [weekKey, buildEntries])

  useEffect(() => { loadMode('asalariado', salaried, setEntriesA) }, [loadMode, salaried])
  useEffect(() => { loadMode('promotor', promotores, setEntriesP) }, [loadMode, promotores])

  function update(email: string, field: keyof EntryState, value: any) {
    setEntries(prev => ({ ...prev, [email]: { ...prev[email], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/nomina/${storageKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, weekEnd, kind: mode, entries: Object.values(entries) }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Guardado' : '✗ Error al guardar')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleExport() {
    await handleSave()
    window.open(`/api/nomina/${storageKey}/export`, '_blank')
  }

  const allEntries = Object.values(entries)

  // Asalariados: orden fijo de puestos. Promotores: agrupar por los puestos que
  // haya en el roster (p. ej. "Promotor", "Promotor de Ventas").
  const jobOrder = mode === 'asalariado'
    ? JOB_ORDER
    : [...new Set(allEntries.map(e => e.jobTitle))].sort()

  const activeGroups = jobOrder.map(jt => ({
    jobTitle: jt,
    employees: allEntries.filter(e => e.jobTitle === jt),
  })).filter(g => g.employees.length > 0)

  const colHeaders = (
    <tr className="bg-[#0D1654] text-white text-xs uppercase">
      <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
      <th className="px-3 py-2.5 text-left font-semibold">Puesto</th>
      <th className="px-3 py-2.5 text-center font-semibold">Horas</th>
      <th className="px-3 py-2.5 text-center font-semibold">En Programa</th>
      <th className="px-3 py-2.5 text-center font-semibold">Cumplió</th>
      <th className="px-3 py-2.5 text-center font-semibold">Sick Hrs</th>
      <th className="px-3 py-2.5 text-center font-semibold">Vacation Hrs</th>
      <th className="px-3 py-2.5 text-left font-semibold">Comentarios</th>
    </tr>
  )

  function renderRow(emp: EntryState) {
    return (
      <tr key={emp.email} className="hover:bg-slate-50">
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => scrollToEmployee(emp.email)}
            className="font-medium text-slate-800 hover:text-[#00A651] hover:underline text-left transition-colors"
            title="Ver detalle de turnos"
          >
            {emp.name}
          </button>
        </td>
        <td className="px-3 py-2 text-slate-500 text-xs">{emp.jobTitle}</td>
        <td className="px-3 py-2 text-center">
          <span className={`text-xs font-semibold ${
            mode === 'promotor'
              ? 'text-slate-700'
              : emp.horasWorked >= 24.5 ? 'text-green-600' : 'text-orange-600'
          }`}>
            {emp.horasWorked.toFixed(1)}h
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          <span className="text-xs text-slate-600 whitespace-nowrap">
            {tiempoEnPrograma(emp.hireDate || null, weekStart)}
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          {mode === 'promotor'
            ? (() => {
                // Tri-state: — (sin marcar) → ✓ → ✗ → —
                const ov = emp.metHoursOverride
                const label = ov === null ? '—' : ov ? '✓' : '✗'
                const cls =
                  ov === null ? 'bg-slate-100 border-slate-300 text-slate-400'
                  : ov         ? 'bg-green-100 border-green-400 text-green-700'
                               : 'bg-red-100 border-red-400 text-red-700'
                const next = ov === null ? true : ov ? false : null
                return (
                  <button
                    onClick={() => update(emp.email, 'metHoursOverride', next)}
                    className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${cls}`}
                    title="Sin marcar / Cumplió / No cumplió — clic para cambiar"
                  >
                    {label}
                  </button>
                )
              })()
            : (() => {
                const met = emp.metHoursOverride !== null ? emp.metHoursOverride : emp.metHoursAuto
                return (
                  <button
                    onClick={() => update(emp.email, 'metHoursOverride', !met)}
                    className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                      met ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                    }`}
                    title={met ? 'Cumplió — clic para cambiar' : 'No cumplió — clic para cambiar'}
                  >
                    {met ? '✓' : '✗'}
                  </button>
                )
              })()}
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

  const TABS: { key: Mode; label: string; count: number }[] = [
    { key: 'asalariado', label: 'Asalariados', count: salaried.length },
    { key: 'promotor',   label: 'Promotores',  count: promotores.length },
  ]

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0D1654]">Confirmación de Nómina</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Semana {weekKey} · {roster.length} {mode === 'asalariado' ? 'asalariados' : 'promotores'}
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

      {/* Toggle Asalariados / Promotores */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => {
          const on = mode === t.key
          return (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                on ? 'bg-[#0D1654] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t.label} <span className={on ? 'text-white/70' : 'text-slate-400'}>{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* Employee table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>{colHeaders}</thead>
          <tbody className="divide-y divide-slate-100">
            {activeGroups.map(({ jobTitle, employees }) => (
              <>
                <tr key={`grp-${jobTitle}`} className="bg-[#003320]/5">
                  <td colSpan={8} className="px-3 py-1.5 text-xs font-bold text-[#003320] uppercase tracking-wide">
                    {jobTitle} ({employees.length})
                  </td>
                </tr>
                {employees.map(renderRow)}
              </>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

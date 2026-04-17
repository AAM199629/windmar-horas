import { getLatestReport, listWeekKeys, getWeeklyReport } from '@/lib/kv'
import { getVendedores, buildVendedorMap } from '@/lib/smartsheet'
import WeekSelector from '@/components/WeekSelector'
import HorasClient from '@/components/HorasClient'
import type { EmployeeSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HorasPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const [weeks, report, vendedores] = await Promise.all([
    listWeekKeys(),
    week ? getWeeklyReport(week) : getLatestReport(),
    getVendedores(),
  ])

  if (!report) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg font-medium">No hay datos cargados.</p>
        <p className="text-sm mt-1">Sube un CSV desde la página de Inicio.</p>
      </div>
    )
  }

  const { employees, weekStart, weekEnd, weekKey } = report
  const vmap = buildVendedorMap(vendedores)

  const enriched = employees.map(emp => ({
    ...emp,
    ciudad:             vmap.get(emp.email.toLowerCase())?.ciudad             ?? null,
    salesRole:          vmap.get(emp.email.toLowerCase())?.salesRole          ?? null,
    supervisorRegional: vmap.get(emp.email.toLowerCase())?.supervisorRegional ?? null,
  }))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análisis de Horas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Semana {weekKey} · {weekStart} → {weekEnd}
          </p>
        </div>
        <WeekSelector weeks={weeks} current={weekKey} />
      </div>
      <HorasClient employees={enriched} />
    </div>
  )
}

import { getLatestReport, listWeekKeys, getWeeklyReport } from '@/lib/kv'
import EmployeeCard from '@/components/EmployeeCard'
import WeekSelector from '@/components/WeekSelector'

export const dynamic = 'force-dynamic'

export default async function HorasPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const weeks = await listWeekKeys()
  const report = week ? await getWeeklyReport(week) : await getLatestReport()

  if (!report) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg font-medium">No hay datos cargados.</p>
        <p className="text-sm mt-1">Sube un CSV desde la página de Inicio.</p>
      </div>
    )
  }

  const { employees, weekStart, weekEnd, weekKey } = report

  const totalSinACO = employees.reduce((a, e) => a + e.horasSinACO, 0)
  const totalConACO = employees.reduce((a, e) => a + e.horasConACO, 0)
  const totalTurnos = employees.reduce((a, e) => a + e.totalTurnos, 0)

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

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Empleados" value={employees.length} />
        <Stat label="Turnos totales" value={totalTurnos} />
        <Stat label="Horas sin ACO" value={totalSinACO.toFixed(1) + 'h'} green />
        <Stat label="Horas con ACO" value={totalConACO.toFixed(1) + 'h'} />
      </div>

      {/* Employee cards */}
      <div className="space-y-2">
        {employees.map(emp => (
          <EmployeeCard key={emp.email} emp={emp} />
        ))}
      </div>
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

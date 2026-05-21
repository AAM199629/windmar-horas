import { getLatestReport, listWeekKeys, getWeeklyReport } from '@/lib/kv'
import ChannelView from '@/components/ChannelView'
import WeekSelector from '@/components/WeekSelector'
import MallViewToggle from './MallViewToggle'
import MallDashboard from './MallDashboard'

export const dynamic = 'force-dynamic'

export default async function MallPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>
}) {
  const { week, view } = await searchParams
  const currentView = view === 'turnos' ? 'turnos' : 'dashboard'
  const year = new Date().getFullYear()

  if (currentView === 'dashboard') {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1654]">Canal Mall / Home Depot</h1>
            <p className="text-slate-500 text-sm mt-0.5">Dashboard de ventas en vivo · Redshift</p>
          </div>
          <MallViewToggle current="dashboard" />
        </div>
        <MallDashboard year={year} />
      </div>
    )
  }

  // Turnos view — existing weekly CSV behavior
  const weeks  = await listWeekKeys()
  const report = week ? await getWeeklyReport(week) : await getLatestReport()

  if (!report) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1654]">Canal Mall / Home Depot</h1>
          </div>
          <MallViewToggle current="turnos" />
        </div>
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg font-medium">No hay datos cargados.</p>
          <p className="text-sm mt-1">Sube un CSV desde la página de Inicio.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1654]">Canal Mall / Home Depot</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Semana {report.weekKey} · {report.weekStart} → {report.weekEnd}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <MallViewToggle current="turnos" />
          <WeekSelector weeks={weeks} current={report.weekKey} />
        </div>
      </div>
      <ChannelView
        metrics={report.channels.mall}
        weekStart={report.weekStart}
        weekEnd={report.weekEnd}
      />
    </div>
  )
}

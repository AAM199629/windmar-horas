import { getLatestReport, listWeekKeys, getWeeklyReport } from '@/lib/kv'
import ChannelView from '@/components/ChannelView'
import WeekSelector from '@/components/WeekSelector'

export const dynamic = 'force-dynamic'

export default async function IndependientePage({
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Canal Independiente &amp; Eventos</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Semana {report.weekKey} · {report.weekStart} → {report.weekEnd}
          </p>
        </div>
        <WeekSelector weeks={weeks} current={report.weekKey} />
      </div>
      <ChannelView
        metrics={report.channels.independiente}
        weekStart={report.weekStart}
        weekEnd={report.weekEnd}
      />
    </div>
  )
}

import { getLatestReport, listWeekKeys, getWeeklyReport } from '@/lib/kv'
import ChannelView from '@/components/ChannelView'
import WeekSelector from '@/components/WeekSelector'
import ViewToggle from '@/components/ViewToggle'
import CambaceoPerformance from '@/components/CambaceoPerformance'
import { computeCambaceoPerformance } from '@/lib/performance'

export const dynamic = 'force-dynamic'

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function CambaceoPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string; month?: string }>
}) {
  const { week, view, month: monthParam } = await searchParams
  const month = monthParam ?? currentYearMonth()

  if (view === 'performance') {
    const { vendedores, coordinadores } = await computeCambaceoPerformance(month)
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1654]">Canal Cambaceo / Canvaseo</h1>
            <p className="text-slate-500 text-sm mt-0.5">Vista de Performance</p>
          </div>
          <ViewToggle
            currentView="performance"
            hrefHoras="/canales/cambaceo"
            hrefPerformance={`/canales/cambaceo?view=performance&month=${month}`}
          />
        </div>
        <CambaceoPerformance
          vendedores={vendedores}
          coordinadores={coordinadores}
          month={month}
        />
      </div>
    )
  }

  const weeks  = await listWeekKeys()
  const report = week ? await getWeeklyReport(week) : await getLatestReport()

  if (!report) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0D1654]">Canal Cambaceo / Canvaseo</h1>
          </div>
          <ViewToggle
            currentView="horas"
            hrefHoras="/canales/cambaceo"
            hrefPerformance={`/canales/cambaceo?view=performance&month=${month}`}
          />
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
          <h1 className="text-2xl font-bold text-[#0D1654]">Canal Cambaceo / Canvaseo</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Semana {report.weekKey} · {report.weekStart} → {report.weekEnd}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ViewToggle
            currentView="horas"
            hrefHoras="/canales/cambaceo"
            hrefPerformance={`/canales/cambaceo?view=performance&month=${month}`}
          />
          <WeekSelector weeks={weeks} current={report.weekKey} />
        </div>
      </div>
      <ChannelView
        metrics={report.channels.cambaceo}
        weekStart={report.weekStart}
        weekEnd={report.weekEnd}
      />
    </div>
  )
}

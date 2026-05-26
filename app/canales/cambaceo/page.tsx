import ViewToggle from '@/components/ViewToggle'
import CambaceoPerformance from '@/components/CambaceoPerformance'
import StipTurnosView from '@/components/StipTurnosView'
import { computeCambaceoPerformance } from '@/lib/performance'

export const dynamic = 'force-dynamic'

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function CambaceoPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>
}) {
  const { view, month: monthParam } = await searchParams
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1654]">Canal Cambaceo / Canvaseo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Turnos en tiempo real · STIP</p>
        </div>
        <ViewToggle
          currentView="horas"
          hrefHoras="/canales/cambaceo"
          hrefPerformance={`/canales/cambaceo?view=performance&month=${month}`}
        />
      </div>
      <StipTurnosView canal="cambaceo" />
    </div>
  )
}

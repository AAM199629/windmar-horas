import ViewToggle from '@/components/ViewToggle'
import CoordinadoresAnalysis from '@/components/CoordinadoresAnalysis'
import StipTurnosView from '@/components/StipTurnosView'
import { computeCoordinadoresAnalysis } from '@/lib/coordinadores'


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
  const isDashboard = view === 'dashboard' || view === 'performance'

  if (isDashboard) {
    let analysis: Awaited<ReturnType<typeof computeCoordinadoresAnalysis>> | null = null
    let perfError: string | null = null

    try {
      analysis = await computeCoordinadoresAnalysis(month)
    } catch (err: any) {
      perfError = err?.message ?? 'Error desconocido'
    }

    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26, fontFamily: "'Montserrat', sans-serif" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1D429B', marginBottom: 6 }}>
              REPORTE DE CANVASSING · ANÁLISIS DE COORDINADORES
            </p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 0.9, margin: 0 }}>
              <span style={{ color: '#21274E' }}>Canal </span>
              <span style={{ color: '#F89B24' }}>Cambaceo</span>
            </h1>
          </div>
          <ViewToggle
            currentView="performance"
            hrefHoras="/canales/cambaceo"
            hrefPerformance={`/canales/cambaceo?view=dashboard&month=${month}`}
            labelPerformance="Dashboard"
          />
        </div>
        {perfError || !analysis ? (
          <div className="rounded-2xl bg-red-50/70 border border-red-200/70 p-6 text-red-700 text-sm">
            <p className="font-semibold mb-1">Error al cargar el análisis</p>
            <p className="font-mono text-xs opacity-70">{perfError ?? 'Sin datos'}</p>
          </div>
        ) : (
          <CoordinadoresAnalysis analysis={analysis} month={month} />
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26, fontFamily: "'Montserrat', sans-serif" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1D429B', marginBottom: 6 }}>
            CANAL · TURNOS EN TIEMPO REAL · SHIFTER
          </p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 0.9, margin: 0 }}>
            <span style={{ color: '#21274E' }}>Canal </span>
            <span style={{ color: '#F89B24' }}>Cambaceo</span>
          </h1>
        </div>
        <ViewToggle
          currentView="horas"
          hrefHoras="/canales/cambaceo"
          hrefPerformance={`/canales/cambaceo?view=dashboard&month=${month}`}
          labelPerformance="Dashboard"
        />
      </div>
      <StipTurnosView canal="cambaceo" />
    </div>
  )
}

import MallViewToggle from './MallViewToggle'
import MallDashboard from './MallDashboard'
import StipTurnosView from '@/components/StipTurnosView'

export const dynamic = 'force-dynamic'

export default async function MallPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1654]">Canal Mall / Home Depot</h1>
          <p className="text-slate-500 text-sm mt-0.5">Turnos en tiempo real · STIP</p>
        </div>
        <MallViewToggle current="turnos" />
      </div>
      <StipTurnosView canal="mall" />
    </div>
  )
}

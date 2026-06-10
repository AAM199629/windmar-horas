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

  const header = (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 26,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <div>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: '#1D429B',
          marginBottom: 6,
        }}>
          CANAL · DASHBOARD DE VENTAS EN VIVO · REDSHIFT
        </p>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(40px, 5vw, 60px)',
          lineHeight: 0.9,
          margin: 0,
        }}>
          <span style={{ color: '#21274E' }}>Canal </span>
          <span style={{ color: '#F89B24' }}>
            {currentView === 'turnos' ? 'Mall / Turnos' : 'Mall / Home Depot'}
          </span>
        </h1>
      </div>
      <MallViewToggle current={currentView} />
    </div>
  )

  if (currentView === 'dashboard') {
    return (
      <div>
        {header}
        <MallDashboard year={year} />
      </div>
    )
  }

  return (
    <div>
      {header}
      <StipTurnosView canal="mall" />
    </div>
  )
}

import VentasDashboard from './VentasDashboard'

function defaultDates() {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const d = today.getDate()

  const fromA = `${y}-${String(m).padStart(2, '0')}-01`
  const toA   = today.toISOString().slice(0, 10)

  const priorM = today.getMonth() === 0 ? 12 : today.getMonth()
  const priorY = today.getMonth() === 0 ? y - 1 : y
  const fromB  = `${priorY}-${String(priorM).padStart(2, '0')}-01`
  const toB    = `${priorY}-${String(priorM).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return { fromA, toA, fromB, toB }
}

export default function VentasPage() {
  const dates = defaultDates()
  return (
    <div>
      <div style={{
        marginBottom: 26,
        fontFamily: "'Montserrat', sans-serif",
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: '#1D429B',
          marginBottom: 6,
        }}>
          FUERZA DE VENTA Y CANALES · REPORTE EJECUTIVO · ZOHO CRM
        </p>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(40px, 5vw, 60px)',
          lineHeight: 0.9,
          margin: 0,
        }}>
          <span style={{ color: '#21274E' }}>Dashboard </span>
          <span style={{ color: '#F89B24' }}>de Ventas</span>
        </h1>
      </div>
      <VentasDashboard {...dates} />
    </div>
  )
}

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
  return <VentasDashboard {...dates} />
}

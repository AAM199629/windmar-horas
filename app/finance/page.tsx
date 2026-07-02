import FinanceDashboard from './FinanceDashboard'

export const dynamic = 'force-dynamic'

export default function FinancePage() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return <FinanceDashboard initMonth={month} />
}

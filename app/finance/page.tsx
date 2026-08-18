import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import FinanceDashboard from './FinanceDashboard'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') redirect('/')
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return <FinanceDashboard initMonth={month} />
}

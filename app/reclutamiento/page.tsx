import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import ReclutamientoDashboard from './ReclutamientoDashboard'

export const dynamic = 'force-dynamic'

export default async function ReclutamientoPage() {
  const session = await auth()
  const role = (session?.user as any)?.role as string | undefined
  if (!session || (role !== 'admin' && role !== 'supervisor')) redirect('/')

  return <ReclutamientoDashboard />
}

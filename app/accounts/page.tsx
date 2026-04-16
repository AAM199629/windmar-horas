import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AccountsClient from './AccountsClient'

export default async function AccountsPage() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') redirect('/')
  return <AccountsClient currentEmail={session.user?.email ?? ''} />
}

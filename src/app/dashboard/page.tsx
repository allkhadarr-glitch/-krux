import { redirect } from 'next/navigation'
import { getServerSessionContext } from '@/lib/session'

export default async function DashboardRoot() {
  const { role } = await getServerSessionContext()
  if (role === 'clearing_agent') redirect('/dashboard/portfolio')
  redirect('/dashboard/today')
}

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = (session.user as any)?.role
  if (role === 'ADMIN')        redirect('/dashboard')
  if (role === 'OUTLET_STAFF') redirect('/pos')
  if (role === 'CUSTOMER')     redirect('/profile')
  redirect('/login')
}

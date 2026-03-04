import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import styles from './app.layout.module.css'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as any
  return (
    <div className={styles.wrap}>
      <Sidebar user={user} />
      <main className={styles.main}>{children}</main>
    </div>
  )
}

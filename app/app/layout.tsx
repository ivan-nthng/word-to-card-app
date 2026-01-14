import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AUTH_ENABLED } from '@/lib/config'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Skip auth check when AUTH_ENABLED is false
  if (AUTH_ENABLED) {
    const session = await getSession()

    if (!session) {
      redirect('/')
    }
  }

  return <>{children}</>
}

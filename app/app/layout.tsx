import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AUTH_ENABLED } from '@/lib/config'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Skip auth check when AUTH_ENABLED is false
  if (AUTH_ENABLED) {
    try {
      const session = await getSession()

      if (!session) {
        redirect('/')
      }
    } catch (error) {
      // If auth check fails, allow access (graceful degradation)
      logger.error('AUTH', 'Error checking session in AppLayout', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  return <>{children}</>
}

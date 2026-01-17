import { AUTH_ENABLED } from '@/lib/config'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import { LandingActions } from './components/LandingActions'
import { Card } from './ui/Card'

export const dynamic = 'force-dynamic'

export default async function Home() {
    try {
        // When auth is enabled, redirect signed-in users
        if (AUTH_ENABLED) {
            const session = await getSession()
            if (session) {
                redirect('/app/add')
            }
        }
    } catch (error) {
        // If auth check fails, continue to show the page
        logger.error('AUTH', 'Error checking session', {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return (
        <main className="min-h-[100dvh] flex items-center justify-center bg-background">
            <div className="max-w-md w-full mx-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                        Worto
                    </h1>
                    <p className="text-muted-foreground">
                        Private Vocabulary Web Service
                    </p>
                </div>
                <Card className="p-6">
                    <LandingActions />
                </Card>
            </div>
        </main>
    )
}

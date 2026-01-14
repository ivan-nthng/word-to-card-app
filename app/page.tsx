import { AUTH_ENABLED } from '@/lib/config'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from './ui/Button'

export default async function Home() {
  // When auth is enabled, redirect signed-in users
  if (AUTH_ENABLED) {
    const session = await getSession()
    if (session) {
      redirect('/app/add')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">WordTo</h1>
          <p className="text-muted-foreground">Private vocabulary web service</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          {AUTH_ENABLED ? (
            <Link href="/api/auth/signin" className="block">
              <Button variant="primary" className="w-full">
                Sign in with Google
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/app/add" className="block">
                <Button variant="primary" className="w-full">
                  Add Word
                </Button>
              </Link>
              <Link href="/app/words" className="block">
                <Button variant="secondary" className="w-full">
                  View Words
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

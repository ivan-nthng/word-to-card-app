import Link from 'next/link'
import { Button } from './ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-2">404</h2>
        <p className="text-muted-foreground mb-6">
          This page could not be found.
        </p>
        <Link href="/">
          <Button variant="primary">Go back home</Button>
        </Link>
      </div>
    </div>
  )
}

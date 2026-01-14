'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Something went wrong!
        </h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-blue-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

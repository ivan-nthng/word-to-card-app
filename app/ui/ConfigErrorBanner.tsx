'use client'

import { Card } from './Card'
import { Button } from './Button'

interface ConfigErrorBannerProps {
    missing?: string
}

export function ConfigErrorBanner({ missing }: ConfigErrorBannerProps) {
    const envCheckUrl = '/api/env-check'

    return (
        <Card className="bg-error-background border-error-border text-error-text mb-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold mb-1">
                        Server is missing configuration
                    </h3>
                    <p className="text-sm">
                        {missing
                            ? `Missing environment variable: ${missing}`
                            : 'One or more required environment variables are not set.'}
                    </p>
                    <p className="text-sm mt-2">
                        Check Vercel Environment Variables and redeploy.
                    </p>
                </div>
                <a
                    href={envCheckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                >
                    <Button variant="outline" className="text-sm">
                        Check Config
                    </Button>
                </a>
            </div>
        </Card>
    )
}

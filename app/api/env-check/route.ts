import { NextResponse } from 'next/server'
import { ENV } from '@/lib/env'

/**
 * Diagnostic endpoint to check if environment variables are set.
 * SERVER-ONLY: Returns boolean status, never actual values.
 *
 * This endpoint is for debugging deployment issues.
 * It can be removed in production if desired.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Check if required env vars are present (without exposing values)
        const checks = {
            openai: false,
            notion: false,
            database: false,
        }

        try {
            // Accessing ENV properties will throw if missing
            const _ = ENV.OPENAI_API_KEY
            checks.openai = true
        } catch {
            checks.openai = false
        }

        try {
            const _ = ENV.NOTION_TOKEN
            checks.notion = true
        } catch {
            checks.notion = false
        }

        try {
            const _ = ENV.NOTION_DATABASE_ID
            checks.database = true
        } catch {
            checks.database = false
        }

        return NextResponse.json(checks)
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to check environment variables',
                openai: false,
                notion: false,
                database: false,
            },
            { status: 500 },
        )
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getDeckSummary } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        if (AUTH_ENABLED) {
            const session = await getSession()
            if (!session) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }
        }

        const summary = await getDeckSummary()
        return NextResponse.json(summary)
    } catch (error: any) {
        console.error('[DECK] Error fetching deck summary:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

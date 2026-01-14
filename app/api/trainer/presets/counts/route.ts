import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getTrainerPresetCounts } from '@/lib/notion'
import { logger } from '@/lib/logger'

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

        const searchParams = request.nextUrl.searchParams
        const language = (searchParams.get('language') || 'Portuguese') as
            | 'Portuguese'
            | 'English'

        const counts = await getTrainerPresetCounts(language)

        return NextResponse.json(counts)
    } catch (error: any) {
        logger.error('TRAINER', 'Error fetching preset counts', { error: error.message })
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

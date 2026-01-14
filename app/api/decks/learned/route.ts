import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { markWordAsLearned } from '@/lib/notion'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

        const body = await request.json()
        const { notionPageId, pageId } = body

        // Support both pageId (old) and notionPageId (new) for backward compatibility
        const actualPageId = notionPageId || pageId

        if (!actualPageId || typeof actualPageId !== 'string') {
            return NextResponse.json(
                { error: 'notionPageId is required' },
                { status: 400 },
            )
        }

        await markWordAsLearned(actualPageId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        logger.error('STUDY', 'Error marking word as learned', { error: error.message })
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

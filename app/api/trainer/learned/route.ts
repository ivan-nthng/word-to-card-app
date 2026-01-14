import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { markWordAsLearned, markWordAsNotLearned } from '@/lib/notion'
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
        const { notionPageId, action } = body

        if (!notionPageId || typeof notionPageId !== 'string') {
            return NextResponse.json(
                { error: 'notionPageId is required' },
                { status: 400 },
            )
        }

        if (action === 'learned') {
            await markWordAsLearned(notionPageId)
            logger.info('TRAINER', 'review action', {
                pageId: notionPageId,
                action: 'learned',
            })
        } else if (action === 'not_learned') {
            await markWordAsNotLearned(notionPageId)
            logger.info('TRAINER', 'review action', {
                pageId: notionPageId,
                action: 'not_learned',
            })
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Must be "learned" or "not_learned"' },
                { status: 400 },
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        logger.error('TRAINER', 'Error updating learned status', {
            error: error.message,
        })
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

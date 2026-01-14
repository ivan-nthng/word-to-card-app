import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { markWordAsLearned } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export async function POST(
    request: NextRequest,
    { params }: { params: { deckName: string } },
) {
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
        const { notionPageId } = body

        if (!notionPageId || typeof notionPageId !== 'string') {
            return NextResponse.json(
                { error: 'notionPageId is required' },
                { status: 400 },
            )
        }

        await markWordAsLearned(notionPageId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[STUDY] Error marking word as learned:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

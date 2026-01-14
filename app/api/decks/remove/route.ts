import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { removeWordsFromDeck } from '@/lib/notion'
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
        const { pageIds, deckName } = body

        if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
            return NextResponse.json(
                { error: 'pageIds array is required' },
                { status: 400 },
            )
        }

        if (!deckName || typeof deckName !== 'string') {
            return NextResponse.json(
                { error: 'deckName is required' },
                { status: 400 },
            )
        }

        await removeWordsFromDeck(pageIds, deckName)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        logger.error('DECK', 'Error removing words from deck', { error: error.message })
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

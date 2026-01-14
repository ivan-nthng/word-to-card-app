import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { resetDeck } from '@/lib/notion'
import { logger } from '@/lib/logger'

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

        const deckName = decodeURIComponent(params.deckName)
        await resetDeck(deckName)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        logger.error('DECK', 'Error resetting deck', { error: error.message })
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

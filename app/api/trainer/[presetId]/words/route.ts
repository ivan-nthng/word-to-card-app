import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getTrainerWords } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: { presetId: string } },
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

        const presetId = params.presetId as
            | 'active'
            | 'learned'
            | 'verbs'
            | 'nouns'
            | 'adjectives'

        const searchParams = request.nextUrl.searchParams
        const language = (searchParams.get('language') || 'Portuguese') as
            | 'Portuguese'
            | 'English'

        if (
            !['active', 'learned', 'verbs', 'nouns', 'adjectives'].includes(
                presetId,
            )
        ) {
            return NextResponse.json(
                { error: 'Invalid presetId' },
                { status: 400 },
            )
        }

        const words = await getTrainerWords(language, presetId)

        return NextResponse.json(words)
    } catch (error: any) {
        console.error('[TRAINER] Error fetching trainer words:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        )
    }
}

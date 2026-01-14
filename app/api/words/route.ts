import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getWords } from '@/lib/notion'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Skip auth check when AUTH_ENABLED is false
    if (AUTH_ENABLED) {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const searchParams = request.nextUrl.searchParams
    const typo = searchParams.get('typo') || undefined
    const language = searchParams.get('language') || undefined
    const search = searchParams.get('search') || undefined

    const words = await getWords({
      typo: typo || undefined,
      language: language || undefined,
      search: search || undefined,
    })

    return NextResponse.json(words)
  } catch (error: any) {
    console.error('[WORDS] Error fetching words:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getWordById } from '@/lib/notion'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip auth check when AUTH_ENABLED is false
    if (AUTH_ENABLED) {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const word = await getWordById(params.id)
    if (!word) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 })
    }

    return NextResponse.json(word)
  } catch (error: any) {
    console.error('Error fetching word:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

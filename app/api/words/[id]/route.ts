import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { getWordById } from '@/lib/notion'
import { logger } from '@/lib/logger'
import { Client } from '@notionhq/client'
import { requireNotionToken } from '@/lib/env.server'

export const dynamic = 'force-dynamic'

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
    logger.error('WORDS', 'Error fetching word', { error: error.message })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const notion = new Client({
      auth: requireNotionToken(),
    })
    
    // Archive the page (Notion's way of "deleting")
    await notion.pages.update({
      page_id: params.id,
      archived: true,
    })

    logger.info('WORDS', `Deleted word ${params.id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('WORDS', 'Error deleting word', { error: error.message })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

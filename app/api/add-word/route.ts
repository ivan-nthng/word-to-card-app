import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { analyzeWord } from '@/lib/openai'
import { buildKey, findWordByKey, createWord, updateWord } from '@/lib/notion'
import { AddWordRequest, AddWordResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AddWordRequest = await request.json()
    const { word, context, forceLanguage } = body

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    // Step 1: Analyze with OpenAI
    const openaiResponse = await analyzeWord(word.trim())

    // Step 2: Determine target language
    let targetLanguage: 'pt' | 'en'
    if (openaiResponse.detected_language === 'ru') {
      if (!forceLanguage || (forceLanguage !== 'pt' && forceLanguage !== 'en')) {
        return NextResponse.json(
          { error: 'forceLanguage (pt or en) is required when detected language is ru' },
          { status: 400 }
        )
      }
      targetLanguage = forceLanguage
    } else if (openaiResponse.detected_language === 'pt' || openaiResponse.detected_language === 'en') {
      targetLanguage = openaiResponse.detected_language
    } else {
      return NextResponse.json(
        { error: `Unsupported detected language: ${openaiResponse.detected_language}` },
        { status: 400 }
      )
    }

    // Step 3: Build key and check if word exists
    const key = buildKey(targetLanguage, word.trim())
    const existingWord = await findWordByKey(key)

    // Step 4: Get final word
    const finalWord = openaiResponse.pos === 'verb' && openaiResponse.normalized.infinitive
      ? openaiResponse.normalized.infinitive
      : openaiResponse.normalized.lemma || word.trim()

    // Step 5: Create or update
    let status: 'created' | 'updated'
    if (existingWord) {
      await updateWord(existingWord.id, openaiResponse, context)
      status = 'updated'
    } else {
      await createWord(key, finalWord, targetLanguage, openaiResponse, context)
      status = 'created'
    }

    const response: AddWordResponse = {
      status,
      key,
      finalWord,
      lang: targetLanguage,
      pos: openaiResponse.pos,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error adding word:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

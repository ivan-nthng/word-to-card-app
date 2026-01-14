import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AUTH_ENABLED } from '@/lib/config'
import { analyzeWord } from '@/lib/openai'
import {
    buildKey,
    findWordByKey,
    createWord,
    updateWord,
    validateNotionSchema,
} from '@/lib/notion'
import { AddWordRequest, AddWordResponse } from '@/lib/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Validate schema once on first request (lazy validation)
let schemaValidated = false
let schemaValidationPromise: Promise<void> | null = null

async function ensureSchemaValidated() {
    if (schemaValidated) return
    if (!schemaValidationPromise) {
        schemaValidationPromise = validateNotionSchema()
            .then(() => {
                schemaValidated = true
            })
            .catch((err) => {
                console.error(
                    '[ADD_WORD] Schema validation failed:',
                    err.message,
                )
                // Don't block requests if validation fails
            })
    }
    await schemaValidationPromise
}

export async function POST(request: NextRequest) {
    // Validate schema on first request, not at module load
    await ensureSchemaValidated()
    const traceId = randomUUID()
    let step = 'start'

    try {
        // Skip auth check when AUTH_ENABLED is false
        if (AUTH_ENABLED) {
            const session = await getSession()
            if (!session) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }
        }

        const body: AddWordRequest = await request.json()
        const { word, targetLanguage } = body

        // Step 1: Start
        step = 'start'
        const originalInput = word.trim()
        console.log(
            `[ADD_WORD] ${traceId} Start - word: "${originalInput}", targetLanguage: ${targetLanguage}`,
        )

        if (!word || typeof word !== 'string') {
            return NextResponse.json(
                { error: 'Word is required' },
                { status: 400 },
            )
        }

        if (
            !targetLanguage ||
            (targetLanguage !== 'pt' && targetLanguage !== 'en')
        ) {
            return NextResponse.json(
                { error: 'targetLanguage (pt or en) is required' },
                { status: 400 },
            )
        }

        // Step 2: OpenAI - before call
        step = 'openai_before'
        console.log(
            `[ADD_WORD] ${traceId} OpenAI before - model: gpt-4o-mini, word: "${originalInput}"`,
        )

        const openaiResponse = await analyzeWord(originalInput)

        // Step 3: OpenAI - after call
        step = 'openai_after'
        console.log(
            `[ADD_WORD] ${traceId} OpenAI after - detected_language: ${openaiResponse.detected_language}, pos: ${openaiResponse.pos}, ` +
                `lemma: "${
                    openaiResponse.normalized.lemma || ''
                }", infinitive: "${
                    openaiResponse.normalized.infinitive || ''
                }", ` +
                `confidence: ${openaiResponse.confidence}`,
        )

        // Step 4: Compute final language + key
        step = 'compute_lang'
        let finalLanguage: 'pt' | 'en'
        if (openaiResponse.detected_language === 'ru') {
            finalLanguage = targetLanguage
        } else if (
            openaiResponse.detected_language === 'pt' ||
            openaiResponse.detected_language === 'en'
        ) {
            finalLanguage = openaiResponse.detected_language
        } else {
            throw new Error(
                `Unsupported detected language: ${openaiResponse.detected_language}`,
            )
        }

        const finalWord =
            openaiResponse.pos === 'verb' &&
            openaiResponse.normalized.infinitive
                ? openaiResponse.normalized.infinitive
                : openaiResponse.normalized.lemma || originalInput

        // Determine if correction was applied
        const corrected =
            finalWord.toLowerCase() !== originalInput.toLowerCase()
        console.log(
            `[ADD_WORD] ${traceId} Normalization - input: "${originalInput}", corrected: "${finalWord}", corrected: ${corrected}`,
        )

        const key = buildKey(finalLanguage, finalWord)
        console.log(
            `[ADD_WORD] ${traceId} Compute lang/key - finalLanguage: ${finalLanguage}, key: "${key}", finalWord: "${finalWord}"`,
        )

        // Step 5: Notion - before query
        step = 'notion_query_before'
        console.log(`[ADD_WORD] ${traceId} Notion query before - key: "${key}"`)

        const existingWord = await findWordByKey(key)

        // Step 6: Notion - after query
        step = 'notion_query_after'
        if (existingWord) {
            console.log(
                `[ADD_WORD] ${traceId} Notion query after - found: true, pageId: ${existingWord.id}`,
            )
        } else {
            console.log(
                `[ADD_WORD] ${traceId} Notion query after - found: false`,
            )
        }

        // Step 7: Notion - before create/update
        step = 'notion_write_before'
        let status: 'created' | 'updated'
        let pageId: string
        const operation = existingWord ? 'update' : 'create'
        const propertyNames = ['Word', 'Key', 'Language', 'Typo', 'Translation']
        if (finalLanguage === 'pt' && openaiResponse.pos === 'verb') {
            propertyNames.push('Voce', 'ele/ela', 'eles/elas', 'Nos')
        }
        console.log(
            `[ADD_WORD] ${traceId} Notion ${operation} before - properties: ${propertyNames.join(
                ', ',
            )}`,
        )

        if (existingWord) {
            await updateWord(existingWord.id, finalLanguage, openaiResponse)
            status = 'updated'
            pageId = existingWord.id
        } else {
            pageId = await createWord(
                key,
                finalWord,
                finalLanguage,
                openaiResponse,
            )
            status = 'created'
        }

        // Step 8: Notion - after create/update
        step = 'notion_write_after'
        console.log(
            `[ADD_WORD] ${traceId} Notion ${operation} after - status: ok, pageId: ${pageId}`,
        )

        const response: AddWordResponse = {
            status,
            key,
            finalWord,
            lang: finalLanguage,
            pos: openaiResponse.pos,
        }

        console.log(
            `[ADD_WORD] ${traceId} Success - status: ${status}, key: "${key}", lang: ${finalLanguage}, pos: ${openaiResponse.pos}`,
        )

        return NextResponse.json(response)
    } catch (error: any) {
        // Step 9: Error handler
        step = 'error'
        const errorMessage = error.message || 'Internal server error'
        const errorDetails =
            error.response?.data || error.body || error.toString()
        const truncatedDetails =
            typeof errorDetails === 'string'
                ? errorDetails.substring(0, 500)
                : JSON.stringify(errorDetails).substring(0, 500)

        console.error(
            `[ADD_WORD] ${traceId} Error at step "${step}" - message: ${errorMessage}` +
                (errorDetails ? `, details: ${truncatedDetails}` : ''),
        )

        const statusCode = error.status || error.statusCode || 500
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode },
        )
    }
}

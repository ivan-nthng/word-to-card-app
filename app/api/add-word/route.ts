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
import { logger } from '@/lib/logger'
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
                logger.error('ADD_WORD', 'Schema validation failed', {
                    error: err.message,
                })
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
        logger.info(
            'ADD_WORD',
            `Start - word: "${originalInput}", targetLanguage: ${targetLanguage}`,
            { traceId },
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
        logger.info(
            'ADD_WORD',
            `OpenAI before - model: gpt-4o-mini, word: "${originalInput}"`,
            { traceId },
        )

        const openaiResponse = await analyzeWord(originalInput)

        // Step 3: OpenAI - after call
        step = 'openai_after'
        logger.info('ADD_WORD', 'OpenAI after', {
            traceId,
            detected_language: openaiResponse.detected_language,
            pos: openaiResponse.pos,
            lemma: openaiResponse.normalized.lemma || '',
            infinitive: openaiResponse.normalized.infinitive || '',
            confidence: openaiResponse.confidence,
        })

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
        logger.info('ADD_WORD', 'Normalization', {
            traceId,
            input: originalInput,
            corrected: finalWord,
            wasCorrected: corrected,
        })

        const key = buildKey(finalLanguage, finalWord)
        logger.info('ADD_WORD', 'Compute lang/key', {
            traceId,
            finalLanguage,
            key,
            finalWord,
        })

        // Step 5: Notion - before query
        step = 'notion_query_before'
        logger.info('ADD_WORD', `Notion query before - key: "${key}"`, {
            traceId,
        })

        const existingWord = await findWordByKey(key)

        // Step 6: Notion - after query
        step = 'notion_query_after'
        if (existingWord) {
            logger.info('ADD_WORD', 'Notion query after - found: true', {
                traceId,
                pageId: existingWord.id,
            })
        } else {
            logger.info('ADD_WORD', 'Notion query after - found: false', {
                traceId,
            })
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
        logger.info('ADD_WORD', `Notion ${operation} before`, {
            traceId,
            properties: propertyNames,
        })

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
        logger.info('ADD_WORD', `Notion ${operation} after - status: ok`, {
            traceId,
            pageId,
        })

        const response: AddWordResponse = {
            status,
            key,
            finalWord,
            lang: finalLanguage,
            pos: openaiResponse.pos,
        }

        logger.info('ADD_WORD', 'Success', {
            traceId,
            status,
            key,
            lang: finalLanguage,
            pos: openaiResponse.pos,
        })

        return NextResponse.json(response)
    } catch (error: any) {
        // Step 9: Error handler
        step = 'error'
        let errorMessage = error.message || 'Internal server error'
        const errorDetails =
            error.response?.data || error.body || error.toString()
        const truncatedDetails =
            typeof errorDetails === 'string'
                ? errorDetails.substring(0, 500)
                : JSON.stringify(errorDetails).substring(0, 500)

        // Provide user-friendly error messages for common network errors
        if (
            errorMessage.includes('ECONNRESET') ||
            errorMessage.includes('ETIMEDOUT') ||
            errorMessage.includes('timeout')
        ) {
            errorMessage =
                'Network error: Unable to connect to Notion. Please try again in a moment.'
        } else if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
            errorMessage =
                'Rate limit exceeded. Please wait a moment and try again.'
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
            errorMessage =
                'Authentication error: Please check your Notion token in environment variables.'
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            errorMessage =
                'Notion database not found. Please check your database ID in environment variables.'
        }

        logger.error('ADD_WORD', `Error at step "${step}"`, {
            traceId,
            error: error.message || errorMessage,
            details: truncatedDetails,
        })

        const statusCode = error.status || error.statusCode || 500
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode },
        )
    }
}

import { Client } from '@notionhq/client'
import { OpenAIResponse } from './types'
import { NotionWord } from './types'
import { getNotionToken, getNotionDatabaseId } from './env'
import { logger } from './logger'

// Initialize Notion client lazily to avoid validation during build
let notionInstance: Client | null = null
let databaseIdCache: string | null = null

function getNotion(): Client {
    if (!notionInstance) {
        notionInstance = new Client({
            auth: getNotionToken(),
            timeoutMs: 10000, // 10 second timeout
        })
    }
    return notionInstance
}

// Retry wrapper for Notion API calls with exponential backoff
async function retryNotionCall<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error: any) {
            lastError = error

            // Check if it's a retryable error
            const isRetryable =
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('ETIMEDOUT') ||
                error.message?.includes('ENOTFOUND') ||
                error.message?.includes('timeout') ||
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                (error.status && error.status >= 500 && error.status < 600)

            if (!isRetryable || attempt === maxRetries - 1) {
                throw error
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt)
            logger.info(
                'NOTION',
                `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
                {
                    error: error.message,
                },
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError || new Error('Unknown error in retry logic')
}

function getDatabaseId(): string {
    if (!databaseIdCache) {
        databaseIdCache = getNotionDatabaseId()
    }
    return databaseIdCache
}

// Required Notion properties
const REQUIRED_PROPERTIES = [
    'Word',
    'Translation',
    'Typo',
    'Language',
    'Key',
    'Voce',
    'ele/ela',
    'eles/elas',
    'Nos',
]

// Schema validation cache
let schemaValidated = false
let schemaValidationError: Error | null = null

export async function validateNotionSchema(): Promise<void> {
    if (schemaValidated) {
        if (schemaValidationError) {
            throw schemaValidationError
        }
        return
    }

    try {
        const notion = getNotion()
        const database = await retryNotionCall(() =>
            notion.databases.retrieve({
                database_id: getDatabaseId(),
            }),
        )
        const properties = (database as any).properties
        const propertyNames = Object.keys(properties)

        for (const requiredProp of REQUIRED_PROPERTIES) {
            if (!propertyNames.includes(requiredProp)) {
                const error = new Error(
                    `Notion property "${requiredProp}" not found. Check database schema.`,
                )
                schemaValidationError = error
                schemaValidated = true
                throw error
            }
        }

        schemaValidated = true
    } catch (error: any) {
        if (error.message?.includes('Notion property')) {
            schemaValidationError = error
            schemaValidated = true
            throw error
        }
        // If it's a different error (network, auth, etc.), don't cache it
        throw error
    }
}

/**
 * Normalizes a word for deduplication purposes.
 * - Lower-cases
 * - Trims whitespace
 * - Collapses multiple spaces to single
 * - Removes trailing punctuation (.,!?)
 * - Keeps diacritics (does not strip accents)
 */
function normalizeWordKey(word: string): string {
    return word
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/[.,!?]+$/, '') // Remove trailing punctuation
        .trim()
}

/**
 * Creates a deduplication key from word title and language.
 * Format: "Portuguese:normalized_word" or "English:normalized_word"
 */
function makeDedupKey(
    wordTitle: string,
    language: 'Portuguese' | 'English',
): string {
    return `${language}:${normalizeWordKey(wordTitle)}`
}

/**
 * Builds a deduplication key in format: "pt|word" or "en|word"
 * Uses normalized word (lowercase, trimmed) for consistency
 */
function buildKey(language: 'pt' | 'en', input: string): string {
    return `${language}|${normalizeWordKey(input)}`
}

export function mapLanguage(lang: 'pt' | 'en'): 'Portuguese' | 'English' {
    return lang === 'pt' ? 'Portuguese' : 'English'
}

function mapTypo(pos: string): 'Verbo' | 'substantivo' | 'Adjetivo' {
    if (pos === 'verb') return 'Verbo'
    if (pos === 'noun') return 'substantivo'
    if (pos === 'adjective') return 'Adjetivo'
    return 'substantivo'
}

function notionToWord(page: any): NotionWord {
    const props = page.properties

    return {
        id: page.id,
        word: props.Word?.title?.[0]?.plain_text || '',
        translation: props.Translation?.rich_text?.[0]?.plain_text || '',
        context: props.Context?.rich_text?.[0]?.plain_text || '',
        eu: props.eu?.rich_text?.[0]?.plain_text || '',
        voce: props.Voce?.rich_text?.[0]?.plain_text || '',
        eleEla: props['ele/ela']?.rich_text?.[0]?.plain_text || '',
        elesElas: props['eles/elas']?.rich_text?.[0]?.plain_text || '',
        nos: props.Nos?.rich_text?.[0]?.plain_text || '',
        Perfeito_eu: props.Perfeito_eu?.rich_text?.[0]?.plain_text || '',
        Perfeito_voce: props.Perfeito_voce?.rich_text?.[0]?.plain_text || '',
        Perfeito_eleEla:
            props['Perfeito_ele/ela']?.rich_text?.[0]?.plain_text || '',
        Perfeito_elesElas:
            props['Perfeito_eles/elas']?.rich_text?.[0]?.plain_text || '',
        Perfeito_nos: props.Perfeito_nos?.rich_text?.[0]?.plain_text || '',
        Imperfeito_eu: props.Imperfeito_eu?.rich_text?.[0]?.plain_text || '',
        Imperfeito_voce:
            props.Imperfeito_voce?.rich_text?.[0]?.plain_text || '',
        Imperfeito_eleEla:
            props['Imperfeito_ele/ela']?.rich_text?.[0]?.plain_text || '',
        Imperfeito_elesElas:
            props['Imperfeito_eles/elas']?.rich_text?.[0]?.plain_text || '',
        Imperfeito_nos: props.Imperfeito_nos?.rich_text?.[0]?.plain_text || '',
        typo: props.Typo?.select?.name || 'substantivo',
        language: props.Language?.select?.name || 'Portuguese',
        key: props.Key?.rich_text?.[0]?.plain_text || '',
        learned: props.Learned?.checkbox || false,
        decks: props.Deck?.multi_select?.map((item: any) => item.name) || [],
    }
}

export async function findWordByKey(key: string): Promise<any | null> {
    const notion = getNotion()
    const response = await retryNotionCall(() =>
        notion.databases.query({
            database_id: getDatabaseId(),
            filter: {
                property: 'Key',
                rich_text: {
                    equals: key,
                },
            },
            page_size: 1,
        }),
    )

    if (response.results.length === 0) {
        return null
    }

    if (response.results.length > 1) {
        throw new Error(
            `Multiple records found with key ${key}. Data corruption detected.`,
        )
    }

    return response.results[0]
}

/**
 * Finds a word by normalized word title and language.
 * First tries to find by Key property (preferred).
 * Falls back to searching by Title and Language if Key doesn't exist (migration safety).
 */
export async function findWordByDedupKey(
    normalizedWordTitle: string,
    language: 'Portuguese' | 'English',
): Promise<any | null> {
    // Convert language name to code for key format (pt|word or en|word)
    const langCode = language === 'Portuguese' ? 'pt' : 'en'
    const dedupKey = buildKey(langCode, normalizedWordTitle)
    logger.info('ADD_WORD', `Searching for word with dedupKey: "${dedupKey}"`)

    // Try Key-based search first (preferred method)
    const byKey = await findWordByKey(dedupKey)
    if (byKey) {
        logger.info('ADD_WORD', `Found existing word by Key`, {
            pageId: byKey.id,
            dedupKey,
        })
        return byKey
    }

    // Fallback: search by Title and Language (for migration safety)
    logger.info(
        'ADD_WORD',
        'Key search failed, trying fallback by Title+Language',
    )
    const notion = getNotion()
    const normalizedSearch = normalizeWordKey(normalizedWordTitle)

    const response = await retryNotionCall(() =>
        notion.databases.query({
            database_id: getDatabaseId(),
            filter: {
                and: [
                    {
                        property: 'Language',
                        select: {
                            equals: language,
                        },
                    },
                ],
            },
            page_size: 100, // Get multiple to compare normalized titles
        }),
    )

    // Find exact match by comparing normalized titles
    for (const page of response.results) {
        // Type guard: ensure page has properties
        if ('properties' in page && page.properties) {
            const pageTitle =
                (page.properties as any).Word?.title?.[0]?.plain_text || ''
            const pageNormalized = normalizeWordKey(pageTitle)
            if (pageNormalized === normalizedSearch) {
                logger.info(
                    'ADD_WORD',
                    `Found existing word by Title+Language (fallback)`,
                    {
                        pageId: page.id,
                        originalTitle: pageTitle,
                        normalizedTitle: pageNormalized,
                    },
                )
                return page
            }
        }
    }

    logger.info('ADD_WORD', 'No existing word found', { dedupKey })
    return null
}

function mapVerbTenseToProperties(
    tense:
        | { voce: string; ele_ela: string; eles_elas: string; nos: string }
        | undefined,
    prefix: string,
): any {
    if (!tense) return {}

    return {
        [`${prefix}_voce`]: {
            rich_text: tense.voce ? [{ text: { content: tense.voce } }] : [],
        },
        [`${prefix}_ele/ela`]: {
            rich_text: tense.ele_ela
                ? [{ text: { content: tense.ele_ela } }]
                : [],
        },
        [`${prefix}_eles/elas`]: {
            rich_text: tense.eles_elas
                ? [{ text: { content: tense.eles_elas } }]
                : [],
        },
        [`${prefix}_nos`]: {
            rich_text: tense.nos ? [{ text: { content: tense.nos } }] : [],
        },
    }
}

export async function createWord(
    key: string,
    finalWord: string,
    language: 'pt' | 'en',
    openaiResponse: OpenAIResponse,
): Promise<string> {
    const isPortugueseVerb = language === 'pt' && openaiResponse.pos === 'verb'

    const properties: any = {
        Word: {
            title: [
                {
                    text: {
                        content: finalWord,
                    },
                },
            ],
        },
        Key: {
            rich_text: [
                {
                    text: {
                        content: key,
                    },
                },
            ],
        },
        Language: {
            select: {
                name: mapLanguage(language),
            },
        },
        Typo: {
            select: {
                name: mapTypo(openaiResponse.pos),
            },
        },
        Translation: {
            rich_text: [
                {
                    text: {
                        content: openaiResponse.translation_ru || '',
                    },
                },
            ],
        },
    }

    if (isPortugueseVerb && openaiResponse.verb) {
        if (openaiResponse.verb.presente) {
            logger.info('ADD_WORD', 'Mapping presente')
            const presente = openaiResponse.verb.presente
            if (presente.eu) {
                properties.eu = {
                    rich_text: [{ text: { content: presente.eu } }],
                }
            }
            properties.Voce = {
                rich_text: presente.voce
                    ? [{ text: { content: presente.voce } }]
                    : [],
            }
            properties['ele/ela'] = {
                rich_text: presente.ele_ela
                    ? [{ text: { content: presente.ele_ela } }]
                    : [],
            }
            properties['eles/elas'] = {
                rich_text: presente.eles_elas
                    ? [{ text: { content: presente.eles_elas } }]
                    : [],
            }
            properties.Nos = {
                rich_text: presente.nos
                    ? [{ text: { content: presente.nos } }]
                    : [],
            }
        }

        if (openaiResponse.verb.preterito_perfeito) {
            logger.info('ADD_WORD', 'Mapping preterito_perfeito')
            Object.assign(
                properties,
                mapVerbTenseToProperties(
                    openaiResponse.verb.preterito_perfeito,
                    'Perfeito',
                ),
            )
            // Map eu field separately
            if (openaiResponse.verb.preterito_perfeito.eu) {
                logger.info('ADD_WORD', 'Mapping perfeito (eu)')
                properties.Perfeito_eu = {
                    rich_text: [
                        {
                            text: {
                                content:
                                    openaiResponse.verb.preterito_perfeito.eu,
                            },
                        },
                    ],
                }
            }
        }

        if (openaiResponse.verb.preterito_imperfeito) {
            logger.info('ADD_WORD', 'Mapping preterito_imperfeito')
            Object.assign(
                properties,
                mapVerbTenseToProperties(
                    openaiResponse.verb.preterito_imperfeito,
                    'Imperfeito',
                ),
            )
            // Map eu field separately
            if (openaiResponse.verb.preterito_imperfeito.eu) {
                logger.info('ADD_WORD', 'Mapping imperfeito (eu)')
                properties.Imperfeito_eu = {
                    rich_text: [
                        {
                            text: {
                                content:
                                    openaiResponse.verb.preterito_imperfeito.eu,
                            },
                        },
                    ],
                }
            }
            logger.info(
                'ADD_WORD',
                'Mapping imperfeito (ele/ela, eles/elas, nos)',
            )
        }
    }

    const notion = getNotion()
    const response = await retryNotionCall(() =>
        notion.pages.create({
            parent: {
                database_id: getDatabaseId(),
            },
            properties,
        }),
    )

    return response.id
}

/**
 * Checks if a Notion property value is empty.
 * Empty definitions:
 * - Rich text: empty array OR only whitespace
 * - Select: null
 * - Multi-select: empty array
 * - Checkbox: false is NOT empty (treat as real value)
 */
function isPropertyEmpty(property: any): boolean {
    if (!property) return true

    // Rich text
    if (property.rich_text) {
        const text = property.rich_text?.[0]?.plain_text || ''
        return text.trim() === ''
    }

    // Select
    if (property.select !== undefined) {
        return property.select === null
    }

    // Multi-select
    if (property.multi_select !== undefined) {
        return !property.multi_select || property.multi_select.length === 0
    }

    // Checkbox: false is NOT empty (do not override)
    if (property.checkbox !== undefined) {
        return false // Never treat checkbox as empty
    }

    // Title (should never be empty, but check anyway)
    if (property.title) {
        const text = property.title?.[0]?.plain_text || ''
        return text.trim() === ''
    }

    return true
}

/**
 * Updates a word, but only fills fields that are currently empty.
 * Never overwrites non-empty values.
 * Returns list of fields that were updated.
 */
export async function updateWordOnlyEmptyFields(
    pageId: string,
    language: 'pt' | 'en',
    openaiResponse: OpenAIResponse,
): Promise<string[]> {
    const notion = getNotion()
    const page = await retryNotionCall(() =>
        notion.pages.retrieve({ page_id: pageId }),
    )
    const props = (page as any).properties
    const currentLanguage = props.Language?.select?.name
    const currentTypo = props.Typo?.select?.name
    const isPortugueseVerb =
        currentLanguage === 'Portuguese' && currentTypo === 'Verbo'

    const updatedFields: string[] = []
    const properties: any = {}

    // Translation - only update if empty
    if (isPropertyEmpty(props.Translation)) {
        properties.Translation = {
            rich_text: [
                {
                    text: {
                        content: openaiResponse.translation_ru || '',
                    },
                },
            ],
        }
        updatedFields.push('Translation')
    }

    // Verb forms - only for Portuguese verbs
    if (isPortugueseVerb && openaiResponse.verb) {
        // Presente
        if (openaiResponse.verb.presente) {
            const presente = openaiResponse.verb.presente

            if (presente.eu && isPropertyEmpty(props.eu)) {
                properties.eu = {
                    rich_text: [{ text: { content: presente.eu } }],
                }
                updatedFields.push('eu')
            }

            if (isPropertyEmpty(props.Voce) && presente.voce) {
                properties.Voce = {
                    rich_text: [{ text: { content: presente.voce } }],
                }
                updatedFields.push('Voce')
            }

            if (isPropertyEmpty(props['ele/ela']) && presente.ele_ela) {
                properties['ele/ela'] = {
                    rich_text: [{ text: { content: presente.ele_ela } }],
                }
                updatedFields.push('ele/ela')
            }

            if (isPropertyEmpty(props['eles/elas']) && presente.eles_elas) {
                properties['eles/elas'] = {
                    rich_text: [{ text: { content: presente.eles_elas } }],
                }
                updatedFields.push('eles/elas')
            }

            if (isPropertyEmpty(props.Nos) && presente.nos) {
                properties.Nos = {
                    rich_text: [{ text: { content: presente.nos } }],
                }
                updatedFields.push('Nos')
            }
        }

        // Pretérito Perfeito
        if (openaiResponse.verb.preterito_perfeito) {
            const perfeito = openaiResponse.verb.preterito_perfeito

            if (perfeito.eu && isPropertyEmpty(props.Perfeito_eu)) {
                properties.Perfeito_eu = {
                    rich_text: [{ text: { content: perfeito.eu } }],
                }
                updatedFields.push('Perfeito_eu')
            }

            if (isPropertyEmpty(props.Perfeito_voce) && perfeito.voce) {
                properties.Perfeito_voce = {
                    rich_text: [{ text: { content: perfeito.voce } }],
                }
                updatedFields.push('Perfeito_voce')
            }

            if (
                isPropertyEmpty(props['Perfeito_ele/ela']) &&
                perfeito.ele_ela
            ) {
                properties['Perfeito_ele/ela'] = {
                    rich_text: [{ text: { content: perfeito.ele_ela } }],
                }
                updatedFields.push('Perfeito_ele/ela')
            }

            if (
                isPropertyEmpty(props['Perfeito_eles/elas']) &&
                perfeito.eles_elas
            ) {
                properties['Perfeito_eles/elas'] = {
                    rich_text: [{ text: { content: perfeito.eles_elas } }],
                }
                updatedFields.push('Perfeito_eles/elas')
            }

            if (isPropertyEmpty(props.Perfeito_nos) && perfeito.nos) {
                properties.Perfeito_nos = {
                    rich_text: [{ text: { content: perfeito.nos } }],
                }
                updatedFields.push('Perfeito_nos')
            }
        }

        // Pretérito Imperfeito
        if (openaiResponse.verb.preterito_imperfeito) {
            const imperfeito = openaiResponse.verb.preterito_imperfeito

            if (imperfeito.eu && isPropertyEmpty(props.Imperfeito_eu)) {
                properties.Imperfeito_eu = {
                    rich_text: [{ text: { content: imperfeito.eu } }],
                }
                updatedFields.push('Imperfeito_eu')
            }

            if (isPropertyEmpty(props.Imperfeito_voce) && imperfeito.voce) {
                properties.Imperfeito_voce = {
                    rich_text: [{ text: { content: imperfeito.voce } }],
                }
                updatedFields.push('Imperfeito_voce')
            }

            if (
                isPropertyEmpty(props['Imperfeito_ele/ela']) &&
                imperfeito.ele_ela
            ) {
                properties['Imperfeito_ele/ela'] = {
                    rich_text: [{ text: { content: imperfeito.ele_ela } }],
                }
                updatedFields.push('Imperfeito_ele/ela')
            }

            if (
                isPropertyEmpty(props['Imperfeito_eles/elas']) &&
                imperfeito.eles_elas
            ) {
                properties['Imperfeito_eles/elas'] = {
                    rich_text: [{ text: { content: imperfeito.eles_elas } }],
                }
                updatedFields.push('Imperfeito_eles/elas')
            }

            if (isPropertyEmpty(props.Imperfeito_nos) && imperfeito.nos) {
                properties.Imperfeito_nos = {
                    rich_text: [{ text: { content: imperfeito.nos } }],
                }
                updatedFields.push('Imperfeito_nos')
            }
        }
    }

    // Only update if there are fields to update
    if (Object.keys(properties).length > 0) {
        await retryNotionCall(() =>
            notion.pages.update({
                page_id: pageId,
                properties,
            }),
        )
    }

    return updatedFields
}

/**
 * Legacy updateWord function - always overwrites (for backward compatibility).
 * @deprecated Use updateWordOnlyEmptyFields for new code
 */
export async function updateWord(
    pageId: string,
    language: 'pt' | 'en',
    openaiResponse: OpenAIResponse,
): Promise<void> {
    const notion = getNotion()
    const page = await retryNotionCall(() =>
        notion.pages.retrieve({ page_id: pageId }),
    )
    const props = (page as any).properties
    const currentLanguage = props.Language?.select?.name
    const currentTypo = props.Typo?.select?.name
    const isPortugueseVerb =
        currentLanguage === 'Portuguese' && currentTypo === 'Verbo'

    const properties: any = {
        Translation: {
            rich_text: [
                {
                    text: {
                        content: openaiResponse.translation_ru || '',
                    },
                },
            ],
        },
    }

    if (isPortugueseVerb && openaiResponse.verb) {
        if (openaiResponse.verb.presente) {
            logger.info('ADD_WORD', 'Mapping presente')
            const presente = openaiResponse.verb.presente
            if (presente.eu) {
                properties.eu = {
                    rich_text: [{ text: { content: presente.eu } }],
                }
            }
            properties.Voce = {
                rich_text: presente.voce
                    ? [{ text: { content: presente.voce } }]
                    : [],
            }
            properties['ele/ela'] = {
                rich_text: presente.ele_ela
                    ? [{ text: { content: presente.ele_ela } }]
                    : [],
            }
            properties['eles/elas'] = {
                rich_text: presente.eles_elas
                    ? [{ text: { content: presente.eles_elas } }]
                    : [],
            }
            properties.Nos = {
                rich_text: presente.nos
                    ? [{ text: { content: presente.nos } }]
                    : [],
            }
        }

        if (openaiResponse.verb.preterito_perfeito) {
            logger.info('ADD_WORD', 'Mapping preterito_perfeito')
            Object.assign(
                properties,
                mapVerbTenseToProperties(
                    openaiResponse.verb.preterito_perfeito,
                    'Perfeito',
                ),
            )
            // Map eu field separately
            if (openaiResponse.verb.preterito_perfeito.eu) {
                logger.info('ADD_WORD', 'Mapping perfeito (eu)')
                properties.Perfeito_eu = {
                    rich_text: [
                        {
                            text: {
                                content:
                                    openaiResponse.verb.preterito_perfeito.eu,
                            },
                        },
                    ],
                }
            }
        }

        if (openaiResponse.verb.preterito_imperfeito) {
            logger.info('ADD_WORD', 'Mapping preterito_imperfeito')
            Object.assign(
                properties,
                mapVerbTenseToProperties(
                    openaiResponse.verb.preterito_imperfeito,
                    'Imperfeito',
                ),
            )
            // Map eu field separately
            if (openaiResponse.verb.preterito_imperfeito.eu) {
                logger.info('ADD_WORD', 'Mapping imperfeito (eu)')
                properties.Imperfeito_eu = {
                    rich_text: [
                        {
                            text: {
                                content:
                                    openaiResponse.verb.preterito_imperfeito.eu,
                            },
                        },
                    ],
                }
            }
            logger.info(
                'ADD_WORD',
                'Mapping imperfeito (ele/ela, eles/elas, nos)',
            )
        }
    }

    await retryNotionCall(() =>
        notion.pages.update({
            page_id: pageId,
            properties,
        }),
    )
}

export async function getLatestWords(
    limit: number = 50,
): Promise<NotionWord[]> {
    const notion = getNotion()
    const response = await retryNotionCall(() =>
        notion.databases.query({
            database_id: getDatabaseId(),
            sorts: [
                {
                    timestamp: 'created_time',
                    direction: 'descending',
                },
            ],
            page_size: limit,
        }),
    )

    return response.results.map(notionToWord)
}

export async function getWords(filters?: {
    typo?: string
    language?: string
    search?: string
}): Promise<NotionWord[]> {
    logger.info('WORDS', 'Fetching words with filters', { filters })

    try {
        const filterConditions: any[] = []

        if (filters?.typo && filters.typo !== 'All') {
            filterConditions.push({
                property: 'Typo',
                select: {
                    equals: filters.typo,
                },
            })
        }

        if (filters?.language && filters.language !== 'All') {
            filterConditions.push({
                property: 'Language',
                select: {
                    equals: filters.language,
                },
            })
        }

        // Note: Notion doesn't support full-text search on title easily
        // We'll fetch all and filter client-side for MVP
        const notion = getNotion()
        const response = await retryNotionCall(() =>
            notion.databases.query({
                database_id: getDatabaseId(),
                filter:
                    filterConditions.length > 0
                        ? { and: filterConditions }
                        : undefined,
                sorts: [
                    {
                        timestamp: 'created_time',
                        direction: 'descending',
                    },
                ],
                page_size: 100, // Fetch more for search filtering
            }),
        )

        let words = response.results.map(notionToWord)

        // Client-side search filtering
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase()
            words = words.filter(
                (w) =>
                    w.word.toLowerCase().includes(searchLower) ||
                    w.translation.toLowerCase().includes(searchLower),
            )
        }

        logger.info('WORDS', `Returning ${words.length} words`)
        return words
    } catch (error: any) {
        logger.error('WORDS', 'Error fetching words', { error: error.message })
        throw error
    }
}

export async function getAllWords(): Promise<NotionWord[]> {
    logger.info('WORDS', 'Fetching all words')

    try {
        const allWords: NotionWord[] = []
        let cursor: string | undefined = undefined

        do {
            const notion = getNotion()
            const response = await retryNotionCall(() =>
                notion.databases.query({
                    database_id: getDatabaseId(),
                    start_cursor: cursor,
                    page_size: 100,
                }),
            )

            allWords.push(...response.results.map(notionToWord))
            cursor = response.next_cursor || undefined
        } while (cursor)

        logger.info('WORDS', `Fetched ${allWords.length} total words`)
        return allWords
    } catch (error: any) {
        logger.error('WORDS', 'Error fetching all words', {
            error: error.message,
        })
        throw error
    }
}

export interface DeckSummary {
    name: string
    activeCount: number
    learnedCount: number
    totalCount: number
}

export async function getDeckSummary(): Promise<DeckSummary[]> {
    logger.info('DECK', 'Computing deck summary')

    try {
        const allWords = await getAllWords()

        // Build deck counts from all words
        const deckMap = new Map<string, { active: number; learned: number }>()

        for (const word of allWords) {
            for (const deckName of word.decks) {
                if (!deckMap.has(deckName)) {
                    deckMap.set(deckName, { active: 0, learned: 0 })
                }

                const counts = deckMap.get(deckName)!
                if (word.learned) {
                    counts.learned++
                } else {
                    counts.active++
                }
            }
        }

        const summary: DeckSummary[] = Array.from(deckMap.entries()).map(
            ([name, counts]) => ({
                name,
                activeCount: counts.active,
                learnedCount: counts.learned,
                totalCount: counts.active + counts.learned,
            }),
        )

        // Sort by name
        summary.sort((a, b) => a.name.localeCompare(b.name))

        logger.info('DECK', `Found ${summary.length} decks`)
        return summary
    } catch (error: any) {
        logger.error('DECK', 'Error computing deck summary', {
            error: error.message,
        })
        throw error
    }
}

export async function getAllDeckWords(deckName: string): Promise<NotionWord[]> {
    logger.info('DECK', `Querying all words for deck: "${deckName}"`)

    try {
        const notion = getNotion()
        const response = await retryNotionCall(() =>
            notion.databases.query({
                database_id: getDatabaseId(),
                filter: {
                    property: 'Deck',
                    multi_select: {
                        contains: deckName,
                    },
                },
                sorts: [
                    {
                        timestamp: 'created_time',
                        direction: 'ascending',
                    },
                ],
            }),
        )

        const words = response.results.map(notionToWord)
        logger.info(
            'DECK',
            `Found ${words.length} total words in deck: "${deckName}"`,
        )
        return words
    } catch (error: any) {
        logger.error('DECK', `Error querying all deck words "${deckName}"`, {
            error: error.message,
        })
        throw error
    }
}

export async function getWordById(pageId: string): Promise<NotionWord | null> {
    try {
        const notion = getNotion()
        const page = await notion.pages.retrieve({ page_id: pageId })
        return notionToWord(page as any)
    } catch (error) {
        return null
    }
}

// Deck operations

export async function addWordsToDeck(
    pageIds: string[],
    deckName: string,
): Promise<void> {
    logger.info('DECK', `Adding ${pageIds.length} words to deck: "${deckName}"`)

    const notion = getNotion()
    for (const pageId of pageIds) {
        try {
            // Get current page to read existing decks
            const page = await retryNotionCall(() =>
                notion.pages.retrieve({ page_id: pageId }),
            )
            const props = (page as any).properties
            const currentDecks =
                props.Deck?.multi_select?.map((item: any) => item.name) || []

            // Add deck name if not already present
            if (!currentDecks.includes(deckName)) {
                currentDecks.push(deckName)
            }

            // Update with new deck list
            await retryNotionCall(() =>
                notion.pages.update({
                    page_id: pageId,
                    properties: {
                        Deck: {
                            multi_select: currentDecks.map((name: string) => ({
                                name,
                            })),
                        },
                    },
                }),
            )

            logger.info('DECK', `Added word ${pageId} to deck: "${deckName}"`)
        } catch (error: any) {
            logger.error(
                'DECK',
                `Error adding word ${pageId} to deck "${deckName}"`,
                { error: error.message },
            )
            throw error
        }
    }
}

export async function removeWordsFromDeck(
    pageIds: string[],
    deckName: string,
): Promise<void> {
    logger.info(
        'DECK',
        `Removing ${pageIds.length} words from deck: "${deckName}"`,
    )

    const notion = getNotion()
    for (const pageId of pageIds) {
        try {
            // Get current page to read existing decks
            const page = await retryNotionCall(() =>
                notion.pages.retrieve({ page_id: pageId }),
            )
            const props = (page as any).properties
            const currentDecks =
                props.Deck?.multi_select?.map((item: any) => item.name) || []

            // Remove deck name
            const updatedDecks = currentDecks.filter(
                (name: string) => name !== deckName,
            )

            // Update with new deck list
            await retryNotionCall(() =>
                notion.pages.update({
                    page_id: pageId,
                    properties: {
                        Deck: {
                            multi_select: updatedDecks.map((name: string) => ({
                                name,
                            })),
                        },
                    },
                }),
            )

            logger.info(
                'DECK',
                `Removed word ${pageId} from deck: "${deckName}"`,
            )
        } catch (error: any) {
            logger.error(
                'DECK',
                `Error removing word ${pageId} from deck "${deckName}"`,
                { error: error.message },
            )
            throw error
        }
    }
}

export async function getDeckWords(deckName: string): Promise<NotionWord[]> {
    logger.info('DECK', `Querying words for deck: "${deckName}"`)

    try {
        const notion = getNotion()
        const response = await retryNotionCall(() =>
            notion.databases.query({
                database_id: getDatabaseId(),
                filter: {
                    and: [
                        {
                            property: 'Deck',
                            multi_select: {
                                contains: deckName,
                            },
                        },
                        {
                            property: 'Learned',
                            checkbox: {
                                equals: false,
                            },
                        },
                    ],
                },
                sorts: [
                    {
                        timestamp: 'created_time',
                        direction: 'ascending',
                    },
                ],
            }),
        )

        const words = response.results.map(notionToWord)
        logger.info(
            'DECK',
            `Found ${words.length} words in deck: "${deckName}"`,
        )
        return words
    } catch (error: any) {
        logger.error('DECK', `Error querying deck "${deckName}"`, {
            error: error.message,
        })
        throw error
    }
}

export async function markWordAsLearned(pageId: string): Promise<void> {
    logger.info('STUDY', `Marking word ${pageId} as learned`)

    try {
        const notion = getNotion()
        await retryNotionCall(() =>
            notion.pages.update({
                page_id: pageId,
                properties: {
                    Learned: {
                        checkbox: true,
                    },
                },
            }),
        )

        logger.info('STUDY', `Word ${pageId} marked as learned`)
    } catch (error: any) {
        logger.error('STUDY', `Error marking word ${pageId} as learned`, {
            error: error.message,
        })
        throw error
    }
}

export async function markWordAsNotLearned(pageId: string): Promise<void> {
    logger.info('STUDY', `Marking word ${pageId} as not learned`)

    try {
        const notion = getNotion()
        await retryNotionCall(() =>
            notion.pages.update({
                page_id: pageId,
                properties: {
                    Learned: {
                        checkbox: false,
                    },
                },
            }),
        )

        logger.info('STUDY', `Word ${pageId} marked as not learned`)
    } catch (error: any) {
        logger.error('STUDY', `Error marking word ${pageId} as not learned`, {
            error: error.message,
        })
        throw error
    }
}

export async function getTrainerWords(
    language: 'Portuguese' | 'English',
    presetId: 'active' | 'learned' | 'verbs' | 'nouns' | 'adjectives',
): Promise<NotionWord[]> {
    logger.info(
        'TRAINER',
        `Querying words - presetId: ${presetId}, language: ${language}`,
    )

    try {
        const filterConditions: any[] = [
            {
                property: 'Language',
                select: {
                    equals: language,
                },
            },
        ]

        if (presetId === 'active') {
            filterConditions.push({
                property: 'Learned',
                checkbox: {
                    equals: false,
                },
            })
        } else if (presetId === 'learned') {
            filterConditions.push({
                property: 'Learned',
                checkbox: {
                    equals: true,
                },
            })
        } else if (presetId === 'verbs') {
            filterConditions.push({
                property: 'Typo',
                select: {
                    equals: 'Verbo',
                },
            })
        } else if (presetId === 'nouns') {
            filterConditions.push({
                property: 'Typo',
                select: {
                    equals: 'substantivo',
                },
            })
        } else if (presetId === 'adjectives') {
            filterConditions.push({
                property: 'Typo',
                select: {
                    equals: 'Adjetivo',
                },
            })
        }

        logger.info('TRAINER', 'Notion query filter', { filterConditions })

        const notion = getNotion()
        const response = await retryNotionCall(() =>
            notion.databases.query({
                database_id: getDatabaseId(),
                filter: { and: filterConditions },
                sorts: [
                    {
                        timestamp: 'created_time',
                        direction: 'ascending',
                    },
                ],
            }),
        )

        const words = response.results.map(notionToWord)
        logger.info(
            'TRAINER',
            `Found ${words.length} words for preset: ${presetId}`,
        )
        return words
    } catch (error: any) {
        logger.error('TRAINER', 'Error querying trainer words', {
            error: error.message,
        })
        throw error
    }
}

export async function getTrainerPresetCounts(
    language: 'Portuguese' | 'English',
): Promise<{
    active: { active: number; total: number }
    learned: { active: number; total: number }
    verbs: { active: number; total: number }
    nouns: { active: number; total: number }
    adjectives: { active: number; total: number }
}> {
    logger.info('TRAINER', `Computing preset counts for language: ${language}`)

    try {
        // Get all words for this language
        const languageWords = await getWords({ language })

        const counts = {
            active: {
                active: languageWords.filter((w) => !w.learned).length,
                total: languageWords.filter((w) => !w.learned).length,
            },
            learned: {
                active: 0,
                total: languageWords.filter((w) => w.learned).length,
            },
            verbs: {
                active: languageWords.filter(
                    (w) => w.typo === 'Verbo' && !w.learned,
                ).length,
                total: languageWords.filter((w) => w.typo === 'Verbo').length,
            },
            nouns: {
                active: languageWords.filter(
                    (w) => w.typo === 'substantivo' && !w.learned,
                ).length,
                total: languageWords.filter((w) => w.typo === 'substantivo')
                    .length,
            },
            adjectives: {
                active: languageWords.filter(
                    (w) => w.typo === 'Adjetivo' && !w.learned,
                ).length,
                total: languageWords.filter((w) => w.typo === 'Adjetivo')
                    .length,
            },
        }

        logger.info('TRAINER', 'Preset counts', { counts })
        return counts
    } catch (error: any) {
        logger.error('TRAINER', 'Error computing preset counts', {
            error: error.message,
        })
        throw error
    }
}

export async function resetDeck(deckName: string): Promise<void> {
    logger.info('DECK', `Resetting deck: "${deckName}"`)

    try {
        const notion = getNotion()
        // Get all words in the deck (including learned ones)
        const response = await retryNotionCall(() =>
            notion.databases.query({
                database_id: getDatabaseId(),
                filter: {
                    property: 'Deck',
                    multi_select: {
                        contains: deckName,
                    },
                },
            }),
        )

        // Set learned=false for all words in the deck
        for (const page of response.results) {
            try {
                const notion = getNotion()
                await retryNotionCall(() =>
                    notion.pages.update({
                        page_id: page.id,
                        properties: {
                            Learned: {
                                checkbox: false,
                            },
                        },
                    }),
                )
            } catch (error: any) {
                logger.error(
                    'DECK',
                    `Error resetting word ${page.id} in deck "${deckName}"`,
                    { error: error.message },
                )
                // Continue with other words even if one fails
            }
        }

        logger.info(
            'DECK',
            `Reset ${response.results.length} words in deck: "${deckName}"`,
        )
    } catch (error: any) {
        logger.error('DECK', `Error resetting deck "${deckName}"`, {
            error: error.message,
        })
        throw error
    }
}

export { buildKey }

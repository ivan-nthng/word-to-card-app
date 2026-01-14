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

function buildKey(language: 'pt' | 'en', input: string): string {
    return `${language}|${input.trim().toLowerCase()}`
}

function mapLanguage(lang: 'pt' | 'en'): 'Portuguese' | 'English' {
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

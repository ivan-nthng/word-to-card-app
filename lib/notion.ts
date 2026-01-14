import { Client } from '@notionhq/client'
import { OpenAIResponse } from './types'
import { NotionWord } from './types'
import { NOTION_TOKEN, NOTION_DATABASE_ID } from './env'

const notion = new Client({
  auth: NOTION_TOKEN,
})

const DATABASE_ID = NOTION_DATABASE_ID

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
    const database = await notion.databases.retrieve({ database_id: DATABASE_ID })
    const properties = (database as any).properties
    const propertyNames = Object.keys(properties)

    for (const requiredProp of REQUIRED_PROPERTIES) {
      if (!propertyNames.includes(requiredProp)) {
        const error = new Error(`Notion property "${requiredProp}" not found. Check database schema.`)
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
    voce: props.Voce?.rich_text?.[0]?.plain_text || '',
    eleEla: props['ele/ela']?.rich_text?.[0]?.plain_text || '',
    elesElas: props['eles/elas']?.rich_text?.[0]?.plain_text || '',
    nos: props.Nos?.rich_text?.[0]?.plain_text || '',
    typo: props.Typo?.select?.name || 'substantivo',
    language: props.Language?.select?.name || 'Portuguese',
    key: props.Key?.rich_text?.[0]?.plain_text || '',
  }
}

export async function findWordByKey(key: string): Promise<any | null> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: 'Key',
      rich_text: {
        equals: key,
      },
    },
    page_size: 1,
  })

  if (response.results.length === 0) {
    return null
  }

  if (response.results.length > 1) {
    throw new Error(`Multiple records found with key ${key}. Data corruption detected.`)
  }

  return response.results[0]
}

export async function createWord(
  key: string,
  finalWord: string,
  language: 'pt' | 'en',
  openaiResponse: OpenAIResponse
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

  if (isPortugueseVerb && openaiResponse.verb?.presente) {
    const presente = openaiResponse.verb.presente
    properties.Voce = {
      rich_text: presente.voce ? [{ text: { content: presente.voce } }] : [],
    }
    properties['ele/ela'] = {
      rich_text: presente.ele_ela ? [{ text: { content: presente.ele_ela } }] : [],
    }
    properties['eles/elas'] = {
      rich_text: presente.eles_elas ? [{ text: { content: presente.eles_elas } }] : [],
    }
    properties.Nos = {
      rich_text: presente.nos ? [{ text: { content: presente.nos } }] : [],
    }
  }

  const response = await notion.pages.create({
    parent: {
      database_id: DATABASE_ID,
    },
    properties,
  })

  return response.id
}

export async function updateWord(
  pageId: string,
  language: 'pt' | 'en',
  openaiResponse: OpenAIResponse
): Promise<void> {
  const page = await notion.pages.retrieve({ page_id: pageId })
  const props = (page as any).properties
  const currentLanguage = props.Language?.select?.name
  const currentTypo = props.Typo?.select?.name
  const isPortugueseVerb = currentLanguage === 'Portuguese' && currentTypo === 'Verbo'

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

  if (isPortugueseVerb && openaiResponse.verb?.presente) {
    const presente = openaiResponse.verb.presente
    properties.Voce = {
      rich_text: presente.voce ? [{ text: { content: presente.voce } }] : [],
    }
    properties['ele/ela'] = {
      rich_text: presente.ele_ela ? [{ text: { content: presente.ele_ela } }] : [],
    }
    properties['eles/elas'] = {
      rich_text: presente.eles_elas ? [{ text: { content: presente.eles_elas } }] : [],
    }
    properties.Nos = {
      rich_text: presente.nos ? [{ text: { content: presente.nos } }] : [],
    }
  }

  await notion.pages.update({
    page_id: pageId,
    properties,
  })
}

export async function getLatestWords(limit: number = 50): Promise<NotionWord[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
    page_size: limit,
  })

  return response.results.map(notionToWord)
}

export async function getWordById(pageId: string): Promise<NotionWord | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId })
    return notionToWord(page as any)
  } catch (error) {
    return null
  }
}

export { buildKey }

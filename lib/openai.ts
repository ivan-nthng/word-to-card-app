import OpenAI from 'openai'
import { OpenAIResponse } from './types'
import { OPENAI_API_KEY } from './env'

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are a linguistic analysis tool. Analyze the input word and return ONLY a valid JSON object with the exact structure specified. Do not include any explanations, markdown formatting, or additional text. Return pure JSON only.`

const USER_PROMPT_TEMPLATE = (word: string) => `Analyze the word "${word}" and return a JSON object with this exact structure:
{
  "detected_language": "pt|en|ru",
  "pos": "verb|noun|adjective|other",
  "normalized": { "lemma": "", "infinitive": "" },
  "translation_ru": "",
  "verb": {
    "presente": { "eu": "", "voce": "", "ele_ela": "", "eles_elas": "", "nos": "" },
    "preterito_perfeito": { "eu": "", "voce": "", "ele_ela": "", "eles_elas": "", "nos": "" },
    "preterito_imperfeito": { "eu": "", "voce": "", "ele_ela": "", "eles_elas": "", "nos": "" },
    "futuro_do_presente": { "voce": "", "ele_ela": "", "eles_elas": "", "nos": "" }
  },
  "confidence": 0.0
}

Rules:
- detected_language: "pt" for Brazilian Portuguese, "en" for English, "ru" for Russian
- pos: "verb", "noun", "adjective", or "other"
- normalized.lemma: base form for nouns/adjectives
- normalized.infinitive: infinitive form for verbs
- translation_ru: Russian translation
- verb forms: only fill if detected_language is "pt" and pos is "verb"
- confidence: number between 0.0 and 1.0
- All keys must exist; use empty strings for missing values`

export async function analyzeWord(word: string): Promise<OpenAIResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT_TEMPLATE(word) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    const parsed = JSON.parse(content) as OpenAIResponse

    // Validate required keys exist
    if (!parsed.detected_language || !parsed.pos) {
      throw new Error('OpenAI response missing required keys')
    }

    return parsed
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('OpenAI returned invalid JSON')
    }
    throw error
  }
}

import OpenAI from 'openai'
import { OpenAIResponse } from './types'
import { getOpenAIApiKey } from './env'

// Initialize OpenAI client lazily to avoid validation during build
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            apiKey: getOpenAIApiKey(),
        })
    }
    return openaiInstance
}

const SYSTEM_PROMPT = `You are a linguistic analysis tool. Analyze the input word and return ONLY a valid JSON object with the exact structure specified. Do not include any explanations, markdown formatting, or additional text. Return pure JSON only.`

const USER_PROMPT_TEMPLATE = (
    word: string,
    learningLanguage?: 'pt-BR' | 'en',
) => {
    const translationNote = learningLanguage
        ? `\nIMPORTANT: The user is learning ${
              learningLanguage === 'pt-BR' ? 'Brazilian Portuguese' : 'English'
          }. If the input word is in a different language, translate it to the learning language first, then analyze the translated word. Always return the word in the learning language in normalized fields.`
        : ''

    return `Analyze the word "${word}" and return a JSON object with this exact structure:
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
- normalized.lemma: 
  * For Portuguese nouns: MUST include the correct definite article (o/a/os/as) + noun. Use singular form unless input is explicitly plural. Examples: "o carro", "a casa", "os livros", "as flores". If input already has an article, keep it but normalize spacing/case. If input lacks an article, infer and add the correct one.
  * For English nouns: plain noun without articles (e.g., "car", "house")
  * For adjectives: base form (dictionary form)
  * If the input contains a typo or misspelling, correct it to the most likely intended word.
  * If no correction needed, use the normalized base form with proper article for Portuguese nouns.
- normalized.infinitive: infinitive form for verbs. If the input contains a typo or misspelling, correct it to the most likely intended infinitive form. If no correction needed, use the normalized infinitive form.
- translation_ru: Russian translation
- verb forms: only fill if detected_language is "pt" and pos is "verb"
- confidence: number between 0.0 and 1.0
- All keys must exist; use empty strings for missing values
- Typo correction: If you detect a typo or misspelling, correct it in the normalized fields. The normalized fields should always contain the corrected, dictionary-correct form of the word.${translationNote}`
}

export async function analyzeWord(
    word: string,
    learningLanguage?: 'pt-BR' | 'en',
): Promise<OpenAIResponse> {
    try {
        const openai = getOpenAI()
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: USER_PROMPT_TEMPLATE(word, learningLanguage),
                },
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

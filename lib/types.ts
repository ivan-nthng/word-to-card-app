export interface OpenAIResponse {
    detected_language: 'pt' | 'en' | 'ru'
    pos: 'verb' | 'noun' | 'adjective' | 'other'
    normalized: {
        lemma: string
        infinitive: string
    }
    translation_ru: string
    verb: {
        presente: {
            eu?: string
            voce: string
            ele_ela: string
            eles_elas: string
            nos: string
        }
        preterito_perfeito: {
            eu?: string
            voce: string
            ele_ela: string
            eles_elas: string
            nos: string
        }
        preterito_imperfeito?: {
            eu?: string
            voce: string
            ele_ela: string
            eles_elas: string
            nos: string
        }
        futuro_do_presente: {
            voce: string
            ele_ela: string
            eles_elas: string
            nos: string
        }
    }
    confidence: number
}

export interface NotionWord {
    id: string
    word: string
    translation: string
    context: string
    eu: string
    voce: string
    eleEla: string
    elesElas: string
    nos: string
    Perfeito_eu: string
    Perfeito_voce: string
    Perfeito_eleEla: string
    Perfeito_elesElas: string
    Perfeito_nos: string
    Imperfeito_eu: string
    Imperfeito_voce: string
    Imperfeito_eleEla: string
    Imperfeito_elesElas: string
    Imperfeito_nos: string
    typo: 'Verbo' | 'substantivo' | 'Adjetivo'
    language: 'Portuguese' | 'English'
    key: string
    learned: boolean
    decks: string[]
}

export interface AddWordRequest {
    word: string
    learningLanguage: 'pt-BR' | 'en'
}

export interface AddWordResponse {
    status: 'added' | 'exists' | 'updated'
    message: string
    key: string
    finalWord: string
    lang: 'pt' | 'en'
    pos: 'verb' | 'noun' | 'adjective' | 'other'
    pageId: string
}

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
    voce: string
    eleEla: string
    elesElas: string
    nos: string
    typo: 'Verbo' | 'substantivo' | 'Adjetivo'
    language: 'Portuguese' | 'English'
    key: string
}

export interface AddWordRequest {
    word: string
    targetLanguage: 'pt' | 'en'
}

export interface AddWordResponse {
    status: 'created' | 'updated'
    key: string
    finalWord: string
    lang: 'pt' | 'en'
    pos: 'verb' | 'noun' | 'adjective' | 'other'
}

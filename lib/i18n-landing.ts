// Minimal i18n for landing page only
// Auto-detects browser language and provides translations

export type Locale = 'en' | 'ru'

const translations = {
    en: {
        startTraining: 'Start Training',
        addWord: 'Add a Word',
        language: 'Language',
    },
    ru: {
        startTraining: 'Начать тренировку',
        addWord: 'Добавить слово',
        language: 'Язык',
    },
}

/**
 * Detect user's locale from browser/system language
 * Returns 'ru' if language starts with 'ru', otherwise 'en'
 */
export function detectLocale(): Locale {
    if (typeof window === 'undefined') {
        return 'en'
    }
    const browserLang = navigator.language.toLowerCase()
    return browserLang.startsWith('ru') ? 'ru' : 'en'
}

/**
 * Get translation for a key in the detected locale
 */
export function t(key: keyof typeof translations.en, locale?: Locale): string {
    const currentLocale = locale || detectLocale()
    return translations[currentLocale][key] || translations.en[key]
}

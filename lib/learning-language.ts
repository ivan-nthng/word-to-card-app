// Learning language persistence and utilities
// Stores learning language in both localStorage (for client) and cookie (for server)

const LEARNING_LANGUAGE_KEY = 'learningLanguage'
const LEARNING_LANGUAGE_COOKIE = 'learning-language'

export type LearningLanguage = 'pt-BR' | 'en'

/**
 * Default learning language if not set
 */
export const DEFAULT_LEARNING_LANGUAGE: LearningLanguage = 'pt-BR'

/**
 * Get learning language from localStorage (client-side only)
 */
export function getLearningLanguageClient(): LearningLanguage {
    if (typeof window === 'undefined') {
        return DEFAULT_LEARNING_LANGUAGE
    }
    const stored = localStorage.getItem(LEARNING_LANGUAGE_KEY)
    if (stored === 'pt-BR' || stored === 'en') {
        return stored
    }
    return DEFAULT_LEARNING_LANGUAGE
}

/**
 * Set learning language in localStorage and cookie (client-side only)
 */
export function setLearningLanguageClient(language: LearningLanguage): void {
    if (typeof window === 'undefined') return

    // Store in localStorage for instant access
    localStorage.setItem(LEARNING_LANGUAGE_KEY, language)

    // Store in cookie for server-side access
    // Set cookie to expire in 1 year
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)
    document.cookie = `${LEARNING_LANGUAGE_COOKIE}=${language}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Get learning language from request cookies (server-side)
 * Returns default if not found
 */
export function getLearningLanguageFromRequest(
    cookieHeader: string | null,
): LearningLanguage {
    if (!cookieHeader) {
        return DEFAULT_LEARNING_LANGUAGE
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
            acc[key] = value
        }
        return acc
    }, {} as Record<string, string>)

    const language = cookies[LEARNING_LANGUAGE_COOKIE]
    if (language === 'pt-BR' || language === 'en') {
        return language
    }

    return DEFAULT_LEARNING_LANGUAGE
}

/**
 * Map learning language to Notion Language field value
 */
export function mapLearningLanguageToNotion(
    lang: LearningLanguage,
): 'Portuguese' | 'English' {
    return lang === 'pt-BR' ? 'Portuguese' : 'English'
}

/**
 * Get display label for learning language
 */
export function getLearningLanguageLabel(lang: LearningLanguage): string {
    return lang === 'pt-BR' ? 'Brazilian Portuguese' : 'English'
}

// Server-only environment variable handling
// SERVER-ONLY: This module must NEVER be imported in client components
// All env vars are accessed lazily at runtime, never during build time

/**
 * Gets an environment variable without validation.
 * Returns null if missing.
 */
function getEnv(name: string): string | null {
    return process.env[name] || null
}

/**
 * Requires an environment variable.
 * Throws Error with "MISSING_ENV:<name>" prefix if missing.
 * This format allows easy detection in error handlers.
 */
function requireEnv(name: string): string {
    const value = getEnv(name)
    if (!value) {
        throw new Error(`MISSING_ENV:${name}`)
    }
    return value
}

// Core API keys (required)
export function requireOpenAIKey(): string {
    return requireEnv('OPENAI_API_KEY')
}

export function requireNotionToken(): string {
    return requireEnv('NOTION_TOKEN')
}

export function requireNotionDbId(): string {
    return requireEnv('NOTION_DATABASE_ID')
}

// Auth variables (required for auth)
export function requireNextAuthSecret(): string {
    return requireEnv('NEXTAUTH_SECRET')
}

export function requireGoogleClientId(): string {
    return requireEnv('GOOGLE_CLIENT_ID')
}

export function requireGoogleClientSecret(): string {
    return requireEnv('GOOGLE_CLIENT_SECRET')
}

export function requireAllowedEmail(): string {
    return requireEnv('ALLOWED_EMAIL')
}

// Optional getters (return null if missing)
export function getNextAuthSecret(): string | null {
    return getEnv('NEXTAUTH_SECRET')
}

export function getGoogleClientId(): string | null {
    return getEnv('GOOGLE_CLIENT_ID')
}

export function getGoogleClientSecret(): string | null {
    return getEnv('GOOGLE_CLIENT_SECRET')
}

export function getAllowedEmail(): string | null {
    return getEnv('ALLOWED_EMAIL')
}

/**
 * Helper function to extract missing environment variable name from error message.
 * Returns the variable name if error is about missing env var, null otherwise.
 */
export function extractMissingEnvVar(error: Error): string | null {
    // Check for MISSING_ENV: prefix first
    const missingEnvMatch = error.message.match(/^MISSING_ENV:(\w+)$/)
    if (missingEnvMatch) {
        return missingEnvMatch[1]
    }
    // Fallback to old format for backward compatibility
    const match = error.message.match(
        /Missing required environment variable: (\w+)/,
    )
    return match ? match[1] : null
}

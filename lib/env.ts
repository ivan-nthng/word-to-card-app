// Environment variables configuration
// SERVER-ONLY: This module must NEVER be imported in client components
// All env vars are accessed lazily at runtime, never during build time

/**
 * Validates and returns an environment variable.
 * Throws a clear error if the variable is missing.
 * This function is called at runtime (in request handlers), not during build.
 */
function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

/**
 * Centralized environment variables object.
 *
 * IMPORTANT: This object is only accessed at runtime (in API routes, server components, server actions).
 * It is NEVER accessed during build time, which allows the build to succeed even if env vars aren't available.
 *
 * VERCEL REQUIREMENTS:
 * These variables MUST be set in Vercel project settings:
 * - Settings → Environment Variables → Add for Production, Preview, and Development
 *
 * Required variables:
 * - OPENAI_API_KEY
 * - NOTION_TOKEN
 * - NOTION_DATABASE_ID
 *
 * Optional variables (only if AUTH_ENABLED=true):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - NEXTAUTH_SECRET
 * - ALLOWED_EMAIL
 *
 * After adding variables in Vercel, you MUST redeploy for changes to take effect.
 */
export const ENV = {
    // Core API keys (required)
    get OPENAI_API_KEY(): string {
        return requireEnv('OPENAI_API_KEY')
    },
    get NOTION_TOKEN(): string {
        return requireEnv('NOTION_TOKEN')
    },
    get NOTION_DATABASE_ID(): string {
        return requireEnv('NOTION_DATABASE_ID')
    },
    // Auth variables (optional, only if AUTH_ENABLED=true)
    get GOOGLE_CLIENT_ID(): string {
        return process.env.GOOGLE_CLIENT_ID || ''
    },
    get GOOGLE_CLIENT_SECRET(): string {
        return process.env.GOOGLE_CLIENT_SECRET || ''
    },
    get NEXTAUTH_SECRET(): string | undefined {
        return process.env.NEXTAUTH_SECRET
    },
    get ALLOWED_EMAIL(): string | undefined {
        return process.env.ALLOWED_EMAIL
    },
}

// Legacy getters for backward compatibility (deprecated, use ENV directly)
export const getOpenAIApiKey = () => ENV.OPENAI_API_KEY
export const getNotionToken = () => ENV.NOTION_TOKEN
export const getNotionDatabaseId = () => ENV.NOTION_DATABASE_ID
export const getGoogleClientId = () => ENV.GOOGLE_CLIENT_ID
export const getGoogleClientSecret = () => ENV.GOOGLE_CLIENT_SECRET
export const getNextAuthSecret = () => ENV.NEXTAUTH_SECRET
export const getAllowedEmail = () => ENV.ALLOWED_EMAIL

// Environment variables configuration
// Validates required environment variables lazily (only when accessed)
// This allows the build to succeed even if env vars aren't available during build

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Lazy getters - only validate when accessed, not at module load time
function createEnvGetter(name: string): () => string {
  let cached: string | undefined
  return () => {
    if (cached === undefined) {
      cached = requireEnv(name)
    }
    return cached
  }
}

export const getOpenAIApiKey = createEnvGetter('OPENAI_API_KEY')
export const getNotionToken = createEnvGetter('NOTION_TOKEN')
export const getNotionDatabaseId = createEnvGetter('NOTION_DATABASE_ID')
export const getGoogleClientId = createEnvGetter('GOOGLE_CLIENT_ID')
export const getGoogleClientSecret = createEnvGetter('GOOGLE_CLIENT_SECRET')
export const getNextAuthSecret = createEnvGetter('NEXTAUTH_SECRET')
export const getAllowedEmail = createEnvGetter('ALLOWED_EMAIL')

// For backward compatibility, export as getters that validate on access
// These will throw at runtime if env vars are missing, but won't break the build
export const OPENAI_API_KEY = getOpenAIApiKey()
export const NOTION_TOKEN = getNotionToken()
export const NOTION_DATABASE_ID = getNotionDatabaseId()

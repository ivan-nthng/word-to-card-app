// Environment variables configuration
// Validates required environment variables at module load time

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const OPENAI_API_KEY = requireEnv('OPENAI_API_KEY')
export const NOTION_TOKEN = requireEnv('NOTION_TOKEN')
export const NOTION_DATABASE_ID = requireEnv('NOTION_DATABASE_ID')

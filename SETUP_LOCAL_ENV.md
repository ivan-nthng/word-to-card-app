# Local Environment Setup

## Quick Setup

Your `.env.local` file exists but is missing the `OPENAI_API_KEY` variable.

### Steps to Fix:

1. **Open `.env.local` file** in your editor

2. **Add the missing variable:**
   ```bash
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

3. **Make sure you have all required variables:**
   ```bash
   # Required variables
   OPENAI_API_KEY=sk-...
   NOTION_TOKEN=secret_...
   NOTION_DATABASE_ID=32-character-id-here
   ```

4. **Restart the dev server** after adding variables:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## How to Get API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add it to `.env.local` as `OPENAI_API_KEY=sk-...`

### Notion Integration Token
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "WordTo App")
4. Select your workspace
5. Copy the "Internal Integration Token" (starts with `secret_`)
6. Add it to `.env.local` as `NOTION_TOKEN=secret_...`

### Notion Database ID
1. Open your Notion database
2. Look at the URL: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. Copy the `DATABASE_ID` (32 characters, alphanumeric)
4. Add it to `.env.local` as `NOTION_DATABASE_ID=...`

## Example .env.local File

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Notion
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Only if AUTH_ENABLED=true in lib/config.ts
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_random_secret_string
ALLOWED_EMAIL=your_email@example.com
```

## Important Notes

- ⚠️ **Never commit `.env.local` to git** (it's already in `.gitignore`)
- ✅ **Restart the dev server** after changing environment variables
- ✅ **Check for typos** in variable names (they're case-sensitive)
- ✅ **No spaces** around the `=` sign: `KEY=value` not `KEY = value`

## Verify Setup

After adding the variables, restart the dev server and try adding a word again. The error should disappear.

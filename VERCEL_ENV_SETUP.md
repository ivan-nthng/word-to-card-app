# Vercel Environment Variables Setup

## Required Environment Variables

To fix the "Failed to fetch words" error, you **must** add these environment variables in your Vercel project settings:

### Step-by-Step Instructions:

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project: `word-to-card-app`
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Required (for the app to work):
```
OPENAI_API_KEY=your_openai_api_key_here
NOTION_TOKEN=your_notion_integration_token_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

#### Optional (only if using authentication):
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_random_secret_string
ALLOWED_EMAIL=your_email@example.com
```

### Important Notes:

1. **Add for all environments**: When adding each variable, make sure to select:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

2. **After adding variables**: You **must redeploy** for the changes to take effect:
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**

3. **Verify variables are set**: After redeploying, check the deployment logs to ensure no "Missing required environment variable" errors appear.

### How to Get These Values:

- **OPENAI_API_KEY**: https://platform.openai.com/api-keys
- **NOTION_TOKEN**: https://www.notion.so/my-integrations → Create integration → Copy "Internal Integration Token"
- **NOTION_DATABASE_ID**: Open your Notion database → Copy the ID from the URL (the part after the last `/` and before `?`)

### Troubleshooting:

If you still see errors after adding variables:
1. Check Vercel function logs: **Deployments** → Click on deployment → **Functions** tab
2. Look for error messages starting with `[WORDS]` or `[NOTION]`
3. Verify the Notion integration has access to your database
4. Make sure the database ID is correct (32 characters, alphanumeric)

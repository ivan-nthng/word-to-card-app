# WordTo - Private Vocabulary Web Service

A Next.js application for managing vocabulary words with Notion as the source of truth and OpenAI for linguistic analysis.

## Features

-   Google Sign-In authentication with email allowlist
-   Add words with OpenAI analysis (strict JSON output)
-   Notion integration for word storage (dedupe by Key)
-   View and search words
-   Detail view for individual words
-   Centralized design system with CSS variables

## Prerequisites

-   Node.js 18+ and npm
-   A Notion account and integration
-   An OpenAI API key
-   A Google OAuth client ID and secret

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
ALLOWED_EMAIL=your_allowed_email@example.com
```

**How to get these values:**

-   **OPENAI_API_KEY**: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)
-   **NOTION_TOKEN**: Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and copy the Internal Integration Token
-   **NOTION_DATABASE_ID**: The ID of your Notion database (found in the database URL: `https://notion.so/[workspace]/[database_id]`)
-   **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET**: Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
-   **NEXTAUTH_SECRET**: Generate a random string (you can use `openssl rand -base64 32`)
-   **ALLOWED_EMAIL**: The email address allowed to sign in

### 3. Notion Database Setup

Create a database named "Words" in Notion with the following properties (exact names required):

**Core Properties:**

-   `Word` (Title)
-   `Translation` (Rich text)
-   `Context` (Rich text)
-   `Typo` (Select) - Options: `Verbo`, `substantivo`, `Adjetivo`
-   `Language` (Select) - Options: `Portuguese`, `English`
-   `Key` (Rich text)

**Verb Forms (Portuguese only):**

-   `Voce` (Rich text)
-   `ele/ela` (Rich text)
-   `eles/elas` (Rich text)
-   `Nos` (Rich text)

**Grant Access:**

-   Share your Notion database with your integration (Settings & Members → Connections → Add connection)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
.
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth routes
│   │   ├── add-word/     # POST /api/add-word
│   │   └── words/        # GET /api/words, /api/words/[id]
│   ├── app/              # Protected app pages
│   │   ├── add/          # Add word page
│   │   └── words/        # Words list and detail
│   ├── theme/            # Design system
│   │   ├── tokens.ts     # Design tokens
│   │   └── globals.css   # CSS variables
│   ├── ui/               # UI components
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── lib/                  # Utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── notion.ts         # Notion integration
│   ├── openai.ts         # OpenAI integration
│   └── types.ts          # TypeScript types
└── docs/                 # Documentation
```

## Key Implementation Details

### Word Deduplication

Words are deduplicated using a `Key` field with format: `{language}|{lowercased_input}`

Example: `pt|ressaca`, `en|cloudy`

### OpenAI Integration

OpenAI returns strict JSON with the following structure:

-   `detected_language`: `pt`, `en`, or `ru`
-   `pos`: `verb`, `noun`, `adjective`, or `other`
-   `normalized`: `lemma` and `infinitive` fields
-   `translation_ru`: Russian translation
-   `verb`: Verb forms (only for Portuguese verbs)
-   `confidence`: 0.0 - 1.0

If detected language is `ru`, the UI must provide `forceLanguage` (`pt` or `en`).

### Notion Upsert Flow

1. Analyze word with OpenAI
2. Determine target language (use `forceLanguage` if detected language is `ru`)
3. Build dedupe key
4. Query Notion by key
5. Create new record if not found, otherwise update existing record

## Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Authentication**: NextAuth.js with Google OAuth
-   **Database**: Notion (via Notion API)
-   **AI**: OpenAI GPT-4o-mini
-   **Styling**: Tailwind CSS with CSS variables
-   **UI Components**: Custom components using design tokens

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Security

-   All `/app/*` routes require authentication
-   All `/api/*` routes require authentication
-   Only the email specified in `ALLOWED_EMAIL` can sign in
-   Environment variables are never committed to version control

## Deploy to Vercel

### ⚠️ CRITICAL: Environment Variables Configuration

**Environment variables are NOT automatically available from `.env.local` on Vercel.**

You **MUST** manually add them in Vercel project settings:

### 1. Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

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

**IMPORTANT:**

-   ✅ Select **Production**, **Preview**, and **Development** environments for each variable
-   ✅ Click **Save** after adding each variable
-   ✅ **You MUST redeploy** after adding variables for changes to take effect

### 2. Redeploy After Adding Variables

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**

**Without redeploying, the new environment variables will NOT be available to your app.**

### 3. Verify Deployment

After deployment, verify that:

-   The root page loads correctly
-   API routes respond (check Vercel function logs)
-   Visit `/api/env-check` to verify environment variables are set (returns boolean status, never actual values)

### 4. Troubleshooting

If you see "Missing required environment variable" errors:

1. **Check Vercel Function Logs:**

    - Go to **Deployments** → Click on deployment → **Functions** tab
    - Look for error messages

2. **Verify Variables Are Set:**

    - Go to **Settings** → **Environment Variables**
    - Ensure all required variables are present
    - Ensure they're enabled for the correct environment (Production/Preview)

3. **Use Diagnostic Endpoint:**

    - Visit `https://your-app.vercel.app/api/env-check`
    - Should return: `{"openai": true, "notion": true, "database": true}`
    - If any are `false`, that variable is missing in Vercel

4. **Redeploy:**
    - After fixing variables, always redeploy

**Note:** The app can run without authentication by setting `AUTH_ENABLED=false` in `lib/config.ts`. In that case, auth-related variables are optional.

## License

Private project

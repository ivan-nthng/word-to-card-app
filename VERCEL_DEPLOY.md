# Vercel Deployment Guide

## Option 1: Deploy via GitHub Integration (Recommended)

### Step 1: Connect GitHub Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New Project"**
3. Import your GitHub repository: `ivan-nthng/word-to-card-app`
4. Vercel will automatically detect it's a Next.js project

### Step 2: Configure Project Settings

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 3: Add Environment Variables

In the Vercel project settings, go to **Settings → Environment Variables** and add:

#### Required Variables:
```
OPENAI_API_KEY=your_openai_api_key_here
NOTION_TOKEN=your_notion_integration_token_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

#### Optional Variables (if using auth):
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_random_secret_string
ALLOWED_EMAIL=your_email@example.com
```

**Important**: 
- Add these variables for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable

### Step 4: Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy to production

### Step 5: Verify Deployment

After deployment completes:
1. Visit your deployment URL (e.g., `https://word-to-card-app.vercel.app`)
2. Check that the landing page loads
3. Test API routes (they should work if env vars are set correctly)

## Option 2: Deploy via Vercel CLI

### Step 1: Login to Vercel

```bash
vercel login
```

This will open a browser window for authentication.

### Step 2: Link Project

```bash
vercel link
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (select your account)
- Link to existing project? **No** (create new)
- Project name? `word-to-card-app` (or your choice)
- Directory? `./` (default)

### Step 3: Add Environment Variables

```bash
# Add each environment variable
vercel env add OPENAI_API_KEY production
vercel env add NOTION_TOKEN production
vercel env add NOTION_DATABASE_ID production

# Optional: Add auth variables if needed
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add ALLOWED_EMAIL production
```

When prompted, paste the value for each variable.

### Step 4: Deploy to Production

```bash
vercel --prod
```

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Common issues**:
   - Missing environment variables → Add them in Vercel settings
   - TypeScript errors → Fix locally first, then push
   - Missing dependencies → Check `package.json`

### 404 Errors After Deployment

1. Ensure `app/layout.tsx` has `export const dynamic = 'force-dynamic'`
2. Check that all API routes have `export const dynamic = 'force-dynamic'`
3. Verify environment variables are set correctly

### Environment Variables Not Working

1. Go to **Settings → Environment Variables** in Vercel
2. Ensure variables are added for **Production** environment
3. **Redeploy** after adding new variables (they don't apply to existing deployments)

### Check Deployment Status

```bash
vercel ls
```

### View Deployment Logs

```bash
vercel logs [deployment-url]
```

## Post-Deployment Checklist

- [ ] Landing page loads correctly (`/`)
- [ ] Add word page works (`/app/add`)
- [ ] Words list page works (`/app/words`)
- [ ] API routes respond correctly (`/api/words`, `/api/add-word`)
- [ ] Environment variables are set correctly
- [ ] No console errors in browser
- [ ] Check Vercel function logs for any runtime errors

## Automatic Deployments

Once connected via GitHub:
- **Every push to `main`** → Deploys to production
- **Pull requests** → Creates preview deployments
- **Other branches** → Creates preview deployments

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Check deployment logs in Vercel dashboard

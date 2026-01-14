# Setup Guide: GitHub Repository and Local Development

## 1. Create GitHub Repository

### Option A: Using GitHub UI (recommended)
1. Go to https://github.com/new
2. Repository name: `words-cards-app` (or any name you want)
3. Visibility: Private
4. **Do NOT** add README, .gitignore, or license
5. Click **Create repository**

Leave the page open. You will need the repo URL.

### Option B: Using GitHub CLI (if installed)
```bash
gh repo create words-cards-app --private --source=. --remote=origin
```

---

## 2. Initialize Git Locally

```bash
git init
git branch -M main
```

---

## 3. Make the First Commit

```bash
git add .
git commit -m "Initial commit: Next.js vocabulary app with Notion and OpenAI integration"
```

---

## 4. Push to GitHub

### If you used Option A (GitHub UI):
Replace `YOUR_USERNAME` with your GitHub username in the command below:

```bash
git remote add origin https://github.com/YOUR_USERNAME/words-cards-app.git
git push -u origin main
```

### If you used Option B (GitHub CLI):
```bash
git push -u origin main
```

---

## 5. Run the Local Development Server

First, install dependencies:
```bash
npm install
```

Then, start the development server:
```bash
npm run dev
```

The app will be available at: http://localhost:3000

**Note:** Make sure you have set up your `.env.local` file with all required environment variables before running the development server.

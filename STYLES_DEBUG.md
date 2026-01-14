# Styles Debugging Guide

## Current Status
- ✅ CSS file exists: `app/theme/globals.css`
- ✅ Tailwind config: `tailwind.config.ts` is configured correctly
- ✅ PostCSS config: `postcss.config.js` is set up
- ✅ CSS import: `import './theme/globals.css'` in `app/layout.tsx`
- ✅ Build generates CSS: `.next/static/css/*.css` files exist

## CSS Variables Format
The CSS uses space-separated RGB values (e.g., `255 255 255`) which is correct for Tailwind CSS v3.

## Troubleshooting Steps

### 1. Check if CSS is loaded in browser
Open DevTools → Network tab → Filter by "CSS" → Reload page
- Look for `/_next/static/css/...` files
- Check if they return 200 status

### 2. Check CSS variables in browser
Open DevTools → Elements → Inspect `<html>` element
- Check Computed styles for `--color-background`, `--color-foreground`, etc.
- Verify they have values like `255 255 255`

### 3. Check if Tailwind classes are applied
Inspect any element with Tailwind classes (e.g., `bg-background`)
- Check if the class appears in the Styles panel
- Verify the CSS rule is: `background-color: rgb(var(--color-background) / var(--tw-bg-opacity, 1))`

### 4. Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear browser cache completely

### 5. Check Vercel deployment
- Go to Vercel Dashboard → Your Project → Deployments
- Check build logs for CSS-related errors
- Verify CSS files are in the build output

### 6. Verify environment
If styles work locally but not on Vercel:
- Check if PostCSS/Tailwind dependencies are in `package.json`
- Verify `postcss.config.js` and `tailwind.config.ts` are committed to git
- Check Vercel build logs for CSS compilation errors

## Common Issues

### Issue: CSS file not loading
**Solution**: Check if `app/theme/globals.css` is imported in `app/layout.tsx` (root layout, not nested)

### Issue: CSS variables not working
**Solution**: Verify Tailwind config uses `rgb(var(--color-name) / <alpha-value>)` format

### Issue: Styles work locally but not on Vercel
**Solution**: 
1. Clear Vercel build cache
2. Redeploy
3. Check build logs for errors

### Issue: Tailwind classes not generating
**Solution**: Verify `content` paths in `tailwind.config.ts` include all your component files

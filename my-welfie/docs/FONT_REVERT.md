# Font stack: Hanken Grotesk (with revert guide)

## Active font

**Hanken Grotesk** — loaded in `src/index.html`, applied via `fonts.primary` in `src/style/tokens.ts`.

Single switch point:

```ts
// src/style/tokens.ts
export const fonts = {
  primary: "'Hanken Grotesk', 'Segoe UI', sans-serif",
  legacyRubik: 'Rubik, Segoe UI, sans-serif',
};
```

`typography.fontFamily`, `global.ts`, `PageContainer`, dashboard components, auth, and landing pages all derive from this.

---

## Quick revert to Rubik (~5 min)

### 1. Tokens (main switch)

In `src/style/tokens.ts`, change:

```ts
primary: fonts.legacyRubik,  // or: 'Rubik, Segoe UI, sans-serif',
```

Or swap the string:

```ts
primary: 'Rubik, Segoe UI, sans-serif',
```

### 2. Google Fonts link

In `src/index.html`:

- Comment out the Hanken Grotesk `<link>`
- Uncomment the Rubik (and Manrope if using landing v2 with Manrope) links

### 3. Tailwind (metric cards)

In `tailwind.config.js`, under `theme.extend.fontFamily.sans`:

```js
sans: ['Rubik', 'Segoe UI', 'sans-serif'],
```

Then rebuild:

```bash
cd my-welfie
npm run tailwind:build
```

### 4. Hard refresh

Hard refresh the browser (Ctrl+Shift+R) to clear cached fonts.

---

## Optional: revert landing v2 to Manrope only

If dashboard stays on Hanken but landing v2 should use Manrope again:

- `LandingPage_v2.tsx` → `fontFamily: "'Manrope', sans-serif"`
- `HowItWorksSection_v2.tsx` → same if overridden
- Uncomment Manrope in `index.html`

---

## Files touched when enabling Hanken Grotesk

| File | Role |
|------|------|
| `src/style/tokens.ts` | `fonts.primary` — **revert here first** |
| `src/style/global.ts` | body / button / input |
| `src/index.html` | Google Fonts `<link>` |
| `tailwind.config.js` | Tailwind `font-sans` |
| `src/layout/PageContainer.tsx` | PageShell |
| `src/components/App.tsx` | Loading / no-scans screens |
| `src/components/Auth/AuthPage.tsx` | Login |
| `src/components/LandingPage/LandingPage.tsx` | Landing v1 |
| `src/components/LandingPage_v2/LandingPage_v2.tsx` | Landing v2 |

Most UI uses `fontFamily: 'inherit'` or `typography.fontFamily` — no per-component revert needed.

---

## Git revert (fastest)

If this change is committed and you want to undo entirely:

```bash
git log --oneline -5   # find the Hanken Grotesk commit
git revert <commit-sha>
```

Or restore specific files:

```bash
git checkout HEAD~1 -- src/style/tokens.ts src/index.html src/style/global.ts tailwind.config.js
npm run tailwind:build
```

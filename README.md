# Rotation Planner (28/28)

Plan and share a 28-days-on / 28-days-off rotation calendar with manual overrides, holidays, undo/redo, sharing, print layout, and mobile month view.

Live site, after GitHub Pages deploys from `main`:

https://filek2039.github.io/28-28-Rotation-Planner/

## Run Locally

Prerequisites:

- Node.js 22 recommended
- npm

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3001/
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Holiday Data

The app can fetch countries and public holidays from Calendarific:

- `https://calendarific.com/api/v2/countries`
- `https://calendarific.com/api/v2/holidays`

For public GitHub Pages deployment, no API key is required. Without a key, the app uses a local Turkey fallback list and keeps the public build free of private credentials.

If you add a local Calendarific key for development, create `.env.local`:

```bash
VITE_CALENDARIFIC_API_KEY=your_calendarific_api_key
```

Do not commit `.env.local`. Vite embeds `VITE_*` values into the browser bundle, so any key used in a static GitHub Pages build is public.

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

On every push to `main`, GitHub Actions:

1. Installs dependencies with `npm ci`
2. Builds the app with `npm run build`
3. Uploads `dist`
4. Deploys to GitHub Pages

In the GitHub repository settings, set Pages to use **GitHub Actions** as the source if it is not already enabled.

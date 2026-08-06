# Football Tracker

A lightweight static React app for tracking football tournament group standings, match schedules, and knockout brackets. The site supports multiple tournaments side-by-side and uses scraped Wikipedia data generated at build time.

## What it does

- Displays group standings and match lists for tracked tournaments
- Shows knockout bracket progress where applicable
- Supports multiple tournaments via tabs ordered by earliest upcoming match date
- Uses static tournament JSON files produced by a scraper, not a live backend

## Current tournaments

- 2026 ASEAN Championship
- 2026 FIFA U-17 World Cup
- 2026 Asian Games football

## Architecture

### Scraper

The scraper is a standalone Node + TypeScript script under `scripts/`.

- `scripts/scrape.ts` loads tournament definitions from `config/tournaments.json`
- Fetches each tournament article from Wikipedia
- Parses groups, matches, standings, and knockout brackets using Cheerio
- Computes standings from parsed match results rather than relying on Wikipedia's tables
- Writes validated output JSON atomically to `src/data/tournaments/<id>.json`

### App

The React app is built with Vite + TypeScript + Tailwind.

- `src/App.tsx` imports static tournament JSON files and renders the selected tournament
- `src/config.ts` defines UI tabs and featured team metadata
- `src/lib/matchTime.ts` parses scraped kickoff strings and displays them in configured time zones
- `src/lib/featuredTeam.ts` derives upcoming spotlight matches for featured teams
- `src/lib/teamCountry.ts` maps team names to ISO country codes for flag rendering
- `src/lib/form.ts` computes recent form badges for standings tables

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run scrape` — run the scraper and regenerate JSON data files
- `npm run typecheck` — run TypeScript type checking
- `npm run test:scraper` — run scraper unit tests via `node --test`

## Adding or updating a tournament

1. Add or update an entry in `config/tournaments.json`
2. If the tournament is new, add a matching entry in `src/config.ts`
3. Add a static import and map entry for the tournament JSON in `src/App.tsx`
4. If the tournament has new team names, add ISO codes to `src/lib/teamCountry.ts` and import the matching flags in `src/components/Flag.tsx`
5. Run `npm run scrape`

## Notes

- The app is intentionally static: it does not poll for live updates in the browser.
- The scraper is the only source of truth for tournament data used by the app.

## Deployment

GitHub Actions refreshes the static tournament JSON every 30 minutes, at minutes 17 and 47 UTC.
It commits and pushes `src/data/tournaments` to `master` only when tournament data changed; a new
`scrapedAt` timestamp by itself is ignored. Vercel then deploys that push through its Git
integration.

No GitHub Actions secrets or variables are required. The workflow uses the repository's built-in
`GITHUB_TOKEN` with `contents: write` permission.

The project also includes a `vercel-build` script that runs the scraper before building.

```bash
npm run vercel-build
```

This makes it suitable for deployment on platforms like Vercel where build-time scraping can refresh static data.

# Football Tracker agent guidance

## Project

- This is a personal, lightweight static React application for tracking several football tournaments.
- The browser has no backend and does not poll for updates. Tournament data is scraped from Wikipedia into static JSON before the Vite build.
- Treat `config/tournaments.json` as scraper configuration and `src/data/tournaments/<id>.json` as the contract between the scraper and UI.
- Read `README.md` for the user-facing overview. Historical decisions live in `docs/specs/` and `docs/plans/`; verify them against current code before relying on them.

## Commands

- Install: `npm ci`
- Develop: `npm run dev`
- Build: `npm run build`
- Type-check: `npm run typecheck`
- Test command: `npm run test:scraper`
- Run one test on a Node version with native TypeScript support: `node --test path/to/file.test.ts`
- Refresh tournament JSON: `npm run scrape`
- Production-equivalent build: `npm run vercel-build`

Tests exist in both `scripts/` and `src/`. Confirm the active Node version supports TypeScript test discovery: older Node versions can make `npm run test:scraper` report zero tests instead of running the `.test.ts` files. UI behavior has no browser/component test suite, so visually verify meaningful UI changes with the dev server in addition to running automated checks.

## Architecture and invariants

- `scripts/` is a standalone Node/TypeScript scraper. It must remain independent of the React bundle.
- `scripts/scrape.ts` loads every tournament entry, fetches Wikipedia, parses matches/groups/knockout rounds, normalizes times, and writes validated JSON atomically.
- Standings are computed from parsed match results; do not replace them with Wikipedia standings tables without an explicit design change.
- Empty knockout rounds are valid before a tournament reaches that stage.
- `types/tournament.ts` defines the scraper-to-app data contract.
- `src/App.tsx` statically imports each tournament JSON file. Tournament tabs come from `src/config.ts`, sort by earliest match, and hide completed tournaments when alternatives remain.
- Match time parsing must honor the scraped explicit UTC offset and display correctly in configured IANA time zones, including DST and half-hour offsets.
- Flag rendering requires both a team-to-country mapping in `src/lib/teamCountry.ts` and a corresponding explicit SVG import in `src/components/Flag.tsx`.
- `.github/workflows/scheduled-redeploy.yml` refreshes static tournament JSON every 30 minutes and pushes real data changes to `master`; Vercel deploys that push through its Git integration.

## Working rules

- Preserve the static architecture unless the user explicitly asks for a backend or live polling.
- Prefer generic parsing based on Wikipedia structure over tournament-specific branches.
- Add or update focused regression tests for parser, time, standings, status, and deploy-trigger changes.
- Never hand-edit generated tournament JSON as the primary fix. Correct scraper/config behavior and regenerate it; avoid refreshing all data when a task does not require network-dependent output changes.
- Keep edits focused and preserve unrelated user changes and untracked files.
- Run `npm run typecheck` and the relevant tests after code changes; run `npm run build` for UI or bundling changes.

## Adding a tournament

Use the project skill at `.agents/skills/manage-football-tournaments/SKILL.md`. At minimum, keep these surfaces aligned:

1. `config/tournaments.json`
2. `src/config.ts`
3. the static JSON import and `TOURNAMENT_DATA` entry in `src/App.tsx`
4. `src/lib/teamCountry.ts` and `src/components/Flag.tsx` for new teams
5. generated JSON from `npm run scrape`

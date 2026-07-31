# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React app that displays football tournament group-stage standings/matches and knockout
brackets, for several tournaments at once — currently the 2026 ASEAN Championship, the 2026 FIFA
U-17 World Cup, and football at the 2026 Asian Games — switchable via UI tabs ordered by each
tournament's earliest scheduled match date (soonest-started first), not by config order. Each
tournament is scraped from its own Wikipedia article into its own static JSON file by a manual
script; the app just reads those files at build time — still no backend, no live polling, no API.
See `docs/specs/2026-07-25-asean-championship-tracker-design.md` /
`docs/plans/2026-07-25-asean-championship-tracker-plan.md` for the original single-tournament
design, and `docs/specs/2026-07-27-multi-tournament-switcher-design.md` /
`docs/plans/2026-07-27-multi-tournament-switcher-plan.md` for the multi-tournament switcher that
replaced it.

## Commands

```bash
npm run dev          # Vite dev server
npm run build         # production build (vite build)
npm run preview       # preview the production build
npm run typecheck     # tsc --noEmit
npm run scrape        # run scripts/scrape.ts to (re)generate one JSON file per tournament
                       # under src/data/tournaments/, driven by config/tournaments.json
npm run test:scraper  # runs scraper unit tests via node --test (scripts/lib/*.test.ts)
```

Run a single scraper test file directly: `node --test scripts/lib/parseGroups.test.ts`.
There is no test suite for the React app itself — verify UI changes manually via `npm run dev`.

`scripts/serve-local.ps1` does a full local run: scrape (falling back to last-known-good data on
failure) → build → serve the production build on port 4173.

## Architecture

Two independent halves that only communicate through the per-tournament JSON files:

1. **Scraper** (`scripts/`) — a standalone Node/TypeScript script, not part of the React bundle.
   `scripts/scrape.ts` loads every entry from `config/tournaments.json` via `loadConfigs`
   (`scripts/lib/loadConfig.ts`) and loops over them, fetching each one's Wikipedia article
   (`scripts/lib/fetchArticle.ts`) and parsing it with `cheerio`:
   - `parseGroups.ts` finds every `Group <X>` heading generically (however many groups the
     tournament has), delegates to `parseFootballboxMatch` (Wikipedia's `.footballbox` match
     template) for each match, and derives standings from those matches via `computeStandings`
     rather than parsing Wikipedia's own standings table — the two are otherwise updated on
     independent schedules by Wikipedia editors, which was a source of stale-standings bugs.
   - `parseKnockout.ts` parses the knockout bracket the same generic way — whatever the bracket
     depth is (quarterfinals/semis/final, or just semis/final). An empty `knockout.rounds` is a
     valid, non-error result (a tournament that hasn't reached its knockout stage yet).
   - `writeOutput.ts` validates the parsed data (throws if groups/standings are missing/empty —
     but does not require any knockout rounds) and writes atomically (`.tmp` file + rename) to
     each tournament's own `outputFile` — never overwrites existing JSON with a partial scrape.
   - Output lands at one file per tournament under `src/data/tournaments/<id>.json` (e.g.
     `asean-2026.json`, `u17-2026.json`), typed by `types/tournament.ts` (`TournamentData`,
     `GroupData`, `Match`, `KnockoutRound`, etc.) — this is the contract between scraper and app.

2. **App** (`src/`) — Vite + React + TypeScript + Tailwind, dev-server only.
   `App.tsx` statically imports both tournaments' JSON files, keyed by tournament id
   (`asean-2026`, `u17-2026`), and renders a tab switcher (state + `?t=` URL param) that swaps
   which tournament's data is displayed — one section per group plus a knockout section, with the
   layout derived from however many groups are in the selected tournament's data, not hardcoded.
   Supporting pieces:
   - `src/config.ts` — `TOURNAMENTS`, an array of `{ id, label, featuredTeam? }` entries (one per
     tournament bundled into the app; `id` must match a key in `App.tsx`'s tournament-data map).
     `featuredTeam` is optional per tournament — omit it for one with no spotlighted team.
     Also holds the two timezones the UI displays times in (`MELBOURNE_TIME_ZONE`,
     `VIETNAM_TIME_ZONE`).
   - `src/lib/matchTime.ts` — parses scraped `"19:00 UTC+7"`-style strings into a real `Date` (using
     the explicit UTC offset, so DST/half-hour-offset zones like Myanmar's work) and reprojects it
     into any timezone for display.
   - `src/lib/featuredTeam.ts` — derives the featured team's upcoming matches across all groups.
   - `src/lib/teamCountry.ts` — team name → ISO 3166-1 alpha-2 code lookup for `flag-icons`; add an
     entry here when adding a tournament with different teams.
   - `src/lib/form.ts` — recent-form badge computation for standings tables.

### Switching to a different tournament

`config/tournaments.json` is an array, one entry per tournament (`id`, `name`, `wikipediaTitle`,
`outputFile`, `utcOffset`, `redeployDelayMinutes`, `checkWindowMinutes`). The app now supports
multiple tournaments simultaneously, so "switching" means either adding a new entry to run
alongside the existing ones, or editing an existing entry — then rerun `npm run scrape`. No code
changes needed, as long as the target Wikipedia article follows the standard tournament layout
(`wikitable` standings + `.footballbox` matches — a tournament whose fixtures aren't fully
scheduled yet is fine too, e.g. missing kickoff times or day-of-month, since the UI falls back to
showing the raw scraped string). If a new entry adds a UI tab, also add it to `TOURNAMENTS` in
`src/config.ts` and a static import + map entry in `App.tsx` — tab order is computed automatically
from each tournament's earliest match date (`firstGameDate` in `src/lib/tournamentStatus.ts`), so
where you add the entry in either file doesn't matter. If the new tournament has different teams,
add their codes to **both** `src/lib/teamCountry.ts` (ISO code lookup) and the explicit per-flag
import list in `src/components/Flag.tsx` (it imports individual SVGs rather than the full
flag-icons sprite, to keep the bundle small — a code missing from `Flag.tsx` silently renders no
flag even if `teamCountry.ts` resolves it).

### Non-goals (still true as of this branch)

- No in-browser refresh/live polling — data is static until you rerun `npm run scrape`.

### Deployment

Deployed on Vercel (`vercel-build` script in `package.json` re-runs the scraper at build time so
production data stays fresh). Two redundant triggers call the Vercel deploy hook shortly after
tracked matches finish, so results appear without a manual rebuild — see
`docs/specs/2026-07-29-reliable-redeploy-trigger-design.md` for why there are two:

- A scheduled GitHub Actions workflow (`.github/workflows/scheduled-redeploy.yml`) — kept for
  redundancy, but GitHub's `schedule` trigger is best-effort and can delay or skip runs for hours on
  a low-activity repo, so it isn't relied on alone.
- `api/check-redeploy.ts`, a Vercel Serverless Function running the same check-and-deploy logic
  (shared via `scripts/lib/runCheck.ts`), meant to be pinged every 5–15 minutes by an external cron
  service (e.g. cron-job.org) that actually fires on schedule. Requires `VERCEL_DEPLOY_HOOK_URL` and
  `CRON_SECRET` set as Vercel project environment variables (not GitHub secrets).

See `scripts/serve-local.ps1` (above, under Commands) for the local equivalent of that build.

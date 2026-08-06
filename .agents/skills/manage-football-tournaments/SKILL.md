---
name: manage-football-tournaments
description: Add, replace, configure, scrape, and troubleshoot tournaments in the Football Tracker repository. Use when a task changes config/tournaments.json, tournament tabs or featured teams, static tournament JSON imports, team flag coverage, Wikipedia scraper compatibility, or tournament-specific generated data.
---

# Manage Football Tournaments

Keep scraper, generated-data, and UI registration surfaces synchronized while preserving the static build-time architecture.

## Inspect first

1. Read `AGENTS.md`, `config/tournaments.json`, `src/config.ts`, and the tournament registry at the top of `src/App.tsx`.
2. Inspect `types/tournament.ts` and the relevant parser when changing data behavior.
3. Compare the target Wikipedia structure with existing generic parsers before adding special cases.
4. Check `git status` and preserve unrelated work and generated data.

## Add or replace a tournament

1. Add or update the entry in `config/tournaments.json`:
   - Use one stable lowercase hyphenated `id` everywhere.
   - Set the Wikipedia title, output path, source UTC offset, and redeploy timing fields.
   - Keep the output under `src/data/tournaments/<id>.json`.
2. Add or update the UI entry in `src/config.ts`. Set `featuredTeam` only when the tournament needs a spotlight.
3. Add a static JSON import and matching `TOURNAMENT_DATA` key in `src/App.tsx`.
4. Add ISO country mappings for new team names in `src/lib/teamCountry.ts`.
5. Add matching explicit flag SVG imports and map entries in `src/components/Flag.tsx`. A country mapping alone does not render a flag.
6. Run `npm run scrape` when network access is available and the task requires regenerated data.

Do not manually choose tab position: the app sorts tournaments by `firstGameDate`. Do not assume completed tournaments remain visible: `isTournamentOver` filters them when another tournament is active.

## Maintain scraper behavior

- Prefer generic Wikipedia selectors and parsing rules over branches keyed by tournament ID.
- Compute group standings from parsed match results.
- Accept incomplete fixture information and empty knockout rounds where the data contract permits them.
- Normalize scraped times using the tournament's configured explicit UTC offset.
- Preserve atomic validated writes so failed or partial scrapes do not replace last-known-good JSON.
- Add a focused fixture/test for every parsing regression before or alongside the fix.

## Verify

Run checks proportional to the change:

1. `npm run typecheck`
2. `npm run test:scraper`
3. `npm run build` for UI, config, import, or generated-data changes
4. Visually inspect the dev app for tab, flag, time-zone, standings, or bracket changes

When a scrape cannot run because Wikipedia or network access is unavailable, verify code independently, retain last-known-good JSON, and report that generated data was not refreshed.

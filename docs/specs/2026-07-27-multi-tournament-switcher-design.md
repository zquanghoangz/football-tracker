# Multi-tournament support: ASEAN Championship + FIFA U-17 World Cup

## Problem

The app currently supports exactly one active tournament at a time (a documented non-goal in
CLAUDE.md): one `config/tournament.json`, one scrape, one `src/data/tournament.json`, and
`App.tsx` imports that file directly with a single hardcoded `FEATURED_TEAM`. We want to track
the [2026 FIFA U-17 World Cup](https://en.wikipedia.org/wiki/2026_FIFA_U-17_World_Cup) (Qatar,
19 Nov – 13 Dec 2026) alongside the 2026 ASEAN Championship, with a way to switch between them in
the UI without rebuilding.

A complication: the U-17 World Cup hasn't started. Its Wikipedia article currently has a group
stage (12 groups, A–L, each with a standings `wikitable` and match results) but **no knockout
bracket section** — that only appears once Wikipedia editors add it after the group stage
resolves. The scraper's current validation (`writeOutput.ts`) throws if `knockout.rounds` is
empty, which would make U-17 look like a broken scrape today.

## Goals

- Scrape and bundle both tournaments independently; switching between them in the UI is
  instant (no rebuild, no fetch).
- Each tournament can have its own featured team (or none).
- Empty knockout data is a valid, expected state for a pre-bracket tournament — not an error.
- The scheduled post-match redeploy keeps working correctly for both tournaments.

## Non-goals

- No live/polling updates — still build-time static data, per existing CLAUDE.md non-goals.
- No router library / deep client-side routing beyond a single `?t=<id>` query param.
- No redesign of the group/match/knockout display components themselves.

## Config: `config/tournaments.json`

Replaces `config/tournament.json`. An array of entries, each with a stable `id`:

```json
[
  {
    "id": "asean-2026",
    "name": "2026 ASEAN Championship (ASEAN Hyundai Cup 2026)",
    "wikipediaTitle": "2026_ASEAN_Championship",
    "outputFile": "src/data/tournaments/asean-2026.json",
    "redeployDelayMinutes": 120,
    "checkWindowMinutes": 30
  },
  {
    "id": "u17-2026",
    "name": "2026 FIFA U-17 World Cup",
    "wikipediaTitle": "2026_FIFA_U-17_World_Cup",
    "outputFile": "src/data/tournaments/u17-2026.json",
    "redeployDelayMinutes": 120,
    "checkWindowMinutes": 30
  }
]
```

`scripts/lib/loadConfig.ts`: `loadConfig(path)` → `loadConfigs(path)`, returns
`TournamentConfig[]` (with `id` now a required field on the interface).

## Scraper changes

- `scripts/scrape.ts` loops over every config from `loadConfigs`, scraping and writing each
  independently. A failure on one tournament (e.g. a transient fetch error) is caught, logged,
  and does not prevent the other from writing successfully; the script exits non-zero only if
  at least one config failed, listing which succeeded/failed.
- `scripts/lib/writeOutput.ts`: `validateTournamentData` keeps the "groups non-empty" and "every
  group has standings" checks, but drops the "knockout.rounds non-empty" check. An empty
  `knockout.rounds` array is valid output.
- Output moves from a single `src/data/tournament.json` to `src/data/tournaments/<id>.json`, one
  file per config's `outputFile`.

## App changes

- `src/config.ts` gains the per-tournament UI config, independent of the scraped data:
  ```ts
  export interface TournamentUIConfig {
    id: string;
    label: string;
    featuredTeam?: string;
  }

  export const TOURNAMENTS: TournamentUIConfig[] = [
    { id: 'asean-2026', label: 'ASEAN Championship 2026', featuredTeam: 'Vietnam' },
    { id: 'u17-2026', label: 'FIFA U-17 World Cup 2026' },
  ];
  ```
  (`MELBOURNE_TIME_ZONE` / `VIETNAM_TIME_ZONE` are viewer-relative display zones, not
  team-relative, and stay as-is for both tournaments.)
- `App.tsx` statically imports both JSON files (e.g. `import aseanData from
  './data/tournaments/asean-2026.json'`), builds an `id -> TournamentData` map, and adds a small
  tab/pill switcher in the header (one per `TOURNAMENTS` entry).
- Selected id is `useState`, initialized from `?t=<id>` in the URL if present and valid,
  otherwise the first `TOURNAMENTS` entry; selecting a tab updates state and reflects the id
  back into the URL via `history.replaceState` (no router dependency).
- If the selected tournament's `featuredTeam` is undefined, `FeaturedTeamSpotlight` and the
  `getFeaturedTeamUpcomingMatches` call are skipped entirely.
- If `knockout.rounds` is empty, the "Knockout stage" section is omitted rather than rendered
  empty.

## Scheduled redeploy changes

- `scripts/checkDeployTrigger.ts` loops over all configs from `loadConfigs`, fetches each
  article, and computes kickoffs per-tournament via the existing `collectKickoffs`. It fires
  the Vercel rebuild if **any** tournament has a match inside its own
  `redeployDelayMinutes`/`checkWindowMinutes` window (same per-tournament semantics as today).
- `.github/workflows/scheduled-redeploy.yml`'s cron band (`*/30 12-16 * * *` UTC) already
  happens to cover both tournaments' currently-known kickoff slots (ASEAN ~19:00 UTC+7 → 12:00
  UTC; U-17 ~17:00 AST/UTC+3 → 14:00 UTC), but U-17 fixtures may include additional kickoff
  slots per day once the schedule fully populates. Verifying and, if needed, widening the cron
  band is a follow-up checklist item once real U-17 kickoff times are scraped — not guessed
  now.

## Other required work (mechanical, not architectural)

- `src/lib/teamCountry.ts` needs ISO 3166-1 alpha-2 codes added for the U-17 field (up to 48
  nations across 12 groups), on top of today's 10 ASEAN entries.

## Testing

- Existing scraper unit tests (`parseGroups`, `parseStandings`, `parseMatches`,
  `parseKnockout`) are generic per-page parsers already exercised against fixture HTML; no
  changes expected.
- `writeOutput.test.ts`: update/add cases confirming empty `knockout.rounds` no longer throws,
  while empty `groups` or empty `standings` still does.
- `loadConfig`: add a test covering array parsing / required `id` field.
- `deployTrigger`: add coverage for the multi-config loop firing when only one of several
  tournaments has a match in its window.
- No test suite for the React app itself (per CLAUDE.md) — verify the tab switcher, spotlight
  hide/show, and knockout hide/show manually via `npm run dev`.

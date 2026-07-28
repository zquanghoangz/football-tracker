# Hide a tournament's tab once it has ended

## Problem

`TOURNAMENTS` in `src/config.ts` lists every bundled tournament, and `App.tsx` renders one tab
per entry unconditionally — including a tournament whose knockout final (or last group match, if
no bracket) finished days or weeks ago. Once a tournament is over, its tab is just clutter.

## Goals

- A tournament's tab disappears from the switcher once the tournament has ended: 1 full day after
  its last scheduled match date.
- If the tournament that would otherwise be selected (via `?t=<id>` or the default) has ended,
  fall back to the first tournament that hasn't.
- If every tracked tournament has ended, don't end up with zero tabs and no content — show the
  full list again rather than a permanently blank app.

## Non-goals

- No live/ticking re-evaluation while the page is open — "today" is computed once per page load,
  consistent with how `MatchList.tsx` already treats "today" (a per-render date string, not a
  ticking clock).
- No kickoff-time precision. Per-match `time` fields are ignored entirely for this feature; only
  the `date` string matters, matching the existing `MatchList.tsx` convention of comparing
  `match.date` against `todayInZone(...)` as plain `YYYY-MM-DD` strings.
- Hiding is switcher-only — a tournament that's over but still selected (deep link, or the "all
  over" fallback) still renders its content normally. Nothing about `GroupTable`, `MatchList`, or
  `KnockoutBracket` changes.

## Design

### `src/lib/tournamentStatus.ts` (new)

Two pure functions, no clock access (the caller supplies "today", same pattern the rest of the
app already uses via `todayInZone`):

```ts
export function lastGameDate(data: TournamentData): string | null
export function isTournamentOver(data: TournamentData, today: string): boolean
```

- `lastGameDate` collects every group match's `date` plus every knockout tie's `firstLeg.date` /
  `secondLeg.date` (skipping `null` — unresolved future ties), and returns the lexicographically
  (== chronologically, for `YYYY-MM-DD`) largest one. `null` if there are no dated matches at all.
- `isTournamentOver` returns `false` if `lastGameDate` is `null` (nothing scheduled yet — can't be
  "over"). Otherwise, using UTC-safe date-only arithmetic (avoiding local-timezone off-by-one):
  `today > lastGameDate + 1 day`. So the tab stays visible through the day after the last match
  (the 1-day grace period) and disappears starting the second day after.

### `src/App.tsx`

- `const today = todayInZone(MELBOURNE_TIME_ZONE)`.
- `const visibleTournaments = TOURNAMENTS.filter((t) => !isTournamentOver(TOURNAMENT_DATA[t.id], today))`.
- `const tabTournaments = visibleTournaments.length > 0 ? visibleTournaments : TOURNAMENTS` — the
  "all over" fallback.
- The tab row maps over `tabTournaments` instead of `TOURNAMENTS`.
- The `selectedId` initializer: if the URL's `?t=` id isn't in `tabTournaments`, fall back to
  `tabTournaments[0].id` instead of using it directly (same fallback for the no-URL-param default
  case, which already effectively does this via `?? TOURNAMENTS[0].id`).

## Testing

- New `src/lib/tournamentStatus.test.ts` (this is the one exception to "no test suite for the
  React app" in CLAUDE.md — `tournamentStatus.ts` is a plain data-in/data-out function, same
  testable shape as the scraper's `lib/` modules, not a component):
  - `lastGameDate` returns the max date across groups + knockout, ignoring `null` knockout leg dates.
  - `lastGameDate` returns `null` for a tournament with no matches at all.
  - `isTournamentOver` is `false` the day of the last match, `false` the day after (still within
    the 1-day grace), `true` two days after.
  - `isTournamentOver` is `false` when `lastGameDate` is `null`.
- No change to the "no test suite for the React app" policy otherwise — `App.tsx`'s wiring is
  verified manually via `npm run dev` (tab hidden/shown, fallback selection, all-over fallback by
  temporarily faking `today`).

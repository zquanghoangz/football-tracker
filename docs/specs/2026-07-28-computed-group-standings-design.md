# Compute group standings from match results instead of scraping Wikipedia's table

## Problem

Group standings currently come from parsing Wikipedia's `wikitable` standings section
(`scripts/lib/parseStandings.ts`), independently of the match results parsed from `.footballbox`
templates in the same group section. Wikipedia editors update these two things separately: the
match scoreline is typically edited in immediately after full time, but the standings table
(played/W/D/L/GF/GA/points, recalculated across the whole group) is often edited in later,
sometimes only minutes later but occasionally longer.

Observed case: after Singapore 2–0 Timor-Leste (27 July 2026) finished and a rebuild was
triggered, the deployed site showed the correct match score but a stale Group A table (both teams
still at `played: 1`, reflecting only their matchday-1 results). A later re-scrape (same code)
produced the correct table once Wikipedia's own table caught up — confirming this is a source-data
timing gap, not a parser bug.

## Goals

- Standings are always internally consistent with the match results shown on the same page —
  never a case where a match result updates but the table doesn't, because there's only one
  source of truth (our own scraped matches).
- No dependency on Wikipedia's standings wikitable at all.

## Non-goals

- Reproducing Wikipedia's exact tie-break rules when they'd require data we don't scrape (e.g.
  head-to-head results specifically between tied teams). Points → goal difference → goals scored
  → alphabetical is judged good enough; a deeper tie-break is not being built.
- Reflecting walkovers, forfeits, disciplinary point deductions, or disqualifications that
  Wikipedia's table sometimes encodes outside of normal match scorelines. These are rare and
  explicitly out of scope — computed standings only ever reflect what's in the scraped match
  results.
- No UI changes. `GroupTable.tsx` already renders every `StandingsRow` field it needs; nothing
  about the display changes.

## Design

### `scripts/lib/computeStandings.ts` (new)

A pure function:

```ts
export function computeStandings(matches: Match[]): StandingsRow[]
```

- Team set = every team appearing as `homeTeam` or `awayTeam` across all matches (played or not),
  so a group's full team list is correct even before any match has been played.
- Per-team stats accumulate only over matches where `played === true`: `played`, `won`, `drawn`,
  `lost`, `goalsFor`, `goalsAgainst`, `goalDifference` (`goalsFor - goalsAgainst`), `points`
  (3/1/0 for win/draw/loss).
- Sort: `points` desc → `goalDifference` desc → `goalsFor` desc → `team` name ascending
  (deterministic final tiebreak). `position` is assigned 1..N by this sort order — no shared
  positions even on a full tie.
- No HTML/cheerio involved; fully testable with synthetic `Match[]` fixtures.

### `types/tournament.ts`

Drop `qualification` from `StandingsRow`. It's parsed today but never read anywhere in
`src/` (confirmed via grep — `GroupTable.tsx` doesn't reference it) and there's no longer a
source to derive it from once the wikitable parse is gone.

### `scripts/lib/parseGroups.ts`

Stops locating `table.wikitable` and stops calling `parseStandingsTable`. Parses matches first (as
today), then builds `standings: computeStandings(matches)`.

### Deleted

- `scripts/lib/parseStandings.ts` and `scripts/lib/parseStandings.test.ts` — parsing Wikipedia's
  standings wikitable is dead code once nothing calls it.

### `scripts/lib/writeOutput.ts`

No change needed — `validateTournamentData`'s existing "every group has standings" check still
makes sense (a group with fixtures always has a non-empty computed standings list).

## Testing

- New `scripts/lib/computeStandings.test.ts`: per-team arithmetic (win/draw/loss/GF/GA/points),
  sort/tie-break order (points → GD → GF → name), a team with zero played matches still appears
  with zeros, and an empty `matches` array returns `[]`.
- `scripts/lib/parseGroups.test.ts`: update the existing fixture-based assertions — standings rows
  are now expected to be derived from the fixture's `.footballbox` matches rather than the
  fixture's `wikitable` stub (which can be dropped from the test fixture entirely).
- Delete `scripts/lib/parseStandings.test.ts` along with the module it tests.

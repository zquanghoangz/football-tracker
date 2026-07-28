# Computed Group Standings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Wikipedia-standings-table parsing with standings computed from the already-scraped match results, so the app never shows a match score that's out of sync with its group table.

**Architecture:** A new pure function `computeStandings(matches: Match[]): StandingsRow[]` derives every team's played/W/D/L/GF/GA/GD/points and a sorted position purely from match data. `parseGroups.ts` calls it instead of parsing the `wikitable`; the wikitable parser (`parseStandings.ts`) is deleted.

**Tech Stack:** TypeScript (Node `--test` for scraper unit tests), cheerio (unaffected by this change — no new cheerio usage).

## Global Constraints

- Sort order for standings: points desc → goal difference desc → goals scored desc → team name ascending (alphabetical) as the final deterministic tiebreak. No two teams ever share a `position`.
- Points: 3 for a win, 1 each for a draw, 0 for a loss.
- Only matches with `played === true` (and non-null scores) count toward stats; every team appearing in any match (played or not) still gets a standings row, with zeros if none of their matches are played yet.
- `StandingsRow.qualification` is removed — confirmed unused by any file under `src/`.
- Walkovers, forfeits, and point deductions are explicitly out of scope (per spec's Non-goals) — do not add handling for them.

---

### Task 1: `computeStandings` module + drop `qualification` from the type

**Files:**
- Modify: `types/tournament.ts` (drop `qualification` field from `StandingsRow`)
- Create: `scripts/lib/computeStandings.ts`
- Create: `scripts/lib/computeStandings.test.ts`

**Interfaces:**
- Consumes: `Match` and `StandingsRow` types from `types/tournament.ts` (`Match` fields: `homeTeam`, `awayTeam`, `homeScore: number | null`, `awayScore: number | null`, `played: boolean`).
- Produces: `computeStandings(matches: Match[]): StandingsRow[]` — imported by Task 2's `parseGroups.ts`. `StandingsRow` (post-change) has fields: `position`, `team`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points` (no `qualification`).

- [ ] **Step 1: Drop `qualification` from `StandingsRow`**

Edit `types/tournament.ts` — remove the `qualification: string;` line from the `StandingsRow` interface (currently the last field, right after `points`).

- [ ] **Step 2: Write the failing tests**

Create `scripts/lib/computeStandings.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings } from './computeStandings.ts';
import type { Match } from '../../types/tournament.ts';

function match(
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
): Match {
  return {
    date: '2026-07-24',
    time: '19:00 UTC+7',
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    venue: 'Test Stadium',
    played: homeScore !== null && awayScore !== null,
  };
}

test('empty matches produces empty standings', () => {
  assert.deepEqual(computeStandings([]), []);
});

test('every team from a match appears even if unplayed, with zeroed stats', () => {
  const rows = computeStandings([match('Thailand', 'Malaysia', null, null)]);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.played, 0);
    assert.equal(row.won, 0);
    assert.equal(row.drawn, 0);
    assert.equal(row.lost, 0);
    assert.equal(row.goalsFor, 0);
    assert.equal(row.goalsAgainst, 0);
    assert.equal(row.goalDifference, 0);
    assert.equal(row.points, 0);
  }
});

test('computes arithmetic for a decisive win/loss', () => {
  const rows = computeStandings([match('Cambodia', 'Singapore', 1, 2)]);
  const singapore = rows.find((r) => r.team === 'Singapore')!;
  const cambodia = rows.find((r) => r.team === 'Cambodia')!;

  assert.deepEqual(
    { played: singapore.played, won: singapore.won, drawn: singapore.drawn, lost: singapore.lost,
      goalsFor: singapore.goalsFor, goalsAgainst: singapore.goalsAgainst,
      goalDifference: singapore.goalDifference, points: singapore.points },
    { played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1, points: 3 },
  );
  assert.deepEqual(
    { played: cambodia.played, won: cambodia.won, drawn: cambodia.drawn, lost: cambodia.lost,
      goalsFor: cambodia.goalsFor, goalsAgainst: cambodia.goalsAgainst,
      goalDifference: cambodia.goalDifference, points: cambodia.points },
    { played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: -1, points: 0 },
  );
});

test('computes a draw', () => {
  const rows = computeStandings([match('Vietnam', 'Indonesia', 1, 1)]);
  for (const row of rows) {
    assert.equal(row.drawn, 1);
    assert.equal(row.points, 1);
    assert.equal(row.goalDifference, 0);
  }
});

test('accumulates stats across multiple matches for the same team', () => {
  const rows = computeStandings([
    match('Vietnam', 'Timor-Leste', 7, 0),
    match('Vietnam', 'Singapore', 2, 0),
  ]);
  const vietnam = rows.find((r) => r.team === 'Vietnam')!;
  assert.equal(vietnam.played, 2);
  assert.equal(vietnam.won, 2);
  assert.equal(vietnam.points, 6);
  assert.equal(vietnam.goalsFor, 9);
  assert.equal(vietnam.goalsAgainst, 0);
  assert.equal(vietnam.goalDifference, 9);
});

test('sorts by points descending, assigning 1..N with no shared position', () => {
  const rows = computeStandings([
    match('Vietnam', 'Cambodia', 3, 0), // Vietnam 3pts
    match('Singapore', 'Timor-Leste', 1, 1), // Singapore/Timor-Leste 1pt each
  ]);
  assert.equal(rows[0].team, 'Vietnam');
  assert.equal(rows[0].position, 1);
  assert.equal(rows[3].position, 4);
});

test('tie-breaks equal points by goal difference', () => {
  const rows = computeStandings([
    match('Vietnam', 'Cambodia', 3, 0), // Vietnam: 3pts, GD +3
    match('Singapore', 'Indonesia', 5, 0), // Singapore: 3pts, GD +5
  ]);
  assert.equal(rows[0].team, 'Singapore');
  assert.equal(rows[1].team, 'Vietnam');
});

test('tie-breaks equal points and GD by goals scored', () => {
  const rows = computeStandings([
    match('Vietnam', 'Cambodia', 2, 1), // Vietnam: 3pts, GD +1, GF 2
    match('Singapore', 'Indonesia', 3, 2), // Singapore: 3pts, GD +1, GF 3
  ]);
  assert.equal(rows[0].team, 'Singapore');
  assert.equal(rows[1].team, 'Vietnam');
});

test('tie-breaks equal points, GD, and goals scored alphabetically by team name', () => {
  const rows = computeStandings([match('Thailand', 'Malaysia', null, null)]);
  assert.equal(rows[0].team, 'Malaysia');
  assert.equal(rows[1].team, 'Thailand');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test scripts/lib/computeStandings.test.ts`
Expected: FAIL — `computeStandings.ts` doesn't exist yet (module not found).

- [ ] **Step 4: Write the implementation**

Create `scripts/lib/computeStandings.ts`:

```ts
import type { Match, StandingsRow } from '../../types/tournament.ts';

type Accumulated = Omit<StandingsRow, 'position'>;

export function computeStandings(matches: Match[]): StandingsRow[] {
  const rows = new Map<string, Accumulated>();

  const rowFor = (team: string): Accumulated => {
    let row = rows.get(team);
    if (!row) {
      row = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
      rows.set(team, row);
    }
    return row;
  };

  for (const match of matches) {
    rowFor(match.homeTeam);
    rowFor(match.awayTeam);
  }

  for (const match of matches) {
    if (!match.played || match.homeScore === null || match.awayScore === null) continue;

    const home = rowFor(match.homeTeam);
    const away = rowFor(match.awayTeam);

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team);
  });

  return sorted.map((row, i) => ({ ...row, position: i + 1 }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test scripts/lib/computeStandings.test.ts`
Expected: PASS (all 9 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors (confirms nothing else in the repo still references `StandingsRow.qualification`).

- [ ] **Step 7: Commit**

```bash
git add types/tournament.ts scripts/lib/computeStandings.ts scripts/lib/computeStandings.test.ts
git commit -m "Add computeStandings and drop unused qualification field"
```

---

### Task 2: Wire `computeStandings` into `parseGroups`, delete the wikitable parser

**Files:**
- Modify: `scripts/lib/parseGroups.ts`
- Modify: `scripts/lib/parseGroups.test.ts`
- Delete: `scripts/lib/parseStandings.ts`
- Delete: `scripts/lib/parseStandings.test.ts`
- Modify: `CLAUDE.md` (one line — architecture description)

**Interfaces:**
- Consumes: `computeStandings(matches: Match[]): StandingsRow[]` from Task 1's `scripts/lib/computeStandings.ts`.
- Produces: `parseGroups(html: string): GroupData[]` (signature unchanged) — `GroupData.standings` is now computed, not wikitable-parsed. No other file consumes anything new from this task.

- [ ] **Step 1: Update the failing/changing test first**

Replace the full contents of `scripts/lib/parseGroups.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGroups } from './parseGroups.ts';

const FIXTURE = `
<div class="mw-parser-output">
<section><div class="mw-heading mw-heading3"><h3 id="Group_A">Group A</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Matchday 1</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">24 July 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-07-24</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Cambodia</a></span></th><th class="fscore"><a href="#">1&#8211;2</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Singapore</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Morodok Techo National Stadium</a>, <a href="#">Phnom Penh</a></span></div></div>
</div>
</section>
</section>
<section><div class="mw-heading mw-heading3"><h3 id="Group_B">Group B</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Matchday 1</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">25 July 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-07-25</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Thailand</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Malaysia</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Rajamangala Stadium</a>, <a href="#">Bangkok</a></span></div></div>
</div>
</section>
</section>
</div>
`;

test('detects every "Group X" section generically, not a fixed count', () => {
  const groups = parseGroups(FIXTURE);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, 'Group A');
  assert.equal(groups[1].name, 'Group B');
});

test('scopes matches to their own group only', () => {
  const groups = parseGroups(FIXTURE);
  assert.equal(groups[0].matches.length, 1);
  assert.equal(groups[0].matches[0].homeTeam, 'Cambodia');

  assert.equal(groups[1].matches[0].homeTeam, 'Thailand');
  assert.equal(groups[1].matches[0].played, false);
});

test('derives standings from the group\'s own matches, not a shared table', () => {
  const groups = parseGroups(FIXTURE);

  // Group A: Cambodia 1-2 Singapore (played) -> Singapore top on points.
  assert.equal(groups[0].standings.length, 2);
  assert.equal(groups[0].standings[0].team, 'Singapore');
  assert.equal(groups[0].standings[0].points, 3);

  // Group B: Thailand vs Malaysia (unplayed) -> both 0 pts, alphabetical tiebreak.
  assert.equal(groups[1].standings.length, 2);
  assert.equal(groups[1].standings[0].team, 'Malaysia');
  assert.equal(groups[1].standings[0].played, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/parseGroups.test.ts`
Expected: FAIL — `groups[0].standings[0].team` is still wikitable-derived (or the fixture no longer has a wikitable to parse, so standings is `[]`), not yet matching the new assertions.

- [ ] **Step 3: Update `parseGroups.ts`**

Replace the contents of `scripts/lib/parseGroups.ts`:

```ts
import * as cheerio from 'cheerio';
import type { GroupData } from '../../types/tournament.ts';
import { parseFootballboxMatch } from './parseMatches.ts';
import { computeStandings } from './computeStandings.ts';

const GROUP_HEADING_PATTERN = /^Group\s+[A-Za-z0-9]+$/i;

export function parseGroups(html: string): GroupData[] {
  const $ = cheerio.load(html);
  const groups: GroupData[] = [];

  $('section').each((_, section) => {
    const heading = $(section).children('div.mw-heading3').children('h3').first();
    const name = heading.text().trim();
    if (!GROUP_HEADING_PATTERN.test(name)) return;

    const matches = $(section)
      .find('.footballbox')
      .map((_, box) => parseFootballboxMatch($, box))
      .get();

    groups.push({ name, standings: computeStandings(matches), matches });
  });

  return groups;
}
```

- [ ] **Step 4: Delete the wikitable parser and its test**

```bash
git rm scripts/lib/parseStandings.ts scripts/lib/parseStandings.test.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:scraper`
Expected: PASS for every `scripts/lib/*.test.ts` file (confirms `parseGroups`, `computeStandings`, and everything else — `parseMatches`, `parseKnockout`, `deployTrigger`, `loadConfig`, `normalizeMatchTime`, `writeOutput` — all still pass).

- [ ] **Step 6: Update CLAUDE.md's architecture description**

In `CLAUDE.md`, find this line (in the "Scraper" section):

```
- `parseGroups.ts` finds every `Group <X>` heading generically (however many groups the
  tournament has) and delegates to `parseStandingsTable` (the `wikitable`) and
  `parseFootballboxMatch` (Wikipedia's `.footballbox` match template) for each one.
```

Replace it with:

```
- `parseGroups.ts` finds every `Group <X>` heading generically (however many groups the
  tournament has), delegates to `parseFootballboxMatch` (Wikipedia's `.footballbox` match
  template) for each match, and derives standings from those matches via `computeStandings`
  rather than parsing Wikipedia's own standings table — the two are otherwise updated on
  independent schedules by Wikipedia editors, which was a source of stale-standings bugs.
```

- [ ] **Step 7: Typecheck and full verification**

Run: `npm run typecheck && npm run test:scraper`
Expected: both pass with no errors.

- [ ] **Step 8: Manually confirm against real data**

Run: `npm run scrape`
Expected: succeeds; open `src/data/tournaments/asean-2026.json` and confirm Group A's standings show Singapore and Timor-Leste both at `played: 2` (matching the two group matches each has actually played), with no dependency on Wikipedia's own table having been recalculated.

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/parseGroups.ts scripts/lib/parseGroups.test.ts CLAUDE.md
git commit -m "Compute group standings from match results instead of scraping Wikipedia's table"
```

---

## Self-Review Notes

- **Spec coverage:** `computeStandings` module (Task 1) ✓, dropped `qualification` field (Task 1) ✓, `parseGroups.ts` wiring + deletion of `parseStandings.ts`/test (Task 2) ✓, sort/tie-break rules (Task 1 tests) ✓, non-goals (walkovers etc.) — intentionally not implemented, matches spec ✓, testing plan (new computeStandings tests + updated parseGroups tests + deleted parseStandings tests) ✓, `writeOutput.ts` — spec says no change needed, confirmed by re-reading `validateTournamentData` (checks `groups.length` and each group's `standings.length`, both still valid post-refactor).
- **Type consistency:** `computeStandings(matches: Match[]): StandingsRow[]` signature matches its Task 2 call site `computeStandings(matches)`. `StandingsRow` fields used in Task 1's implementation (`team`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `goalDifference`, `points`, `position`) match the post-edit interface in `types/tournament.ts` exactly, with no `qualification` reference anywhere in either task.

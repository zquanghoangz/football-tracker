# ASEAN Championship Tracker — Design Spec

Date: 2026-07-25
Project directory: `c:\ws\Playground\Football`

## Purpose

A localhost-only React app that displays the 2026 ASEAN Championship (ASEAN Hyundai Cup 2026)
group-stage matches/standings and knockout-stage ties. Data is scraped from Wikipedia into a
local JSON file by a manual script; the app just reads that file on load. "Make it work first,
improve design along the way" — v1 favors simplicity over polish or automation.

## Non-goals (v1)

- No in-browser refresh / live polling of data.
- No simultaneous multi-tournament support — one active tournament at a time. (Swapping which
  tournament is tracked is in scope and should require only a config change, not code changes —
  see "Tournament config" below.)
- No visual design polish beyond minimal semantic HTML/tables.
- No deployment — localhost dev server only.
- No automated test suite (manual verification only).

## Architecture

- **App**: Vite + React + TypeScript, dev server only (`npm run dev`), runs on localhost.
- **Scraper**: standalone Node script `scripts/scrape.mts` (native `fetch` + `cheerio`), run
  manually via `npm run scrape`. Not part of the React runtime bundle.
- **Data source**: Wikipedia football tournament articles — chosen over the original Google
  search URL (a non-scrapeable, session-tokenized SERP) and over the official AFF site
  (unknown/unverified HTML structure). Wikipedia uses the same `wikitable` markup for standings
  and `.footballbox` templates for individual matches consistently across virtually all football
  tournament articles, which is what makes this generic across tournaments, not just this one.

### Tournament config

A small config file, `config/tournament.json`, is the single thing you edit to point the scraper
at a different (similarly-structured) tournament:

```json
{
  "name": "2026 ASEAN Championship (ASEAN Hyundai Cup 2026)",
  "wikipediaTitle": "2026_ASEAN_Championship",
  "outputFile": "src/data/tournament.json"
}
```

The scraper builds the fetch URL from `wikipediaTitle` and writes to `outputFile`. Switching to
another tournament (e.g. next edition, or a different competition with the same Wikipedia
group-stage + knockout layout) means editing this one file and rerunning `npm run scrape` — no
code changes, as long as the target article follows Wikipedia's standard tournament layout.

### Data flow

```
npm run scrape
  → read config/tournament.json
  → fetch en.wikipedia.org/wiki/<wikipediaTitle> (with descriptive User-Agent)
  → parse HTML with cheerio:
      - detect every "Group <X>" heading (however many groups this tournament has) and parse
        each one's standings table + match schedule generically
      - detect the knockout stage heading and parse its rounds (whatever the bracket depth is —
        quarterfinals/semifinals/final, or just semifinals/final) generically
  → validate all expected sections were found
  → write <outputFile> (only on full success; never overwrite with partial data)

npm run dev
  → App.tsx does `import data from './data/tournament.json'`
  → renders one tab per entry in `data.groups`, plus a Knockout tab — tab list is derived from
    the data, not hardcoded to "Group A"/"Group B"
```

## Data model

One JSON file, `src/data/tournament.json`:

```ts
interface TournamentData {
  tournament: { name: string; sourceUrl: string; scrapedAt: string };
  groups: GroupData[]; // however many groups this tournament has — not fixed to 2
  knockout: {
    rounds: KnockoutRound[]; // e.g. [Quarterfinals?, Semifinals, Final] — whatever bracket depth exists
  };
}

interface GroupData {
  name: string; // e.g. "Group A" — whatever heading text Wikipedia uses
  standings: {
    position: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    qualification: string; // e.g. "Advance to knockout stage"
  }[];
  matches: {
    date: string;      // ISO date, e.g. "2026-07-24"
    time: string;      // e.g. "19:00 UTC+7"
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null; // null if not yet played
    awayScore: number | null;
    venue: string;
    played: boolean;
  }[];
}

interface KnockoutRound {
  name: string; // e.g. "Semifinals", "Final", "Quarterfinals"
  ties: KnockoutTie[];
}

interface KnockoutTie {
  team1: string; // may be a placeholder like "Runner-up Group A" until group stage resolves it
  team2: string;
  firstLeg: { date: string | null; venue: string | null; homeScore: number | null; awayScore: number | null };
  secondLeg: { date: string | null; venue: string | null; homeScore: number | null; awayScore: number | null };
  aggregate: string | null; // e.g. "3-2" once both legs are played
}
```

`null`/placeholder values cover both "match not played yet" (group stage) and "teams not yet
determined" (knockout stage, as of 2026-07-25).

## Scraper design

- Reads `config/tournament.json` for the Wikipedia page title and output file path — nothing
  tournament-specific is hardcoded in the scraper itself.
- Fetches the Wikipedia article HTML directly (not the wikitext API) since rendered HTML is
  simpler to parse with `cheerio` and matches Wikipedia's page-fetch etiquette (descriptive
  User-Agent header).
- Groups: scans all headings matching `/^Group [A-Z0-9]+$/i` (however many exist) rather than
  assuming exactly "Group A"/"Group B". For each match, parses the section generically:
  - Standings: locate the `wikitable` immediately following the heading; map columns by header
    text (Pos, Team, Pld, W, D, L, GF, GA, GD, Pts, Qualification) rather than by fixed column
    index, so minor markup reordering doesn't silently corrupt data.
  - Matches: iterate `.footballbox` blocks within the section, extracting home/away team names,
    score (or mark `played: false` if no score shown), date/time, and venue.
- Knockout: locates the knockout-stage heading, then each round's sub-heading (e.g.
  "Quarterfinals", "Semifinals", "Final") and its two-legged tie table under each — parsed into
  `KnockoutRound[]` rather than assuming a fixed semifinals+final shape. Parses Team 1, Team 2,
  1st leg (date/venue), 2nd leg (date/venue), and Agg. columns per tie. Placeholder team names
  (e.g. "Winner Group B") are stored as-is until Wikipedia updates them post-group-stage.
- Exact CSS selectors are finalized during implementation against the live HTML — expected
  refinement, not a gap in this spec. The generic (heading-text-driven, not hardcoded-count)
  detection logic is what makes switching tournaments a config-only change.

## Frontend design

- `<App>`: holds `activeTab` state (`string`), tab list is derived at render time from
  `data.groups.map(g => g.name)` plus `'Knockout'` — not a hardcoded union type — so a
  tournament with 3+ groups renders correctly with no code change.
- `<GroupTable standings={...} />`: renders the standings as an HTML `<table>`.
- `<MatchList matches={...} />`: renders each match as a row — date/time/venue, and score if
  `played`, otherwise "vs".
- `<KnockoutBracket knockout={...} />`: maps over `knockout.rounds` and renders each round's
  ties generically (works whether there are 1, 2, or 3 rounds), showing both legs and the
  aggregate per tie; unplayed legs show "TBD".
- Styling: minimal semantic HTML/CSS for v1, improved iteratively afterward per your direction.

## Error handling

- **Scraper**: throws with a specific message naming which section failed to parse (e.g.
  "Group B standings table not found"), exits non-zero, and does not touch the existing
  `tournament.json` unless the entire scrape succeeds — a broken run never destroys good data.
- **Frontend**: none needed for data loading (JSON is bundled at build time, always present).
  Rendering handles `null` fields by displaying "TBD"/"–" rather than crashing.

## Testing / verification

Manual only, matching the project's small/personal scope:
1. Run `npm run scrape`, inspect `src/data/tournament.json` for sane values (correct team
   names, plausible scores/dates).
2. Run `npm run dev`, open the localhost URL, visually confirm Group A/B matches and standings
   render, and the Knockout tab shows the two ties + final with placeholder teams and "TBD"
   legs (since knockout hasn't started as of 2026-07-25).

## Open items resolved during brainstorming

- Google search URL rejected as a data source (non-scrapeable SERP) → Wikipedia chosen instead.
- Scope includes both group stage and knockout stage (knockout currently all placeholders).
- TypeScript chosen over plain JS for the typed data model.
- No auto-refresh / no local server for v1 — scrape is a manual, separate step from the app.
- Scraper and frontend generalized (config-driven Wikipedia title, heading-detection instead of
  hardcoded group/round counts) so switching to another similarly-structured Wikipedia football
  tournament is a config-and-rescrape change, not a code change. Still single-active-tournament
  (no simultaneous multi-tournament UI) — see Non-goals.

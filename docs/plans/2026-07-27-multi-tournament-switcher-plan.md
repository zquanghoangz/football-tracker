# Multi-tournament switcher (ASEAN Championship + FIFA U-17 World Cup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the app track two tournaments (ASEAN Championship + FIFA U-17 World Cup) at once, scraped independently and switchable client-side via tabs, with no rebuild required to switch.

**Architecture:** `config/tournament.json` becomes `config/tournaments.json` (an array of configs, each with a stable `id`). The scraper loops over every config, writing one JSON file per tournament under `src/data/tournaments/`. The app statically imports both files and toggles which one it renders via a `useState` + `?t=<id>` URL param. Knockout data may legitimately be empty (U-17 hasn't reached the knockout stage yet); the scraper's validation and the UI both treat that as a valid, expected state rather than an error.

**Tech Stack:** TypeScript, Node's built-in test runner (`node --test`), cheerio (scraper only), React 19 + Vite (app only) — no new dependencies.

## Global Constraints

- Do not run `git commit` at any point while executing this plan (standing project preference) — leave all changes staged/modified in the working directory for the user to review and commit themselves. Skip every "Commit" step a template would normally include.
- Spec: `docs/specs/2026-07-27-multi-tournament-switcher-design.md` — refer back to it if a task here seems to contradict it.
- No new npm dependencies — everything is achievable with what's already installed.
- Existing components (`GroupTable`, `MatchList`, `KnockoutBracket`) take `featuredTeam: string` (non-optional) and only ever use it for `=== ` comparisons — when a tournament has no featured team, pass `''` down to them instead of changing their signatures.

---

### Task 1: Multi-tournament config schema

**Files:**
- Create: `config/tournaments.json`
- Delete: `config/tournament.json`
- Modify: `scripts/lib/loadConfig.ts`
- Create: `scripts/lib/loadConfig.test.ts`

**Interfaces:**
- Produces: `export interface TournamentConfig { id: string; name: string; wikipediaTitle: string; outputFile: string; redeployDelayMinutes: number; checkWindowMinutes: number }` and `export function loadConfigs(configPath: string): TournamentConfig[]` from `scripts/lib/loadConfig.ts`. This replaces the old single-config `loadConfig`/`TournamentConfig` — every later task that touches config loading uses `loadConfigs`.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/loadConfig.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigs } from './loadConfig.ts';

function writeConfigFile(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'tournaments-config-'));
  const path = join(dir, 'tournaments.json');
  writeFileSync(path, JSON.stringify(contents), 'utf-8');
  return path;
}

test('loadConfigs parses an array of tournament configs', () => {
  const path = writeConfigFile([
    {
      id: 'asean-2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
    {
      id: 'u17-2026',
      name: 'FIFA U-17 World Cup',
      wikipediaTitle: '2026_FIFA_U-17_World_Cup',
      outputFile: 'src/data/tournaments/u17-2026.json',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  const configs = loadConfigs(path);

  assert.equal(configs.length, 2);
  assert.equal(configs[0].id, 'asean-2026');
  assert.equal(configs[1].id, 'u17-2026');
});

test('loadConfigs throws if a config entry is missing an id', () => {
  const path = writeConfigFile([
    {
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  assert.throws(() => loadConfigs(path), /id/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/loadConfig.test.ts`
Expected: FAIL — `loadConfigs` is not exported yet.

- [ ] **Step 3: Write the config file and implementation**

Create `config/tournaments.json`:

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

Replace the contents of `scripts/lib/loadConfig.ts`:

```ts
import { readFileSync } from 'node:fs';

export interface TournamentConfig {
  id: string;
  name: string;
  wikipediaTitle: string;
  outputFile: string;
  redeployDelayMinutes: number;
  checkWindowMinutes: number;
}

export function loadConfigs(configPath: string): TournamentConfig[] {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as TournamentConfig[];

  for (const config of parsed) {
    if (!config.id) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "id"`);
    }
  }

  return parsed;
}
```

Delete `config/tournament.json` (the old single-tournament file).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/loadConfig.test.ts`
Expected: PASS (both tests)

---

### Task 2: Allow empty knockout data

**Files:**
- Modify: `scripts/lib/writeOutput.ts`
- Modify: `scripts/lib/writeOutput.test.ts`

**Interfaces:**
- Consumes: `TournamentData` from `types/tournament.ts` (unchanged).
- Produces: `validateTournamentData(data: TournamentData): void` (same signature, relaxed behavior — no longer throws on empty `knockout.rounds`) and `writeTournamentData(outputFile: string, data: TournamentData): void` (unchanged signature/behavior otherwise).

- [ ] **Step 1: Update the failing/changed tests**

In `scripts/lib/writeOutput.test.ts`, replace the "throws when there are no knockout rounds" test with one asserting the opposite, and add a case proving `writeTournamentData` succeeds with empty knockout:

```ts
test('validateTournamentData does not throw when there are no knockout rounds', () => {
  assert.doesNotThrow(() => validateTournamentData({ ...VALID_DATA, knockout: { rounds: [] } }));
});

test('writeTournamentData writes successfully with empty knockout rounds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tournament-'));
  const outputFile = join(dir, 'tournament.json');
  const data = { ...VALID_DATA, knockout: { rounds: [] } };
  writeTournamentData(outputFile, data);
  const written = JSON.parse(readFileSync(outputFile, 'utf-8'));
  assert.deepEqual(written, data);
});
```

(Leave the "no groups" and "no standings" throw tests as they are — those checks are unchanged.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/writeOutput.test.ts`
Expected: FAIL — the old code still throws on empty knockout rounds.

- [ ] **Step 3: Relax the validation**

In `scripts/lib/writeOutput.ts`, remove the knockout-rounds check from `validateTournamentData`:

```ts
export function validateTournamentData(data: TournamentData): void {
  if (data.groups.length === 0) {
    throw new Error(
      'No groups found on the page — check the Wikipedia article structure or wikipediaTitle in config/tournaments.json',
    );
  }
  for (const group of data.groups) {
    if (group.standings.length === 0) {
      throw new Error(`Group "${group.name}" has no standings rows — check the page structure`);
    }
  }
}
```

(Note the error message now references `config/tournaments.json` to match Task 1's rename.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/writeOutput.test.ts`
Expected: PASS (all tests, including the two new ones)

---

### Task 3: Multi-tournament scrape script + real data

**Files:**
- Modify: `scripts/scrape.ts`
- Create (via running the script, not hand-written): `src/data/tournaments/asean-2026.json`, `src/data/tournaments/u17-2026.json`
- Delete: `src/data/tournament.json` (old single-tournament output)

**Interfaces:**
- Consumes: `loadConfigs` from Task 1, `fetchArticleHtml`, `parseGroups`, `parseKnockout`, `writeTournamentData` (all unchanged).
- Produces: two files under `src/data/tournaments/` matching each config's `outputFile`, each a valid `TournamentData` per `types/tournament.ts`. Task 6 statically imports these by path.

- [ ] **Step 1: Rewrite `scripts/scrape.ts` to loop over every config**

```ts
import { loadConfigs } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { writeTournamentData } from './lib/writeOutput.ts';
import type { TournamentData } from '../types/tournament.ts';

async function scrapeOne(config: ReturnType<typeof loadConfigs>[number]): Promise<void> {
  const sourceUrl = `https://en.wikipedia.org/wiki/${config.wikipediaTitle}`;
  console.log(`Fetching ${sourceUrl} ...`);
  const html = await fetchArticleHtml(config.wikipediaTitle);

  const groups = parseGroups(html);
  const knockout = parseKnockout(html);

  const data: TournamentData = {
    tournament: {
      name: config.name,
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    },
    groups,
    knockout,
  };

  writeTournamentData(config.outputFile, data);
  console.log(
    `Wrote ${config.outputFile}: ${groups.length} groups, ${knockout.rounds.length} knockout rounds`,
  );
}

async function main() {
  const configs = loadConfigs('config/tournaments.json');
  const results = await Promise.allSettled(configs.map(scrapeOne));

  const failures = results
    .map((result, i) => ({ result, config: configs[i] }))
    .filter((r): r is { result: PromiseRejectedResult; config: (typeof configs)[number] } => r.result.status === 'rejected');

  for (const failure of failures) {
    console.error(`Failed to scrape "${failure.config.id}": ${(failure.result.reason as Error).message}`);
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
```

This has no dedicated unit test (matching the existing project convention — `scrape.ts` is a thin orchestration entry point over already-tested pure functions in `scripts/lib/`; there has never been a `scrape.test.ts`). It's verified by actually running it in the next step.

- [ ] **Step 2: Run the real scrape**

Run: `npm run scrape`
Expected output: two lines like:
```
Wrote src/data/tournaments/asean-2026.json: N groups, M knockout rounds
Wrote src/data/tournaments/u17-2026.json: 12 groups, 0 knockout rounds
```
The U-17 line is expected to show `0 knockout rounds` — the tournament hasn't reached the knockout stage yet (see the spec).

- [ ] **Step 3: Verify the U-17 output has real match data, not just standings**

Open `src/data/tournaments/u17-2026.json` and confirm at least one group's `matches` array is non-empty (not just `standings`). If `matches` comes back empty for every group, the U-17 article's match markup doesn't use the `.footballbox` template the way `parseFootballboxMatch` (`scripts/lib/parseMatches.ts`) expects — inspect the live page source around a match result and adjust `parseMatches.ts` accordingly. (This is a contingency, not an expected outcome — FIFA tournament articles conventionally use `.footballbox`.)

- [ ] **Step 4: Remove the old single-tournament data file**

Delete `src/data/tournament.json` — it's superseded by the two files under `src/data/tournaments/`.

---

### Task 4: Multi-tournament scheduled redeploy check

**Files:**
- Modify: `scripts/lib/deployTrigger.ts`
- Modify: `scripts/lib/deployTrigger.test.ts`
- Modify: `scripts/checkDeployTrigger.ts`
- Modify: `.github/workflows/scheduled-redeploy.yml`

**Interfaces:**
- Consumes: `collectKickoffs`, `shouldTriggerDeploy` (both unchanged), `loadConfigs` from Task 1 (now carrying `utcOffset` per Task 7), `normalizeGroupTimes`/`normalizeKnockoutTimes` from Task 7.
- Produces: `export function shouldTriggerAnyDeploy(entries: { kickoffs: Date[]; redeployDelayMinutes: number; checkWindowMinutes: number }[], now: Date): boolean` — added to `scripts/lib/deployTrigger.ts`, used by `checkDeployTrigger.ts`.

**Dependency note:** Task 7 (added after a discovery mid-implementation — see its heading) must be done before this task, even though it's written later in this file. `checkDeployTrigger.ts` parses the live HTML itself (independent of `scrape.ts`'s output files) and needs the same UTC-offset normalization Task 7 adds, or U-17 kickoffs won't parse and the redeploy trigger silently never fires for that tournament.

- [ ] **Step 1: Write the failing test**

Add to `scripts/lib/deployTrigger.test.ts`:

```ts
import { shouldTriggerAnyDeploy } from './deployTrigger.ts';

test('shouldTriggerAnyDeploy fires when only one of several tournaments has a match in window', () => {
  const now = new Date('2026-07-24T14:05:00.000Z'); // 125 min after the ASEAN kickoff below

  const entries = [
    {
      kickoffs: [new Date('2026-07-24T12:00:00.000Z')], // ASEAN: in its window
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
    {
      kickoffs: [new Date('2026-11-19T14:00:00.000Z')], // U-17: nowhere near `now`
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ];

  assert.equal(shouldTriggerAnyDeploy(entries, now), true);
});

test('shouldTriggerAnyDeploy returns false when no tournament has a match in window', () => {
  const now = new Date('2026-07-24T14:05:00.000Z');

  const entries = [
    {
      kickoffs: [new Date('2026-07-24T12:00:00.000Z')],
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ];

  // now is only 5 min after kickoff, nowhere near the 120-150 min window
  assert.equal(
    shouldTriggerAnyDeploy(
      [{ ...entries[0], kickoffs: [new Date('2026-07-24T14:00:00.000Z')] }],
      now,
    ),
    false,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/deployTrigger.test.ts`
Expected: FAIL — `shouldTriggerAnyDeploy` is not exported yet.

- [ ] **Step 3: Implement `shouldTriggerAnyDeploy`**

Add to `scripts/lib/deployTrigger.ts`:

```ts
export function shouldTriggerAnyDeploy(
  entries: { kickoffs: Date[]; redeployDelayMinutes: number; checkWindowMinutes: number }[],
  now: Date,
): boolean {
  return entries.some((entry) =>
    shouldTriggerDeploy(entry.kickoffs, now, entry.redeployDelayMinutes, entry.checkWindowMinutes),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/deployTrigger.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Update `scripts/checkDeployTrigger.ts` to loop over every config**

Replace its contents:

```ts
import { loadConfigs } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { collectKickoffs, shouldTriggerAnyDeploy } from './lib/deployTrigger.ts';
import { normalizeGroupTimes, normalizeKnockoutTimes } from './lib/normalizeMatchTime.ts';

async function main() {
  const configs = loadConfigs('config/tournaments.json');

  for (const config of configs) {
    if (!Number.isFinite(config.redeployDelayMinutes) || !Number.isFinite(config.checkWindowMinutes)) {
      throw new Error(
        `config/tournaments.json entry "${config.id}" must set numeric redeployDelayMinutes and checkWindowMinutes`,
      );
    }
  }

  const settled = await Promise.allSettled(
    configs.map(async (config) => {
      const html = await fetchArticleHtml(config.wikipediaTitle);
      const groups = normalizeGroupTimes(parseGroups(html), config.utcOffset);
      const { rounds } = parseKnockout(html);
      const normalizedRounds = normalizeKnockoutTimes(rounds, config.utcOffset);
      return {
        kickoffs: collectKickoffs(groups, normalizedRounds),
        redeployDelayMinutes: config.redeployDelayMinutes,
        checkWindowMinutes: config.checkWindowMinutes,
      };
    }),
  );

  const entries: { kickoffs: Date[]; redeployDelayMinutes: number; checkWindowMinutes: number }[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      console.error(`Failed to check "${configs[i].id}": ${(result.reason as Error).message}`);
    }
  });

  const fire = shouldTriggerAnyDeploy(entries, new Date());

  if (fire) {
    console.log('Trigger window matched for at least one tournament — redeploying.');
    process.exit(0);
  }

  console.log('No match in the redeploy trigger window right now, for any tracked tournament.');
  process.exit(1);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 6: Update the workflow's cron comment for multi-tournament**

In `.github/workflows/scheduled-redeploy.yml`, replace the comment block above the `cron:` line:

```yaml
    # Every 30 min, 12:00-16:59 UTC — covers known kickoff bands for all tracked
    # tournaments (see config/tournaments.json and
    # docs/specs/2026-07-27-multi-tournament-switcher-design.md, "Scheduled redeploy").
    # checkWindowMinutes in config/tournaments.json must match this 30-min interval.
    # Verified against real scraped fixtures (2026-07-27): ASEAN kickoffs land at
    # 12:00 UTC; U-17 World Cup kickoffs (17:00/18:30/15:30 AST/UTC+3) land at
    # 14:00/15:30/12:30 UTC — all inside this band. Re-verify if either
    # tournament's schedule changes to use kickoff slots outside 12:00-16:59 UTC.
    - cron: '*/30 12-16 * * *'
```

---

### Task 5: U-17 team flag/country codes

**Files:**
- Modify: `src/lib/teamCountry.ts`

**Interfaces:**
- Consumes: nothing new — reads team names out of `src/data/tournaments/u17-2026.json` (produced in Task 3) to know which teams need entries.
- Produces: no signature change to `countryCodeFor(team: string): string | null` — just more entries in the lookup table.

- [ ] **Step 1: List every distinct team name in the U-17 data**

From `src/data/tournaments/u17-2026.json`, collect every unique `team` value across all groups' `standings` (or `homeTeam`/`awayTeam` in `matches`).

- [ ] **Step 2: Add missing ISO 3166-1 alpha-2 codes**

For each team name not already in `TEAM_COUNTRY_CODE` (`src/lib/teamCountry.ts`), add an entry using the team's ISO alpha-2 code (lowercase, matching the existing `vn`, `sg`, etc. pattern) — e.g.:

```ts
const TEAM_COUNTRY_CODE: Record<string, string> = {
  Vietnam: 'vn',
  Singapore: 'sg',
  Indonesia: 'id',
  Cambodia: 'kh',
  'Timor-Leste': 'tl',
  Thailand: 'th',
  Malaysia: 'my',
  Philippines: 'ph',
  Myanmar: 'mm',
  Laos: 'la',
  Egypt: 'eg',
  Greece: 'gr',
  // ... one entry per remaining U-17 team name found in Step 1
};
```

(The exact list depends on Task 3's real scrape output — use the team names as they literally appear in the JSON, since `Flag` looks them up by exact string match.)

- [ ] **Step 3: Verify manually**

Run `npm run dev`, switch to the U-17 tab (built in Task 6) once available, and confirm every team row shows a flag icon rather than a blank/missing one. (If Task 6 isn't done yet, this step can be deferred to Task 6's manual verification — note it there instead of blocking on it here.)

---

### Task 6: UI switcher

**Files:**
- Modify: `src/config.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `TournamentData` type from `types/tournament.ts`; the two JSON files from Task 3; `getFeaturedTeamUpcomingMatches` (unchanged signature) from `src/lib/featuredTeam.ts`.
- Produces: `export interface TournamentUIConfig { id: string; label: string; featuredTeam?: string }` and `export const TOURNAMENTS: TournamentUIConfig[]` from `src/config.ts` — nothing else consumes these outside `App.tsx`.

- [ ] **Step 1: Add `TOURNAMENTS` to `src/config.ts`**

```ts
// Change this to re-point the UI's highlighting at a different team —
// no other frontend file needs to change.
export const FEATURED_TEAM = 'Vietnam';

export const MELBOURNE_TIME_ZONE = 'Australia/Melbourne';
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface TournamentUIConfig {
  id: string;
  label: string;
  featuredTeam?: string;
}

// One entry per tournament bundled into the app. `id` must match a key in
// TOURNAMENT_DATA in App.tsx. `featuredTeam` is optional — omit it for a
// tournament with no spotlighted team.
export const TOURNAMENTS: TournamentUIConfig[] = [
  { id: 'asean-2026', label: 'ASEAN Championship 2026', featuredTeam: FEATURED_TEAM },
  { id: 'u17-2026', label: 'FIFA U-17 World Cup 2026' },
];
```

(`FEATURED_TEAM` stays exported as-is — nothing currently importing it breaks.)

- [ ] **Step 2: Rewrite `src/App.tsx` to switch between tournaments**

```tsx
import { useState } from 'react';
import aseanData from './data/tournaments/asean-2026.json';
import u17Data from './data/tournaments/u17-2026.json';
import type { TournamentData } from '../types/tournament';
import { GroupTable } from './components/GroupTable';
import { MatchList } from './components/MatchList';
import { KnockoutBracket } from './components/KnockoutBracket';
import { FeaturedTeamSpotlight } from './components/FeaturedTeamSpotlight';
import { FootballLogo } from './components/FootballLogo';
import { TOURNAMENTS } from './config';
import { getFeaturedTeamUpcomingMatches } from './lib/featuredTeam';

const TOURNAMENT_DATA: Record<string, TournamentData> = {
  'asean-2026': aseanData as TournamentData,
  'u17-2026': u17Data as TournamentData,
};

function readTournamentIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('t');
  return id && id in TOURNAMENT_DATA ? id : null;
}

function App() {
  const [selectedId, setSelectedId] = useState(
    () => readTournamentIdFromUrl() ?? TOURNAMENTS[0].id,
  );

  const uiConfig = TOURNAMENTS.find((t) => t.id === selectedId) ?? TOURNAMENTS[0];
  const tournamentData = TOURNAMENT_DATA[uiConfig.id];
  const featuredTeam = uiConfig.featuredTeam ?? '';
  const upcomingMatches = uiConfig.featuredTeam
    ? getFeaturedTeamUpcomingMatches(tournamentData, uiConfig.featuredTeam)
    : [];

  function selectTournament(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('t', id);
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 pb-12">
      <header className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 pt-8 pb-4 sm:px-8">
        <FootballLogo className="h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            {tournamentData.tournament.name}
          </h1>
          <p className="text-xs text-slate-500">
            Source:{' '}
            <a
              href={tournamentData.tournament.sourceUrl}
              className="underline hover:text-slate-300"
            >
              Wikipedia
            </a>{' '}
            · scraped {new Date(tournamentData.tournament.scrapedAt).toLocaleString('en-AU')}
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1800px] gap-2 px-4 pb-4 sm:px-8">
        {TOURNAMENTS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTournament(t.id)}
            className={
              'rounded-full px-4 py-1.5 text-sm font-semibold transition ' +
              (t.id === uiConfig.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 sm:px-8">
        {uiConfig.featuredTeam && (
          <FeaturedTeamSpotlight team={uiConfig.featuredTeam} upcomingMatches={upcomingMatches} />
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {tournamentData.groups.map((group) => (
            <section
              key={group.name}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5"
            >
              <h2 className="mb-3 text-base font-bold text-slate-100">{group.name}</h2>
              <GroupTable
                standings={group.standings}
                matches={group.matches}
                featuredTeam={featuredTeam}
              />
              <MatchList matches={group.matches} featuredTeam={featuredTeam} />
            </section>
          ))}
        </div>

        {tournamentData.knockout.rounds.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-slate-100">Knockout stage</h2>
            <KnockoutBracket rounds={tournamentData.knockout.rounds} featuredTeam={featuredTeam} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the app, and confirm:
- Both tabs render (ASEAN Championship 2026, FIFA U-17 World Cup 2026).
- Clicking each tab swaps the header, groups, and URL (`?t=asean-2026` / `?t=u17-2026`) instantly with no page reload/network request.
- On the ASEAN tab: the Vietnam spotlight section and the knockout section both still render exactly as before.
- On the U-17 tab: no spotlight section appears (no featured team), no "Knockout stage" section appears (empty rounds), all 12 groups render with standings and flags (per Task 5).
- Reloading the page on a `?t=u17-2026` URL opens directly on the U-17 tab.

---

### Task 7: Per-tournament UTC offset normalization

**Added mid-implementation (2026-07-27), execute before Task 4.** The real Task 3 scrape run revealed that the U-17 World Cup Wikipedia article states its UTC offset once at the page level ("All times are local, AST (UTC+3)") rather than per match, so scraped U-17 times come back as bare `"17:00"` instead of ASEAN's `"19:00 UTC+7"` style. `src/lib/matchTime.ts`'s `toDate()` requires an explicit offset and silently returns `null` otherwise — which would make `collectKickoffs` (used by Task 4) find zero U-17 kickoffs ever, defeating the scheduled-redeploy goal for that tournament. Per user decision: add a fixed per-tournament UTC offset to config, and normalize any bare time string by appending it.

This task amends two already-completed pieces (Task 1's config schema, Task 3's `scrape.ts`) and provides the helper Task 4 depends on.

**Files:**
- Modify: `config/tournaments.json` (add `utcOffset` per entry)
- Modify: `scripts/lib/loadConfig.ts` (`TournamentConfig` gains `utcOffset: string`, validated non-empty like `id`)
- Modify: `scripts/lib/loadConfig.test.ts` (fixtures gain `utcOffset`; new test for missing `utcOffset`)
- Create: `scripts/lib/normalizeMatchTime.ts`
- Create: `scripts/lib/normalizeMatchTime.test.ts`
- Modify: `scripts/scrape.ts` (apply normalization before writing)
- Re-run: `npm run scrape` (regenerates both data files — U-17 times gain `UTC+3`; ASEAN is a no-op since its times already carry `UTC+7`)

**Interfaces:**
- Consumes: `GroupData`, `KnockoutRound` from `types/tournament.ts` (unchanged).
- Produces: `export function withUtcOffset(time: string, utcOffset: string): string`, `export function normalizeGroupTimes(groups: GroupData[], utcOffset: string): GroupData[]`, `export function normalizeKnockoutTimes(rounds: KnockoutRound[], utcOffset: string): KnockoutRound[]` from `scripts/lib/normalizeMatchTime.ts` — Task 4's `checkDeployTrigger.ts` imports `normalizeGroupTimes`/`normalizeKnockoutTimes` directly (already wired into Task 4's Step 5 code above).

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/normalizeMatchTime.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withUtcOffset, normalizeGroupTimes, normalizeKnockoutTimes } from './normalizeMatchTime.ts';
import type { GroupData, KnockoutRound } from '../../types/tournament.ts';

test('withUtcOffset appends the offset to a bare "HH:MM" time', () => {
  assert.equal(withUtcOffset('17:00', '+3'), '17:00 UTC+3');
});

test('withUtcOffset leaves a time that already has an offset untouched', () => {
  assert.equal(withUtcOffset('19:00 UTC+7', '+3'), '19:00 UTC+7');
});

test('withUtcOffset leaves a non-time placeholder untouched', () => {
  assert.equal(withUtcOffset('--:--', '+3'), '--:--');
});

test('normalizeGroupTimes appends the offset to every match in every group', () => {
  const groups: GroupData[] = [
    {
      name: 'Group A',
      standings: [],
      matches: [
        { date: '2026-11-19', time: '17:00', homeTeam: 'Egypt', awayTeam: 'Greece', homeScore: null, awayScore: null, venue: 'Aspire Zone', played: false },
      ],
    },
  ];

  const result = normalizeGroupTimes(groups, '+3');
  assert.equal(result[0].matches[0].time, '17:00 UTC+3');
});

test('normalizeKnockoutTimes appends the offset to both legs, skipping null leg times', () => {
  const rounds: KnockoutRound[] = [
    {
      name: 'Final',
      ties: [
        {
          team1: 'X',
          team2: 'Y',
          aggregate: null,
          firstLeg: { date: '2026-12-13', time: '17:00', venue: null, homeScore: null, awayScore: null },
          secondLeg: { date: null, time: null, venue: null, homeScore: null, awayScore: null },
        },
      ],
    },
  ];

  const result = normalizeKnockoutTimes(rounds, '+3');
  assert.equal(result[0].ties[0].firstLeg.time, '17:00 UTC+3');
  assert.equal(result[0].ties[0].secondLeg.time, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/normalizeMatchTime.test.ts`
Expected: FAIL — `./normalizeMatchTime.ts` doesn't exist yet.

- [ ] **Step 3: Implement the normalization helpers**

Create `scripts/lib/normalizeMatchTime.ts`:

```ts
import type { GroupData, KnockoutRound } from '../../types/tournament.ts';

const BARE_TIME = /^\d{1,2}:\d{2}$/;

export function withUtcOffset(time: string, utcOffset: string): string {
  const trimmed = time.trim();
  return BARE_TIME.test(trimmed) ? `${trimmed} UTC${utcOffset}` : time;
}

export function normalizeGroupTimes(groups: GroupData[], utcOffset: string): GroupData[] {
  return groups.map((group) => ({
    ...group,
    matches: group.matches.map((match) => ({ ...match, time: withUtcOffset(match.time, utcOffset) })),
  }));
}

export function normalizeKnockoutTimes(rounds: KnockoutRound[], utcOffset: string): KnockoutRound[] {
  return rounds.map((round) => ({
    ...round,
    ties: round.ties.map((tie) => ({
      ...tie,
      firstLeg: {
        ...tie.firstLeg,
        time: tie.firstLeg.time ? withUtcOffset(tie.firstLeg.time, utcOffset) : tie.firstLeg.time,
      },
      secondLeg: {
        ...tie.secondLeg,
        time: tie.secondLeg.time ? withUtcOffset(tie.secondLeg.time, utcOffset) : tie.secondLeg.time,
      },
    })),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/normalizeMatchTime.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Add `utcOffset` to the config schema**

Update `config/tournaments.json` — add `"utcOffset"` to both entries (ASEAN is UTC+7, U-17 World Cup/Qatar is AST/UTC+3):

```json
[
  {
    "id": "asean-2026",
    "name": "2026 ASEAN Championship (ASEAN Hyundai Cup 2026)",
    "wikipediaTitle": "2026_ASEAN_Championship",
    "outputFile": "src/data/tournaments/asean-2026.json",
    "utcOffset": "+7",
    "redeployDelayMinutes": 120,
    "checkWindowMinutes": 30
  },
  {
    "id": "u17-2026",
    "name": "2026 FIFA U-17 World Cup",
    "wikipediaTitle": "2026_FIFA_U-17_World_Cup",
    "outputFile": "src/data/tournaments/u17-2026.json",
    "utcOffset": "+3",
    "redeployDelayMinutes": 120,
    "checkWindowMinutes": 30
  }
]
```

In `scripts/lib/loadConfig.ts`, add `utcOffset: string;` to the `TournamentConfig` interface, and extend the existing `id` validation loop in `loadConfigs` to also require `utcOffset`:

```ts
  for (const config of parsed) {
    if (!config.id) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "id"`);
    }
    if (!config.utcOffset) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "utcOffset"`);
    }
  }
```

In `scripts/lib/loadConfig.test.ts`, add `utcOffset: '+7'` / `utcOffset: '+3'` to the two fixture entries in the existing "parses an array" test, and add one more test:

```ts
test('loadConfigs throws if a config entry is missing a utcOffset', () => {
  const path = writeConfigFile([
    {
      id: 'asean-2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  assert.throws(() => loadConfigs(path), /utcOffset/i);
});
```

- [ ] **Step 6: Run the config tests to verify they pass**

Run: `node --test scripts/lib/loadConfig.test.ts`
Expected: PASS (all tests)

- [ ] **Step 7: Wire normalization into `scrape.ts`**

In `scripts/scrape.ts`, add the import and apply both normalizers inside `scrapeOne`, before building `data`:

```ts
import { normalizeGroupTimes, normalizeKnockoutTimes } from './lib/normalizeMatchTime.ts';
```

```ts
  const groups = normalizeGroupTimes(parseGroups(html), config.utcOffset);
  const knockout = { rounds: normalizeKnockoutTimes(parseKnockout(html).rounds, config.utcOffset) };
```

(Replaces the existing `const groups = parseGroups(html);` / `const knockout = parseKnockout(html);` lines.)

- [ ] **Step 8: Re-run the real scrape and verify the fix**

Run: `npm run scrape`

Then open `src/data/tournaments/u17-2026.json` and confirm match times now read like `"17:00 UTC+3"` instead of bare `"17:00"`. Open `src/data/tournaments/asean-2026.json` and confirm its times are unchanged (still `"... UTC+7"`, not doubled up like `"... UTC+7 UTC+7"`) — proving `withUtcOffset` correctly no-ops on times that already carry an offset.

- [ ] **Step 9: Run the full scraper test suite**

Run: `npm run test:scraper`
Expected: PASS (all tests, no regressions from the config/loadConfig changes)

---

### Task 8: U-17 flag icon imports

**Added mid-implementation (2026-07-28), after Task 6.** Task 6's manual verification revealed that `src/components/Flag.tsx` statically imports only 10 SVG files by name (the original ASEAN set: `vn`, `sg`, `id`, `kh`, `tl`, `th`, `my`, `ph`, `mm`, `la`) and looks them up via a hardcoded `FLAG_URL` map keyed by country code. Task 5 added ~47 new country codes to `src/lib/teamCountry.ts` for U-17 teams, but with no matching SVG import, `Flag` silently renders nothing (`return null`) for every one of those teams. This task adds the missing imports, following the exact same pattern as the existing 10 — no architecture change.

**Files:**
- Modify: `src/components/Flag.tsx`

**Interfaces:**
- No signature change — `Flag({ team }: { team: string })` behaves identically, just now resolves a URL for every U-17 team too.

- [ ] **Step 1: Add the 47 missing flag imports and map entries**

Replace the top of `src/components/Flag.tsx` (everything before the `Flag` function) with:

```tsx
import vn from 'flag-icons/flags/4x3/vn.svg';
import sg from 'flag-icons/flags/4x3/sg.svg';
import id from 'flag-icons/flags/4x3/id.svg';
import kh from 'flag-icons/flags/4x3/kh.svg';
import tl from 'flag-icons/flags/4x3/tl.svg';
import th from 'flag-icons/flags/4x3/th.svg';
import my from 'flag-icons/flags/4x3/my.svg';
import ph from 'flag-icons/flags/4x3/ph.svg';
import mm from 'flag-icons/flags/4x3/mm.svg';
import la from 'flag-icons/flags/4x3/la.svg';
import ar from 'flag-icons/flags/4x3/ar.svg';
import au from 'flag-icons/flags/4x3/au.svg';
import be from 'flag-icons/flags/4x3/be.svg';
import br from 'flag-icons/flags/4x3/br.svg';
import ci from 'flag-icons/flags/4x3/ci.svg';
import cl from 'flag-icons/flags/4x3/cl.svg';
import cm from 'flag-icons/flags/4x3/cm.svg';
import cn from 'flag-icons/flags/4x3/cn.svg';
import co from 'flag-icons/flags/4x3/co.svg';
import cr from 'flag-icons/flags/4x3/cr.svg';
import cu from 'flag-icons/flags/4x3/cu.svg';
import dk from 'flag-icons/flags/4x3/dk.svg';
import dz from 'flag-icons/flags/4x3/dz.svg';
import ec from 'flag-icons/flags/4x3/ec.svg';
import eg from 'flag-icons/flags/4x3/eg.svg';
import es from 'flag-icons/flags/4x3/es.svg';
import fj from 'flag-icons/flags/4x3/fj.svg';
import fr from 'flag-icons/flags/4x3/fr.svg';
import gr from 'flag-icons/flags/4x3/gr.svg';
import hn from 'flag-icons/flags/4x3/hn.svg';
import hr from 'flag-icons/flags/4x3/hr.svg';
import ht from 'flag-icons/flags/4x3/ht.svg';
import ie from 'flag-icons/flags/4x3/ie.svg';
import it from 'flag-icons/flags/4x3/it.svg';
import jm from 'flag-icons/flags/4x3/jm.svg';
import jp from 'flag-icons/flags/4x3/jp.svg';
import kr from 'flag-icons/flags/4x3/kr.svg';
import ma from 'flag-icons/flags/4x3/ma.svg';
import me from 'flag-icons/flags/4x3/me.svg';
import ml from 'flag-icons/flags/4x3/ml.svg';
import mx from 'flag-icons/flags/4x3/mx.svg';
import mz from 'flag-icons/flags/4x3/mz.svg';
import nc from 'flag-icons/flags/4x3/nc.svg';
import nz from 'flag-icons/flags/4x3/nz.svg';
import pa from 'flag-icons/flags/4x3/pa.svg';
import qa from 'flag-icons/flags/4x3/qa.svg';
import ro from 'flag-icons/flags/4x3/ro.svg';
import rs from 'flag-icons/flags/4x3/rs.svg';
import sa from 'flag-icons/flags/4x3/sa.svg';
import sn from 'flag-icons/flags/4x3/sn.svg';
import tj from 'flag-icons/flags/4x3/tj.svg';
import tz from 'flag-icons/flags/4x3/tz.svg';
import ug from 'flag-icons/flags/4x3/ug.svg';
import us from 'flag-icons/flags/4x3/us.svg';
import uy from 'flag-icons/flags/4x3/uy.svg';
import uz from 'flag-icons/flags/4x3/uz.svg';
import ve from 'flag-icons/flags/4x3/ve.svg';
import { countryCodeFor } from '../lib/teamCountry';

// Importing individual SVGs (rather than the flag-icons CSS sprite, which
// references every country) keeps the bundle to only the flags we use.
const FLAG_URL: Record<string, string> = {
  vn, sg, id, kh, tl, th, my, ph, mm, la,
  ar, au, be, br, ci, cl, cm, cn, co, cr, cu, dk, dz, ec, eg, es, fj, fr, gr,
  hn, hr, ht, ie, it, jm, jp, kr, ma, me, ml, mx, mz, nc, nz, pa, qa, ro, rs,
  sa, sn, tj, tz, ug, us, uy, uz, ve,
};
```

(The `Flag` function itself below this block is unchanged.)

- [ ] **Step 2: Verify every code used in teamCountry.ts now has a matching import**

Run this to confirm no code in `src/lib/teamCountry.ts` is missing from `FLAG_URL`:

```bash
node -e "
const fs = require('fs');
const teamCountry = fs.readFileSync('src/lib/teamCountry.ts', 'utf-8');
const flagFile = fs.readFileSync('src/components/Flag.tsx', 'utf-8');
const codes = [...new Set([...teamCountry.matchAll(/:\s*'([a-z]{2})'/g)].map(m => m[1]))];
const missing = codes.filter(c => !new RegExp('\\\\b' + c + '\\\\b').test(flagFile.split('FLAG_URL')[1]));
console.log(missing.length === 0 ? 'OK: all codes covered' : 'MISSING: ' + missing.join(', '));
"
```

Expected: `OK: all codes covered`

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, switch to the U-17 tab, and confirm every team row across all 12 groups now shows a flag icon (not blank) — spot-check a few groups rather than all 48 teams individually.

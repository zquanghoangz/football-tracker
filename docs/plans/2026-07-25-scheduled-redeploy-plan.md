# Scheduled Redeploy After Match Kickoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 6 is not code** — it is manual dashboard/account steps the user (not an agent) must perform; stop and hand off there.

**Goal:** Automatically trigger a Vercel redeploy roughly 2 hours after each match's kickoff, so the live site picks up final scores without polling constantly or committing scraped data back to git.

**Architecture:** A read-only checker script fetches Wikipedia fresh and asks two small pure functions "did any match just enter its post-kickoff trigger window?"; a GitHub Actions cron calls that script every 30 minutes during a UTC window that covers this tournament's kickoff times, and — only when the checker says yes — hits a Vercel Deploy Hook URL. Vercel's own build re-scrapes live via a new `vercel-build` script, so production always bundles fresh data regardless of what's committed in git.

**Tech Stack:** TypeScript run natively by Node (no transpile step, matching the existing scraper scripts), `node:test` for unit tests, GitHub Actions (`schedule` + `workflow_dispatch` triggers), Vercel Deploy Hooks.

Spec: `docs/specs/2026-07-25-scheduled-redeploy-design.md`

## Global Constraints

- No new npm dependencies — reuse `cheerio`/native `fetch` (already used by the scraper) and Node built-ins only.
- All new scripts must run via `node scripts/<file>.ts` directly (no build/transpile step), matching the existing `"scrape": "node scripts/scrape.ts"` convention — this requires Node's native TypeScript execution, so CI must pin the same Node major version as local dev (24.x).
- The automation must never commit or push to git — the only side effect on a "fire" decision is one `curl -X POST` to a Vercel Deploy Hook URL (design spec, "Architecture" §3). No `GITHUB_TOKEN` `contents: write` permission is used or needed.
- `checkWindowMinutes` (the config field controlling how wide each trigger window is) must equal the GitHub Actions cron interval, so each match's window is normally covered by exactly one scheduled run (design spec, "Known limitation").

---

### Task 1: Capture kickoff time for knockout-stage legs

**Files:**
- Modify: `types/tournament.ts` (the `KnockoutLeg` interface, currently lines 32–37)
- Modify: `scripts/lib/parseMatches.ts` (export the existing `NBSP_PATTERN` constant, line 6)
- Modify: `scripts/lib/parseKnockout.ts` (the `parseLeg` function and `EMPTY_LEG` constant)
- Test: `scripts/lib/parseKnockout.test.ts`

**Interfaces:**
- Produces: `KnockoutLeg` gains `time: string | null` (same format as `Match.time`, e.g. `"19:00 UTC+7"`, or `null` if not yet scheduled). `parseKnockout(html: string): { rounds: KnockoutRound[] }` — signature unchanged, but every leg's `time` field is now populated when the source `.footballbox` has a `.ftime` cell.

- [ ] **Step 1: Write the failing test — add `time` expectations to the existing knockout tests**

Edit `scripts/lib/parseKnockout.test.ts`, updating the two `assert.deepEqual` calls to expect the new field (the fixture already contains `<div class="ftime">19:00 <a href="#">UTC+7</a></div>` for both legs, so no fixture change is needed):

```ts
test('pairs sequential footballbox legs to the correct tie, with placeholder team names', () => {
  const { rounds } = parseKnockout(FIXTURE);
  const tie = rounds[0].ties[0];
  assert.equal(tie.team1, 'Runner-up Group A');
  assert.equal(tie.team2, 'Winner Group B');
  assert.equal(tie.aggregate, null);
  assert.deepEqual(tie.firstLeg, {
    date: '2026-08-15',
    time: '19:00 UTC+7',
    venue: 'Stadium One, City One',
    homeScore: null,
    awayScore: null,
  });
  assert.deepEqual(tie.secondLeg, {
    date: '2026-08-18',
    time: '19:00 UTC+7',
    venue: 'Stadium Two, City Two',
    homeScore: null,
    awayScore: null,
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/lib/parseKnockout.test.ts`
Expected: FAIL — `assert.deepEqual` reports the actual object is missing the `time` property.

- [ ] **Step 3: Add `time` to the `KnockoutLeg` type**

In `types/tournament.ts`, change:

```ts
export interface KnockoutLeg {
  date: string | null;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
}
```

to:

```ts
export interface KnockoutLeg {
  date: string | null;
  time: string | null;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
}
```

- [ ] **Step 4: Export `NBSP_PATTERN` from `parseMatches.ts` so `parseKnockout.ts` can reuse it**

In `scripts/lib/parseMatches.ts`, change:

```ts
const NBSP_PATTERN = new RegExp(String.fromCharCode(0x00a0), 'g');
```

to:

```ts
export const NBSP_PATTERN = new RegExp(String.fromCharCode(0x00a0), 'g');
```

- [ ] **Step 5: Parse the leg's kickoff time in `parseKnockout.ts`**

In `scripts/lib/parseKnockout.ts`, add the import and update `parseLeg` and `EMPTY_LEG`:

```ts
import { NBSP_PATTERN } from './parseMatches.ts';
```

```ts
function parseLeg($: cheerio.CheerioAPI, box: unknown): KnockoutLeg {
  const $box = $(box as never);
  const date = $box.find('.fdate .bday').first().text().trim() || null;
  const time = $box.find('.ftime').first().text().replace(NBSP_PATTERN, ' ').trim() || null;
  const scoreText = $box.find('th.fscore').first().text().trim();
  const played = /\d/.test(scoreText);

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (played) {
    const [home, away] = scoreText.split(/[–-]/).map((s) => s.trim());
    homeScore = parseInt(home, 10);
    awayScore = parseInt(away, 10);
  }

  const venue =
    $box
      .find('.fright [itemprop="location"] span[itemprop="name address"] > a')
      .map((_, a) => $(a).text().trim())
      .get()
      .join(', ') || null;

  return { date, time, venue, homeScore, awayScore };
}

const EMPTY_LEG: KnockoutLeg = {
  date: null,
  time: null,
  venue: null,
  homeScore: null,
  awayScore: null,
};
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test scripts/lib/parseKnockout.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck` — expect no errors.

```bash
git add types/tournament.ts scripts/lib/parseMatches.ts scripts/lib/parseKnockout.ts scripts/lib/parseKnockout.test.ts
git commit -m "Capture kickoff time for knockout-stage legs"
```

---

### Task 2: Pure trigger-window logic (`collectKickoffs` / `shouldTriggerDeploy`)

**Files:**
- Create: `scripts/lib/deployTrigger.ts`
- Test: `scripts/lib/deployTrigger.test.ts`

**Interfaces:**
- Consumes: `GroupData`, `KnockoutRound` (from `types/tournament.ts`, unchanged); `toDate(date: string, time: string): Date | null` (from `src/lib/matchTime.ts`, unchanged, already used by the React app).
- Produces:
  - `collectKickoffs(groups: GroupData[], knockoutRounds: KnockoutRound[]): Date[]` — every match/leg kickoff that has a parseable date+time, across group matches and both knockout legs; entries with missing/unparseable date or time are silently skipped.
  - `shouldTriggerDeploy(kickoffs: Date[], now: Date, redeployDelayMinutes: number, checkWindowMinutes: number): boolean` — true if `now` falls in `[kickoff + redeployDelayMinutes, kickoff + redeployDelayMinutes + checkWindowMinutes)` for any kickoff.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/deployTrigger.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectKickoffs, shouldTriggerDeploy } from './deployTrigger.ts';
import type { GroupData, KnockoutRound } from '../../types/tournament.ts';

const GROUPS: GroupData[] = [
  {
    name: 'Group A',
    standings: [],
    matches: [
      {
        date: '2026-07-24',
        time: '19:00 UTC+7',
        homeTeam: 'A',
        awayTeam: 'B',
        homeScore: null,
        awayScore: null,
        venue: 'Stadium',
        played: false,
      },
    ],
  },
];

const KNOCKOUT_ROUNDS: KnockoutRound[] = [
  {
    name: 'Final',
    ties: [
      {
        team1: 'X',
        team2: 'Y',
        aggregate: null,
        firstLeg: {
          date: '2026-08-15',
          time: '18:00 UTC+7',
          venue: null,
          homeScore: null,
          awayScore: null,
        },
        secondLeg: { date: null, time: null, venue: null, homeScore: null, awayScore: null },
      },
    ],
  },
];

test('collectKickoffs converts group matches and knockout legs, skipping legs with no date/time', () => {
  const kickoffs = collectKickoffs(GROUPS, KNOCKOUT_ROUNDS).map((d) => d.toISOString());
  assert.deepEqual(kickoffs, ['2026-07-24T12:00:00.000Z', '2026-08-15T11:00:00.000Z']);
});

test('shouldTriggerDeploy fires inside the window', () => {
  const kickoff = new Date('2026-07-24T12:00:00.000Z');
  const now = new Date(kickoff.getTime() + 125 * 60_000); // 125 min after kickoff
  assert.equal(shouldTriggerDeploy([kickoff], now, 120, 30), true);
});

test('shouldTriggerDeploy does not fire before the delay has elapsed', () => {
  const kickoff = new Date('2026-07-24T12:00:00.000Z');
  const now = new Date(kickoff.getTime() + 60 * 60_000); // only 1h after kickoff
  assert.equal(shouldTriggerDeploy([kickoff], now, 120, 30), false);
});

test('shouldTriggerDeploy does not fire after the window has closed', () => {
  const kickoff = new Date('2026-07-24T12:00:00.000Z');
  const now = new Date(kickoff.getTime() + 200 * 60_000); // window closed at +150 min
  assert.equal(shouldTriggerDeploy([kickoff], now, 120, 30), false);
});

test('shouldTriggerDeploy returns false when there are no kickoffs', () => {
  assert.equal(shouldTriggerDeploy([], new Date(), 120, 30), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/deployTrigger.test.ts`
Expected: FAIL — `Cannot find module './deployTrigger.ts'`

- [ ] **Step 3: Implement `deployTrigger.ts`**

Create `scripts/lib/deployTrigger.ts`:

```ts
import type { GroupData, KnockoutRound } from '../../types/tournament.ts';
import { toDate } from '../../src/lib/matchTime.ts';

export function collectKickoffs(groups: GroupData[], knockoutRounds: KnockoutRound[]): Date[] {
  const kickoffs: Date[] = [];

  for (const group of groups) {
    for (const match of group.matches) {
      const instant = toDate(match.date, match.time);
      if (instant) kickoffs.push(instant);
    }
  }

  for (const round of knockoutRounds) {
    for (const tie of round.ties) {
      for (const leg of [tie.firstLeg, tie.secondLeg]) {
        if (!leg.date || !leg.time) continue;
        const instant = toDate(leg.date, leg.time);
        if (instant) kickoffs.push(instant);
      }
    }
  }

  return kickoffs;
}

export function shouldTriggerDeploy(
  kickoffs: Date[],
  now: Date,
  redeployDelayMinutes: number,
  checkWindowMinutes: number,
): boolean {
  const nowMs = now.getTime();
  return kickoffs.some((kickoff) => {
    const windowStart = kickoff.getTime() + redeployDelayMinutes * 60_000;
    const windowEnd = windowStart + checkWindowMinutes * 60_000;
    return nowMs >= windowStart && nowMs < windowEnd;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/lib/deployTrigger.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expect no errors.

```bash
git add scripts/lib/deployTrigger.ts scripts/lib/deployTrigger.test.ts
git commit -m "Add pure trigger-window logic for scheduled redeploy"
```

---

### Task 3: Config fields + the checker CLI script

**Files:**
- Modify: `config/tournament.json`
- Modify: `scripts/lib/loadConfig.ts`
- Create: `scripts/checkDeployTrigger.ts`

**Interfaces:**
- Consumes: `loadConfig(configPath: string): TournamentConfig` (existing, extended below); `fetchArticleHtml(wikipediaTitle: string): Promise<string>` (existing, unchanged); `parseGroups(html: string): GroupData[]` (existing, unchanged); `parseKnockout(html: string): { rounds: KnockoutRound[] }` (Task 1, now returns legs with `time`); `collectKickoffs`, `shouldTriggerDeploy` (Task 2).
- Produces: a CLI script, `node scripts/checkDeployTrigger.ts`, that exits `0` when a redeploy should fire and non-zero otherwise (including on any fetch/parse error — treated the same as "no match in window" per the design's error-handling section).

- [ ] **Step 1: Add the new config fields**

Edit `config/tournament.json`:

```json
{
  "name": "2026 ASEAN Championship (ASEAN Hyundai Cup 2026)",
  "wikipediaTitle": "2026_ASEAN_Championship",
  "outputFile": "src/data/tournament.json",
  "redeployDelayMinutes": 120,
  "checkWindowMinutes": 30
}
```

- [ ] **Step 2: Extend the `TournamentConfig` type**

Edit `scripts/lib/loadConfig.ts`:

```ts
export interface TournamentConfig {
  name: string;
  wikipediaTitle: string;
  outputFile: string;
  redeployDelayMinutes: number;
  checkWindowMinutes: number;
}
```

(`loadConfig`'s implementation is unchanged — it already just parses and returns the JSON as this type.)

- [ ] **Step 3: Write the checker CLI script**

Create `scripts/checkDeployTrigger.ts`:

```ts
import { loadConfig } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { collectKickoffs, shouldTriggerDeploy } from './lib/deployTrigger.ts';

async function main() {
  const config = loadConfig('config/tournament.json');
  const html = await fetchArticleHtml(config.wikipediaTitle);

  const groups = parseGroups(html);
  const { rounds } = parseKnockout(html);
  const kickoffs = collectKickoffs(groups, rounds);

  const fire = shouldTriggerDeploy(
    kickoffs,
    new Date(),
    config.redeployDelayMinutes,
    config.checkWindowMinutes,
  );

  if (fire) {
    console.log(
      `Trigger window matched — a match kicked off between ${config.redeployDelayMinutes} and ` +
        `${config.redeployDelayMinutes + config.checkWindowMinutes} minutes ago.`,
    );
    process.exit(0);
  }

  console.log('No match in the redeploy trigger window right now.');
  process.exit(1);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Run it and check the exit code**

Run: `node scripts/checkDeployTrigger.ts; echo "exit code: $?"`
Expected: prints either the "Trigger window matched" or "No match in the redeploy trigger window" line, and the echoed exit code is `0` or `1` accordingly (almost certainly `1` unless run within 2–2.5 hours of a real scheduled kickoff).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expect no errors.

```bash
git add config/tournament.json scripts/lib/loadConfig.ts scripts/checkDeployTrigger.ts
git commit -m "Add config-driven checker script for scheduled redeploy"
```

---

### Task 4: `vercel-build` re-scrapes at build time

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `npm run scrape` (`node scripts/scrape.ts`) and `vite build`.
- Produces: a `vercel-build` npm script that Vercel runs automatically in place of `build` when present.

- [ ] **Step 1: Add the `vercel-build` script**

Edit `package.json`'s `scripts` block:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "vercel-build": "node scripts/scrape.ts && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "scrape": "node scripts/scrape.ts",
    "test:scraper": "node --test"
  }
}
```

- [ ] **Step 2: Run it locally to confirm it behaves like a Vercel build**

Run: `npm run vercel-build`
Expected: scrape output (`Wrote src/data/tournament.json: N groups, M knockout rounds`) followed by a successful Vite build (`dist/` produced, matching what `npm run build` alone already produces).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Add vercel-build script so production re-scrapes at build time"
```

---

### Task 5: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/scheduled-redeploy.yml`

**Interfaces:**
- Consumes: `scripts/checkDeployTrigger.ts` (Task 3, exit code `0`/non-zero); a repo secret `VERCEL_DEPLOY_HOOK_URL` (not yet created — see Task 6).
- Produces: a scheduled workflow, `Scheduled post-match redeploy`, plus a manually-triggerable `workflow_dispatch` (with a `force` input) for testing the deploy step without waiting for a real kickoff window.

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/scheduled-redeploy.yml`:

```yaml
name: Scheduled post-match redeploy

on:
  schedule:
    # Every 30 min, 12:00-16:59 UTC — covers this tournament's kickoff+2h band
    # (see docs/specs/2026-07-25-scheduled-redeploy-design.md, "Data flow").
    # checkWindowMinutes in config/tournament.json must match this 30-min interval.
    - cron: '*/30 12-16 * * *'
  workflow_dispatch:
    inputs:
      force:
        description: 'Trigger the Vercel deploy hook even if no match is in its window (for testing)'
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  check-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install dependencies
        run: npm ci

      - name: Check whether a match just entered its redeploy window
        id: check
        continue-on-error: true
        run: node scripts/checkDeployTrigger.ts

      - name: Trigger Vercel deploy
        if: steps.check.outcome == 'success' || inputs.force == true
        run: curl -fsS -X POST "$VERCEL_DEPLOY_HOOK_URL"
        env:
          VERCEL_DEPLOY_HOOK_URL: ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}
```

- [ ] **Step 2: Sanity-check the file**

Read the file back and confirm indentation is consistent 2-space YAML and every `run:`/`uses:` line lines up under its `steps:` list — GitHub Actions has no local linter in this repo, so full validation (does the cron parse, does `workflow_dispatch` show up with the `force` checkbox) only happens once this is pushed to the repo's default branch, which is covered by Task 6.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/scheduled-redeploy.yml
git commit -m "Add scheduled GitHub Actions workflow for post-match redeploy"
```

---

### Task 6: Manual rollout (user-performed — not an agent task)

This task has no code and cannot be done from this session: it requires an authenticated Vercel dashboard session and pushing to the repo's default branch (GitHub Actions `schedule` triggers only ever fire off the default branch). Hand off here if executing this plan via subagents.

- [ ] **Step 1:** Push the `master` branch (with the five commits from Tasks 1–5) to `origin` once you're ready to switch this on — GitHub won't evaluate the new `schedule` cron until the workflow file exists on the default branch.
- [ ] **Step 2:** In the Vercel dashboard: confirm this GitHub repo is connected to the Vercel project (Project Settings → Git) — if it's already auto-deploying on push today, it's already connected.
- [ ] **Step 3:** Project Settings → Git → Deploy Hooks → create a hook for the `master` branch → copy the generated URL.
- [ ] **Step 4:** In GitHub: repo Settings → Secrets and variables → Actions → New repository secret → name it `VERCEL_DEPLOY_HOOK_URL`, value = the URL from Step 3.
- [ ] **Step 5: Verify end-to-end.** In the GitHub repo's Actions tab, run "Scheduled post-match redeploy" manually via "Run workflow", with `force` set to `true`. Confirm: the "Check" step completes (outcome shown, success or failure, doesn't matter), the "Trigger Vercel deploy" step runs and succeeds (curl returns success), and a new deployment appears in the Vercel dashboard shortly after.
- [ ] **Step 6:** Once verified, no further action is needed — the schedule trigger takes over automatically during future match windows.

---

## Self-Review Notes

- **Spec coverage:** all five spec components (knockout `time` field, checker script, GitHub Actions workflow, `vercel-build`, rollout steps) map to Tasks 1–6; the spec's "Testing" section (window-matching unit test + extended `parseKnockout` test) is covered by Tasks 1–2.
- **Type consistency:** `collectKickoffs(groups: GroupData[], knockoutRounds: KnockoutRound[]): Date[]` and `shouldTriggerDeploy(kickoffs: Date[], now: Date, redeployDelayMinutes: number, checkWindowMinutes: number): boolean` (Task 2) are used with matching argument order and names in Task 3's `checkDeployTrigger.ts`.
- **No placeholders:** every step includes the literal file contents to write; Task 6 is explicitly called out as non-code/manual rather than left as a vague "deploy it" step.

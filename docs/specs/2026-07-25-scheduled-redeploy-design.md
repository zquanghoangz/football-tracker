# Scheduled redeploy after match kickoff — Design Spec

Date: 2026-07-25
Project directory: `c:\ws\Playground\Football`

## Purpose

The app is a static build (`import data from './data/tournament.json'` baked into the bundle at
`vite build` time). Deployed to Vercel, it never picks up new scores on its own — someone has to
rerun `npm run scrape` and get a new build deployed. This spec automates that: redeploy roughly
2 hours after each match's kickoff (by which point the match is essentially always finished and
Wikipedia has usually been updated), without polling constantly or committing scraped data back
to git.

## Non-goals

- Not a general live-score system — this only redeploys periodically, on a delay, not the instant
  a match ends.
- No persisted "already fired" state across runs — occasional double-fire (harmless extra deploy)
  or a one-window miss (data slightly staler until the next match triggers) is accepted rather than
  engineered around. See "Known limitation" below.
- Doesn't change how local development works — `npm run scrape` + `npm run dev` behave exactly as
  today.

## Architecture

Three pieces, none of which commit anything back to git:

1. **Scraper extension** — `KnockoutLeg` (in `types/tournament.ts`) gains a `time: string | null`
   field, matching `Match.time`'s format (e.g. `"19:00 UTC+7"`). `parseKnockout.ts`'s `parseLeg()`
   pulls it from the `.footballbox`'s `.ftime` cell, the same way `parseMatches.ts`'s
   `parseFootballboxMatch()` already does for group-stage matches. This gives every match — group
   or knockout — a real kickoff instant instead of just a date, so the trigger logic below works
   uniformly across both stages.

2. **Trigger checker** — `scripts/checkDeployTrigger.ts`, a read-only script that:
   - Loads `config/tournament.json` (reusing `loadConfig`).
   - Fetches the Wikipedia article fresh (reusing `fetchArticleHtml`).
   - Parses it with the existing `parseGroups` / `parseKnockout`.
   - Computes, for every match/leg with a known date+time, `kickoff + redeployDelayMinutes`.
   - Exits `0` ("fire") if the current instant falls inside the trigger window for any match,
     `1` ("skip") otherwise.
   - Never writes `src/data/tournament.json` — it's purely a yes/no gate for the workflow below.

   `config/tournament.json` gains a `redeployDelayMinutes` field (default `120`) and a
   `checkWindowMinutes` field (default `30`, must match the cron interval in the workflow below —
   see "Known limitation").

3. **GitHub Actions workflow** — `.github/workflows/scheduled-redeploy.yml`:
   - `on.schedule`: cron, every 30 minutes, restricted to a UTC hour range covering plausible
     kickoff+2h times for this tournament. The currently scraped schedule (`src/data/tournament.json`)
     has kickoffs from 16:30 UTC+6:30 / 17:00 UTC+7 / 18:00 UTC+8 (all 10:00 UTC) through
     20:30 UTC+7 (13:30 UTC) — i.e. kickoffs land in the 10:00–13:30 UTC band. Adding the 120-minute
     delay plus the 30-minute check window gives a trigger band of 12:00–16:00 UTC, so
     `*/30 12-16 * * *` (10 runs/day) covers every match with margin. If a future tournament swap
     shifts kickoff times outside this band, this cron expression needs updating alongside
     `config/tournament.json`.
   - Steps: checkout → `actions/setup-node` (pin to the Node version this repo relies on for
     native `.ts` execution, matching local dev) → `npm ci` → run the checker.
   - If the checker exits `0`: `curl -fsS -X POST "$VERCEL_DEPLOY_HOOK_URL"` (secret). If it exits
     non-zero, the job just ends — no deploy.
   - This is the only piece requiring a secret: `VERCEL_DEPLOY_HOOK_URL`, created via the Vercel
     dashboard (manual step, not part of this repo's code — see rollout below).

**On the Vercel side:** add a `vercel-build` script to `package.json`:
`"vercel-build": "node scripts/scrape.ts && vite build"`. Vercel uses `vercel-build` in place of
`build` automatically when present, so every deploy — triggered by the hook above — re-scrapes
live at build time. `src/data/tournament.json` stays committed in git as the local-dev fallback,
but production always bundles data fetched at build time, not whatever's in the last commit.

## Data flow

```text
every 30 min, 12pm-4:59pm UTC:
  GH Action → npm ci → node scripts/checkDeployTrigger.ts
    → fetch en.wikipedia.org/wiki/<title>
    → parse groups + knockout (existing parsers, + new knockout `time` field)
    → any match where now ∈ [kickoff + redeployDelayMinutes, kickoff + redeployDelayMinutes + checkWindowMinutes)?
        yes → exit 0 → curl $VERCEL_DEPLOY_HOOK_URL → Vercel runs `vercel-build` → live site updates
        no  → exit 1 → workflow run ends, no deploy
```

## Error handling

- Wikipedia fetch failure inside the checker → the script exits non-zero (same code path as "no
  match in window") — a transient failure just means this run is a no-op; the next scheduled run
  tries again on its own. No retry logic inside a single run.
- Deploy Hook curl failure → `curl -f` fails the step (and the workflow run) loudly, visible in the
  repo's Actions tab, rather than silently swallowing a broken hook URL.
- Vercel build failure (e.g. Wikipedia fetch fails during `vercel-build`) is Vercel's existing
  build-failure handling — same as any other failed build today; the previous successful
  deployment stays live.

## Testing

- New unit test for the pure window-matching function (`matches, now, redeployDelayMinutes,
  checkWindowMinutes → boolean`), following the existing `node --test` pattern used by
  `scripts/lib/*.test.ts`.
- Extend `scripts/lib/parseKnockout.test.ts` to assert the new `time` field is captured from a
  `.footballbox`'s `.ftime` cell.

## Known limitation (accepted, not engineered around)

No persisted "already fired" state. `checkWindowMinutes` should equal the cron interval so each
match's trigger window is (in the common case) covered by exactly one scheduled run, but GitHub
doesn't guarantee exact cron timing — a delayed run can occasionally cause a match to double-fire
(harmless: one extra deploy) or fall just outside the window (data is stale until the *next*
match's window catches it, typically well under a day later). Acceptable for a hobby project;
adding persisted state (e.g. a committed "last fired" marker) to close this gap isn't worth the
added complexity here.

## Rollout (manual steps, not part of this repo's code)

Once this is implemented and merged, the user performs these one-time steps on the machine where
they manage Vercel:

1. In the Vercel dashboard, connect this GitHub repo to the Vercel project if not already
   connected (Project Settings → Git).
2. Project Settings → Git → Deploy Hooks → create a hook for the `master` branch → copy the URL.
3. In the GitHub repo (Settings → Secrets and variables → Actions), add a new secret
   `VERCEL_DEPLOY_HOOK_URL` with that URL.
4. Confirm the workflow's default `GITHUB_TOKEN` permissions don't need any change — this design
   never pushes to git, so no `contents: write` permission is required.

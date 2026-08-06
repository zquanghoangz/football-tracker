import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Match } from '../../types/tournament.ts';
import { getRecentForm } from './form.ts';

function match(
  date: string,
  homeScore: number | null,
  awayScore: number | null,
  played = homeScore !== null && awayScore !== null,
): Match {
  return {
    date,
    time: '19:00 UTC+7',
    homeTeam: 'Vietnam',
    awayTeam: 'Thailand',
    homeScore,
    awayScore,
    venue: 'Test Stadium',
    played,
  };
}

test('recent form uses the latest five completed matches in chronological order', () => {
  const matches = [
    match('2026-01-01', 1, 0),
    match('2026-01-02', 0, 1),
    match('2026-01-03', 1, 1),
    match('2026-01-04', 2, 0),
    match('2026-01-05', 0, 2),
    match('2026-01-06', 3, 0),
  ];

  assert.deepEqual(getRecentForm('Vietnam', matches), ['loss', 'draw', 'win', 'loss', 'win']);
});

test('future fixtures do not displace completed results from recent form', () => {
  const matches = [
    match('2026-01-01', 2, 0),
    match('2026-01-02', 1, 1),
    match('2026-01-03', null, null, false),
    match('2026-01-04', null, null, false),
  ];

  assert.deepEqual(getRecentForm('Vietnam', matches), [
    'win',
    'draw',
    'not-played',
    'not-played',
    'not-played',
  ]);
});

test('inconsistent played matches without both scores are ignored safely', () => {
  assert.deepEqual(getRecentForm('Vietnam', [match('2026-01-01', 1, null, true)]), [
    'not-played',
    'not-played',
    'not-played',
    'not-played',
    'not-played',
  ]);
});

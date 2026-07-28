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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastGameDate, firstGameDate, isTournamentOver } from './tournamentStatus.ts';
import type { TournamentData, Match } from '../../types/tournament.ts';

function stubMatch(date: string): Match {
  return {
    date,
    time: '19:00 UTC+7',
    homeTeam: 'A',
    awayTeam: 'B',
    homeScore: null,
    awayScore: null,
    venue: 'Test Stadium',
    played: false,
  };
}

function stubData(matchDates: string[], legDates: (string | null)[] = []): TournamentData {
  return {
    tournament: { name: 'Test Cup', sourceUrl: 'https://example.com', scrapedAt: '2026-07-25T00:00:00.000Z' },
    groups: [{ name: 'Group A', standings: [], matches: matchDates.map(stubMatch) }],
    knockout: {
      rounds: legDates.length > 0
        ? [{
            name: 'Final',
            ties: [{
              team1: 'A',
              team2: 'B',
              firstLeg: { date: legDates[0] ?? null, time: null, venue: null, homeScore: null, awayScore: null },
              secondLeg: { date: legDates[1] ?? null, time: null, venue: null, homeScore: null, awayScore: null },
              aggregate: null,
            }],
          }]
        : [],
    },
  };
}

test('lastGameDate returns null when there are no matches at all', () => {
  assert.equal(lastGameDate(stubData([])), null);
});

test('lastGameDate returns the max date across group matches', () => {
  assert.equal(lastGameDate(stubData(['2026-07-24', '2026-07-31', '2026-07-27'])), '2026-07-31');
});

test('lastGameDate considers knockout legs and ignores null (unresolved) ones', () => {
  const data = stubData(['2026-07-24'], [null, '2026-08-10']);
  assert.equal(lastGameDate(data), '2026-08-10');
});

test('firstGameDate returns null when there are no matches at all', () => {
  assert.equal(firstGameDate(stubData([])), null);
});

test('firstGameDate returns the min date across group matches', () => {
  assert.equal(firstGameDate(stubData(['2026-07-27', '2026-07-24', '2026-07-31'])), '2026-07-24');
});

test('firstGameDate considers knockout legs and ignores null (unresolved) ones', () => {
  const data = stubData(['2026-08-10'], [null, '2026-08-05']);
  assert.equal(firstGameDate(data), '2026-08-05');
});

test('isTournamentOver is false when there are no matches', () => {
  assert.equal(isTournamentOver(stubData([]), '2026-07-28'), false);
});

test('isTournamentOver is false on the day of the last match', () => {
  const data = stubData(['2026-07-27']);
  assert.equal(isTournamentOver(data, '2026-07-27'), false);
});

test('isTournamentOver is false the day after the last match (grace period)', () => {
  const data = stubData(['2026-07-27']);
  assert.equal(isTournamentOver(data, '2026-07-28'), false);
});

test('isTournamentOver is true two days after the last match', () => {
  const data = stubData(['2026-07-27']);
  assert.equal(isTournamentOver(data, '2026-07-29'), true);
});

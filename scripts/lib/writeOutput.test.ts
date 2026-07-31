import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateTournamentData, writeTournamentData } from './writeOutput.ts';
import type { TournamentData } from '../../types/tournament.ts';

const VALID_DATA: TournamentData = {
  tournament: { name: 'Test Cup', sourceUrl: 'https://example.com', scrapedAt: '2026-07-25T00:00:00.000Z' },
  groups: [
    {
      name: 'Group A',
      standings: [
        {
          position: 1,
          team: 'Testland',
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 2,
          goalsAgainst: 0,
          goalDifference: 2,
          points: 3,
        },
      ],
      matches: [],
    },
  ],
  knockout: { rounds: [{ name: 'Final', ties: [] }] },
};

test('validateTournamentData throws when there are no groups', () => {
  assert.throws(() => validateTournamentData({ ...VALID_DATA, groups: [] }), /no groups/i);
});

test('validateTournamentData throws when a group has matches but no standings', () => {
  const data = {
    ...VALID_DATA,
    groups: [
      {
        ...VALID_DATA.groups[0],
        standings: [],
        matches: [
          {
            date: '2026-07-25',
            time: '19:00',
            homeTeam: 'Testland',
            awayTeam: 'Otherland',
            homeScore: 1,
            awayScore: 0,
            played: true,
          },
        ],
      },
    ],
  };
  assert.throws(() => validateTournamentData(data), /no standings/i);
});

test('validateTournamentData does not throw when a group has no matches yet (fixtures not drawn)', () => {
  const data = { ...VALID_DATA, groups: [{ ...VALID_DATA.groups[0], standings: [], matches: [] }] };
  assert.doesNotThrow(() => validateTournamentData(data));
});

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

test('writeTournamentData writes valid JSON atomically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tournament-'));
  const outputFile = join(dir, 'tournament.json');
  writeTournamentData(outputFile, VALID_DATA);
  const written = JSON.parse(readFileSync(outputFile, 'utf-8'));
  assert.deepEqual(written, VALID_DATA);
});

test('writeTournamentData does not touch an existing file when validation fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tournament-'));
  const outputFile = join(dir, 'tournament.json');
  writeFileSync(outputFile, '{"existing":true}', 'utf-8');
  assert.throws(() => writeTournamentData(outputFile, { ...VALID_DATA, groups: [] }));
  const stillThere = JSON.parse(readFileSync(outputFile, 'utf-8'));
  assert.deepEqual(stillThere, { existing: true });
});

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

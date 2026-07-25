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

test('shouldTriggerDeploy fires exactly at windowStart (inclusive)', () => {
  const kickoff = new Date('2026-07-24T12:00:00.000Z');
  const now = new Date(kickoff.getTime() + 120 * 60_000); // exactly windowStart
  assert.equal(shouldTriggerDeploy([kickoff], now, 120, 30), true);
});

test('shouldTriggerDeploy does not fire exactly at windowEnd (exclusive)', () => {
  const kickoff = new Date('2026-07-24T12:00:00.000Z');
  const now = new Date(kickoff.getTime() + 150 * 60_000); // exactly windowEnd
  assert.equal(shouldTriggerDeploy([kickoff], now, 120, 30), false);
});

test('collectKickoffs skips a knockout leg with the real-world "--:--" unscheduled-time value', () => {
  const roundsWithUnscheduledTime: KnockoutRound[] = [
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
          secondLeg: {
            date: '2026-08-22',
            time: '--:--',
            venue: null,
            homeScore: null,
            awayScore: null,
          },
        },
      ],
    },
  ];

  const kickoffs = collectKickoffs([], roundsWithUnscheduledTime).map((d) => d.toISOString());
  assert.deepEqual(kickoffs, ['2026-08-15T11:00:00.000Z']);
});

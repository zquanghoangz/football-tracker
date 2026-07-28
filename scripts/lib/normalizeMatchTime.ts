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

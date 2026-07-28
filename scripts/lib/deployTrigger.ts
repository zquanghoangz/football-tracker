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

export function shouldTriggerAnyDeploy(
  entries: { kickoffs: Date[]; redeployDelayMinutes: number; checkWindowMinutes: number }[],
  now: Date,
): boolean {
  return entries.some((entry) =>
    shouldTriggerDeploy(entry.kickoffs, now, entry.redeployDelayMinutes, entry.checkWindowMinutes),
  );
}

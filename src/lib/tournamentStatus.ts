import type { TournamentData } from '../../types/tournament.ts';

function addDays(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

function allGameDates(data: TournamentData): string[] {
  const dates: string[] = [];

  for (const group of data.groups) {
    for (const match of group.matches) {
      dates.push(match.date);
    }
  }

  for (const round of data.knockout.rounds) {
    for (const tie of round.ties) {
      if (tie.firstLeg.date) dates.push(tie.firstLeg.date);
      if (tie.secondLeg.date) dates.push(tie.secondLeg.date);
    }
  }

  return dates;
}

export function lastGameDate(data: TournamentData): string | null {
  const dates = allGameDates(data);
  return dates.length > 0 ? dates.reduce((max, d) => (d > max ? d : max)) : null;
}

export function firstGameDate(data: TournamentData): string | null {
  const dates = allGameDates(data);
  return dates.length > 0 ? dates.reduce((min, d) => (d < min ? d : min)) : null;
}

export function isTournamentOver(data: TournamentData, today: string): boolean {
  const last = lastGameDate(data);
  if (!last) return false;
  return today > addDays(last, 1);
}

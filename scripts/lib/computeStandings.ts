import type { Match, StandingsRow } from '../../types/tournament.ts';

type Accumulated = Omit<StandingsRow, 'position'>;

export function computeStandings(matches: Match[]): StandingsRow[] {
  const rows = new Map<string, Accumulated>();

  const rowFor = (team: string): Accumulated => {
    let row = rows.get(team);
    if (!row) {
      row = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
      rows.set(team, row);
    }
    return row;
  };

  for (const match of matches) {
    rowFor(match.homeTeam);
    rowFor(match.awayTeam);
  }

  for (const match of matches) {
    if (!match.played || match.homeScore === null || match.awayScore === null) continue;

    const home = rowFor(match.homeTeam);
    const away = rowFor(match.awayTeam);

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team);
  });

  return sorted.map((row, i) => ({ ...row, position: i + 1 }));
}

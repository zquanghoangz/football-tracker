import type { Match } from '../../types/tournament';

export type FormResult = 'win' | 'draw' | 'loss' | 'not-played';

const FORM_LENGTH = 5;

export function getRecentForm(team: string, matches: Match[]): FormResult[] {
  const teamMatches = matches
    .filter((match) => match.homeTeam === team || match.awayTeam === team)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-FORM_LENGTH);

  const results = teamMatches.map((match): FormResult => {
    if (!match.played) return 'not-played';
    const isHome = match.homeTeam === team;
    const goalsFor = isHome ? match.homeScore! : match.awayScore!;
    const goalsAgainst = isHome ? match.awayScore! : match.homeScore!;
    if (goalsFor > goalsAgainst) return 'win';
    if (goalsFor < goalsAgainst) return 'loss';
    return 'draw';
  });

  while (results.length < FORM_LENGTH) {
    results.push('not-played');
  }
  return results;
}

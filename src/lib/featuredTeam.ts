import type { Match, TournamentData } from '../../types/tournament';

export interface FeaturedMatch extends Match {
  groupName: string;
}

export function getFeaturedTeamUpcomingMatches(
  data: TournamentData,
  team: string,
): FeaturedMatch[] {
  return data.groups
    .flatMap((group) =>
      group.matches
        .filter((match) => !match.played && (match.homeTeam === team || match.awayTeam === team))
        .map((match) => ({ ...match, groupName: group.name })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

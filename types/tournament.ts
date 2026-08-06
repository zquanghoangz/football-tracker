export interface StandingsRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Match {
  date: string; // ISO date, e.g. "2026-07-24"
  time: string; // e.g. "19:00 UTC+7"
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null; // null if not yet played
  awayScore: number | null;
  venue: string;
  played: boolean;
}

export interface GroupData {
  name: string; // e.g. "Group A" — whatever heading text Wikipedia uses
  standings: StandingsRow[];
  matches: Match[];
}

export interface KnockoutLeg {
  date: string | null;
  time: string | null;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface KnockoutTie {
  team1: string; // may be a placeholder like "Runner-up Group A" until resolved
  team2: string;
  firstLeg: KnockoutLeg;
  secondLeg: KnockoutLeg;
  aggregate: string | null;
}

export interface KnockoutRound {
  name: string; // e.g. "Semi-finals", "Final"
  ties: KnockoutTie[];
}

export interface TournamentData {
  tournament: {
    name: string;
    sourceUrl: string;
    scrapedAt: string;
    fixturesStatus?: 'pending';
    sourceLabel?: string;
    scheduleWindow?: string;
    statusMessage?: string;
    participants?: string[];
  };
  groups: GroupData[];
  knockout: { rounds: KnockoutRound[] };
}

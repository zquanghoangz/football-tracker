import tournamentConfigs from '../config/tournaments.json';

export const MELBOURNE_TIME_ZONE = 'Australia/Melbourne';
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface TournamentUIConfig {
  id: string;
  label: string;
  featuredTeam?: string;
}

export const TOURNAMENTS: TournamentUIConfig[] = tournamentConfigs.map(
  ({ id, label, featuredTeam }) => ({ id, label, featuredTeam }),
);

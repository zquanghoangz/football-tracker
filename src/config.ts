export const FEATURED_TEAM = 'Vietnam';

export const MELBOURNE_TIME_ZONE = 'Australia/Melbourne';
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface TournamentUIConfig {
  id: string;
  label: string;
  featuredTeam?: string;
}

export const TOURNAMENTS: TournamentUIConfig[] = [
  { id: 'asean-2026', label: 'ASEAN 2026', featuredTeam: FEATURED_TEAM },
  { id: 'u17-2026', label: 'U-17 2026', featuredTeam: FEATURED_TEAM },
  { id: 'asian-games-2026', label: 'Asian Games', featuredTeam: FEATURED_TEAM },
  { id: 'fifa-asean-cup-2026', label: 'FIFA ASEAN Cup', featuredTeam: FEATURED_TEAM },
];

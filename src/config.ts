// Change this to re-point the UI's highlighting at a different team —
// no other frontend file needs to change.
export const FEATURED_TEAM = 'Vietnam';

export const MELBOURNE_TIME_ZONE = 'Australia/Melbourne';
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface TournamentUIConfig {
  id: string;
  label: string;
  featuredTeam?: string;
}

// One entry per tournament bundled into the app. `id` must match a key in
// TOURNAMENT_DATA in App.tsx. `featuredTeam` is optional — omit it for a
// tournament with no spotlighted team.
export const TOURNAMENTS: TournamentUIConfig[] = [
  { id: 'asean-2026', label: 'ASEAN Championship 2026', featuredTeam: FEATURED_TEAM },
  { id: 'u17-2026', label: 'FIFA U-17 World Cup 2026' },
];

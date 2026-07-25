// ISO 3166-1 alpha-2 codes, used by flag-icons (`fi fi-<code>`).
// Add an entry here when swapping to a tournament with different teams.
const TEAM_COUNTRY_CODE: Record<string, string> = {
  Vietnam: 'vn',
  Singapore: 'sg',
  Indonesia: 'id',
  Cambodia: 'kh',
  'Timor-Leste': 'tl',
  Thailand: 'th',
  Malaysia: 'my',
  Philippines: 'ph',
  Myanmar: 'mm',
  Laos: 'la',
};

export function countryCodeFor(team: string): string | null {
  return TEAM_COUNTRY_CODE[team] ?? null;
}

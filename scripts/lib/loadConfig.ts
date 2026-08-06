import { readFileSync } from 'node:fs';

export interface TournamentConfig {
  id: string;
  label: string;
  featuredTeam?: string;
  name: string;
  wikipediaTitle: string;
  outputFile: string;
  utcOffset: string;
  fixturesStatus?: 'pending';
  sourceUrl?: string;
  sourceLabel?: string;
  scheduleWindow?: string;
  statusMessage?: string;
  participants?: string[];
}

interface TournamentConfigFileEntry extends Omit<TournamentConfig, 'outputFile'> {}

export function loadConfigs(configPath: string): TournamentConfig[] {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as TournamentConfigFileEntry[];

  if (!Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain an array`);
  }

  const ids = new Set<string>();
  for (const config of parsed) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.id ?? '')) {
      throw new Error(`Every entry in ${configPath} must have a lowercase hyphenated "id"`);
    }
    if (ids.has(config.id)) {
      throw new Error(`${configPath} contains duplicate id "${config.id}"`);
    }
    ids.add(config.id);
    if (!config.label || !config.name || !config.wikipediaTitle) {
      throw new Error(`Every entry in ${configPath} must have a label, name, and wikipediaTitle`);
    }
    if (!config.utcOffset) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "utcOffset"`);
    }
  }

  return parsed.map((config) => ({
    ...config,
    outputFile: `src/data/tournaments/${config.id}.json`,
  }));
}

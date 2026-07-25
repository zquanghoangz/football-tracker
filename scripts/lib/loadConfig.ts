import { readFileSync } from 'node:fs';

export interface TournamentConfig {
  name: string;
  wikipediaTitle: string;
  outputFile: string;
}

export function loadConfig(configPath: string): TournamentConfig {
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as TournamentConfig;
}

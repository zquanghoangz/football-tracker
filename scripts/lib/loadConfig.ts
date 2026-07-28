import { readFileSync } from 'node:fs';

export interface TournamentConfig {
  id: string;
  name: string;
  wikipediaTitle: string;
  outputFile: string;
  utcOffset: string;
  redeployDelayMinutes: number;
  checkWindowMinutes: number;
}

export function loadConfigs(configPath: string): TournamentConfig[] {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as TournamentConfig[];

  for (const config of parsed) {
    if (!config.id) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "id"`);
    }
    if (!config.utcOffset) {
      throw new Error(`Every entry in ${configPath} must have a non-empty "utcOffset"`);
    }
  }

  return parsed;
}

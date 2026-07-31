import { renameSync, writeFileSync } from 'node:fs';
import type { TournamentData } from '../../types/tournament.ts';

export function validateTournamentData(data: TournamentData): void {
  if (data.groups.length === 0) {
    throw new Error(
      'No groups found on the page — check the Wikipedia article structure or wikipediaTitle in config/tournaments.json',
    );
  }
  for (const group of data.groups) {
    // A group with no matches yet (fixtures not drawn/played) legitimately has
    // no standings rows, since standings are derived from matches rather than
    // scraped directly — mirrors how an empty knockout.rounds is also valid.
    if (group.standings.length === 0 && group.matches.length > 0) {
      throw new Error(`Group "${group.name}" has no standings rows — check the page structure`);
    }
  }
}

export function writeTournamentData(outputFile: string, data: TournamentData): void {
  validateTournamentData(data);
  const tmpFile = `${outputFile}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  renameSync(tmpFile, outputFile);
}

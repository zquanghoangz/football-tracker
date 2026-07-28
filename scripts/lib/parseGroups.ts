import * as cheerio from 'cheerio';
import type { GroupData } from '../../types/tournament.ts';
import { parseFootballboxMatch } from './parseMatches.ts';
import { computeStandings } from './computeStandings.ts';

const GROUP_HEADING_PATTERN = /^Group\s+[A-Za-z0-9]+$/i;

export function parseGroups(html: string): GroupData[] {
  const $ = cheerio.load(html);
  const groups: GroupData[] = [];

  $('section').each((_, section) => {
    const heading = $(section).children('div.mw-heading3').children('h3').first();
    const name = heading.text().trim();
    if (!GROUP_HEADING_PATTERN.test(name)) return;

    const matches = $(section)
      .find('.footballbox')
      .map((_, box) => parseFootballboxMatch($, box))
      .get();

    groups.push({ name, standings: computeStandings(matches), matches });
  });

  return groups;
}

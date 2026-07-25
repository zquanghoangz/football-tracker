import * as cheerio from 'cheerio';
import type { GroupData } from '../../types/tournament.ts';
import { parseStandingsTable } from './parseStandings.ts';
import { parseFootballboxMatch } from './parseMatches.ts';

const GROUP_HEADING_PATTERN = /^Group\s+[A-Za-z0-9]+$/i;

export function parseGroups(html: string): GroupData[] {
  const $ = cheerio.load(html);
  const groups: GroupData[] = [];

  $('section').each((_, section) => {
    const heading = $(section).children('div.mw-heading3').children('h3').first();
    const name = heading.text().trim();
    if (!GROUP_HEADING_PATTERN.test(name)) return;

    const table = $(section).find('table.wikitable').first();
    const standings = table.length > 0 ? parseStandingsTable($.html(table)) : [];

    const matches = $(section)
      .find('.footballbox')
      .map((_, box) => parseFootballboxMatch($, box))
      .get();

    groups.push({ name, standings, matches });
  });

  return groups;
}

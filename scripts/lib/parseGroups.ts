import * as cheerio from 'cheerio';
import type { GroupData } from '../../types/tournament.ts';
import { parseFootballboxMatch } from './parseMatches.ts';
import { computeStandings } from './computeStandings.ts';

const GROUP_HEADING_PATTERN = /^Group\s+[A-Za-z0-9]{1,3}$/i;
const GROUP_STAGE_HEADING_PATTERN = /^Group stage$/i;

function ownHeadingText($: cheerio.CheerioAPI, section: unknown): string {
  return $(section as never)
    .children('[class^="mw-heading"]')
    .children('h2, h3, h4, h5, h6')
    .first()
    .text()
    .trim();
}

export function parseGroups(html: string): GroupData[] {
  const $ = cheerio.load(html);
  const groups: GroupData[] = [];

  $('section').each((_, section) => {
    const name = ownHeadingText($, section);
    if (!GROUP_HEADING_PATTERN.test(name)) return;

    // Some tournaments split the group stage into divisions (e.g. "Premier
    // Division" / "Challenge Division"), each with its own "Group A", "Group
    // B", etc. Qualify the name with the division so groups stay unique.
    const parentSection = $(section).parent().closest('section');
    const parentName = parentSection.length ? ownHeadingText($, parentSection[0]) : '';
    const qualifiedName =
      parentName && !GROUP_STAGE_HEADING_PATTERN.test(parentName) ? `${parentName} – ${name}` : name;

    const matches = $(section)
      .find('.footballbox')
      .map((_, box) => parseFootballboxMatch($, box))
      .get();

    groups.push({ name: qualifiedName, standings: computeStandings(matches), matches });
  });

  return groups;
}

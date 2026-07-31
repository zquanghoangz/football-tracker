import * as cheerio from 'cheerio';
import type { KnockoutLeg, KnockoutRound, KnockoutTie } from '../../types/tournament.ts';
import { NBSP_PATTERN } from './parseMatches.ts';

interface TieSummary {
  team1: string;
  team2: string;
  aggregate: string | null;
}

function headerText($: cheerio.CheerioAPI, cell: unknown): string {
  const abbrTitle = $(cell as never).find('abbr').attr('title');
  return (abbrTitle ?? $(cell as never).text()).trim().toLowerCase();
}

function parseTieSummaries($: cheerio.CheerioAPI, table: unknown): TieSummary[] {
  const headerCells = $(table as never).find('tr').first().find('th');
  // Same cheerio .map()-drops-null pitfall as parseStandings.ts — use .toArray() + Array.map().
  const fieldOrder: (keyof TieSummary | null)[] = headerCells.toArray().map((cell) => {
    const name = headerText($, cell);
    if (name === 'team 1') return 'team1';
    if (name === 'team 2') return 'team2';
    if (name === 'aggregate score') return 'aggregate';
    return null;
  });

  const ties: TieSummary[] = [];
  $(table as never)
    .find('tbody > tr')
    .slice(1)
    .each((_, tr) => {
      const cells = $(tr).find('> td');
      const tie: TieSummary = { team1: '', team2: '', aggregate: null };
      cells.each((i, cell) => {
        const field = fieldOrder[i];
        if (!field) return;
        const text = $(cell).text().trim();
        if (field === 'aggregate') {
          tie.aggregate = text || null;
        } else {
          tie[field] = text;
        }
      });
      ties.push(tie);
    });
  return ties;
}

function parseLeg($: cheerio.CheerioAPI, box: unknown): KnockoutLeg {
  const $box = $(box as never);
  const date = $box.find('.fdate .bday').first().text().trim() || null;
  const time = $box.find('.ftime').first().text().replace(NBSP_PATTERN, ' ').trim() || null;
  const scoreText = $box.find('th.fscore').first().text().trim();
  const played = /\d/.test(scoreText);

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (played) {
    const [home, away] = scoreText.split(/[–-]/).map((s) => s.trim());
    homeScore = parseInt(home, 10);
    awayScore = parseInt(away, 10);
  }

  const venue =
    $box
      .find('.fright [itemprop="location"] span[itemprop="name address"] > a')
      .map((_, a) => $(a).text().trim())
      .get()
      .join(', ') || null;

  return { date, time, venue, homeScore, awayScore };
}

const EMPTY_LEG: KnockoutLeg = {
  date: null,
  time: null,
  venue: null,
  homeScore: null,
  awayScore: null,
};

function ownHeadingText($: cheerio.CheerioAPI, section: unknown): string {
  return $(section as never)
    .children('[class^="mw-heading"]')
    .children('h2, h3, h4, h5, h6')
    .first()
    .text()
    .trim();
}

export function parseKnockout(html: string): { rounds: KnockoutRound[] } {
  const $ = cheerio.load(html);
  const knockoutHeading = $('h2')
    .filter((_, el) => $(el).text().trim() === 'Knockout stage')
    .first();
  const knockoutSection = knockoutHeading.closest('section');

  const rounds: KnockoutRound[] = [];

  // Round sections are named things like "Final", "Semi-finals", etc. Some
  // tournaments split the knockout stage into divisions (e.g. "Premier
  // Division" / "Challenge Division") that wrap round sections one level
  // deeper, under a heading that isn't itself a round name — treat those as
  // pass-through containers and descend into their child sections.
  const ROUND_NAME_PATTERN = /^(final|third place(?: play-?off)?|(semi|quarter|round of \d+)[\s-]*finals?)$/i;

  function collectRounds(container: cheerio.Cheerio<any>, divisionName: string) {
    container.children('section').each((_, el) => {
      const $section = $(el as never);
      const name = ownHeadingText($, el);

      if (!ROUND_NAME_PATTERN.test(name)) {
        collectRounds($section, name || divisionName);
        return;
      }

      const summaryTable = $section.find('table.sports-series').first();
      if (summaryTable.length === 0) return;

      const qualifiedRoundName = divisionName ? `${divisionName} – ${name}` : name;

      const tieSummaries = parseTieSummaries($, summaryTable[0]);
      const legs = $section
        .find('.footballbox')
        .map((_, box) => parseLeg($, box))
        .get();

      const ties: KnockoutTie[] = tieSummaries.map((summary, i) => ({
        team1: summary.team1,
        team2: summary.team2,
        aggregate: summary.aggregate,
        firstLeg: legs[i * 2] ?? EMPTY_LEG,
        secondLeg: legs[i * 2 + 1] ?? EMPTY_LEG,
      }));

      rounds.push({ name: qualifiedRoundName, ties });
    });
  }

  collectRounds(knockoutSection, '');

  return { rounds };
}

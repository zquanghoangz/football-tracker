import * as cheerio from 'cheerio';
import type { KnockoutLeg, KnockoutRound, KnockoutTie } from '../../types/tournament.ts';

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

  return { date, venue, homeScore, awayScore };
}

const EMPTY_LEG: KnockoutLeg = { date: null, venue: null, homeScore: null, awayScore: null };

export function parseKnockout(html: string): { rounds: KnockoutRound[] } {
  const $ = cheerio.load(html);
  const knockoutHeading = $('h2')
    .filter((_, el) => $(el).text().trim() === 'Knockout stage')
    .first();
  const knockoutSection = knockoutHeading.closest('section');

  const rounds: KnockoutRound[] = [];

  knockoutSection.children('section').each((_, roundEl) => {
    const $round = $(roundEl);
    const roundName = $round.children('div.mw-heading3').children('h3').first().text().trim();
    if (!roundName) return;

    const summaryTable = $round.find('table.sports-series').first();
    if (summaryTable.length === 0) return;

    const tieSummaries = parseTieSummaries($, summaryTable[0]);
    const legs = $round
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

    rounds.push({ name: roundName, ties });
  });

  return { rounds };
}

import * as cheerio from 'cheerio';
import type { Match } from '../../types/tournament.ts';

// Built from a char code rather than a literal non-breaking-space character so it
// survives copy/paste and editor round-trips without silently becoming a no-op regex.
export const NBSP_PATTERN = new RegExp(String.fromCharCode(0x00a0), 'g');

export function parseFootballboxMatch($: cheerio.CheerioAPI, box: unknown): Match {
  const $box = $(box as never);
  const date = $box.find('.fdate .bday').first().text().trim();
  const time = $box.find('.ftime').first().text().replace(NBSP_PATTERN, ' ').trim();
  const homeTeam = $box.find('th.fhome a').first().text().trim();
  const awayTeam = $box.find('th.faway a').first().text().trim();
  const scoreText = $box.find('th.fscore').first().text().trim();
  const scoreMatch = scoreText.match(/^(\d+)\s*[–-]\s*(\d+)/);
  const played = scoreMatch !== null;

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (scoreMatch) {
    homeScore = Number(scoreMatch[1]);
    awayScore = Number(scoreMatch[2]);
  }

  const venue = $box
    .find('.fright [itemprop="location"] span[itemprop="name address"] > a')
    .map((_, a) => $(a).text().trim())
    .get()
    .join(', ');

  return { date, time, homeTeam, awayTeam, homeScore, awayScore, venue, played };
}

export function parseFootballboxMatches(html: string): Match[] {
  const $ = cheerio.load(html);
  return $('.footballbox')
    .map((_, box) => parseFootballboxMatch($, box))
    .get();
}

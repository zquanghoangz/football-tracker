import * as cheerio from 'cheerio';
import type { StandingsRow } from '../../types/tournament.ts';

type StandingsField = keyof StandingsRow;

const HEADER_FIELD_MAP: Record<string, StandingsField> = {
  position: 'position',
  team: 'team',
  played: 'played',
  won: 'won',
  drawn: 'drawn',
  lost: 'lost',
  'goals for': 'goalsFor',
  'goals against': 'goalsAgainst',
  'goal difference': 'goalDifference',
  points: 'points',
  qualification: 'qualification',
};

const TEXT_FIELDS = new Set<StandingsField>(['team', 'qualification']);

function headerNameFor($: cheerio.CheerioAPI, cell: unknown): string {
  // Wikipedia's "Team" header cell embeds a hidden <style> block plus a "v t e"
  // template-navigation navbar (itself containing an unrelated <abbr title="View
  // this template">) — both must be stripped before reading text/abbr, or the
  // real header name gets lost in that noise and the column mapping breaks.
  const $clean = $(cell as never).clone();
  $clean.find('style, script, .navbar').remove();
  const abbrTitle = $clean.find('abbr').attr('title');
  return (abbrTitle ?? $clean.text()).trim().toLowerCase();
}

export function parseStandingsTable(html: string): StandingsRow[] {
  const $ = cheerio.load(html);
  const table = $('table').first();
  const headerCells = table.find('tr').first().find('th');
  // NOTE: cheerio's .map() drops null/undefined return values (same as jQuery),
  // which would silently shift every later column's index. Use .toArray() +
  // plain Array.map() so an unrecognized header column stays a `null` placeholder.
  const fieldOrder: (StandingsField | null)[] = headerCells
    .toArray()
    .map((cell) => HEADER_FIELD_MAP[headerNameFor($, cell)] ?? null);

  const rows: StandingsRow[] = [];
  let lastQualification = '';

  table
    .find('tbody > tr')
    .slice(1)
    .each((_, tr) => {
      const cells = $(tr).find('> td, > th');
      const row = {} as Record<StandingsField, string | number>;
      cells.each((i, cell) => {
        const field = fieldOrder[i];
        if (!field) return;
        const text = $(cell).text().trim();
        if (TEXT_FIELDS.has(field)) {
          row[field] = text;
        } else {
          const normalized = text.replace(/−/g, '-').replace(/^\+/, '');
          row[field] = parseInt(normalized, 10);
        }
      });
      if (row.qualification !== undefined) {
        lastQualification = row.qualification as string;
      } else {
        row.qualification = lastQualification;
      }
      rows.push(row as unknown as StandingsRow);
    });

  return rows;
}

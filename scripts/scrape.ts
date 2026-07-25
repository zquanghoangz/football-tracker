import { loadConfig } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { writeTournamentData } from './lib/writeOutput.ts';
import type { TournamentData } from '../types/tournament.ts';

async function main() {
  const config = loadConfig('config/tournament.json');
  const sourceUrl = `https://en.wikipedia.org/wiki/${config.wikipediaTitle}`;
  console.log(`Fetching ${sourceUrl} ...`);
  const html = await fetchArticleHtml(config.wikipediaTitle);

  const groups = parseGroups(html);
  const knockout = parseKnockout(html);

  const data: TournamentData = {
    tournament: {
      name: config.name,
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    },
    groups,
    knockout,
  };

  writeTournamentData(config.outputFile, data);
  console.log(
    `Wrote ${config.outputFile}: ${groups.length} groups, ${knockout.rounds.length} knockout rounds`,
  );
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

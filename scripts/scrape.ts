import { loadConfigs } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { normalizeGroupTimes, normalizeKnockoutTimes } from './lib/normalizeMatchTime.ts';
import { writeTournamentData } from './lib/writeOutput.ts';
import type { TournamentData } from '../types/tournament.ts';

async function scrapeOne(config: ReturnType<typeof loadConfigs>[number]): Promise<void> {
  const sourceUrl = config.sourceUrl ?? `https://en.wikipedia.org/wiki/${config.wikipediaTitle}`;

  if (config.fixturesStatus === 'pending') {
    const data: TournamentData = {
      tournament: {
        name: config.name,
        sourceUrl,
        scrapedAt: new Date().toISOString(),
        fixturesStatus: 'pending',
        sourceLabel: config.sourceLabel,
        scheduleWindow: config.scheduleWindow,
        statusMessage: config.statusMessage,
        participants: config.participants,
      },
      groups: [],
      knockout: { rounds: [] },
    };
    writeTournamentData(config.outputFile, data);
    console.log(`Wrote ${config.outputFile}: awaiting official fixtures`);
    return;
  }

  console.log(`Fetching ${sourceUrl} ...`);
  const html = await fetchArticleHtml(config.wikipediaTitle);

  const groups = normalizeGroupTimes(parseGroups(html), config.utcOffset);
  const knockout = { rounds: normalizeKnockoutTimes(parseKnockout(html).rounds, config.utcOffset) };

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

async function main() {
  const configs = loadConfigs('config/tournaments.json');
  const results = await Promise.allSettled(configs.map(scrapeOne));

  const failures = results
    .map((result, i) => ({ result, config: configs[i] }))
    .filter((r): r is { result: PromiseRejectedResult; config: (typeof configs)[number] } => r.result.status === 'rejected');

  for (const failure of failures) {
    console.error(`Failed to scrape "${failure.config.id}": ${(failure.result.reason as Error).message}`);
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

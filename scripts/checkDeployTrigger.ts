import { loadConfigs } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { collectKickoffs, shouldTriggerAnyDeploy } from './lib/deployTrigger.ts';
import { normalizeGroupTimes, normalizeKnockoutTimes } from './lib/normalizeMatchTime.ts';

async function main() {
  const configs = loadConfigs('config/tournaments.json');

  for (const config of configs) {
    if (!Number.isFinite(config.redeployDelayMinutes) || !Number.isFinite(config.checkWindowMinutes)) {
      throw new Error(
        `config/tournaments.json entry "${config.id}" must set numeric redeployDelayMinutes and checkWindowMinutes`,
      );
    }
  }

  const settled = await Promise.allSettled(
    configs.map(async (config) => {
      const html = await fetchArticleHtml(config.wikipediaTitle);
      const groups = normalizeGroupTimes(parseGroups(html), config.utcOffset);
      const { rounds } = parseKnockout(html);
      const normalizedRounds = normalizeKnockoutTimes(rounds, config.utcOffset);
      return {
        kickoffs: collectKickoffs(groups, normalizedRounds),
        redeployDelayMinutes: config.redeployDelayMinutes,
        checkWindowMinutes: config.checkWindowMinutes,
      };
    }),
  );

  const entries: { kickoffs: Date[]; redeployDelayMinutes: number; checkWindowMinutes: number }[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      console.error(`Failed to check "${configs[i].id}": ${(result.reason as Error).message}`);
    }
  });

  const fire = shouldTriggerAnyDeploy(entries, new Date());

  if (fire) {
    console.log('Trigger window matched for at least one tournament — redeploying.');
    process.exit(0);
  }

  console.log('No match in the redeploy trigger window right now, for any tracked tournament.');
  process.exit(1);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

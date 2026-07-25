import { loadConfig } from './lib/loadConfig.ts';
import { fetchArticleHtml } from './lib/fetchArticle.ts';
import { parseGroups } from './lib/parseGroups.ts';
import { parseKnockout } from './lib/parseKnockout.ts';
import { collectKickoffs, shouldTriggerDeploy } from './lib/deployTrigger.ts';

async function main() {
  const config = loadConfig('config/tournament.json');

  if (!Number.isFinite(config.redeployDelayMinutes) || !Number.isFinite(config.checkWindowMinutes)) {
    throw new Error('config/tournament.json must set numeric redeployDelayMinutes and checkWindowMinutes');
  }

  const html = await fetchArticleHtml(config.wikipediaTitle);

  const groups = parseGroups(html);
  const { rounds } = parseKnockout(html);
  const kickoffs = collectKickoffs(groups, rounds);

  const fire = shouldTriggerDeploy(
    kickoffs,
    new Date(),
    config.redeployDelayMinutes,
    config.checkWindowMinutes,
  );

  if (fire) {
    console.log(
      `Trigger window matched — a match kicked off between ${config.redeployDelayMinutes} and ` +
        `${config.redeployDelayMinutes + config.checkWindowMinutes} minutes ago.`,
    );
    process.exit(0);
  }

  console.log('No match in the redeploy trigger window right now.');
  process.exit(1);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

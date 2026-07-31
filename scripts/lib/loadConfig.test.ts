import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigs } from './loadConfig.ts';

function writeConfigFile(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'tournaments-config-'));
  const path = join(dir, 'tournaments.json');
  writeFileSync(path, JSON.stringify(contents), 'utf-8');
  return path;
}

test('loadConfigs parses an array of tournament configs', () => {
  const path = writeConfigFile([
    {
      id: 'asean-2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      utcOffset: '+7',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
    {
      id: 'u17-2026',
      name: 'FIFA U-17 World Cup',
      wikipediaTitle: '2026_FIFA_U-17_World_Cup',
      outputFile: 'src/data/tournaments/u17-2026.json',
      utcOffset: '+3',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  const configs = loadConfigs(path);

  assert.equal(configs.length, 2);
  assert.equal(configs[0].id, 'asean-2026');
  assert.equal(configs[1].id, 'u17-2026');
});

test('loadConfigs throws if a config entry is missing an id', () => {
  const path = writeConfigFile([
    {
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      utcOffset: '+7',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  assert.throws(() => loadConfigs(path), /id/i);
});

test('loadConfigs throws if a config entry is missing a utcOffset', () => {
  const path = writeConfigFile([
    {
      id: 'asean-2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      outputFile: 'src/data/tournaments/asean-2026.json',
      redeployDelayMinutes: 120,
      checkWindowMinutes: 30,
    },
  ]);

  assert.throws(() => loadConfigs(path), /utcOffset/i);
});

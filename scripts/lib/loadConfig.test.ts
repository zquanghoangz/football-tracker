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
      label: 'ASEAN 2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
      utcOffset: '+7',
    },
    {
      id: 'u17-2026',
      label: 'U-17 2026',
      name: 'FIFA U-17 World Cup',
      wikipediaTitle: '2026_FIFA_U-17_World_Cup',
      utcOffset: '+3',
    },
  ]);

  const configs = loadConfigs(path);

  assert.equal(configs.length, 2);
  assert.equal(configs[0].id, 'asean-2026');
  assert.equal(configs[0].outputFile, 'src/data/tournaments/asean-2026.json');
  assert.equal(configs[1].id, 'u17-2026');
});

test('loadConfigs throws if a config entry is missing an id', () => {
  const path = writeConfigFile([
    {
      name: 'ASEAN Championship',
      label: 'ASEAN 2026',
      wikipediaTitle: '2026_ASEAN_Championship',
      utcOffset: '+7',
    },
  ]);

  assert.throws(() => loadConfigs(path), /id/i);
});

test('loadConfigs throws if a config entry is missing a utcOffset', () => {
  const path = writeConfigFile([
    {
      id: 'asean-2026',
      label: 'ASEAN 2026',
      name: 'ASEAN Championship',
      wikipediaTitle: '2026_ASEAN_Championship',
    },
  ]);

  assert.throws(() => loadConfigs(path), /utcOffset/i);
});

test('loadConfigs rejects duplicate ids', () => {
  const entry = {
    id: 'asean-2026',
    label: 'ASEAN 2026',
    name: 'ASEAN Championship',
    wikipediaTitle: '2026_ASEAN_Championship',
    utcOffset: '+7',
  };
  const path = writeConfigFile([entry, entry]);

  assert.throws(() => loadConfigs(path), /duplicate id/i);
});

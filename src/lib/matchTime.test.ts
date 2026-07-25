import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDate, formatInZone } from './matchTime.ts';

test('toDate parses a whole-hour UTC offset', () => {
  const instant = toDate('2026-07-24', '19:00 UTC+7');
  assert.ok(instant);
  assert.equal(formatInZone(instant!, 'UTC'), 'Fri 24 Jul, 12:00');
});

test('toDate parses a half-hour UTC offset (e.g. Myanmar, UTC+6:30)', () => {
  const instant = toDate('2026-07-25', '16:30 UTC+6:30');
  assert.ok(instant);
  assert.equal(formatInZone(instant!, 'UTC'), 'Sat 25 Jul, 10:00');
});

test('toDate parses a negative UTC offset', () => {
  const instant = toDate('2026-07-24', '19:00 UTC-3');
  assert.ok(instant);
  assert.equal(formatInZone(instant!, 'UTC'), 'Fri 24 Jul, 22:00');
});

test('toDate returns null for an unparseable time', () => {
  assert.equal(toDate('2026-07-24', 'TBD'), null);
});

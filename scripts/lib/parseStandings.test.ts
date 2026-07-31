import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStandingsTable } from './parseStandings.ts';

const FIXTURE = `
<table class="wikitable" style="text-align:center;">
<tbody><tr><th scope="col"><abbr title="Position">Pos</abbr></th>
<th scope="col">Team</th>
<th scope="col"><abbr title="Played">Pld</abbr></th>
<th scope="col"><abbr title="Won">W</abbr></th>
<th scope="col"><abbr title="Drawn">D</abbr></th>
<th scope="col"><abbr title="Lost">L</abbr></th>
<th scope="col"><abbr title="Goals for">GF</abbr></th>
<th scope="col"><abbr title="Goals against">GA</abbr></th>
<th scope="col"><abbr title="Goal difference">GD</abbr></th>
<th scope="col"><abbr title="Points">Pts</abbr></th>
<th scope="col">Qualification</th></tr>
<tr>
<td>1</td>
<th scope="row"><span class="flagicon"><span><img alt=""/></span></span><a href="/wiki/Vietnam">Vietnam</a></th>
<td>1</td><td>1</td><td>0</td><td>0</td><td>7</td><td>0</td><td>+7</td><td>3</td>
<td rowspan="2">Advance to <a href="/wiki/x">knockout stage</a></td></tr>
<tr>
<td>2</td>
<th scope="row"><span class="flagicon"><span><img alt=""/></span></span><a href="/wiki/Singapore">Singapore</a></th>
<td>1</td><td>1</td><td>0</td><td>0</td><td>2</td><td>1</td><td>+1</td><td>3</td></tr>
<tr>
<td>4</td>
<th scope="row"><span class="flagicon"><span><img alt=""/></span></span><a href="/wiki/Cambodia">Cambodia</a></th>
<td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>2</td><td>&#8722;1</td><td>0</td>
<td rowspan="2"></td></tr>
</tbody></table>
`;

test('parses a normal row', () => {
  const rows = parseStandingsTable(FIXTURE);
  assert.deepEqual(rows[0], {
    position: 1,
    team: 'Vietnam',
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 7,
    goalsAgainst: 0,
    goalDifference: 7,
    points: 3,
    qualification: 'Advance to knockout stage',
  });
});

test('carries qualification forward across a rowspan', () => {
  const rows = parseStandingsTable(FIXTURE);
  assert.equal(rows[1].team, 'Singapore');
  assert.equal(rows[1].qualification, 'Advance to knockout stage');
});

test('parses a negative goal difference (Unicode minus sign) and empty qualification', () => {
  const rows = parseStandingsTable(FIXTURE);
  assert.equal(rows[2].team, 'Cambodia');
  assert.equal(rows[2].goalDifference, -1);
  assert.equal(rows[2].qualification, '');
});

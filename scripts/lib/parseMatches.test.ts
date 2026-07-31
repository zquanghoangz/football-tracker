import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFootballboxMatches } from './parseMatches.ts';

const FIXTURE = `
<div class="footballbox" style="color:inherit">
<div class="fleft"><time><div class="fdate">24 July 2026<span style="display: none;"> (<span class="bday dtstart published updated itvstart">2026-07-24</span>)</span></div><div class="ftime">19:00&#160;<a href="/wiki/UTC">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr itemprop="name">
<th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="/wiki/Cambodia">Cambodia</a><span class="flagicon nowrap"><span><img alt=""/></span></span></span></th>
<th class="fscore"><a href="/wiki/x">1&#8211;2</a></th>
<th class="faway" itemprop="awayTeam"><span itemprop="name"><span class="flagicon"><span><img alt=""/></span></span><a href="/wiki/Singapore">Singapore</a></span></th>
</tr><tr class="fgoals"><td class="fhgoal"></td><td><a href="https://example.com/r" class="external text">Report</a></td><td class="fagoal"></td></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="/wiki/Morodok">Morodok Techo National Stadium</a>, <a href="/wiki/Phnom_Penh">Phnom Penh</a><sup class="mw-ref reference">[10]</sup></span></div><div>Attendance: 27,790</div><div>Referee: Koji Takasaki (Japan)</div></div>
</div>
<div class="footballbox" style="color:inherit">
<div class="fleft"><time><div class="fdate">27 July 2026<span style="display: none;"> (<span class="bday dtstart published updated itvstart">2026-07-27</span>)</span></div><div class="ftime">19:00&#160;<a href="/wiki/UTC">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr itemprop="name">
<th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="/wiki/Singapore">Singapore</a><span class="flagicon nowrap"><span><img alt=""/></span></span></span></th>
<th class="fscore"><a href="/wiki/x">v</a></th>
<th class="faway" itemprop="awayTeam"><span itemprop="name"><span class="flagicon"><span><img alt=""/></span></span><a href="/wiki/Timor-Leste">Timor-Leste</a></span></th>
</tr><tr class="fgoals"><td class="fhgoal"></td><td><a href="https://example.com/r2" class="external text">Report</a></td><td class="fagoal"></td></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="/wiki/Jalan_Besar">Jalan Besar Stadium</a>, <a href="/wiki/Kallang">Kallang</a><sup class="mw-ref reference">[11]</sup></span></div></div>
</div>
`;

test('parses a played match', () => {
  const matches = parseFootballboxMatches(FIXTURE);
  assert.deepEqual(matches[0], {
    date: '2026-07-24',
    time: '19:00 UTC+7',
    homeTeam: 'Cambodia',
    awayTeam: 'Singapore',
    homeScore: 1,
    awayScore: 2,
    venue: 'Morodok Techo National Stadium, Phnom Penh',
    played: true,
  });
});

test('parses an unplayed match (score cell is "v")', () => {
  const matches = parseFootballboxMatches(FIXTURE);
  assert.deepEqual(matches[1], {
    date: '2026-07-27',
    time: '19:00 UTC+7',
    homeTeam: 'Singapore',
    awayTeam: 'Timor-Leste',
    homeScore: null,
    awayScore: null,
    venue: 'Jalan Besar Stadium, Kallang',
    played: false,
  });
});

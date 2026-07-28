import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGroups } from './parseGroups.ts';

const FIXTURE = `
<div class="mw-parser-output">
<section><div class="mw-heading mw-heading3"><h3 id="Group_A">Group A</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Matchday 1</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">24 July 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-07-24</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Cambodia</a></span></th><th class="fscore"><a href="#">1&#8211;2</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Singapore</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Morodok Techo National Stadium</a>, <a href="#">Phnom Penh</a></span></div></div>
</div>
</section>
</section>
<section><div class="mw-heading mw-heading3"><h3 id="Group_B">Group B</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Matchday 1</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">25 July 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-07-25</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Thailand</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Malaysia</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Rajamangala Stadium</a>, <a href="#">Bangkok</a></span></div></div>
</div>
</section>
</section>
</div>
`;

test('detects every "Group X" section generically, not a fixed count', () => {
  const groups = parseGroups(FIXTURE);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, 'Group A');
  assert.equal(groups[1].name, 'Group B');
});

test('scopes matches to their own group only', () => {
  const groups = parseGroups(FIXTURE);
  assert.equal(groups[0].matches.length, 1);
  assert.equal(groups[0].matches[0].homeTeam, 'Cambodia');

  assert.equal(groups[1].matches[0].homeTeam, 'Thailand');
  assert.equal(groups[1].matches[0].played, false);
});

test('derives standings from the group\'s own matches, not a shared table', () => {
  const groups = parseGroups(FIXTURE);

  // Group A: Cambodia 1-2 Singapore (played) -> Singapore top on points.
  assert.equal(groups[0].standings.length, 2);
  assert.equal(groups[0].standings[0].team, 'Singapore');
  assert.equal(groups[0].standings[0].points, 3);

  // Group B: Thailand vs Malaysia (unplayed) -> both 0 pts, alphabetical tiebreak.
  assert.equal(groups[1].standings.length, 2);
  assert.equal(groups[1].standings[0].team, 'Malaysia');
  assert.equal(groups[1].standings[0].played, 0);
});

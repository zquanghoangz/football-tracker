import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKnockout } from './parseKnockout.ts';

const FIXTURE = `
<div class="mw-parser-output">
<section><div class="mw-heading mw-heading2"><h2 id="Knockout_stage">Knockout stage</h2></div>
<section><div class="mw-heading mw-heading3"><h3 id="Semi-finals">Semi-finals</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Summary</h4></div>
<table class="wikitable sports-series" data-nowrap="n"><tbody>
<tr><th scope="col">Team 1</th><th scope="col"><abbr title="Aggregate score">Agg.</abbr></th><th scope="col">Team 2</th><th scope="col">1st leg</th><th scope="col">2nd leg</th></tr>
<tr><td>Runner-up Group A</td><td></td><td>Winner Group B</td><td><a href="#">15 Aug</a></td><td><a href="#">18 Aug</a></td></tr>
</tbody></table>
</section>
<section><div class="mw-heading mw-heading4"><h4>Matches</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">15 August 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-08-15</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Runner-up Group A</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Winner Group B</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Stadium One</a>, <a href="#">City One</a></span></div></div>
</div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">18 August 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-08-18</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">Winner Group B</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">Runner-up Group A</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Stadium Two</a>, <a href="#">City Two</a></span></div></div>
</div>
</section>
</section>
<section><div class="mw-heading mw-heading3"><h3 id="Final">Final</h3></div>
<section><div class="mw-heading mw-heading4"><h4>Summary</h4></div>
<table class="wikitable sports-series" data-nowrap="n"><tbody>
<tr><th scope="col">Team 1</th><th scope="col"><abbr title="Aggregate score">Agg.</abbr></th><th scope="col">Team 2</th><th scope="col">1st leg</th><th scope="col">2nd leg</th></tr>
<tr><td>SF1 winner</td><td></td><td>SF2 winner</td><td><a href="#">22 Aug</a></td><td><a href="#">26 Aug</a></td></tr>
</tbody></table>
</section>
<section><div class="mw-heading mw-heading4"><h4>Matches</h4></div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">22 August 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-08-22</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">SF1 winner</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">SF2 winner</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Stadium Five</a>, <a href="#">City Five</a></span></div></div>
</div>
<div class="footballbox">
<div class="fleft"><time><div class="fdate">26 August 2026<span style="display:none"> (<span class="bday dtstart published updated itvstart">2026-08-26</span>)</span></div><div class="ftime">19:00 <a href="#">UTC+7</a></div></time></div>
<table class="fevent"><tbody><tr><th class="fhome" itemprop="homeTeam"><span itemprop="name"><a href="#">SF2 winner</a></span></th><th class="fscore"><a href="#">v</a></th><th class="faway" itemprop="awayTeam"><span itemprop="name"><a href="#">SF1 winner</a></span></th></tr></tbody></table>
<div class="fright"><div itemprop="location"><span itemprop="name address"><a href="#">Stadium Six</a>, <a href="#">City Six</a></span></div></div>
</div>
</section>
</section>
</section>
</div>
`;

test('detects both rounds generically by heading + sports-series table', () => {
  const { rounds } = parseKnockout(FIXTURE);
  assert.equal(rounds.length, 2);
  assert.equal(rounds[0].name, 'Semi-finals');
  assert.equal(rounds[1].name, 'Final');
});

test('pairs sequential footballbox legs to the correct tie, with placeholder team names', () => {
  const { rounds } = parseKnockout(FIXTURE);
  const tie = rounds[0].ties[0];
  assert.equal(tie.team1, 'Runner-up Group A');
  assert.equal(tie.team2, 'Winner Group B');
  assert.equal(tie.aggregate, null);
  assert.deepEqual(tie.firstLeg, {
    date: '2026-08-15',
    time: '19:00 UTC+7',
    venue: 'Stadium One, City One',
    homeScore: null,
    awayScore: null,
  });
  assert.deepEqual(tie.secondLeg, {
    date: '2026-08-18',
    time: '19:00 UTC+7',
    venue: 'Stadium Two, City Two',
    homeScore: null,
    awayScore: null,
  });
});

test('the Final round has exactly one tie', () => {
  const { rounds } = parseKnockout(FIXTURE);
  assert.equal(rounds[1].ties.length, 1);
  assert.equal(rounds[1].ties[0].team1, 'SF1 winner');
});

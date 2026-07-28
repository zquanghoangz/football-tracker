import { useState } from 'react';
import aseanData from './data/tournaments/asean-2026.json';
import u17Data from './data/tournaments/u17-2026.json';
import asianGamesData from './data/tournaments/asian-games-2026.json';
import type { TournamentData } from '../types/tournament';
import { GroupTable } from './components/GroupTable';
import { MatchList } from './components/MatchList';
import { KnockoutBracket } from './components/KnockoutBracket';
import { FeaturedTeamSpotlight } from './components/FeaturedTeamSpotlight';
import { FootballLogo } from './components/FootballLogo';
import { TOURNAMENTS, MELBOURNE_TIME_ZONE } from './config';
import { getFeaturedTeamUpcomingMatches } from './lib/featuredTeam';
import { todayInZone } from './lib/matchTime';
import { isTournamentOver, firstGameDate } from './lib/tournamentStatus';

const TOURNAMENT_DATA: Record<string, TournamentData> = {
  'asean-2026': aseanData as TournamentData,
  'u17-2026': u17Data as TournamentData,
  'asian-games-2026': asianGamesData as TournamentData,
};

const TODAY = todayInZone(MELBOURNE_TIME_ZONE);

// Earliest-first; a tournament with no dated matches yet sorts last rather than crashing.
const BY_START_DATE = [...TOURNAMENTS].sort((a, b) => {
  const dateA = firstGameDate(TOURNAMENT_DATA[a.id]) ?? '9999-99-99';
  const dateB = firstGameDate(TOURNAMENT_DATA[b.id]) ?? '9999-99-99';
  return dateA.localeCompare(dateB);
});

const VISIBLE_TOURNAMENTS = BY_START_DATE.filter(
  (t) => !isTournamentOver(TOURNAMENT_DATA[t.id], TODAY),
);
const TAB_TOURNAMENTS = VISIBLE_TOURNAMENTS.length > 0 ? VISIBLE_TOURNAMENTS : BY_START_DATE;

function readTournamentIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('t');
  return id && id in TOURNAMENT_DATA ? id : null;
}

function App() {
  const [selectedId, setSelectedId] = useState(() => {
    const fromUrl = readTournamentIdFromUrl();
    const isVisible = fromUrl && TAB_TOURNAMENTS.some((t) => t.id === fromUrl);
    return isVisible ? fromUrl : TAB_TOURNAMENTS[0].id;
  });

  const uiConfig = TOURNAMENTS.find((t) => t.id === selectedId) ?? TOURNAMENTS[0];
  const tournamentData = TOURNAMENT_DATA[uiConfig.id];
  const featuredTeam = uiConfig.featuredTeam ?? '';
  const upcomingMatches = uiConfig.featuredTeam
    ? getFeaturedTeamUpcomingMatches(tournamentData, uiConfig.featuredTeam)
    : [];

  function selectTournament(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('t', id);
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 pb-12">
      <header className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 pt-8 pb-4 sm:px-8">
        <FootballLogo className="h-10 w-10 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            {tournamentData.tournament.name}
          </h1>
          <p className="text-xs text-slate-500">
            Source:{' '}
            <a
              href={tournamentData.tournament.sourceUrl}
              className="underline hover:text-slate-300"
            >
              Wikipedia
            </a>{' '}
            · scraped {new Date(tournamentData.tournament.scrapedAt).toLocaleString('en-AU')}
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1800px] gap-2 px-4 pb-4 sm:px-8">
        {TAB_TOURNAMENTS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTournament(t.id)}
            className={
              'rounded-full px-4 py-1.5 text-sm font-semibold transition ' +
              (t.id === uiConfig.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 sm:px-8">
        {uiConfig.featuredTeam && (
          <FeaturedTeamSpotlight team={uiConfig.featuredTeam} upcomingMatches={upcomingMatches} />
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {tournamentData.groups.map((group) => (
            <section
              key={group.name}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5"
            >
              <h2 className="mb-3 text-base font-bold text-slate-100">{group.name}</h2>
              <GroupTable
                standings={group.standings}
                matches={group.matches}
                featuredTeam={featuredTeam}
              />
              <MatchList matches={group.matches} featuredTeam={featuredTeam} />
            </section>
          ))}
        </div>

        {tournamentData.knockout.rounds.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-slate-100">Knockout stage</h2>
            <KnockoutBracket rounds={tournamentData.knockout.rounds} featuredTeam={featuredTeam} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

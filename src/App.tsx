import { useState } from 'react';
import type { TournamentData } from '../types/tournament';
import { GroupTable } from './components/GroupTable';
import { MatchList } from './components/MatchList';
import { KnockoutBracket } from './components/KnockoutBracket';
import { FeaturedTeamSpotlight } from './components/FeaturedTeamSpotlight';
import { FootballLogo } from './components/FootballLogo';
import { Flag } from './components/Flag';
import { TOURNAMENTS, MELBOURNE_TIME_ZONE } from './config';
import { getFeaturedTeamUpcomingMatches } from './lib/featuredTeam';
import { todayInZone } from './lib/matchTime';
import { isGroupComplete, isTournamentOver, firstGameDate } from './lib/tournamentStatus';

const tournamentModules = import.meta.glob<{ default: TournamentData }>(
  './data/tournaments/*.json',
  { eager: true },
);

const TOURNAMENT_DATA = Object.fromEntries(
  Object.entries(tournamentModules).map(([path, module]) => [
    path.slice(path.lastIndexOf('/') + 1, -'.json'.length),
    module.default,
  ]),
);

for (const tournament of TOURNAMENTS) {
  if (!TOURNAMENT_DATA[tournament.id]) {
    throw new Error(`Missing generated data for tournament "${tournament.id}"`);
  }
}

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
              {tournamentData.tournament.sourceLabel ?? 'Wikipedia'}
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
        {tournamentData.tournament.fixturesStatus === 'pending' && (
          <section className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-400">Upcoming tournament</p>
            <h2 className="mt-1 text-lg font-bold text-slate-100">
              Fixtures not yet published
            </h2>
            {tournamentData.tournament.scheduleWindow && (
              <p className="mt-2 text-sm font-semibold text-slate-300">
                Planned window: {tournamentData.tournament.scheduleWindow}
              </p>
            )}
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {tournamentData.tournament.statusMessage}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Standings and the game timeline will populate after an official fixture source is published.
            </p>
            {tournamentData.tournament.participants && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-200">
                  Confirmed entrants ({tournamentData.tournament.participants.length})
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tournamentData.tournament.participants.map((team) => (
                    <div
                      key={team}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
                    >
                      <Flag team={team} />
                      <span>{team}</span>
                      {team === featuredTeam && <span className="text-amber-400">★</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-amber-800/40 pt-4">
              <h3 className="text-sm font-bold text-slate-200">Game timeline</h3>
              <div className="mt-3 rounded-lg border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
                Draw and match schedule awaiting official publication.
              </div>
            </div>
          </section>
        )}

        {uiConfig.featuredTeam && tournamentData.tournament.fixturesStatus !== 'pending' && (
          <FeaturedTeamSpotlight team={uiConfig.featuredTeam} upcomingMatches={upcomingMatches} />
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          {tournamentData.groups.map((group) => {
            const groupComplete = isGroupComplete(group);

            return (
              <details
                key={`${uiConfig.id}-${group.name}`}
                open={!groupComplete}
                className="group min-w-0 self-start rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-bold text-slate-100 marker:content-none sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    {group.name}
                    {groupComplete && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-400">
                        DONE
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-lg text-slate-500 transition-transform group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <GroupTable
                    standings={group.standings}
                    matches={group.matches}
                    featuredTeam={featuredTeam}
                  />
                  <MatchList matches={group.matches} featuredTeam={featuredTeam} />
                </div>
              </details>
            );
          })}
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

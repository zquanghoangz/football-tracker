import data from './data/tournament.json';
import type { TournamentData } from '../types/tournament';
import { GroupTable } from './components/GroupTable';
import { MatchList } from './components/MatchList';
import { KnockoutBracket } from './components/KnockoutBracket';
import { FeaturedTeamSpotlight } from './components/FeaturedTeamSpotlight';
import { FootballLogo } from './components/FootballLogo';
import { FEATURED_TEAM } from './config';
import { getFeaturedTeamUpcomingMatches } from './lib/featuredTeam';

const tournamentData = data as TournamentData;

function App() {
  const upcomingMatches = getFeaturedTeamUpcomingMatches(tournamentData, FEATURED_TEAM);

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
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

      <main className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 sm:px-8">
        <FeaturedTeamSpotlight team={FEATURED_TEAM} upcomingMatches={upcomingMatches} />

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
                featuredTeam={FEATURED_TEAM}
              />
              <MatchList matches={group.matches} featuredTeam={FEATURED_TEAM} />
            </section>
          ))}
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-bold text-slate-100">Knockout stage</h2>
          <KnockoutBracket rounds={tournamentData.knockout.rounds} featuredTeam={FEATURED_TEAM} />
        </section>
      </main>
    </div>
  );
}

export default App;

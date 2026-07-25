import type { FeaturedMatch } from '../lib/featuredTeam';
import { MELBOURNE_TIME_ZONE, VIETNAM_TIME_ZONE } from '../config';
import { formatInZone, toDate } from '../lib/matchTime';
import { Flag } from './Flag';

export function FeaturedTeamSpotlight({
  team,
  upcomingMatches,
}: {
  team: string;
  upcomingMatches: FeaturedMatch[];
}) {
  return (
    <section className="rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-300">
        <span aria-hidden="true">★</span> <Flag team={team} /> {team} — upcoming games
      </h2>

      {upcomingMatches.length === 0 ? (
        <p className="mt-2 text-sm text-emerald-200">No upcoming group-stage games scheduled.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingMatches.map((match, i) => {
            const opponent = match.homeTeam === team ? match.awayTeam : match.homeTeam;
            const venueLabel = match.homeTeam === team ? 'Home' : 'Away';
            const instant = toDate(match.date, match.time);

            return (
              <li
                key={i}
                className="rounded-lg border border-emerald-500/30 bg-slate-900 px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                    <Flag team={opponent} /> vs {opponent}
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    {venueLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {match.groupName} · {match.venue}
                </div>
                {instant ? (
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {formatInZone(instant, MELBOURNE_TIME_ZONE)}
                    </span>
                    <span className="text-[10px] uppercase text-slate-500">Melb</span>
                    <span className="text-xs font-normal text-slate-500">
                      {formatInZone(instant, VIETNAM_TIME_ZONE)}
                    </span>
                    <span className="text-[9px] uppercase text-slate-600">VN</span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-slate-500">{match.date}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

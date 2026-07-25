import type { Match } from '../../types/tournament';
import { MELBOURNE_TIME_ZONE, VIETNAM_TIME_ZONE } from '../config';
import { formatInZone, toDate, todayInZone } from '../lib/matchTime';
import { Flag } from './Flag';

function KickoffTimes({ date, time }: { date: string; time: string }) {
  const instant = toDate(date, time);
  if (!instant) {
    return <span className="text-xs text-slate-500">{date}</span>;
  }

  return (
    <div className="leading-tight">
      <div className="text-sm font-semibold text-slate-100">
        {formatInZone(instant, MELBOURNE_TIME_ZONE)}
        <span className="ml-1 text-[10px] font-normal uppercase text-slate-500">Melb</span>
      </div>
      <div className="text-xs font-normal text-slate-500">
        {formatInZone(instant, VIETNAM_TIME_ZONE)}
        <span className="ml-1 text-[9px] uppercase text-slate-600">VN</span>
      </div>
    </div>
  );
}

export function MatchList({
  matches,
  featuredTeam,
}: {
  matches: Match[];
  featuredTeam: string;
}) {
  const today = todayInZone(MELBOURNE_TIME_ZONE);

  return (
    <ul className="mt-3 space-y-1.5">
      {matches.map((match, i) => {
        const isFeatured = match.homeTeam === featuredTeam || match.awayTeam === featuredTeam;
        const isToday = match.date === today;
        return (
          <li
            key={i}
            className={
              'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm ' +
              (isFeatured ? 'border-emerald-500/60 bg-emerald-500/10 ' : 'border-slate-800 bg-slate-900 ') +
              (isToday ? 'ring-2 ring-amber-400/70' : '')
            }
          >
            {isToday && (
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">
                Today
              </span>
            )}
            <KickoffTimes date={match.date} time={match.time} />
            <div className="flex flex-1 items-center justify-center gap-2 font-medium text-slate-200">
              <span
                className={
                  'flex items-center gap-1.5 ' +
                  (match.homeTeam === featuredTeam ? 'font-bold text-emerald-300' : '')
                }
              >
                <Flag team={match.homeTeam} />
                {match.homeTeam}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-200">
                {match.played ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
              </span>
              <span
                className={
                  'flex items-center gap-1.5 ' +
                  (match.awayTeam === featuredTeam ? 'font-bold text-emerald-300' : '')
                }
              >
                <Flag team={match.awayTeam} />
                {match.awayTeam}
              </span>
            </div>
            <div className="text-xs text-slate-500">{match.venue}</div>
          </li>
        );
      })}
    </ul>
  );
}

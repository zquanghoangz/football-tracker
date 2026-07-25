import type { Match, StandingsRow } from '../../types/tournament';
import { Flag } from './Flag';
import { FormBadges } from './FormBadges';
import { getRecentForm } from '../lib/form';

export function GroupTable({
  standings,
  matches,
  featuredTeam,
}: {
  standings: StandingsRow[];
  matches: Match[];
  featuredTeam: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Club</th>
            <th className="px-2 py-2">MP</th>
            <th className="px-2 py-2">W</th>
            <th className="px-2 py-2">D</th>
            <th className="px-2 py-2">L</th>
            <th className="hidden px-2 py-2 sm:table-cell">GF</th>
            <th className="hidden px-2 py-2 sm:table-cell">GA</th>
            <th className="px-2 py-2">GD</th>
            <th className="px-2 py-2 font-bold text-slate-200">Pts</th>
            <th className="hidden px-3 py-2 sm:table-cell">Last 5</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {standings.map((row) => {
            const isFeatured = row.team === featuredTeam;
            return (
              <tr
                key={row.team}
                className={
                  isFeatured
                    ? 'bg-emerald-500/10 font-semibold text-emerald-300'
                    : 'odd:bg-slate-900 even:bg-slate-900/40 text-slate-200'
                }
              >
                <td className="px-3 py-2 text-left tabular-nums">{row.position}</td>
                <td className="px-3 py-2 text-left">
                  <span className="flex items-center gap-2">
                    <Flag team={row.team} />
                    {isFeatured && <span aria-hidden="true">★</span>}
                    {row.team}
                  </span>
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{row.played}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.won}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.drawn}</td>
                <td className="px-2 py-2 text-center tabular-nums">{row.lost}</td>
                <td className="hidden px-2 py-2 text-center tabular-nums sm:table-cell">
                  {row.goalsFor}
                </td>
                <td className="hidden px-2 py-2 text-center tabular-nums sm:table-cell">
                  {row.goalsAgainst}
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{row.goalDifference}</td>
                <td className="px-2 py-2 text-center tabular-nums font-bold">{row.points}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <FormBadges form={getRecentForm(row.team, matches)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

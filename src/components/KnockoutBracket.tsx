import type { KnockoutRound, KnockoutTie } from '../../types/tournament';
import { Flag } from './Flag';

function LegSummary({ leg, label }: { leg: KnockoutTie['firstLeg']; label: string }) {
  const played = leg.homeScore !== null && leg.awayScore !== null;
  return (
    <div className="text-xs text-slate-500">
      <span className="font-semibold text-slate-400">{label}:</span> {leg.date ?? 'TBD'}
      {leg.venue ? ` · ${leg.venue}` : ''} —{' '}
      <span className="font-medium text-slate-300">
        {played ? `${leg.homeScore}–${leg.awayScore}` : 'TBD'}
      </span>
    </div>
  );
}

export function KnockoutBracket({
  rounds,
  featuredTeam,
}: {
  rounds: KnockoutRound[];
  featuredTeam: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rounds.map((round) => (
        <section key={round.name} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            {round.name}
          </h3>
          <div className="space-y-3">
            {round.ties.map((tie, i) => {
              const isFeatured = tie.team1 === featuredTeam || tie.team2 === featuredTeam;
              return (
                <div
                  key={i}
                  className={
                    'rounded-md border px-3 py-2 ' +
                    (isFeatured ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800')
                  }
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm font-semibold text-slate-200">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Flag team={tie.team1} /> {tie.team1}{' '}
                      <span className="text-slate-500">vs</span> <Flag team={tie.team2} />{' '}
                      {tie.team2}
                    </span>
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                      Agg. {tie.aggregate ?? 'TBD'}
                    </span>
                  </div>
                  <LegSummary leg={tie.firstLeg} label="1st leg" />
                  <LegSummary leg={tie.secondLeg} label="2nd leg" />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

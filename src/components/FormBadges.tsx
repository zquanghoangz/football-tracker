import type { FormResult } from '../lib/form';

const STYLES: Record<FormResult, string> = {
  win: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
  loss: 'bg-red-500/20 text-red-400 border-red-500',
  draw: 'bg-amber-500/20 text-amber-400 border-amber-500',
  'not-played': 'border-slate-600 text-transparent',
};

const LABELS: Record<FormResult, string> = {
  win: '✓',
  loss: '✕',
  draw: 'D',
  'not-played': '',
};

export function FormBadges({ form }: { form: FormResult[] }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {form.map((result, i) => (
        <span
          key={i}
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[8px] font-bold leading-none ${STYLES[result]}`}
        >
          {LABELS[result]}
        </span>
      ))}
    </div>
  );
}

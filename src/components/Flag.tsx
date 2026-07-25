import vn from 'flag-icons/flags/4x3/vn.svg';
import sg from 'flag-icons/flags/4x3/sg.svg';
import id from 'flag-icons/flags/4x3/id.svg';
import kh from 'flag-icons/flags/4x3/kh.svg';
import tl from 'flag-icons/flags/4x3/tl.svg';
import th from 'flag-icons/flags/4x3/th.svg';
import my from 'flag-icons/flags/4x3/my.svg';
import ph from 'flag-icons/flags/4x3/ph.svg';
import mm from 'flag-icons/flags/4x3/mm.svg';
import la from 'flag-icons/flags/4x3/la.svg';
import { countryCodeFor } from '../lib/teamCountry';

// Importing individual SVGs (rather than the flag-icons CSS sprite, which
// references every country) keeps the bundle to only the flags we use.
const FLAG_URL: Record<string, string> = { vn, sg, id, kh, tl, th, my, ph, mm, la };

export function Flag({ team }: { team: string }) {
  const code = countryCodeFor(team);
  const url = code ? FLAG_URL[code] : undefined;
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="inline-block h-3.5 w-5 rounded-[2px] object-cover align-middle"
    />
  );
}

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
import ar from 'flag-icons/flags/4x3/ar.svg';
import au from 'flag-icons/flags/4x3/au.svg';
import be from 'flag-icons/flags/4x3/be.svg';
import bh from 'flag-icons/flags/4x3/bh.svg';
import bn from 'flag-icons/flags/4x3/bn.svg';
import br from 'flag-icons/flags/4x3/br.svg';
import ci from 'flag-icons/flags/4x3/ci.svg';
import cl from 'flag-icons/flags/4x3/cl.svg';
import cm from 'flag-icons/flags/4x3/cm.svg';
import cn from 'flag-icons/flags/4x3/cn.svg';
import co from 'flag-icons/flags/4x3/co.svg';
import cr from 'flag-icons/flags/4x3/cr.svg';
import cu from 'flag-icons/flags/4x3/cu.svg';
import dk from 'flag-icons/flags/4x3/dk.svg';
import dz from 'flag-icons/flags/4x3/dz.svg';
import ec from 'flag-icons/flags/4x3/ec.svg';
import eg from 'flag-icons/flags/4x3/eg.svg';
import es from 'flag-icons/flags/4x3/es.svg';
import fj from 'flag-icons/flags/4x3/fj.svg';
import fr from 'flag-icons/flags/4x3/fr.svg';
import gr from 'flag-icons/flags/4x3/gr.svg';
import hk from 'flag-icons/flags/4x3/hk.svg';
import _in from 'flag-icons/flags/4x3/in.svg';
import hn from 'flag-icons/flags/4x3/hn.svg';
import hr from 'flag-icons/flags/4x3/hr.svg';
import ht from 'flag-icons/flags/4x3/ht.svg';
import ie from 'flag-icons/flags/4x3/ie.svg';
import ir from 'flag-icons/flags/4x3/ir.svg';
import iq from 'flag-icons/flags/4x3/iq.svg';
import it from 'flag-icons/flags/4x3/it.svg';
import jm from 'flag-icons/flags/4x3/jm.svg';
import jp from 'flag-icons/flags/4x3/jp.svg';
import jo from 'flag-icons/flags/4x3/jo.svg';
import kg from 'flag-icons/flags/4x3/kg.svg';
import kp from 'flag-icons/flags/4x3/kp.svg';
import kr from 'flag-icons/flags/4x3/kr.svg';
import kw from 'flag-icons/flags/4x3/kw.svg';
import ma from 'flag-icons/flags/4x3/ma.svg';
import me from 'flag-icons/flags/4x3/me.svg';
import ml from 'flag-icons/flags/4x3/ml.svg';
import mx from 'flag-icons/flags/4x3/mx.svg';
import mz from 'flag-icons/flags/4x3/mz.svg';
import nc from 'flag-icons/flags/4x3/nc.svg';
import nz from 'flag-icons/flags/4x3/nz.svg';
import om from 'flag-icons/flags/4x3/om.svg';
import pa from 'flag-icons/flags/4x3/pa.svg';
import pk from 'flag-icons/flags/4x3/pk.svg';
import ps from 'flag-icons/flags/4x3/ps.svg';
import qa from 'flag-icons/flags/4x3/qa.svg';
import ro from 'flag-icons/flags/4x3/ro.svg';
import rs from 'flag-icons/flags/4x3/rs.svg';
import sa from 'flag-icons/flags/4x3/sa.svg';
import sn from 'flag-icons/flags/4x3/sn.svg';
import sy from 'flag-icons/flags/4x3/sy.svg';
import tj from 'flag-icons/flags/4x3/tj.svg';
import tz from 'flag-icons/flags/4x3/tz.svg';
import ae from 'flag-icons/flags/4x3/ae.svg';
import ug from 'flag-icons/flags/4x3/ug.svg';
import us from 'flag-icons/flags/4x3/us.svg';
import uy from 'flag-icons/flags/4x3/uy.svg';
import uz from 'flag-icons/flags/4x3/uz.svg';
import ve from 'flag-icons/flags/4x3/ve.svg';
import ye from 'flag-icons/flags/4x3/ye.svg';
import { countryCodeFor } from '../lib/teamCountry';

// Importing individual SVGs (rather than the flag-icons CSS sprite, which
// references every country) keeps the bundle to only the flags we use.
const FLAG_URL: Record<string, string> = {
  vn, sg, id, kh, tl, th, my, ph, mm, la,
  ar, au, be, bh, bn, br, ci, cl, cm, cn, co, cr, cu, dk, dz, ec, eg, es, fj, fr, gr,
  hk, hn, hr, ht, ie, in: _in, ir, iq, it, jm, jo, jp, kg, kp, kr, kw, ma, me, ml, mx, mz, nc, nz, om, pa, pk, ps, qa, ro, rs,
  sa, sn, sy, tj, tz, ae, ug, us, uy, uz, ve, ye,
};

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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Global, cross-property asset register. Returns every asset (regardless of which
// property it currently sits on), each with its full movement trail, current
// property, and resolved authoriser/property names. Used by the home-page
// Asset Register view behind the `view_asset_register` capability.
//
// "How long here" is derived: today − the most recent movement's moved_date
// (or null if the asset has never moved).
export function useAssetRegister(enabled = true) {
  const [assets, setAssets] = useState([]);
  const [propsById, setPropsById] = useState({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);

    // Properties (for resolving from/to/current names + icons)
    const { data: props } = await supabase
      .from('properties')
      .select('id, name, icon, type');
    const pmap = {};
    (props || []).forEach(p => { pmap[p.id] = p; });
    setPropsById(pmap);

    // All assets with movement trail
    const { data } = await supabase
      .from('assets')
      .select(`*, asset_movements(*)`)
      .order('name');

    // Resolve authoriser names client-side (robust against FK-name differences).
    const ids = [...new Set((data || []).flatMap(a => (a.asset_movements||[]).map(m => m.authorised_by)).filter(Boolean))];
    let nameById = {};
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      (profs || []).forEach(p => { nameById[p.id] = p.full_name; });
    }

    // Sort each asset's movements newest-first and compute "here since".
    const enriched = (data || []).map(a => {
      const movements = [...(a.asset_movements || [])]
        .map(m => ({ ...m, authoriser: { full_name: nameById[m.authorised_by] || null } }))
        .sort((x, y) => new Date(y.moved_date) - new Date(x.moved_date));
      const lastMove = movements[0] || null;
      const hereSince = lastMove ? lastMove.moved_date : (a.created_at ? a.created_at.split('T')[0] : null);
      let daysHere = null;
      if (hereSince) {
        const diff = Date.now() - new Date(hereSince).getTime();
        daysHere = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      }
      return { ...a, _movements: movements, _lastMove: lastMove, _hereSince: hereSince, _daysHere: daysHere };
    });

    setAssets(enriched);
    setLoading(false);
  }, [enabled]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assets, propsById, loading, refresh: fetch };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Returns per-property counts of:
//   overdue services  — next_due is in the past (before today)
//   pending materials — status is 'needed' or 'ordered'
//
// Shape: { stats: { [propertyId]: { overdue, pending } }, totals: { overdue, pending }, loading, refresh }
//
// Counting is done client-side over two flat queries (materials carry a direct
// property_id; services carry next_due). At a handful of properties this is
// negligible; if data ever grows, swap the internals for a Supabase RPC and the
// returned shape can stay identical.
export function useDashboardStats(propertyIds) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Stable primitive dependency so the effect doesn't re-run on every render
  // just because a new array identity was passed in.
  const idsKey = (propertyIds || []).join(',');

  const fetchStats = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) { setStats({}); setLoading(false); return; }

    setLoading(true);

    // Today's date as YYYY-MM-DD, matching how next_due is stored.
    const today = new Date().toISOString().split('T')[0];

    const [svcRes, matRes] = await Promise.all([
      supabase
        .from('services')
        .select('property_id, next_due')
        .in('property_id', ids)
        .not('next_due', 'is', null)
        .lt('next_due', today),
      supabase
        .from('materials')
        .select('property_id, status')
        .in('property_id', ids)
        .in('status', ['needed', 'ordered']),
    ]);

    const next = {};
    ids.forEach(id => { next[id] = { overdue: 0, pending: 0 }; });

    (svcRes.data || []).forEach(row => {
      if (next[row.property_id]) next[row.property_id].overdue += 1;
    });
    (matRes.data || []).forEach(row => {
      if (next[row.property_id]) next[row.property_id].pending += 1;
    });

    setStats(next);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totals = Object.values(stats).reduce(
    (acc, s) => ({ overdue: acc.overdue + s.overdue, pending: acc.pending + s.pending }),
    { overdue: 0, pending: 0 }
  );

  return { stats, totals, loading, refresh: fetchStats };
}

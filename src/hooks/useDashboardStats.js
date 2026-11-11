import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/format';

// Per-property counts for the home page:
//   overdue     — services whose next_due is before today
//   toBuy       — materials that are Needed or Ordered (same rule as the property page)
//   unscheduled — services never logged and with no due date (they can't fall due)
// Shape: { stats: { [propertyId]: { overdue, toBuy, unscheduled } }, totals, lists, loading, refresh }
//   lists: { overdue: [service], toBuy: [material], unscheduled: [service] } across all properties
export function useDashboardStats(propertyIds) {
  const [stats, setStats] = useState({});
  const [lists, setLists] = useState({ overdue: [], toBuy: [], unscheduled: [] });
  const [loading, setLoading] = useState(true);
  const idsKey = (propertyIds || []).join(',');

  const fetchStats = useCallback(async (quiet = false) => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!ids.length) { setStats({}); setLoading(false); return; }
    if (!quiet) setLoading(true);
    const [svcRes, matRes, storeRes] = await Promise.all([
      supabase.from('services').select('id, name, property_id, next_due, last_done, freq_months, is_recurring').in('property_id', ids),
      supabase.from('materials').select('id, name, qty, unit, property_id, status').in('property_id', ids).in('status', ['needed', 'ordered']),
      // Store items below their minimum also count as "to buy" (table from the farm-features SQL; ignored if missing).
      supabase.from('store_items').select('id, name, qty, unit, min_qty, property_id').in('property_id', ids).not('min_qty', 'is', null),
    ]);
    const today = todayISO();
    const next = Object.fromEntries(ids.map(id => [id, { overdue: 0, toBuy: 0, unscheduled: 0 }]));
    const L = { overdue: [], toBuy: [], unscheduled: [] };
    (svcRes.data || []).forEach(s => {
      const row = next[s.property_id]; if (!row) return;
      if (s.next_due && s.next_due < today) { row.overdue += 1; L.overdue.push(s); }
      else if (!s.next_due && !s.last_done) { row.unscheduled += 1; L.unscheduled.push(s); }
    });
    (matRes.data || []).forEach(m => { if (next[m.property_id]) { next[m.property_id].toBuy += 1; L.toBuy.push(m); } });
    (storeRes.error ? [] : storeRes.data || []).filter(i => Number(i.qty) < Number(i.min_qty)).forEach(i => {
      if (next[i.property_id]) { next[i.property_id].toBuy += 1; L.toBuy.push({ ...i, store: true }); }
    });
    L.overdue.sort((a, b) => (a.next_due < b.next_due ? -1 : 1));
    L.unscheduled.sort((a, b) => a.name.localeCompare(b.name));
    const rank = i => (i.store ? 2 : i.status === 'needed' ? 0 : 1);
    L.toBuy.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    setStats(next);
    setLists(L);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totals = Object.values(stats).reduce(
    (a, s) => ({ overdue: a.overdue + s.overdue, toBuy: a.toBuy + s.toBuy, unscheduled: a.unscheduled + s.unscheduled }),
    { overdue: 0, toBuy: 0, unscheduled: 0 }
  );
  return { stats, totals, lists, loading, refresh: () => fetchStats(true) };
}

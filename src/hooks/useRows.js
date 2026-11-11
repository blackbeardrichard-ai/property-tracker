import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

// Rows of one simple table for one property, with add / update / remove.
// Used by the farm features (diesel, rounds, store, incidents, rain…).
// `missing` is true when the table isn't in the database yet (SQL not run).
export function useRows(table, propertyId, { select = '*', order = [['created_at', false]], audit = null } = {}) {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const orderKey = JSON.stringify(order);

  const fetchRows = useCallback(async (quiet = false) => {
    if (!propertyId) return;
    if (!quiet) setLoading(true);
    let q = supabase.from(table).select(select).eq('property_id', propertyId);
    JSON.parse(orderKey).forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
    const { data, error } = await q;
    setMissing(!!error && /relation|does not exist|schema cache|Could not find/i.test(error.message || ''));
    setRows(data || []);
    setLoading(false);
  }, [table, propertyId, select, orderKey]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const note = (action, id, name, newValue) => audit && logAction({ propertyId, userId: user.id, userName: profile?.full_name, action, entityType: audit, entityId: id, entityName: name, newValue });

  const add = async (row, name) => {
    const { data, error } = await supabase.from(table).insert({ property_id: propertyId, ...row }).select().single();
    if (error) return { error };
    note('created', data.id, name, null);
    fetchRows(true);
    return { data };
  };
  const update = async (id, patch, name) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from(table).update(patch).eq('id', id);
    if (error) { fetchRows(true); return { error }; }
    note('updated', id, name, patch);
    return {};
  };
  const remove = async (id, name) => {
    setRows(rs => rs.filter(r => r.id !== id));
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { fetchRows(true); return { error }; }
    note('deleted', id, name, null);
    return {};
  };
  return { rows, loading, missing, add, update, remove, refresh: () => fetchRows(true) };
}


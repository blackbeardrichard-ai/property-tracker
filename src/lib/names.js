import { supabase } from './supabase';

// Resolves user ids to display names, cached for the session.
// Resolved client-side on purpose: embedded joins depend on foreign-key names
// and previously broke the task query.
const cache = new Map();

export async function fetchNames(ids) {
  const want = [...new Set((ids || []).filter(Boolean))].filter(id => !cache.has(id));
  if (want.length) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', want);
    (data || []).forEach(p => cache.set(p.id, p.full_name || ''));
    want.forEach(id => { if (!cache.has(id)) cache.set(id, ''); }); // unreadable under RLS: remember as blank
  }
  const out = {};
  (ids || []).forEach(id => { if (id) out[id] = cache.get(id) || ''; });
  return out;
}

export const rememberName = (id, name) => { if (id && name) cache.set(id, name); };
export const cachedName = id => (id ? cache.get(id) || '' : '');

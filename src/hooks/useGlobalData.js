import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Fetches data across the properties the current user can access (admins: all;
// others: only assigned). Shared by global search, the global shopping list,
// and data export. Pass the entity types you need to avoid over-fetching.
//
// types: array subset of ['tasks','materials','services','assets','livestock']
export function useGlobalData(types = ['tasks','materials','services','assets','livestock']) {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState({ properties: [], tasks: [], materials: [], services: [], assets: [], livestock: [] });
  const [loading, setLoading] = useState(true);

  const typesKey = [...types].sort().join(',');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Resolve accessible property IDs
    let propIds = [];
    const { data: props } = await supabase.from('properties').select('*').eq('status','active').order('name');
    let accessible = props || [];
    if (!isAdmin) {
      const { data: access } = await supabase.from('property_users').select('property_id').eq('user_id', user.id);
      const ids = new Set((access || []).map(a => a.property_id));
      accessible = accessible.filter(p => ids.has(p.id));
    }
    propIds = accessible.map(p => p.id);

    const out = { properties: accessible, tasks: [], materials: [], services: [], assets: [], livestock: [] };

    if (propIds.length) {
      const wanted = typesKey.split(',');
      const jobs = [];

      if (wanted.includes('tasks')) {
        jobs.push(supabase.from('tasks').select('*, subtasks(*, materials(*))').in('property_id', propIds)
          .then(r => { out.tasks = r.data || []; }));
      }
      if (wanted.includes('materials')) {
        jobs.push(supabase.from('materials').select('*, subtask:subtasks(name, task:tasks(name))').in('property_id', propIds)
          .then(r => { out.materials = r.data || []; }));
      }
      if (wanted.includes('services')) {
        jobs.push(supabase.from('services').select('*').in('property_id', propIds)
          .then(r => { out.services = r.data || []; }));
      }
      if (wanted.includes('assets')) {
        jobs.push(supabase.from('assets').select('*').in('current_property_id', propIds)
          .then(r => { out.assets = r.data || []; }));
      }
      if (wanted.includes('livestock')) {
        jobs.push(supabase.from('livestock').select('*').in('property_id', propIds)
          .then(r => { out.livestock = r.data || []; }));
      }
      await Promise.all(jobs);
    }

    setData(out);
    setLoading(false);
  }, [user, isAdmin, typesKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { ...data, loading, refresh: fetchAll };
}

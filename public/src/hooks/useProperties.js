import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

export function useProperties() {
  const { user, profile, isAdmin } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('properties').select('*').eq('status','active').order('name');
      // Admin sees all; others see only assigned
      if (!isAdmin) {
        const { data: access } = await supabase
          .from('property_users')
          .select('property_id')
          .eq('user_id', user.id);
        const ids = (access || []).map(a => a.property_id);
        if (!ids.length) { setProperties([]); setLoading(false); return; }
        query = query.in('id', ids);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      setProperties(data || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const addProperty = async ({ name, type, icon, address, description }) => {
    const { data, error: err } = await supabase.from('properties').insert({
      name, type, icon, address, description, created_by: user.id
    }).select().single();
    if (err) return { error: err };
    await logAction({ propertyId:data.id, userId:user.id, userName:profile?.full_name, action:'created', entityType:'property', entityId:data.id, entityName:name });
    await fetchProperties();
    return { data };
  };

  const updateProperty = async (id, updates) => {
    const { error: err } = await supabase.from('properties').update(updates).eq('id', id);
    if (err) return { error: err };
    await logAction({ propertyId:id, userId:user.id, userName:profile?.full_name, action:'updated', entityType:'property', entityId:id, entityName:updates.name });
    await fetchProperties();
    return {};
  };

  const archiveProperty = async (id) => {
    const prop = properties.find(p => p.id === id);
    const { error: err } = await supabase.from('properties').update({ status:'archived' }).eq('id', id);
    if (err) return { error: err };
    await logAction({ propertyId:id, userId:user.id, userName:profile?.full_name, action:'archived', entityType:'property', entityId:id, entityName:prop?.name });
    await fetchProperties();
    return {};
  };

  return { properties, loading, error, addProperty, updateProperty, archiveProperty, refresh: fetchProperties };
}

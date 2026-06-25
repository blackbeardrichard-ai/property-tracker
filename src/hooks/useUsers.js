import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const inviteUser = async ({ email, fullName, role, defaultPassword, assignments }) => {
    // Calls the server-side Edge Function (holds the service key). The function
    // creates the auth user, sets must_change_password, and assigns properties.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, fullName, role, defaultPassword, assignments },
    });
    if (error) return { error };
    if (data?.error) return { error: { message: data.error } };
    await fetchUsers();
    return { data };
  };

  const updateUserPermission = async (userId, capability, granted) => {
    // Upsert a per-user capability override. granted=null removes the override
    // (falls back to role default).
    if (granted === null) {
      await supabase.from('user_permissions').delete()
        .eq('user_id', userId).eq('capability', capability);
    } else {
      await supabase.from('user_permissions').upsert(
        { user_id: userId, capability, granted },
        { onConflict: 'user_id,capability' }
      );
    }
  };

  const getUserPermissions = async (userId) => {
    const { data } = await supabase.from('user_permissions')
      .select('capability, granted').eq('user_id', userId);
    const map = {};
    (data || []).forEach(p => { map[p.capability] = p.granted; });
    return map;
  };

  const updateUser = async (userId, updates) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) return { error };
    await fetchUsers();
    return {};
  };

  const deactivateUser = async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: false })
      .eq('id', userId);
    if (error) return { error };
    await fetchUsers();
    return {};
  };

  return { users, loading, fetchUsers, updateUser, deactivateUser, inviteUser, updateUserPermission, getUserPermissions };
}

export function usePropertyUsers(propertyId) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('property_users')
      .select('*, profiles(*)')
      .eq('property_id', propertyId);
    setAssignments(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const assignUser = async (userId, role = 'viewer') => {
    await supabase.from('property_users').upsert(
      { property_id: propertyId, user_id: userId, role },
      { onConflict: 'property_id,user_id' }
    );
    fetchAssignments();
  };

  const removeUser = async (userId) => {
    await supabase.from('property_users')
      .delete()
      .eq('property_id', propertyId)
      .eq('user_id', userId);
    fetchAssignments();
  };

  const updateRole = async (userId, role) => {
    await supabase.from('property_users')
      .update({ role })
      .eq('property_id', propertyId)
      .eq('user_id', userId);
    fetchAssignments();
  };

  return { assignments, loading, assignUser, removeUser, updateRole };
}

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

  const inviteUser = async (email, fullName, role) => {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role }
    });
    if (error) return { error };
    await fetchUsers();
    return { data };
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

  return { users, loading, fetchUsers, updateUser, deactivateUser, inviteUser };
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
    await supabase.from('property_users').upsert({
      property_id: propertyId, user_id: userId, role
    });
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

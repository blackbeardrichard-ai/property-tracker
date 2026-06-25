import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [overrides, setOverrides] = useState({}); // { capability: granted(bool) }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setOverrides({}); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    // Load this user's capability overrides (RLS lets a user read their own).
    const { data: perms } = await supabase
      .from('user_permissions')
      .select('capability, granted')
      .eq('user_id', userId);
    const map = {};
    (perms || []).forEach(p => { map[p.capability] = p.granted; });
    setOverrides(map);
    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  // Revoke ALL sessions for this user across every device, then clear local state.
  async function signOutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setProfile(null);
    return { error };
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }

  const isAdmin      = profile?.role === 'admin';
  const isManager    = profile?.role === 'manager' || isAdmin;
  const isTechnician = profile?.role === 'technician' || isManager;
  const canDelete    = isAdmin;
  const canWrite     = isTechnician;
  const canManage    = isManager;

  // ── Capability resolver ───────────────────────────────────────────
  // Resolution order: admin → true; explicit per-user override → that value;
  // otherwise role default. This is the single check-point every fine-grained
  // permission routes through (material status, priority, asset register, …).
  const CAPABILITY_DEFAULTS = {
    // capability            : roles that have it by default
    edit_status_backward:    ['admin'],
    advance_status:          ['admin', 'manager', 'technician'],
    edit_priority:           ['admin', 'manager'],
    view_asset_register:     ['admin'],
  };
  const can = (capability) => {
    const role = profile?.role;
    if (!role) return false;
    if (role === 'admin') return true; // admin is all-powerful
    // Explicit per-user override wins over the role default.
    if (Object.prototype.hasOwnProperty.call(overrides, capability)) {
      return overrides[capability] === true;
    }
    const allowed = CAPABILITY_DEFAULTS[capability];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  const mustChangePassword = profile?.must_change_password === true;

  return (
    <AuthCtx.Provider value={{ user, profile, loading, mustChangePassword, signIn, signOut, signOutEverywhere, resetPassword, isAdmin, isManager, isTechnician, canDelete, canWrite, canManage, can, refetchProfile: () => fetchProfile(user?.id) }}>
      {children}
    </AuthCtx.Provider>
  );
}

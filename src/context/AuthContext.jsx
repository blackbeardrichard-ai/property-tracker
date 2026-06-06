import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
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
      else { setProfile(null); setLoading(false); }
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
  // Single check-point for fine-grained permissions. Today it resolves from
  // role defaults only. When per-user overrides are added (Batch 3), this is
  // the one place to extend — call sites won't change.
  const CAPABILITY_DEFAULTS = {
    // capability            : roles that have it by default
    edit_status_backward:    ['admin'],
    advance_status:          ['admin', 'manager', 'technician'],
    edit_priority:           ['admin', 'manager'],
  };
  const can = (capability) => {
    const role = profile?.role;
    if (!role) return false;
    if (role === 'admin') return true; // admin is all-powerful
    const allowed = CAPABILITY_DEFAULTS[capability];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, signIn, signOut, resetPassword, isAdmin, isManager, isTechnician, canDelete, canWrite, canManage, can, refetchProfile: () => fetchProfile(user?.id) }}>
      {children}
    </AuthCtx.Provider>
  );
}

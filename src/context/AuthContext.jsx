import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CAPABILITY_DEFAULTS } from '../lib/permissions';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [overrides, setOverrides] = useState({}); // { capability: granted(bool) }
  const [loading,   setLoading]   = useState(true);
  const [notice,    setNotice]    = useState('');  // shown on the login page (e.g. deactivated)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // A deactivated user is signed out immediately. (Database rules should also
    // block them; this stops the app being usable even if those rules allow reads.)
    if (data && data.active === false) {
      await supabase.auth.signOut();
      setUser(null); setProfile(null); setOverrides({});
      setNotice('This account has been deactivated. Contact your administrator.');
      setLoading(false);
      return;
    }

    setProfile(data);
    const { data: perms } = await supabase
      .from('user_permissions').select('capability, granted').eq('user_id', userId);
    const map = {};
    (perms || []).forEach(p => { map[p.capability] = p.granted; });
    setOverrides(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setOverrides({}); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(email, password) {
    setNotice('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  // Revoke ALL sessions for this user across every device, then clear local state.
  async function signOutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setUser(null); setProfile(null);
    return { error };
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }

  const role         = profile?.role;
  const isAdmin      = role === 'admin';
  const isManager    = role === 'manager' || isAdmin;
  const isTechnician = role === 'technician' || isManager;
  const canDelete    = isAdmin;
  const canWrite     = isTechnician;   // tick off, advance materials, log services
  const canManage    = isManager;      // add/edit tasks, services, rooms

  // Resolution order: admin → true; explicit per-user override → that value; otherwise role default.
  const can = (capability) => {
    if (!role) return false;
    if (role === 'admin') return true;
    if (Object.prototype.hasOwnProperty.call(overrides, capability)) return overrides[capability] === true;
    return (CAPABILITY_DEFAULTS[capability] || []).includes(role);
  };

  const mustChangePassword = profile?.must_change_password === true;

  return (
    <AuthCtx.Provider value={{
      user, profile, loading, notice, mustChangePassword,
      signIn, signOut, signOutEverywhere, resetPassword,
      isAdmin, isManager, isTechnician, canDelete, canWrite, canManage, can,
      refetchProfile: () => fetchProfile(user?.id),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

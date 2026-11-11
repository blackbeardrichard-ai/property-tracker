import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { syncNow, setCurrentUser, clearLocal, subscribeSync } from '../lib/offline';
import { CAPABILITY_DEFAULTS } from '../lib/permissions';

const AuthCtx = createContext(null);

// The sign-in saved on this phone. Without signal an expired sign-in can't be renewed, and the
// library then reports no session; the saved one is still this user, so keep working with it.
// (It is only removed from the phone on sign-out or when the server refuses it.)
function savedSession() {
  try {
    const v = JSON.parse(localStorage.getItem(supabase.auth.storageKey) || 'null');
    const sess = v?.currentSession || v;
    return sess?.user?.id && sess?.refresh_token ? sess : null;
  } catch { return null; }
}
let pendingNow = 0;
subscribeSync(st => { pendingNow = st.pending; });
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
    const use = (session, event) => {
      const s = session || (event === 'SIGNED_OUT' ? null : savedSession());
      setUser(s?.user ?? null);
      setCurrentUser(s?.user?.id);
      if (s?.user) { fetchProfile(s.user.id); if (session) syncNow(); }
      else { setProfile(null); setOverrides({}); setLoading(false); }
    };
    supabase.auth.getSession().then(({ data }) => use(data?.session, 'INITIAL')).catch(() => use(null, 'INITIAL'));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => use(session, event));
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(email, password) {
    setNotice('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    if (pendingNow > 0 && !window.confirm(`${pendingNow} change${pendingNow === 1 ? '' : 's'} made without signal ${pendingNow === 1 ? 'hasn’t' : 'haven’t'} been sent yet. Signing out now loses ${pendingNow === 1 ? 'it' : 'them'}. Sign out anyway?`)) return;
    await supabase.auth.signOut();
    await clearLocal();   // nothing of this user's stays on the phone
    setUser(null); setProfile(null);
  }

  // Revoke ALL sessions for this user across every device, then clear local state.
  async function signOutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (!error) await clearLocal();
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

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import PropertySelectorPage from './pages/PropertySelectorPage';
import PropertyPage from './pages/PropertyPage';
import SettingsPage from './pages/SettingsPage';
import ForcePasswordChange from './pages/ForcePasswordChange';
import ResetPassword from './pages/ResetPassword';
import AssetRegisterPage from './pages/AssetRegisterPage';
import { useProperties } from './hooks/useProperties';
import { T } from './lib/theme';

function Inner() {
  const { user, loading, mustChangePassword } = useAuth();
  const { properties } = useProperties();
  const [view, setView] = useState('properties'); // properties | property | settings
  const [activeProperty, setActiveProperty] = useState(null);
  const [selectedTab, setSelectedTab] = useState(undefined);
  const [recovery, setRecovery] = useState(false);

  // Detect arrival from a password-recovery email link. Supabase fires the
  // PASSWORD_RECOVERY event (and the URL carries a recovery token / #type=recovery).
  useEffect(() => {
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery')) setRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#95D5B2', fontFamily:"'DM Mono', monospace", fontSize:'13px' }}>Loading Property Tracker…</div>
    </div>
  );

  // Recovery link takes priority over everything (user may not be "logged in"
  // in the normal sense yet, but has a recovery session).
  if (recovery) return (
    <ResetPassword onDone={() => { window.location.hash = ''; setRecovery(false); }} />
  );

  if (!user) return <LoginPage />;

  // First-login / invited users must set their own password before anything else.
  if (mustChangePassword) return <ForcePasswordChange />;

  if (view === 'settings') return (
    <SettingsPage properties={properties} onBack={() => setView('properties')} />
  );

  if (view === 'assets') return (
    <AssetRegisterPage onBack={() => setView('properties')} />
  );

  if (view === 'property' && activeProperty) return (
    <PropertyPage
      property={activeProperty}
      properties={properties}
      onBack={() => { setActiveProperty(null); setSelectedTab(undefined); setView('properties'); }}
      initialTab={selectedTab}
    />
  );

  return (
    <PropertySelectorPage
      onSelect={(p, tab) => { setActiveProperty(p); setSelectedTab(tab); setView('property'); }}
      onSettings={() => setView('settings')}
      onAssetRegister={() => setView('assets')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}

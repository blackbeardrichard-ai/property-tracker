import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PropertySelectorPage from './pages/PropertySelectorPage';
import PropertyPage from './pages/PropertyPage';
import SettingsPage from './pages/SettingsPage';
import { useProperties } from './hooks/useProperties';
import { T } from './lib/theme';

function Inner() {
  const { user, loading } = useAuth();
  const { properties } = useProperties();
  const [view, setView] = useState('properties'); // properties | property | settings
  const [activeProperty, setActiveProperty] = useState(null);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#95D5B2', fontFamily:"'DM Mono', monospace", fontSize:'13px' }}>Loading Property Tracker…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  if (view === 'settings') return (
    <SettingsPage properties={properties} onBack={() => setView('properties')} />
  );

  if (view === 'property' && activeProperty) return (
    <PropertyPage
      property={activeProperty}
      onBack={() => { setActiveProperty(null); setView('properties'); }}
    />
  );

  return (
    <PropertySelectorPage
      onSelect={p => { setActiveProperty(p); setView('property'); }}
      onSettings={() => setView('settings')}
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

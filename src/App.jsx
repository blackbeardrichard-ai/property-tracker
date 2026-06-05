import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PropertySelectorPage from './pages/PropertySelectorPage';
import PropertyPage from './pages/PropertyPage';
import { T } from './lib/theme';

function Inner() {
  const { user, loading } = useAuth();
  const [activeProperty, setActiveProperty] = useState(null);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#95D5B2', fontFamily:"'DM Mono', monospace", fontSize:'13px' }}>Loading Property Tracker…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  if (activeProperty) return (
    <PropertyPage property={activeProperty} onBack={() => setActiveProperty(null)} />
  );

  return <PropertySelectorPage onSelect={setActiveProperty} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}

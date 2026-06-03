import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PropertySelectorPage from './pages/PropertySelectorPage';
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

  if (!activeProperty) return (
    <PropertySelectorPage onSelect={setActiveProperty} />
  );

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ textAlign:'center', color:'#95D5B2' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>{activeProperty.icon}</div>
        <div style={{ fontSize:'18px', fontWeight:'700', color:'#f0ede8', marginBottom:'8px' }}>{activeProperty.name}</div>
        <div style={{ fontSize:'13px', color:'rgba(240,237,232,0.4)', fontFamily:"'DM Mono', monospace", marginBottom:'20px' }}>Phase 2 coming soon</div>
        <button onClick={() => setActiveProperty(null)}
          style={{ background:'none', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(240,237,232,0.6)', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'13px', fontFamily:"'DM Sans', sans-serif" }}>
          ← Back to Properties
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}
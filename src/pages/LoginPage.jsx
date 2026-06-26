import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { T, S } from '../lib/theme';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [resetMode,  setResetMode]  = useState(false);
  const [resetSent,  setResetSent]  = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    const { error: err } = await resetPassword(email.trim());
    if (err) setError(err.message);
    else setResetSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ width:'100%', maxWidth:'380px' }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <img src="/grid-capital-logo.png" alt="Grid Capital" style={{ width:'200px', maxWidth:'70%', height:'auto', margin:'0 auto 20px', display:'block' }}/>
          <div style={{ fontSize:'22px', fontWeight:'700', color:T.text, letterSpacing:'-0.5px' }}>Property Tracker</div>
          <div style={{ fontSize:'13px', color:T.textDim, fontFamily:T.mono, marginTop:'4px' }}>
            {resetMode ? 'Reset your password' : 'Sign in to your account'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'28px', boxShadow:T.shadow }}>
          {resetSent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'12px' }}>📧</div>
              <div style={{ fontSize:'15px', color:T.text, fontFamily:T.sans, marginBottom:'6px', fontWeight:'700' }}>Check your email</div>
              <div style={{ fontSize:'13px', color:T.textDim, fontFamily:T.sans, marginBottom:'24px' }}>We sent a reset link to {email}</div>
              <button onClick={() => { setResetMode(false); setResetSent(false); }} style={{ ...S.btnGhost, width:'100%' }}>Back to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:'14px' }}>
                <div style={{ ...S.fieldLabel, marginBottom:'6px' }}>EMAIL</div>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') resetMode ? handleReset() : document.getElementById('pt-pw')?.focus(); }}
                  placeholder="your@email.com" autoComplete="email" style={S.input}/>
              </div>
              {!resetMode && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ ...S.fieldLabel, marginBottom:'6px' }}>PASSWORD</div>
                  <input id="pt-pw" type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter') handleSignIn(); }}
                    placeholder="••••••••" autoComplete="current-password" style={S.input}/>
                </div>
              )}
              {error && (
                <div style={{ color:T.red, fontSize:'13px', fontFamily:T.sans, marginBottom:'14px', padding:'8px 12px', background:T.redFade, borderRadius:'8px', border:`1px solid ${T.red}30` }}>
                  {error}
                </div>
              )}
              <button onClick={resetMode ? handleReset : handleSignIn} disabled={loading}
                style={{ ...S.btnPrimary, width:'100%', padding:'13px', fontSize:'14px', opacity:loading?0.7:1, marginBottom:'12px' }}>
                {loading ? (resetMode?'Sending…':'Signing in…') : (resetMode?'Send Reset Link':'Sign In')}
              </button>
              <button onClick={() => { setResetMode(!resetMode); setError(''); }}
                style={{ background:'none', border:'none', color:T.textDim, cursor:'pointer', fontSize:'13px', fontFamily:T.sans, width:'100%', textAlign:'center' }}>
                {resetMode ? '← Back to Sign In' : 'Forgot password?'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:'20px', fontSize:'12px', color:T.textFaint, fontFamily:T.sans }}>
          Contact your administrator to create an account
        </div>
      </div>
    </div>
  );
}

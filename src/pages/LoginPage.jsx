import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { T, S } from '../lib/theme';
import { Field } from '../components/ui';

export default function LoginPage() {
  const { signIn, resetPassword, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true); setError('');
    const { error: err } = await signIn(email.trim(), password);
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    const { error: err } = await resetPassword(email.trim());
    if (err) setError(err.message); else setResetSent(true);
    setLoading(false);
  };

  const submit = e => { e.preventDefault(); resetMode ? handleReset() : handleSignIn(); };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: T.sans }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ ...S.card, padding: '28px 24px', boxShadow: T.shadowMd }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/grid-capital-logo.png" alt="Grid Capital" style={{ width: 168, maxWidth: '60%', height: 'auto', display: 'block', margin: '0 auto 16px' }}/>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>Property Tracker</h1>
            <div style={{ ...S.meta, fontSize: 14, marginTop: 4 }}>{resetMode ? 'Reset your password' : 'Sign in to your account'}</div>
          </div>

          {notice && !resetMode && (
            <div role="alert" style={{ color: T.warn, background: T.warnFade, border: `1px solid ${T.warnBorder}`, fontSize: 14, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>{notice}</div>
          )}

          {resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Check your email</div>
              <div style={{ fontSize: 14, color: T.textMid, marginBottom: 20 }}>We sent a reset link to {email}.</div>
              <button onClick={() => { setResetMode(false); setResetSent(false); }} style={{ ...S.btnGhost, width: '100%' }}>Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <Field label="Email" htmlFor="login-email">
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" style={S.input}/>
              </Field>
              {!resetMode && (
                <Field label="Password" htmlFor="login-pw">
                  <input id="login-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={S.input}/>
                </Field>
              )}
              {error && <div role="alert" style={{ color: T.red, background: T.redFade, fontSize: 14, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ ...S.btnPrimary, width: '100%', height: 48, opacity: loading ? 0.7 : 1 }}>
                {loading ? (resetMode ? 'Sending…' : 'Signing in…') : (resetMode ? 'Send reset link' : 'Sign in')}
              </button>
              <button type="button" onClick={() => { setResetMode(!resetMode); setError(''); }}
                style={{ ...S.btnGhost, border: 'none', background: 'none', width: '100%', marginTop: 6, color: T.primary }}>
                {resetMode ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </form>
          )}
        </div>
        <div style={{ ...S.meta, textAlign: 'center', marginTop: 16 }}>Contact your administrator to create an account.</div>
      </div>
    </div>
  );
}

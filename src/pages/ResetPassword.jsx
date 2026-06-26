import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';

// Shown when a user arrives from a password-recovery email link. By the time
// this renders, Supabase has already established a recovery session from the
// token in the URL (App.jsx detects the PASSWORD_RECOVERY event), so we can
// call updateUser directly to set the new password.
export default function ResetPassword({ onDone }) {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!newPw.trim()) { setMsg('Please enter a new password.'); return; }
    if (newPw.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setMsg('Passwords do not match.'); return; }
    setSaving(true); setMsg('');

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setMsg('Error: ' + error.message); setSaving(false); return; }

    // Also clear the must_change_password flag in case this user was mid-invite.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    }
    setSaving(false);
    setDone(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ width:'100%', maxWidth:'400px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'28px 24px', boxShadow:T.shadow }}>
        {done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:T.text, marginBottom:'6px' }}>Password updated</div>
            <div style={{ fontSize:'13px', color:T.textDim, marginBottom:'22px', lineHeight:'1.6' }}>
              Your password has been changed. You can now sign in with your new password.
            </div>
            <button onClick={() => { if (onDone) onDone(); else window.location.href = '/'; }} style={{ ...S.btnPrimary, width:'100%', padding:'12px' }}>
              Continue to Sign In
            </button>
          </div>
        ) : (
          <>
            <div style={{ width:'44px', height:'44px', background:T.primary, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'16px' }}>🔑</div>
            <div style={{ fontSize:'19px', fontWeight:'700', color:T.text, marginBottom:'6px' }}>Choose a new password</div>
            <div style={{ fontSize:'13px', color:T.textDim, marginBottom:'22px', lineHeight:'1.6' }}>
              Enter a new password for your account below.
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>NEW PASSWORD</div>
              <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 6 characters" style={S.input} autoFocus/>
            </div>
            <div style={{ marginBottom:'18px' }}>
              <div style={S.fieldLabel}>CONFIRM NEW PASSWORD</div>
              <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat new password" style={S.input} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            </div>

            {msg && <div style={{ fontSize:'13px', color:msg.includes('Error')?T.red:T.accent, marginBottom:'14px', fontFamily:T.sans }}>{msg}</div>}

            <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, width:'100%', padding:'12px', opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

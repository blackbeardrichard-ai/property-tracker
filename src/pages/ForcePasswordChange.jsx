import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';

export default function ForcePasswordChange() {
  const { profile, signOut, refetchProfile } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!newPw.trim()) { setMsg('Please enter a new password.'); return; }
    if (newPw.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setMsg('Passwords do not match.'); return; }
    setSaving(true); setMsg('');

    // 1. Update the auth password
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPw });
    if (pwErr) { setMsg('Error: ' + pwErr.message); setSaving(false); return; }

    // 2. Clear the must_change_password flag on the profile
    const { error: flagErr } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', profile.id);
    if (flagErr) { setMsg('Error: ' + flagErr.message); setSaving(false); return; }

    // 3. Refresh profile so the app gate releases
    await refetchProfile();
    setSaving(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ width:'100%', maxWidth:'400px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'28px 24px', boxShadow:T.shadow }}>
        <div style={{ width:'44px', height:'44px', background:T.primary, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'16px' }}>🔐</div>
        <div style={{ fontSize:'19px', fontWeight:'700', color:T.text, marginBottom:'6px' }}>Set your password</div>
        <div style={{ fontSize:'13px', color:T.textDim, marginBottom:'22px', lineHeight:'1.6' }}>
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. For security, please choose a new password before continuing.
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
          {saving ? 'Saving…' : 'Set password & continue'}
        </button>

        <button onClick={signOut} style={{ ...S.btnGhost, width:'100%', padding:'10px', marginTop:'10px' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';
import { Icon } from '../components/ui';

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
      <div style={{ width:'100%', maxWidth:'400px', background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'28px 24px', boxShadow:T.shadow }}>
        <div style={{ width:'44px', height:'44px', background:T.primaryFade, color:T.primary, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px' }}><Icon name="key" size={22}/></div>
        <div style={{ fontSize:'19px', fontWeight:'700', color:T.text, marginBottom:'6px' }}>Set your password</div>
        <div style={{ fontSize:'15px', color:T.textMid, marginBottom:'22px', lineHeight:'1.5' }}>
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. For security, please choose a new password before continuing.
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label htmlFor="fp-new" style={S.fieldLabel}>New password</label>
          <input id="fp-new" type="password" autoComplete="new-password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 6 characters" style={S.input} autoFocus/>
        </div>
        <div style={{ marginBottom:'18px' }}>
          <label htmlFor="fp-confirm" style={S.fieldLabel}>Confirm new password</label>
          <input id="fp-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat new password" style={S.input} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        </div>

        {msg && <div role="alert" style={{ fontSize:'14px', color:T.red, background:T.redFade, padding:'10px 12px', borderRadius:'8px', marginBottom:'14px' }}>{msg}</div>}

        <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, width:'100%', height:'48px', opacity:saving?0.7:1 }}>
          {saving ? 'Saving…' : 'Set password & continue'}
        </button>

        <button onClick={signOut} style={{ ...S.btnGhost, width:'100%', marginTop:'10px' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

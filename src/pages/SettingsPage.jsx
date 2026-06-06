import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsers, usePropertyUsers } from '../hooks/useUsers';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';

const ROLES = ['admin', 'manager', 'technician', 'viewer'];
const ROLE_COLORS = { admin: T.red, manager: T.warn, technician: T.accent, viewer: T.textDim };

const Ic = {
  back:   () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  person: () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M2 18c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  key:    () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 10h6M16 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  audit:  () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 7h6M7 11h6M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  cog:    () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  plus:   () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  trash:  () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M2 3l1 8h7l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function RoleBadge({ role }) {
  return (
    <span style={{ fontSize:'10px', fontFamily:T.mono, color:ROLE_COLORS[role]||T.textDim, background:`${ROLE_COLORS[role]||T.textDim}18`, borderRadius:'4px', padding:'2px 7px', textTransform:'capitalize' }}>
      {role}
    </span>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────
function ProfileTab() {
  const { profile, refetchProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq('id', profile.id);
    if (error) setProfileMsg('Error: ' + error.message);
    else { setProfileMsg('Profile updated ✓'); await refetchProfile(); }
    setSaving(false);
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const changePassword = async () => {
    if (!newPw.trim()) { setPwMsg('Please enter a new password.'); return; }
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return; }
    if (newPw.length < 6) { setPwMsg('Password must be at least 6 characters.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setPwMsg('Error: ' + error.message);
    else { setPwMsg('Password updated ✓'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    setSaving(false);
    setTimeout(() => setPwMsg(''), 3000);
  };

  return (
    <div>
      {/* Profile details */}
      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'16px' }}>PROFILE DETAILS</div>
        <div style={{ marginBottom:'12px' }}>
          <div style={S.fieldLabel}>FULL NAME</div>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" style={S.input}/>
        </div>
        <div style={{ marginBottom:'16px' }}>
          <div style={S.fieldLabel}>PHONE (optional)</div>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+27 82 000 0000" style={S.input}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={saveProfile} disabled={saving} style={{ ...S.btnPrimary, padding:'9px 20px', opacity:saving?0.7:1 }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {profileMsg && <span style={{ fontSize:'13px', color:profileMsg.includes('Error')?T.red:T.accent, fontFamily:T.sans }}>{profileMsg}</span>}
        </div>
      </div>

      {/* Change password */}
      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'16px' }}>CHANGE PASSWORD</div>
        <div style={{ marginBottom:'12px' }}>
          <div style={S.fieldLabel}>NEW PASSWORD</div>
          <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min. 6 characters" style={S.input}/>
        </div>
        <div style={{ marginBottom:'16px' }}>
          <div style={S.fieldLabel}>CONFIRM NEW PASSWORD</div>
          <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat new password" style={S.input} onKeyDown={e=>e.key==='Enter'&&changePassword()}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={changePassword} disabled={saving} style={{ ...S.btnPrimary, padding:'9px 20px', opacity:saving?0.7:1 }}>
            {saving ? 'Updating…' : 'Update Password'}
          </button>
          {pwMsg && <span style={{ fontSize:'13px', color:pwMsg.includes('Error')?T.red:T.accent, fontFamily:T.sans }}>{pwMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────
function UsersTab({ properties }) {
  const { users, loading, updateUser, deactivateUser } = useUsers();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email:'', fullName:'', role:'viewer' });
  const [inviteMsg, setInviteMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  const handleInvite = async () => {
    if (!form.email.trim() || !form.fullName.trim()) { setInviteMsg('Email and name are required.'); return; }
    setSaving(true);
    // Create user via SQL since admin API requires service key
    // Instead we'll show instructions
    setInviteMsg('To add a user: go to Supabase → Authentication → Users → Add user, then assign them here.');
    setSaving(false);
    setTimeout(() => setInviteMsg(''), 8000);
  };

  const activeUsers = users.filter(u => u.active !== false);

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading users…</div>;

  return (
    <div>
      <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'14px' }}>
        TEAM MEMBERS ({activeUsers.length})
      </div>

      {activeUsers.map(u => (
        <div key={u.id} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'10px', marginBottom:'8px', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer' }} onClick={() => setExpandedUser(expandedUser===u.id?null:u.id)}>
            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, display:'flex', alignItems:'center', justifyContent:'center', color:T.accent, fontWeight:'700', fontSize:'15px', fontFamily:T.sans, flexShrink:0 }}>
              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'14px', fontWeight:'600', color:T.text, fontFamily:T.sans }}>{u.full_name}</div>
              <div style={{ fontSize:'11px', color:T.textDim, fontFamily:T.mono, marginTop:'2px' }}>{u.phone || 'No phone'}</div>
            </div>
            <RoleBadge role={u.role}/>
          </div>

          {expandedUser === u.id && (
            <div style={{ padding:'0 16px 14px', borderTop:`1px solid ${T.border}`, paddingTop:'12px' }}>
              <div style={{ marginBottom:'12px' }}>
                <div style={S.fieldLabel}>ROLE</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {ROLES.map(r => (
                    <button key={r} onClick={() => updateUser(u.id, { role: r })}
                      style={{ background:u.role===r?(ROLE_COLORS[r]||T.primary):T.controlBg, border:'none', color:u.role===r?'#000':T.textMid, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, fontWeight:u.role===r?'700':'400', textTransform:'capitalize' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <div style={S.fieldLabel}>PROPERTY ACCESS</div>
                {properties.map(prop => (
                  <PropertyAccessRow key={prop.id} property={prop} userId={u.id}/>
                ))}
              </div>

              <button onClick={() => deactivateUser(u.id)}
                style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'none', border:`1px solid ${T.border}`, color:T.red, borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}
                onMouseEnter={e => e.currentTarget.style.borderColor=T.red}
                onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
              >
                <Ic.trash/> Deactivate User
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add user info */}
      <div style={{ background:T.primaryFade, border:`1px dashed ${T.primary}`, borderRadius:'10px', padding:'16px', marginTop:'12px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'8px' }}>ADD NEW USER</div>
        <div style={{ fontSize:'13px', color:T.textMid, fontFamily:T.sans, lineHeight:'1.6' }}>
          To add a new user:
          <ol style={{ marginTop:'8px', paddingLeft:'18px', display:'flex', flexDirection:'column', gap:'4px' }}>
            <li>Go to <strong style={{color:T.accent}}>supabase.com</strong> → your project → Authentication → Users</li>
            <li>Click <strong style={{color:T.accent}}>Add user</strong> → Create new user</li>
            <li>Enter their email and a temporary password</li>
            <li>Come back here and assign their role and property access</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ── Property Access Row (inside user expand) ──────────────────────
function PropertyAccessRow({ property, userId }) {
  const { assignments, assignUser, removeUser, updateRole } = usePropertyUsers(property.id);
  const assignment = assignments.find(a => a.user_id === userId);
  const hasAccess = !!assignment;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'rgba(0,0,0,0.15)', borderRadius:'7px', marginBottom:'4px' }}>
      <span style={{ fontSize:'16px' }}>{property.icon}</span>
      <span style={{ flex:1, fontSize:'13px', color:T.textMid, fontFamily:T.sans }}>{property.name}</span>
      {hasAccess ? (
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <select value={assignment.role} onChange={e=>updateRole(userId,e.target.value)} style={{ background:T.controlBg, border:`1px solid ${T.border}`, color:T.text, borderRadius:'5px', padding:'4px 8px', fontSize:'11px', fontFamily:T.mono, cursor:'pointer' }}>
            {['manager','technician','viewer'].map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={()=>removeUser(userId)} style={{ background:'none', border:`1px solid ${T.border}`, color:T.red, borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.red} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            Remove
          </button>
        </div>
      ) : (
        <button onClick={()=>assignUser(userId,'viewer')} style={{ background:'none', border:`1px solid ${T.primaryBorder}`, color:T.accent, borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans }}>
          + Assign
        </button>
      )}
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────
function AuditTab({ properties }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('property_id', filter);
    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  const fmtDateTime = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const actionColor = a => a==='deleted'?T.red:a==='completed'||a==='acquired'?T.accent:T.textMid;

  return (
    <div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        <button onClick={()=>setFilter('all')} style={{ background:filter==='all'?T.primary:T.controlBg, border:'none', color:filter==='all'?T.text:T.textDim, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, fontWeight:filter==='all'?'700':'400' }}>All Properties</button>
        {properties.map(p=>(
          <button key={p.id} onClick={()=>setFilter(p.id)} style={{ background:filter===p.id?T.primary:T.controlBg, border:'none', color:filter===p.id?T.text:T.textDim, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, fontWeight:filter===p.id?'700':'400' }}>
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading audit log…</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>No activity recorded yet</div>
      ) : logs.map(log => (
        <div key={log.id} style={{ display:'flex', gap:'12px', padding:'10px 14px', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'8px', marginBottom:'6px' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'13px', fontWeight:'600', color:T.text, fontFamily:T.sans }}>{log.user_name||'Unknown'}</span>
              <span style={{ fontSize:'12px', color:actionColor(log.action), fontFamily:T.mono, textTransform:'capitalize' }}>{log.action}</span>
              <span style={{ fontSize:'12px', color:T.textMid, fontFamily:T.sans }}>{log.entity_name||log.entity_type}</span>
            </div>
            <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginTop:'3px' }}>{fmtDateTime(log.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── App Settings Tab ──────────────────────────────────────────────
function AppSettingsTab() {
  return (
    <div>
      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'16px' }}>COMPANY LOGO</div>
        <div style={{ width:'80px', height:'80px', background:T.primaryFade, border:`2px dashed ${T.primaryBorder}`, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px', fontSize:'28px' }}>
          🏡
        </div>
        <div style={{ fontSize:'13px', color:T.textDim, fontFamily:T.sans, marginBottom:'12px' }}>
          Logo upload coming soon. Your logo will appear on the login screen and header.
        </div>
        <button style={{ ...S.btnGhost, opacity:0.5, cursor:'not-allowed' }}>Upload Logo (coming soon)</button>
      </div>

      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'16px' }}>APP INFO</div>
        {[
          ['Version', 'Property Tracker v2'],
          ['Hosted at', 'property-tracker-two-rho.vercel.app'],
          ['Database', 'Supabase (West EU)'],
          ['Built with', 'React + Vite + Supabase'],
        ].map(([label, value]) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:'12px', color:T.textDim, fontFamily:T.mono }}>{label}</span>
            <span style={{ fontSize:'12px', color:T.textMid, fontFamily:T.sans }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────
export default function SettingsPage({ onBack, properties }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id:'profile', label:'Profile', icon:<Ic.person/> },
    ...(isAdmin ? [
      { id:'users',    label:'Users',    icon:<Ic.person/> },
      { id:'audit',    label:'Audit Log', icon:<Ic.audit/> },
      { id:'app',      label:'Settings', icon:<Ic.cog/> },
    ] : []),
  ];

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, boxShadow:T.shadow, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', color:T.textDim, cursor:'pointer', fontFamily:T.sans, fontSize:'12px', padding:'4px 0' }}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <Ic.back/> Properties
          </button>
          <div style={{ width:'1px', height:'16px', background:T.border }}/>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text }}>Settings</div>
        </div>
        <div style={{ display:'flex', borderTop:`1px solid ${T.border}`, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', padding:'11px 8px', background:'none', border:'none', cursor:'pointer', borderBottom:tab===t.id?`2px solid ${T.primary}`:'2px solid transparent', color:tab===t.id?T.accent:T.textDim, fontSize:'12px', fontWeight:tab===t.id?'700':'500', fontFamily:T.sans, transition:'all 0.15s', whiteSpace:'nowrap' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'20px 14px' }}>
        {tab==='profile' && <ProfileTab/>}
        {tab==='users'   && <UsersTab properties={properties}/>}
        {tab==='audit'   && <AuditTab properties={properties}/>}
        {tab==='app'     && <AppSettingsTab/>}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsers, usePropertyUsers } from '../hooks/useUsers';
import { useProperties } from '../hooks/useProperties';
import DataExportTab from './DataExportTab';
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
  const { profile, refetchProfile, signOutEverywhere } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

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

      {/* Sessions & security */}
      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', marginTop:'16px' }}>
        <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'12px' }}>SESSIONS &amp; SECURITY</div>
        <div style={{ fontSize:'13px', color:T.textMid, fontFamily:T.sans, lineHeight:'1.6', marginBottom:'14px' }}>
          If you've signed in on a shared or lost device, you can sign out of every device at once. You'll need to log in again here afterwards.
        </div>
        <button onClick={async()=>{ setSigningOutAll(true); await signOutEverywhere(); }} disabled={signingOutAll}
          style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'none', border:`1px solid ${T.red}`, color:T.red, borderRadius:'8px', padding:'9px 16px', cursor:signingOutAll?'default':'pointer', fontSize:'13px', fontFamily:T.sans, fontWeight:'600', opacity:signingOutAll?0.7:1 }}
          onMouseEnter={e=>{ if(!signingOutAll){ e.currentTarget.style.background=T.redFade; } }}
          onMouseLeave={e=>{ e.currentTarget.style.background='none'; }}>
          <Ic.key/> {signingOutAll ? 'Signing out…' : 'Sign out of all devices'}
        </button>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────
// Capabilities an admin can override per-user (label + the key used by can()).
const OVERRIDABLE_CAPABILITIES = [
  { key:'edit_status_backward', label:'Edit material status backward', hint:'Change a material to any status, including reversing “Used”.' },
  { key:'edit_priority',        label:'Edit task priority',            hint:'Set high / medium / low on tasks.' },
  { key:'view_asset_register',  label:'View global asset register',    hint:'See assets across all properties they can access.' },
  { key:'global_search',        label:'Global search',                 hint:'Search across all accessible properties.' },
  { key:'view_shopping_list',   label:'Global shopping list',          hint:'See pending materials across accessible properties.' },
  { key:'data_export',          label:'Data export',                   hint:'Download data as an Excel workbook.' },
];
const ROLE_DEFAULT_CAPS = {
  edit_status_backward: ['admin'],
  edit_priority:        ['admin','manager'],
  view_asset_register:  ['admin'],
  global_search:        ['admin'],
  view_shopping_list:   ['admin'],
  data_export:          ['admin'],
};

function UsersTab({ properties }) {
  const { users, loading, updateUser, deactivateUser, inviteUser, updateUserPermission, getUserPermissions } = useUsers();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email:'', fullName:'', role:'viewer', defaultPassword:'', assignments:{} });
  const [inviteMsg, setInviteMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  const handleInvite = async () => {
    if (!form.email.trim() || !form.fullName.trim()) { setInviteMsg('Email and name are required.'); return; }
    if (form.defaultPassword.length < 6) { setInviteMsg('Default password must be at least 6 characters.'); return; }
    setSaving(true); setInviteMsg('');
    const assignments = Object.entries(form.assignments)
      .filter(([,role]) => role)
      .map(([property_id, role]) => ({ property_id, role }));
    const { error } = await inviteUser({
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      role: form.role,
      defaultPassword: form.defaultPassword,
      assignments,
    });
    if (error) { setInviteMsg('Error: ' + error.message); setSaving(false); return; }
    setInviteMsg('✓ User created. They’ll get an activation email and must set a new password on first login.');
    setForm({ email:'', fullName:'', role:'viewer', defaultPassword:'', assignments:{} });
    setSaving(false);
    setTimeout(() => { setInviteMsg(''); setAdding(false); }, 5000);
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
                <div style={S.fieldLabel}>GLOBAL ROLE</div>
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
                <div style={S.fieldLabel}>PROPERTY ACCESS &amp; ROLE</div>
                {properties.map(prop => (
                  <PropertyAccessRow key={prop.id} property={prop} userId={u.id}/>
                ))}
              </div>

              {u.role !== 'admin' && (
                <CapabilityToggles user={u} getUserPermissions={getUserPermissions} updateUserPermission={updateUserPermission}/>
              )}

              <button onClick={() => deactivateUser(u.id)}
                style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'none', border:`1px solid ${T.border}`, color:T.red, borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans, marginTop:'4px' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=T.red}
                onMouseLeave={e => e.currentTarget.style.borderColor=T.border}
              >
                <Ic.trash/> Deactivate User
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Invite new user */}
      {!adding ? (
        <button onClick={()=>setAdding(true)} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', justifyContent:'center', background:'none', border:`2px dashed ${T.primaryBorder}`, color:T.accent, borderRadius:'10px', padding:'14px', cursor:'pointer', fontSize:'14px', fontFamily:T.sans, fontWeight:'600', marginTop:'12px' }}
          onMouseEnter={e=>e.currentTarget.style.background=T.primaryFade} onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <Ic.plus/> Invite New User
        </button>
      ) : (
        <div style={{ background:T.surface2, border:`1px solid ${T.primaryBorder}`, borderRadius:'10px', padding:'18px', marginTop:'12px' }}>
          <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'14px' }}>INVITE NEW USER</div>

          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>FULL NAME *</div>
            <input value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} placeholder="e.g. Jane Smith" style={S.input}/>
          </div>
          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>EMAIL *</div>
            <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="jane@example.com" style={S.input}/>
          </div>
          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>TEMPORARY PASSWORD *</div>
            <input value={form.defaultPassword} onChange={e=>setForm(p=>({...p,defaultPassword:e.target.value}))} placeholder="Min. 6 chars — they’ll reset on first login" style={S.input}/>
          </div>

          <div style={{ marginBottom:'12px' }}>
            <div style={S.fieldLabel}>GLOBAL ROLE</div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {ROLES.map(r => (
                <button key={r} onClick={()=>setForm(p=>({...p,role:r}))}
                  style={{ background:form.role===r?(ROLE_COLORS[r]||T.primary):T.controlBg, border:'none', color:form.role===r?'#000':T.textMid, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, fontWeight:form.role===r?'700':'400', textTransform:'capitalize' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:'16px' }}>
            <div style={S.fieldLabel}>PROPERTY ACCESS (pick a role per property)</div>
            {properties.map(prop => {
              const sel = form.assignments[prop.id] || '';
              return (
                <div key={prop.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:T.controlBgFaint, borderRadius:'7px', marginBottom:'4px' }}>
                  <span style={{ fontSize:'16px' }}>{prop.icon}</span>
                  <span style={{ flex:1, fontSize:'13px', color:T.textMid, fontFamily:T.sans }}>{prop.name}</span>
                  <div style={{ display:'flex', gap:'4px' }}>
                    {['', 'viewer','technician','manager'].map(r => (
                      <button key={r||'none'} onClick={()=>setForm(p=>({...p,assignments:{...p.assignments,[prop.id]:r}}))}
                        style={{ background:sel===r?T.primary:T.controlBg, border:'none', color:sel===r?'#fff':T.textDim, borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontSize:'10px', fontFamily:T.mono, textTransform:'capitalize' }}>
                        {r||'none'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {inviteMsg && (
            <div style={{ fontSize:'13px', fontFamily:T.sans, marginBottom:'12px', padding:'10px 14px', borderRadius:'8px', lineHeight:'1.5',
              color: inviteMsg.includes('Error')?T.red:T.accent,
              background: inviteMsg.includes('Error')?T.redFade:T.primaryFade,
              border:`1px solid ${inviteMsg.includes('Error')?`${T.red}30`:T.primaryBorder}` }}>
              {inviteMsg}
            </div>
          )}

          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={()=>{ setAdding(false); setInviteMsg(''); }} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
            <button onClick={handleInvite} disabled={saving} style={{ ...S.btnPrimary, flex:2, opacity:saving?0.7:1 }}>
              {saving ? 'Creating…' : 'Create & Invite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Capability override toggles (inside user expand) ──────────────
function CapabilityToggles({ user, getUserPermissions, updateUserPermission }) {
  const [overrides, setOverrides] = useState(null); // { cap: bool }

  useEffect(() => {
    let active = true;
    getUserPermissions(user.id).then(map => { if (active) setOverrides(map); });
    return () => { active = false; };
  }, [user.id]);

  const roleHasByDefault = (cap) => (ROLE_DEFAULT_CAPS[cap] || []).includes(user.role);

  const cycle = async (cap) => {
    // Tri-state: default → granted → denied → default
    const cur = overrides && Object.prototype.hasOwnProperty.call(overrides, cap) ? overrides[cap] : null;
    let next;
    if (cur === null) next = true;
    else if (cur === true) next = false;
    else next = null;
    await updateUserPermission(user.id, cap, next);
    setOverrides(prev => {
      const copy = { ...(prev||{}) };
      if (next === null) delete copy[cap]; else copy[cap] = next;
      return copy;
    });
  };

  const stateLabel = (cap) => {
    const has = overrides && Object.prototype.hasOwnProperty.call(overrides, cap);
    if (!has) return { text:`Default (${roleHasByDefault(cap)?'on':'off'})`, color:T.textDim, bg:T.controlBg };
    return overrides[cap]
      ? { text:'Granted', color:T.accent, bg:T.accentFade }
      : { text:'Denied',  color:T.red,    bg:T.redFade };
  };

  return (
    <div style={{ marginBottom:'12px' }}>
      <div style={S.fieldLabel}>CAPABILITY OVERRIDES</div>
      <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.sans, marginBottom:'8px', lineHeight:'1.5' }}>
        Tap to cycle: Default → Granted → Denied. Overrides win over the role default.
      </div>
      {overrides === null ? (
        <div style={{ fontSize:'12px', color:T.textDim, fontFamily:T.mono }}>Loading…</div>
      ) : OVERRIDABLE_CAPABILITIES.map(c => {
        const st = stateLabel(c.key);
        return (
          <div key={c.key} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:T.controlBgFaint, borderRadius:'7px', marginBottom:'4px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', color:T.textMid, fontFamily:T.sans }}>{c.label}</div>
              <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.sans, marginTop:'1px' }}>{c.hint}</div>
            </div>
            <button onClick={()=>cycle(c.key)} style={{ flexShrink:0, background:st.bg, border:`1px solid ${st.color}40`, color:st.color, borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontFamily:T.mono, whiteSpace:'nowrap' }}>
              {st.text}
            </button>
          </div>
        );
      })}
    </div>
  );
}


// ── Property Access Row (inside user expand) ──────────────────────
function PropertyAccessRow({ property, userId }) {
  const { assignments, assignUser, removeUser, updateRole } = usePropertyUsers(property.id);
  const assignment = assignments.find(a => a.user_id === userId);
  const hasAccess = !!assignment;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:T.controlBgFaint, borderRadius:'7px', marginBottom:'4px' }}>
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

// Human-readable entity labels (singular, lowercase — sentence builder capitalises where needed)
const ENTITY_LABEL = {
  task:'task', subtask:'subtask', material:'material', service:'service',
  asset:'asset', livestock:'animal', property:'property', room:'room', user:'user',
};
const MAT_STATUS_LABEL = { needed:'Needed', ordered:'Ordered', delivered:'Delivered', used:'Used' };

// Turn a structured audit row into a natural sentence.
// Returns { verb, sentence } — verb is the coloured action word, sentence is the rest.
function describeLog(log, propsById) {
  const who = log.user_name || 'Someone';
  const ent = ENTITY_LABEL[log.entity_type] || log.entity_type || 'item';
  const name = log.entity_name ? `"${log.entity_name}"` : `a ${ent}`;
  const nv = log.new_value || {};
  const a = log.action;

  // Material status changes are stored with the status as the action verb.
  if (log.entity_type === 'material' && MAT_STATUS_LABEL[a]) {
    return { verb:'changed', sentence:`material ${name} to ${MAT_STATUS_LABEL[a]}` };
  }

  switch (a) {
    case 'created':   return { verb:'added',     sentence:`a new ${ent}, ${name}` };
    case 'deleted':   return { verb:'deleted',   sentence:`${ent} ${name}` };
    case 'updated':   return { verb:'updated',   sentence:`${ent} ${name}` };
    case 'assigned':  return { verb:'assigned',  sentence:`${ent} ${name}` };
    case 'completed': return { verb:'completed', sentence:`${ent} ${name}${nv.note?` — “${nv.note}”`:''}` };
    case 'reopened':  return { verb:'reopened',  sentence:`${ent} ${name}` };
    case 'acquired':  return { verb:'acquired',  sentence:`material ${name}` };
    case 'archived':  return { verb:'archived',  sentence:`${ent} ${name}` };
    case 'logged': {
      const co = nv.company ? ` (by ${nv.company})` : '';
      const dt = nv.doneDate ? ` on ${nv.doneDate}` : '';
      return { verb:'logged', sentence:`a completion for service ${name}${co}${dt}` };
    }
    case 'moved': {
      const to = nv.toPropertyId && propsById[nv.toPropertyId] ? propsById[nv.toPropertyId].name : 'another property';
      const reason = nv.reason ? ` — ${nv.reason}` : '';
      return { verb:'moved', sentence:`${ent} ${name} to ${to}${reason}` };
    }
    default:
      return { verb:a||'changed', sentence:`${ent} ${name}` };
  }
}

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
  const actionColor = v => v==='deleted'||v==='archived'?T.red
    : v==='completed'||v==='acquired'||v==='logged'?T.accent
    : v==='moved'||v==='assigned'?T.warn
    : v==='changed'?T.primary
    : T.textMid;
  const propsById = Object.fromEntries((properties||[]).map(p=>[p.id,p]));

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
      ) : logs.map(log => {
        const { verb, sentence } = describeLog(log, propsById);
        const prop = propsById[log.property_id];
        return (
        <div key={log.id} style={{ display:'flex', gap:'12px', padding:'10px 14px', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'8px', marginBottom:'6px' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'13px', color:T.text, fontFamily:T.sans, lineHeight:'1.5' }}>
              <span style={{ fontWeight:'700' }}>{log.user_name||'Someone'}</span>
              {' '}
              <span style={{ color:actionColor(verb), fontWeight:'600' }}>{verb}</span>
              {' '}
              <span style={{ color:T.textMid }}>{sentence}</span>
            </div>
            <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginTop:'3px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <span>{fmtDateTime(log.created_at)}</span>
              {prop && filter==='all' && <span>· {prop.icon} {prop.name}</span>}
            </div>
          </div>
        </div>
      );})}
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

// ── Properties Tab (admin) — per-property branding/logo ───────────
function PropertiesTab() {
  const { properties, uploadPropertyLogo, removePropertyLogo } = useProperties();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({});

  const onPick = async (prop, file) => {
    if (!file) return;
    setBusyId(prop.id); setMsg(m => ({ ...m, [prop.id]: '' }));
    const { error } = await uploadPropertyLogo(prop.id, file);
    setMsg(m => ({ ...m, [prop.id]: error ? 'Error: ' + error.message : 'Logo updated ✓' }));
    setBusyId(null);
    setTimeout(() => setMsg(m => ({ ...m, [prop.id]: '' })), 4000);
  };

  const onRemove = async (prop) => {
    setBusyId(prop.id);
    await removePropertyLogo(prop.id);
    setBusyId(null);
  };

  return (
    <div>
      <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'6px' }}>PROPERTY BRANDING</div>
      <div style={{ fontSize:'12px', color:T.textFaint, fontFamily:T.sans, marginBottom:'16px', lineHeight:'1.5' }}>
        Upload a logo for each property. It replaces the emoji icon in the property list and header. PNG or JPG, under 2MB. Square or wide images both work.
      </div>

      {properties.map(prop => (
        <div key={prop.id} style={{ display:'flex', alignItems:'center', gap:'14px', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'14px', marginBottom:'8px' }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'10px', background:prop.logo_url?T.surface:T.primaryFade, border:`1px solid ${prop.logo_url?T.border:T.primaryBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0, overflow:'hidden' }}>
            {prop.logo_url
              ? <img src={prop.logo_url} alt={prop.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:'4px' }}/>
              : prop.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans }}>{prop.name}</div>
            {msg[prop.id] && <div style={{ fontSize:'11px', color:msg[prop.id].includes('Error')?T.red:T.accent, marginTop:'2px', fontFamily:T.sans }}>{msg[prop.id]}</div>}
            <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
              <label style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, color:T.accent, borderRadius:'6px', padding:'5px 12px', cursor:busyId===prop.id?'default':'pointer', fontSize:'12px', fontFamily:T.sans, fontWeight:'600', opacity:busyId===prop.id?0.6:1 }}>
                {busyId===prop.id ? 'Uploading…' : (prop.logo_url ? 'Replace logo' : 'Upload logo')}
                <input type="file" accept="image/*" disabled={busyId===prop.id} onChange={e=>onPick(prop, e.target.files?.[0])} style={{ display:'none' }}/>
              </label>
              {prop.logo_url && (
                <button onClick={()=>onRemove(prop)} disabled={busyId===prop.id} style={{ background:'none', border:`1px solid ${T.border}`, color:T.red, borderRadius:'6px', padding:'5px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────
export default function SettingsPage({ onBack, properties }) {
  const { isAdmin, can } = useAuth();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id:'profile', label:'Profile', icon:<Ic.person/> },
    ...(isAdmin ? [
      { id:'users',    label:'Users',    icon:<Ic.person/> },
      { id:'props',    label:'Branding', icon:<Ic.cog/> },
      { id:'audit',    label:'Audit Log', icon:<Ic.audit/> },
      { id:'app',      label:'Settings', icon:<Ic.cog/> },
    ] : []),
    ...(can('data_export') ? [{ id:'export', label:'Export', icon:<Ic.audit/> }] : []),
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
        {tab==='props'   && <PropertiesTab/>}
        {tab==='audit'   && <AuditTab properties={properties}/>}
        {tab==='app'     && <AppSettingsTab/>}
        {tab==='export'  && <DataExportTab/>}
      </div>
    </div>
  );
}

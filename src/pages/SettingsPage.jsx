import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useUsers';
import { useProperties } from '../hooks/useProperties';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';
import { fmtDate } from '../lib/format';
import { MAT_STATUS } from '../lib/status';
import { ROLES, OVERRIDABLE_CAPABILITIES, roleHasByDefault } from '../lib/permissions';
import { Icon, PageHeader, Page, PropertyBadge, Chip, Field, Sheet, ConfirmSheet, SectionLabel, Loading, Empty, Toast } from '../components/ui';

const DataExportTab = lazy(() => import('./DataExportTab'));
const PROPERTY_ROLES = ['manager', 'technician', 'viewer'];
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const ROLE_TONE = { admin: 'primary', manager: 'info', technician: 'ok', viewer: 'neutral' };

const Card = ({ title, children, style }) => (
  <section style={{ ...S.card, padding: '16px 16px 18px', marginBottom: 14, ...style }}>
    {title && <h2 style={{ ...S.sectionLabel, color: T.text, fontSize: 16, marginBottom: 14 }}>{title}</h2>}
    {children}
  </section>
);
const Msg = ({ m }) => m ? (
  <div role="status" style={{ fontSize: 14, marginTop: 12, padding: '10px 12px', borderRadius: 8,
    color: m.error ? T.red : T.ok, background: m.error ? T.redFade : T.okFade }}>{m.text}</div>
) : null;

// ── Profile ─────────────────────────────────────────────────────────
function ProfileTab() {
  const { profile, refetchProfile, signOutEverywhere } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const saveProfile = async () => {
    if (!fullName.trim()) { setProfileMsg({ error: true, text: 'Name is required.' }); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq('id', profile.id);
    setProfileMsg(error ? { error: true, text: error.message } : { text: 'Profile saved.' });
    if (!error) await refetchProfile();
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPw.length < 6) { setPwMsg({ error: true, text: 'Use at least 6 characters.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ error: true, text: 'The passwords don’t match.' }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwMsg(error ? { error: true, text: error.message } : { text: 'Password updated.' });
    if (!error) { setNewPw(''); setConfirmPw(''); }
    setSaving(false);
  };

  return (
    <div>
      <Card title="Your details">
        <Field label="Full name" htmlFor="pf-name"><input id="pf-name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" style={S.input}/></Field>
        <Field label="Phone (optional)" htmlFor="pf-phone"><input id="pf-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 82 000 0000" autoComplete="tel" style={S.input}/></Field>
        <button onClick={saveProfile} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }}>Save details</button>
        <Msg m={profileMsg}/>
      </Card>

      <Card title="Change password">
        <Field label="New password" htmlFor="pf-pw"><input id="pf-pw" type="password" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" style={S.input}/></Field>
        <Field label="Confirm new password" htmlFor="pf-pw2"><input id="pf-pw2" type="password" autoComplete="new-password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && changePassword()} style={S.input}/></Field>
        <button onClick={changePassword} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }}>Update password</button>
        <Msg m={pwMsg}/>
      </Card>

      <Card title="Sessions">
        <p style={{ margin: '0 0 14px', fontSize: 15, color: T.textMid, lineHeight: 1.5 }}>
          Signed in on a shared or lost device? Sign out everywhere. You'll need to sign in again here too.
        </p>
        <button onClick={() => setConfirmAll(true)} style={{ ...S.btnGhost, color: T.red, borderColor: T.redBorder }}><Icon name="logout" size={18}/> Sign out of all devices</button>
      </Card>

      <div style={{ ...S.meta, textAlign: 'center', padding: '4px 0 8px' }}>Property Tracker · React, Vite and Supabase</div>
      {confirmAll && <ConfirmSheet title="Sign out of all devices?" body="Every device, including this one, will need to sign in again." confirmLabel="Sign out everywhere"
        onConfirm={signOutEverywhere} onClose={() => setConfirmAll(false)}/>}
    </div>
  );
}

// ── Users ───────────────────────────────────────────────────────────
// All property assignments in one query (previously one query per property per user).
function useAllAssignments() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from('property_users').select('property_id, user_id, role');
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const find = (pid, uid) => rows.find(r => r.property_id === pid && r.user_id === uid);
  const set = async (pid, uid, role) => {
    const prev = rows;
    setRows(r => [...r.filter(x => !(x.property_id === pid && x.user_id === uid)), ...(role ? [{ property_id: pid, user_id: uid, role }] : [])]);
    const { error } = role
      ? await supabase.from('property_users').upsert({ property_id: pid, user_id: uid, role }, { onConflict: 'property_id,user_id' })
      : await supabase.from('property_users').delete().eq('property_id', pid).eq('user_id', uid);
    if (error) setRows(prev);
    return { error };
  };
  return { find, set };
}

function CapabilityRow({ user, c, overrides, onChange }) {
  const has = Object.prototype.hasOwnProperty.call(overrides, c.key);
  const value = has ? (overrides[c.key] ? 'on' : 'off') : 'default';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${T.borderLight}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: T.text }}>{c.label}</div>
        <div style={S.meta}>{c.hint}</div>
      </div>
      <select aria-label={c.label} value={value} onChange={e => onChange(c.key, e.target.value === 'default' ? null : e.target.value === 'on')}
        style={{ ...S.input, width: 'auto', minWidth: 132, flexShrink: 0, color: value === 'default' ? T.textMid : value === 'on' ? T.ok : T.red, fontWeight: value === 'default' ? 400 : 600 }}>
        <option value="default">Role default ({roleHasByDefault(user.role, c.key) ? 'on' : 'off'})</option>
        <option value="on">Allowed</option>
        <option value="off">Not allowed</option>
      </select>
    </div>
  );
}

function UserSheet({ user, properties, assignments, api, onClose, onToast }) {
  const [role, setRole] = useState(user.role);
  const [overrides, setOverrides] = useState(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    let live = true;
    api.getUserPermissions(user.id).then(m => { if (live) setOverrides(m); });
    return () => { live = false; };
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRole = async r => {
    setRole(r);
    const { error } = await api.updateUser(user.id, { role: r });
    if (error) { setRole(user.role); onToast(error.message, 'error'); }
  };
  const changeCap = async (key, granted) => {
    await api.updateUserPermission(user.id, key, granted);
    setOverrides(p => { const n = { ...p }; if (granted === null) delete n[key]; else n[key] = granted; return n; });
  };

  return (
    <Sheet title={user.full_name || 'User'} onClose={onClose}>
      <Field label="Overall role">
        <select aria-label="Overall role" value={role} onChange={e => changeRole(e.target.value)} style={S.input}>
          {ROLES.map(r => <option key={r} value={r}>{cap(r)}</option>)}
        </select>
      </Field>

      <div style={S.fieldLabel}>Property access</div>
      <div style={{ marginBottom: 16 }}>
        {properties.map(p => {
          const a = assignments.find(p.id, user.id);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${T.borderLight}` }}>
              <PropertyBadge property={p} size={32}/>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.text }}>{p.name}</span>
              <select aria-label={`Access to ${p.name}`} value={a?.role || ''} onChange={e => assignments.set(p.id, user.id, e.target.value || null)}
                style={{ ...S.input, width: 'auto', minWidth: 132, color: a ? T.text : T.textMid }}>
                <option value="">No access</option>
                {PROPERTY_ROLES.map(r => <option key={r} value={r}>{cap(r)}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      {role !== 'admin' && (
        <div style={{ marginBottom: 16 }}>
          <div style={S.fieldLabel}>Extra permissions</div>
          {overrides === null ? <div style={S.meta}>Loading…</div>
            : OVERRIDABLE_CAPABILITIES.map(c => <CapabilityRow key={c.key} user={{ ...user, role }} c={c} overrides={overrides} onChange={changeCap}/>)}
        </div>
      )}

      <button onClick={() => setConfirming(true)} style={{ ...S.btnGhost, width: '100%', color: T.red, borderColor: T.redBorder }}>Deactivate user</button>
      {confirming && <ConfirmSheet title={`Deactivate ${user.full_name}?`} confirmLabel="Deactivate"
        body="They'll be signed out and can't sign in until you reactivate them. Their history stays."
        onConfirm={async () => { const { error } = await api.deactivateUser(user.id); if (error) onToast(error.message, 'error'); else { onToast(`${user.full_name} deactivated`); onClose(); } }}
        onClose={() => setConfirming(false)}/>}
    </Sheet>
  );
}

function InviteSheet({ properties, api, onClose, onToast }) {
  const [form, setForm] = useState({ email: '', fullName: '', role: 'viewer', defaultPassword: '', assignments: {} });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.email.trim() || !form.fullName.trim()) { setErr('Name and email are required.'); return; }
    if (form.defaultPassword.length < 6) { setErr('The temporary password needs at least 6 characters.'); return; }
    setSaving(true); setErr('');
    const assignments = Object.entries(form.assignments).filter(([, r]) => r).map(([property_id, role]) => ({ property_id, role }));
    const { error } = await api.inviteUser({ email: form.email.trim(), fullName: form.fullName.trim(), role: form.role, defaultPassword: form.defaultPassword, assignments });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onToast(`${form.fullName.trim()} added. They set their own password at first sign-in.`);
    onClose();
  };
  return (
    <Sheet title="Invite user" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create and invite'}</button></>}>
      <Field label="Full name" htmlFor="iv-name"><input id="iv-name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} style={S.input}/></Field>
      <Field label="Email" htmlFor="iv-email"><input id="iv-email" type="email" inputMode="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={S.input}/></Field>
      <Field label="Temporary password" htmlFor="iv-pw" hint="They must change it at first sign-in.">
        <input id="iv-pw" value={form.defaultPassword} onChange={e => setForm(p => ({ ...p, defaultPassword: e.target.value }))} autoComplete="off" style={S.input}/>
      </Field>
      <Field label="Overall role" htmlFor="iv-role">
        <select id="iv-role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={S.input}>
          {ROLES.map(r => <option key={r} value={r}>{cap(r)}</option>)}
        </select>
      </Field>
      <div style={S.fieldLabel}>Property access</div>
      {properties.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${T.borderLight}` }}>
          <PropertyBadge property={p} size={32}/>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: T.text }}>{p.name}</span>
          <select aria-label={`Access to ${p.name}`} value={form.assignments[p.id] || ''} onChange={e => setForm(f => ({ ...f, assignments: { ...f.assignments, [p.id]: e.target.value } }))}
            style={{ ...S.input, width: 'auto', minWidth: 132 }}>
            <option value="">No access</option>
            {PROPERTY_ROLES.map(r => <option key={r} value={r}>{cap(r)}</option>)}
          </select>
        </div>
      ))}
      {err && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14, marginTop: 12 }}>{err}</div>}
    </Sheet>
  );
}

function UsersTab({ properties }) {
  const api = useUsers();
  const assignments = useAllAssignments();
  const [openId, setOpenId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState(null);
  const onToast = (message, tone) => setToast({ message, tone });

  if (api.loading) return <Loading label="Loading users…"/>;
  const active = api.users.filter(u => u.active !== false);
  const inactive = api.users.filter(u => u.active === false);
  const open = api.users.find(u => u.id === openId);

  const avatar = (u, dim) => (
    <span style={{ width: 36, height: 36, borderRadius: 18, background: dim ? T.controlBg : T.primaryFade, color: dim ? T.textMid : T.primary, fontWeight: 700, fontSize: 15,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{u.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
  );
  const rowStyle = i => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '8px 14px', boxSizing: 'border-box',
    background: 'none', border: 'none', borderTop: i ? `1px solid ${T.borderLight}` : 'none', textAlign: 'left', fontFamily: T.sans });
  const reactivate = async u => {
    const { error } = await api.updateUser(u.id, { active: true });
    onToast(error ? error.message : `${u.full_name} reactivated`, error ? 'error' : undefined);
  };
  const row = (u, i) => (
    <button key={u.id} onClick={() => setOpenId(u.id)} style={{ ...rowStyle(i), cursor: 'pointer' }}>
      {avatar(u, false)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{u.full_name}</div>
        <div style={S.meta}>{u.phone || 'No phone'}</div>
      </div>
      <Chip tone={ROLE_TONE[u.role]}>{cap(u.role)}</Chip>
      <Icon name="chevronR" size={18} color={T.textDim}/>
    </button>
  );
  const inactiveRow = (u, i) => (
    <div key={u.id} style={rowStyle(i)}>
      {avatar(u, true)}
      <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: T.textMid }}>{u.full_name}</div>
      <button onClick={() => reactivate(u)} style={{ ...S.btnOutline, height: 36 }}>Reactivate</button>
    </div>
  );

  return (
    <div>
      <SectionLabel style={{ marginBottom: 8 }}>Team ({active.length})</SectionLabel>
      <div style={{ ...S.card, overflow: 'hidden', marginBottom: 12 }}>{active.map(row)}</div>
      <button onClick={() => setInviting(true)} style={S.btnDashed}><Icon name="plus" size={18}/> Invite user</button>

      {inactive.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowInactive(v => !v)} style={{ ...S.btnGhost, border: 'none', background: 'none', padding: 0, color: T.primary }}>
            <Icon name={showInactive ? 'chevronU' : 'chevronD'} size={18}/> Deactivated ({inactive.length})
          </button>
          {showInactive && <div style={{ ...S.card, overflow: 'hidden', marginTop: 8 }}>{inactive.map(inactiveRow)}</div>}
        </div>
      )}

      {open && <UserSheet user={open} properties={properties} assignments={assignments} api={api} onClose={() => setOpenId(null)} onToast={onToast}/>}
      {inviting && <InviteSheet properties={properties} api={api} onClose={() => setInviting(false)} onToast={onToast}/>}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)}/>}
    </div>
  );
}

// ── Activity (audit log) ────────────────────────────────────────────
const ENTITY_LABEL = { task: 'task', subtask: 'subtask', material: 'material', service: 'service', asset: 'asset', livestock: 'animal', property: 'property', room: 'room', user: 'user' };

function describeLog(log, propsById) {
  const ent = ENTITY_LABEL[log.entity_type] || log.entity_type || 'item';
  const name = log.entity_name ? `“${log.entity_name}”` : `a ${ent}`;
  const nv = log.new_value || {};
  const a = log.action;
  if (log.entity_type === 'material' && MAT_STATUS[a]) return { verb: 'marked', rest: `material ${name} ${MAT_STATUS[a].label.toLowerCase()}` };
  switch (a) {
    case 'created':   return { verb: 'added', rest: `${ent} ${name}` };
    case 'deleted':   return { verb: 'deleted', rest: `${ent} ${name}` };
    case 'updated':   return { verb: 'updated', rest: `${ent} ${name}` };
    case 'assigned':  return { verb: 'assigned', rest: `${ent} ${name}` };
    case 'completed': return { verb: 'completed', rest: `${ent} ${name}${nv.note ? ` — “${nv.note}”` : ''}` };
    case 'reopened':  return { verb: 'reopened', rest: `${ent} ${name}` };
    case 'archived':  return { verb: 'archived', rest: `${ent} ${name}` };
    case 'scheduled': return { verb: 'scheduled', rest: `${ent} ${name}${nv.next_due ? ` — next due ${fmtDate(nv.next_due)}` : ''}` };
    case 'logged':    return { verb: 'logged', rest: `${ent} ${name} as done${nv.doneDate ? ` on ${fmtDate(nv.doneDate)}` : ''}${nv.company ? ` (${nv.company})` : ''}` };
    case 'moved': {
      const to = propsById[nv.toPropertyId]?.name || 'another property';
      return { verb: 'moved', rest: `${ent} ${name} to ${to}${nv.reason ? ` — ${nv.reason}` : ''}` };
    }
    default: return { verb: a || 'changed', rest: `${ent} ${name}` };
  }
}
const VERB_COLOR = v => (['deleted', 'archived'].includes(v) ? T.red : ['completed', 'logged'].includes(v) ? T.ok : T.primary);
const fmtWhen = d => (d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function ActivityTab({ properties }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const propsById = Object.fromEntries((properties || []).map(p => [p.id, p]));

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      let q = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
      if (filter !== 'all') q = q.eq('property_id', filter);
      const { data } = await q;
      if (live) { setLogs(data || []); setLoading(false); }
    })();
    return () => { live = false; };
  }, [filter]);

  return (
    <div>
      <Field label="Property" htmlFor="act-filter">
        <select id="act-filter" value={filter} onChange={e => setFilter(e.target.value)} style={S.input}>
          <option value="all">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {loading ? <Loading label="Loading activity…"/> : logs.length === 0 ? <Empty>No activity recorded yet.</Empty> : (
        <div style={{ ...S.card, overflow: 'hidden' }}>
          {logs.map((log, i) => {
            const { verb, rest } = describeLog(log, propsById);
            const prop = propsById[log.property_id];
            return (
              <div key={log.id} style={{ padding: '10px 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
                <div style={{ fontSize: 15, lineHeight: 1.45, color: T.text }}>
                  <strong>{log.user_name || 'Someone'}</strong> <span style={{ color: VERB_COLOR(verb), fontWeight: 600 }}>{verb}</span> <span style={{ color: T.textMid }}>{rest}</span>
                </div>
                <div style={S.meta}>{fmtWhen(log.created_at)}{prop && filter === 'all' ? ` · ${prop.name}` : ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Branding (property logos) ───────────────────────────────────────
function BrandingTab() {
  const { properties, uploadPropertyLogo, removePropertyLogo } = useProperties();
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const pick = async (p, file) => {
    if (!file) return;
    setBusyId(p.id);
    const { error } = await uploadPropertyLogo(p.id, file);
    setBusyId(null);
    setToast(error ? { message: error.message, tone: 'error' } : { message: `${p.name}: logo updated` });
  };

  return (
    <div>
      <p style={{ ...S.meta, fontSize: 14, margin: '0 0 14px', lineHeight: 1.5 }}>
        A logo replaces the icon in the property list. PNG or JPG under 2 MB; square or wide both work.
      </p>
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {properties.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none', flexWrap: 'wrap' }}>
            <PropertyBadge property={p} size={52}/>
            <div style={{ flex: 1, minWidth: 120, fontSize: 15, fontWeight: 600, color: T.text }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ ...S.btnOutline, cursor: busyId === p.id ? 'default' : 'pointer', opacity: busyId === p.id ? 0.6 : 1 }}>
                <Icon name="image" size={16}/>{busyId === p.id ? 'Uploading…' : p.logo_url ? 'Replace' : 'Upload'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busyId === p.id} onChange={e => pick(p, e.target.files?.[0])} style={{ display: 'none' }}/>
              </label>
              {p.logo_url && <button onClick={async () => { setBusyId(p.id); await removePropertyLogo(p.id); setBusyId(null); }} disabled={busyId === p.id} style={{ ...S.btnOutline, color: T.red, borderColor: T.redBorder }}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)}/>}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function SettingsPage({ onBack, properties }) {
  const { isAdmin, can } = useAuth();
  const [tab, setTab] = useState('profile');
  const tabs = [
    ['profile', 'Profile'],
    ...(isAdmin ? [['users', 'Users'], ['branding', 'Branding'], ['activity', 'Activity']] : []),
    ...(can('data_export') ? [['export', 'Export']] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title="Settings" onBack={onBack}/>
      <Page>
        {tabs.length > 1 && (
          <nav aria-label="Settings sections" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px 16px', padding: '0 16px 2px' }}>
            {tabs.map(([id, label]) => {
              const on = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} aria-current={on ? 'page' : undefined}
                  style={{ height: 40, padding: '0 16px', borderRadius: 20, flexShrink: 0, cursor: 'pointer', fontFamily: T.sans, fontSize: 15, fontWeight: on ? 600 : 500,
                    background: on ? T.primary : T.surface, color: on ? T.onPrimary : T.textMid, border: `1px solid ${on ? T.primary : T.border}` }}>
                  {label}
                </button>
              );
            })}
          </nav>
        )}
        {tab === 'profile'  && <ProfileTab/>}
        {tab === 'users'    && <UsersTab properties={properties || []}/>}
        {tab === 'branding' && <BrandingTab/>}
        {tab === 'activity' && <ActivityTab properties={properties || []}/>}
        {tab === 'export'   && <Suspense fallback={<Loading/>}><DataExportTab/></Suspense>}
      </Page>
    </div>
  );
}

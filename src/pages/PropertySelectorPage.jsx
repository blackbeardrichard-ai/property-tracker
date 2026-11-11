import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../hooks/useProperties';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { T, S } from '../lib/theme';
import { Icon, PageHeader, Page, PropertyBadge, Chip, Segmented, Field, Sheet, SectionLabel, Loading, Empty } from '../components/ui';

const ICONS = ['🏠', '🌾', '🌿', '🏡', '🏗️', '🏢', '🌲', '🏕️', '🌴', '🏔️'];
const CHIP = { minHeight: 36, padding: '0 12px', fontSize: 13 };
const initials = name => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function AddPropertySheet({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'residential', icon: '', address: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const { error: err } = await onSave({ ...form, name: form.name.trim(), icon: form.icon || (form.type === 'commercial' ? '🌾' : '🏠') });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  };
  return (
    <Sheet title="Add property" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...S.btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create property'}</button></>}>
      <Field label="Name" htmlFor="prop-name">
        <input id="prop-name" autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Waterfall Farm" style={S.input}/>
      </Field>
      <Field label="Type">
        <Segmented label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={[['residential', 'Residential'], ['commercial', 'Commercial']]}/>
      </Field>
      <Field label="Icon (optional)">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setForm(p => ({ ...p, icon: p.icon === ic ? '' : ic }))} aria-pressed={form.icon === ic}
              style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${form.icon === ic ? T.primary : T.border}`, background: form.icon === ic ? T.primaryFade : T.surface, cursor: 'pointer', fontSize: 20 }}>
              {ic}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Address (optional)" htmlFor="prop-addr">
        <input id="prop-addr" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. Alldays, Limpopo" style={S.input}/>
      </Field>
      {error && <div role="alert" style={{ color: T.red, fontSize: 14, padding: '10px 12px', background: T.redFade, borderRadius: 8 }}>{error}</div>}
    </Sheet>
  );
}

function Tile({ n, label, color }) {
  return (
    <div style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: n ? color : T.textDim }}>{n}</div>
      <div style={{ ...S.meta, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ToolButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.btnGhost, flex: 1, minWidth: 0, padding: '0 10px' }}>
      <Icon name={icon} size={18} color={T.textMid}/>{label}
    </button>
  );
}

export default function PropertySelectorPage({ onSelect, onSettings, onAssetRegister, onSearch, onShoppingList }) {
  const { profile, isAdmin, signOut, can } = useAuth();
  const { properties, loading, addProperty } = useProperties();
  const { stats, totals, loading: statsLoading } = useDashboardStats(properties.map(p => p.id));
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);

  const tools = [
    can('global_search') && { icon: 'search', label: 'Search', onClick: onSearch },
    can('view_shopping_list') && { icon: 'cart', label: 'Shopping', onClick: onShoppingList },
    can('view_asset_register') && { icon: 'box', label: 'Assets', onClick: onAssetRegister },
  ].filter(Boolean);

  const avatar = (
    <button onClick={() => setMenu(true)} aria-label="Account menu" style={{ ...S.iconBtn, marginRight: -6 }}>
      <span style={{ width: 36, height: 36, borderRadius: 18, background: T.primaryFade, color: T.primary, fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(profile?.full_name)}</span>
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title="Property Tracker" right={avatar}/>
      <Page>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.01em' }}>Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</div>
          <div style={{ ...S.meta, marginTop: 2 }}>{loading ? 'Loading…' : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}`}</div>
        </div>

        {!statsLoading && properties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Tile n={totals.overdue} label="Overdue" color={T.red}/>
            <Tile n={totals.toBuy} label="To buy" color={T.primary}/>
            <Tile n={totals.unscheduled} label="No due date" color={T.warn}/>
          </div>
        )}
        {tools.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {tools.map(t => <ToolButton key={t.label} {...t}/>)}
          </div>
        )}

        <SectionLabel style={{ marginBottom: 8 }}>Properties</SectionLabel>
        {loading && <Loading/>}
        {!loading && properties.length === 0 && <Empty>No properties assigned to you yet.</Empty>}
        {properties.map(p => {
          const st = stats[p.id] || { overdue: 0, toBuy: 0, unscheduled: 0 };
          const has = st.overdue || st.toBuy || st.unscheduled;
          return (
            <article key={p.id} style={{ ...S.card, marginBottom: 10, overflow: 'hidden' }}>
              <button onClick={() => onSelect(p)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: has ? '14px 12px 8px 16px' : '14px 12px 14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: T.sans }}>
                <PropertyBadge property={p} size={48}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{p.name}</div>
                  <div style={S.meta}>{p.type === 'commercial' ? 'Commercial' : 'Residential'}{p.address ? ` · ${p.address}` : ''}</div>
                </div>
                <Icon name="chevronR" size={20} color={T.textDim}/>
              </button>
              {has > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 14px 78px' }}>
                  {st.overdue > 0 && <Chip tone="red" style={CHIP} onClick={() => onSelect(p, 'services')}>{st.overdue} overdue</Chip>}
                  {st.toBuy > 0 && <Chip tone="primary" style={CHIP} onClick={() => onSelect(p, 'shopping')}>{st.toBuy} to buy</Chip>}
                  {st.unscheduled > 0 && <Chip tone="warn" style={CHIP} onClick={() => onSelect(p, 'services')}>{st.unscheduled} no due date</Chip>}
                </div>
              )}
            </article>
          );
        })}

        {isAdmin && <button onClick={() => setAdding(true)} style={{ ...S.btnDashed, marginTop: 6 }}><Icon name="plus" size={18}/> Add property</button>}
      </Page>

      {adding && <AddPropertySheet onSave={addProperty} onClose={() => setAdding(false)}/>}
      {menu && (
        <Sheet title={profile?.full_name || 'Account'} onClose={() => setMenu(false)}>
          <div style={{ ...S.meta, margin: '-8px 0 12px', textTransform: 'capitalize' }}>{profile?.role}</div>
          <button onClick={() => { setMenu(false); onSettings(); }} style={{ ...S.menuItem, minHeight: 52 }}><Icon name="settings" color={T.textMid}/> Settings</button>
          <button onClick={() => { setMenu(false); signOut(); }} style={{ ...S.menuItem, minHeight: 52, color: T.red }}><Icon name="logout" color={T.red}/> Sign out</button>
        </Sheet>
      )}
    </div>
  );
}

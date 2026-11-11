import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../hooks/useProperties';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { T, S } from '../lib/theme';
import { fmtDate, daysUntil, freqLabel, plural } from '../lib/format';
import { LocationField, PROPERTY_ICONS } from './property/PropertyDetails';
import { EditableMaterial } from './property/materials';
import { saveMaterialEdit } from '../lib/materials';
import { parseLocation, isLink } from '../lib/location';
import { Icon, PageHeader, Page, PropertyBadge, Chip, Segmented, Field, Sheet, SectionLabel, Loading, Empty } from '../components/ui';

const ICONS = PROPERTY_ICONS;
const CHIP = { minHeight: 36, padding: '0 12px', fontSize: 13 };
const initials = name => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function AddPropertySheet({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'residential', icon: '', address: '', description: '', map_location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    const pin = form.map_location.trim();
    if (pin && !parseLocation(pin) && !isLink(pin)) { setError('The map pin isn’t a link or coordinates.'); return; }
    setSaving(true); setError('');
    const { error: err } = await onSave({ ...form, map_location: form.map_location.trim() || null, name: form.name.trim(), icon: form.icon || (form.type === 'commercial' ? '🌾' : '🏠') });
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
      <LocationField value={form.map_location} onChange={v => setForm(p => ({ ...p, map_location: v }))}/>
      {error && <div role="alert" style={{ color: T.red, fontSize: 14, padding: '10px 12px', background: T.redFade, borderRadius: 8 }}>{error}</div>}
    </Sheet>
  );
}

function Tile({ n, label, color, onClick }) {
  return (
    <button onClick={onClick} disabled={!n} aria-label={`${n} ${label}${n ? ', show list' : ''}`}
      style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px', textAlign: 'left', fontFamily: T.sans, cursor: n ? 'pointer' : 'default', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: n ? color : T.textDim, flex: 1 }}>{n}</span>
        {n > 0 && <Icon name="chevronR" size={16} color={T.textDim}/>}
      </div>
      <div style={{ ...S.meta, marginTop: 2 }}>{label}</div>
    </button>
  );
}

// Everything behind a home tile, grouped by property. Tapping a row opens that property on the right tab.
const CATEGORY = {
  overdue:     { title: 'Overdue services', tab: 'services' },
  toBuy:       { title: 'To buy',           tab: 'shopping' },
  unscheduled: { title: 'Services with no due date', tab: 'services' },
};
function CategorySheet({ kind, items, properties, onOpen, onClose, canEdit, onEditMaterial }) {
  const cfg = CATEGORY[kind];
  const groups = properties.map(p => ({ p, list: items.filter(i => i.property_id === p.id) })).filter(g => g.list.length);
  const line = i => {
    if (kind === 'overdue') {
      const d = -daysUntil(i.next_due);
      return { main: i.name, sub: `${plural(d, 'day')} overdue · was due ${fmtDate(i.next_due)}`, subColor: T.red };
    }
    if (kind === 'toBuy') {
      return { main: i.name, sub: [i.qty ? `${i.qty} ${i.unit || ''}`.trim() : '', i.status === 'ordered' ? 'Ordered' : 'Needed'].filter(Boolean).join(' · ') };
    }
    return { main: i.name, sub: freqLabel(i.freq_months, i.is_recurring) };
  };
  return (
    <Sheet title={`${cfg.title} (${items.length})`} onClose={onClose}>
      {groups.map(({ p, list }) => (
        <section key={p.id} style={{ marginBottom: 16 }}>
          <button onClick={() => onOpen(p, cfg.tab)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.sans, textAlign: 'left' }}>
            <PropertyBadge property={p} size={28}/>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>{p.name}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.primary }}>Open</span>
            <Icon name="chevronR" size={16} color={T.primary}/>
          </button>
          <div style={{ ...S.card, overflow: 'hidden', marginTop: 4 }}>
            {list.map((i, k) => {
              const l = line(i);
              if (kind === 'toBuy' && i.store) return (
                <button key={i.id} onClick={() => onOpen(p, 'store')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '8px 12px 8px 14px', background: 'none', border: 'none',
                    borderTop: k ? `1px solid ${T.borderLight}` : 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.text }}>{i.name}</div>
                    <div style={S.meta}>{`Store: ${Number(i.qty)} left, minimum ${Number(i.min_qty)} ${i.unit || ''}`.trim()}</div>
                  </div>
                  <Icon name="chevronR" size={16} color={T.textDim}/>
                </button>
              );
              if (kind === 'toBuy') return (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '4px 14px', borderTop: k ? `1px solid ${T.borderLight}` : 'none' }}>
                  <EditableMaterial material={i} canEdit={canEdit} sub={l.sub} onSave={patch => onEditMaterial(i, patch)}/>
                </div>
              );
              return (
                <button key={i.id} onClick={() => onOpen(p, cfg.tab)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '8px 12px 8px 14px', background: 'none', border: 'none',
                    borderTop: k ? `1px solid ${T.borderLight}` : 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.text }}>{l.main}</div>
                    {l.sub && <div style={{ ...S.meta, color: l.subColor || T.textDim }}>{l.sub}</div>}
                  </div>
                  <Icon name="chevronR" size={16} color={T.textDim}/>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </Sheet>
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
  const { user, profile, isAdmin, canWrite, signOut, can } = useAuth();
  const { properties, loading, addProperty } = useProperties();
  const { stats, totals, lists, refresh: refreshStats, loading: statsLoading } = useDashboardStats(properties.map(p => p.id));
  const [category, setCategory] = useState(null);
  const [sos, setSos] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);

  const tools = [
    can('global_search') && { icon: 'search', label: 'Search', onClick: onSearch },
    can('view_shopping_list') && { icon: 'cart', label: 'Shopping', onClick: onShoppingList },
    can('view_asset_register') && { icon: 'box', label: 'Assets', onClick: onAssetRegister },
  ].filter(Boolean);

  const avatar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {properties.length > 0 && (
      <button onClick={() => (properties.length === 1 ? onSelect(properties[0], 'emergency') : setSos(true))} aria-label="Emergency"
        style={{ height: 40, padding: '0 12px', borderRadius: 20, border: 'none', background: T.red, color: '#FFFFFF', fontFamily: T.sans, fontSize: 14, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <Icon name="siren" size={18}/> SOS
      </button>
    )}
    <button onClick={() => setMenu(true)} aria-label="Account menu" style={{ ...S.iconBtn, marginRight: -6 }}>
      <span style={{ width: 36, height: 36, borderRadius: 18, background: T.primaryFade, color: T.primary, fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(profile?.full_name)}</span>
    </button>
    </div>
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
            <Tile n={totals.overdue} label="Overdue" color={T.red} onClick={() => setCategory('overdue')}/>
            <Tile n={totals.toBuy} label="To buy" color={T.primary} onClick={() => setCategory('toBuy')}/>
            <Tile n={totals.unscheduled} label="No due date" color={T.warn} onClick={() => setCategory('unscheduled')}/>
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

      {category && <CategorySheet kind={category} items={lists[category]} properties={properties} onClose={() => setCategory(null)}
        canEdit={canWrite} onEditMaterial={async (m, patch) => {
          const res = await saveMaterialEdit(m, patch, { userId: user.id, userName: profile?.full_name });
          if (!res.error) refreshStats();
          return res;
        }}
        onOpen={(p, tab) => { setCategory(null); onSelect(p, tab); }}/>}
      {sos && (
        <Sheet title="Emergency — which property?" onClose={() => setSos(false)}>
          <a href="tel:112" style={{ ...S.btnPrimary, width: '100%', boxSizing: 'border-box', height: 56, background: T.red, borderColor: T.red, textDecoration: 'none', marginBottom: 12, fontSize: 17 }}>
            <Icon name="phone" size={20}/> Call 112 now
          </a>
          {properties.map(p => (
            <button key={p.id} onClick={() => { setSos(false); onSelect(p, 'emergency'); }} style={{ ...S.menuItem, minHeight: 56, fontSize: 16 }}>
              <PropertyBadge property={p} size={32}/> {p.name}
            </button>
          ))}
        </Sheet>
      )}
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

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../hooks/useAssets';
import { T, S } from '../lib/theme';
import { fmtDate, todayISO } from '../lib/format';
import { Icon, Chip, Field, Sheet, ConfirmSheet, ActionMenu, Loading, Empty, Toast } from '../components/ui';

const CATEGORIES = ['Machinery', 'Vehicle', 'Implement', 'Equipment', 'Tool', 'Other'];
const CONDITIONS = [
  { value: 'good',            label: 'Good',            tone: 'ok' },
  { value: 'fair',            label: 'Fair',            tone: 'warn' },
  { value: 'needs_attention', label: 'Needs attention', tone: 'red' },
  { value: 'out_of_service',  label: 'Out of service',  tone: 'neutral' },
];
const condition = v => CONDITIONS.find(c => c.value === v) || CONDITIONS[0];
const fmtRand = v => (v ? `R ${parseFloat(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '');
// Empty form fields go to the database as null, not '' (which date and number columns reject).
const clean = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]));

function ConditionPicker({ value, onChange }) {
  return (
    <div role="group" aria-label="Condition" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {CONDITIONS.map(c => {
        const on = value === c.value;
        return (
          <button key={c.value} onClick={() => onChange(c.value)} aria-pressed={on}
            style={{ height: 40, padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontFamily: T.sans, fontSize: 14, fontWeight: on ? 600 : 500,
              background: on ? T.primary : T.surface, color: on ? T.onPrimary : T.textMid, border: `1px solid ${on ? T.primary : T.border}` }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function AddAssetSheet({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', category: 'Machinery', make: '', model: '', serial_number: '', year: '', purchase_date: '', purchase_price: '', condition: 'good', notes: '' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    const { error } = await onSave(clean({ ...form, name: form.name.trim() }));
    if (error) { setErr(error.message); return; }
    onClose();
  };
  const half = { flex: 1, minWidth: 0 };
  return (
    <Sheet title="Add asset" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Add asset</button></>}>
      <Field label="Name" htmlFor="as-name"><input id="as-name" autoFocus value={form.name} onChange={f('name')} placeholder="e.g. John Deere tractor" style={S.input}/></Field>
      <Field label="Category" htmlFor="as-cat">
        <select id="as-cat" value={form.category} onChange={f('category')} style={S.input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Make" htmlFor="as-make" style={half}><input id="as-make" value={form.make} onChange={f('make')} style={S.input}/></Field>
        <Field label="Model" htmlFor="as-model" style={half}><input id="as-model" value={form.model} onChange={f('model')} style={S.input}/></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Serial no." htmlFor="as-sn" style={half}><input id="as-sn" value={form.serial_number} onChange={f('serial_number')} style={S.input}/></Field>
        <Field label="Year" htmlFor="as-yr" style={half}><input id="as-yr" type="number" inputMode="numeric" min="1900" max="2099" value={form.year} onChange={f('year')} style={S.input}/></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Purchase date" htmlFor="as-pd" style={half}><input id="as-pd" type="date" value={form.purchase_date} onChange={f('purchase_date')} style={S.input}/></Field>
        <Field label="Price, R" htmlFor="as-pp" style={half}><input id="as-pp" type="number" inputMode="decimal" min="0" step="0.01" value={form.purchase_price} onChange={f('purchase_price')} style={S.input}/></Field>
      </div>
      <Field label="Condition"><ConditionPicker value={form.condition} onChange={v => setForm(p => ({ ...p, condition: v }))}/></Field>
      <Field label="Notes (optional)" htmlFor="as-notes"><textarea id="as-notes" rows={2} value={form.notes} onChange={f('notes')} style={S.textarea}/></Field>
      {err && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
    </Sheet>
  );
}

function AssetServiceSheet({ asset, onSave, onClose }) {
  const [form, setForm] = useState({ doneDate: todayISO(), description: '', company: '', invoiceNumber: '', invoiceAmount: '', nextService: '', condition: asset.condition || 'good' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    if (!form.description.trim()) { setErr('required'); return; }
    const res = await onSave(form);
    if (res?.error) { setErr(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Log service" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Log service</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{asset.name}</p>
      <Field label="Date serviced" htmlFor="asl-date"><input id="asl-date" type="date" max={todayISO()} value={form.doneDate} onChange={f('doneDate')} style={S.input}/></Field>
      <Field label="What was done" htmlFor="asl-desc" error={err === 'required' ? 'required' : ''}>
        <input id="asl-desc" value={form.description} onChange={e => { f('description')(e); setErr(''); }} placeholder="e.g. 500 hr service, oil and filters" style={{ ...S.input, borderColor: err === 'required' ? T.red : T.border }}/>
      </Field>
      <Field label="Company or technician (optional)" htmlFor="asl-co"><input id="asl-co" value={form.company} onChange={f('company')} style={S.input}/></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Invoice no." htmlFor="asl-inv" style={{ flex: 1, minWidth: 0 }}><input id="asl-inv" value={form.invoiceNumber} onChange={f('invoiceNumber')} style={S.input}/></Field>
        <Field label="Amount, R" htmlFor="asl-amt" style={{ flex: 1, minWidth: 0 }}><input id="asl-amt" type="number" inputMode="decimal" min="0" step="0.01" value={form.invoiceAmount} onChange={f('invoiceAmount')} style={S.input}/></Field>
      </div>
      <Field label="Next service (optional)" htmlFor="asl-next"><input id="asl-next" type="date" value={form.nextService} onChange={f('nextService')} style={S.input}/></Field>
      <Field label="Condition after service"><ConditionPicker value={form.condition} onChange={v => setForm(p => ({ ...p, condition: v }))}/></Field>
      {err && err !== 'required' && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
    </Sheet>
  );
}

function MoveAssetSheet({ asset, properties, currentPropertyId, onSave, onClose }) {
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const others = properties.filter(p => p.id !== currentPropertyId && p.type === 'commercial');
  return (
    <Sheet title="Move asset" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={() => { if (to) { onSave(to, reason); onClose(); } }} disabled={!to} style={{ ...S.btnPrimary, flex: 2, opacity: to ? 1 : 0.5 }}>Move asset</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{asset.name}</p>
      <Field label="Move to" htmlFor="mv-to">
        <select id="mv-to" value={to} onChange={e => setTo(e.target.value)} style={S.input}>
          <option value="">Select a property</option>
          {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Reason (optional)" htmlFor="mv-why"><input id="mv-why" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Needed for ploughing season" style={S.input}/></Field>
    </Sheet>
  );
}

function AssetCard({ asset, properties, propertyId, perms, api, onDone }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'service' | 'move' | 'delete'
  const logs = [...(asset.asset_service_logs || [])].sort((a, b) => (a.done_date < b.done_date ? 1 : -1));
  const moves = [...(asset.asset_movements || [])].sort((a, b) => (a.moved_date < b.moved_date ? 1 : -1));
  const propName = id => properties.find(p => p.id === id)?.name || 'Unknown';
  const cond = condition(asset.condition);
  const facts = [['Serial no.', asset.serial_number], ['Purchased', asset.purchase_date && fmtDate(asset.purchase_date)], ['Price', fmtRand(asset.purchase_price)], ['Notes', asset.notes]].filter(([, v]) => v);

  return (
    <article style={{ ...S.card, marginBottom: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px 12px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: T.surface2, color: T.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="truck" size={22}/></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{asset.name}</div>
            <div style={S.meta}>{[asset.category, [asset.make, asset.model].filter(Boolean).join(' '), asset.year].filter(Boolean).join(' · ')}</div>
          </div>
          <Chip tone={cond.tone}>{cond.label}</Chip>
        </button>
        <div style={{ paddingRight: 4 }}>
          <ActionMenu title={asset.name} label={`More actions for ${asset.name}`} items={[
            perms.canWrite && { icon: 'wrench', label: 'Log service', onClick: () => setSheet('service') },
            perms.canManage && { icon: 'move', label: 'Move to another property', onClick: () => setSheet('move') },
            perms.canDelete && { icon: 'trash', label: 'Delete asset', danger: true, onClick: () => setSheet('delete') },
          ]}/>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.borderLight}`, padding: '12px 14px 14px' }}>
          {facts.length > 0 && (
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 14px' }}>
              {facts.map(([k, v]) => (
                <div key={k} style={{ background: T.surface2, borderRadius: 8, padding: '8px 10px', gridColumn: k === 'Notes' ? '1 / -1' : undefined }}>
                  <dt style={S.meta}>{k}</dt><dd style={{ margin: 0, fontSize: 14, color: T.text }}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div style={S.fieldLabel}>Service history</div>
          {logs.length === 0 && <div style={{ ...S.meta, marginBottom: 12 }}>No services logged.</div>}
          {logs.slice(0, 5).map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.borderLight}`, fontSize: 14 }}>
              <span style={{ fontWeight: 600, color: T.text, whiteSpace: 'nowrap' }}>{fmtDate(l.done_date)}</span>
              <span style={{ flex: 1, color: T.textMid }}>{l.description}{l.next_service ? <span style={S.meta}> · next {fmtDate(l.next_service)}</span> : null}</span>
              {l.invoice_amount && <span style={{ ...S.meta, whiteSpace: 'nowrap' }}>{fmtRand(l.invoice_amount)}</span>}
            </div>
          ))}
          {moves.length > 0 && (
            <>
              <div style={{ ...S.fieldLabel, marginTop: 12 }}>Movement history</div>
              {moves.map(m => (
                <div key={m.id} style={{ padding: '8px 0', borderTop: `1px solid ${T.borderLight}` }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{propName(m.from_property)} → {propName(m.to_property)}</div>
                  <div style={S.meta}>{fmtDate(m.moved_date)}{m.authoriser?.full_name ? ` · authorised by ${m.authoriser.full_name}` : ''}</div>
                  {m.reason && <div style={{ fontSize: 14, color: T.textMid, marginTop: 2 }}>“{m.reason}”</div>}
                </div>
              ))}
            </>
          )}
          {perms.canWrite && <button onClick={() => setSheet('service')} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="wrench" size={16}/> Log service</button>}
        </div>
      )}

      {sheet === 'service' && <AssetServiceSheet asset={asset} onClose={() => setSheet(null)}
        onSave={async d => { const r = await api.logAssetService(asset.id, d); if (!r?.error) onDone(`${asset.name}: service logged`); return r; }}/>}
      {sheet === 'move' && <MoveAssetSheet asset={asset} properties={properties} currentPropertyId={propertyId} onClose={() => setSheet(null)}
        onSave={(to, reason) => api.moveAsset(asset.id, to, reason).then(() => onDone(`${asset.name} moved to ${propName(to)}`))}/>}
      {sheet === 'delete' && <ConfirmSheet title={`Delete “${asset.name}”?`} body="This can't be undone." onConfirm={() => api.deleteAsset(asset.id)} onClose={() => setSheet(null)}/>}
    </article>
  );
}

export default function AssetsTab({ property, properties }) {
  const { canManage, canWrite, canDelete } = useAuth();
  const api = useAssets(property.id);
  const { assets, loading } = api;
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');

  if (loading) return <Loading label="Loading assets…"/>;

  const categories = ['all', ...new Set(assets.map(a => a.category).filter(Boolean))];
  const filtered = filter === 'all' ? assets : assets.filter(a => a.category === filter);
  const attention = assets.filter(a => a.condition === 'needs_attention' || a.condition === 'out_of_service').length;
  const tiles = [['Assets', assets.length, T.text], ['Good', assets.filter(a => a.condition === 'good').length, T.ok], ['Need attention', attention, T.red]];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tiles.map(([label, n, color]) => (
          <div key={label} style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: n ? color : T.textDim }}>{n}</div>
            <div style={{ ...S.meta, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map(c => {
            const on = filter === c;
            return (
              <button key={c} onClick={() => setFilter(c)} aria-pressed={on}
                style={{ height: 36, padding: '0 14px', borderRadius: 18, flexShrink: 0, cursor: 'pointer', fontFamily: T.sans, fontSize: 14, fontWeight: on ? 600 : 500,
                  background: on ? T.primary : T.surface, color: on ? T.onPrimary : T.textMid, border: `1px solid ${on ? T.primary : T.border}` }}>
                {c === 'all' ? 'All' : c}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? <Empty>{assets.length === 0 ? 'No assets registered yet.' : 'No assets in this category.'}</Empty>
        : filtered.map(a => (
          <AssetCard key={a.id} asset={a} properties={properties || []} propertyId={property.id} perms={{ canManage, canWrite, canDelete }} api={api} onDone={setToast}/>
        ))}

      {canManage && <button onClick={() => setAdding(true)} style={{ ...S.btnDashed, marginTop: 6 }}><Icon name="plus" size={18}/> Add asset</button>}
      {adding && <AddAssetSheet onSave={api.addAsset} onClose={() => setAdding(false)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

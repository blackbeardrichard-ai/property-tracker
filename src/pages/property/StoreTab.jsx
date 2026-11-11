import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/theme';
import { fmtDate } from '../../lib/format';
import { fetchNames } from '../../lib/names';
import { Icon, Field, Sheet, Segmented, ConfirmSheet, ActionMenu, Loading, Empty, Toast, SetupNote, Tiles } from '../../components/ui';

const n = v => Number(v).toLocaleString('en-ZA', { maximumFractionDigits: 2 });
export const isLow = i => i.min_qty != null && Number(i.qty) < Number(i.min_qty);

function ItemSheet({ item, onSave, onClose }) {
  const [f, setF] = useState({ name: item?.name || '', unit: item?.unit || '', min_qty: item?.min_qty ?? '', qty: item ? '' : '' });
  const [e, setE] = useState('');
  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));
  const save = async () => {
    if (!f.name.trim()) { setE('Name the item.'); return; }
    const row = { name: f.name.trim(), unit: f.unit.trim() || null, min_qty: f.min_qty === '' ? null : Number(f.min_qty) };
    const res = await onSave(row, item ? null : (f.qty === '' ? 0 : Number(f.qty)));
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title={item ? 'Edit store item' : 'Add store item'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <Field label="Item" htmlFor="si-n"><input id="si-n" autoFocus={!item} value={f.name} onChange={set('name')} placeholder="e.g. Cattle lick 40 kg" style={S.input}/></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Unit" htmlFor="si-u" style={{ flex: 1, minWidth: 0 }}><input id="si-u" value={f.unit} onChange={set('unit')} placeholder="bags, L, rolls…" style={S.input}/></Field>
        <Field label="Minimum to keep" htmlFor="si-m" style={{ flex: 1, minWidth: 0 }}><input id="si-m" type="number" inputMode="decimal" min="0" value={f.min_qty} onChange={set('min_qty')} style={S.input}/></Field>
      </div>
      {!item && <Field label="In the store now" htmlFor="si-q"><input id="si-q" type="number" inputMode="decimal" min="0" value={f.qty} onChange={set('qty')} style={S.input}/></Field>}
      <p style={{ ...S.meta, margin: '0 0 8px' }}>When it drops below the minimum it shows on the Shopping list.</p>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

export function MoveSheet({ item, initialKind = 'out', onSave, onClose }) {
  const [kind, setKind] = useState(initialKind);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [e, setE] = useState('');
  const after = qty === '' ? null : kind === 'in' ? Number(item.qty) + Number(qty) : kind === 'out' ? Math.max(0, Number(item.qty) - Number(qty)) : Number(qty);
  const save = async () => {
    if (qty === '' || Number(qty) < 0) { setE('Enter the quantity.'); return; }
    if (kind === 'out' && Number(qty) > Number(item.qty)) { setE(`Only ${n(item.qty)} in the store. Do a count if that's wrong.`); return; }
    const res = await onSave({ kind, qty: Number(qty), price_excl: kind === 'in' && price !== '' ? Number(price) : null, note: note.trim() || null });
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title={item.name} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <Field label="What happened"><Segmented label="What happened" value={kind} onChange={setKind} options={[['out', 'Taken out'], ['in', 'Stock in'], ['count', 'Counted']]}/></Field>
      <Field label={kind === 'count' ? `Counted, ${item.unit || 'units'}` : `Quantity, ${item.unit || 'units'}`} htmlFor="mv-q"
        hint={after != null ? `Store will show ${n(after)} ${item.unit || ''}`.trim() : `Now ${n(item.qty)} ${item.unit || ''}`.trim()}>
        <input id="mv-q" autoFocus type="number" inputMode="decimal" min="0" value={qty} onChange={ev => { setQty(ev.target.value); setE(''); }} style={S.input}/>
      </Field>
      {kind === 'in' && <Field label="Total paid, R excl. VAT (optional)" htmlFor="mv-p"><input id="mv-p" type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={ev => setPrice(ev.target.value)} style={S.input}/></Field>}
      <Field label="Note (optional)" htmlFor="mv-n"><input id="mv-n" value={note} onChange={ev => setNote(ev.target.value)} placeholder={kind === 'out' ? 'e.g. North camp' : kind === 'in' ? 'e.g. Supplier' : ''} style={S.input}/></Field>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

// Store movement: the database adds or subtracts it from the item (trigger in the farm-features SQL).
export async function recordMove(propertyId, item, move) {
  const { error } = await supabase.from('store_moves').insert({ item_id: item.id, property_id: propertyId, ...move });
  return { error };
}

export default function StoreTab({ property, storeApi }) {
  const { canWrite, canManage } = useAuth();
  const items = storeApi;
  const [moves, setMoves] = useState([]);
  const [names, setNames] = useState({});
  const [sheet, setSheet] = useState(null);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!open) return;
    supabase.from('store_moves').select('*').eq('item_id', open).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      setMoves(data || []); fetchNames((data || []).map(m => m.created_by)).then(setNames);
    });
  }, [open, items.rows]);

  if (items.loading) return <Loading label="Loading store…"/>;
  if (items.missing) return <SetupNote what="The store"/>;

  const low = items.rows.filter(isLow);
  const list = filter === 'low' ? low : items.rows;

  const move = async (item, m) => {
    const res = await recordMove(property.id, item, m);
    if (res.error) return res;
    const q = m.kind === 'in' ? Number(item.qty) + m.qty : m.kind === 'out' ? Math.max(0, Number(item.qty) - m.qty) : m.qty;
    items.refresh();
    setToast(`${item.name}: ${n(q)} ${item.unit || ''} in store`);
    return {};
  };

  return (
    <div>
      <Tiles items={[[String(items.rows.length), 'Items'], [String(low.length), 'Below minimum', T.red]]}/>
      <div style={{ marginBottom: 12 }}><Segmented label="Show" value={filter} onChange={setFilter} options={[['all', 'All'], ['low', 'Below minimum']]}/></div>
      {list.length === 0 ? <Empty>{items.rows.length ? 'Nothing below minimum.' : 'Nothing in the store list yet.'}</Empty> : (
        <div style={{ ...S.card, overflow: 'hidden' }}>
          {list.map((i, k) => (
            <div key={i.id} style={{ borderTop: k ? `1px solid ${T.borderLight}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 60, padding: '6px 4px 6px 14px' }}>
                <button onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id}
                  style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.text }}>{i.name}</div>
                    <div style={S.meta}>{i.min_qty != null ? `Min ${n(i.min_qty)} ${i.unit || ''}` : 'No minimum'}</div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isLow(i) ? T.red : T.text, whiteSpace: 'nowrap' }}>{n(i.qty)} {i.unit || ''}</span>
                </button>
                {canWrite && <button onClick={() => setSheet({ move: i })} style={{ ...S.btnOutline, height: 36, marginLeft: 6 }}>Update</button>}
                {canManage && <ActionMenu title={i.name} label={`More actions for ${i.name}`} items={[
                  { icon: 'pencil', label: 'Edit item', onClick: () => setSheet({ edit: i }) },
                  { icon: 'trash', label: 'Delete item', danger: true, onClick: () => setSheet({ del: i }) },
                ]}/>}
              </div>
              {open === i.id && (
                <div style={{ padding: '0 14px 10px' }}>
                  {moves.length === 0 && <div style={S.meta}>No movements yet.</div>}
                  {moves.map(m => (
                    <div key={m.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: `1px solid ${T.borderLight}`, fontSize: 14 }}>
                      <span style={{ flex: 1, color: T.textMid }}>{fmtDate(m.created_at)} · {{ in: 'Stock in', out: 'Taken out', count: 'Counted' }[m.kind]}{m.note ? ` · ${m.note}` : ''}{names[m.created_by] ? ` · ${names[m.created_by]}` : ''}</span>
                      <b style={{ color: m.kind === 'in' ? T.ok : T.text }}>{m.kind === 'in' ? '+' : m.kind === 'out' ? '−' : '='}{n(m.qty)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && <button onClick={() => setSheet({ add: true })} style={{ ...S.btnDashed, marginTop: 12 }}><Icon name="plus" size={18}/> Add store item</button>}

      {sheet?.add && <ItemSheet onClose={() => setSheet(null)} onSave={async (row, qty) => {
        const res = await items.add({ ...row, qty: 0 }, row.name);
        if (res.error) return res;
        if (qty) await recordMove(property.id, res.data, { kind: 'count', qty, note: 'Opening count' });
        items.refresh();
        return {};
      }}/>}
      {sheet?.edit && <ItemSheet item={sheet.edit} onClose={() => setSheet(null)} onSave={row => items.update(sheet.edit.id, row, row.name)}/>}
      {sheet?.move && <MoveSheet item={sheet.move} onClose={() => setSheet(null)} onSave={m => move(sheet.move, m)}/>}
      {sheet?.del && <ConfirmSheet title={`Delete “${sheet.del.name}”?`} body="Its movement history is deleted too. This can't be undone." onConfirm={() => items.remove(sheet.del.id, sheet.del.name)} onClose={() => setSheet(null)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

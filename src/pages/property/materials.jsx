import { useState } from 'react';
import { T, S } from '../../lib/theme';
import { MAT_STATUS, MATERIAL_STATUSES, matStatus } from '../../lib/status';
import { Sheet, Field, Icon } from '../../components/ui';
import { PhotoStrip, usePhotos } from '../../components/photos';

// ── Unit picker: searchable, with aliases; the user must tap a row ──
const UNIT_DATA = [
  { label: 'mm',       aliases: ['millimeter', 'millimetre', 'milli'] },
  { label: 'mm²',      aliases: ['mm2', 'square mm', 'sq mm'] },
  { label: 'mm³',      aliases: ['mm3', 'cubic mm'] },
  { label: 'm',        aliases: ['meter', 'metre', 'meters', 'metres', 'linear'] },
  { label: 'm²',       aliases: ['m2', 'square meter', 'square metre', 'sqm', 'sq m', 'area', 'square'] },
  { label: 'm³',       aliases: ['m3', 'cube', 'cubic', 'cubic meter', 'sand', 'stone', 'gravel', 'fill'] },
  { label: 'ml',       aliases: ['milliliter', 'millilitre'] },
  { label: 'L',        aliases: ['liter', 'litre', 'liters', 'litres', 'liquid', 'l'] },
  { label: 'g',        aliases: ['gram', 'grams'] },
  { label: 'kg',       aliases: ['kilogram', 'kilograms', 'kilo', 'kilos'] },
  { label: 'pcs',      aliases: ['pieces', 'piece', 'each', 'items', 'item', 'units', 'unit', 'pc', 'number', 'qty'] },
  { label: 'bag',      aliases: ['bags', 'sack', 'sacks'] },
  { label: 'sheet',    aliases: ['sheets', 'board', 'boards', 'panel', 'panels'] },
  { label: 'bucket',   aliases: ['buckets', 'pail'] },
  { label: 'length',   aliases: ['lengths', 'bar', 'bars', 'stick', 'rod'] },
  { label: 'set',      aliases: ['sets', 'kit', 'kits'] },
  { label: 'pair',     aliases: ['pairs', 'double'] },
  { label: 'Roll 100', aliases: ['roll', 'rolls', 'reel', 'roll100'] },
  { label: 'Roll 500', aliases: ['roll500'] },
  { label: 'Box 50',   aliases: ['box', 'boxes', 'box50', 'carton'] },
  { label: 'Box 100',  aliases: ['box100'] },
  { label: 'packet',   aliases: ['packets', 'pack', 'packs'] },
  { label: 'pallet',   aliases: ['pallets', 'skid'] },
  { label: 'Other',    aliases: ['custom', 'specify', 'other'] },
];
const norm = s => s.toLowerCase().trim().replace(/²/g, '2').replace(/³/g, '3');
const filterUnits = q => {
  if (!q.trim()) return UNIT_DATA;
  const n = norm(q);
  return UNIT_DATA.filter(u => norm(u.label).includes(n) || u.aliases.some(a => norm(a).includes(n)));
};

function UnitPicker({ value, onChange, invalid }) {
  const [search, setSearch] = useState('');
  const list = filterUnits(search);
  return (
    <div>
      {value && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 12px', borderRadius: T.radiusSm, background: T.primaryFade, color: T.primary, fontWeight: 600, fontSize: 15 }}>
            <Icon name="check" size={18}/> {value}
          </div>
          <button onClick={() => { onChange(''); setSearch(''); }} style={S.btnGhost}>Change</button>
        </div>
      )}
      {(!value || search) && (
        <>
          <input aria-label="Search units" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search — m², m³, kg, bag…" style={{ ...S.input, marginBottom: 8, borderColor: invalid ? T.red : T.border }}/>
          <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface }}>
            {list.length === 0 && <div style={{ padding: 14, fontSize: 14, color: T.textDim, textAlign: 'center' }}>No match — try “Other”</div>}
            {list.map(u => (
              <button key={u.label} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(u.label); setSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 48, padding: '0 14px', border: 'none', borderBottom: `1px solid ${T.borderLight}`,
                  background: value === u.label ? T.primaryFade : T.surface, color: value === u.label ? T.primary : T.text, fontSize: 15, fontWeight: value === u.label ? 600 : 400, textAlign: 'left', cursor: 'pointer' }}>
                {u.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Add a material, or (with `material`) correct its name, quantity or unit.
export function MaterialSheet({ material, onSave, onClose }) {
  const editing = !!material;
  const [name, setName] = useState(material?.name || '');
  const [qty, setQty] = useState(material?.qty ?? '');
  const [unit, setUnit] = useState(material?.unit || '');
  const [errors, setErrors] = useState({});
  const [saveErr, setSaveErr] = useState('');
  const [price, setPrice] = useState(material?.price_excl ?? '');
  const [supplier, setSupplier] = useState(material?.supplier || '');
  const submit = async () => {
    const e = {};
    if (!name.trim()) e.name = 'required';
    if (!unit) e.unit = 'required';
    if (Object.keys(e).length) { setErrors(e); return; }
    const patch = { name: name.trim(), qty: qty === '' ? null : qty, unit };
    if (editing) {
      // Price and supplier are only sent when entered or changed (columns from the farm-features SQL).
      const p = price === '' ? null : Number(price);
      if (p !== (material.price_excl ?? null)) patch.price_excl = p;
      if ((supplier.trim() || null) !== (material.supplier || null)) patch.supplier = supplier.trim() || null;
    }
    const res = await onSave(patch);
    if (res?.error) { setSaveErr(res.error.message || 'Couldn’t save. Try again.'); return; }
    onClose();
  };
  return (
    <Sheet title={editing ? 'Edit material' : 'Add material'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={submit} style={{ ...S.btnPrimary, flex: 2 }}>{editing ? 'Save' : 'Add material'}</button></>}>
      <Field label="Material" htmlFor="mat-name" error={errors.name}>
        <input id="mat-name" autoFocus={!editing} value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
          placeholder="e.g. River sand" style={{ ...S.input, borderColor: errors.name ? T.red : T.border }}/>
      </Field>
      <Field label="Quantity (optional)" htmlFor="mat-qty">
        <input id="mat-qty" value={qty} onChange={e => setQty(e.target.value)} type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 2.5" style={S.input}/>
      </Field>
      <Field label="Unit" error={errors.unit}>
        <UnitPicker value={unit} invalid={!!errors.unit} onChange={v => { setUnit(v); setErrors(p => ({ ...p, unit: '' })); }}/>
      </Field>
      {editing && <MaterialExtras material={material} price={price} setPrice={setPrice} supplier={supplier} setSupplier={setSupplier}/>}
      {saveErr && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{saveErr}</div>}
    </Sheet>
  );
}

// ── Status control, shared by Tasks and Shopping ───────────────────
//   canEditStatusBack: tap → pick any status
//   canWrite:          one-tap forward ("Mark ordered" → "Mark delivered" → "Mark used")
//   otherwise:         read-only chip
export function MaterialStatusControl({ material, canWrite, canEditStatusBack, onAdvance, onSetStatus, compact = false }) {
  const [picking, setPicking] = useState(false);
  const st = matStatus(material);
  const cfg = MAT_STATUS[st];
  const chip = { ...S.chip, color: cfg.color, background: cfg.bg };

  if (canEditStatusBack) {
    return (
      <>
        <button onClick={() => setPicking(true)} aria-label={`Status: ${cfg.label}. Change`}
          style={{ ...chip, height: 36, padding: '0 10px', border: `1px solid ${cfg.border}`, cursor: 'pointer', fontSize: 13 }}>
          {cfg.label} <Icon name="chevronD" size={14}/>
        </button>
        {picking && (
          <Sheet title={material.name} onClose={() => setPicking(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MATERIAL_STATUSES.map(s => {
                const c = MAT_STATUS[s]; const on = s === st;
                return (
                  <button key={s} onClick={() => { if (!on) onSetStatus(s); setPicking(false); }}
                    style={{ ...S.menuItem, minHeight: 52, border: `1px solid ${on ? c.border : T.borderLight}`, background: on ? c.bg : T.surface, color: c.color, fontWeight: on ? 700 : 500 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: c.color }}/> {c.label}
                    {on && <span style={{ marginLeft: 'auto', fontSize: 13, color: T.textDim }}>current</span>}
                  </button>
                );
              })}
            </div>
          </Sheet>
        )}
      </>
    );
  }
  if (canWrite && cfg.next) {
    return (
      <button onClick={onAdvance} style={{ ...S.btnOutline, borderColor: MAT_STATUS[cfg.next].border, color: MAT_STATUS[cfg.next].color, height: compact ? 36 : 40 }}>
        {cfg.nextLabel}
      </button>
    );
  }
  return <span style={chip}>{cfg.label}</span>;
}

// A material's name and details; tapping it opens the edit sheet when the user may edit.
export function EditableMaterial({ material, canEdit, onSave, sub, struck }) {
  const [editing, setEditing] = useState(false);
  const body = (
    <>
      <div style={{ fontSize: 15, lineHeight: 1.35, color: struck ? T.textDim : T.text, textDecoration: struck ? 'line-through' : 'none' }}>
        {material.name}
        {canEdit && <Icon name="pencil" size={13} color={T.textDim} style={{ marginLeft: 6, verticalAlign: '-1px' }}/>}
      </div>
      {sub && <div style={S.meta}>{sub}</div>}
    </>
  );
  if (!canEdit) return <div style={{ flex: 1, minWidth: 0 }}>{body}</div>;
  return (
    <>
      <button onClick={() => setEditing(true)} aria-label={`Edit ${material.name}`}
        style={{ flex: 1, minWidth: 0, minHeight: 44, padding: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
        {body}
      </button>
      {editing && <MaterialSheet material={material} onSave={onSave} onClose={() => setEditing(false)}/>}
    </>
  );
}

// Price, supplier and slip photos — shown when editing an existing material.
function MaterialExtras({ material, price, setPrice, supplier, setSupplier }) {
  const photos = usePhotos('material', [material.id], material.property_id);
  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Price, R excl. VAT" htmlFor="mat-price" style={{ flex: 1, minWidth: 0 }} hint="Total for this line">
          <input id="mat-price" type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={S.input}/>
        </Field>
        <Field label="Supplier" htmlFor="mat-sup" style={{ flex: 1, minWidth: 0 }}>
          <input id="mat-sup" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Builders" style={S.input}/>
        </Field>
      </div>
      <div style={S.fieldLabel}>Slip or photos</div>
      <PhotoStrip photos={photos.byId[material.id] || []} canAdd onAdd={f => photos.add(material.id, f)} onDelete={photos.remove} style={{ marginBottom: 14 }}/>
    </>
  );
}

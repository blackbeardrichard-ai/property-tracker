import { useState } from 'react';
import { T, S } from '../../lib/theme';
import { MAT_STATUS, MATERIAL_STATUSES, matStatus } from '../../lib/status';
import { Sheet, Field, Icon } from '../../components/ui';

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

export function MaterialSheet({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [errors, setErrors] = useState({});
  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'required';
    if (!unit) e.unit = 'required';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name: name.trim(), qty: qty || null, unit });
    onClose();
  };
  return (
    <Sheet title="Add material" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={submit} style={{ ...S.btnPrimary, flex: 2 }}>Add material</button></>}>
      <Field label="Material" htmlFor="mat-name" error={errors.name}>
        <input id="mat-name" autoFocus value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
          placeholder="e.g. River sand" style={{ ...S.input, borderColor: errors.name ? T.red : T.border }}/>
      </Field>
      <Field label="Quantity (optional)" htmlFor="mat-qty">
        <input id="mat-qty" value={qty} onChange={e => setQty(e.target.value)} type="number" inputMode="decimal" min="0" step="any" placeholder="e.g. 2.5" style={S.input}/>
      </Field>
      <Field label="Unit" error={errors.unit}>
        <UnitPicker value={unit} invalid={!!errors.unit} onChange={v => { setUnit(v); setErrors(p => ({ ...p, unit: '' })); }}/>
      </Field>
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

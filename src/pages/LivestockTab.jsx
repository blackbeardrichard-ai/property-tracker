import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLivestock } from '../hooks/useLivestock';
import { T, S } from '../lib/theme';
import { fmtDate, todayISO, daysUntil } from '../lib/format';
import { Icon, Chip, Segmented, Field, Sheet, ConfirmSheet, ActionMenu, Loading, Empty, Toast, SectionLabel } from '../components/ui';
import { PhotoPicker, PhotoStrip, usePhotos } from '../components/photos';

const SPECIES = ['Cattle', 'Sheep', 'Goat', 'Pig', 'Horse', 'Donkey', 'Other'];
const GAME = ['Impala', 'Kudu', 'Blue wildebeest', 'Zebra', 'Warthog', 'Bushbuck', 'Nyala', 'Eland', 'Giraffe', 'Waterbuck', 'Red hartebeest', 'Gemsbok', 'Blesbok', 'Springbok', 'Other'];
const EVENT_TYPES = [
  { value: 'treatment', label: 'Dip / vaccinate / treat' },
  { value: 'weighing',  label: 'Weighing' },
  { value: 'movement',  label: 'Move to area' },
  { value: 'birth',     label: 'Birth' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'calving',   label: 'Calving' },
  { value: 'sale',      label: 'Sale' },
  { value: 'death',     label: 'Death' },
  { value: 'other',     label: 'Other' },
];
const GROUP_TYPES = ['treatment', 'movement', 'other'];
const STATUS = { alive: ['Alive', 'ok'], deceased: ['Deceased', 'red'], sold: ['Sold', 'neutral'] };
const evLabel = v => EVENT_TYPES.find(e => e.value === v)?.label || v;
const fmtRand = v => (v || v === 0 ? `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '');
const label = a => [a.tag_number, a.name].filter(Boolean).join(' · ') || a.species;
const inWithdrawal = a => a.status === 'alive' && a.withdrawal_until && daysUntil(a.withdrawal_until) >= 0;
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1, d + Number(n)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const err = e => e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>;

function PillGroup({ options, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} aria-pressed={on}
            style={{ height: 40, padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontFamily: T.sans, fontSize: 14, fontWeight: on ? 600 : 500,
              background: on ? T.primary : T.surface, color: on ? T.onPrimary : T.textMid, border: `1px solid ${on ? T.primary : T.border}` }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

const AreaSelect = ({ id, areas, value, onChange, none = 'No area' }) => (
  <select id={id} value={value} onChange={e => onChange(e.target.value)} style={S.input}>
    <option value="">{none}</option>
    {areas.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
  </select>
);

// ── Sheets ──────────────────────────────────────────────────────────
function AddAnimalSheet({ animals, areas, onSave, onClose }) {
  const [form, setForm] = useState({ species: 'Cattle', breed: '', tag_number: '', name: '', gender: 'female', dob: '', mother_id: '', area_id: '', weight_kg: '', purchase_date: '', purchase_price: '', notes: '' });
  const [e, setE] = useState('');
  const f = k => ev => setForm(p => ({ ...p, [k]: ev.target.value }));
  const mothers = animals.filter(a => a.gender === 'female' && a.status === 'alive' && a.species === form.species);
  const half = { flex: 1, minWidth: 0 };
  const save = async () => {
    if (!form.tag_number.trim() && !form.name.trim()) { setE('Give a tag number or a name.'); return; }
    const nul = v => (v === '' ? null : v);
    const row = { species: form.species, breed: nul(form.breed), tag_number: nul(form.tag_number.trim()), name: nul(form.name.trim()), gender: form.gender,
      dob: nul(form.dob), mother_id: nul(form.mother_id), purchase_date: nul(form.purchase_date), purchase_price: nul(form.purchase_price), notes: nul(form.notes), status: 'alive' };
    if (form.area_id) row.area_id = form.area_id;
    if (form.weight_kg) { row.weight_kg = Number(form.weight_kg); row.weight_date = todayISO(); }
    const { error } = await onSave(row);
    if (error) { setE(error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Add tagged animal" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Add animal</button></>}>
      <Field label="Species" htmlFor="an-sp"><select id="an-sp" value={form.species} onChange={f('species')} style={S.input}>{SPECIES.map(s => <option key={s}>{s}</option>)}</select></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Tag no." htmlFor="an-tag" style={half}><input id="an-tag" value={form.tag_number} onChange={f('tag_number')} placeholder="e.g. T014" style={S.input}/></Field>
        <Field label="Name (optional)" htmlFor="an-name" style={half}><input id="an-name" value={form.name} onChange={f('name')} style={S.input}/></Field>
      </div>
      <Field label="Sex"><Segmented label="Sex" value={form.gender} onChange={v => setForm(p => ({ ...p, gender: v }))} options={[['female', 'Female'], ['male', 'Male'], ['unknown', 'Unknown']]}/></Field>
      <Field label="Area" htmlFor="an-area"><AreaSelect id="an-area" areas={areas} value={form.area_id} onChange={v => setForm(p => ({ ...p, area_id: v }))}/></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Breed (optional)" htmlFor="an-br" style={half}><input id="an-br" value={form.breed} onChange={f('breed')} placeholder="e.g. Brahman" style={S.input}/></Field>
        <Field label="Weight, kg (optional)" htmlFor="an-kg" style={half}><input id="an-kg" type="number" inputMode="decimal" min="0" value={form.weight_kg} onChange={f('weight_kg')} style={S.input}/></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Date of birth" htmlFor="an-dob" style={half}><input id="an-dob" type="date" value={form.dob} onChange={f('dob')} style={S.input}/></Field>
        <Field label="Mother (optional)" htmlFor="an-mom" style={half}>
          <select id="an-mom" value={form.mother_id} onChange={f('mother_id')} style={S.input}>
            <option value="">None</option>
            {mothers.map(a => <option key={a.id} value={a.id}>{label(a)}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Purchase date" htmlFor="an-pd" style={half}><input id="an-pd" type="date" value={form.purchase_date} onChange={f('purchase_date')} style={S.input}/></Field>
        <Field label="Price, R excl. VAT" htmlFor="an-pp" style={half}><input id="an-pp" type="number" inputMode="decimal" min="0" step="0.01" value={form.purchase_price} onChange={f('purchase_price')} style={S.input}/></Field>
      </div>
      <Field label="Notes (optional)" htmlFor="an-notes"><textarea id="an-notes" rows={2} value={form.notes} onChange={f('notes')} style={S.textarea}/></Field>
      {err(e)}
    </Sheet>
  );
}

function EventFields({ form, setForm, areas }) {
  const f = k => ev => setForm(p => ({ ...p, [k]: ev.target.value }));
  const et = form.eventType;
  const until = et === 'treatment' && Number(form.withdrawalDays) > 0 && form.eventDate ? addDays(form.eventDate, form.withdrawalDays) : null;
  return (
    <>
      <Field label="Date" htmlFor="ev-date"><input id="ev-date" type="date" max={todayISO()} value={form.eventDate} onChange={f('eventDate')} style={S.input}/></Field>
      {et === 'treatment' && (
        <>
          <Field label="Product" htmlFor="ev-prod"><input id="ev-prod" value={form.product} onChange={f('product')} placeholder="e.g. Triatix, Lumpy skin vaccine" style={S.input}/></Field>
          <Field label="Withdrawal period, days" htmlFor="ev-wd" hint={until ? `No slaughter or sale before ${fmtDate(until)}.` : 'From the product label. Leave blank if none.'}>
            <input id="ev-wd" type="number" inputMode="numeric" min="0" value={form.withdrawalDays} onChange={f('withdrawalDays')} style={S.input}/>
          </Field>
        </>
      )}
      {et === 'weighing' && <Field label="Weight, kg" htmlFor="ev-kg"><input id="ev-kg" type="number" inputMode="decimal" min="0" value={form.weightKg} onChange={f('weightKg')} style={S.input}/></Field>}
      {et === 'movement' && <Field label="Move to" htmlFor="ev-area"><AreaSelect id="ev-area" areas={areas} value={form.areaId} onChange={v => setForm(p => ({ ...p, areaId: v }))} none="Choose an area"/></Field>}
      <Field label="Details (optional)" htmlFor="ev-desc">
        <textarea id="ev-desc" rows={2} value={form.description} onChange={f('description')} style={S.textarea}
          placeholder={et === 'death' ? 'Cause and circumstances' : et === 'sale' ? 'Buyer, conditions' : 'Details'}/>
      </Field>
      {['treatment', 'death', 'sale'].includes(et) && (
        <Field label={et === 'sale' ? 'Buyer' : 'Vet or supplier'} htmlFor="ev-co"><input id="ev-co" value={form.company} onChange={f('company')} style={S.input}/></Field>
      )}
      {['treatment', 'sale', 'other'].includes(et) && (
        <Field label={et === 'sale' ? 'Amount, R excl. VAT' : 'Cost, R excl. VAT'} htmlFor="ev-cost"><input id="ev-cost" type="number" inputMode="decimal" min="0" step="0.01" value={form.cost} onChange={f('cost')} style={S.input}/></Field>
      )}
      <PhotoPicker files={form.files} setFiles={fn => setForm(p => ({ ...p, files: typeof fn === 'function' ? fn(p.files) : fn }))}/>
      {et === 'death' && <div style={{ background: T.redFade, border: `1px solid ${T.redBorder}`, color: T.red, borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12 }}>This marks the animal as deceased.</div>}
      {et === 'sale' && <div style={{ background: T.warnFade, border: `1px solid ${T.warnBorder}`, color: T.warn, borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12 }}>This marks the animal as sold.</div>}
    </>
  );
}
const blankEvent = type => ({ eventType: type, eventDate: todayISO(), description: '', company: '', cost: '', product: '', withdrawalDays: '', weightKg: '', areaId: '', files: [] });
const eventProblem = f => (f.eventType === 'movement' && !f.areaId ? 'Choose the area to move to.' : f.eventType === 'weighing' && !f.weightKg ? 'Enter the weight.' : '');

function EventSheet({ animal, areas, onSave, onClose }) {
  const [form, setForm] = useState(blankEvent('treatment'));
  const [e, setE] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const p = eventProblem(form); if (p) { setE(p); return; }
    setBusy(true); const res = await onSave(form); setBusy(false);
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Log event" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={busy} style={{ ...(form.eventType === 'death' ? S.btnDanger : S.btnPrimary), flex: 2 }}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{label(animal)}</p>
      <Field label="Event" htmlFor="ev-type">
        <select id="ev-type" value={form.eventType} onChange={ev => setForm(p => ({ ...p, eventType: ev.target.value }))} style={S.input}>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <EventFields form={form} setForm={setForm} areas={areas}/>
      {err(e)}
    </Sheet>
  );
}

function GroupEventSheet({ animals, areas, onSave, onClose }) {
  const alive = animals.filter(a => a.status === 'alive');
  const [form, setForm] = useState(blankEvent('treatment'));
  const [area, setArea] = useState('all');
  const [picked, setPicked] = useState(() => new Set(alive.map(a => a.id)));
  const [choosing, setChoosing] = useState(false);
  const [e, setE] = useState('');
  const [busy, setBusy] = useState(false);
  const pickArea = v => { setArea(v); setPicked(new Set(alive.filter(a => v === 'all' || (v === 'none' ? !a.area_id : a.area_id === v)).map(a => a.id))); };
  const areaName = area === 'all' ? 'All areas' : area === 'none' ? 'No area' : areas.find(r => r.id === area)?.name;
  const save = async () => {
    if (!picked.size) { setE('Choose at least one animal.'); return; }
    const p = eventProblem(form); if (p) { setE(p); return; }
    setBusy(true); const res = await onSave([...picked], form); setBusy(false);
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Group event" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={busy} style={{ ...S.btnPrimary, flex: 2 }}>{busy ? 'Saving…' : `Log for ${picked.size} animal${picked.size === 1 ? '' : 's'}`}</button></>}>
      <Field label="Event" htmlFor="gev-type">
        <select id="gev-type" value={form.eventType} onChange={ev => setForm(p => ({ ...p, eventType: ev.target.value }))} style={S.input}>
          {EVENT_TYPES.filter(t => GROUP_TYPES.includes(t.value)).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Which animals" htmlFor="gev-area">
        <select id="gev-area" value={area} onChange={ev => pickArea(ev.target.value)} style={S.input}>
          <option value="all">All tagged animals</option>
          {areas.map(r => <option key={r.id} value={r.id}>Everything in {r.name}</option>)}
          <option value="none">Animals with no area</option>
        </select>
      </Field>
      <div style={{ background: T.surface2, borderRadius: 10, padding: '10px 12px', fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}><b>{picked.size} animal{picked.size === 1 ? '' : 's'}</b> · {areaName}</span>
        <button onClick={() => setChoosing(c => !c)} style={{ ...S.btnOutline, border: 'none', background: 'none', height: 32, color: T.primary }}>{choosing ? 'Done' : 'Change'}</button>
      </div>
      {choosing && (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
          {alive.map((a, i) => (
            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '0 12px', borderTop: i ? `1px solid ${T.borderLight}` : 'none', cursor: 'pointer' }}>
              <input type="checkbox" checked={picked.has(a.id)} onChange={() => setPicked(s => { const n = new Set(s); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })}
                style={{ width: 20, height: 20, accentColor: T.primary }}/>
              <span style={{ flex: 1, fontSize: 15 }}>{label(a)}</span>
              <span style={S.meta}>{areas.find(r => r.id === a.area_id)?.name || ''}</span>
            </label>
          ))}
        </div>
      )}
      <EventFields form={form} setForm={setForm} areas={areas}/>
      {form.eventType !== 'movement' && <div style={{ ...S.meta, marginTop: -6, marginBottom: 12 }}>The cost is recorded once for the whole group.</div>}
      {err(e)}
    </Sheet>
  );
}

function GameCountSheet({ areas, onSave, onClose }) {
  const [form, setForm] = useState({ species: 'Impala', other: '', areaId: '', count: '', countedOn: todayISO(), notes: '' });
  const [e, setE] = useState('');
  const f = k => ev => setForm(p => ({ ...p, [k]: ev.target.value }));
  const save = async () => {
    const species = form.species === 'Other' ? form.other.trim() : form.species;
    if (!species) { setE('Name the species.'); return; }
    if (form.count === '' || Number(form.count) < 0) { setE('Enter the number counted.'); return; }
    const res = await onSave({ ...form, species });
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Game count" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save count</button></>}>
      <Field label="Species" htmlFor="gc-sp"><select id="gc-sp" value={form.species} onChange={f('species')} style={S.input}>{GAME.map(s => <option key={s}>{s}</option>)}</select></Field>
      {form.species === 'Other' && <Field label="Which species" htmlFor="gc-other"><input id="gc-other" value={form.other} onChange={f('other')} style={S.input}/></Field>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Number counted" htmlFor="gc-n" style={{ flex: 1, minWidth: 0 }}><input id="gc-n" type="number" inputMode="numeric" min="0" value={form.count} onChange={f('count')} style={S.input}/></Field>
        <Field label="Date" htmlFor="gc-d" style={{ flex: 1, minWidth: 0 }}><input id="gc-d" type="date" max={todayISO()} value={form.countedOn} onChange={f('countedOn')} style={S.input}/></Field>
      </div>
      <Field label="Area" htmlFor="gc-a" hint="Leave as whole farm if counted across the property."><AreaSelect id="gc-a" areas={areas} value={form.areaId} onChange={v => setForm(p => ({ ...p, areaId: v }))} none="Whole farm"/></Field>
      <Field label="Notes (optional)" htmlFor="gc-notes"><input id="gc-notes" value={form.notes} onChange={f('notes')} placeholder="e.g. Helicopter count, 6 young" style={S.input}/></Field>
      {err(e)}
    </Sheet>
  );
}

// ── Rows ────────────────────────────────────────────────────────────
function AnimalCard({ animal, areas, perms, api, onDone }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const events = [...(animal.livestock_events || [])].sort((a, b) => (a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0));
  const photos = usePhotos('livestock_event', open ? events.map(e => e.id) : [], animal.property_id);
  const groupPhotos = usePhotos('livestock_group', open ? [...new Set(events.map(e => e.group_id).filter(Boolean))] : [], animal.property_id);
  const [stLabel, stTone] = STATUS[animal.status] || STATUS.alive;
  const active = animal.status === 'alive';
  const area = areas.find(r => r.id === animal.area_id)?.name;
  const sub = [area, animal.weight_kg ? `${Number(animal.weight_kg)} kg${animal.weight_date ? ` (${fmtDate(animal.weight_date)})` : ''}` : null, animal.breed].filter(Boolean).join(' · ');
  const facts = [
    ['Sex', animal.gender && animal.gender !== 'unknown' ? animal.gender[0].toUpperCase() + animal.gender.slice(1) : null],
    ['Born', animal.dob && fmtDate(animal.dob)], ['Mother', animal.mother && label(animal.mother)],
    ['Purchased', animal.purchase_date && fmtDate(animal.purchase_date)], ['Price', fmtRand(animal.purchase_price)], ['Notes', animal.notes],
  ].filter(([, v]) => v);

  return (
    <article style={{ ...S.card, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px 12px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: active ? T.text : T.textMid }}>{label(animal)}{animal.tag_number && animal.species !== 'Cattle' ? ` · ${animal.species}` : ''}</div>
            {sub && <div style={S.meta}>{sub}</div>}
          </div>
          {inWithdrawal(animal) && <Chip tone="warn">Withdrawal to {fmtDate(animal.withdrawal_until)}</Chip>}
          {!active && <Chip tone={stTone}>{stLabel}</Chip>}
        </button>
        <div style={{ paddingRight: 4 }}>
          <ActionMenu title={label(animal)} label={`More actions for ${label(animal)}`} items={[
            perms.canWrite && active && { icon: 'note', label: 'Log event', onClick: () => setSheet('event') },
            perms.canDelete && { icon: 'trash', label: 'Delete record', danger: true, onClick: () => setSheet('delete') },
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
          <div style={S.fieldLabel}>Events</div>
          {events.length === 0 && <div style={S.meta}>No events logged.</div>}
          {events.slice(0, 10).map(ev => {
            const pics = [...(photos.byId[ev.id] || []), ...(ev.group_id ? groupPhotos.byId[ev.group_id] || [] : [])];
            return (
              <div key={ev.id} style={{ padding: '8px 0', borderTop: `1px solid ${T.borderLight}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: ev.event_type === 'death' ? T.red : T.text }}>{evLabel(ev.event_type)}</span>
                  <span style={S.meta}>{fmtDate(ev.event_date)}{ev.group_size > 1 ? ` · group of ${ev.group_size}` : ''}</span>
                </div>
                {[ev.product, ev.weight_kg ? `${Number(ev.weight_kg)} kg` : null, ev.area_id ? `to ${areas.find(r => r.id === ev.area_id)?.name || 'area'}` : null,
                  ev.withdrawal_days ? `withdrawal ${ev.withdrawal_days} days` : null].filter(Boolean).length > 0 && (
                  <div style={{ fontSize: 14, color: T.textMid }}>{[ev.product, ev.weight_kg ? `${Number(ev.weight_kg)} kg` : null, ev.area_id ? `to ${areas.find(r => r.id === ev.area_id)?.name || 'area'}` : null, ev.withdrawal_days ? `withdrawal ${ev.withdrawal_days} days` : null].filter(Boolean).join(' · ')}</div>
                )}
                {ev.description && <div style={{ fontSize: 14, color: T.textMid, marginTop: 2 }}>{ev.description}</div>}
                {(ev.company || ev.cost) && <div style={S.meta}>{[ev.company, ev.cost ? `${fmtRand(ev.cost)} excl. VAT${ev.group_size > 1 ? ' (whole group)' : ''}` : null].filter(Boolean).join(' · ')}</div>}
                {pics.length > 0 && <PhotoStrip photos={pics} style={{ marginTop: 8 }}/>}
              </div>
            );
          })}
          {perms.canWrite && active && <button onClick={() => setSheet('event')} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="plus" size={16}/> Log event</button>}
        </div>
      )}

      {sheet === 'event' && <EventSheet animal={animal} areas={areas} onClose={() => setSheet(null)}
        onSave={async d => { const r = await api.addEvent(animal.id, d); if (!r?.error) onDone(`${label(animal)}: ${evLabel(d.eventType).toLowerCase()} logged`); return r; }}/>}
      {sheet === 'delete' && <ConfirmSheet title={`Delete ${label(animal)}?`} body="This removes the record. To record a death or sale, log an event instead. This can't be undone."
        onConfirm={() => api.deleteAnimal(animal.id)} onClose={() => setSheet(null)}/>}
    </article>
  );
}

function GameSection({ counts, areas, canDelete, onDelete }) {
  const [openKey, setOpenKey] = useState(null);
  // Latest count per species and area.
  const latest = useMemo(() => {
    const m = new Map();
    counts.forEach(c => { const k = `${c.species}|${c.area_id || ''}`; if (!m.has(k)) m.set(k, { ...c, history: [] }); m.get(k).history.push(c); });
    return [...m.values()].sort((a, b) => a.species.localeCompare(b.species));
  }, [counts]);
  if (!latest.length) return <div style={{ ...S.meta, marginBottom: 6 }}>No game counts yet.</div>;
  return (
    <div style={{ ...S.card, overflow: 'hidden' }}>
      {latest.map((g, i) => {
        const key = `${g.species}|${g.area_id || ''}`;
        const open = openKey === key;
        return (
          <div key={key} style={{ borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
            <button onClick={() => setOpenKey(open ? null : key)} aria-expanded={open}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: T.text }}>{g.species}</div>
                <div style={S.meta}>{areas.find(r => r.id === g.area_id)?.name || 'Whole farm'} · counted {fmtDate(g.counted_on)}</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{g.count}</span>
            </button>
            {open && (
              <div style={{ padding: '0 14px 10px' }}>
                {g.history.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${T.borderLight}`, fontSize: 14 }}>
                    <span style={{ flex: 1, color: T.textMid }}>{fmtDate(h.counted_on)}{h.notes ? ` · ${h.notes}` : ''}</span>
                    <b>{h.count}</b>
                    {canDelete && <button onClick={() => onDelete(h.id)} aria-label="Delete count" style={{ ...S.iconBtn, width: 36, height: 36 }}><Icon name="trash" size={16}/></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LivestockTab({ property, areas = [] }) {
  const { canWrite, canDelete } = useAuth();
  const api = useLivestock(property.id);
  const { animals, counts, loading } = api;
  const [sheet, setSheet] = useState(null);
  const [areaFilter, setAreaFilter] = useState('all');
  const [status, setStatus] = useState('alive');
  const [toast, setToast] = useState('');

  if (loading) return <Loading label="Loading livestock…"/>;

  const alive = animals.filter(a => a.status === 'alive');
  const gameTotal = gameTotalOf(counts);
  const withdrawal = alive.filter(inWithdrawal).length;
  const areaCounts = areas.map(r => [r.id, r.name, alive.filter(a => a.area_id === r.id).length]).filter(([, , n]) => n);
  const filtered = animals.filter(a => (status === 'all' || a.status === status) && (areaFilter === 'all' || a.area_id === areaFilter));
  const perms = { canWrite, canDelete };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[[alive.length, 'Tagged', T.text], [gameTotal, 'Game', T.text], [withdrawal, 'In withdrawal', T.warn]].map(([n, l, c]) => (
          <div key={l} style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: n ? c : T.textDim }}>{n}</div>
            <div style={{ ...S.meta, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button onClick={() => setSheet('group')} disabled={!alive.length} style={{ ...S.btnPrimary, flex: 1, opacity: alive.length ? 1 : 0.5 }}><Icon name="cow" size={18}/> Group event</button>
          <button onClick={() => setSheet('count')} style={{ ...S.btnGhost, flex: 1 }}><Icon name="plus" size={18}/> Game count</button>
        </div>
      )}

      <SectionLabel style={{ marginBottom: 8 }}>Tagged animals ({alive.length})</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <Segmented label="Status" value={status} onChange={setStatus} options={[['alive', 'Alive'], ['sold', 'Sold'], ['deceased', 'Dead'], ['all', 'All']]}/>
      </div>
      {areaCounts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {[['all', 'All areas', null], ...areaCounts].map(([id, name, n]) => {
            const on = areaFilter === id;
            return (
              <button key={id} onClick={() => setAreaFilter(id)} aria-pressed={on}
                style={{ height: 36, padding: '0 12px', borderRadius: 18, flexShrink: 0, cursor: 'pointer', fontFamily: T.sans, fontSize: 14, fontWeight: on ? 600 : 500,
                  background: on ? T.primaryFade : T.surface, color: on ? T.primary : T.textMid, border: `1px solid ${on ? T.primaryBorder : T.border}` }}>
                {name}{n != null ? ` · ${n}` : ''}
              </button>
            );
          })}
        </div>
      )}
      {filtered.length === 0 ? <Empty>{animals.length === 0 ? 'No tagged animals yet.' : 'None match this filter.'}</Empty>
        : filtered.map(a => <AnimalCard key={a.id} animal={a} areas={areas} perms={perms} api={api} onDone={setToast}/>)}
      {canWrite && <button onClick={() => setSheet('add')} style={{ ...S.btnDashed, margin: '6px 0 22px' }}><Icon name="plus" size={18}/> Add tagged animal</button>}

      <SectionLabel style={{ marginBottom: 8 }}>Game · counted</SectionLabel>
      <GameSection counts={counts} areas={areas} canDelete={canDelete} onDelete={api.deleteGameCount}/>

      {sheet === 'add' && <AddAnimalSheet animals={animals} areas={areas} onSave={api.addAnimal} onClose={() => setSheet(null)}/>}
      {sheet === 'group' && <GroupEventSheet animals={animals} areas={areas} onClose={() => setSheet(null)}
        onSave={async (ids, d) => { const r = await api.addGroupEvent(ids, d); if (!r?.error) setToast(`${evLabel(d.eventType)} logged for ${ids.length} animals`); return r; }}/>}
      {sheet === 'count' && <GameCountSheet areas={areas} onClose={() => setSheet(null)}
        onSave={async d => { const r = await api.addGameCount(d); if (!r?.error) setToast(`${d.species}: ${d.count} counted`); return r; }}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

// Total game from the latest count of each species in each area.
function gameTotalOf(counts) {
  const seen = new Set();
  let total = 0;
  counts.forEach(c => { const k = `${c.species}|${c.area_id || ''}`; if (!seen.has(k)) { seen.add(k); total += c.count; } });
  return total;
}

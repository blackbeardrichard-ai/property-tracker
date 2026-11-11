import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLivestock } from '../hooks/useLivestock';
import { T, S } from '../lib/theme';
import { fmtDate, todayISO } from '../lib/format';
import { Icon, Chip, Segmented, Field, Sheet, ConfirmSheet, ActionMenu, Loading, Empty, Toast } from '../components/ui';

const SPECIES = ['Cattle', 'Game', 'Sheep', 'Goat', 'Pig', 'Horse', 'Donkey', 'Other'];
const EVENT_TYPES = [
  { value: 'birth',     label: 'Birth' },
  { value: 'death',     label: 'Death' },
  { value: 'treatment', label: 'Vet treatment' },
  { value: 'movement',  label: 'Movement' },
  { value: 'sale',      label: 'Sale' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'calving',   label: 'Calving' },
  { value: 'other',     label: 'Other' },
];
const STATUS = { alive: ['Alive', 'ok'], deceased: ['Deceased', 'red'], sold: ['Sold', 'neutral'] };
const fmtRand = v => (v ? `R ${parseFloat(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '');
const label = a => [a.tag_number, a.name].filter(Boolean).join(' · ') || a.species;

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

function AddAnimalSheet({ animals, onSave, onClose }) {
  const [form, setForm] = useState({ species: 'Cattle', breed: '', tag_number: '', name: '', gender: 'female', dob: '', mother_id: '', purchase_date: '', purchase_price: '', notes: '' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const mothers = animals.filter(a => a.gender === 'female' && a.status === 'alive' && a.species === form.species);
  const half = { flex: 1, minWidth: 0 };
  const save = async () => {
    const nul = v => (v === '' ? null : v);
    const { error } = await onSave({ ...form, breed: nul(form.breed), tag_number: nul(form.tag_number), name: nul(form.name), notes: nul(form.notes),
      mother_id: nul(form.mother_id), dob: nul(form.dob), purchase_date: nul(form.purchase_date), purchase_price: nul(form.purchase_price), status: 'alive' });
    if (error) { setErr(error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Add animal" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Add animal</button></>}>
      <Field label="Species" htmlFor="an-sp"><select id="an-sp" value={form.species} onChange={f('species')} style={S.input}>{SPECIES.map(s => <option key={s}>{s}</option>)}</select></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Tag no." htmlFor="an-tag" style={half}><input id="an-tag" value={form.tag_number} onChange={f('tag_number')} placeholder="e.g. T001" style={S.input}/></Field>
        <Field label="Name (optional)" htmlFor="an-name" style={half}><input id="an-name" value={form.name} onChange={f('name')} style={S.input}/></Field>
      </div>
      <Field label="Sex">
        <Segmented label="Sex" value={form.gender} onChange={v => setForm(p => ({ ...p, gender: v }))} options={[['female', 'Female'], ['male', 'Male'], ['unknown', 'Unknown']]}/>
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Breed (optional)" htmlFor="an-br" style={half}><input id="an-br" value={form.breed} onChange={f('breed')} placeholder="e.g. Brahman" style={S.input}/></Field>
        <Field label="Date of birth" htmlFor="an-dob" style={half}><input id="an-dob" type="date" value={form.dob} onChange={f('dob')} style={S.input}/></Field>
      </div>
      <Field label="Mother (optional)" htmlFor="an-mom">
        <select id="an-mom" value={form.mother_id} onChange={f('mother_id')} style={S.input}>
          <option value="">None</option>
          {mothers.map(a => <option key={a.id} value={a.id}>{label(a)}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Purchase date" htmlFor="an-pd" style={half}><input id="an-pd" type="date" value={form.purchase_date} onChange={f('purchase_date')} style={S.input}/></Field>
        <Field label="Price, R" htmlFor="an-pp" style={half}><input id="an-pp" type="number" inputMode="decimal" min="0" step="0.01" value={form.purchase_price} onChange={f('purchase_price')} style={S.input}/></Field>
      </div>
      <Field label="Notes (optional)" htmlFor="an-notes"><textarea id="an-notes" rows={2} value={form.notes} onChange={f('notes')} style={S.textarea}/></Field>
      {err && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
    </Sheet>
  );
}

function EventSheet({ animal, onSave, onClose }) {
  const [form, setForm] = useState({ eventType: 'treatment', eventDate: todayISO(), description: '', company: '', cost: '', photoUrl: '' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const et = form.eventType;
  const death = et === 'death';
  const save = async () => {
    const res = await onSave(form);
    if (res?.error) { setErr(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title="Log event" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} style={{ ...(death ? S.btnDanger : S.btnPrimary), flex: 2 }}>Log {EVENT_TYPES.find(e => e.value === et)?.label.toLowerCase()}</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{label(animal)}</p>
      <Field label="Event"><PillGroup ariaLabel="Event type" value={et} onChange={v => setForm(p => ({ ...p, eventType: v }))} options={EVENT_TYPES.map(e => [e.value, e.label])}/></Field>
      <Field label="Date" htmlFor="ev-date"><input id="ev-date" type="date" max={todayISO()} value={form.eventDate} onChange={f('eventDate')} style={S.input}/></Field>
      <Field label="Details" htmlFor="ev-desc">
        <textarea id="ev-desc" rows={2} value={form.description} onChange={f('description')} style={S.textarea}
          placeholder={death ? 'Cause and circumstances' : et === 'treatment' ? 'Treatment, medicine, dose' : et === 'sale' ? 'Buyer, conditions' : 'Details'}/>
      </Field>
      {['treatment', 'death', 'sale'].includes(et) && (
        <Field label={et === 'sale' ? 'Buyer' : 'Vet or company'} htmlFor="ev-co"><input id="ev-co" value={form.company} onChange={f('company')} style={S.input}/></Field>
      )}
      {['treatment', 'sale'].includes(et) && (
        <Field label={et === 'sale' ? 'Amount, R' : 'Cost, R'} htmlFor="ev-cost"><input id="ev-cost" type="number" inputMode="decimal" min="0" step="0.01" value={form.cost} onChange={f('cost')} style={S.input}/></Field>
      )}
      {death && (
        <div style={{ background: T.redFade, border: `1px solid ${T.redBorder}`, color: T.red, borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12, lineHeight: 1.45 }}>
          This marks the animal as deceased. Note any photo reference in the details.
        </div>
      )}
      {et === 'sale' && (
        <div style={{ background: T.warnFade, border: `1px solid ${T.warnBorder}`, color: T.warn, borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12 }}>
          This marks the animal as sold.
        </div>
      )}
      {err && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
    </Sheet>
  );
}

function AnimalCard({ animal, perms, api, onDone }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const events = [...(animal.livestock_events || [])].sort((a, b) => (a.event_date < b.event_date ? 1 : -1));
  const [stLabel, stTone] = STATUS[animal.status] || STATUS.alive;
  const active = animal.status === 'alive';
  const sub = [animal.species, animal.breed, animal.gender && animal.gender !== 'unknown' ? animal.gender[0].toUpperCase() + animal.gender.slice(1) : null,
    animal.dob ? `born ${fmtDate(animal.dob)}` : null].filter(Boolean).join(' · ');
  const facts = [['Mother', animal.mother && label(animal.mother)], ['Purchased', animal.purchase_date && fmtDate(animal.purchase_date)], ['Price', fmtRand(animal.purchase_price)], ['Notes', animal.notes]].filter(([, v]) => v);

  return (
    <article style={{ ...S.card, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px 12px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: T.surface2, color: T.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="cow" size={22}/></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: active ? T.text : T.textMid }}>{label(animal)}</div>
            <div style={S.meta}>{sub}</div>
          </div>
          {!active && <Chip tone={stTone}>{stLabel}</Chip>}
          {events.length > 0 && <span style={{ ...S.meta, whiteSpace: 'nowrap' }}>{events.length} event{events.length === 1 ? '' : 's'}</span>}
        </button>
        <div style={{ paddingRight: 4 }}>
          <ActionMenu title={label(animal)} label={`More actions for ${label(animal)}`} items={[
            perms.canManage && active && { icon: 'note', label: 'Log event', onClick: () => setSheet('event') },
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
          {events.slice(0, 8).map(ev => (
            <div key={ev.id} style={{ padding: '8px 0', borderTop: `1px solid ${T.borderLight}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: ev.event_type === 'death' ? T.red : T.text }}>{EVENT_TYPES.find(e => e.value === ev.event_type)?.label || ev.event_type}</span>
                <span style={S.meta}>{fmtDate(ev.event_date)}</span>
              </div>
              {ev.description && <div style={{ fontSize: 14, color: T.textMid, marginTop: 2 }}>{ev.description}</div>}
              {(ev.company || ev.cost) && <div style={S.meta}>{[ev.company, fmtRand(ev.cost)].filter(Boolean).join(' · ')}</div>}
            </div>
          ))}
          {perms.canManage && active && <button onClick={() => setSheet('event')} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="plus" size={16}/> Log event</button>}
        </div>
      )}

      {sheet === 'event' && <EventSheet animal={animal} onClose={() => setSheet(null)}
        onSave={async d => { const r = await api.addEvent(animal.id, d); if (!r?.error) onDone(`${label(animal)}: event logged`); return r; }}/>}
      {sheet === 'delete' && <ConfirmSheet title={`Delete ${label(animal)}?`} body="This removes the record. To record a death or sale, log an event instead. This can't be undone."
        onConfirm={() => api.deleteAnimal(animal.id)} onClose={() => setSheet(null)}/>}
    </article>
  );
}

export default function LivestockTab({ property }) {
  const { canManage, canDelete } = useAuth();
  const api = useLivestock(property.id);
  const { animals, loading } = api;
  const [adding, setAdding] = useState(false);
  const [species, setSpecies] = useState('all');
  const [status, setStatus] = useState('alive');
  const [toast, setToast] = useState('');

  if (loading) return <Loading label="Loading livestock…"/>;

  const alive = animals.filter(a => a.status === 'alive');
  const summary = SPECIES.map(s => [s, alive.filter(a => a.species === s).length]).filter(([, n]) => n);
  const speciesList = ['all', ...new Set(animals.map(a => a.species).filter(Boolean))];
  const filtered = animals.filter(a => (species === 'all' || a.species === species) && (status === 'all' || a.status === status));

  return (
    <div>
      {summary.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
          <div style={{ ...S.card, padding: '12px 14px', minWidth: 88 }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: T.text }}>{alive.length}</div>
            <div style={{ ...S.meta, marginTop: 2 }}>Alive</div>
          </div>
          {summary.map(([s, n]) => (
            <div key={s} style={{ ...S.card, padding: '12px 14px', minWidth: 88 }}>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: T.text }}>{n}</div>
              <div style={{ ...S.meta, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <Segmented label="Status" value={status} onChange={setStatus} options={[['alive', 'Alive'], ['sold', 'Sold'], ['deceased', 'Deceased'], ['all', 'All']]}/>
      </div>
      {speciesList.length > 2 && (
        <div style={{ marginBottom: 14 }}>
          <PillGroup ariaLabel="Species" value={species} onChange={setSpecies} options={speciesList.map(s => [s, s === 'all' ? 'All species' : s])}/>
        </div>
      )}

      {filtered.length === 0 ? <Empty>{animals.length === 0 ? 'No animals registered yet.' : 'No animals match this filter.'}</Empty>
        : filtered.map(a => <AnimalCard key={a.id} animal={a} perms={{ canManage, canDelete }} api={api} onDone={setToast}/>)}

      {canManage && <button onClick={() => setAdding(true)} style={{ ...S.btnDashed, marginTop: 6 }}><Icon name="plus" size={18}/> Add animal</button>}
      {adding && <AddAnimalSheet animals={animals} onSave={api.addAnimal} onClose={() => setAdding(false)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

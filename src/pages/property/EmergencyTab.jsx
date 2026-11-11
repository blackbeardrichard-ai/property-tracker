import { useState, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRows } from '../../hooks/useRows';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/theme';
import { parseLocation } from '../../lib/location';
import { telHref, waHref } from '../../lib/phone';
import { NATIONAL_CONTACTS, PROCEDURES } from '../../lib/emergencyTemplates';
import { NeighbourSheet, saveNeighbourTo } from './neighbours';
import { Icon, Field, Sheet, ConfirmSheet, Loading, Toast, SectionLabel, SetupNote } from '../../components/ui';

const NeighbourMap = lazy(() => import('./NeighbourMap'));
const ICONS = [['fire', 'Fire'], ['medical', 'Medical'], ['snake', 'Snake'], ['shield', 'Crime'], ['truck', 'Vehicle'], ['water', 'Flood / water'], ['alert', 'Other']];
const RED = '#B42318';

// All emergency data for one property.
export function useEmergency(propertyId) {
  const order = [['position', true], ['created_at', true]];
  return {
    procedures: useRows('emergency_procedures', propertyId, { order }),
    contacts: useRows('emergency_contacts', propertyId, { order }),
    neighbours: useRows('neighbours', propertyId, { order }),
    people: useRows('neighbour_people', propertyId, { order }),
  };
}

const CallButton = ({ phone, label, big }) => (
  phone ? (
    <a href={telHref(phone)} style={{ ...S.btnPrimary, background: RED, borderColor: RED, textDecoration: 'none', height: big ? 64 : 44, fontSize: big ? 18 : 15, width: big ? '100%' : 'auto', boxSizing: 'border-box' }}>
      <Icon name="phone" size={big ? 22 : 18}/>{label}
    </a>
  ) : null
);

function ContactRow({ c, onEdit, first }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, padding: '8px 12px 8px 14px', borderTop: first ? 'none' : `1px solid ${T.borderLight}` }}>
      <button onClick={onEdit} disabled={!onEdit} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: T.sans, cursor: onEdit ? 'pointer' : 'default' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{c.name}</div>
        <div style={{ ...S.meta, color: c.phone ? S.meta.color : T.warn }}>{[c.organisation, c.phone || 'No number saved'].filter(Boolean).join(' · ')}</div>
      </button>
      {c.phone && <a href={telHref(c.phone)} aria-label={`Call ${c.name}`} style={{ ...S.btnOutline, height: 40, textDecoration: 'none', color: RED, borderColor: T.redBorder }}><Icon name="phone" size={16}/> Call</a>}
    </div>
  );
}

function PersonRow({ p, farm, message, first }) {
  const wa = waHref(p.phone, message);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, padding: '6px 12px 6px 14px', borderTop: first ? 'none' : `1px solid ${T.borderLight}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: T.text }}>{p.name}</div>
        <div style={S.meta}>{[farm, p.role, p.phone].filter(Boolean).join(' · ')}</div>
      </div>
      {p.phone && <a href={telHref(p.phone)} aria-label={`Call ${p.name}`} style={{ ...S.btnOutline, height: 40, padding: '0 10px', textDecoration: 'none' }}><Icon name="phone" size={16}/></a>}
      {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${p.name}`} style={{ ...S.btnOutline, height: 40, padding: '0 10px', textDecoration: 'none', color: '#1E6B3F', borderColor: T.okBorder }}><Icon name="whatsapp" size={16}/></a>}
    </div>
  );
}

// ── Edit sheets (managers) ───────────────────────────────────────────
function ContactSheet({ contact, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ name: contact?.name || '', organisation: contact?.organisation || '', phone: contact?.phone || '', notes: contact?.notes || '' });
  const [e, setE] = useState('');
  const [del, setDel] = useState(false);
  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));
  return (
    <Sheet title={contact ? 'Edit contact' : 'Add contact'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={async () => { if (!f.name.trim()) { setE('Name is required.'); return; } const r = await onSave({ name: f.name.trim(), organisation: f.organisation.trim() || null, phone: f.phone.trim() || null, notes: f.notes.trim() || null }); if (r?.error) setE(r.error.message); else onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <Field label="Who" htmlFor="ec-n"><input id="ec-n" value={f.name} onChange={set('name')} placeholder="e.g. Fire brigade" style={S.input}/></Field>
      <Field label="Organisation (optional)" htmlFor="ec-o"><input id="ec-o" value={f.organisation} onChange={set('organisation')} placeholder="e.g. Capricorn District fire & rescue" style={S.input}/></Field>
      <Field label="Phone" htmlFor="ec-p"><input id="ec-p" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 015 000 0000" style={S.input}/></Field>
      <Field label="Notes (optional)" htmlFor="ec-x"><input id="ec-x" value={f.notes} onChange={set('notes')} style={S.input}/></Field>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
      {contact && onDelete && <button onClick={() => setDel(true)} style={{ ...S.btnGhost, width: '100%', color: T.red, borderColor: T.redBorder, marginTop: 8 }}>Delete contact</button>}
      {del && <ConfirmSheet title={`Delete ${contact.name}?`} body="It's removed from every procedure. This can't be undone." onConfirm={async () => { await onDelete(); onClose(); }} onClose={() => setDel(false)}/>}
    </Sheet>
  );
}


function ProcedureSheet({ proc, contacts, neighbours, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ title: proc?.title || '', icon: proc?.icon || 'alert', call_contact_id: proc?.call_contact_id || '', steps: proc?.steps || '' });
  const [also, setAlso] = useState(new Set(proc?.contact_ids || []));
  const [nbs, setNbs] = useState(new Set(proc?.neighbour_ids || []));
  const [e, setE] = useState('');
  const [del, setDel] = useState(false);
  const toggle = (setter, id) => setter(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const box = { width: 20, height: 20, accentColor: T.primary };
  return (
    <Sheet title={proc ? 'Edit procedure' : 'New procedure'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={async () => { if (!f.title.trim()) { setE('Give it a name.'); return; } const r = await onSave({ title: f.title.trim(), icon: f.icon, call_contact_id: f.call_contact_id || null, steps: f.steps.trim() || null, contact_ids: [...also], neighbour_ids: [...nbs] }); if (r?.error) setE(r.error.message); else onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <Field label="Emergency" htmlFor="pr-t"><input id="pr-t" value={f.title} onChange={ev => setF(p => ({ ...p, title: ev.target.value }))} placeholder="e.g. Fire" style={S.input}/></Field>
      <Field label="Icon" htmlFor="pr-i"><select id="pr-i" value={f.icon} onChange={ev => setF(p => ({ ...p, icon: ev.target.value }))} style={S.input}>{ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Call first" htmlFor="pr-c"><select id="pr-c" value={f.call_contact_id} onChange={ev => setF(p => ({ ...p, call_contact_id: ev.target.value }))} style={S.input}>
        <option value="">Choose a contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ' (no number)'}</option>)}</select></Field>
      <Field label="Steps, one per line" htmlFor="pr-s"><textarea id="pr-s" rows={7} value={f.steps} onChange={ev => setF(p => ({ ...p, steps: ev.target.value }))} style={S.textarea}/></Field>
      <div style={S.fieldLabel}>Also phone</div>
      <div style={{ marginBottom: 14 }}>
        {contacts.filter(c => c.id !== f.call_contact_id).map(c => (
          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer' }}><input type="checkbox" checked={also.has(c.id)} onChange={() => toggle(setAlso, c.id)} style={box}/>{c.name}</label>
        ))}
      </div>
      <div style={S.fieldLabel}>Neighbours to warn</div>
      {neighbours.length === 0 && <div style={{ ...S.meta, marginBottom: 12 }}>No neighbours added yet.</div>}
      {neighbours.map(n => (
        <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer' }}><input type="checkbox" checked={nbs.has(n.id)} onChange={() => toggle(setNbs, n.id)} style={box}/>{n.farm_name}</label>
      ))}
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14, marginTop: 8 }}>{e}</div>}
      {proc && onDelete && <button onClick={() => setDel(true)} style={{ ...S.btnGhost, width: '100%', color: T.red, borderColor: T.redBorder, marginTop: 12 }}>Delete procedure</button>}
      {del && <ConfirmSheet title={`Delete “${proc.title}”?`} body="This can't be undone." onConfirm={async () => { await onDelete(); onClose(); }} onClose={() => setDel(false)}/>}
    </Sheet>
  );
}

// ── One procedure, as used in an emergency ───────────────────────────
function ProcedureView({ proc, property, em, canEdit, onEdit, onBack }) {
  const contacts = em.contacts.rows;
  const first = contacts.find(c => c.id === proc.call_contact_id);
  const also = (proc.contact_ids || []).map(id => contacts.find(c => c.id === id)).filter(Boolean);
  const nbs = (proc.neighbour_ids || []).map(id => em.neighbours.rows.find(n => n.id === id)).filter(Boolean);
  const pin = parseLocation(property.map_location);
  const [here, setHere] = useState(null);
  const [locMsg, setLocMsg] = useState('');
  const loc = here || pin;
  const [text, setText] = useState('');
  const message = text || `${proc.title.toUpperCase()} at ${property.name}.${loc ? ` Location: https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}` : ''} Please help / phone back.`;
  const steps = (proc.steps || '').split('\n').map(s => s.trim()).filter(Boolean);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocMsg('This phone can’t share its location.'); return; }
    setLocMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(p => { setHere({ lat: p.coords.latitude, lng: p.coords.longitude }); setText(''); setLocMsg(`Your location added (±${Math.round(p.coords.accuracy)} m).`); },
      () => setLocMsg('Couldn’t get your location; the property pin is used.'), { enableHighAccuracy: true, timeout: 15000 });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={onBack} style={{ ...S.btnGhost, height: 40, padding: '0 12px' }}><Icon name="back" size={18}/> All emergencies</button>
        {canEdit && <button onClick={onEdit} style={{ ...S.btnGhost, height: 40, padding: '0 12px', marginLeft: 'auto' }}><Icon name="pencil" size={16}/> Edit</button>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: T.redFade, color: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={proc.icon || 'alert'} size={30}/></span>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.text }}>{proc.title}</h2>
      </div>

      {first?.phone ? <CallButton big phone={first.phone} label={`Call ${first.name} · ${first.phone}`}/> : (
        <div style={{ background: T.warnFade, border: `1px solid ${T.warnBorder}`, color: T.warn, borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 8 }}>
          {first ? `No number saved for ${first.name}.` : 'No first contact set.'} Use 112 meanwhile.
        </div>
      )}
      {!first?.phone && <CallButton big phone="112" label="Call 112"/>}

      {steps.length > 0 && (
        <>
          <SectionLabel style={{ margin: '20px 0 8px' }}>What to do</SectionLabel>
          <ol style={{ ...S.card, margin: 0, padding: '6px 14px 6px 40px' }}>
            {steps.map((s, i) => <li key={i} style={{ fontSize: 16, lineHeight: 1.45, padding: '8px 0', borderTop: i ? `1px solid ${T.borderLight}` : 'none', color: T.text }}>{s}</li>)}
          </ol>
        </>
      )}

      {also.length > 0 && (
        <>
          <SectionLabel style={{ margin: '20px 0 8px' }}>Also phone</SectionLabel>
          <div style={{ ...S.card, overflow: 'hidden' }}>{also.map((c, i) => <ContactRow key={c.id} c={c} first={!i}/>)}</div>
        </>
      )}

      {nbs.length > 0 && (
        <>
          <SectionLabel style={{ margin: '20px 0 8px' }}>Warn the neighbours</SectionLabel>
          <Field label="Message" htmlFor="pv-msg" hint={locMsg || null}>
            <textarea id="pv-msg" rows={3} value={message} onChange={ev => setText(ev.target.value)} style={S.textarea}/>
          </Field>
          <button onClick={useMyLocation} style={{ ...S.btnOutline, marginBottom: 10 }}><Icon name="pin" size={16}/> Use where I am now</button>
          <div style={{ ...S.card, overflow: 'hidden' }}>
            {nbs.flatMap(n => em.people.rows.filter(p => p.neighbour_id === n.id).map(p => ({ p, n }))).map(({ p, n }, i) => <PersonRow key={p.id} p={p} farm={n.farm_name} message={message} first={!i}/>)}
            {!nbs.some(n => em.people.rows.some(p => p.neighbour_id === n.id)) && <div style={{ ...S.meta, padding: 14 }}>No people saved for these neighbours.</div>}
          </div>
          <p style={{ ...S.meta, marginTop: 6 }}>WhatsApp opens with the message ready; tap send for each person.</p>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function EmergencyTab({ property, onSaveProperty }) {
  const { canManage } = useAuth();
  const em = useEmergency(property.id);
  const [view, setView] = useState('home'); // 'home' | procedure id | 'map'
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  if ([em.procedures, em.contacts, em.neighbours, em.people].some(x => x.loading)) return <Loading label="Loading emergency page…"/>;
  const missing = [em.procedures, em.contacts, em.neighbours, em.people].some(x => x.missing);

  const proc = em.procedures.rows.find(p => p.id === view);
  if (proc) {
    return (
      <>
        <ProcedureView proc={proc} property={property} em={em} canEdit={canManage} onEdit={() => setSheet({ proc })} onBack={() => setView('home')}/>
        {sheet?.proc && <ProcedureSheet proc={sheet.proc} contacts={em.contacts.rows} neighbours={em.neighbours.rows} onClose={() => setSheet(null)}
          onSave={p => em.procedures.update(sheet.proc.id, p, p.title)} onDelete={async () => { await em.procedures.remove(sheet.proc.id, sheet.proc.title); setView('home'); }}/>}
      </>
    );
  }

  // First-time setup: national numbers, blank local ones, and standard procedures to edit.
  const setUp = async () => {
    setBusy(true);
    const ids = {};
    for (let i = 0; i < NATIONAL_CONTACTS.length; i++) {
      const { key, ...c } = NATIONAL_CONTACTS[i];
      const r = await em.contacts.add({ ...c, phone: c.phone || null, notes: c.notes || null, organisation: c.organisation || null, position: i }, c.name);
      if (r.error) { setBusy(false); setToast({ message: r.error.message, tone: 'error' }); return; }
      ids[key] = r.data.id;
    }
    for (let i = 0; i < PROCEDURES.length; i++) {
      const p = PROCEDURES[i];
      await em.procedures.add({ title: p.title, icon: p.icon, call_contact_id: ids[p.call] || null, steps: p.steps.join('\n'),
        contact_ids: p.also.map(k => ids[k]).filter(Boolean), neighbour_ids: p.neighbours ? em.neighbours.rows.map(n => n.id) : [], position: i }, p.title);
    }
    await Promise.all([em.contacts.refresh(), em.procedures.refresh()]);
    setBusy(false);
    setToast({ message: 'Emergency page set up. Fill in the local numbers.' });
  };

  const saveNeighbour = (nb, fields, people) => saveNeighbourTo(em, property, nb, fields, people);

  const missingNumbers = em.contacts.rows.filter(c => !c.phone).length;

  return (
    <div>
      <CallButton big phone="112" label="Call 112 — any emergency"/>
      <p style={{ ...S.meta, textAlign: 'center', margin: '6px 0 16px' }}>112 works from any cellphone, on any network.</p>

      {missing && <SetupNote what="The emergency page"/>}

      {!missing && em.procedures.rows.length === 0 && (
        <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Not set up for {property.name} yet</div>
          {canManage ? (
            <>
              <p style={{ fontSize: 15, color: T.textMid, margin: '0 0 12px', lineHeight: 1.5 }}>
                Start with the national numbers and standard steps for fire, medical, snake bite, crime and vehicle accidents. Then add your local numbers and neighbours and edit the steps to suit the farm.
              </p>
              <button onClick={setUp} disabled={busy} style={{ ...S.btnPrimary, width: '100%' }}>{busy ? 'Setting up…' : 'Set up the emergency page'}</button>
            </>
          ) : <p style={{ fontSize: 15, color: T.textMid, margin: 0 }}>Ask a manager to set it up.</p>}
        </div>
      )}

      {em.procedures.rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {em.procedures.rows.map(p => (
            <button key={p.id} onClick={() => { setView(p.id); window.scrollTo(0, 0); }}
              style={{ minHeight: 96, borderRadius: 14, border: `2px solid ${T.redBorder}`, background: T.surface, color: RED, cursor: 'pointer', fontFamily: T.sans,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, fontWeight: 700, padding: 10 }}>
              <Icon name={p.icon || 'alert'} size={32}/>{p.title}
            </button>
          ))}
          {canManage && (
            <button onClick={() => setSheet({ proc: null, add: true })} style={{ minHeight: 96, borderRadius: 14, border: `2px dashed ${T.border}`, background: 'none', color: T.primary, cursor: 'pointer', fontFamily: T.sans, fontSize: 15, fontWeight: 600 }}>
              <Icon name="plus" size={24}/><div>Add emergency</div>
            </button>
          )}
        </div>
      )}

      {!missing && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 8px' }}>
            <SectionLabel>Emergency numbers</SectionLabel>
            {missingNumbers > 0 && <span style={{ ...S.meta, color: T.warn, marginLeft: 'auto', fontWeight: 600 }}>{missingNumbers} without a number</span>}
          </div>
          {em.contacts.rows.length > 0 && (
            <div style={{ ...S.card, overflow: 'hidden', marginBottom: 8 }}>
              {em.contacts.rows.map((c, i) => <ContactRow key={c.id} c={c} first={!i} onEdit={canManage ? () => setSheet({ contact: c }) : null}/>)}
            </div>
          )}
          {canManage && <button onClick={() => setSheet({ contact: null, addContact: true })} style={{ ...S.btnDashed, marginBottom: 20 }}><Icon name="plus" size={18}/> Add number</button>}

          <SectionLabel style={{ margin: '4px 0 8px' }}>Neighbours ({em.neighbours.rows.length})</SectionLabel>
          {em.neighbours.rows.map(n => {
            const people = em.people.rows.filter(p => p.neighbour_id === n.id);
            return (
              <div key={n.id} style={{ ...S.card, overflow: 'hidden', marginBottom: 8 }}>
                <button onClick={() => canManage && setSheet({ neighbour: n })} disabled={!canManage}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px 4px', background: 'none', border: 'none', textAlign: 'left', fontFamily: T.sans, cursor: canManage ? 'pointer' : 'default' }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 700 }}>{n.farm_name}</div>{n.notes && <div style={S.meta}>{n.notes}</div>}</div>
                  {canManage && <Icon name="pencil" size={16} color={T.textDim}/>}
                </button>
                {people.map((p, i) => <PersonRow key={p.id} p={p} message={`Hi ${p.name.split(' ')[0]}, this is ${property.name}.`} first={false}/>)}
                {!people.length && <div style={{ ...S.meta, padding: '0 14px 10px' }}>No people added.</div>}
              </div>
            );
          })}
          {canManage && <button onClick={() => setSheet({ neighbour: null, addNeighbour: true })} style={{ ...S.btnDashed, marginBottom: 20 }}><Icon name="plus" size={18}/> Add neighbour</button>}

          <SectionLabel style={{ margin: '4px 0 8px' }}>Neighbour map</SectionLabel>
          {view === 'map' ? (
            <Suspense fallback={<Loading label="Loading map…"/>}>
              <NeighbourMap property={property} em={em} canEdit={canManage} onSaveProperty={onSaveProperty}/>
            </Suspense>
          ) : (
            <button onClick={() => setView('map')} style={{ ...S.btnGhost, width: '100%' }}><Icon name="map" size={18}/> Show the map</button>
          )}
        </>
      )}

      {sheet?.add && <ProcedureSheet proc={null} contacts={em.contacts.rows} neighbours={em.neighbours.rows} onClose={() => setSheet(null)}
        onSave={p => em.procedures.add({ ...p, position: em.procedures.rows.length }, p.title)}/>}
      {(sheet?.contact || sheet?.addContact) && <ContactSheet contact={sheet.contact} onClose={() => setSheet(null)}
        onSave={c => (sheet.contact ? em.contacts.update(sheet.contact.id, c, c.name) : em.contacts.add({ ...c, position: em.contacts.rows.length }, c.name))}
        onDelete={sheet.contact ? () => em.contacts.remove(sheet.contact.id, sheet.contact.name) : null}/>}
      {(sheet?.neighbour || sheet?.addNeighbour) && <NeighbourSheet neighbour={sheet.neighbour} people={sheet.neighbour ? em.people.rows.filter(p => p.neighbour_id === sheet.neighbour.id) : null}
        onClose={() => setSheet(null)} onSave={(f, people) => saveNeighbour(sheet.neighbour, f, people)}
        onDelete={sheet.neighbour ? () => em.neighbours.remove(sheet.neighbour.id, sheet.neighbour.farm_name) : null}/>}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)}/>}
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/theme';
import { PROCEDURES } from '../../lib/emergencyTemplates';
import { Icon, Field, Sheet, ConfirmSheet } from '../../components/ui';

// Neighbours (the properties around this one) and their people: used on the Emergency page and the Map.

export function NeighbourSheet({ neighbour, people, onSave, onDelete, onClose, hideMapHint }) {
  const [farm, setFarm] = useState(neighbour?.farm_name || '');
  const [notes, setNotes] = useState(neighbour?.notes || '');
  const [list, setList] = useState(people?.length ? people.map(p => ({ ...p })) : [{ name: '', role: '', phone: '' }]);
  const [e, setE] = useState('');
  const [del, setDel] = useState(false);
  const setP = (i, k, v) => setList(l => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <Sheet title={neighbour ? 'Edit neighbour' : 'Add neighbour'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={async () => { if (!farm.trim()) { setE('Property name is required.'); return; } const r = await onSave({ farm_name: farm.trim(), notes: notes.trim() || null }, list.filter(p => p.name.trim())); if (r?.error) setE(r.error.message); else onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <Field label="Property name" htmlFor="nb-f"><input id="nb-f" value={farm} onChange={ev => setFarm(ev.target.value)} placeholder="e.g. Rietfontein, or No. 12 next door" style={S.input}/></Field>
      <Field label="Notes (optional)" htmlFor="nb-n"><input id="nb-n" value={notes} onChange={ev => setNotes(ev.target.value)} placeholder="e.g. Shares the east boundary; has a fire truck" style={S.input}/></Field>
      <div style={S.fieldLabel}>People</div>
      {list.map((p, i) => (
        <div key={p.id || i} style={{ background: T.surface2, borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input aria-label="Name" value={p.name} onChange={ev => setP(i, 'name', ev.target.value)} placeholder="Name" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
            <button onClick={() => setList(l => l.filter((_, j) => j !== i))} aria-label="Remove person" style={S.iconBtn}><Icon name="trash" size={18}/></button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input aria-label="Role" value={p.role || ''} onChange={ev => setP(i, 'role', ev.target.value)} placeholder="Owner, manager…" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
            <input aria-label="Phone" type="tel" inputMode="tel" value={p.phone || ''} onChange={ev => setP(i, 'phone', ev.target.value)} placeholder="Phone" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
          </div>
        </div>
      ))}
      <button onClick={() => setList(l => [...l, { name: '', role: '', phone: '' }])} style={{ ...S.btnOutline, marginBottom: 12 }}><Icon name="plus" size={16}/> Add person</button>
      {!hideMapHint && <p style={{ ...S.meta, margin: '0 0 8px' }}>Draw their boundary on the Map tab.</p>}
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
      {neighbour && onDelete && <button onClick={() => setDel(true)} style={{ ...S.btnGhost, width: '100%', color: T.red, borderColor: T.redBorder, marginTop: 8 }}>Delete neighbour</button>}
      {del && <ConfirmSheet title={`Delete ${neighbour.farm_name}?`} body="Its people and boundary are deleted too. This can't be undone." onConfirm={async () => { await onDelete(); onClose(); }} onClose={() => setDel(false)}/>}
    </Sheet>
  );
}

// Save a neighbour and its people. Returns { id } or { error }.
export async function saveNeighbourTo(em, property, nb, fields, people) {
  const res = nb ? await em.neighbours.update(nb.id, fields, fields.farm_name) : await em.neighbours.add({ ...fields, position: em.neighbours.rows.length }, fields.farm_name);
  if (res.error) return res;
  const id = nb ? nb.id : res.data.id;
  const old = em.people.rows.filter(p => p.neighbour_id === id);
  for (const p of old) if (!people.some(x => x.id === p.id)) await supabase.from('neighbour_people').delete().eq('id', p.id);
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const row = { name: p.name.trim(), role: p.role?.trim() || null, phone: p.phone?.trim() || null, position: i };
    if (p.id) await supabase.from('neighbour_people').update(row).eq('id', p.id);
    else await supabase.from('neighbour_people').insert({ ...row, neighbour_id: id, property_id: property.id });
  }
  em.people.refresh();
  // A new neighbour is added to the procedures that warn neighbours.
  if (!nb) for (const pr of em.procedures.rows) if ((pr.neighbour_ids || []).length || PROCEDURES.find(t => t.title === pr.title)?.neighbours) {
    await em.procedures.update(pr.id, { neighbour_ids: [...(pr.neighbour_ids || []), id] });
  }
  return { id };
}

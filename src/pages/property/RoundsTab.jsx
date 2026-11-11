import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRows } from '../../hooks/useRows';
import { useUsers } from '../../hooks/useUsers';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/audit';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO } from '../../lib/format';
import { fetchNames } from '../../lib/names';
import { Icon, Field, Sheet, Segmented, ConfirmSheet, ActionMenu, Loading, Empty, Toast, SectionLabel, SetupNote } from '../../components/ui';
import { PhotoPicker, uploadPhotos, PhotoStrip, usePhotos } from '../../components/photos';

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = dayIso => { const [y, m, d] = dayIso.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
export const currentPeriod = (freq, today = todayISO()) => (freq === 'weekly' ? mondayOf(today) : today);
const WEEKDAY = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' });

function RoundSheet({ round, items, onSave, onClose }) {
  const { users } = useUsers();
  const [name, setName] = useState(round?.name || '');
  const [freq, setFreq] = useState(round?.frequency || 'daily');
  const [who, setWho] = useState(round?.assigned_to || '');
  const [lines, setLines] = useState(items ? items.map(i => i.name).join('\n') : '');
  const [e, setE] = useState('');
  const save = async () => {
    const list = lines.split('\n').map(s => s.trim()).filter(Boolean);
    if (!name.trim()) { setE('Name the round.'); return; }
    if (!list.length) { setE('Add at least one check, one per line.'); return; }
    const res = await onSave({ name: name.trim(), frequency: freq, assigned_to: who || null }, list);
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title={round ? 'Edit round' : 'New round'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save round</button></>}>
      <Field label="Name" htmlFor="rd-name"><input id="rd-name" value={name} onChange={ev => setName(ev.target.value)} placeholder="e.g. Morning round" style={S.input}/></Field>
      <Field label="How often"><Segmented label="How often" value={freq} onChange={setFreq} options={[['daily', 'Every day'], ['weekly', 'Every week']]}/></Field>
      <Field label="Done by (optional)" htmlFor="rd-who">
        <select id="rd-who" value={who} onChange={ev => setWho(ev.target.value)} style={S.input}>
          <option value="">Anyone</option>
          {users.filter(u => u.active !== false).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </Field>
      <Field label="Checks, one per line" htmlFor="rd-items" hint={items ? 'Renaming keeps a check’s history; removing a line removes that check.' : null}>
        <textarea id="rd-items" rows={7} value={lines} onChange={ev => setLines(ev.target.value)}
          placeholder={'Water troughs full — all camps\nBorehole 2 pump running\nLick in North camp\nBoundary fence walk — east\nGates locked'} style={S.textarea}/>
      </Field>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

function ProblemSheet({ item, onSave, onClose }) {
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Report a problem" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button disabled={busy || !note.trim()} onClick={async () => { setBusy(true); await onSave(note.trim(), files); setBusy(false); onClose(); }}
          style={{ ...S.btnDanger, flex: 2, opacity: note.trim() ? 1 : 0.5 }}>Save problem</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{item.name}</p>
      <Field label="What’s wrong" htmlFor="pb-note">
        <textarea id="pb-note" autoFocus rows={3} value={note} onChange={ev => setNote(ev.target.value)} placeholder="e.g. 2 strands cut near gate 4" style={S.textarea}/>
      </Field>
      <PhotoPicker files={files} setFiles={setFiles}/>
      <p style={{ ...S.meta, margin: 0 }}>A task is created for it on the Tasks tab.</p>
    </Sheet>
  );
}

function CheckRow({ item, check, canWrite, who, onOk, onProblem, onUndo, photos }) {
  const ok = check?.status === 'ok', bad = check?.status === 'problem';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 56, padding: '4px 8px 4px 4px', borderTop: `1px solid ${T.borderLight}` }}>
      <button onClick={() => (check ? onUndo() : onOk())} disabled={!canWrite} aria-pressed={!!check}
        aria-label={check ? `Undo ${item.name}` : `${item.name} OK`} style={{ ...S.iconBtn, cursor: canWrite ? 'pointer' : 'default' }}>
        <span style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
          background: ok ? T.ok : bad ? T.red : T.surface, border: `2px solid ${ok ? T.ok : bad ? T.red : T.textDim}` }}>
          {ok && <Icon name="check" size={16}/>}{bad && '!'}
        </span>
      </button>
      <div style={{ flex: 1, minWidth: 0, padding: '6px 0' }}>
        <div style={{ fontSize: 15, color: T.text }}>{item.name}</div>
        {check && (
          <div style={{ ...S.meta, color: bad ? T.red : S.meta.color }}>
            {bad ? `Problem: ${check.note}${check.task_id ? ' → task created' : ''}` : 'OK'}
            {` · ${new Date(check.checked_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`}{who ? ` · ${who}` : ''}
          </div>
        )}
        {photos?.length > 0 && <PhotoStrip photos={photos} style={{ marginTop: 6 }}/>}
      </div>
      {canWrite && !check && <button onClick={onProblem} style={{ ...S.btnOutline, height: 36, color: T.red, borderColor: T.redBorder }}>Problem</button>}
    </div>
  );
}

export default function RoundsTab({ property, onTasksChanged }) {
  const { user, profile, canWrite, canManage } = useAuth();
  const templates = useRows('round_templates', property.id, { order: [['position', true], ['created_at', true]] });
  const items = useRows('round_items', property.id, { order: [['position', true]] });
  const [checks, setChecks] = useState([]);
  const [names, setNames] = useState({});
  const [sheet, setSheet] = useState(null);
  const [problem, setProblem] = useState(null);
  const [toast, setToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const today = todayISO();

  const since = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 35); return iso(d); }, []);
  const loadChecks = useCallback(async () => {
    const { data } = await supabase.from('round_checks').select('*').eq('property_id', property.id).gte('period', since).order('checked_at');
    setChecks(data || []);
  }, [property.id, since]);
  useEffect(() => { loadChecks(); }, [loadChecks]);
  useEffect(() => { fetchNames([...checks.map(c => c.checked_by), ...templates.rows.map(t => t.assigned_to)]).then(setNames); }, [checks, templates.rows]);
  const problemIds = checks.filter(c => c.status === 'problem' && c.period >= mondayOf(today)).map(c => c.id);
  const photos = usePhotos('round_check', problemIds, property.id);

  if (templates.loading || items.loading) return <Loading label="Loading rounds…"/>;
  if (templates.missing || items.missing) return <SetupNote what="Rounds"/>;

  const active = templates.rows.filter(t => t.active !== false);
  const itemsOf = id => items.rows.filter(i => i.template_id === id);
  const checkOf = (itemId, period) => checks.find(c => c.item_id === itemId && c.period === period);

  const record = async (t, item, status, note = null, files = []) => {
    const period = currentPeriod(t.frequency, today);
    let task_id = null;
    if (status === 'problem') {
      const { data: last } = await supabase.from('tasks').select('position').eq('property_id', property.id).order('position', { ascending: false }).limit(1);
      const { data: task } = await supabase.from('tasks').insert({
        property_id: property.id, name: `${item.name}: ${note}`, notes: `Reported on the ${t.name.toLowerCase()} (${fmtDate(today)}).`,
        priority: 'high', position: ((last && last[0]?.position) ?? -1) + 1, created_by: user.id,
      }).select().single();
      task_id = task?.id || null;
    }
    const row = { template_id: t.id, item_id: item.id, property_id: property.id, period, status, note, task_id };
    const { data, error } = await supabase.from('round_checks').insert(row).select().single();
    if (error) { setToast({ message: /duplicate|unique/i.test(error.message) ? 'Already checked by someone else — refreshing.' : error.message, tone: 'error' }); loadChecks(); return; }
    setChecks(cs => [...cs, { checked_by: user.id, checked_at: new Date().toISOString(), ...data }]);
    if (files.length) { await uploadPhotos(property.id, 'round_check', data.id, files); photos.reload(); }
    if (status === 'problem') {
      onTasksChanged?.();
      logAction({ propertyId: property.id, userId: user.id, userName: profile?.full_name, action: 'reported', entityType: 'round', entityId: data.id, entityName: `${item.name}: ${note}` });
      setToast({ message: 'Problem saved and added to Tasks' });
    }
  };
  const undo = async check => {
    setChecks(cs => cs.filter(c => c.id !== check.id));
    await supabase.from('round_checks').delete().eq('id', check.id);
  };

  const saveRound = async (round, fields, list) => {
    if (!round) {
      const { data, error } = await templates.add({ ...fields, position: templates.rows.length }, fields.name);
      if (error) return { error };
      const { error: e2 } = await supabase.from('round_items').insert(list.map((name, i) => ({ template_id: data.id, property_id: property.id, name, position: i })));
      items.refresh();
      return { error: e2 };
    }
    const res = await templates.update(round.id, fields, fields.name);
    if (res.error) return res;
    const existing = itemsOf(round.id);
    // Keep checks whose line is unchanged; rename by position where the count matches.
    for (let i = 0; i < list.length; i++) {
      const same = existing.find(x => x.name === list[i]);
      if (same) { if (same.position !== i) await supabase.from('round_items').update({ position: i }).eq('id', same.id); continue; }
      const byPos = existing.length === list.length ? existing[i] : null;
      if (byPos && !list.includes(byPos.name)) await supabase.from('round_items').update({ name: list[i], position: i }).eq('id', byPos.id);
      else await supabase.from('round_items').insert({ template_id: round.id, property_id: property.id, name: list[i], position: i });
    }
    const keep = new Set(list);
    for (const x of existing) {
      const renamed = existing.length === list.length && !keep.has(x.name);
      if (!keep.has(x.name) && !renamed) await supabase.from('round_items').delete().eq('id', x.id);
    }
    items.refresh();
    return {};
  };

  // Past periods (not the current one), most recent first.
  const history = [];
  active.forEach(t => {
    const its = itemsOf(t.id);
    const periods = [...new Set(checks.filter(c => c.template_id === t.id && c.period !== currentPeriod(t.frequency, today)).map(c => c.period))].sort().reverse();
    periods.forEach(p => {
      const cs = checks.filter(c => c.template_id === t.id && c.period === p);
      history.push({ key: `${t.id}-${p}`, name: t.name, period: p, weekly: t.frequency === 'weekly', done: cs.length, total: its.length, problems: cs.filter(c => c.status === 'problem') });
    });
  });
  history.sort((a, b) => (a.period < b.period ? 1 : -1));

  return (
    <div>
      <SectionLabel style={{ marginBottom: 8 }}>Today · {WEEKDAY}</SectionLabel>
      {active.length === 0 && <Empty>No rounds yet.{canManage ? ' Add the checks someone does every day or week.' : ''}</Empty>}
      {active.map(t => {
        const its = itemsOf(t.id);
        const period = currentPeriod(t.frequency, today);
        const done = its.filter(i => checkOf(i.id, period)).length;
        const complete = its.length > 0 && done === its.length;
        return (
          <article key={t.id} style={{ ...S.card, marginBottom: 12, overflow: 'hidden', borderColor: complete ? T.okBorder : T.border }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 4px 10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</div>
                <div style={S.meta}>{t.frequency === 'weekly' ? `Weekly · week of ${fmtDate(period)}` : 'Daily'}{t.assigned_to && names[t.assigned_to] ? ` · ${names[t.assigned_to]}` : ''}</div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: complete ? T.ok : T.primary, marginRight: 4 }}>{done}/{its.length}</span>
              {canManage && <ActionMenu title={t.name} label={`More actions for ${t.name}`} items={[
                { icon: 'pencil', label: 'Edit round', onClick: () => setSheet({ edit: t }) },
                { icon: 'trash', label: 'Delete round', danger: true, onClick: () => setSheet({ del: t }) },
              ]}/>}
            </div>
            {its.map(i => {
              const c = checkOf(i.id, period);
              return (
                <CheckRow key={i.id} item={i} check={c} canWrite={canWrite} who={c && names[c.checked_by]} photos={c ? photos.byId[c.id] : null}
                  onOk={() => record(t, i, 'ok')} onProblem={() => setProblem({ t, i })} onUndo={() => undo(c)}/>
              );
            })}
          </article>
        );
      })}
      {canManage && <button onClick={() => setSheet({ add: true })} style={{ ...S.btnDashed, marginBottom: 20 }}><Icon name="plus" size={18}/> New round</button>}

      {history.length > 0 && (
        <>
          <button onClick={() => setShowHistory(v => !v)} style={{ ...S.btnGhost, border: 'none', background: 'none', padding: 0, color: T.primary }}>
            <Icon name={showHistory ? 'chevronU' : 'chevronD'} size={18}/> Past rounds (last 5 weeks)
          </button>
          {showHistory && (
            <div style={{ ...S.card, overflow: 'hidden', marginTop: 8 }}>
              {history.map((h, k) => (
                <div key={h.key} style={{ padding: '10px 14px', borderTop: k ? `1px solid ${T.borderLight}` : 'none' }}>
                  <div style={{ display: 'flex', fontSize: 15 }}>
                    <span style={{ flex: 1 }}>{h.weekly ? `Week of ${fmtDate(h.period)}` : fmtDate(h.period)} · {h.name}</span>
                    <b style={{ color: h.done === h.total ? T.ok : T.warn }}>{h.done}/{h.total}</b>
                  </div>
                  {h.problems.map(p => <div key={p.id} style={{ ...S.meta, color: T.red }}>Problem: {p.note}</div>)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {sheet?.add && <RoundSheet onSave={(f, l) => saveRound(null, f, l)} onClose={() => setSheet(null)}/>}
      {sheet?.edit && <RoundSheet round={sheet.edit} items={itemsOf(sheet.edit.id)} onSave={(f, l) => saveRound(sheet.edit, f, l)} onClose={() => setSheet(null)}/>}
      {sheet?.del && <ConfirmSheet title={`Delete “${sheet.del.name}”?`} body="Its checks and history are deleted too. This can't be undone."
        onConfirm={async () => { await templates.remove(sheet.del.id, sheet.del.name); items.refresh(); }} onClose={() => setSheet(null)}/>}
      {problem && <ProblemSheet item={problem.i} onSave={(note, files) => record(problem.t, problem.i, 'problem', note, files)} onClose={() => setProblem(null)}/>}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast('')}/>}
    </div>
  );
}

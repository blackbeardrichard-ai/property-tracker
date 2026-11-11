import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRows } from '../../hooks/useRows';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO } from '../../lib/format';
import { fetchNames } from '../../lib/names';
import { Icon, Chip, Field, Sheet, Segmented, ConfirmSheet, ActionMenu, Loading, Empty, Toast, SetupNote } from '../../components/ui';
import { PhotoPicker, PhotoStrip, usePhotos, uploadPhotos } from '../../components/photos';

const KINDS = [['theft', 'Stock or property theft'], ['fence', 'Fence or gate damage'], ['fire', 'Veld fire'], ['predator', 'Predator loss'], ['injury', 'Injury'], ['trespass', 'Trespass or poaching'], ['other', 'Other']];
const kindLabel = k => KINDS.find(x => x[0] === k)?.[1] || k;

function IncidentSheet({ incident, areas, onSave, onClose }) {
  const [f, setF] = useState({ kind: incident?.kind || 'theft', title: incident?.title || '', occurred_on: incident?.occurred_on || todayISO(), area_id: incident?.area_id || '',
    description: incident?.description || '', police_case: incident?.police_case || '' });
  const [files, setFiles] = useState([]);
  const [e, setE] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));
  const save = async () => {
    if (!f.title.trim()) { setE('Say briefly what happened.'); return; }
    setBusy(true);
    const res = await onSave({ ...f, title: f.title.trim(), area_id: f.area_id || null, description: f.description.trim() || null, police_case: f.police_case.trim() || null }, files);
    setBusy(false);
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title={incident ? 'Edit incident' : 'Report incident'} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} disabled={busy} style={{ ...S.btnPrimary, flex: 2 }}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Type" htmlFor="in-k"><select id="in-k" value={f.kind} onChange={set('kind')} style={S.input}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="What happened" htmlFor="in-t"><input id="in-t" value={f.title} onChange={set('title')} placeholder="e.g. 2 calves missing from South camp" style={S.input}/></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Date" htmlFor="in-d" style={{ flex: 1, minWidth: 0 }}><input id="in-d" type="date" max={todayISO()} value={f.occurred_on} onChange={set('occurred_on')} style={S.input}/></Field>
        <Field label="Area" htmlFor="in-a" style={{ flex: 1, minWidth: 0 }}>
          <select id="in-a" value={f.area_id} onChange={set('area_id')} style={S.input}><option value="">Not set</option>{areas.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </Field>
      </div>
      <Field label="Details" htmlFor="in-desc"><textarea id="in-desc" rows={3} value={f.description} onChange={set('description')} placeholder="Who found it, what was seen, what was done" style={S.textarea}/></Field>
      <Field label="Police case no. (optional)" htmlFor="in-p"><input id="in-p" value={f.police_case} onChange={set('police_case')} placeholder="e.g. CAS 123/11/2026" style={S.input}/></Field>
      {!incident && <PhotoPicker files={files} setFiles={setFiles}/>}
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

export default function IncidentsTab({ property, areas = [] }) {
  const { canWrite, canManage } = useAuth();
  const api = useRows('incidents', property.id, { order: [['occurred_on', false], ['created_at', false]], audit: 'incident' });
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [names, setNames] = useState({});
  const [toast, setToast] = useState('');
  const photos = usePhotos('incident', open ? [open] : [], property.id);
  useEffect(() => { fetchNames(api.rows.map(r => r.created_by)).then(setNames); }, [api.rows]);

  if (api.loading) return <Loading label="Loading incidents…"/>;
  if (api.missing) return <SetupNote what="The incident log"/>;
  const list = api.rows.filter(i => filter === 'all' || i.status === filter);
  const area = id => areas.find(r => r.id === id)?.name;

  return (
    <div>
      {canWrite && <button onClick={() => setSheet({ add: true })} style={{ ...S.btnPrimary, width: '100%', marginBottom: 14 }}><Icon name="alert" size={18}/> Report incident</button>}
      <div style={{ marginBottom: 12 }}>
        <Segmented label="Show" value={filter} onChange={setFilter}
          options={[['open', `Open (${api.rows.filter(i => i.status === 'open').length})`], ['closed', 'Closed'], ['all', 'All']]}/>
      </div>
      {list.length === 0 ? <Empty>{filter === 'open' ? 'No open incidents.' : 'No incidents.'}</Empty> : list.map(i => (
        <article key={i.id} style={{ ...S.card, marginBottom: 8, overflow: 'hidden', borderColor: i.status === 'open' ? T.redBorder : T.border }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px 12px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{i.title}</div>
                <div style={S.meta}>{[fmtDate(i.occurred_on), kindLabel(i.kind), area(i.area_id), names[i.created_by]].filter(Boolean).join(' · ')}</div>
              </div>
              <Chip tone={i.status === 'open' ? 'red' : 'neutral'}>{i.status === 'open' ? 'Open' : 'Closed'}</Chip>
            </button>
            {(canWrite || canManage) && (
              <ActionMenu title={i.title} label={`More actions for ${i.title}`} items={[
                canWrite && { icon: 'pencil', label: 'Edit', onClick: () => setSheet({ edit: i }) },
                canWrite && { icon: i.status === 'open' ? 'check' : 'flag', label: i.status === 'open' ? 'Close incident' : 'Reopen',
                  onClick: () => api.update(i.id, i.status === 'open' ? { status: 'closed', closed_at: new Date().toISOString() } : { status: 'open', closed_at: null }, i.title) },
                canManage && { icon: 'trash', label: 'Delete', danger: true, onClick: () => setSheet({ del: i }) },
              ]}/>
            )}
          </div>
          {open === i.id && (
            <div style={{ borderTop: `1px solid ${T.borderLight}`, padding: '12px 14px 14px' }}>
              {i.description && <p style={{ margin: '0 0 10px', fontSize: 15, color: T.textMid, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{i.description}</p>}
              {i.police_case && <div style={{ fontSize: 14, marginBottom: 10 }}><b>Police case:</b> {i.police_case}</div>}
              {i.closed_at && <div style={{ ...S.meta, marginBottom: 10 }}>Closed {fmtDate(i.closed_at)}</div>}
              <PhotoStrip photos={photos.byId[i.id] || []} canAdd={canWrite} onAdd={f => photos.add(i.id, f)} onDelete={canWrite ? photos.remove : null}/>
            </div>
          )}
        </article>
      ))}

      {sheet?.add && <IncidentSheet areas={areas} onClose={() => setSheet(null)} onSave={async (row, files) => {
        const r = await api.add({ ...row, status: 'open' }, row.title);
        if (r.error) return r;
        if (files.length) await uploadPhotos(property.id, 'incident', r.data.id, files);
        setToast('Incident saved'); return {};
      }}/>}
      {sheet?.edit && <IncidentSheet incident={sheet.edit} areas={areas} onClose={() => setSheet(null)} onSave={row => api.update(sheet.edit.id, row, row.title)}/>}
      {sheet?.del && <ConfirmSheet title={`Delete “${sheet.del.title}”?`} body="This can't be undone." onConfirm={() => api.remove(sheet.del.id, sheet.del.title)} onClose={() => setSheet(null)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

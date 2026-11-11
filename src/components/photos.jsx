import { useEffect, useRef, useState, useCallback } from 'react';
import { T, S } from '../lib/theme';
import { addPhoto, deletePhoto, listPhotos, photoUrls } from '../lib/photos';
import { Icon, Sheet, ConfirmSheet } from './ui';

// Photos for many items of one kind at once (one query), e.g. all subtasks of a task.
export function usePhotos(entityType, ids, propertyId) {
  const key = (ids || []).filter(Boolean).join(',');
  const [byId, setById] = useState({});
  const load = useCallback(async () => { setById(await listPhotos(entityType, key ? key.split(',') : [])); }, [entityType, key]);
  useEffect(() => { load(); }, [load]);
  const add = async (entityId, files) => {
    for (const file of files) {
      const { data, error } = await addPhoto({ propertyId, entityType, entityId, file });
      if (error) return { error };
      if (data) setById(m => ({ ...m, [entityId]: [...(m[entityId] || []), data] }));
    }
    return {};
  };
  const remove = async photo => {
    setById(m => ({ ...m, [photo.entity_id]: (m[photo.entity_id] || []).filter(p => p.id !== photo.id) }));
    await deletePhoto(photo);
  };
  return { byId, add, remove, reload: load };
}

// Upload photos for an item that's just been saved (used by "new" sheets with a PhotoPicker).
export async function uploadPhotos(propertyId, entityType, entityId, files) {
  for (const file of files || []) {
    const { error } = await addPhoto({ propertyId, entityType, entityId, file });
    if (error) return { error };
  }
  return {};
}

const tile = { width: 64, height: 64, borderRadius: 8, flexShrink: 0 };

// Two tiles: "Camera" opens the phone's camera directly (capture), "Gallery" picks existing photos.
// Android's picker for multiple files often hides the camera, so the camera gets its own input.
function AddTile({ onFiles }) {
  const cam = useRef(null), gal = useRef(null);
  const pick = e => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) onFiles(f); };
  const btn = { ...tile, border: `1.5px dashed ${T.border}`, background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, cursor: 'pointer', color: T.primary, fontFamily: T.sans, fontSize: 11, fontWeight: 600 };
  return (
    <>
      <button type="button" onClick={() => cam.current?.click()} aria-label="Take a photo" style={btn}><Icon name="camera" size={20}/>Camera</button>
      <button type="button" onClick={() => gal.current?.click()} aria-label="Choose from gallery" style={btn}><Icon name="image" size={20}/>Gallery</button>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick}/>
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={pick}/>
    </>
  );
}

function Viewer({ url, onDelete, onClose }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title="Photo" onClose={onClose}>
      {url ? <img src={url} alt="" style={{ width: '100%', borderRadius: 10, display: 'block', background: T.surface2 }}/>
        : <div style={{ ...S.meta, padding: 30, textAlign: 'center' }}>Needs signal to show.</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {url && <a href={url} target="_blank" rel="noreferrer" style={{ ...S.btnGhost, flex: 1, textDecoration: 'none' }}>Open full size</a>}
        {onDelete && <button onClick={() => setConfirm(true)} style={{ ...S.btnGhost, flex: 1, color: T.red, borderColor: T.redBorder }}><Icon name="trash" size={18}/> Delete</button>}
      </div>
      {confirm && <ConfirmSheet title="Delete this photo?" body="This can't be undone." onConfirm={() => { onDelete(); onClose(); }} onClose={() => setConfirm(false)}/>}
    </Sheet>
  );
}

// Thumbnails for saved photos, plus an add tile.
export function PhotoStrip({ photos = [], canAdd, onAdd, onDelete, style }) {
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const paths = photos.map(p => p.path).join('|');
  useEffect(() => { let live = true; if (paths) photoUrls(paths.split('|')).then(u => { if (live) setUrls(u); }); return () => { live = false; }; }, [paths]);
  if (!photos.length && !canAdd) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {photos.map(p => (
        <button key={p.id} onClick={() => setOpen(p)} aria-label="View photo"
          style={{ ...tile, padding: 0, border: `1px solid ${T.border}`, cursor: 'pointer', overflow: 'hidden', background: T.surface2 }}>
          {urls[p.path] ? <img src={urls[p.path]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            : <Icon name="image" size={20} color={T.textDim}/>}
        </button>
      ))}
      {canAdd && (busy ? <div style={{ ...tile, display: 'flex', alignItems: 'center', justifyContent: 'center', ...S.meta }}>Saving…</div>
        : <AddTile onFiles={async f => { setBusy(true); await onAdd(f); setBusy(false); }}/>)}
      {open && <Viewer url={urls[open.path]} onDelete={onDelete ? () => onDelete(open) : null} onClose={() => setOpen(null)}/>}
    </div>
  );
}

// Photos chosen in a "new item" sheet, before the item exists. Upload them after saving with uploadPhotos().
export function PhotoPicker({ files, setFiles, label = 'Photos (optional)' }) {
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const u = files.map(f => URL.createObjectURL(f));
    setPreviews(u);
    return () => u.forEach(x => URL.revokeObjectURL(x));
  }, [files]);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {previews.map((u, i) => (
          <div key={u} style={{ ...tile, position: 'relative', overflow: 'hidden', border: `1px solid ${T.border}` }}>
            <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            <button onClick={() => setFiles(fs => fs.filter((_, k) => k !== i))} aria-label="Remove photo"
              style={{ position: 'absolute', top: 2, right: 2, width: 24, height: 24, borderRadius: 12, border: 'none', background: 'rgba(17,24,39,.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="close" size={14}/>
            </button>
          </div>
        ))}
        <AddTile onFiles={f => setFiles(fs => [...fs, ...f])}/>
      </div>
    </div>
  );
}

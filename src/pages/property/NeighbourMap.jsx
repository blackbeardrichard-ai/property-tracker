import { useEffect, useRef, useState } from 'react';
import FarmMap, { neighbourColor } from '../../components/FarmMap';
import { T, S } from '../../lib/theme';
import { parseLocation } from '../../lib/location';
import { readOutlines } from '../../lib/kml';
import { telHref } from '../../lib/phone';
import { Icon, Sheet, Toast } from '../../components/ui';

// Satellite map of the farm and its neighbours, with drawing and Google Earth import for managers.
//   em: the emergency data (neighbours + people), from useEmergency()
export default function NeighbourMap({ property, em, canEdit, onSaveProperty, height = 420 }) {
  const pin = parseLocation(property.map_location);
  const [picked, setPicked] = useState(null);
  const [draw, setDraw] = useState(null);        // { target: 'self' | neighbourId | 'new', name, points }
  const [imports, setImports] = useState(null);  // [{ name, boundary, to }]
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const topRef = useRef(null);
  // When drawing starts, bring the banner and map into view (the Draw buttons sit below the map).
  const drawing = !!draw;
  useEffect(() => { if (drawing) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [drawing]);
  const neighbours = em.neighbours.rows;

  const peopleOf = id => em.people.rows.filter(p => p.neighbour_id === id);
  const sel = picked === 'self' ? { farm_name: property.name, self: true } : neighbours.find(n => n.id === picked);

  const startDraw = (target, name) => { setPicked(null); setDraw({ target, name, points: [] }); };
  const saveDraw = async () => {
    const pts = draw.points.map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6]);
    let res;
    if (draw.target === 'self') res = await onSaveProperty({ boundary: pts });
    else if (draw.target === 'new') res = await em.neighbours.add({ farm_name: draw.name || 'Neighbour', boundary: pts, position: neighbours.length }, draw.name);
    else res = await em.neighbours.update(draw.target, { boundary: pts }, draw.name);
    if (res?.error) { setToast({ message: res.error.message, tone: 'error' }); return; }
    setToast({ message: `${draw.name}: boundary saved` });
    setDraw(null);
  };

  const onFile = async e => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const found = await readOutlines(f);
      if (!found.length) { setToast({ message: 'No farm outlines (polygons) found in that file.', tone: 'error' }); return; }
      setImports(found.map(o => {
        const match = neighbours.find(n => n.farm_name.toLowerCase() === o.name.toLowerCase());
        const self = o.name.toLowerCase().includes(property.name.toLowerCase());
        return { ...o, to: self ? 'self' : match ? match.id : 'new' };
      }));
    } catch (err) { setToast({ message: err.message, tone: 'error' }); }
  };
  const saveImports = async () => {
    let n = 0;
    for (const o of imports) {
      if (o.to === 'skip') continue;
      const res = o.to === 'self' ? await onSaveProperty({ boundary: o.boundary })
        : o.to === 'new' ? await em.neighbours.add({ farm_name: o.name, boundary: o.boundary, position: neighbours.length + n }, o.name)
          : await em.neighbours.update(o.to, { boundary: o.boundary }, o.name);
      if (res?.error) { setToast({ message: res.error.message, tone: 'error' }); return; }
      n++;
    }
    setImports(null);
    setToast({ message: `${n} outline${n === 1 ? '' : 's'} imported` });
  };

  return (
    <div ref={topRef} style={{ scrollMarginTop: 80 }}>
      {draw && (
        <div style={{ background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 10, padding: '10px 12px', marginBottom: 10, fontSize: 14, color: '#713F12' }}>
          <b>Drawing {draw.name}.</b> Tap each corner of the boundary on the map, in order. {draw.points.length} point{draw.points.length === 1 ? '' : 's'}.
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setDraw(d => ({ ...d, points: d.points.slice(0, -1) }))} disabled={!draw.points.length} style={{ ...S.btnOutline, height: 36 }}>Undo</button>
            <button onClick={() => setDraw(null)} style={{ ...S.btnOutline, height: 36 }}>Cancel</button>
            <button onClick={saveDraw} disabled={draw.points.length < 3} style={{ ...S.btnPrimary, height: 36, marginLeft: 'auto', opacity: draw.points.length < 3 ? 0.5 : 1 }}>Save</button>
          </div>
        </div>
      )}
      <FarmMap pin={pin} boundary={property.boundary} neighbours={neighbours} height={height} selectedId={picked}
        onPick={id => setPicked(id)} drawing={draw ? draw.points : null} onMapTap={(lat, lng) => setDraw(d => ({ ...d, points: [...d.points, [lat, lng]] }))}/>
      {!pin && !property.boundary && !neighbours.some(n => n.boundary) && (
        <p style={{ ...S.meta, marginTop: 8 }}>No map pin or boundaries yet. {canEdit ? 'Draw them below, or import from Google Earth.' : ''}</p>
      )}

      {sel && !draw && (
        <div style={{ ...S.card, padding: '12px 14px', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{sel.farm_name}</div>
            <button onClick={() => setPicked(null)} aria-label="Close" style={{ ...S.iconBtn, width: 36, height: 36 }}><Icon name="close" size={18}/></button>
          </div>
          {sel.notes && <div style={{ ...S.meta, marginBottom: 6 }}>{sel.notes}</div>}
          {!sel.self && peopleOf(sel.id).length === 0 && <div style={S.meta}>No contacts saved for this farm.</div>}
          {!sel.self && peopleOf(sel.id).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${T.borderLight}` }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15 }}>{p.name}</div><div style={S.meta}>{[p.role, p.phone].filter(Boolean).join(' · ')}</div></div>
              {p.phone && <a href={telHref(p.phone)} style={{ ...S.btnPrimary, height: 40, textDecoration: 'none' }}><Icon name="phone" size={16}/> Call</a>}
            </div>
          ))}
          {canEdit && <button onClick={() => startDraw(sel.self ? 'self' : sel.id, sel.farm_name)} style={{ ...S.btnOutline, marginTop: 8 }}><Icon name="pencil" size={16}/> Redraw boundary</button>}
        </div>
      )}

      {canEdit && !draw && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button onClick={() => startDraw('self', property.name)} style={S.btnGhost}><Icon name="pencil" size={18}/> {property.boundary ? 'Redraw our farm' : 'Draw our farm'}</button>
          <button onClick={() => fileRef.current?.click()} style={S.btnGhost}><Icon name="download" size={18}/> Google Earth file</button>
          {neighbours.filter(n => !n.boundary).map(n => (
            <button key={n.id} onClick={() => startDraw(n.id, n.farm_name)} style={{ ...S.btnGhost, gridColumn: '1 / -1' }}><Icon name="pencil" size={18}/> Draw {n.farm_name}</button>
          ))}
          <input ref={fileRef} type="file" accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz" hidden onChange={onFile}/>
        </div>
      )}
      {neighbours.some(n => n.boundary) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
          {neighbours.map((n, i) => n.boundary && (
            <button key={n.id} onClick={() => setPicked(n.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '4px 0', fontFamily: T.sans, fontSize: 14, color: T.text, cursor: 'pointer' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: neighbourColor(i) }}/>{n.farm_name}
            </button>
          ))}
        </div>
      )}

      {imports && (
        <Sheet title="Import outlines" onClose={() => setImports(null)}
          footer={<><button onClick={() => setImports(null)} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={saveImports} style={{ ...S.btnPrimary, flex: 2 }}>Import</button></>}>
          <p style={{ ...S.meta, fontSize: 14, margin: '-6px 0 12px' }}>Say what each outline in the file is.</p>
          {imports.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15 }}>{o.name}</div><div style={S.meta}>{o.boundary.length} points</div></div>
              <select aria-label={`What is ${o.name}`} value={o.to} onChange={e => setImports(list => list.map((x, k) => (k === i ? { ...x, to: e.target.value } : x)))} style={{ ...S.input, width: 'auto', minWidth: 150 }}>
                <option value="self">Our farm ({property.name})</option>
                <option value="new">New neighbour</option>
                {neighbours.map(n => <option key={n.id} value={n.id}>{n.farm_name}</option>)}
                <option value="skip">Skip</option>
              </select>
            </div>
          ))}
        </Sheet>
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)}/>}
    </div>
  );
}

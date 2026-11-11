import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRows } from '../../hooks/useRows';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO } from '../../lib/format';
import { Icon, Field, Sheet, ConfirmSheet, Loading, Toast, SectionLabel, SetupNote, Tiles } from '../../components/ui';

const mm = v => `${Number(v).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} mm`;
const m = v => `${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m`;
// Rain season runs 1 July to 30 June (summer rainfall).
const seasonStart = (d = new Date()) => `${d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1}-07-01`;
const lastSeason = start => { const y = Number(start.slice(0, 4)) - 1; return [`${y}-07-01`, `${y + 1}-06-30`]; };

function NumberSheet({ title, label, unit, withDate = true, extra, onSave, onClose }) {
  const [v, setV] = useState('');
  const [d, setD] = useState(todayISO());
  const [e, setE] = useState('');
  return (
    <Sheet title={title} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={async () => { if (v === '' || Number(v) < 0) { setE('Enter a value.'); return; } const r = await onSave(Number(v), d); if (r?.error) setE(r.error.message); else onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      {extra}
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={`${label}, ${unit}`} htmlFor="nv" style={{ flex: 1, minWidth: 0 }}><input id="nv" autoFocus type="number" inputMode="decimal" min="0" step="0.1" value={v} onChange={ev => { setV(ev.target.value); setE(''); }} style={S.input}/></Field>
        {withDate && <Field label="Date" htmlFor="nd" style={{ flex: 1, minWidth: 0 }}><input id="nd" type="date" max={todayISO()} value={d} onChange={ev => setD(ev.target.value)} style={S.input}/></Field>}
      </div>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

export default function WaterTab({ property }) {
  const { canWrite, canManage } = useAuth();
  const rain = useRows('rain_log', property.id, { order: [['rain_on', false], ['created_at', false]] });
  const holes = useRows('boreholes', property.id, { order: [['position', true], ['created_at', true]] });
  const levels = useRows('borehole_readings', property.id, { order: [['read_on', false], ['created_at', false]] });
  const [sheet, setSheet] = useState(null);
  const [newHole, setNewHole] = useState('');
  const [toast, setToast] = useState('');
  const [showRain, setShowRain] = useState(false);
  const start = useMemo(() => seasonStart(), []);

  if (rain.loading || holes.loading || levels.loading) return <Loading label="Loading rain and water…"/>;
  if (rain.missing || holes.missing) return <SetupNote what="Rain and water records"/>;

  const season = rain.rows.filter(r => r.rain_on >= start);
  const total = season.reduce((a, r) => a + Number(r.mm), 0);
  const [ls, le] = lastSeason(start);
  const lastToDate = (() => { const t = todayISO(); const sameDay = `${Number(t.slice(0, 4)) - 1}${t.slice(4)}`; return rain.rows.filter(r => r.rain_on >= ls && r.rain_on <= le && r.rain_on <= sameDay).reduce((a, r) => a + Number(r.mm), 0); })();
  const last = rain.rows[0];
  const byMonth = {};
  season.forEach(r => { const k = r.rain_on.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + Number(r.mm); });
  const months = Object.entries(byMonth).sort();
  const maxMonth = Math.max(1, ...months.map(([, v]) => v));
  const readingsOf = id => levels.rows.filter(r => r.borehole_id === id);

  return (
    <div>
      <SectionLabel style={{ marginBottom: 8 }}>Rain · season from {fmtDate(start)}</SectionLabel>
      <Tiles items={[[mm(total), 'This season', T.info], [rain.rows.some(r => r.rain_on >= ls && r.rain_on <= le) ? mm(lastToDate) : '—', 'Same time last season'], [last ? mm(last.mm) : '—', last ? `Last: ${fmtDate(last.rain_on)}` : 'No rain logged']]}/>
      {months.length > 0 && (
        <div style={{ ...S.card, padding: '12px 14px', marginBottom: 10 }}>
          {months.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 14 }}>
              <span style={{ width: 36, color: T.textMid }}>{new Date(`${k}-01T00:00`).toLocaleDateString('en-ZA', { month: 'short' })}</span>
              <div style={{ flex: 1, height: 10, background: T.controlBg, borderRadius: 5 }}><div style={{ width: `${(v / maxMonth) * 100}%`, height: '100%', background: T.info, borderRadius: 5 }}/></div>
              <b style={{ width: 64, textAlign: 'right' }}>{mm(v)}</b>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {canWrite && <button onClick={() => setSheet({ rain: true })} style={{ ...S.btnPrimary, flex: 1 }}><Icon name="rain" size={18}/> Log rain</button>}
        {rain.rows.length > 0 && <button onClick={() => setShowRain(v => !v)} style={{ ...S.btnGhost, flex: 1 }}>{showRain ? 'Hide entries' : 'Show entries'}</button>}
      </div>
      {showRain && (
        <div style={{ ...S.card, overflow: 'hidden', marginBottom: 8 }}>
          {rain.rows.slice(0, 60).map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', minHeight: 48, padding: '4px 4px 4px 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none', fontSize: 15 }}>
              <span style={{ flex: 1 }}>{fmtDate(r.rain_on)}</span><b>{mm(r.mm)}</b>
              {canManage ? <button onClick={() => setSheet({ delRain: r })} aria-label="Delete entry" style={S.iconBtn}><Icon name="trash" size={16}/></button> : <span style={{ width: 14 }}/>}
            </div>
          ))}
        </div>
      )}

      <SectionLabel style={{ margin: '22px 0 8px' }}>Boreholes · water level</SectionLabel>
      <p style={{ ...S.meta, margin: '-2px 0 10px' }}>Depth to water from the top of the borehole. A bigger number means the water is lower.</p>
      {holes.rows.length === 0 && <div style={{ ...S.meta, marginBottom: 8 }}>No boreholes added.</div>}
      {holes.rows.map(h => {
        const rs = readingsOf(h.id);
        const [cur, prev] = rs;
        const diff = cur && prev ? Number(cur.level_m) - Number(prev.level_m) : null;
        return (
          <div key={h.id} style={{ ...S.card, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{h.name}</div>
                <div style={S.meta}>{cur ? `${m(cur.level_m)} · ${fmtDate(cur.read_on)}` : 'No reading yet'}</div>
              </div>
              {diff != null && <span style={{ fontSize: 14, fontWeight: 700, color: diff > 0 ? T.red : T.ok }}>{diff > 0 ? '▼ dropped' : '▲ rose'} {m(Math.abs(diff))}</span>}
            </div>
            {rs.length > 1 && <div style={{ ...S.meta, marginTop: 6 }}>Earlier: {rs.slice(1, 5).map(r => `${m(r.level_m)} (${fmtDate(r.read_on)})`).join(' · ')}</div>}
            {canWrite && <button onClick={() => setSheet({ level: h })} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="gauge" size={16}/> Log level</button>}
          </div>
        );
      })}
      {canManage && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input aria-label="New borehole name" value={newHole} onChange={e => setNewHole(e.target.value)} placeholder="Borehole name, e.g. Borehole 3" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
          <button onClick={async () => { if (!newHole.trim()) return; await holes.add({ name: newHole.trim(), position: holes.rows.length }); setNewHole(''); }} style={S.btnPrimary}><Icon name="plus" size={18}/> Add</button>
        </div>
      )}

      {sheet?.rain && <NumberSheet title="Log rain" label="Rain" unit="mm" onClose={() => setSheet(null)}
        onSave={async (v, d) => { const r = await rain.add({ mm: v, rain_on: d }); if (!r.error) setToast(`${mm(v)} logged`); return r; }}/>}
      {sheet?.level && <NumberSheet title={`${sheet.level.name}: water level`} label="Depth to water" unit="m" onClose={() => setSheet(null)}
        onSave={async (v, d) => { const r = await levels.add({ borehole_id: sheet.level.id, level_m: v, read_on: d }); if (!r.error) setToast(`${sheet.level.name}: ${m(v)}`); return r; }}/>}
      {sheet?.delRain && <ConfirmSheet title="Delete this rain entry?" body={`${fmtDate(sheet.delRain.rain_on)} · ${mm(sheet.delRain.mm)}`} onConfirm={() => rain.remove(sheet.delRain.id)} onClose={() => setSheet(null)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

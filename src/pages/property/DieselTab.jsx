import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRows } from '../../hooks/useRows';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO } from '../../lib/format';
import { fetchNames } from '../../lib/names';
import { Icon, Field, Sheet, Segmented, ConfirmSheet, Loading, Empty, Toast, SectionLabel, SetupNote, Tiles } from '../../components/ui';

const L = v => `${Number(v).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} L`;
const R = v => `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const byTime = (a, b) => (a.entry_date === b.entry_date ? (a.created_at < b.created_at ? -1 : 1) : a.entry_date < b.entry_date ? -1 : 1);

// Level in a tank: the last dip reading, plus fills and minus issues since then.
export function tankLevel(tankId, log) {
  let level = null;
  log.filter(e => e.tank_id === tankId).sort(byTime).forEach(e => {
    if (e.kind === 'dip') level = Number(e.litres);
    else if (e.kind === 'fill') level = (level ?? 0) + Number(e.litres);
    else if (e.kind === 'issue') level = (level ?? 0) - Number(e.litres);
  });
  return level;
}

function EntrySheet({ kind, tanks, assets, onSave, onClose }) {
  const [f, setF] = useState({ tank_id: tanks[0]?.id || '', asset_id: '', litres: '', price_excl: '', meter_reading: '', entry_date: todayISO(), notes: '' });
  const [e, setE] = useState('');
  const set = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));
  const asset = assets.find(a => a.id === f.asset_id);
  const title = { fill: 'Diesel delivered', issue: 'Diesel issued', dip: 'Tank dip reading' }[kind];
  const save = async () => {
    if (f.litres === '' || Number(f.litres) < 0) { setE('Enter the litres.'); return; }
    if (kind !== 'issue' && !f.tank_id) { setE('Choose the tank.'); return; }
    if (kind === 'issue' && !f.asset_id && !f.notes.trim()) { setE('Choose the vehicle or machine, or say what it was for.'); return; }
    const num = v => (v === '' ? null : Number(v));
    const res = await onSave({ kind, tank_id: f.tank_id || null, asset_id: f.asset_id || null, litres: Number(f.litres),
      price_excl: kind === 'fill' ? num(f.price_excl) : null, meter_reading: kind === 'issue' ? num(f.meter_reading) : null,
      entry_date: f.entry_date, notes: f.notes.trim() || null }, asset);
    if (res?.error) { setE(res.error.message); return; }
    onClose();
  };
  return (
    <Sheet title={title} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      {tanks.length > 0 && (
        <Field label={kind === 'issue' ? 'From tank' : 'Tank'} htmlFor="dl-tank">
          <select id="dl-tank" value={f.tank_id} onChange={set('tank_id')} style={S.input}>
            {kind === 'issue' && <option value="">Not from a farm tank (filling station)</option>}
            {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}
      {kind === 'issue' && (
        <Field label="Vehicle or machine" htmlFor="dl-asset">
          <select id="dl-asset" value={f.asset_id} onChange={set('asset_id')} style={S.input}>
            <option value="">Other (say in notes)</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={kind === 'dip' ? 'Litres in tank' : 'Litres'} htmlFor="dl-l" style={{ flex: 1, minWidth: 0 }}>
          <input id="dl-l" autoFocus type="number" inputMode="decimal" min="0" value={f.litres} onChange={set('litres')} style={S.input}/>
        </Field>
        <Field label="Date" htmlFor="dl-d" style={{ flex: 1, minWidth: 0 }}><input id="dl-d" type="date" max={todayISO()} value={f.entry_date} onChange={set('entry_date')} style={S.input}/></Field>
      </div>
      {kind === 'fill' && (
        <Field label="Total paid, R excl. VAT" htmlFor="dl-p" hint={f.price_excl && f.litres ? `${R(Number(f.price_excl) / Number(f.litres))} per litre` : null}>
          <input id="dl-p" type="number" inputMode="decimal" min="0" step="0.01" value={f.price_excl} onChange={set('price_excl')} style={S.input}/>
        </Field>
      )}
      {kind === 'issue' && asset?.meter_type && (
        <Field label={`${asset.meter_type === 'km' ? 'Odometer, km' : 'Hour meter, h'}`} htmlFor="dl-m" hint={asset.meter_reading != null ? `Last: ${Number(asset.meter_reading).toLocaleString('en-ZA')}` : null}>
          <input id="dl-m" type="number" inputMode="decimal" min="0" value={f.meter_reading} onChange={set('meter_reading')} style={S.input}/>
        </Field>
      )}
      <Field label="Notes (optional)" htmlFor="dl-n"><input id="dl-n" value={f.notes} onChange={set('notes')} placeholder={kind === 'fill' ? 'e.g. Supplier, delivery note no.' : ''} style={S.input}/></Field>
      {e && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{e}</div>}
    </Sheet>
  );
}

function TankSheet({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  return (
    <Sheet title="Add tank" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={async () => { if (!name.trim()) return; const r = await onSave({ name: name.trim(), capacity_l: cap === '' ? null : Number(cap) }); if (!r?.error) onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}>Add tank</button></>}>
      <Field label="Name" htmlFor="tk-n"><input id="tk-n" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diesel bowser" style={S.input}/></Field>
      <Field label="Capacity, litres (optional)" htmlFor="tk-c"><input id="tk-c" type="number" inputMode="numeric" min="0" value={cap} onChange={e => setCap(e.target.value)} style={S.input}/></Field>
      <p style={{ ...S.meta, margin: 0 }}>Then log a dip reading to set what's in it now.</p>
    </Sheet>
  );
}

export default function DieselTab({ property }) {
  const { canWrite, canManage } = useAuth();
  const tanksApi = useRows('fuel_tanks', property.id, { order: [['created_at', true]] });
  const logApi = useRows('fuel_log', property.id, { order: [['entry_date', false], ['created_at', false]], audit: 'diesel' });
  const [assets, setAssets] = useState([]);
  const [names, setNames] = useState({});
  const [sheet, setSheet] = useState(null);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    supabase.from('assets').select('id, name, meter_type, meter_reading').eq('current_property_id', property.id).order('name').then(({ data }) => setAssets(data || []));
  }, [property.id]);
  useEffect(() => { fetchNames(logApi.rows.map(r => r.created_by)).then(setNames); }, [logApi.rows]);

  const log = logApi.rows;
  const since = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - Number(period)); return d.toISOString().slice(0, 10); }, [period]);
  const recent = log.filter(e => e.entry_date >= since);
  const used = recent.filter(e => e.kind === 'issue').reduce((a, e) => a + Number(e.litres), 0);
  const bought = recent.filter(e => e.kind === 'fill');
  const spend = bought.reduce((a, e) => a + Number(e.price_excl || 0), 0);
  const assetName = id => assets.find(a => a.id === id)?.name;
  const tankName = id => tanksApi.rows.find(t => t.id === id)?.name;

  if (tanksApi.loading || logApi.loading) return <Loading label="Loading diesel…"/>;
  if (tanksApi.missing || logApi.missing) return <SetupNote what="The diesel log"/>;

  const save = async (row, asset) => {
    const res = await logApi.add(row, `${row.kind} ${row.litres} L`);
    if (res.error) return res;
    if (row.kind === 'issue' && asset && row.meter_reading != null && (asset.meter_reading == null || row.meter_reading >= asset.meter_reading)) {
      await supabase.from('meter_readings').insert({ property_id: property.id, asset_id: asset.id, reading: row.meter_reading, read_on: row.entry_date });
      await supabase.from('assets').update({ meter_reading: row.meter_reading, meter_date: row.entry_date }).eq('id', asset.id);
      setAssets(as => as.map(a => (a.id === asset.id ? { ...a, meter_reading: row.meter_reading } : a)));
    }
    setToast({ fill: `${L(row.litres)} delivered`, issue: `${L(row.litres)} issued`, dip: `Tank set to ${L(row.litres)}` }[row.kind]);
    return {};
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}><Segmented label="Period" value={period} onChange={setPeriod} options={[['30', '30 days'], ['90', '90 days'], ['365', '12 months']]}/></div>
      <Tiles items={[[L(used), 'Used'], [L(bought.reduce((a, e) => a + Number(e.litres), 0)), 'Bought'], [spend ? R(spend) : 'R 0', 'Spent excl. VAT']]}/>
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button onClick={() => setSheet('issue')} style={{ ...S.btnPrimary, flex: 1 }}><Icon name="fuel" size={18}/> Issue diesel</button>
          <button onClick={() => setSheet('fill')} disabled={!tanksApi.rows.length} style={{ ...S.btnGhost, flex: 1, opacity: tanksApi.rows.length ? 1 : 0.5 }}><Icon name="plus" size={18}/> Delivery</button>
        </div>
      )}

      <SectionLabel style={{ marginBottom: 8 }}>Tanks</SectionLabel>
      {tanksApi.rows.length === 0 && <div style={{ ...S.meta, marginBottom: 8 }}>No farm tank yet. Add one to track deliveries and what's left.</div>}
      {tanksApi.rows.map(t => {
        const lvl = tankLevel(t.id, log);
        const pct = lvl != null && t.capacity_l ? Math.max(0, Math.min(100, (lvl / t.capacity_l) * 100)) : null;
        return (
          <div key={t.id} style={{ ...S.card, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: pct != null && pct < 20 ? T.red : T.text }}>{lvl == null ? 'No dip yet' : `${L(lvl)} left`}</div>
            </div>
            {t.capacity_l && <div style={S.meta}>Capacity {L(t.capacity_l)}</div>}
            {pct != null && <div style={{ height: 8, background: T.controlBg, borderRadius: 4, marginTop: 8 }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct < 20 ? T.red : T.primary }}/></div>}
            {canWrite && <button onClick={() => setSheet('dip')} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="gauge" size={16}/> Dip reading</button>}
          </div>
        );
      })}
      {canManage && <button onClick={() => setSheet('tank')} style={{ ...S.btnDashed, margin: '4px 0 20px' }}><Icon name="plus" size={18}/> Add tank</button>}

      <SectionLabel style={{ marginBottom: 8 }}>Log</SectionLabel>
      {log.length === 0 ? <Empty>No diesel logged yet.</Empty> : (
        <div style={{ ...S.card, overflow: 'hidden' }}>
          {log.slice(0, 60).map((e, i) => (
            <button key={e.id} onClick={() => canManage && setDel(e)} disabled={!canManage}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 14px', background: 'none', border: 'none',
                borderTop: i ? `1px solid ${T.borderLight}` : 'none', textAlign: 'left', fontFamily: T.sans, cursor: canManage ? 'pointer' : 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: T.text }}>
                  {fmtDate(e.entry_date)} · {e.kind === 'issue' ? (assetName(e.asset_id) || e.notes || 'Issued') : e.kind === 'fill' ? `Delivery to ${tankName(e.tank_id) || 'tank'}` : `Dip: ${tankName(e.tank_id) || 'tank'}`}
                </div>
                <div style={S.meta}>{[e.meter_reading != null ? `at ${Number(e.meter_reading).toLocaleString('en-ZA')}` : null, e.price_excl ? `${R(e.price_excl)} excl. VAT` : null,
                  e.kind === 'issue' && e.notes && e.asset_id ? e.notes : null, names[e.created_by]].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: e.kind === 'fill' ? T.ok : T.text, whiteSpace: 'nowrap' }}>{e.kind === 'fill' ? '+' : e.kind === 'issue' ? '−' : '='}{L(e.litres)}</span>
            </button>
          ))}
        </div>
      )}

      {['fill', 'issue', 'dip'].includes(sheet) && <EntrySheet kind={sheet} tanks={tanksApi.rows} assets={assets} onSave={save} onClose={() => setSheet(null)}/>}
      {sheet === 'tank' && <TankSheet onSave={row => tanksApi.add(row, row.name)} onClose={() => setSheet(null)}/>}
      {del && <ConfirmSheet title="Delete this entry?" body={`${fmtDate(del.entry_date)} · ${L(del.litres)}. This can't be undone.`} onConfirm={() => logApi.remove(del.id, 'diesel entry')} onClose={() => setDel(null)}/>}
      {toast && <Toast message={toast} onDismiss={() => setToast('')}/>}
    </div>
  );
}

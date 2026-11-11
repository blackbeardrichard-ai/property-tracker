import { useState } from 'react';
import { T, S } from '../../lib/theme';
import { parseLocation, isLink, fmtCoords } from '../../lib/location';
import { Icon, Segmented, Field, Sheet } from '../../components/ui';

export const PROPERTY_ICONS = ['🏠', '🌾', '🌿', '🏡', '🏗️', '🏢', '🌲', '🏕️', '🌴', '🏔️'];

// Map pin input: paste a Google Maps link or coordinates, or use this device's GPS.
export function LocationField({ value, onChange }) {
  const [gps, setGps] = useState('');
  const coords = parseLocation(value);
  const here = () => {
    if (!navigator.geolocation) { setGps('This device can’t share its location.'); return; }
    setGps('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      p => { onChange(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`); setGps(`Accurate to about ${Math.round(p.coords.accuracy)} m.`); },
      e => setGps(e.code === 1 ? 'Location permission was refused.' : 'Couldn’t get your location. Try again outdoors.'),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };
  let status = null;
  if (value?.trim()) {
    status = coords ? { ok: true, text: `Pin at ${fmtCoords(coords)}` }
      : isLink(value) ? { ok: true, text: 'Saved as a Google Maps link. It opens in Maps; no preview for short links.' }
      : { ok: false, text: 'Not recognised. Paste a Google Maps link or coordinates like -25.68670, 28.19190.' };
  }
  return (
    <Field label="Map pin (optional)" htmlFor="loc-pin">
      <input id="loc-pin" value={value || ''} onChange={e => { onChange(e.target.value); setGps(''); }} inputMode="url" autoComplete="off"
        placeholder="Google Maps link or -25.68670, 28.19190" style={{ ...S.input, borderColor: status && !status.ok ? T.red : T.border }}/>
      <button type="button" onClick={here} style={{ ...S.btnOutline, marginTop: 8 }}><Icon name="pin" size={16}/> Use my current location</button>
      {(status || gps) && (
        <div style={{ fontSize: 13, marginTop: 6, color: status && !status.ok ? T.red : T.textMid, lineHeight: 1.45 }}>
          {[status?.text, gps].filter(Boolean).join(' ')}
        </div>
      )}
      <div style={{ ...S.meta, marginTop: 6, lineHeight: 1.45 }}>
        In Google Maps, press and hold to drop a pin, tap <b>Share</b>, then <b>Copy link</b> and paste it here.
      </div>
    </Field>
  );
}

export function PropertyDetailsSheet({ property, onSave, onClose }) {
  const [form, setForm] = useState({
    name: property.name || '', type: property.type || 'residential', icon: property.icon || '',
    address: property.address || '', map_location: property.map_location || '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    const pin = form.map_location.trim();
    if (pin && !parseLocation(pin) && !isLink(pin)) { setErr('The map pin isn’t a link or coordinates.'); return; }
    setSaving(true); setErr('');
    const updates = { name: form.name.trim(), type: form.type, icon: form.icon || property.icon, address: form.address.trim() || null };
    if (pin !== (property.map_location || '')) updates.map_location = pin || null; // only sent when changed
    const { error } = await onSave(updates);
    setSaving(false);
    if (error) {
      setErr(/map_location/.test(error.message || '') ? 'The database isn’t set up for map pins yet (see the SQL step).' : error.message);
      return;
    }
    onClose();
  };
  return (
    <Sheet title="Property details" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...S.btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Name" htmlFor="pd-name"><input id="pd-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={S.input}/></Field>
      <Field label="Type" hint={form.type !== property.type ? (form.type === 'residential' ? 'Assets and livestock are hidden for residential properties; their records are kept.' : null) : null}>
        <Segmented label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={[['residential', 'Residential'], ['commercial', 'Commercial']]}/>
      </Field>
      {!property.logo_url && (
        <Field label="Icon">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROPERTY_ICONS.map(ic => (
              <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))} aria-pressed={form.icon === ic}
                style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${form.icon === ic ? T.primary : T.border}`, background: form.icon === ic ? T.primaryFade : T.surface, cursor: 'pointer', fontSize: 20 }}>{ic}</button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Address (optional)" htmlFor="pd-addr"><input id="pd-addr" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. Alldays, Limpopo" style={S.input}/></Field>
      <LocationField value={form.map_location} onChange={v => setForm(p => ({ ...p, map_location: v }))}/>
      {err && <div role="alert" style={{ color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>{err}</div>}
    </Sheet>
  );
}

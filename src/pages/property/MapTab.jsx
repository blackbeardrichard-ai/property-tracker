import { useState } from 'react';
import { T, S } from '../../lib/theme';
import { parseLocation, mapsUrl, directionsUrl, embedUrl, fmtCoords } from '../../lib/location';
import { Icon, Empty } from '../../components/ui';

export default function MapTab({ property, canEdit, onEdit }) {
  const [copied, setCopied] = useState(false);
  const pin = property.map_location;
  const coords = parseLocation(pin);
  const open = mapsUrl(pin);
  const dir = directionsUrl(pin);
  const copy = async () => {
    try { await navigator.clipboard.writeText(coords ? fmtCoords(coords) : pin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  if (!pin) {
    return (
      <div>
        <Empty>No map pin for {property.name} yet.</Empty>
        {property.address && <p style={{ ...S.meta, textAlign: 'center', marginTop: -8 }}>{property.address}</p>}
        {canEdit && <button onClick={onEdit} style={{ ...S.btnPrimary, width: '100%' }}><Icon name="pin" size={18}/> Add map pin</button>}
      </div>
    );
  }

  return (
    <div>
      {coords && (
        <a href={open} target="_blank" rel="noreferrer" aria-label={`Open ${property.name} in Google Maps`}
          style={{ display: 'block', position: 'relative', borderRadius: T.radius, overflow: 'hidden', border: `1px solid ${T.border}`, marginBottom: 12, background: T.surface2 }}>
          <iframe title={`Map of ${property.name}`} src={embedUrl(coords)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            style={{ display: 'block', width: '100%', height: 300, border: 0, pointerEvents: 'none' }}/>
          <span style={{ position: 'absolute', right: 10, bottom: 10, background: T.surface, color: T.primary, borderRadius: 18, padding: '6px 12px', fontSize: 13, fontWeight: 600, boxShadow: T.shadowMd }}>
            Tap to open in Maps
          </span>
        </a>
      )}

      <div style={{ ...S.card, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{property.name}</div>
        {property.address && <div style={{ fontSize: 15, color: T.textMid, marginTop: 2 }}>{property.address}</div>}
        <div style={{ ...S.meta, marginTop: 4 }}>{coords ? fmtCoords(coords) : 'Google Maps link'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={open} target="_blank" rel="noreferrer" style={{ ...S.btnPrimary, flex: 2, minWidth: 160, textDecoration: 'none' }}><Icon name="pin" size={18}/> Open in Google Maps</a>
        {coords && <a href={dir} target="_blank" rel="noreferrer" style={{ ...S.btnGhost, flex: 1, minWidth: 130, textDecoration: 'none' }}><Icon name="send" size={18}/> Directions</a>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={copy} style={{ ...S.btnGhost, flex: 1 }}><Icon name={copied ? 'check' : 'note'} size={18}/>{copied ? 'Copied' : 'Copy'}</button>
        {canEdit && <button onClick={onEdit} style={{ ...S.btnGhost, flex: 1 }}><Icon name="pencil" size={18}/> Change pin</button>}
      </div>
    </div>
  );
}

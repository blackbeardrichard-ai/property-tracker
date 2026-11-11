import { useState, lazy, Suspense } from 'react';
import { T, S } from '../../lib/theme';
import { parseLocation, mapsUrl, directionsUrl, fmtCoords } from '../../lib/location';
import { Icon, Loading } from '../../components/ui';
import { useEmergency } from './EmergencyTab';

const NeighbourMap = lazy(() => import('./NeighbourMap'));

export default function MapTab({ property, canEdit, onEdit, onSaveProperty }) {
  const [copied, setCopied] = useState(false);
  const em = useEmergency(property.id);
  const pin = property.map_location;
  const coords = parseLocation(pin);
  const open = mapsUrl(pin);
  const dir = directionsUrl(pin);
  const copy = async () => {
    try { await navigator.clipboard.writeText(coords ? fmtCoords(coords) : pin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  // Satellite map with the property, its boundary and the neighbours (tap one for its contacts).
  const map = (
    <Suspense fallback={<Loading label="Loading map…"/>}>
      <div style={{ marginBottom: 12 }}><NeighbourMap property={property} em={em} canEdit={canEdit} onSaveProperty={onSaveProperty} height={340}/></div>
    </Suspense>
  );

  if (!pin) {
    return (
      <div>
        {map}
        {canEdit && <button onClick={onEdit} style={{ ...S.btnPrimary, width: '100%' }}><Icon name="pin" size={18}/> Add map pin</button>}
      </div>
    );
  }

  return (
    <div>
      {map}

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

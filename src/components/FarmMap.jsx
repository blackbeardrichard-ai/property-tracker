import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { T } from '../lib/theme';

// Satellite map of a farm and its neighbours (Leaflet).
//   pin          {lat, lng} of the property, if set
//   boundary     [[lat, lng], …] of the property, if set
//   neighbours   [{ id, farm_name, boundary }]
//   onPick(id)   tapping a neighbour's area (id) or the farm itself ('self')
//   drawing      [[lat, lng], …] being drawn (shown as a dashed line), or null
//   onMapTap     (lat, lng) when drawing
const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const COLORS = ['#F59E0B', '#22D3EE', '#A78BFA', '#F472B6', '#34D399', '#FB923C', '#60A5FA', '#FACC15'];
export const neighbourColor = i => COLORS[i % COLORS.length];

export default function FarmMap({ pin, boundary, neighbours = [], onPick, drawing = null, onMapTap, height = 360, selectedId = null }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const tapRef = useRef(onMapTap); tapRef.current = onMapTap;
  const pickRef = useRef(onPick); pickRef.current = onPick;
  const drawingRef = useRef(drawing); drawingRef.current = drawing;
  const fitted = useRef(false);

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, tap: true });
    L.tileLayer(SAT, { maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }).addTo(m);
    L.tileLayer(LABELS, { maxZoom: 19, opacity: 0.8 }).addTo(m);
    m.setView(pin ? [pin.lat, pin.lng] : [-24.0, 29.0], pin ? 14 : 6);
    m.on('click', e => { if (drawingRef.current) tapRef.current?.(e.latlng.lat, e.latlng.lng); });
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current; const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const all = [];
    const tooltip = (shape, text) => shape.bindTooltip(text, { permanent: true, direction: 'center', className: 'pt-map-label' });
    neighbours.forEach((n, i) => {
      if (!n.boundary?.length) return;
      const sel = selectedId === n.id;
      const poly = L.polygon(n.boundary, { color: neighbourColor(i), weight: sel ? 4 : 2, fillOpacity: sel ? 0.3 : 0.15 }).addTo(g);
      tooltip(poly, n.farm_name);
      poly.on('click', e => { if (drawingRef.current) return; /* the map's own click handler adds the corner */ L.DomEvent.stopPropagation(e); pickRef.current?.(n.id); });
      all.push(...n.boundary);
    });
    if (boundary?.length) {
      const own = L.polygon(boundary, { color: '#FFFFFF', weight: 3, fillOpacity: 0.08, dashArray: null }).addTo(g);
      tooltip(own, 'Our farm');
      own.on('click', e => { if (drawingRef.current) return; /* the map's own click handler adds the corner */ L.DomEvent.stopPropagation(e); pickRef.current?.('self'); });
      all.push(...boundary);
    }
    if (pin) {
      L.circleMarker([pin.lat, pin.lng], { radius: 8, color: '#FFFFFF', weight: 3, fillColor: T.red, fillOpacity: 1 }).addTo(g);
      all.push([pin.lat, pin.lng]);
    }
    if (drawing?.length) {
      L.polyline(drawing.length > 2 ? [...drawing, drawing[0]] : drawing, { color: '#FDE047', weight: 3, dashArray: '6 6' }).addTo(g);
      drawing.forEach(p => L.circleMarker(p, { radius: 5, color: '#111827', weight: 2, fillColor: '#FDE047', fillOpacity: 1 }).addTo(g));
    }
    if (!fitted.current && all.length > 1) { m.fitBounds(L.latLngBounds(all), { padding: [24, 24] }); fitted.current = true; }
  }, [pin, boundary, neighbours, drawing, selectedId]);

  useEffect(() => { setTimeout(() => map.current?.invalidateSize(), 50); }, [height]);

  return (
    <div ref={el} role="application" aria-label="Map of the farm and neighbours"
      style={{ height, width: '100%', borderRadius: T.radius, overflow: 'hidden', border: `1px solid ${T.border}`, background: '#1F2937', cursor: drawing ? 'crosshair' : undefined }}/>
  );
}

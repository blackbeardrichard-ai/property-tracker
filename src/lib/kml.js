// Read property outlines from a Google Earth KML or KMZ file.
// Returns [{ name, boundary: [[lat, lng], …] }] — one entry per polygon (or closed path) found.
export async function readOutlines(file) {
  let text;
  if (/\.kmz$/i.test(file.name) || file.type === 'application/vnd.google-earth.kmz') {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const kml = Object.values(zip.files).find(f => /\.kml$/i.test(f.name));
    if (!kml) throw new Error('No KML inside this KMZ file.');
    text = await kml.async('text');
  } else {
    text = await file.text();
  }
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This file isn’t a valid KML file.');
  const out = [];
  doc.querySelectorAll('Placemark').forEach((pm, i) => {
    const name = pm.querySelector('name')?.textContent?.trim() || `Area ${i + 1}`;
    const rings = [...pm.querySelectorAll('Polygon outerBoundaryIs coordinates, LineString coordinates, LinearRing coordinates')];
    const seen = new Set();
    rings.forEach(c => {
      if (seen.has(c.textContent)) return; seen.add(c.textContent);
      const pts = c.textContent.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(p => p.length >= 2 && isFinite(p[0]) && isFinite(p[1])).map(([lng, lat]) => [lat, lng]);
      if (pts.length >= 3) out.push({ name, boundary: pts });
    });
  });
  return out;
}

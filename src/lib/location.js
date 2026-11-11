// A property's map pin is stored as text: either coordinates ("-25.6867, 28.1919")
// or a Google Maps link. Coordinates are pulled out of the link where they appear in it.

const num = s => Number(String(s).replace(',', '.'));
const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// 25°41'12.3"S 28°11'30.8"E
function parseDMS(s) {
  const re = /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*["″]?\s*([NSEW])/gi;
  const parts = [...s.matchAll(re)];
  if (parts.length < 2) return null;
  const val = m => (num(m[1]) + num(m[2]) / 60 + num(m[3]) / 3600) * (/[SW]/i.test(m[4]) ? -1 : 1);
  const lat = parts.find(m => /[NS]/i.test(m[4])), lng = parts.find(m => /[EW]/i.test(m[4]));
  if (!lat || !lng) return null;
  const out = { lat: val(lat), lng: val(lng) };
  return valid(out.lat, out.lng) ? out : null;
}

export function parseLocation(text) {
  const s = (text || '').trim();
  if (!s) return null;
  const pair = '(-?\\d{1,3}(?:\\.\\d+)?)\\s*,\\s*(-?\\d{1,3}(?:\\.\\d+)?)';
  const tries = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,                            // exact pin inside a full Maps link
    new RegExp(`[?&](?:q|query|ll|destination|center)=(?:loc:)?${pair}`), // ?q=lat,lng
    new RegExp(`@${pair}`),                                               // /@lat,lng,15z (map centre)
    new RegExp(`^${pair}$`),                                              // plain coordinates
  ];
  let decoded = s;
  try { decoded = decodeURIComponent(s); } catch { /* keep as typed */ }
  for (const re of tries) {
    const m = decoded.match(re);
    if (m && valid(num(m[1]), num(m[2]))) return { lat: num(m[1]), lng: num(m[2]) };
  }
  return parseDMS(s);
}

export const isLink = text => /^https?:\/\//i.test((text || '').trim());
export const fmtCoords = c => `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;

// Opens the pin in Google Maps (the app on a phone, the website on a computer).
export function mapsUrl(text) {
  const c = parseLocation(text);
  if (c) return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  return isLink(text) ? text.trim() : null;
}
export function directionsUrl(text) {
  const c = parseLocation(text);
  if (c) return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  return isLink(text) ? text.trim() : null;
}
export const embedUrl = c => `https://maps.google.com/maps?q=${c.lat},${c.lng}&z=15&output=embed`;

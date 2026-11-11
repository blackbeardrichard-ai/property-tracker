// Phone numbers are stored as typed (e.g. "082 123 4567", "+27 82 123 4567", "10111").
export const digits = p => (p || '').replace(/[^\d+]/g, '');
export const telHref = p => `tel:${digits(p)}`;
// WhatsApp needs the international form without "+": 082… → 2782…
export function waNumber(p) {
  let d = digits(p).replace(/^\+/, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `27${d.slice(1)}`;
  return d.length >= 10 ? d : null; // short codes like 10111 can't take WhatsApp
}
export const waHref = (p, text) => { const n = waNumber(p); return n ? `https://wa.me/${n}?text=${encodeURIComponent(text || '')}` : null; };

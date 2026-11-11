import { supabase } from './supabase';

// Photos live in the private "photos" bucket at <property>/<what>/<id>/<file>.jpg,
// with a row in the photos table saying what they belong to.

const local = new Map(); // path → object URL, for photos taken here that may not be uploaded yet
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Shrink to at most 1600 px on the long side, JPEG ~80 %: a phone photo drops from ~4 MB to ~300 kB.
export async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.8));
  } catch {
    return file;
  }
}

export async function addPhoto({ propertyId, entityType, entityId, file }) {
  const blob = await shrink(file);
  const path = `${propertyId}/${entityType}/${entityId}/${uuid()}.jpg`;
  local.set(path, URL.createObjectURL(blob));
  const up = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) return { error: up.error };
  const { data, error } = await supabase.from('photos').insert({ property_id: propertyId, entity_type: entityType, entity_id: entityId, path }).select().single();
  return { data, error };
}

export async function deletePhoto(photo) {
  await supabase.from('photos').delete().eq('id', photo.id);
  supabase.storage.from('photos').remove([photo.path]).catch(() => {});
}

export async function listPhotos(entityType, ids) {
  const want = [...new Set((ids || []).filter(Boolean))];
  if (!want.length) return {};
  const { data } = await supabase.from('photos').select('*').eq('entity_type', entityType).in('entity_id', want).order('created_at');
  const out = {};
  (data || []).forEach(p => { (out[p.entity_id] = out[p.entity_id] || []).push(p); });
  return out;
}

// Viewable URLs. Photos taken on this phone show straight away; others need signal.
const signed = new Map(); // path → { url, until }
export async function photoUrls(paths) {
  const now = Date.now();
  const need = paths.filter(p => !local.has(p) && !(signed.get(p)?.until > now));
  if (need.length) {
    try {
      const { data } = await supabase.storage.from('photos').createSignedUrls(need, 3600);
      (data || []).forEach(d => { if (d.signedUrl) signed.set(d.path, { url: d.signedUrl, until: now + 50 * 60 * 1000 }); });
    } catch { /* no signal */ }
  }
  return Object.fromEntries(paths.map(p => [p, local.get(p) || signed.get(p)?.url || null]));
}

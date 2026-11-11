import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';
import { uploadPhotos } from '../components/photos';

const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1, d + Number(n)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

// Livestock for one property: tagged animals (one record each, e.g. cattle) and
// counted herds (game), plus events for one animal or a whole group at once.
export function useLivestock(propertyId) {
  const { user, profile } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(animals);
  ref.current = animals;

  const log = (action, entityId, entityName, newValue = null) =>
    logAction({ propertyId, userId: user.id, userName: profile?.full_name, action, entityType: 'livestock', entityId, entityName, newValue });

  const fetchAnimals = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const [a, c] = await Promise.all([
      supabase.from('livestock').select('*, livestock_events(*), mother:mother_id(id, name, tag_number)')
        .eq('property_id', propertyId).order('species').order('tag_number'),
      supabase.from('game_counts').select('*').eq('property_id', propertyId).order('counted_on', { ascending: false }),
    ]);
    setAnimals(a.data || []);
    setCounts(c.error ? [] : (c.data || []));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

  const addAnimal = async (animal) => {
    const row = { ...animal, property_id: propertyId, created_by: user.id };
    Object.keys(row).forEach(k => { if (row[k] === undefined) delete row[k]; });
    const { data, error } = await supabase.from('livestock').insert(row).select().single();
    if (error) return { error };
    log('created', data.id, `${animal.species} ${animal.tag_number || animal.name || ''}`.trim());
    fetchAnimals();
    return { data };
  };

  const updateAnimal = async (animalId, updates) => {
    const { error } = await supabase.from('livestock').update(updates).eq('id', animalId);
    if (error) return { error };
    fetchAnimals();
    return {};
  };

  const deleteAnimal = async (animalId) => {
    const animal = ref.current.find(a => a.id === animalId);
    await supabase.from('livestock').delete().eq('id', animalId);
    log('deleted', animalId, animal?.name || animal?.tag_number);
    fetchAnimals();
  };

  // What an event does to the animal record itself.
  const effects = (animal, ev) => {
    const u = {};
    if (ev.eventType === 'death') u.status = 'deceased';
    if (ev.eventType === 'sale') u.status = 'sold';
    if (ev.eventType === 'movement' && ev.areaId) u.area_id = ev.areaId;
    if (ev.eventType === 'weighing' && ev.weightKg) { u.weight_kg = Number(ev.weightKg); u.weight_date = ev.eventDate; }
    if (Number(ev.withdrawalDays) > 0) {
      const until = addDays(ev.eventDate, ev.withdrawalDays);
      if (later(animal?.withdrawal_until, until) !== animal?.withdrawal_until) u.withdrawal_until = until;
    }
    return u;
  };

  const eventRow = (animalId, ev, extra = {}) => ({
    id: uuid(),
    animal_id: animalId, property_id: propertyId,
    event_type: ev.eventType, event_date: ev.eventDate,
    description: ev.description || null, company: ev.company || null,
    cost: ev.cost === '' || ev.cost == null ? null : Number(ev.cost),
    recorded_by: user.id,
    ...(ev.product ? { product: ev.product } : {}),
    ...(Number(ev.withdrawalDays) > 0 ? { withdrawal_days: Number(ev.withdrawalDays) } : {}),
    ...(ev.eventType === 'weighing' && ev.weightKg ? { weight_kg: Number(ev.weightKg) } : {}),
    ...(ev.eventType === 'movement' && ev.areaId ? { area_id: ev.areaId } : {}),
    ...extra,
  });

  // One animal.
  const addEvent = async (animalId, ev) => {
    const animal = ref.current.find(a => a.id === animalId);
    const row = eventRow(animalId, ev);
    const { error } = await supabase.from('livestock_events').insert(row);
    if (error) return { error };
    const u = effects(animal, ev);
    if (Object.keys(u).length) await supabase.from('livestock').update(u).eq('id', animalId);
    if (ev.files?.length) await uploadPhotos(propertyId, 'livestock_event', row.id, ev.files);
    log(ev.eventType, animalId, animal?.name || animal?.tag_number, { date: ev.eventDate, description: ev.description });
    fetchAnimals();
    return {};
  };

  // Many animals at once (e.g. dipping a camp). The cost is recorded once, on the first animal's event.
  const addGroupEvent = async (animalIds, ev) => {
    const groupId = uuid();
    const rows = animalIds.map((id, i) => eventRow(id, ev, { group_id: groupId, group_size: animalIds.length, ...(i ? { cost: null } : {}) }));
    const { error } = await supabase.from('livestock_events').insert(rows);
    if (error) return { error };
    // Same change for every animal where possible (movement, death/sale don't apply to groups here).
    const byUpdate = new Map();
    animalIds.forEach(id => {
      const u = effects(ref.current.find(a => a.id === id), ev);
      const k = JSON.stringify(u);
      if (k !== '{}') byUpdate.set(k, [...(byUpdate.get(k) || []), id]);
    });
    for (const [k, ids] of byUpdate) await supabase.from('livestock').update(JSON.parse(k)).in('id', ids);
    if (ev.files?.length) await uploadPhotos(propertyId, 'livestock_group', groupId, ev.files);
    log(ev.eventType, groupId, `${animalIds.length} animals`, { date: ev.eventDate, product: ev.product || null, description: ev.description || null });
    fetchAnimals();
    return {};
  };

  const addGameCount = async ({ species, areaId, count, countedOn, notes }) => {
    const row = { property_id: propertyId, species, area_id: areaId || null, count: Number(count), counted_on: countedOn, notes: notes || null };
    const { data, error } = await supabase.from('game_counts').insert(row).select().single();
    if (error) return { error };
    setCounts(c => [data, ...c]);
    log('counted', data.id, `${species}: ${count}`);
    return {};
  };

  const deleteGameCount = async (id) => {
    setCounts(c => c.filter(x => x.id !== id));
    await supabase.from('game_counts').delete().eq('id', id);
  };

  return { animals, counts, loading, addAnimal, updateAnimal, deleteAnimal, addEvent, addGroupEvent, addGameCount, deleteGameCount, fetchAnimals };
}

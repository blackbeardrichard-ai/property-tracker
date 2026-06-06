import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

export function useLivestock(propertyId) {
  const { user, profile } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnimals = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('livestock')
      .select(`*, livestock_events(*), mother:mother_id(id, name, tag_number)`)
      .eq('property_id', propertyId)
      .order('species')
      .order('tag_number');
    setAnimals(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

  const addAnimal = async (animal) => {
    const { data, error } = await supabase.from('livestock').insert({
      ...animal,
      property_id: propertyId,
      created_by: user.id,
    }).select().single();
    if (error) return { error };
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'livestock', entityId: data.id, entityName: `${animal.species} ${animal.tag_number||animal.name||''}` });
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
    const animal = animals.find(a => a.id === animalId);
    await supabase.from('livestock').delete().eq('id', animalId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'deleted', entityType: 'livestock', entityId: animalId, entityName: animal?.name || animal?.tag_number });
    fetchAnimals();
  };

  const addEvent = async (animalId, event) => {
    const animal = animals.find(a => a.id === animalId);
    const { error } = await supabase.from('livestock_events').insert({
      animal_id: animalId,
      property_id: propertyId,
      event_type: event.eventType,
      event_date: event.eventDate,
      description: event.description || null,
      photo_url: event.photoUrl || null,
      company: event.company || null,
      cost: event.cost || null,
      recorded_by: user.id,
    });
    if (error) return { error };

    // Update animal status if death or sale
    if (event.eventType === 'death') {
      await supabase.from('livestock').update({ status: 'deceased' }).eq('id', animalId);
    } else if (event.eventType === 'sale') {
      await supabase.from('livestock').update({ status: 'sold' }).eq('id', animalId);
    }

    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: event.eventType, entityType: 'livestock', entityId: animalId, entityName: animal?.name || animal?.tag_number, newValue: { date: event.eventDate, description: event.description } });
    fetchAnimals();
    return {};
  };

  return { animals, loading, addAnimal, updateAnimal, deleteAnimal, addEvent, fetchAnimals };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRooms(propertyId) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!propertyId) return;
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId)
      .order('position');
    setRooms(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const addRoom = async (name) => {
    await supabase.from('rooms').insert({ property_id: propertyId, name, position: rooms.length });
    fetchRooms();
  };

  const renameRoom = async (roomId, name) => {
    await supabase.from('rooms').update({ name }).eq('id', roomId);
    fetchRooms();
  };

  const deleteRoom = async (roomId) => {
    await supabase.from('rooms').delete().eq('id', roomId);
    fetchRooms();
  };

  const moveRoom = async (roomId, dir) => {
    const idx = rooms.findIndex(r => r.id === roomId);
    const j = idx + dir;
    if (j < 0 || j >= rooms.length) return;
    await Promise.all([
      supabase.from('rooms').update({ position: j }).eq('id', rooms[idx].id),
      supabase.from('rooms').update({ position: idx }).eq('id', rooms[j].id),
    ]);
    fetchRooms();
  };

  return { rooms, loading, addRoom, renameRoom, deleteRoom, moveRoom };
}

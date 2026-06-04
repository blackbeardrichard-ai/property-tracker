import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

export function useTasks(propertyId) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select(`*, subtasks(*, materials(*))`)
      .eq('property_id', propertyId)
      .order('position');
    setTasks(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchTasks();
    const sub = supabase.channel(`tasks-${propertyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `property_id=eq.${propertyId}` }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchTasks]);

  // ── Tasks ─────────────────────────────────────────────────────
  const addTask = async (name) => {
    const { data } = await supabase.from('tasks').insert({
      property_id: propertyId, name, position: tasks.length, created_by: user.id
    }).select().single();
    if (data) {
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'task', entityId: data.id, entityName: name });
      fetchTasks();
    }
  };

  const updateTask = async (taskId, updates) => {
    await supabase.from('tasks').update(updates).eq('id', taskId);
    fetchTasks();
  };

  const deleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    await supabase.from('tasks').delete().eq('id', taskId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'deleted', entityType: 'task', entityId: taskId, entityName: task?.name });
    fetchTasks();
  };

  const moveTask = async (taskId, dir) => {
    const idx = tasks.findIndex(t => t.id === taskId);
    const j = idx + dir;
    if (j < 0 || j >= tasks.length) return;
    await Promise.all([
      supabase.from('tasks').update({ position: j }).eq('id', tasks[idx].id),
      supabase.from('tasks').update({ position: idx }).eq('id', tasks[j].id),
    ]);
    fetchTasks();
  };

  // ── Subtasks ──────────────────────────────────────────────────
  const addSubtask = async (taskId, name) => {
    const task = tasks.find(t => t.id === taskId);
    const pos = task?.subtasks?.length || 0;
    await supabase.from('subtasks').insert({ task_id: taskId, name, position: pos });
    fetchTasks();
  };

  const updateSubtask = async (subtaskId, updates) => {
    const patch = { ...updates };
    if ('completed' in updates) {
      patch.completed_by = updates.completed ? user.id : null;
      patch.completed_at = updates.completed ? new Date().toISOString() : null;
    }
    await supabase.from('subtasks').update(patch).eq('id', subtaskId);
    // Log completion
    if ('completed' in updates) {
      const sub = tasks.flatMap(t => t.subtasks || []).find(s => s.id === subtaskId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: updates.completed ? 'completed' : 'reopened', entityType: 'subtask', entityId: subtaskId, entityName: sub?.name });
    }
    fetchTasks();
  };

  const deleteSubtask = async (subtaskId) => {
    await supabase.from('subtasks').delete().eq('id', subtaskId);
    fetchTasks();
  };

  // ── Materials ─────────────────────────────────────────────────
  const addMaterial = async (subtaskId, mat) => {
    await supabase.from('materials').insert({
      subtask_id: subtaskId, property_id: propertyId,
      name: mat.name, qty: mat.qty || null, unit: mat.unit || null,
      status: 'needed', created_by: user.id
    });
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'material', entityName: mat.name });
    fetchTasks();
  };

  const updateMaterial = async (materialId, updates) => {
    const patch = { ...updates };
    if (updates.status === 'acquired' || updates.acquired) {
      patch.acquired_by = user.id;
      patch.acquired_at = new Date().toISOString();
      const mat = tasks.flatMap(t => t.subtasks || []).flatMap(s => s.materials || []).find(m => m.id === materialId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'acquired', entityType: 'material', entityId: materialId, entityName: mat?.name });
    }
    await supabase.from('materials').update(patch).eq('id', materialId);
    fetchTasks();
  };

  const deleteMaterial = async (materialId) => {
    await supabase.from('materials').delete().eq('id', materialId);
    fetchTasks();
  };

  return {
    tasks, loading, fetchTasks,
    addTask, updateTask, deleteTask, moveTask,
    addSubtask, updateSubtask, deleteSubtask,
    addMaterial, updateMaterial, deleteMaterial,
  };
}

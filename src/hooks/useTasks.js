import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

const genId = () => Math.random().toString(36).substr(2,9) + Date.now().toString(36);

export function useTasks(propertyId) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

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

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Tasks ─────────────────────────────────────────────────────
  const addTask = async (name) => {
    const tempId = genId();
    const newTask = { id:tempId, name, position:tasksRef.current.length, priority:'medium', notes:'', due_date:null, assigned_to:null, subtasks:[] };
    // Optimistic update — add immediately, no collapse
    setTasks(prev => [...prev, newTask]);
    const { data } = await supabase.from('tasks').insert({
      property_id: propertyId, name, position: tasksRef.current.length - 1, created_by: user.id
    }).select().single();
    if (data) {
      // Replace temp with real
      setTasks(prev => prev.map(t => t.id === tempId ? { ...newTask, ...data, subtasks:[] } : t));
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'task', entityId: data.id, entityName: name });
    }
  };

  const updateTask = async (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    await supabase.from('tasks').update(updates).eq('id', taskId);
    if (updates.assigned_to !== undefined) {
      const task = tasksRef.current.find(t => t.id === taskId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'assigned', entityType: 'task', entityId: taskId, entityName: task?.name });
    }
  };

  const deleteTask = async (taskId) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
    await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'deleted', entityType: 'task', entityId: taskId, entityName: task?.name });
  };

  const moveTask = async (taskId, dir) => {
    const current = tasksRef.current;
    const idx = current.findIndex(t => t.id === taskId);
    const j = idx + dir;
    if (j < 0 || j >= current.length) return;
    const newTasks = [...current];
    [newTasks[idx], newTasks[j]] = [newTasks[j], newTasks[idx]];
    setTasks(newTasks);
    await Promise.all([
      supabase.from('tasks').update({ position: j }).eq('id', current[idx].id),
      supabase.from('tasks').update({ position: idx }).eq('id', current[j].id),
    ]);
  };

  // ── Subtasks ──────────────────────────────────────────────────
  const addSubtask = async (taskId, name) => {
    const tempId = genId();
    const newSub = { id:tempId, task_id:taskId, name, completed:false, completion_note:null, completed_by:null, completed_at:null, materials:[] };
    // Optimistic — add subtask without collapsing
    setTasks(prev => prev.map(t => t.id !== taskId ? t : {
      ...t, subtasks: [...(t.subtasks||[]), newSub]
    }));
    const task = tasksRef.current.find(t => t.id === taskId);
    const { data } = await supabase.from('subtasks').insert({
      task_id: taskId, name, position: (task?.subtasks||[]).length
    }).select().single();
    if (data) {
      setTasks(prev => prev.map(t => t.id !== taskId ? t : {
        ...t, subtasks: (t.subtasks||[]).map(s => s.id === tempId ? { ...newSub, ...data, materials:[] } : s)
      }));
    }
  };

  const updateSubtask = async (subtaskId, updates) => {
    const patch = { ...updates };
    if ('completed' in updates) {
      patch.completed_by = updates.completed ? user.id : null;
      patch.completed_at = updates.completed ? new Date().toISOString() : null;
    }
    setTasks(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks||[]).map(s => s.id !== subtaskId ? s : { ...s, ...patch })
    })));
    await supabase.from('subtasks').update(patch).eq('id', subtaskId);
    if ('completed' in updates) {
      const sub = tasksRef.current.flatMap(t => t.subtasks||[]).find(s => s.id === subtaskId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: updates.completed ? 'completed' : 'reopened', entityType: 'subtask', entityId: subtaskId, entityName: sub?.name, newValue: updates.completion_note ? { note: updates.completion_note } : null });
    }
  };

  const deleteSubtask = async (subtaskId) => {
    setTasks(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks||[]).filter(s => s.id !== subtaskId)
    })));
    await supabase.from('subtasks').delete().eq('id', subtaskId);
  };

  // ── Materials ─────────────────────────────────────────────────
  const MATERIAL_STATUSES = ['needed', 'ordered', 'delivered', 'used'];

  const addMaterial = async (subtaskId, mat) => {
    const tempId = genId();
    const newMat = { id:tempId, subtask_id:subtaskId, name:mat.name, qty:mat.qty||null, unit:mat.unit||null, status:'needed' };
    // Optimistic — add material without any collapse
    setTasks(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks||[]).map(s => s.id !== subtaskId ? s : {
        ...s, materials: [...(s.materials||[]), newMat]
      })
    })));
    const { data } = await supabase.from('materials').insert({
      subtask_id: subtaskId, property_id: propertyId,
      name: mat.name, qty: mat.qty || null, unit: mat.unit || null,
      status: 'needed', created_by: user.id
    }).select().single();
    if (data) {
      setTasks(prev => prev.map(t => ({
        ...t, subtasks: (t.subtasks||[]).map(s => s.id !== subtaskId ? s : {
          ...s, materials: (s.materials||[]).map(m => m.id === tempId ? { ...newMat, ...data } : m)
        })
      })));
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'created', entityType: 'material', entityName: mat.name });
    }
  };

  const updateMaterial = async (materialId, updates) => {
    const patch = { ...updates };
    if (updates.status && updates.status !== 'needed') {
      patch.acquired_by = user.id;
      patch.acquired_at = new Date().toISOString();
    }
    setTasks(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks||[]).map(s => ({
        ...s, materials: (s.materials||[]).map(m => m.id !== materialId ? m : { ...m, ...patch })
      }))
    })));
    await supabase.from('materials').update(patch).eq('id', materialId);
    if (updates.status && updates.status !== 'needed') {
      const mat = tasksRef.current.flatMap(t => t.subtasks||[]).flatMap(s => s.materials||[]).find(m => m.id === materialId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: updates.status, entityType: 'material', entityId: materialId, entityName: mat?.name });
    }
  };

  const advanceMaterialStatus = async (materialId) => {
    const mat = tasksRef.current.flatMap(t => t.subtasks||[]).flatMap(s => s.materials||[]).find(m => m.id === materialId);
    if (!mat) return;
    const currentIdx = MATERIAL_STATUSES.indexOf(mat.status || 'needed');
    const nextStatus = MATERIAL_STATUSES[Math.min(currentIdx + 1, MATERIAL_STATUSES.length - 1)];
    await updateMaterial(materialId, { status: nextStatus });
  };

  // Set a material to any status directly (forward or backward). Used by the
  // admin status picker. When moving back to 'needed', clear the acquired_*
  // fields so the record doesn't keep a stale "acquired by" trail.
  const setMaterialStatus = async (materialId, status) => {
    if (!MATERIAL_STATUSES.includes(status)) return;
    if (status === 'needed') {
      // updateMaterial only sets acquired_* when status !== 'needed', so clear here.
      setTasks(prev => prev.map(t => ({
        ...t, subtasks: (t.subtasks||[]).map(s => ({
          ...s, materials: (s.materials||[]).map(m => m.id !== materialId ? m : { ...m, status, acquired_by:null, acquired_at:null, acquired_profile:null })
        }))
      })));
      await supabase.from('materials').update({ status, acquired_by:null, acquired_at:null }).eq('id', materialId);
      const mat = tasksRef.current.flatMap(t => t.subtasks||[]).flatMap(s => s.materials||[]).find(m => m.id === materialId);
      await logAction({ propertyId, userId: user.id, userName: profile?.full_name, action: 'needed', entityType: 'material', entityId: materialId, entityName: mat?.name });
      return;
    }
    await updateMaterial(materialId, { status });
  };

  const deleteMaterial = async (materialId) => {
    setTasks(prev => prev.map(t => ({
      ...t, subtasks: (t.subtasks||[]).map(s => ({
        ...s, materials: (s.materials||[]).filter(m => m.id !== materialId)
      }))
    })));
    await supabase.from('materials').delete().eq('id', materialId);
  };

  return {
    tasks, loading, fetchTasks,
    addTask, updateTask, deleteTask, moveTask,
    addSubtask, updateSubtask, deleteSubtask,
    addMaterial, updateMaterial, deleteMaterial, advanceMaterialStatus, setMaterialStatus,
    MATERIAL_STATUSES,
  };
}

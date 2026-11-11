import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';
import { fetchNames, rememberName } from '../lib/names';
import { MATERIAL_STATUSES } from '../lib/status';
import { saveMaterialEdit } from '../lib/materials';

const tempId = () => `tmp-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0);

// Tasks → subtasks → materials for one property. Optimistic throughout: the UI
// updates first, the database second, so nothing collapses or reloads on edit.
// Fetched once per property page (PropertyPage) and shared by the tabs.
export function useTasks(propertyId) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const log = (action, entityType, entityId, entityName, newValue = null) =>
    logAction({ propertyId, userId: user.id, userName: profile?.full_name, action, entityType, entityId, entityName, newValue });

  const fetchTasks = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, subtasks(*, materials(*))')
      .eq('property_id', propertyId)
      .order('position');
    const list = (data || []).map(t => ({ ...t, subtasks: [...(t.subtasks || [])].sort(byPos) }));
    setTasks(list);
    setLoading(false);
    const ids = list.flatMap(t => [t.assigned_to, ...(t.subtasks || []).flatMap(s => [s.completed_by, ...(s.materials || []).map(m => m.acquired_by)])]);
    setNames(await fetchNames(ids));
  }, [propertyId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const me = () => {
    if (user?.id && profile?.full_name) {
      rememberName(user.id, profile.full_name);
      setNames(n => (n[user.id] ? n : { ...n, [user.id]: profile.full_name }));
    }
  };

  const allMaterials = () => tasksRef.current.flatMap(t => (t.subtasks || []).flatMap(s => s.materials || []));
  const mapMaterials = fn => setTasks(prev => prev.map(t => ({
    ...t, subtasks: (t.subtasks || []).map(s => ({ ...s, materials: (s.materials || []).map(fn) })),
  })));

  // ── Tasks ─────────────────────────────────────────────────────
  const addTask = async (name) => {
    const id = tempId();
    const position = tasksRef.current.reduce((m, t) => Math.max(m, t.position ?? 0), -1) + 1;
    const draft = { id, name, position, priority: 'medium', notes: '', due_date: null, assigned_to: null, subtasks: [] };
    setTasks(prev => [...prev, draft]);
    const { data, error } = await supabase.from('tasks')
      .insert({ property_id: propertyId, name, position, created_by: user.id }).select().single();
    if (error || !data) { setTasks(prev => prev.filter(t => t.id !== id)); return { error }; }
    setTasks(prev => prev.map(t => (t.id === id ? { ...draft, ...data, subtasks: [] } : t)));
    log('created', 'task', data.id, name);
    return { data };
  };

  const updateTask = async (taskId, updates, names_ = null) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
    if (names_) setNames(n => ({ ...n, ...names_ }));
    await supabase.from('tasks').update(updates).eq('id', taskId);
    if (updates.assigned_to !== undefined) {
      const task = tasksRef.current.find(t => t.id === taskId);
      log('assigned', 'task', taskId, task?.name);
    }
  };

  const deleteTask = async (taskId) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
    log('deleted', 'task', taskId, task?.name);
  };

  // Swap two tasks, then renumber positions 0..n-1 so ordering stays stable.
  const swapTasks = async (aId, bId) => {
    const list = [...tasksRef.current];
    const i = list.findIndex(t => t.id === aId), j = list.findIndex(t => t.id === bId);
    if (i < 0 || j < 0) return;
    [list[i], list[j]] = [list[j], list[i]];
    const renumbered = list.map((t, k) => ({ ...t, position: k }));
    setTasks(renumbered);
    const changed = renumbered.filter(t => tasksRef.current.find(o => o.id === t.id)?.position !== t.position);
    await Promise.all(changed.map(t => supabase.from('tasks').update({ position: t.position }).eq('id', t.id)));
  };

  // ── Subtasks ──────────────────────────────────────────────────
  const addSubtask = async (taskId, name) => {
    const id = tempId();
    const task = tasksRef.current.find(t => t.id === taskId);
    const position = (task?.subtasks || []).length;
    const draft = { id, task_id: taskId, name, position, completed: false, completion_note: null, completed_by: null, completed_at: null, materials: [] };
    setTasks(prev => prev.map(t => (t.id !== taskId ? t : { ...t, subtasks: [...(t.subtasks || []), draft] })));
    const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, name, position }).select().single();
    if (error || !data) {
      setTasks(prev => prev.map(t => (t.id !== taskId ? t : { ...t, subtasks: t.subtasks.filter(s => s.id !== id) })));
      return { error };
    }
    setTasks(prev => prev.map(t => (t.id !== taskId ? t : { ...t, subtasks: t.subtasks.map(s => (s.id === id ? { ...draft, ...data, materials: [] } : s)) })));
    return { data };
  };

  const updateSubtask = async (subtaskId, updates) => {
    const patch = { ...updates };
    if ('completed' in updates) {
      patch.completed_by = updates.completed ? user.id : null;
      patch.completed_at = updates.completed ? new Date().toISOString() : null;
      if (!updates.completed) patch.completion_note = null;
      me();
    }
    setTasks(prev => prev.map(t => ({ ...t, subtasks: (t.subtasks || []).map(s => (s.id !== subtaskId ? s : { ...s, ...patch })) })));
    await supabase.from('subtasks').update(patch).eq('id', subtaskId);
    if ('completed' in updates) {
      const sub = tasksRef.current.flatMap(t => t.subtasks || []).find(s => s.id === subtaskId);
      log(updates.completed ? 'completed' : 'reopened', 'subtask', subtaskId, sub?.name,
        updates.completion_note ? { note: updates.completion_note } : null);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    setTasks(prev => prev.map(t => ({ ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId) })));
    await supabase.from('subtasks').delete().eq('id', subtaskId);
  };

  // ── Materials ─────────────────────────────────────────────────
  const addMaterial = async (subtaskId, mat) => {
    const id = tempId();
    const draft = { id, subtask_id: subtaskId, property_id: propertyId, name: mat.name, qty: mat.qty || null, unit: mat.unit || null, status: 'needed' };
    setTasks(prev => prev.map(t => ({ ...t, subtasks: (t.subtasks || []).map(s => (s.id !== subtaskId ? s : { ...s, materials: [...(s.materials || []), draft] })) })));
    const { data, error } = await supabase.from('materials').insert({
      subtask_id: subtaskId, property_id: propertyId, name: mat.name, qty: mat.qty || null, unit: mat.unit || null,
      status: 'needed', created_by: user.id,
    }).select().single();
    if (error || !data) {
      setTasks(prev => prev.map(t => ({ ...t, subtasks: (t.subtasks || []).map(s => ({ ...s, materials: (s.materials || []).filter(m => m.id !== id) })) })));
      return { error };
    }
    mapMaterials(m => (m.id === id ? { ...draft, ...data } : m));
    log('created', 'material', data.id, mat.name);
    return { data };
  };

  // Set a material to any status. Moving back to "needed" clears who acquired it.
  const setMaterialStatus = async (materialId, status) => {
    if (!MATERIAL_STATUSES.includes(status)) return;
    const patch = status === 'needed'
      ? { status, acquired_by: null, acquired_at: null }
      : { status, acquired_by: user.id, acquired_at: new Date().toISOString() };
    if (status !== 'needed') me();
    mapMaterials(m => (m.id === materialId ? { ...m, ...patch } : m));
    await supabase.from('materials').update(patch).eq('id', materialId);
    const mat = allMaterials().find(m => m.id === materialId);
    log(status, 'material', materialId, mat?.name);
  };

  const advanceMaterialStatus = async (materialId) => {
    const mat = allMaterials().find(m => m.id === materialId);
    if (!mat) return;
    const i = MATERIAL_STATUSES.indexOf(mat.status || 'needed');
    if (i >= MATERIAL_STATUSES.length - 1) return;
    await setMaterialStatus(materialId, MATERIAL_STATUSES[i + 1]);
  };

  // Fix a material's name, quantity or unit.
  const updateMaterial = async (materialId, patch) => {
    const before = allMaterials().find(m => m.id === materialId);
    if (!before) return { error: { message: 'Material not found' } };
    mapMaterials(m => (m.id === materialId ? { ...m, ...patch } : m));
    const { error } = await saveMaterialEdit(before, patch, { userId: user.id, userName: profile?.full_name });
    if (error) mapMaterials(m => (m.id === materialId ? { ...m, name: before.name, qty: before.qty, unit: before.unit } : m));
    return { error };
  };

  const deleteMaterial = async (materialId) => {
    setTasks(prev => prev.map(t => ({ ...t, subtasks: (t.subtasks || []).map(s => ({ ...s, materials: (s.materials || []).filter(m => m.id !== materialId) })) })));
    await supabase.from('materials').delete().eq('id', materialId);
  };

  return {
    tasks, names, loading, fetchTasks,
    addTask, updateTask, deleteTask, swapTasks,
    addSubtask, updateSubtask, deleteSubtask,
    addMaterial, updateMaterial, deleteMaterial, advanceMaterialStatus, setMaterialStatus,
  };
}

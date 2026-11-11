import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { T, S } from '../../lib/theme';
import { fmtDate, fmtDateTime, daysUntil } from '../../lib/format';
import { PRIORITY, isUsed } from '../../lib/status';
import { Icon, Chip, Segmented, Field, Sheet, ConfirmSheet, ActionMenu, Empty, Loading } from '../../components/ui';
import { MaterialSheet, MaterialStatusControl } from './materials';

const isComplete = t => (t.subtasks || []).length > 0 && t.subtasks.every(s => s.completed);

// ── Sheets ──────────────────────────────────────────────────────────
function CompleteSheet({ subtask, onSave, onClose }) {
  const [note, setNote] = useState('');
  return (
    <Sheet title="Mark complete" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={() => { onSave(note.trim()); onClose(); }} style={{ ...S.btnPrimary, flex: 2 }}><Icon name="check" size={18}/> Mark complete</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, color: T.text }}>{subtask.name}</p>
      <Field label="Note (optional)" htmlFor="done-note">
        <textarea id="done-note" autoFocus rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="e.g. Done, but needs sealing — revisit next week" style={S.textarea}/>
      </Field>
    </Sheet>
  );
}

function TaskDetailsSheet({ task, rooms, canSetPriority, onSave, onClose }) {
  const { users } = useUsers();
  const [notes, setNotes] = useState(task.notes || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [roomId, setRoomId] = useState(task.room_id || '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const active = users.filter(u => u.active !== false || u.id === task.assigned_to);
  const save = () => {
    const who = users.find(u => u.id === assignedTo);
    onSave({ notes, due_date: dueDate || null, priority, room_id: roomId || null, assigned_to: assignedTo || null },
      who ? { [who.id]: who.full_name } : null);
    onClose();
  };
  return (
    <Sheet title="Task details" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Save</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{task.name}</p>
      {canSetPriority && (
        <Field label="Priority">
          <Segmented label="Priority" value={priority} onChange={setPriority}
            options={[['high', 'High'], ['medium', 'Normal'], ['low', 'Low']]}/>
        </Field>
      )}
      <Field label="Assigned to" htmlFor="td-assign">
        <select id="td-assign" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={S.input}>
          <option value="">Unassigned</option>
          {active.map(u => <option key={u.id} value={u.id}>{u.full_name}{u.role ? ` (${u.role})` : ''}</option>)}
        </select>
      </Field>
      <Field label="Room or area" htmlFor="td-room">
        <select id="td-room" value={roomId} onChange={e => setRoomId(e.target.value)} style={S.input}>
          <option value="">None</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <Field label="Due date" htmlFor="td-due">
        <input id="td-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={S.input}/>
      </Field>
      <Field label="Notes" htmlFor="td-notes">
        <textarea id="td-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions, dimensions, context…" style={S.textarea}/>
      </Field>
    </Sheet>
  );
}

// ── Rows ────────────────────────────────────────────────────────────
function Check({ done, onClick, disabled, label }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={done}
      style={{ ...S.iconBtn, marginLeft: -10, cursor: disabled ? 'default' : 'pointer' }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? T.ok : T.surface, border: `2px solid ${done ? T.ok : disabled ? T.border : T.textDim}`, color: '#FFFFFF' }}>
        {done && <Icon name="check" size={15}/>}
      </span>
    </button>
  );
}

function MaterialRow({ mat, names, perms, actions }) {
  const [confirming, setConfirming] = useState(false);
  const used = isUsed(mat);
  const who = mat.acquired_by && names[mat.acquired_by];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52, padding: '6px 0', borderTop: `1px solid ${T.borderLight}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: used ? T.textDim : T.text, textDecoration: used ? 'line-through' : 'none' }}>{mat.name}</div>
        {(mat.qty || who) && (
          <div style={S.meta}>{[mat.qty ? `${mat.qty} ${mat.unit || ''}`.trim() : null, who].filter(Boolean).join(' · ')}</div>
        )}
      </div>
      <MaterialStatusControl material={mat} canWrite={perms.canWrite} canEditStatusBack={perms.canEditStatusBack} compact
        onAdvance={() => actions.advanceMaterialStatus(mat.id)} onSetStatus={s => actions.setMaterialStatus(mat.id, s)}/>
      {perms.canDelete && (
        <button onClick={() => setConfirming(true)} aria-label={`Delete ${mat.name}`} style={{ ...S.iconBtn, marginRight: -10 }}><Icon name="trash" size={18}/></button>
      )}
      {confirming && <ConfirmSheet title={`Delete “${mat.name}”?`} body="This can't be undone." onConfirm={() => actions.deleteMaterial(mat.id)} onClose={() => setConfirming(false)}/>}
    </div>
  );
}

function SubtaskRow({ sub, names, perms, actions }) {
  const [matOpen, setMatOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const mats = sub.materials || [];
  const usedCount = mats.filter(isUsed).length;
  const who = sub.completed_by && names[sub.completed_by];

  const toggle = () => {
    if (sub.completed) actions.updateSubtask(sub.id, { completed: false });
    else setCompleting(true);
  };

  return (
    <div style={{ borderTop: `1px solid ${T.borderLight}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '4px 0' }}>
        <Check done={sub.completed} onClick={toggle} disabled={!perms.canWrite} label={sub.completed ? `Reopen ${sub.name}` : `Complete ${sub.name}`}/>
        <div style={{ flex: 1, minWidth: 0, padding: '11px 0 8px' }}>
          <div style={{ fontSize: 15, lineHeight: 1.35, color: sub.completed ? T.textDim : T.text, textDecoration: sub.completed ? 'line-through' : 'none' }}>{sub.name}</div>
          {sub.completed && (who || sub.completed_at) && (
            <div style={{ ...S.meta, marginTop: 2 }}>Done{who ? ` by ${who}` : ''}{sub.completed_at ? ` · ${fmtDateTime(sub.completed_at)}` : ''}</div>
          )}
          {sub.completed && sub.completion_note && (
            <div style={{ fontSize: 14, color: T.textMid, marginTop: 4, lineHeight: 1.4 }}>“{sub.completion_note}”</div>
          )}
        </div>
        <button onClick={() => setMatOpen(o => !o)} aria-expanded={matOpen} aria-label={`Materials for ${sub.name}${mats.length ? `, ${usedCount} of ${mats.length} used` : ''}`}
          style={{ ...S.btnOutline, height: 36, margin: '4px 0', padding: '0 10px', fontWeight: 500,
            borderColor: matOpen ? T.primaryBorder : T.border, color: mats.length ? T.textMid : T.textDim, background: matOpen ? T.primaryFade : T.surface }}>
          <Icon name="box" size={16}/>{mats.length ? `${usedCount}/${mats.length}` : ''}
          <Icon name={matOpen ? 'chevronU' : 'chevronD'} size={14}/>
        </button>
        {perms.canDelete && (
          <ActionMenu title={sub.name} label={`More actions for ${sub.name}`}
            items={[{ icon: 'trash', label: 'Delete subtask', danger: true, onClick: () => setConfirming(true) }]}/>
        )}
      </div>

      {matOpen && (
        <div style={{ background: T.surface2, borderRadius: 10, padding: '8px 12px 10px', margin: '0 0 10px 34px' }}>
          <div style={{ ...S.fieldLabel, marginBottom: 4 }}>Materials</div>
          {mats.length === 0 && <div style={{ ...S.meta, padding: '6px 0 8px' }}>None yet</div>}
          {mats.map(m => <MaterialRow key={m.id} mat={m} names={names} perms={perms} actions={actions}/>)}
          {perms.canWrite && (
            <button onClick={() => setAdding(true)} style={{ ...S.btnOutline, marginTop: 8 }}><Icon name="plus" size={16}/> Add material</button>
          )}
        </div>
      )}

      {adding && <MaterialSheet onSave={m => actions.addMaterial(sub.id, m)} onClose={() => setAdding(false)}/>}
      {completing && <CompleteSheet subtask={sub} onSave={note => actions.updateSubtask(sub.id, { completed: true, completion_note: note || null })} onClose={() => setCompleting(false)}/>}
      {confirming && <ConfirmSheet title={`Delete “${sub.name}”?`} body="This can't be undone." onConfirm={() => actions.deleteSubtask(sub.id)} onClose={() => setConfirming(false)}/>}
    </div>
  );
}

function TaskCard({ task, rooms, names, prevId, nextId, perms, actions }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const subs = task.subtasks || [];
  const done = subs.filter(s => s.completed).length;
  const complete = isComplete(task);
  const pr = task.priority && task.priority !== 'medium' ? PRIORITY[task.priority] : null;
  const room = task.room_id && rooms.find(r => r.id === task.room_id);
  const assignee = task.assigned_to && names[task.assigned_to];
  const dueIn = daysUntil(task.due_date);
  const late = dueIn !== null && dueIn < 0 && !complete;

  const submitSub = () => {
    if (!newSub.trim()) return;
    actions.addSubtask(task.id, newSub.trim());
    setNewSub('');
  };

  const menu = [
    perms.canManage && { icon: 'pencil', label: 'Details, assign, due date', onClick: () => setDetails(true) },
    perms.canManage && { icon: 'up', label: 'Move up', disabled: !prevId, onClick: () => actions.swapTasks(task.id, prevId) },
    perms.canManage && { icon: 'down', label: 'Move down', disabled: !nextId, onClick: () => actions.swapTasks(task.id, nextId) },
    perms.canDelete && { icon: 'trash', label: 'Delete task', danger: true, onClick: () => setConfirming(true) },
  ];

  return (
    <article style={{ ...S.card, marginBottom: 10, overflow: 'hidden', borderColor: complete ? T.okBorder : T.border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <button onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 4px 14px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans, color: T.text }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35, color: complete ? T.textDim : T.text, textDecoration: complete ? 'line-through' : 'none' }}>{task.name}</div>
            {(pr || assignee || task.due_date || room || task.notes) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', marginTop: 6 }}>
                {pr && <Chip tone={task.priority === 'high' ? 'red' : 'neutral'}>{pr.label}</Chip>}
                {task.due_date && (
                  <span style={{ ...S.meta, display: 'inline-flex', alignItems: 'center', gap: 4, color: late ? T.red : T.textDim, fontWeight: late ? 600 : 400 }}>
                    <Icon name="calendar" size={14}/>{late ? 'Overdue · ' : ''}{fmtDate(task.due_date)}
                  </span>
                )}
                {assignee && <span style={{ ...S.meta, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="person" size={14}/>{assignee}</span>}
                {room && <span style={{ ...S.meta, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="rooms" size={14}/>{room.name}</span>}
                {task.notes && <span style={{ ...S.meta, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="note" size={14}/>Note</span>}
              </div>
            )}
          </div>
          {subs.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 600, color: complete ? T.ok : T.textMid, paddingTop: 2, whiteSpace: 'nowrap' }}>{done}/{subs.length}</span>
          )}
          <Icon name={expanded ? 'chevronU' : 'chevronD'} size={20} color={T.textDim} style={{ marginTop: 1 }}/>
        </button>
        <div style={{ padding: '4px 4px 0 0' }}>
          <ActionMenu title={task.name} label={`More actions for ${task.name}`} items={menu}/>
        </div>
      </div>
      {subs.length > 0 && (
        <div style={{ height: 3, background: T.borderLight }} aria-hidden="true">
          <div style={{ height: '100%', width: `${Math.round((done / subs.length) * 100)}%`, background: complete ? T.ok : T.primary, transition: 'width .3s' }}/>
        </div>
      )}

      {expanded && (
        <div style={{ padding: '4px 16px 14px' }}>
          {task.notes && (
            <div style={{ background: T.surface2, borderRadius: 10, padding: '10px 12px', margin: '8px 0 10px', fontSize: 14, lineHeight: 1.5, color: T.textMid, whiteSpace: 'pre-wrap' }}>{task.notes}</div>
          )}
          {subs.length === 0 && <div style={{ ...S.meta, padding: '10px 0' }}>No subtasks yet</div>}
          {subs.map(s => <SubtaskRow key={s.id} sub={s} names={names} perms={perms} actions={actions}/>)}
          {perms.canManage && (addingSub ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input autoFocus aria-label="New subtask" value={newSub} onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitSub(); if (e.key === 'Escape') { setAddingSub(false); setNewSub(''); } }}
                placeholder="Subtask name…" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
              <button onClick={submitSub} style={S.btnPrimary}>Add</button>
              <button onClick={() => { setAddingSub(false); setNewSub(''); }} aria-label="Cancel" style={{ ...S.btnGhost, padding: '0 12px' }}><Icon name="close" size={18}/></button>
            </div>
          ) : (
            <button onClick={() => setAddingSub(true)} style={{ ...S.btnOutline, marginTop: 10 }}><Icon name="plus" size={16}/> Add subtask</button>
          ))}
        </div>
      )}

      {details && <TaskDetailsSheet task={task} rooms={rooms} canSetPriority={perms.canSetPriority}
        onSave={(d, nm) => actions.updateTask(task.id, d, nm)} onClose={() => setDetails(false)}/>}
      {confirming && <ConfirmSheet title={`Delete “${task.name}”?`} body="This can't be undone."
        onConfirm={() => actions.deleteTask(task.id)} onClose={() => setConfirming(false)}/>}
    </article>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────
export default function TasksTab({ tasksApi, rooms }) {
  const { canManage, canWrite, canDelete, can } = useAuth();
  const { tasks, names, loading } = tasksApi;
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('active');

  const perms = { canManage, canWrite, canDelete, canEditStatusBack: can('edit_status_backward'), canSetPriority: can('edit_priority') };
  const visible = tasks.filter(t => (filter === 'active' ? !isComplete(t) : filter === 'done' ? isComplete(t) : true));
  const doneCount = tasks.filter(isComplete).length;

  const submit = () => {
    if (!newTask.trim()) return;
    tasksApi.addTask(newTask.trim());
    setNewTask('');
  };

  if (loading) return <Loading label="Loading tasks…"/>;

  return (
    <div>
      {canManage && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input aria-label="New task" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Add a task…" style={{ ...S.input, flex: 1, minWidth: 0 }}/>
          <button onClick={submit} style={S.btnPrimary}><Icon name="plus" size={18}/> Add</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Segmented label="Show" value={filter} onChange={setFilter} options={[['active', 'Active'], ['all', 'All'], ['done', 'Done']]}/>
        <span style={{ ...S.meta, marginLeft: 'auto' }}>{doneCount} of {tasks.length} done</span>
      </div>
      {visible.length === 0 ? (
        <Empty>{filter === 'done' ? 'No completed tasks yet.' : filter === 'active' ? (tasks.length ? 'All tasks are done.' : 'No tasks yet.') : 'No tasks yet.'}</Empty>
      ) : visible.map((t, i) => (
        <TaskCard key={t.id} task={t} rooms={rooms} names={names} perms={perms} actions={tasksApi}
          prevId={visible[i - 1]?.id} nextId={visible[i + 1]?.id}/>
      ))}
    </div>
  );
}

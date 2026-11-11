import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { T, S } from '../../lib/theme';
import { plural } from '../../lib/format';
import { Icon, Field, Sheet, ConfirmSheet, ActionMenu, Empty, Loading } from '../../components/ui';

function NameSheet({ title, initial = '', saveLabel, onSave, onClose }) {
  const [val, setVal] = useState(initial);
  const save = () => { if (val.trim()) { onSave(val.trim()); onClose(); } };
  return (
    <Sheet title={title} onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>{saveLabel}</button></>}>
      <Field label="Name" htmlFor="room-name">
        <input id="room-name" autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="e.g. Kitchen, North camp, Borehole 2" style={S.input}/>
      </Field>
    </Sheet>
  );
}

export default function RoomsTab({ roomsApi, tasks }) {
  const { canManage } = useAuth();
  const { rooms, loading } = roomsApi;
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  if (loading) return <Loading label="Loading areas…"/>;

  const openTasks = id => tasks.filter(t => t.room_id === id && !((t.subtasks || []).length && t.subtasks.every(s => s.completed))).length;

  return (
    <div>
      {rooms.length === 0 && <Empty>No areas yet.</Empty>}
      {rooms.length > 0 && (
        <div style={{ ...S.card, overflow: 'hidden', marginBottom: 14 }}>
          {rooms.map((r, i) => {
            const n = openTasks(r.id);
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '4px 4px 4px 16px', borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
                <Icon name="rooms" size={20} color={T.textDim}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: T.text }}>{r.name}</div>
                  {n > 0 && <div style={S.meta}>{plural(n, 'open task')}</div>}
                </div>
                {canManage && (
                  <ActionMenu title={r.name} label={`More actions for ${r.name}`} items={[
                    { icon: 'pencil', label: 'Rename', onClick: () => setRenaming(r) },
                    { icon: 'up', label: 'Move up', disabled: i === 0, onClick: () => roomsApi.moveRoom(r.id, -1) },
                    { icon: 'down', label: 'Move down', disabled: i === rooms.length - 1, onClick: () => roomsApi.moveRoom(r.id, 1) },
                    { icon: 'trash', label: 'Delete', danger: true, onClick: () => setDeleting(r) },
                  ]}/>
                )}
              </div>
            );
          })}
        </div>
      )}
      {canManage && <button onClick={() => setAdding(true)} style={S.btnDashed}><Icon name="plus" size={18}/> Add area</button>}

      {adding && <NameSheet title="Add area" saveLabel="Add" onSave={roomsApi.addRoom} onClose={() => setAdding(false)}/>}
      {renaming && <NameSheet title="Rename" initial={renaming.name} saveLabel="Save" onSave={n => roomsApi.renameRoom(renaming.id, n)} onClose={() => setRenaming(null)}/>}
      {deleting && <ConfirmSheet title={`Delete “${deleting.name}”?`} body="This can't be undone."
        onConfirm={() => roomsApi.deleteRoom(deleting.id)} onClose={() => setDeleting(null)}/>}
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO } from '../../lib/format';
import { MAT_STATUS, matStatus, isToBuy, isOnSite, isUsed } from '../../lib/status';
import { Icon, Sheet, Empty, Loading, SectionLabel } from '../../components/ui';
import { MaterialStatusControl } from './materials';

const qtyText = m => (m.qty ? `${m.qty} ${m.unit || ''}`.trim() : '');

export function buildShareText(propertyName, items) {
  const lines = [`Shopping list — ${propertyName}`, fmtDate(todayISO()), ''];
  const byTask = new Map();
  items.forEach(m => { if (!byTask.has(m.taskName)) byTask.set(m.taskName, []); byTask.get(m.taskName).push(m); });
  byTask.forEach((list, task) => {
    lines.push(`*${task}*`);
    list.forEach(m => lines.push(`• ${m.name}${qtyText(m) ? ` — ${qtyText(m)}` : ''}${matStatus(m) === 'ordered' ? ' (ordered)' : ''}`));
    lines.push('');
  });
  return lines.join('\n').trim();
}

export async function shareList(text, fallback) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  fallback();
}

export function ShareSheet({ text, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };
  return (
    <Sheet title="Share list" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Close</button>
        <button onClick={copy} style={{ ...S.btnPrimary, flex: 2 }}><Icon name={copied ? 'check' : 'note'} size={18}/>{copied ? 'Copied' : 'Copy text'}</button></>}>
      <textarea readOnly aria-label="List text" value={text} onFocus={e => e.target.select()} rows={12}
        style={{ ...S.textarea, background: T.surface2, color: T.text, resize: 'none', userSelect: 'text', WebkitUserSelect: 'text' }}/>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
        style={{ ...S.btnOutline, width: '100%', boxSizing: 'border-box', height: 44, marginTop: 10, textDecoration: 'none' }}>
        <Icon name="send" size={16}/> Open in WhatsApp
      </a>
    </Sheet>
  );
}

function ItemRow({ m, perms, actions }) {
  const used = isUsed(m);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, padding: '8px 14px', borderTop: `1px solid ${T.borderLight}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: used ? T.textDim : T.text, textDecoration: used ? 'line-through' : 'none', lineHeight: 1.35 }}>{m.name}</div>
        <div style={S.meta}>{[qtyText(m), m.taskName].filter(Boolean).join(' · ')}</div>
      </div>
      <MaterialStatusControl material={m} canWrite={perms.canWrite} canEditStatusBack={perms.canEditStatusBack}
        onAdvance={() => actions.advanceMaterialStatus(m.id)} onSetStatus={s => actions.setMaterialStatus(m.id, s)}/>
    </div>
  );
}

function Group({ title, color, items, perms, actions }) {
  if (!items.length) return null;
  return (
    <section style={{ marginBottom: 18 }}>
      <SectionLabel color={color} style={{ marginBottom: 8 }}>{title} · {items.length}</SectionLabel>
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{ marginTop: -1 }}>{items.map(m => <ItemRow key={m.id} m={m} perms={perms} actions={actions}/>)}</div>
      </div>
    </section>
  );
}

export default function ShoppingTab({ property, tasksApi }) {
  const { canWrite, can } = useAuth();
  const { tasks, loading } = tasksApi;
  const [showUsed, setShowUsed] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (loading) return <Loading label="Loading materials…"/>;

  const all = tasks.flatMap(t => (t.subtasks || []).flatMap(s => (s.materials || []).map(m => ({ ...m, taskName: t.name }))));
  if (!all.length) return <Empty>No materials yet. Add them to a subtask on the Tasks tab.</Empty>;

  const order = { needed: 0, ordered: 1 };
  const toBuy = all.filter(isToBuy).sort((a, b) => order[matStatus(a)] - order[matStatus(b)]);
  const onSite = all.filter(isOnSite);
  const used = all.filter(isUsed);
  const ordered = toBuy.filter(m => matStatus(m) === 'ordered').length;
  const perms = { canWrite, canEditStatusBack: can('edit_status_backward') };
  const text = buildShareText(property.name, toBuy);

  return (
    <div>
      <div style={{ ...S.card, padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: toBuy.length ? T.primary : T.textDim, lineHeight: 1 }}>{toBuy.length}</span>
          <span style={{ fontSize: 15, color: T.text }}>to buy</span>
        </div>
        <div style={{ ...S.meta, marginTop: 6 }}>{ordered} ordered · {onSite.length} on site, not yet used · {used.length} used</div>
        {toBuy.length > 0 && (
          <button onClick={() => shareList(text, () => setSharing(true))} style={{ ...S.btnPrimary, width: '100%', marginTop: 12 }}>
            <Icon name="send" size={18}/> Share to-buy list on WhatsApp
          </button>
        )}
      </div>

      {toBuy.length === 0 && <div style={{ ...S.meta, marginBottom: 18 }}>Nothing to buy.</div>}
      <Group title="To buy" color={T.primary} items={toBuy} perms={perms} actions={tasksApi}/>
      <Group title="On site, not yet used" color={MAT_STATUS.delivered.color} items={onSite} perms={perms} actions={tasksApi}/>
      {used.length > 0 && (showUsed
        ? <Group title="Used" color={T.ok} items={used} perms={perms} actions={tasksApi}/>
        : null)}
      {used.length > 0 && (
        <button onClick={() => setShowUsed(v => !v)} style={{ ...S.btnGhost, width: '100%' }}>
          <Icon name={showUsed ? 'chevronU' : 'chevronD'} size={18}/>{showUsed ? 'Hide used items' : `Show ${used.length} used item${used.length === 1 ? '' : 's'}`}
        </button>
      )}
      {sharing && <ShareSheet text={text} onClose={() => setSharing(false)}/>}
    </div>
  );
}

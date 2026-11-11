import { useEffect, useState } from 'react';
import { subscribeSync, flushQueue, listFailed, discardFailed, retryFailed } from '../lib/offline';
import { T, S } from '../lib/theme';
import { Icon, Sheet } from './ui';

const TABLE_LABEL = {
  tasks: 'task', subtasks: 'subtask', materials: 'material', services: 'service', service_logs: 'service log', rooms: 'area',
  livestock: 'animal', livestock_events: 'livestock event', assets: 'asset', asset_service_logs: 'asset service', photos: 'photo',
  fuel_log: 'diesel entry', meter_readings: 'meter reading', round_checks: 'round check', store_moves: 'store movement',
  store_items: 'store item', incidents: 'incident', rain_log: 'rain entry', borehole_readings: 'borehole reading', game_counts: 'game count',
  audit_log: 'activity record',
};
const describe = op => {
  if (op.kind === 'upload') return 'Photo upload';
  const verb = (op.calls.find(([m]) => ['insert', 'update', 'upsert', 'delete'].includes(m)) || ['change'])[0];
  const what = TABLE_LABEL[op.table] || op.table;
  return `${{ insert: 'New', upsert: 'Saved', update: 'Changed', delete: 'Deleted' }[verb] || 'Changed'} ${what}`;
};

// Shows when there's no signal, while queued changes are being sent, or if any were refused.
export default function SyncBanner() {
  const [s, setS] = useState(null);
  const [failedOpen, setFailedOpen] = useState(false);
  const [failed, setFailed] = useState([]);
  const [justSent, setJustSent] = useState(false);
  useEffect(() => subscribeSync(next => {
    setS(prev => {
      if (prev && prev.pending > 0 && next.pending === 0 && next.online) { setJustSent(true); setTimeout(() => setJustSent(false), 4000); }
      return next;
    });
  }), []);
  useEffect(() => { if (failedOpen) listFailed().then(f => setFailed(f || [])); }, [failedOpen, s?.failed]);
  if (!s) return null;

  let tone = null, text = '', action = null;
  if (s.failed > 0) {
    tone = 'red'; text = `${s.failed} change${s.failed === 1 ? '' : 's'} couldn’t be saved`;
    action = <button onClick={() => setFailedOpen(true)} style={{ ...S.btnOutline, height: 32, marginLeft: 'auto', color: T.red, borderColor: T.redBorder }}>Details</button>;
  } else if (!s.online) {
    const as = s.lastSync ? ` (copy from ${new Date(s.lastSync).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})` : '';
    tone = 'warn'; text = s.pending ? `No signal · ${s.pending} change${s.pending === 1 ? '' : 's'} saved on this phone, sent when you’re back online` : `No signal · working from the copy on this phone${as}`;
  } else if (s.pending > 0) {
    tone = 'info'; text = `Sending ${s.pending} change${s.pending === 1 ? '' : 's'}…`;
    if (!s.syncing) action = <button onClick={() => flushQueue()} style={{ ...S.btnOutline, height: 32, marginLeft: 'auto' }}>Send now</button>;
  } else if (justSent) {
    tone = 'ok'; text = 'All changes sent';
  }
  const colors = { red: [T.red, T.redFade, T.redBorder], warn: [T.warn, T.warnFade, T.warnBorder], info: [T.info, T.infoFade, T.infoBorder], ok: [T.ok, T.okFade, T.okBorder] };

  return (
    <>
      {tone && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', minHeight: 44, boxSizing: 'border-box', fontFamily: T.sans,
          fontSize: 14, fontWeight: 600, color: colors[tone][0], background: colors[tone][1], borderBottom: `1px solid ${colors[tone][2]}` }}>
          <Icon name={tone === 'ok' ? 'check' : tone === 'warn' ? 'cloudOff' : tone === 'red' ? 'flag' : 'activity'} size={18}/>
          <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
          {action}
        </div>
      )}
      {failedOpen && (
        <Sheet title="Changes that couldn’t be saved" onClose={() => setFailedOpen(false)}>
          <p style={{ ...S.meta, fontSize: 14, margin: '-6px 0 12px', lineHeight: 1.5 }}>
            The server refused these when they were sent. Usually the item was deleted meanwhile, or you don't have permission. Retry, or discard them.
          </p>
          {failed.length === 0 && <div style={S.meta}>None left.</div>}
          {failed.map(op => (
            <div key={op.seq} style={{ borderTop: `1px solid ${T.borderLight}`, padding: '10px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{describe(op)}</div>
              <div style={{ ...S.meta, marginBottom: 8 }}>{op.error}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => retryFailed(op.seq)} style={S.btnOutline}>Retry</button>
                <button onClick={() => discardFailed(op.seq)} style={{ ...S.btnOutline, color: T.red, borderColor: T.redBorder }}>Discard</button>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  );
}

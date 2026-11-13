import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { T, S } from '../lib/theme';
import { fmtDateTime } from '../lib/format';
import { Icon } from './ui';

// Admins: the automatic OneDrive backup (Monday and Thursday, 02:00), its last runs, and "Back up now".
export default function BackupCard() {
  const [runs, setRuns] = useState(null);       // null = loading; 'missing' = not set up
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = async () => {
    const { data, error } = await supabase.from('backup_log').select('*').order('ran_at', { ascending: false }).limit(5);
    if (error) setRuns(/PGRST205|42P01|does not exist|Could not find/i.test(`${error.code} ${error.message}`) ? 'missing' : []);
    else setRuns(data || []);
  };
  useEffect(() => { load(); }, []);

  const now = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.functions.invoke('backup', { body: {} });
    setBusy(false);
    if (error || !data?.ok) {
      let detail = data?.error || error?.message || 'Failed';
      try { const b = await error?.context?.json?.(); if (b?.error) detail = b.error; } catch { /* keep */ }
      setMsg({ tone: 'error', text: /Failed to send|fetch/i.test(detail) ? 'No signal, or the backup function isn’t set up yet.' : detail });
    } else setMsg({ tone: 'ok', text: `Saved ${data.files?.[0] || 'backup'} to OneDrive.` });
    load();
  };

  const last = Array.isArray(runs) ? runs[0] : null;
  const lastGood = Array.isArray(runs) ? runs.find(r => r.ok) : null;
  const stale = lastGood && Date.now() - new Date(lastGood.ran_at).getTime() > 5 * 24 * 3600 * 1000;
  return (
    <div style={{ ...S.card, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon name="download" size={18} color={T.primary}/>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Automatic backup to OneDrive</div>
      </div>
      <p style={{ ...S.meta, fontSize: 14, margin: '0 0 10px', lineHeight: 1.5 }}>
        Every Monday and Thursday at 02:00, all data for every property is saved to the “Property Tracker Backups” folder in OneDrive, as an Excel workbook and a full copy. Photos aren’t included.
      </p>
      {runs === null && <div style={S.meta}>Checking…</div>}
      {runs === 'missing' && <div style={{ fontSize: 14, color: T.warn }}>Not set up yet: the backup SQL and function still need to be added in Supabase.</div>}
      {Array.isArray(runs) && !runs.length && <div style={S.meta}>No backups yet.</div>}
      {last && (
        <div style={{ fontSize: 14, color: last.ok && !stale ? T.text : T.red, marginBottom: 6 }}>
          {last.ok ? <>Last backup {fmtDateTime(last.ran_at)} · {last.rows} records{stale ? ' · more than 5 days ago, check the scheduler' : ''}</>
            : <>Last attempt {fmtDateTime(last.ran_at)} failed: {last.error}</>}
          {!last.ok && lastGood && <div style={{ ...S.meta, marginTop: 2 }}>Last good backup {fmtDateTime(lastGood.ran_at)}</div>}
        </div>
      )}
      {msg && <div role={msg.tone === 'error' ? 'alert' : 'status'} style={{ fontSize: 14, padding: '8px 10px', borderRadius: 8, marginBottom: 8,
        color: msg.tone === 'error' ? T.red : T.ok, background: msg.tone === 'error' ? T.redFade : T.okFade }}>{msg.text}</div>}
      {runs !== 'missing' && <button onClick={now} disabled={busy} style={{ ...S.btnOutline, opacity: busy ? 0.6 : 1 }}><Icon name="download" size={16}/>{busy ? 'Backing up…' : 'Back up now'}</button>}
    </div>
  );
}

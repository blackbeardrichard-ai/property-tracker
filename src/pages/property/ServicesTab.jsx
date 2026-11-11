import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { T, S } from '../../lib/theme';
import { fmtDate, todayISO, daysUntil, calcNextDue, FREQUENCIES, freqLabel, plural } from '../../lib/format';
import { serviceState, SERVICE_GROUPS } from '../../lib/status';
import { Icon, Segmented, Field, Sheet, ConfirmSheet, ActionMenu, Empty, Loading, Toast, SectionLabel } from '../../components/ui';

// ── Sheets ──────────────────────────────────────────────────────────
function LogSheet({ service, onSave, onClose }) {
  const [f, setF] = useState({ doneDate: todayISO(), company: '', invoiceNumber: '', invoiceAmount: '', warranty: false, warrantyMonths: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const next = service.is_recurring ? calcNextDue(f.doneDate, service.freq_months) : null;
  const save = async () => {
    if (!f.doneDate || busy) return;
    setBusy(true);
    const ok = await onSave(f);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet title="Log as done" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={busy} style={{ ...S.btnPrimary, flex: 2, opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving…' : 'Log service'}</button></>}>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: T.text }}>{service.name}</p>
      <Field label="Date done" htmlFor="log-date" hint={next ? `Next due ${fmtDate(next)}` : service.is_recurring ? null : 'One-off: no next date'}>
        <input id="log-date" type="date" max={todayISO()} value={f.doneDate} onChange={set('doneDate')} style={S.input}/>
      </Field>
      <Field label="Company or provider (optional)" htmlFor="log-co">
        <input id="log-co" value={f.company} onChange={set('company')} placeholder="e.g. ABC Pool Services" style={S.input}/>
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Invoice no. (optional)" htmlFor="log-inv" style={{ flex: 1, minWidth: 0 }}>
          <input id="log-inv" value={f.invoiceNumber} onChange={set('invoiceNumber')} style={S.input}/>
        </Field>
        <Field label="Amount, R (optional)" htmlFor="log-amt" style={{ flex: 1, minWidth: 0 }}>
          <input id="log-amt" type="number" inputMode="decimal" min="0" step="0.01" value={f.invoiceAmount} onChange={set('invoiceAmount')} style={S.input}/>
        </Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer', fontSize: 15, color: T.text, marginBottom: f.warranty ? 6 : 10 }}>
        <input type="checkbox" checked={f.warranty} onChange={set('warranty')} style={{ width: 20, height: 20, accentColor: T.primary }}/>
        Warranty given
      </label>
      {f.warranty && (
        <Field label="Warranty (months)" htmlFor="log-wm">
          <input id="log-wm" type="number" inputMode="numeric" min="0" value={f.warrantyMonths} onChange={set('warrantyMonths')} style={S.input}/>
        </Field>
      )}
      <Field label="Notes (optional)" htmlFor="log-notes">
        <textarea id="log-notes" rows={2} value={f.notes} onChange={set('notes')} placeholder="e.g. Replaced filter, all good" style={S.textarea}/>
      </Field>
    </Sheet>
  );
}

// Give a service a schedule: when it was last done (next due is calculated) or when it's first due.
function ScheduleFields({ recurring, freqMonths, mode, setMode, date, setDate, allowNone }) {
  const options = [['last', 'Last done'], ['first', 'First due'], ...(allowNone ? [['none', 'Not known']] : [])];
  const next = mode === 'last' && recurring && date ? calcNextDue(date, freqMonths) : null;
  return (
    <>
      <Field label="Schedule">
        <Segmented label="Schedule" value={mode} onChange={setMode} options={options}/>
      </Field>
      {mode !== 'none' && (
        <Field label={mode === 'last' ? 'Date last done' : 'Date first due'} htmlFor="sched-date"
          hint={next ? `Next due ${fmtDate(next)}` : mode === 'last' && !recurring ? 'One-off: recorded as done' : null}>
          <input id="sched-date" type="date" value={date} max={mode === 'last' ? todayISO() : undefined} onChange={e => setDate(e.target.value)} style={S.input}/>
        </Field>
      )}
    </>
  );
}

function ScheduleSheet({ service, onSave, onClose }) {
  const [mode, setMode] = useState(service.is_recurring ? 'last' : 'first');
  const [date, setDate] = useState('');
  const save = async () => { if (!date) return; if (await onSave(mode === 'last' ? { lastDone: date } : { firstDue: date })) onClose(); };
  return (
    <Sheet title="Set date" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={save} disabled={!date} style={{ ...S.btnPrimary, flex: 2, opacity: date ? 1 : 0.5 }}>Save</button></>}>
      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: T.text }}>{service.name}</p>
      <p style={{ ...S.meta, margin: '0 0 14px' }}>{freqLabel(service.freq_months, service.is_recurring)}</p>
      <ScheduleFields recurring={service.is_recurring} freqMonths={service.freq_months} mode={mode} setMode={setMode} date={date} setDate={setDate}/>
    </Sheet>
  );
}

function AddServiceSheet({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [recurring, setRecurring] = useState('yes');
  const [freq, setFreq] = useState('12');
  const [mode, setMode] = useState('last');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const save = async () => {
    if (!name.trim()) { setErr('required'); return; }
    const ok = await onSave({
      name: name.trim(), isRecurring: recurring === 'yes', freqMonths: freq, notes: notes.trim(),
      lastDone: mode === 'last' && date ? date : null, firstDue: mode === 'first' && date ? date : null,
    });
    if (ok) onClose();
  };
  return (
    <Sheet title="Add service" onClose={onClose}
      footer={<><button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button><button onClick={save} style={{ ...S.btnPrimary, flex: 2 }}>Add service</button></>}>
      <Field label="Service" htmlFor="svc-name" error={err}>
        <input id="svc-name" autoFocus value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="e.g. Borehole pump check"
          style={{ ...S.input, borderColor: err ? T.red : T.border }}/>
      </Field>
      <Field label="Repeats">
        <Segmented label="Repeats" value={recurring} onChange={setRecurring} options={[['yes', 'Recurring'], ['no', 'One-off']]}/>
      </Field>
      {recurring === 'yes' && (
        <Field label="How often" htmlFor="svc-freq">
          <select id="svc-freq" value={freq} onChange={e => setFreq(e.target.value)} style={S.input}>
            {FREQUENCIES.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      )}
      <ScheduleFields recurring={recurring === 'yes'} freqMonths={freq} mode={mode} setMode={setMode} date={date} setDate={setDate} allowNone/>
      <Field label="Notes (optional)" htmlFor="svc-notes">
        <input id="svc-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Check output and pressure" style={S.input}/>
      </Field>
    </Sheet>
  );
}

// ── Rows ────────────────────────────────────────────────────────────
function ServiceCard({ svc, perms, onLog, onSchedule, onDelete }) {
  const [open, setOpen] = useState(false);
  const state = serviceState(svc);
  const d = daysUntil(svc.next_due);
  const logs = svc.service_logs || [];
  const sub = [freqLabel(svc.freq_months, svc.is_recurring), svc.last_done ? `last done ${fmtDate(svc.last_done)}` : null].filter(Boolean).join(' · ');

  let when = null;
  if (state === 'overdue') when = { big: plural(-d, 'day'), small: `Was due ${fmtDate(svc.next_due)}`, color: T.red };
  else if (state === 'soon') when = { big: d === 0 ? 'Today' : `In ${plural(d, 'day')}`, small: `Due ${fmtDate(svc.next_due)}`, color: T.warn };
  else if (state === 'upcoming') when = { big: null, small: `Due ${fmtDate(svc.next_due)}`, color: T.textDim };

  const unscheduled = state === 'unscheduled';
  const primary = unscheduled && perms.canManage
    ? <button onClick={onSchedule} style={S.btnOutline}><Icon name="calendar" size={16}/> Set date</button>
    : perms.canWrite && state !== 'done'
      ? <button onClick={onLog} style={{ ...S.btnOutline, ...(state === 'overdue' ? { background: T.primary, color: T.onPrimary, borderColor: T.primary } : {}) }}><Icon name="check" size={16}/> Log as done</button>
      : null;

  const menu = [
    perms.canWrite && { icon: 'check', label: 'Log as done', onClick: onLog },
    perms.canManage && { icon: 'calendar', label: unscheduled ? 'Set date' : 'Change date', onClick: onSchedule },
    perms.canManage && { icon: 'trash', label: 'Delete service', danger: true, onClick: onDelete },
  ];

  return (
    <article style={{ ...S.card, marginBottom: 8, borderColor: state === 'overdue' ? T.redBorder : T.border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, alignItems: 'flex-start', padding: unscheduled ? '12px 4px 12px 16px' : '14px 4px 6px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, lineHeight: 1.35 }}>{svc.name}</div>
            <div style={{ ...S.meta, marginTop: 2 }}>{sub}</div>
          </div>
          {when?.big && <span style={{ fontSize: 15, fontWeight: 700, color: when.color, whiteSpace: 'nowrap', paddingTop: 1 }}>{when.big}</span>}
        </button>
        {unscheduled && primary && <div style={{ padding: '8px 0' }}>{primary}</div>}
        <div style={{ padding: '4px 4px 0 0' }}><ActionMenu title={svc.name} label={`More actions for ${svc.name}`} items={menu}/></div>
      </div>

      {!unscheduled && (when || primary) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 12px' }}>
          {when && <span style={{ ...S.meta, flex: 1, color: state === 'overdue' ? T.red : T.textDim }}>{when.small}</span>}
          {!when && <span style={{ flex: 1 }}/>}
          {primary}
        </div>
      )}

      {open && (
        <div style={{ borderTop: `1px solid ${T.borderLight}`, padding: '10px 16px 12px' }}>
          {svc.notes && <p style={{ margin: '0 0 10px', fontSize: 14, color: T.textMid, lineHeight: 1.5 }}>{svc.notes}</p>}
          <div style={{ ...S.fieldLabel, marginBottom: 4 }}>History</div>
          {logs.length === 0 && <div style={S.meta}>Never logged.</div>}
          {logs.slice(0, 5).map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.borderLight}`, fontSize: 14 }}>
              <span style={{ color: T.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(l.done_date)}</span>
              <span style={{ flex: 1, minWidth: 0, color: T.textMid }}>
                {l.company || l.notes || 'Done'}
                {l.warranty && l.warranty_expiry ? <span style={S.meta}> · warranty to {fmtDate(l.warranty_expiry)}</span> : null}
              </span>
              {(l.invoice_number || l.invoice_amount) && (
                <span style={{ ...S.meta, whiteSpace: 'nowrap' }}>{[l.invoice_number && `#${l.invoice_number}`, l.invoice_amount && `R ${Number(l.invoice_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`].filter(Boolean).join(' · ')}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Tile({ n, label, color }) {
  return (
    <div style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: n ? color : T.textDim, lineHeight: 1.1 }}>{n}</div>
      <div style={{ ...S.meta, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────
export default function ServicesTab({ servicesApi }) {
  const { canManage, canWrite } = useAuth();
  const { services, loading } = servicesApi;
  const [logging, setLogging] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [showLater, setShowLater] = useState(true);

  if (loading) return <Loading label="Loading services…"/>;

  const grouped = Object.fromEntries(SERVICE_GROUPS.map(g => [g.id, []]));
  services.forEach(s => grouped[serviceState(s)].push(s));
  const perms = { canManage, canWrite };
  const fail = error => setToast({ message: `Couldn't save: ${error?.message || 'try again'}`, tone: 'error' });

  const doLog = async (svc, f) => {
    const { error } = await servicesApi.logService(svc.id, f);
    if (error) { fail(error); return false; }
    const next = svc.is_recurring ? calcNextDue(f.doneDate, svc.freq_months) : null;
    setToast({ message: `${svc.name} logged${next ? ` · next due ${fmtDate(next)}` : ''}` });
    return true;
  };
  const doSchedule = async (svc, s) => {
    const { error } = await servicesApi.setSchedule(svc.id, s);
    if (error) { fail(error); return false; }
    setToast({ message: `${svc.name} scheduled` });
    return true;
  };
  const doAdd = async svc => {
    const { error } = await servicesApi.addService(svc);
    if (error) { fail(error); return false; }
    setToast({ message: `${svc.name} added` });
    return true;
  };

  const card = s => (
    <ServiceCard key={s.id} svc={s} perms={perms}
      onLog={() => setLogging(s)} onSchedule={() => setScheduling(s)} onDelete={() => setDeleting(s)}/>
  );

  return (
    <div>
      {services.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <Tile n={grouped.overdue.length} label="Overdue" color={T.red}/>
          <Tile n={grouped.soon.length} label="Next 30 days" color={T.warn}/>
          <Tile n={grouped.unscheduled.length} label="No due date" color={T.warn}/>
        </div>
      )}

      {services.length === 0 && <Empty>No services yet.</Empty>}

      {services.length > 0 && SERVICE_GROUPS.map(g => {
        const list = grouped[g.id];
        if (!list.length && !['overdue', 'soon'].includes(g.id)) return null;
        if (!list.length && g.id === 'overdue') return null;
        const collapsible = g.id === 'upcoming';
        return (
          <section key={g.id} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, minHeight: 28 }}>
              <SectionLabel color={list.length ? g.color : T.textMid}>{g.label} ({list.length})</SectionLabel>
              {collapsible && (
                <button onClick={() => setShowLater(v => !v)} style={{ ...S.btnOutline, border: 'none', marginLeft: 'auto', height: 32, color: T.primary }}>
                  {showLater ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
            {g.id === 'soon' && !list.length && <div style={{ ...S.meta, marginBottom: 4 }}>Nothing due in the next 30 days.</div>}
            {g.id === 'unscheduled' && (
              <p style={{ ...S.meta, margin: '-2px 0 10px', lineHeight: 1.45 }}>
                Never logged, so these can't fall due.{canManage ? ' Set the date each was last done, or when it’s first due.' : ''}
              </p>
            )}
            {(!collapsible || showLater) && list.map(card)}
          </section>
        );
      })}

      {canManage && (
        <button onClick={() => setAdding(true)} style={{ ...S.btnDashed, marginTop: 4 }}><Icon name="plus" size={18}/> Add service</button>
      )}

      {logging && <LogSheet service={logging} onSave={f => doLog(logging, f)} onClose={() => setLogging(null)}/>}
      {scheduling && <ScheduleSheet service={scheduling} onSave={s => doSchedule(scheduling, s)} onClose={() => setScheduling(null)}/>}
      {adding && <AddServiceSheet onSave={doAdd} onClose={() => setAdding(false)}/>}
      {deleting && <ConfirmSheet title={`Delete “${deleting.name}”?`} body="This can't be undone."
        onConfirm={() => servicesApi.deleteService(deleting.id)} onClose={() => setDeleting(null)}/>}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)}/>}
    </div>
  );
}

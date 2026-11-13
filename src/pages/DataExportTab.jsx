import { useState } from 'react';
import { useGlobalData } from '../hooks/useGlobalData';
import { T, S } from '../lib/theme';
import { todayISO } from '../lib/format';
import { Icon, Loading } from '../components/ui';
import BackupCard from '../components/BackupCard';
import { useAuth } from '../context/AuthContext';

const TYPES = [
  { key:'tasks',     label:'Tasks & Subtasks' },
  { key:'materials', label:'Materials' },
  { key:'services',  label:'Services' },
  { key:'assets',    label:'Assets' },
  { key:'livestock', label:'Livestock' },
];

export default function DataExportTab() {
  const { properties, tasks, materials, services, assets, livestock, loading } = useGlobalData();
  const { isAdmin } = useAuth();
  const [selTypes, setSelTypes] = useState(() => new Set(TYPES.map(t=>t.key)));
  const [selProps, setSelProps] = useState(null); // null = all accessible
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const propById = Object.fromEntries((properties||[]).map(p=>[p.id,p]));
  const propName = id => propById[id]?.name || '';

  const toggleType = k => setSelTypes(s => { const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  const propAllowed = id => !selProps || selProps.has(id);
  const toggleProp = id => setSelProps(s => {
    const base = s || new Set((properties||[]).map(p=>p.id));
    const n = new Set(base); n.has(id)?n.delete(id):n.add(id); return n;
  });

  const buildSheets = (XLSX) => {
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => { if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name); };

    if (selTypes.has('tasks')) {
      const rows = [];
      tasks.filter(t=>propAllowed(t.property_id)).forEach(t => {
        (t.subtasks||[]).length
          ? t.subtasks.forEach(s => rows.push({ Property:propName(t.property_id), Task:t.name, Subtask:s.name, Completed:s.completed?'Yes':'No', Priority:t.priority||'', 'Due Date':t.due_date||'' }))
          : rows.push({ Property:propName(t.property_id), Task:t.name, Subtask:'', Completed:'', Priority:t.priority||'', 'Due Date':t.due_date||'' });
      });
      add('Tasks', rows);
    }
    if (selTypes.has('materials')) {
      add('Materials', materials.filter(m=>propAllowed(m.property_id)).map(m => ({
        Property:propName(m.property_id), Material:m.name, Quantity:m.qty||'', Unit:m.unit||'', Status:m.status||'needed',
        Task:m.subtask?.task?.name||'', Subtask:m.subtask?.name||'',
      })));
    }
    if (selTypes.has('services')) {
      add('Services', services.filter(s=>propAllowed(s.property_id)).map(s => ({
        Property:propName(s.property_id), Service:s.name, 'Frequency (months)':s.freq_months||'', 'Last Done':s.last_done||'', 'Next Due':s.next_due||'', Recurring:s.is_recurring?'Yes':'No',
      })));
    }
    if (selTypes.has('assets')) {
      add('Assets', assets.filter(a=>propAllowed(a.current_property_id)).map(a => ({
        Property:propName(a.current_property_id), Asset:a.name, Category:a.category||'', Make:a.make||'', Model:a.model||'', 'Serial No':a.serial_number||'', Year:a.year||'', Condition:a.condition||'',
      })));
    }
    if (selTypes.has('livestock')) {
      add('Livestock', livestock.filter(l=>propAllowed(l.property_id)).map(l => ({
        Property:propName(l.property_id), Name:l.name||'', Tag:l.tag_number||'', Species:l.species||'', Breed:l.breed||'', Gender:l.gender||'', Status:l.status||'',
      })));
    }
    return wb;
  };

  // xlsx is ~400 kB, so it is loaded only when someone actually exports.
  const doExport = async () => {
    if (selTypes.size === 0) { setMsg('Select at least one data type.'); return; }
    setMsg(''); setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const wb = buildSheets(XLSX);
      if (!wb.SheetNames.length) { setMsg('No data to export for this selection.'); return; }
      XLSX.writeFile(wb, `property-tracker-export-${todayISO()}.xlsx`);
    } catch (e) {
      setMsg(`Export failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading data…"/>;

  return (
    <div>
      {isAdmin && <BackupCard/>}
      <h2 style={{ ...S.sectionLabel, color: T.text, fontSize: 17, marginBottom: 4 }}>Data export</h2>
      <p style={{ ...S.meta, fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
        Download your data as an Excel workbook, one sheet per type. Covers the properties you have access to.
      </p>

      <div style={S.fieldLabel}>What to export</div>
      <div style={{ ...S.card, overflow: 'hidden', marginBottom: 18 }}>
        {TYPES.map((t, i) => (
          <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none', cursor: 'pointer' }}>
            <input type="checkbox" checked={selTypes.has(t.key)} onChange={() => toggleType(t.key)} style={{ width: 20, height: 20, accentColor: T.primary }}/>
            <span style={{ fontSize: 15, color: T.text }}>{t.label}</span>
          </label>
        ))}
      </div>

      <div style={S.fieldLabel}>Properties</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {(properties || []).map(p => {
          const on = propAllowed(p.id);
          return (
            <button key={p.id} onClick={() => toggleProp(p.id)} aria-pressed={on}
              style={{ height: 40, padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontFamily: T.sans, fontWeight: on ? 600 : 500,
                background: on ? T.primary : T.surface, color: on ? T.onPrimary : T.textMid, border: `1px solid ${on ? T.primary : T.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {on && <Icon name="check" size={16}/>}{p.name}
            </button>
          );
        })}
      </div>

      {msg && <div role="alert" style={{ fontSize: 14, color: T.red, background: T.redFade, padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>{msg}</div>}

      <button onClick={doExport} disabled={busy} style={{ ...S.btnPrimary, opacity: busy ? 0.7 : 1 }}>
        <Icon name="download" size={18}/> {busy ? 'Preparing…' : 'Download Excel'}
      </button>
    </div>
  );
}

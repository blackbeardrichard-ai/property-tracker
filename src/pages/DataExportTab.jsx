import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useGlobalData } from '../hooks/useGlobalData';
import { T, S } from '../lib/theme';

const TYPES = [
  { key:'tasks',     label:'Tasks & Subtasks' },
  { key:'materials', label:'Materials' },
  { key:'services',  label:'Services' },
  { key:'assets',    label:'Assets' },
  { key:'livestock', label:'Livestock' },
];

export default function DataExportTab() {
  const { properties, tasks, materials, services, assets, livestock, loading } = useGlobalData();
  const [selTypes, setSelTypes] = useState(() => new Set(TYPES.map(t=>t.key)));
  const [selProps, setSelProps] = useState(null); // null = all accessible
  const [msg, setMsg] = useState('');

  const propById = Object.fromEntries((properties||[]).map(p=>[p.id,p]));
  const propName = id => propById[id]?.name || '';

  const toggleType = k => setSelTypes(s => { const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });
  const propAllowed = id => !selProps || selProps.has(id);
  const toggleProp = id => setSelProps(s => {
    const base = s || new Set((properties||[]).map(p=>p.id));
    const n = new Set(base); n.has(id)?n.delete(id):n.add(id); return n;
  });

  const buildSheets = () => {
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

  const doExport = () => {
    if (selTypes.size === 0) { setMsg('Select at least one data type.'); return; }
    setMsg('');
    const wb = buildSheets();
    if (!wb.SheetNames.length) { setMsg('No data to export for the current selection.'); return; }
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `property-tracker-export-${date}.xlsx`);
  };

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading data…</div>;

  return (
    <div>
      <div style={{ fontSize:'12px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'6px' }}>DATA EXPORT</div>
      <div style={{ fontSize:'12px', color:T.textFaint, fontFamily:T.sans, marginBottom:'16px', lineHeight:'1.5' }}>
        Download your data as an Excel workbook — one tab per type. Covers the properties you have access to.
      </div>

      <div style={{ ...S.fieldLabel, marginBottom:'8px' }}>WHAT TO EXPORT</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'18px' }}>
        {TYPES.map(t => (
          <label key={t.key} style={{ display:'flex', alignItems:'center', gap:'10px', background:T.surface2, border:`1px solid ${selTypes.has(t.key)?T.primaryBorder:T.border}`, borderRadius:'8px', padding:'10px 14px', cursor:'pointer' }}>
            <input type="checkbox" checked={selTypes.has(t.key)} onChange={()=>toggleType(t.key)} style={{ width:'16px', height:'16px', accentColor:T.primary }}/>
            <span style={{ fontSize:'13px', color:T.text, fontFamily:T.sans }}>{t.label}</span>
          </label>
        ))}
      </div>

      <div style={{ ...S.fieldLabel, marginBottom:'8px' }}>PROPERTIES (all by default)</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'20px' }}>
        {(properties||[]).map(p => {
          const on = propAllowed(p.id);
          return (
            <button key={p.id} onClick={()=>toggleProp(p.id)} style={{ background:on?T.primaryFade:T.controlBg, border:`1px solid ${on?T.primaryBorder:T.border}`, color:on?T.accent:T.textDim, borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}>
              {p.icon} {p.name}
            </button>
          );
        })}
      </div>

      {msg && <div style={{ fontSize:'13px', color:T.red, marginBottom:'12px', fontFamily:T.sans }}>{msg}</div>}

      <button onClick={doExport} style={{ ...S.btnPrimary, padding:'11px 20px' }}>
        ⬇ Download Excel
      </button>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useGlobalData } from '../hooks/useGlobalData';
import { T, S } from '../lib/theme';

const TYPE_META = {
  task:      { icon:'✓', label:'Task',     color:T.accent },
  material:  { icon:'📦', label:'Material', color:T.primary },
  service:   { icon:'🔧', label:'Service',  color:T.warn },
  asset:     { icon:'🚜', label:'Asset',    color:T.accent },
  livestock: { icon:'🐄', label:'Animal',   color:'#95D5B2' },
};

export default function SearchPage({ onBack, onOpenProperty }) {
  const { properties, tasks, materials, services, assets, livestock, loading } = useGlobalData();
  const [q, setQ] = useState('');

  const propById = useMemo(() => Object.fromEntries((properties||[]).map(p=>[p.id,p])), [properties]);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const hit = (...fields) => fields.filter(Boolean).some(f => String(f).toLowerCase().includes(ql));
    const r = [];

    tasks.forEach(t => {
      if (hit(t.name, t.notes)) r.push({ type:'task', id:t.id, title:t.name, sub:t.notes||'', propId:t.property_id });
      (t.subtasks||[]).forEach(s => {
        if (hit(s.name)) r.push({ type:'task', id:s.id, title:s.name, sub:`Subtask of ${t.name}`, propId:t.property_id });
      });
    });
    materials.forEach(m => {
      if (hit(m.name, m.unit)) r.push({ type:'material', id:m.id, title:m.name, sub:`${m.status||'needed'}${m.qty?` · ${m.qty} ${m.unit||''}`:''}`, propId:m.property_id });
    });
    services.forEach(s => {
      if (hit(s.name, s.notes)) r.push({ type:'service', id:s.id, title:s.name, sub:s.next_due?`Next due ${s.next_due}`:'', propId:s.property_id });
    });
    assets.forEach(a => {
      if (hit(a.name, a.make, a.model, a.serial_number, a.category)) r.push({ type:'asset', id:a.id, title:a.name, sub:[a.make,a.model].filter(Boolean).join(' '), propId:a.current_property_id });
    });
    livestock.forEach(l => {
      if (hit(l.name, l.tag_number, l.species, l.breed)) r.push({ type:'livestock', id:l.id, title:l.name||l.tag_number||l.species, sub:[l.species,l.breed,l.tag_number?`#${l.tag_number}`:''].filter(Boolean).join(' · '), propId:l.property_id });
    });
    return r;
  }, [q, tasks, materials, services, assets, livestock]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(r => { (g[r.type] = g[r.type] || []).push(r); });
    return g;
  }, [results]);

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, boxShadow:T.shadow, position:'sticky', top:0, zIndex:10, padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
          <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', color:T.textDim, cursor:'pointer', fontFamily:T.sans, fontSize:'12px', padding:'4px 0' }}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Back
          </button>
          <div style={{ width:'1px', height:'16px', background:T.border }}/>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text }}>Search</div>
        </div>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks, materials, services, assets, livestock…" style={{ ...S.input, fontSize:'13px' }}/>
      </div>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'18px 14px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading…</div>
        ) : !q.trim() ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.sans, fontSize:'13px' }}>
            Start typing to search across all your properties.
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>No matches for “{q}”</div>
        ) : (
          <>
            <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono, marginBottom:'12px' }}>{results.length} result{results.length===1?'':'s'}</div>
            {Object.entries(grouped).map(([type, items]) => {
              const meta = TYPE_META[type];
              return (
                <div key={type} style={{ marginBottom:'18px' }}>
                  <div style={{ fontSize:'10px', fontFamily:T.mono, color:meta.color, letterSpacing:'0.08em', marginBottom:'8px' }}>
                    {meta.icon} {meta.label.toUpperCase()}S ({items.length})
                  </div>
                  {items.map(item => {
                    const prop = propById[item.propId];
                    return (
                      <div key={`${item.type}-${item.id}`}
                        onClick={()=>prop && onOpenProperty && onOpenProperty(prop)}
                        style={{ display:'flex', alignItems:'center', gap:'12px', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'11px 14px', marginBottom:'6px', cursor:prop?'pointer':'default' }}
                        onMouseEnter={e=>{ if(prop) e.currentTarget.style.borderColor=T.primary; }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'14px', fontWeight:'600', color:T.text, fontFamily:T.sans }}>{item.title}</div>
                          {item.sub && <div style={{ fontSize:'11px', color:T.textDim, fontFamily:T.sans, marginTop:'1px' }}>{item.sub}</div>}
                        </div>
                        {prop && <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono, flexShrink:0 }}>{prop.icon} {prop.name}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

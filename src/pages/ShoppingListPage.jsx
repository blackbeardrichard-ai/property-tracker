import { useMemo, useState } from 'react';
import { useGlobalData } from '../hooks/useGlobalData';
import { T } from '../lib/theme';

const MAT_STATUS = {
  needed:    { label:'Needed',    color:T.red },
  ordered:   { label:'Ordered',   color:T.warn },
  delivered: { label:'Delivered', color:'#95D5B2' },
};

export default function ShoppingListPage({ onBack }) {
  const { properties, materials, loading } = useGlobalData(['materials']);
  const [showDelivered, setShowDelivered] = useState(false);

  const propById = useMemo(() => Object.fromEntries((properties||[]).map(p=>[p.id,p])), [properties]);

  // Pending = needed + ordered (+ delivered if toggled). Exclude 'used'.
  const groups = useMemo(() => {
    const statuses = showDelivered ? ['needed','ordered','delivered'] : ['needed','ordered'];
    const pending = (materials||[]).filter(m => statuses.includes(m.status||'needed'));
    const byProp = {};
    pending.forEach(m => { (byProp[m.property_id] = byProp[m.property_id] || []).push(m); });
    return Object.entries(byProp).map(([pid, items]) => ({
      property: propById[pid],
      items: items.sort((a,b)=>(a.status||'').localeCompare(b.status||'')),
    })).filter(g => g.property).sort((a,b)=>a.property.name.localeCompare(b.property.name));
  }, [materials, propById, showDelivered]);

  const total = groups.reduce((n,g)=>n+g.items.length, 0);

  const shareWhatsApp = () => {
    let txt = '🛒 Shopping List\n\n';
    groups.forEach(g => {
      txt += `*${g.property.name}*\n`;
      g.items.forEach(m => { txt += `• ${m.name}${m.qty?` (${m.qty} ${m.unit||''})`:''} — ${MAT_STATUS[m.status||'needed']?.label||m.status}\n`; });
      txt += '\n';
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, boxShadow:T.shadow, position:'sticky', top:0, zIndex:10, padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', color:T.textDim, cursor:'pointer', fontFamily:T.sans, fontSize:'12px', padding:'4px 0' }}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Back
          </button>
          <div style={{ width:'1px', height:'16px', background:T.border }}/>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text, flex:1 }}>Shopping List</div>
          <span style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono }}>{total} item{total===1?'':'s'}</span>
        </div>
      </div>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'18px 14px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading…</div>
        ) : total === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>Nothing pending — all caught up.</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
              <button onClick={shareWhatsApp} style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:T.primary, border:'none', color:'#fff', fontSize:'13px', borderRadius:'8px', padding:'9px 16px', cursor:'pointer', fontFamily:T.sans, fontWeight:'700' }}>
                📲 Share via WhatsApp
              </button>
              <button onClick={()=>setShowDelivered(v=>!v)} style={{ background:T.controlBg, border:`1px solid ${T.border}`, color:T.textMid, fontSize:'12px', borderRadius:'8px', padding:'9px 14px', cursor:'pointer', fontFamily:T.sans }}>
                {showDelivered ? 'Hide delivered' : 'Show delivered'}
              </button>
            </div>

            {groups.map(g => (
              <div key={g.property.id} style={{ marginBottom:'18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <span style={{ fontSize:'18px' }}>{g.property.icon}</span>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:T.text, fontFamily:T.sans, flex:1 }}>{g.property.name}</span>
                  <span style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono }}>{g.items.length}</span>
                </div>
                {g.items.map(m => {
                  const st = MAT_STATUS[m.status||'needed'] || MAT_STATUS.needed;
                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'12px', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'8px', padding:'10px 14px', marginBottom:'4px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', color:T.text, fontFamily:T.sans }}>{m.name}</div>
                        {m.qty && <span style={{ fontSize:'11px', fontFamily:T.mono, color:T.textFaint }}>{m.qty} {m.unit||''}</span>}
                      </div>
                      <span style={{ fontSize:'10px', fontFamily:T.mono, color:st.color, background:`${st.color}20`, border:`1px solid ${st.color}40`, borderRadius:'4px', padding:'3px 8px' }}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

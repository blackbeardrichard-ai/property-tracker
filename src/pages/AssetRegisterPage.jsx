import { useState } from 'react';
import { useAssetRegister } from '../hooks/useAssetRegister';
import { T, S } from '../lib/theme';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const catIcon = c => c==='Vehicle'?'🚛':c==='Machinery'?'🚜':c==='Implement'?'🔧':c==='Equipment'?'⚙️':'🔩';

function daysLabel(d) {
  if (d == null) return '';
  if (d === 0) return 'today';
  if (d === 1) return '1 day';
  if (d < 30) return `${d} days`;
  if (d < 365) { const m = Math.round(d/30); return `${m} month${m>1?'s':''}`; }
  const y = Math.floor(d/365); const rem = Math.round((d%365)/30);
  return `${y}y${rem?` ${rem}m`:''}`;
}

function RegisterCard({ asset, propsById }) {
  const [open, setOpen] = useState(false);
  const cur = propsById[asset.current_property_id];
  const moves = asset._movements || [];

  return (
    <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', marginBottom:'10px', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'11px', padding:'13px 14px', cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ width:'40px', height:'40px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
          {catIcon(asset.category)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{asset.name}</div>
          <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap', alignItems:'center' }}>
            {(asset.make || asset.model) && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{asset.make} {asset.model}</span>}
            {asset.serial_number && <span style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono }}>SN: {asset.serial_number}</span>}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:'12px', fontWeight:'700', color:T.accent, fontFamily:T.sans }}>{cur ? `${cur.icon} ${cur.name}` : '—'}</div>
          {asset._daysHere != null && <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginTop:'2px' }}>here {daysLabel(asset._daysHere)}</div>}
        </div>
      </div>

      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${T.border}`, paddingTop:'12px' }}>
          {/* Identity */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
            {[
              ['Category', asset.category],
              ['Year', asset.year],
              ['Serial No.', asset.serial_number],
              ['Current location', cur ? `${cur.icon} ${cur.name}` : '—'],
            ].filter(([,v])=>v).map(([label,value])=>(
              <div key={label} style={{ background:T.controlBgFaint, borderRadius:'6px', padding:'8px 10px' }}>
                <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginBottom:'2px' }}>{label}</div>
                <div style={{ fontSize:'12px', color:T.textMid, fontFamily:T.sans }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Movement history */}
          <div style={{ fontSize:'10px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'10px' }}>MOVEMENT HISTORY</div>
          {moves.length === 0 ? (
            <div style={{ fontSize:'12px', color:T.textFaint, fontFamily:T.sans }}>
              No moves recorded — has been at {cur ? cur.name : 'its current property'} since registration.
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              {moves.map((m, i) => {
                const from = propsById[m.from_property];
                const to = propsById[m.to_property];
                return (
                  <div key={m.id} style={{ display:'flex', gap:'10px', marginBottom:i<moves.length-1?'12px':0 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:i===0?T.accent:T.textFaint, marginTop:'3px' }}/>
                      {i<moves.length-1 && <div style={{ width:'2px', flex:1, background:T.border, marginTop:'2px' }}/>}
                    </div>
                    <div style={{ flex:1, paddingBottom:'2px' }}>
                      <div style={{ fontSize:'12px', color:T.text, fontFamily:T.sans, fontWeight:'600' }}>
                        {from ? `${from.icon} ${from.name}` : 'Unknown'} <span style={{ color:T.textFaint }}>→</span> {to ? `${to.icon} ${to.name}` : 'Unknown'}
                      </div>
                      <div style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono, marginTop:'2px' }}>
                        {fmtDate(m.moved_date)}
                        {m.authoriser?.full_name && <span> · authorised by {m.authoriser.full_name}</span>}
                      </div>
                      {m.reason && <div style={{ fontSize:'11px', color:T.textMid, fontFamily:T.sans, marginTop:'2px', fontStyle:'italic' }}>“{m.reason}”</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssetRegisterPage({ onBack }) {
  const { assets, propsById, loading } = useAssetRegister(true);
  const [q, setQ] = useState('');

  const ql = q.trim().toLowerCase();
  const filtered = !ql ? assets : assets.filter(a =>
    [a.name, a.make, a.model, a.serial_number, a.category, propsById[a.current_property_id]?.name]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(ql))
  );

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, boxShadow:T.shadow, position:'sticky', top:0, zIndex:10, padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
          <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'4px', background:'none', border:'none', color:T.textDim, cursor:'pointer', fontFamily:T.sans, fontSize:'12px', padding:'4px 0' }}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Back
          </button>
          <div style={{ width:'1px', height:'16px', background:T.border }}/>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text }}>Asset Register</div>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, make, serial, location…" style={{ ...S.input, fontSize:'13px' }}/>
      </div>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'18px 14px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading register…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>
            {assets.length===0 ? 'No assets registered yet' : 'No assets match your search'}
          </div>
        ) : (
          <>
            <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono, marginBottom:'12px' }}>
              {filtered.length} asset{filtered.length===1?'':'s'} across all properties
            </div>
            {filtered.map(a => <RegisterCard key={a.id} asset={a} propsById={propsById}/>)}
          </>
        )}
      </div>
    </div>
  );
}

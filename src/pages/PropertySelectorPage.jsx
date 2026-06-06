import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../hooks/useProperties';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { T, S } from '../lib/theme';

const ICONS = ['🏠','🌾','🌿','🏡','🏗️','🏢','🌲','🏕️','🌴','🏔️'];

export default function PropertySelectorPage({ onSelect, onSettings }) {
  const { profile, isAdmin, signOut } = useAuth();
  const { properties, loading, addProperty } = useProperties();
  const { stats, totals, loading: statsLoading } = useDashboardStats(properties.map(p => p.id));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:'', type:'residential', icon:'🏠', address:'', description:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Property name is required.'); return; }
    setSaving(true); setError('');
    const { error: err } = await addProperty(form);
    if (err) { setError(err.message); setSaving(false); return; }
    setForm({ name:'', type:'residential', icon:'🏠', address:'', description:'' });
    setAdding(false); setSaving(false);
  };

  // Navigate into a property, optionally landing on a specific tab.
  // Backward-compatible: onSelect(prop) still works for callers that ignore the 2nd arg.
  const go = (prop, tab) => onSelect(prop, tab);

  const showSummary = !statsLoading && (totals.overdue > 0 || totals.pending > 0);

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'14px 20px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10, boxShadow:T.shadow }}>
        <div style={{ width:'36px', height:'36px', background:T.primary, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🏡</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text }}>Property Tracker</div>
          <div style={{ fontSize:'11px', color:T.textDim, fontFamily:T.mono, marginTop:'1px' }}>{profile?.full_name} · {profile?.role}</div>
        </div>
        <button onClick={onSettings} style={{ display:'flex', alignItems:'center', gap:'5px', background:'none', border:`1px solid ${T.border}`, color:T.textMid, borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.primary; e.currentTarget.style.color=T.primary; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMid; }}
        >⚙️ Settings</button>
        <button onClick={signOut} style={{ background:'none', border:`1px solid ${T.border}`, color:T.textMid, borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.red; e.currentTarget.style.color=T.red; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMid; }}
        >Sign out</button>
      </div>

      <div style={{ maxWidth:'640px', margin:'0 auto', padding:'28px 16px' }}>
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'22px', fontWeight:'700', color:T.text }}>Welcome back, {profile?.full_name?.split(' ')[0]}</div>
          <div style={{ fontSize:'13px', color:T.textDim, marginTop:'4px' }}>
            {loading ? 'Loading…' : `${properties.length} propert${properties.length===1?'y':'ies'} assigned to you`}
          </div>
        </div>

        {/* Overview summary bar — totals across all properties */}
        {showSummary && (
          <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
            {totals.overdue > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background:T.redFade, border:`1px solid ${T.red}40`, borderRadius:'10px', padding:'10px 14px' }}>
                <span style={{ fontSize:'18px', fontWeight:'700', color:T.red, fontFamily:T.mono }}>{totals.overdue}</span>
                <span style={{ fontSize:'12px', color:T.textMid }}>overdue service{totals.overdue===1?'':'s'}</span>
              </div>
            )}
            {totals.pending > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:'10px', padding:'10px 14px' }}>
                <span style={{ fontSize:'18px', fontWeight:'700', color:T.primary, fontFamily:T.mono }}>{totals.pending}</span>
                <span style={{ fontSize:'12px', color:T.textMid }}>pending material{totals.pending===1?'':'s'}</span>
              </div>
            )}
          </div>
        )}

        {/* Property list */}
        {properties.map(prop => {
          const st = stats[prop.id] || { overdue:0, pending:0 };
          return (
          <div key={prop.id}
            style={{ display:'flex', alignItems:'center', gap:'14px', width:'100%', background:T.surface, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'16px 18px', marginBottom:'10px', textAlign:'left', transition:'all 0.15s', boxShadow:T.shadow, cursor:'pointer' }}
            onClick={() => go(prop)}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.primary; e.currentTarget.style.boxShadow=`0 4px 20px ${T.primaryFade}`; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow=T.shadow; }}
          >
            <div style={{ width:'48px', height:'48px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0 }}>
              {prop.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'16px', fontWeight:'700', color:T.text }}>{prop.name}</div>
              <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:T.textDim, fontFamily:T.mono }}>
                  {prop.type === 'residential' ? '🏠 Residential' : '🌾 Commercial'}
                </span>
                {prop.address && <span style={{ fontSize:'11px', color:T.textFaint }}>{prop.address}</span>}
              </div>
              {/* Tappable stat badges */}
              {(st.overdue > 0 || st.pending > 0) && (
                <div style={{ display:'flex', gap:'6px', marginTop:'8px', flexWrap:'wrap' }}>
                  {st.overdue > 0 && (
                    <span role="button" tabIndex={0}
                      onClick={e=>{ e.stopPropagation(); go(prop, 'services'); }}
                      onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.stopPropagation(); e.preventDefault(); go(prop, 'services'); } }}
                      style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:T.redFade, border:`1px solid ${T.red}40`, color:T.red, borderRadius:'8px', padding:'3px 9px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=`${T.red}22`; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=T.redFade; }}
                    >
                      <span style={{ fontFamily:T.mono, fontWeight:'700' }}>{st.overdue}</span> overdue
                    </span>
                  )}
                  {st.pending > 0 && (
                    <span role="button" tabIndex={0}
                      onClick={e=>{ e.stopPropagation(); go(prop, 'shopping'); }}
                      onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.stopPropagation(); e.preventDefault(); go(prop, 'shopping'); } }}
                      style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, color:T.primary, borderRadius:'8px', padding:'3px 9px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=`${T.primary}22`; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=T.primaryFade; }}
                    >
                      <span style={{ fontFamily:T.mono, fontWeight:'700' }}>{st.pending}</span> pending
                    </span>
                  )}
                </div>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color:T.textDim, flexShrink:0 }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );})}

        {/* Add property */}
        {isAdmin && !adding && (
          <button onClick={() => setAdding(true)} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', background:'none', border:`2px dashed ${T.primaryBorder}`, color:T.primary, borderRadius:'12px', padding:'14px 18px', cursor:'pointer', fontSize:'14px', fontFamily:T.sans, fontWeight:'600', marginTop:'8px', transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.background=T.primaryFade; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='none'; }}
          >
            <span style={{ fontSize:'18px' }}>+</span> Add Property
          </button>
        )}

        {isAdmin && adding && (
          <div style={{ background:T.surface, border:`1px solid ${T.primaryBorder}`, borderRadius:'12px', padding:'20px', marginTop:'8px', boxShadow:T.shadow }}>
            <div style={{ ...S.mLabel, marginBottom:'16px' }}>ADD PROPERTY</div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>NAME *</div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Waterfall Farm" style={S.input}/>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>TYPE</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {['residential','commercial'].map(t=>(
                  <button key={t} onClick={()=>setForm(p=>({...p,type:t}))}
                    style={{ flex:1, background:form.type===t?T.primary:'none', border:`1px solid ${form.type===t?T.primary:T.border}`, color:form.type===t?'#fff':T.textMid, borderRadius:'8px', padding:'10px', cursor:'pointer', fontSize:'13px', fontFamily:T.sans, fontWeight:form.type===t?'700':'400', textTransform:'capitalize' }}>
                    {t === 'residential' ? '🏠 Residential' : '🌾 Commercial'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>ICON</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {ICONS.map(ic=>(
                  <button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))}
                    style={{ width:'42px', height:'42px', borderRadius:'8px', border:`2px solid ${form.icon===ic?T.primary:T.border}`, background:form.icon===ic?T.primaryFade:'none', cursor:'pointer', fontSize:'20px', transition:'all 0.15s' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'16px' }}>
              <div style={S.fieldLabel}>ADDRESS (optional)</div>
              <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="e.g. Alldays, Limpopo" style={S.input}/>
            </div>

            {error && <div style={{ color:T.red, fontSize:'13px', marginBottom:'12px', padding:'8px 12px', background:T.redFade, borderRadius:'6px' }}>{error}</div>}

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>{ setAdding(false); setError(''); }} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ ...S.btnPrimary, flex:2, opacity:saving?0.7:1 }}>
                {saving ? 'Creating…' : 'Create Property'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

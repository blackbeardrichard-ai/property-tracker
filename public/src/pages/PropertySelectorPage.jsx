import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../hooks/useProperties';
import { T, S } from '../lib/theme';

const ICONS = ['🏠','🌾','🌿','🏡','🏗️','🏢','🌲','🏕️','🌴','🏔️'];

export default function PropertySelectorPage({ onSelect }) {
  const { profile, isAdmin, signOut } = useAuth();
  const { properties, loading, addProperty } = useProperties();
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

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.sans }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:'rgba(15,20,18,0.95)', borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)', padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ width:'36px', height:'36px', background:T.primary, borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🏡</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'15px', fontWeight:'700', color:T.text }}>Property Tracker</div>
          <div style={{ fontSize:'11px', color:T.textDim, fontFamily:T.mono, marginTop:'1px' }}>
            {profile?.full_name} · {profile?.role}
          </div>
        </div>
        <button onClick={signOut} style={{ background:'none', border:`1px solid ${T.border}`, color:T.textDim, borderRadius:'7px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=T.red; e.currentTarget.style.color=T.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textDim; }}
        >Sign out</button>
      </div>

      <div style={{ maxWidth:'640px', margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'20px', fontWeight:'700', color:T.text }}>
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </div>
          <div style={{ fontSize:'13px', color:T.textDim, marginTop:'4px' }}>
            {loading ? 'Loading…' : `${properties.length} propert${properties.length===1?'y':'ies'} assigned to you`}
          </div>
        </div>

        {/* Property list */}
        {properties.map(prop => (
          <button key={prop.id} onClick={() => onSelect(prop)}
            style={{ display:'flex', alignItems:'center', gap:'14px', width:'100%', background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'16px 18px', cursor:'pointer', marginBottom:'10px', textAlign:'left', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.primary; e.currentTarget.style.background=T.primaryFade; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.surface2; }}
          >
            <div style={{ width:'44px', height:'44px', background:T.primaryLight, border:`1px solid ${T.primaryBorder}`, borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
              {prop.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'16px', fontWeight:'700', color:T.text }}>{prop.name}</div>
              <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'11px', color:T.textDim, fontFamily:T.mono }}>
                  {prop.type === 'residential' ? '🏠 Residential' : '🌾 Commercial'}
                </span>
                {prop.address && <span style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.sans }}>{prop.address}</span>}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color:T.textDim, flexShrink:0 }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}

        {/* Add property — admin only */}
        {isAdmin && !adding && (
          <button onClick={() => setAdding(true)} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', background:T.primaryFade, border:`1px dashed ${T.primary}`, color:T.accent, borderRadius:'12px', padding:'14px 18px', cursor:'pointer', fontSize:'14px', fontFamily:T.sans, fontWeight:'600', marginTop:'8px' }}>
            + Add Property
          </button>
        )}

        {isAdmin && adding && (
          <div style={{ background:T.surface2, border:`1px solid ${T.primaryBorder}`, borderRadius:'12px', padding:'20px', marginTop:'8px' }}>
            <div style={{ ...S.mLabel, marginBottom:'16px' }}>ADD PROPERTY</div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>NAME *</div>
              <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Waterfall Farm" style={S.input}/>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>TYPE</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {['residential','commercial'].map(t => (
                  <button key={t} onClick={() => setForm(p=>({...p,type:t}))}
                    style={{ flex:1, background:form.type===t?T.primary:T.surface2, border:`1px solid ${form.type===t?T.primary:T.border}`, color:form.type===t?T.text:T.textMid, borderRadius:'8px', padding:'10px', cursor:'pointer', fontSize:'13px', fontFamily:T.sans, fontWeight:form.type===t?'700':'400', textTransform:'capitalize' }}>
                    {t === 'residential' ? '🏠 Residential' : '🌾 Commercial'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>ICON</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(p=>({...p,icon:ic}))}
                    style={{ width:'42px', height:'42px', borderRadius:'8px', border:`2px solid ${form.icon===ic?T.primary:T.border}`, background:form.icon===ic?T.primaryFade:'transparent', cursor:'pointer', fontSize:'20px' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'12px' }}>
              <div style={S.fieldLabel}>ADDRESS (optional)</div>
              <input value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} placeholder="e.g. Alldays, Limpopo" style={S.input}/>
            </div>

            {error && <div style={{ color:T.red, fontSize:'13px', marginBottom:'12px', padding:'8px 12px', background:T.redFade, borderRadius:'6px' }}>{error}</div>}

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => { setAdding(false); setError(''); }} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
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

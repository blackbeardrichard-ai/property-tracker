import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../hooks/useAssets';
import { T, S } from '../lib/theme';

const CATEGORIES = ['Machinery', 'Vehicle', 'Implement', 'Equipment', 'Tool', 'Other'];
const CONDITIONS = [
  { value: 'good',            label: 'Good',            color: '#95D5B2' },
  { value: 'fair',            label: 'Fair',            color: '#e8c44a' },
  { value: 'needs_attention', label: 'Needs Attention', color: '#e07070' },
  { value: 'out_of_service',  label: 'Out of Service',  color: '#666' },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtCurrency = v => v ? `R ${parseFloat(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—';

const Ic = {
  plus:    (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevron: (open) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{transform:open?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="8" r="1.4" fill="currentColor"/></svg>,
  trash:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M2 3l1 8h7l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  pencil:  () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  move:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12M4 4l3-3 3 3M4 10l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  wrench:  () => <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M14.5 3a3.5 3.5 0 00-3.45 4.1L4 14.2 5.8 16l7.1-7.05A3.5 3.5 0 1014.5 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function ConditionBadge({ condition }) {
  const c = CONDITIONS.find(x => x.value === condition) || CONDITIONS[0];
  return (
    <span style={{ fontSize:'10px', fontFamily:T.mono, color:c.color, background:`${c.color}20`, borderRadius:'4px', padding:'2px 7px' }}>
      {c.label}
    </span>
  );
}

function DotsMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:'relative', flexShrink:0 }} onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();setOpen(!open);}} style={{ background:open?T.primaryFade:'none', border:open?`1px solid ${T.primaryBorder}`:'1px solid transparent', cursor:'pointer', color:open?T.accent:T.textDim, borderRadius:'6px', display:'flex', alignItems:'center', padding:'4px 6px' }}>
        <Ic.dots/>
      </button>
      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:140 }} onClick={()=>setOpen(false)}/>
          <div style={{ position:'absolute', right:0, top:'calc(100% + 5px)', zIndex:150, background:'#1e2b27', border:`1px solid ${T.borderLight}`, borderRadius:T.radius, padding:'6px', minWidth:'170px', boxShadow:T.shadow }}>
            {items.map((item,i) => item==='divider'
              ? <div key={i} style={{ height:'1px', background:T.border, margin:'4px 0' }}/>
              : <button key={i} onClick={()=>{item.action();setOpen(false);}} style={{ display:'flex', alignItems:'center', gap:'9px', width:'100%', background:'none', border:'none', color:item.danger?T.red:T.textMid, padding:'10px 13px', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontFamily:T.sans, textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background=item.danger?T.redFade:T.primaryFade}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >{item.icon} {item.label}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Add Asset Modal ───────────────────────────────────────────────
function AddAssetModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name:'', category:'Machinery', make:'', model:'', serial_number:'',
    year:'', purchase_date:'', purchase_price:'', condition:'good', notes:''
  });
  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const fld = (label, child) => (
    <div style={{ marginBottom:'12px' }}>
      <div style={S.fieldLabel}>{label}</div>
      {child}
    </div>
  );
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.card, maxHeight:'90vh' }} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>ADD ASSET</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        {fld('ASSET NAME *', <input autoFocus value={form.name} onChange={f('name')} placeholder="e.g. John Deere Tractor" style={S.input}/>)}
        {fld('CATEGORY', <select value={form.category} onChange={f('category')} style={{ ...S.input, appearance:'none', colorScheme:'dark', cursor:'pointer' }}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>)}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('MAKE', <input value={form.make} onChange={f('make')} placeholder="e.g. John Deere" style={S.input}/>)}</div>
          <div>{fld('MODEL', <input value={form.model} onChange={f('model')} placeholder="e.g. 5075E" style={S.input}/>)}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('SERIAL NUMBER', <input value={form.serial_number} onChange={f('serial_number')} placeholder="e.g. 1RW5075E..." style={S.input}/>)}</div>
          <div>{fld('YEAR', <input value={form.year} onChange={f('year')} type="number" min="1900" max="2099" placeholder="e.g. 2020" style={S.input}/>)}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('PURCHASE DATE', <input value={form.purchase_date} onChange={f('purchase_date')} type="date" style={{ ...S.input, colorScheme:'dark' }}/>)}</div>
          <div>{fld('PURCHASE PRICE (R)', <input value={form.purchase_price} onChange={f('purchase_price')} type="number" min="0" step="0.01" placeholder="e.g. 450000" style={S.input}/>)}</div>
        </div>
        {fld('CONDITION', <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {CONDITIONS.map(c=><button key={c.value} onClick={()=>setForm(p=>({...p,condition:c.value}))} style={{ background:form.condition===c.value?`${c.color}30`:'rgba(255,255,255,0.05)', border:`1px solid ${form.condition===c.value?c.color:T.border}`, color:form.condition===c.value?c.color:T.textMid, borderRadius:'5px', padding:'5px 10px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans }}>{c.label}</button>)}
        </div>)}
        {fld('NOTES (optional)', <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Any additional details…" style={{ ...S.input, resize:'none' }}/>)}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
          <button onClick={()=>{ if(!form.name.trim())return; onSave(form); onClose(); }} style={{ ...S.btnPrimary, flex:2 }}>Add Asset</button>
        </div>
      </div>
    </div>
  );
}

// ── Service Log Modal ─────────────────────────────────────────────
function AssetServiceModal({ asset, onSave, onClose }) {
  const [form, setForm] = useState({
    doneDate: new Date().toISOString().split('T')[0],
    description:'', company:'', invoiceNumber:'', invoiceAmount:'', nextService:'',
    condition: asset.condition || 'good'
  });
  const f = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const fld = (label, child) => <div style={{ marginBottom:'12px' }}><div style={S.fieldLabel}>{label}</div>{child}</div>;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.card, maxHeight:'90vh' }} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>LOG SERVICE — {asset.name}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        {fld('DATE SERVICED *', <input type="date" value={form.doneDate} onChange={f('doneDate')} style={{ ...S.input, colorScheme:'dark' }}/>)}
        {fld('DESCRIPTION *', <input value={form.description} onChange={f('description')} placeholder="e.g. 500hr service, oil and filters changed" style={S.input}/>)}
        {fld('COMPANY / TECHNICIAN', <input value={form.company} onChange={f('company')} placeholder="e.g. Deere & Co Service Centre" style={S.input}/>)}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('INVOICE NUMBER', <input value={form.invoiceNumber} onChange={f('invoiceNumber')} placeholder="e.g. INV-001" style={S.input}/>)}</div>
          <div>{fld('INVOICE AMOUNT (R)', <input value={form.invoiceAmount} onChange={f('invoiceAmount')} type="number" min="0" step="0.01" placeholder="e.g. 12500" style={S.input}/>)}</div>
        </div>
        {fld('NEXT SERVICE DATE', <input type="date" value={form.nextService} onChange={f('nextService')} style={{ ...S.input, colorScheme:'dark' }}/>)}
        {fld('CONDITION AFTER SERVICE', <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {CONDITIONS.map(c=><button key={c.value} onClick={()=>setForm(p=>({...p,condition:c.value}))} style={{ background:form.condition===c.value?`${c.color}30`:'rgba(255,255,255,0.05)', border:`1px solid ${form.condition===c.value?c.color:T.border}`, color:form.condition===c.value?c.color:T.textMid, borderRadius:'5px', padding:'5px 10px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans }}>{c.label}</button>)}
        </div>)}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
          <button onClick={()=>{ if(!form.description.trim())return; onSave(form); onClose(); }} style={{ ...S.btnPrimary, flex:2 }}>Log Service</button>
        </div>
      </div>
    </div>
  );
}

// ── Move Asset Modal ──────────────────────────────────────────────
function MoveAssetModal({ asset, properties, currentPropertyId, onSave, onClose }) {
  const [toPropertyId, setToPropertyId] = useState('');
  const [reason, setReason] = useState('');
  const otherProperties = properties.filter(p => p.id !== currentPropertyId && p.type === 'commercial');
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>MOVE ASSET — {asset.name}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <div style={{ marginBottom:'12px' }}>
          <div style={S.fieldLabel}>MOVE TO PROPERTY</div>
          <select value={toPropertyId} onChange={e=>setToPropertyId(e.target.value)} style={{ ...S.input, appearance:'none', colorScheme:'dark', cursor:'pointer' }}>
            <option value="">— Select property —</option>
            {otherProperties.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:'20px' }}>
          <div style={S.fieldLabel}>REASON (optional)</div>
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Needed for ploughing season" style={S.input}/>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
          <button onClick={()=>{ if(!toPropertyId)return; onSave(toPropertyId, reason); onClose(); }} style={{ ...S.btnPrimary, flex:2 }}>Move Asset</button>
        </div>
      </div>
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────
function AssetCard({ asset, properties, propertyId, canManage, canDelete, onUpdate, onDelete, onMove, onLogService }) {
  const [expanded, setExpanded] = useState(false);
  const [showService, setShowService] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const logs = asset.asset_service_logs || [];

  return (
    <>
      {showService && <AssetServiceModal asset={asset} onSave={data=>onLogService(asset.id,data)} onClose={()=>setShowService(false)}/>}
      {showMove && <MoveAssetModal asset={asset} properties={properties} currentPropertyId={propertyId} onSave={(to,reason)=>onMove(asset.id,to,reason)} onClose={()=>setShowMove(false)}/>}
      {confirming && (
        <div style={S.overlay} onClick={()=>setConfirming(false)}>
          <div style={{ ...S.card, maxWidth:'300px', textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:'28px', marginBottom:'10px' }}>🗑️</div>
            <div style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans, marginBottom:'20px' }}>Delete "{asset.name}"?</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>setConfirming(false)} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
              <button onClick={()=>{onDelete(asset.id);setConfirming(false);}} style={{ flex:2, background:T.red, border:'none', color:'#fff', fontWeight:'700', borderRadius:'8px', padding:'11px', cursor:'pointer', fontSize:'13px', fontFamily:T.sans }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'12px', marginBottom:'10px', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'13px 14px', cursor:'pointer' }} onClick={()=>setExpanded(!expanded)}>
          <div style={{ width:'40px', height:'40px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
            {asset.category==='Vehicle'?'🚛':asset.category==='Machinery'?'🚜':asset.category==='Implement'?'🔧':asset.category==='Equipment'?'⚙️':'🔩'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{asset.name}</div>
            <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{asset.category}</span>
              {asset.make && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{asset.make} {asset.model}</span>}
              {asset.year && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{asset.year}</span>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0 }}>
            <ConditionBadge condition={asset.condition}/>
          </div>
          {canManage && <DotsMenu items={[
            { icon:<Ic.wrench/>, label:'Log Service', action:()=>setShowService(true) },
            { icon:<Ic.move/>, label:'Move to Property', action:()=>setShowMove(true) },
            ...(canDelete ? ['divider', { icon:<Ic.trash/>, label:'Delete Asset', danger:true, action:()=>setConfirming(true) }] : []),
          ]}/>}
          <div style={{ color:T.textDim }}>{Ic.chevron(expanded)}</div>
        </div>

        {expanded && (
          <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${T.border}`, paddingTop:'12px' }}>
            {/* Asset details */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                ['Serial No.', asset.serial_number],
                ['Purchase Date', fmtDate(asset.purchase_date)],
                ['Purchase Price', fmtCurrency(asset.purchase_price)],
                ['Notes', asset.notes],
              ].filter(([,v])=>v).map(([label,value])=>(
                <div key={label} style={{ background:'rgba(0,0,0,0.15)', borderRadius:'6px', padding:'8px 10px' }}>
                  <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginBottom:'2px' }}>{label}</div>
                  <div style={{ fontSize:'12px', color:T.textMid, fontFamily:T.sans }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Service history */}
            {logs.length > 0 && (
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'8px' }}>SERVICE HISTORY</div>
                {logs.slice(0,3).map(log => (
                  <div key={log.id} style={{ display:'flex', gap:'10px', padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:'12px' }}>
                    <span style={{ color:T.accent, fontFamily:T.mono, flexShrink:0 }}>{fmtDate(log.done_date)}</span>
                    <span style={{ color:T.textMid, fontFamily:T.sans, flex:1 }}>{log.description}</span>
                    {log.invoice_amount && <span style={{ color:T.textFaint, fontFamily:T.mono }}>{fmtCurrency(log.invoice_amount)}</span>}
                  </div>
                ))}
              </div>
            )}

            <button onClick={()=>setShowService(true)} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, color:T.accent, fontSize:'12px', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontFamily:T.sans, fontWeight:'600' }}>
              <Ic.wrench/> Log Service
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main AssetsTab ────────────────────────────────────────────────
export default function AssetsTab({ property, properties }) {
  const { canManage, isAdmin, canDelete } = useAuth();
  const { assets, loading, addAsset, updateAsset, deleteAsset, moveAsset, logAssetService } = useAssets(property.id);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');

  const categories = ['all', ...new Set(assets.map(a=>a.category))];
  const filtered = filter==='all' ? assets : assets.filter(a=>a.category===filter);

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading assets…</div>;

  return (
    <div>
      {adding && <AddAssetModal onSave={data=>addAsset(data)} onClose={()=>setAdding(false)}/>}

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginBottom:'16px' }}>
        {[
          { label:'Total Assets', value:assets.length, color:T.accent },
          { label:'Good Condition', value:assets.filter(a=>a.condition==='good').length, color:'#95D5B2' },
          { label:'Needs Attention', value:assets.filter(a=>a.condition==='needs_attention'||a.condition==='out_of_service').length, color:T.red },
        ].map(s=>(
          <div key={s.label} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontSize:'22px', fontWeight:'700', color:s.color, fontFamily:T.sans }}>{s.value}</div>
            <div style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono, marginTop:'2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div style={{ display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap' }}>
          {categories.map(c=>(
            <button key={c} onClick={()=>setFilter(c)} style={{ background:filter===c?T.primary:'rgba(255,255,255,0.05)', border:'none', color:filter===c?T.text:T.textDim, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, textTransform:'capitalize', fontWeight:filter===c?'700':'400' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Asset list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>
          {assets.length===0 ? 'No assets registered yet' : 'No assets in this category'}
        </div>
      ) : filtered.map(asset => (
        <AssetCard key={asset.id} asset={asset} properties={properties} propertyId={property.id}
          canManage={canManage||isAdmin} canDelete={canDelete||isAdmin}
          onUpdate={updateAsset} onDelete={deleteAsset}
          onMove={moveAsset} onLogService={logAssetService}
        />
      ))}

      {/* Add asset button */}
      {(canManage||isAdmin) && (
        <button onClick={()=>setAdding(true)} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'none', border:`1px dashed ${T.primary}`, color:T.accent, fontSize:'12px', borderRadius:'6px', padding:'6px 14px', cursor:'pointer', fontFamily:T.sans, marginTop:'10px', fontWeight:'600' }}>
          {Ic.plus(11)} Add Asset
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLivestock } from '../hooks/useLivestock';
import { T, S } from '../lib/theme';

const SPECIES = ['Cattle', 'Game', 'Sheep', 'Goat', 'Pig', 'Horse', 'Donkey', 'Other'];
const EVENT_TYPES = [
  { value:'birth',     label:'Birth',           icon:'🐣', color:'#95D5B2' },
  { value:'death',     label:'Death',           icon:'💀', color:'#e07070' },
  { value:'treatment', label:'Vet Treatment',   icon:'💉', color:'#e8c44a' },
  { value:'movement',  label:'Movement',        icon:'🚛', color:'#95D5B2' },
  { value:'sale',      label:'Sale',            icon:'💰', color:'#e8c44a' },
  { value:'pregnancy', label:'Pregnancy',       icon:'🤰', color:'#95D5B2' },
  { value:'calving',   label:'Calving',         icon:'🐄', color:'#95D5B2' },
  { value:'other',     label:'Other',           icon:'📝', color:T.textDim  },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const Ic = {
  plus:    (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevron: (open) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{transform:open?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="8" r="1.4" fill="currentColor"/></svg>,
  trash:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M2 3l1 8h7l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

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
          <div style={{ position:'absolute', right:0, top:'calc(100% + 5px)', zIndex:150, background:T.popoverBg, border:`1px solid ${T.borderLight}`, borderRadius:T.radius, padding:'6px', minWidth:'170px', boxShadow:T.shadow }}>
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

// ── Add Animal Modal ──────────────────────────────────────────────
function AddAnimalModal({ animals, onSave, onClose }) {
  const [form, setForm] = useState({
    species:'Cattle', breed:'', tag_number:'', name:'',
    gender:'female', dob:'', mother_id:'', purchase_date:'',
    purchase_price:'', notes:''
  });
  const f = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const fld = (label, child) => <div style={{ marginBottom:'12px' }}><div style={S.fieldLabel}>{label}</div>{child}</div>;

  const females = animals.filter(a=>a.gender==='female'&&a.status==='alive'&&a.species===form.species);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.card, maxHeight:'90vh' }} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>ADD ANIMAL</span><button onClick={onClose} style={S.closeBtn}>×</button></div>

        {fld('SPECIES', <select value={form.species} onChange={f('species')} style={{ ...S.input, appearance:'none', cursor:'pointer' }}>
          {SPECIES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>)}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('TAG NUMBER', <input value={form.tag_number} onChange={f('tag_number')} placeholder="e.g. T001" style={S.input}/>)}</div>
          <div>{fld('NAME (optional)', <input value={form.name} onChange={f('name')} placeholder="e.g. Daisy" style={S.input}/>)}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>
            {fld('GENDER', <div style={{ display:'flex', gap:'6px' }}>
              {['male','female','unknown'].map(g=>(
                <button key={g} onClick={()=>setForm(p=>({...p,gender:g}))} style={{ flex:1, background:form.gender===g?T.primary:T.controlBg, border:'none', color:form.gender===g?T.text:T.textMid, borderRadius:'5px', padding:'7px 4px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, textTransform:'capitalize' }}>{g}</button>
              ))}
            </div>)}
          </div>
          <div>{fld('BREED (optional)', <input value={form.breed} onChange={f('breed')} placeholder="e.g. Brahman" style={S.input}/>)}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('DATE OF BIRTH', <input type="date" value={form.dob} onChange={f('dob')} style={{ ...S.input }}/>)}</div>
          <div>{fld('MOTHER (optional)', <select value={form.mother_id} onChange={f('mother_id')} style={{ ...S.input, appearance:'none', cursor:'pointer' }}>
            <option value="">— None —</option>
            {females.map(a=><option key={a.id} value={a.id}>{a.tag_number||a.name}</option>)}
          </select>)}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div>{fld('PURCHASE DATE', <input type="date" value={form.purchase_date} onChange={f('purchase_date')} style={{ ...S.input }}/>)}</div>
          <div>{fld('PURCHASE PRICE (R)', <input type="number" value={form.purchase_price} onChange={f('purchase_price')} min="0" step="0.01" placeholder="e.g. 8500" style={S.input}/>)}</div>
        </div>

        {fld('NOTES (optional)', <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Any additional details…" style={{ ...S.input, resize:'none' }}/>)}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
          <button onClick={()=>{ if(!form.species)return; onSave({ ...form, mother_id:form.mother_id||null, dob:form.dob||null, purchase_date:form.purchase_date||null, purchase_price:form.purchase_price||null, status:'alive' }); onClose(); }} style={{ ...S.btnPrimary, flex:2 }}>Add Animal</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Event Modal ───────────────────────────────────────────────
function AddEventModal({ animal, onSave, onClose }) {
  const [form, setForm] = useState({
    eventType:'treatment', eventDate:new Date().toISOString().split('T')[0],
    description:'', company:'', cost:'', photoUrl:''
  });
  const f = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const fld = (label, child) => <div style={{ marginBottom:'12px' }}><div style={S.fieldLabel}>{label}</div>{child}</div>;
  const eventInfo = EVENT_TYPES.find(e=>e.value===form.eventType);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.card, maxHeight:'90vh' }} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>LOG EVENT — {animal.tag_number||animal.name}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>

        {fld('EVENT TYPE', <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {EVENT_TYPES.map(et=>(
            <button key={et.value} onClick={()=>setForm(p=>({...p,eventType:et.value}))} style={{ background:form.eventType===et.value?`${et.color}25`:T.controlBg, border:`1px solid ${form.eventType===et.value?et.color:T.border}`, color:form.eventType===et.value?et.color:T.textMid, borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontSize:'12px', fontFamily:T.sans }}>
              {et.icon} {et.label}
            </button>
          ))}
        </div>)}

        {fld('DATE', <input type="date" value={form.eventDate} onChange={f('eventDate')} style={{ ...S.input }}/>)}
        {fld('DESCRIPTION', <textarea value={form.description} onChange={f('description')} rows={2} placeholder={
          form.eventType==='death'?'Cause of death, circumstances…':
          form.eventType==='treatment'?'Treatment given, medication, dosage…':
          form.eventType==='sale'?'Buyer name, sale conditions…':
          'Details of the event…'
        } style={{ ...S.input, resize:'none' }}/>)}

        {['treatment','death','sale'].includes(form.eventType) && fld('COMPANY / VET / BUYER', <input value={form.company} onChange={f('company')} placeholder="e.g. Dr. Smith Veterinary" style={S.input}/>)}
        {['treatment','sale'].includes(form.eventType) && fld('COST / AMOUNT (R)', <input type="number" value={form.cost} onChange={f('cost')} min="0" step="0.01" placeholder="e.g. 450" style={S.input}/>)}

        {form.eventType === 'death' && (
          <div style={{ background:T.redFade, border:`1px solid ${T.red}`, borderRadius:'8px', padding:'10px 12px', marginBottom:'12px' }}>
            <div style={{ fontSize:'12px', color:T.red, fontFamily:T.sans }}>
              ⚠️ This will mark the animal as deceased. Photo evidence is recommended — attach a photo to the description or note the reference.
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
          <button onClick={()=>{ onSave(form); onClose(); }} style={{ ...S.btnPrimary, flex:2, background:form.eventType==='death'?T.red:T.primary }}>
            Log {eventInfo?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Animal Card ───────────────────────────────────────────────────
function AnimalCard({ animal, allAnimals, canManage, canDelete, onAddEvent, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const events = animal.livestock_events || [];
  const isDeceased = animal.status === 'deceased';
  const isSold = animal.status === 'sold';

  const statusColor = isDeceased?T.red:isSold?T.warn:T.accent;
  const statusLabel = isDeceased?'Deceased':isSold?'Sold':'Alive';

  return (
    <>
      {showEvent && <AddEventModal animal={animal} onSave={data=>onAddEvent(animal.id,data)} onClose={()=>setShowEvent(false)}/>}
      {confirming && (
        <div style={S.overlay} onClick={()=>setConfirming(false)}>
          <div style={{ ...S.card, maxWidth:'300px', textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:'28px', marginBottom:'10px' }}>🗑️</div>
            <div style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans, marginBottom:'20px' }}>Delete {animal.tag_number||animal.name}?</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={()=>setConfirming(false)} style={{ ...S.btnGhost, flex:1 }}>Cancel</button>
              <button onClick={()=>{onDelete(animal.id);setConfirming(false);}} style={{ flex:2, background:T.red, border:'none', color:'#fff', fontWeight:'700', borderRadius:'8px', padding:'11px', cursor:'pointer', fontSize:'13px', fontFamily:T.sans }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:T.surface2, border:`1px solid ${isDeceased?T.red:T.border}`, borderRadius:'12px', marginBottom:'8px', overflow:'hidden', opacity:isDeceased?0.7:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', cursor:'pointer' }} onClick={()=>setExpanded(!expanded)}>
          <div style={{ fontSize:'24px', flexShrink:0 }}>
            {animal.species==='Cattle'?'🐄':animal.species==='Game'?'🦌':animal.species==='Sheep'?'🐑':animal.species==='Goat'?'🐐':animal.species==='Horse'?'🐴':'🐾'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'14px', fontWeight:'700', color:T.text, fontFamily:T.sans }}>
                {animal.tag_number && <span style={{ fontFamily:T.mono, fontSize:'12px', color:T.accent, marginRight:'6px' }}>{animal.tag_number}</span>}
                {animal.name || animal.species}
              </span>
              <span style={{ fontSize:'10px', fontFamily:T.mono, color:statusColor, background:`${statusColor}18`, borderRadius:'4px', padding:'2px 6px' }}>{statusLabel}</span>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap' }}>
              {animal.breed && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{animal.breed}</span>}
              <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono, textTransform:'capitalize' }}>{animal.gender}</span>
              {animal.dob && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>Born: {fmtDate(animal.dob)}</span>}
              {animal.mother && <span style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>Mother: {animal.mother.tag_number||animal.mother.name}</span>}
            </div>
          </div>
          <div style={{ display:'flex', align:'center', gap:'8px', flexShrink:0 }}>
            {events.length>0 && <span style={{ fontSize:'10px', fontFamily:T.mono, color:T.textDim, background:T.surface2, borderRadius:'4px', padding:'2px 6px' }}>{events.length} events</span>}
            {canManage && <DotsMenu items={[
              { icon:'📝', label:'Log Event', action:()=>setShowEvent(true) },
              ...(canDelete?['divider',{ icon:<Ic.trash/>, label:'Delete', danger:true, action:()=>setConfirming(true) }]:[]),
            ]}/>}
            {Ic.chevron(expanded)}
          </div>
        </div>

        {expanded && (
          <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${T.border}`, paddingTop:'12px' }}>
            {/* Details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
              {[
                ['Species', animal.species],
                ['Purchase Date', fmtDate(animal.purchase_date)],
                ['Purchase Price', animal.purchase_price?`R ${parseFloat(animal.purchase_price).toLocaleString('en-ZA')}`:null],
                ['Notes', animal.notes],
              ].filter(([,v])=>v).map(([label,value])=>(
                <div key={label} style={{ background:'rgba(0,0,0,0.15)', borderRadius:'6px', padding:'8px 10px' }}>
                  <div style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono, marginBottom:'2px' }}>{label}</div>
                  <div style={{ fontSize:'12px', color:T.textMid, fontFamily:T.sans }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Event history */}
            {events.length > 0 && (
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', fontFamily:T.mono, color:T.accent, letterSpacing:'0.08em', marginBottom:'8px' }}>EVENT HISTORY</div>
                {events.sort((a,b)=>new Date(b.event_date)-new Date(a.event_date)).slice(0,5).map(ev => {
                  const et = EVENT_TYPES.find(e=>e.value===ev.event_type);
                  return (
                    <div key={ev.id} style={{ display:'flex', gap:'10px', padding:'6px 0', borderBottom:`1px solid ${T.border}`, alignItems:'flex-start' }}>
                      <span style={{ fontSize:'14px', flexShrink:0 }}>{et?.icon||'📝'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'11px', fontWeight:'600', color:et?.color||T.textMid, fontFamily:T.sans }}>{et?.label||ev.event_type}</span>
                          <span style={{ fontSize:'10px', color:T.textFaint, fontFamily:T.mono }}>{fmtDate(ev.event_date)}</span>
                        </div>
                        {ev.description && <div style={{ fontSize:'12px', color:T.textDim, fontFamily:T.sans, marginTop:'2px' }}>{ev.description}</div>}
                        {ev.company && <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono, marginTop:'2px' }}>{ev.company}</div>}
                        {ev.cost && <div style={{ fontSize:'11px', color:T.textFaint, fontFamily:T.mono }}>R {parseFloat(ev.cost).toLocaleString('en-ZA')}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canManage && !isDeceased && !isSold && (
              <button onClick={()=>setShowEvent(true)} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, color:T.accent, fontSize:'12px', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontFamily:T.sans, fontWeight:'600' }}>
                📝 Log Event
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main LivestockTab ─────────────────────────────────────────────
export default function LivestockTab({ property }) {
  const { canManage, isAdmin, canDelete } = useAuth();
  const { animals, loading, addAnimal, deleteAnimal, addEvent } = useLivestock(property.id);
  const [adding, setAdding] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('alive');

  const species = ['all', ...new Set(animals.map(a=>a.species))];
  const filtered = animals
    .filter(a => speciesFilter==='all' || a.species===speciesFilter)
    .filter(a => statusFilter==='all' || a.status===statusFilter);

  // Herd summary
  const alive = animals.filter(a=>a.status==='alive');
  const speciesSummary = SPECIES.map(s=>({ species:s, count:alive.filter(a=>a.species===s).length })).filter(s=>s.count>0);

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:T.textDim, fontFamily:T.mono, fontSize:'13px' }}>Loading livestock…</div>;

  return (
    <div>
      {adding && <AddAnimalModal animals={animals} onSave={data=>addAnimal(data)} onClose={()=>setAdding(false)}/>}

      {/* Herd summary */}
      {speciesSummary.length > 0 && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {speciesSummary.map(s=>(
            <div key={s.species} style={{ background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:'8px', padding:'10px 14px', textAlign:'center', minWidth:'80px' }}>
              <div style={{ fontSize:'20px', marginBottom:'4px' }}>
                {s.species==='Cattle'?'🐄':s.species==='Game'?'🦌':s.species==='Sheep'?'🐑':s.species==='Goat'?'🐐':s.species==='Horse'?'🐴':'🐾'}
              </div>
              <div style={{ fontSize:'18px', fontWeight:'700', color:T.accent, fontFamily:T.sans }}>{s.count}</div>
              <div style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>{s.species}</div>
            </div>
          ))}
          <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:'8px', padding:'10px 14px', textAlign:'center', minWidth:'80px' }}>
            <div style={{ fontSize:'20px', marginBottom:'4px' }}>📊</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:T.text, fontFamily:T.sans }}>{alive.length}</div>
            <div style={{ fontSize:'10px', color:T.textDim, fontFamily:T.mono }}>Total Alive</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
        {['alive','deceased','sold','all'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} style={{ background:statusFilter===s?T.primary:T.controlBg, border:'none', color:statusFilter===s?T.text:T.textDim, borderRadius:'5px', padding:'5px 12px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, textTransform:'capitalize', fontWeight:statusFilter===s?'700':'400' }}>{s}</button>
        ))}
      </div>
      {species.length > 2 && (
        <div style={{ display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap' }}>
          {species.map(s=>(
            <button key={s} onClick={()=>setSpeciesFilter(s)} style={{ background:speciesFilter===s?T.primaryFade:T.controlBgFaint, border:`1px solid ${speciesFilter===s?T.primaryBorder:T.border}`, color:speciesFilter===s?T.accent:T.textDim, borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontFamily:T.sans, textTransform:'capitalize' }}>{s}</button>
          ))}
        </div>
      )}

      {/* Animal list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:T.textFaint, fontFamily:T.mono, fontSize:'13px' }}>
          {animals.length===0?'No animals registered yet':'No animals match this filter'}
        </div>
      ) : filtered.map(animal=>(
        <AnimalCard key={animal.id} animal={animal} allAnimals={animals}
          canManage={canManage||isAdmin} canDelete={canDelete||isAdmin}
          onAddEvent={addEvent} onDelete={deleteAnimal}
        />
      ))}

      {/* Add animal */}
      {(canManage||isAdmin) && (
        <button onClick={()=>setAdding(true)} style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'none', border:`1px dashed ${T.primary}`, color:T.accent, fontSize:'12px', borderRadius:'6px', padding:'6px 14px', cursor:'pointer', fontFamily:T.sans, marginTop:'10px', fontWeight:'600' }}>
          {Ic.plus(11)} Add Animal
        </button>
      )}
    </div>
  );
}

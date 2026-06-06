import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useServices } from '../hooks/useServices';
import { useRooms } from '../hooks/useRooms';
import { T, S } from '../lib/theme';
import AssetsTab from './AssetsTab';

// ── Icons ────────────────────────────────────────────────────────
const Ic = {
  back:    () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:    (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  check:   () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevron: (open) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.2s",flexShrink:0}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="8" r="1.4" fill="currentColor"/></svg>,
  pencil:  () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M2 3l1 8h7l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  up:      () => <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  down:    () => <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  tool:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="10" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="12" height="2" rx="1" fill="currentColor"/></svg>,
  wrench:  () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M14.5 3a3.5 3.5 0 00-3.45 4.1L4 14.2 5.8 16l7.1-7.05A3.5 3.5 0 1014.5 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cart:    () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M1 1h2l2.5 10h10l2-7H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/></svg>,
  home:    () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 10L10 2l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="10" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  bell:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1a4 4 0 014 4v3l1 2H2l1-2V5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  note:    () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4h8M3 7h8M3 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  cal:     () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h12M4 1v2M10 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

const daysUntil = d => d ? Math.round((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const genId = () => Math.random().toString(36).substr(2,9);

// ── Shared small components ───────────────────────────────────────
function ConfirmDelete({ label, onConfirm, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxWidth:'300px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{...S.closeBtn,display:'block',marginLeft:'auto',marginBottom:'4px'}}>×</button>
        <div style={{fontSize:'28px',marginBottom:'10px'}}>🗑️</div>
        <div style={{fontSize:'14px',fontWeight:'700',color:T.text,fontFamily:T.sans,marginBottom:'6px'}}>Delete "{label}"?</div>
        <div style={{fontSize:'12px',color:T.textDim,fontFamily:T.sans,marginBottom:'20px'}}>This cannot be undone.</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={()=>{onConfirm();onClose();}} style={{flex:2,background:T.red,border:'none',color:'#fff',fontWeight:'700',borderRadius:'8px',padding:'11px',cursor:'pointer',fontSize:'13px',fontFamily:T.sans}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({ label, currentName, onSave, onClose }) {
  const [val, setVal] = useState(currentName);
  const save = () => { if (val.trim()) { onSave(val.trim()); onClose(); } };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>{label}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')onClose();}} style={{...S.input,marginBottom:'16px'}}/>
        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={save} style={S.btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DotsMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{position:'relative',flexShrink:0}} onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();setOpen(!open);}} style={{background:open?T.primaryFade:'none',border:open?`1px solid ${T.primaryBorder}`:'1px solid transparent',cursor:'pointer',color:open?T.accent:T.textDim,borderRadius:'6px',display:'flex',alignItems:'center',padding:'4px 6px'}}>
        <Ic.dots/>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:140}} onClick={()=>setOpen(false)}/>
          <div style={{position:'absolute',right:0,top:'calc(100% + 5px)',zIndex:150,background:'#1e2b27',border:`1px solid ${T.borderLight}`,borderRadius:T.radius,padding:'6px',minWidth:'160px',boxShadow:T.shadow}}>
            {items.map((item,i)=>item==='divider'
              ?<div key={i} style={{height:'1px',background:T.border,margin:'4px 0'}}/>
              :<button key={i} onClick={()=>{item.action();setOpen(false);}} style={{...S.menuItem,color:item.danger?T.red:T.textMid}}
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

// ── Unit picker (simplified inline) ──────────────────────────────
const UNITS = ['mm','mm²','mm³','m','m²','m³','ml','L','g','kg','pcs','bag','sheet','bucket','length','set','Roll 100','Roll 500','Box 50','Box 100','packet','pallet','pair','Other'];

function UnitPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = UNITS.filter(u => u.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      {value && (
        <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
          <div style={{flex:1,background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,borderRadius:'6px',padding:'7px 12px',fontSize:'13px',color:T.accent,fontWeight:'700'}}>✓ {value}</div>
          <button onClick={()=>{onChange('');setSearch('');}} style={{background:'none',border:`1px solid ${T.borderLight}`,color:T.textDim,borderRadius:'6px',padding:'7px 10px',cursor:'pointer',fontSize:'12px',fontFamily:T.sans}}>Change</button>
        </div>
      )}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search units…" style={{...S.input,marginBottom:'8px'}}/>
      {(!value||search)&&(
        <div style={{maxHeight:'180px',overflowY:'auto',borderRadius:'7px',border:`1px solid ${T.border}`,background:'rgba(0,0,0,0.25)'}}>
          {filtered.map(u=><button key={u} onMouseDown={e=>{e.preventDefault();onChange(u);setSearch('');}} style={{display:'flex',width:'100%',background:value===u?T.primaryFade:'transparent',border:'none',borderBottom:`1px solid ${T.border}`,color:value===u?T.accent:'rgba(240,237,232,0.85)',padding:'12px 14px',cursor:'pointer',fontSize:'14px',fontFamily:T.sans,minHeight:'48px',alignItems:'center'}}>{u}</button>)}
        </div>
      )}
    </div>
  );
}

// ── Material Modal ────────────────────────────────────────────────
function MaterialModal({ onSave, onClose }) {
  const [name,setName]=useState(''); const [qty,setQty]=useState(''); const [unit,setUnit]=useState('');
  const [errors,setErrors]=useState({});
  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'Required';
    if (!unit) e.unit = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name:name.trim(), qty:qty||null, unit });
    onClose();
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>ADD MATERIAL</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <div style={{marginBottom:'12px'}}>
          <div style={{...S.fieldLabel,color:errors.name?T.red:T.accent}}>MATERIAL NAME{errors.name?' — '+errors.name:''}</div>
          <input autoFocus value={name} onChange={e=>{setName(e.target.value);setErrors(p=>({...p,name:''}));}} placeholder="e.g. River sand" style={{...S.input,border:`1px solid ${errors.name?T.red:T.primaryBorder}`}}/>
        </div>
        <div style={{marginBottom:'12px'}}>
          <div style={S.fieldLabel}>QUANTITY (optional)</div>
          <input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="0" step="any" placeholder="e.g. 2.5" style={S.input}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <div style={{...S.fieldLabel,color:errors.unit?T.red:T.accent}}>UNIT{errors.unit?' — '+errors.unit:''}</div>
          <UnitPicker value={unit} onChange={v=>{setUnit(v);setErrors(p=>({...p,unit:''}));}}/>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={submit} style={{...S.btnPrimary,flex:2}}>Add Material</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Details Modal ────────────────────────────────────────────
function TaskDetailsModal({ task, rooms, onSave, onClose }) {
  const [notes,setNotes]=useState(task.notes||'');
  const [dueDate,setDueDate]=useState(task.due_date||'');
  const [priority,setPriority]=useState(task.priority||'medium');
  const [roomId,setRoomId]=useState(task.room_id||'');
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>TASK DETAILS</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <div style={{fontSize:'13px',color:T.textMid,fontFamily:T.sans,marginBottom:'16px',fontStyle:'italic'}}>{task.name}</div>
        <div style={{marginBottom:'12px'}}>
          <div style={S.fieldLabel}>PRIORITY</div>
          <div style={{display:'flex',gap:'6px'}}>
            {['high','medium','low'].map(p=><button key={p} onClick={()=>setPriority(p)} style={{flex:1,background:priority===p?(p==='high'?T.red:p==='medium'?T.warn:T.accent):'rgba(255,255,255,0.05)',border:'none',color:priority===p?'#000':T.textMid,borderRadius:'6px',padding:'8px',cursor:'pointer',fontSize:'12px',fontFamily:T.sans,fontWeight:priority===p?'700':'400',textTransform:'capitalize'}}>{p}</button>)}
          </div>
        </div>
        <div style={{marginBottom:'12px'}}>
          <div style={S.fieldLabel}>ROOM / AREA</div>
          <select value={roomId} onChange={e=>setRoomId(e.target.value)} style={{...S.input,appearance:'none',colorScheme:'dark',cursor:'pointer'}}>
            <option value="">— None —</option>
            {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={{marginBottom:'12px'}}>
          <div style={S.fieldLabel}>NOTES</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Instructions, dimensions, context…" rows={3} style={{...S.input,resize:'none'}}/>
        </div>
        <div style={{marginBottom:'20px'}}>
          <div style={S.fieldLabel}>DUE DATE</div>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{...S.input,colorScheme:'dark'}}/>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={()=>{onSave({notes,due_date:dueDate||null,priority,room_id:roomId||null});onClose();}} style={{...S.btnPrimary,flex:2}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Material Row ──────────────────────────────────────────────────
function MaterialRow({ mat, canDelete, onToggle, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const isAcquired = mat.status === 'acquired' || mat.acquired_at;
  const missing = !mat.qty || !mat.unit;
  return (
    <>
      {confirming&&<ConfirmDelete label={mat.name} onConfirm={onDelete} onClose={()=>setConfirming(false)}/>}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 4px',borderRadius:'6px',background:isAcquired?T.primaryFade:'transparent',marginBottom:'3px'}}>
        <button onClick={onToggle} style={{width:'18px',height:'18px',borderRadius:'3px',flexShrink:0,background:isAcquired?T.primary:'transparent',border:isAcquired?`2px solid ${T.primary}`:'2px solid rgba(255,255,255,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.text,outline:'none',padding:0}}>
          {isAcquired&&<Ic.check/>}
        </button>
        <span style={{flex:1,fontSize:'13px',color:isAcquired?T.textDim:'rgba(240,237,232,0.85)',textDecoration:isAcquired?'line-through':'none',fontFamily:T.sans}}>{mat.name}</span>
        {(mat.qty||mat.unit)&&<span style={{...S.pill,color:missing?T.warn:T.accent,background:missing?T.warnFade:T.accentFade}}>{missing?'⚠️ ':''}{mat.qty||'—'} {mat.unit||'no unit'}</span>}
        {canDelete&&<button onClick={()=>setConfirming(true)} style={{background:'none',border:'none',color:T.textFaint,cursor:'pointer',padding:'2px',display:'flex'}} onMouseEnter={e=>e.currentTarget.style.color=T.red} onMouseLeave={e=>e.currentTarget.style.color=T.textFaint}><Ic.trash/></button>}
      </div>
    </>
  );
}

// ── Subtask Row ───────────────────────────────────────────────────
function SubtaskRow({ subtask, canManage, canDelete, onToggle, onDelete, onAddMaterial, onToggleMaterial, onDeleteMaterial }) {
  const [matOpen, setMatOpen] = useState(false);
  const [addingMat, setAddingMat] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const mats = subtask.materials || [];
  const acq = mats.filter(m=>m.status==='acquired'||m.acquired_at).length;
  return (
    <div style={{borderLeft:`2px solid ${subtask.completed?'rgba(45,106,79,0.5)':T.border}`,marginLeft:'6px',paddingLeft:'14px',marginBottom:'8px'}}>
      {confirming&&<ConfirmDelete label={subtask.name} onConfirm={onDelete} onClose={()=>setConfirming(false)}/>}
      {addingMat&&<MaterialModal onSave={mat=>{onAddMaterial(subtask.id,mat);setAddingMat(false);}} onClose={()=>setAddingMat(false)}/>}
      <div style={{display:'flex',alignItems:'center',gap:'9px',padding:'5px 0'}}>
        <button onClick={onToggle} style={{width:'20px',height:'20px',flexShrink:0,borderRadius:'50%',background:subtask.completed?T.primary:'transparent',border:subtask.completed?`2px solid ${T.primary}`:'2px solid rgba(255,255,255,0.22)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.text,outline:'none',padding:0}}>
          {subtask.completed&&<Ic.check/>}
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'14px',fontFamily:T.sans,color:subtask.completed?T.textDim:'rgba(240,237,232,0.9)',textDecoration:subtask.completed?'line-through':'none'}}>{subtask.name}</div>
          {subtask.completed&&subtask.completed_by_name&&<div style={{fontSize:'10px',color:T.textFaint,fontFamily:T.mono,marginTop:'2px'}}>✓ {subtask.completed_by_name} · {fmtDate(subtask.completed_at)}</div>}
        </div>
        <button onClick={()=>setMatOpen(!matOpen)} style={{display:'flex',alignItems:'center',gap:'4px',background:matOpen?T.primaryFade:T.surface2,border:`1px solid ${matOpen?T.primaryBorder:T.border}`,borderRadius:'4px',padding:'3px 7px',cursor:'pointer',color:mats.length>0?(acq===mats.length?T.accent:T.textMid):T.textFaint,fontSize:'11px',fontFamily:T.mono,whiteSpace:'nowrap'}}>
          {mats.length>0?`${acq}/${mats.length}`:'mats'} {Ic.chevron(matOpen)}
        </button>
        {canDelete&&<button onClick={()=>setConfirming(true)} style={{background:'none',border:'none',color:T.textFaint,cursor:'pointer',padding:'2px',display:'flex'}} onMouseEnter={e=>e.currentTarget.style.color=T.red} onMouseLeave={e=>e.currentTarget.style.color=T.textFaint}><Ic.trash/></button>}
      </div>
      {matOpen&&(
        <div style={{background:'rgba(0,0,0,0.2)',borderRadius:'8px',padding:'10px 12px',margin:'4px 0 8px',border:`1px solid ${T.border}`}}>
          <div style={{...S.fieldLabel,marginBottom:'8px'}}>MATERIALS</div>
          {mats.length===0&&<div style={{fontSize:'12px',color:T.textFaint,fontStyle:'italic',marginBottom:'8px',fontFamily:T.sans}}>None yet</div>}
          {mats.map(m=><MaterialRow key={m.id} mat={m} canDelete={canDelete}
            onToggle={()=>onToggleMaterial(m.id, m.status!=='acquired'&&!m.acquired_at)}
            onDelete={()=>onDeleteMaterial(m.id)}
          />)}
          {canManage&&<button onClick={()=>setAddingMat(true)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'none',border:`1px dashed ${T.border}`,color:T.textDim,fontSize:'12px',borderRadius:'5px',padding:'5px 10px',cursor:'pointer',fontFamily:T.sans,marginTop:'6px'}}>
            {Ic.plus(11)} Add material
          </button>}
        </div>
      )}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────
function TaskCard({ task, rooms, isFirst, isLast, canManage, canDelete, onUpdate, onDelete, onMove, onAddSubtask, onToggleSubtask, onDeleteSubtask, onAddMaterial, onToggleMaterial, onDeleteMaterial }) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [newSub, setNewSub] = useState('');
  const subs = task.subtasks || [];
  const allDone = subs.length > 0 && subs.every(s => s.completed);
  const doneCount = subs.filter(s => s.completed).length;
  const progress = subs.length > 0 ? Math.round((doneCount/subs.length)*100) : 0;
  const priorityColor = task.priority==='high'?T.red:task.priority==='low'?T.accent:T.warn;
  const submitSub = () => { if(newSub.trim()){onAddSubtask(task.id,newSub.trim());setNewSub('');setAddingSub(false);} };

  const MoveBtn = ({dir,disabled}) => (
    <button onClick={e=>{e.stopPropagation();if(!disabled)onMove(task.id,dir);}} style={{background:'none',border:'none',padding:'2px 3px',cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',color:disabled?T.textFaint:T.textDim}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=disabled?T.textFaint:T.textDim;}}>
      {dir===-1?<Ic.up/>:<Ic.down/>}
    </button>
  );

  return (
    <>
      {confirming&&<ConfirmDelete label={task.name} onConfirm={()=>onDelete(task.id)} onClose={()=>setConfirming(false)}/>}
      {showDetails&&<TaskDetailsModal task={task} rooms={rooms} onSave={d=>onUpdate(task.id,d)} onClose={()=>setShowDetails(false)}/>}
      <div style={{background:T.surface2,border:`1px solid ${allDone?'rgba(45,106,79,0.5)':T.border}`,borderRadius:'12px',marginBottom:'10px',overflow:'hidden',transition:'all 0.3s'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'13px 14px',cursor:'pointer',borderBottom:expanded?`1px solid ${T.border}`:'none'}} onClick={()=>setExpanded(!expanded)}>
          {canManage&&<div style={{display:'flex',flexDirection:'column',gap:'1px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <MoveBtn dir={-1} disabled={isFirst}/><MoveBtn dir={1} disabled={isLast}/>
          </div>}
          <div style={{width:'9px',height:'9px',borderRadius:'50%',flexShrink:0,background:allDone?T.primary:'rgba(255,255,255,0.12)',boxShadow:allDone?`0 0 8px ${T.primary}`:'none',transition:'all 0.3s'}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:allDone?T.textDim:T.text,textDecoration:allDone?'line-through':'none',fontFamily:T.sans,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.name}</div>
            <div style={{display:'flex',gap:'8px',marginTop:'3px',flexWrap:'wrap',alignItems:'center'}}>
              {task.priority&&<span style={{fontSize:'9px',fontFamily:T.mono,color:priorityColor,background:`${priorityColor}20`,borderRadius:'3px',padding:'1px 5px',textTransform:'uppercase'}}>{task.priority}</span>}
              {task.due_date&&<span style={{fontSize:'10px',color:T.textDim,fontFamily:T.mono,display:'flex',alignItems:'center',gap:'2px'}}><Ic.cal/> {task.due_date}</span>}
              {task.notes&&<span style={{fontSize:'10px',color:T.textDim,fontFamily:T.mono,display:'flex',alignItems:'center',gap:'2px'}}><Ic.note/> note</span>}
            </div>
          </div>
          {subs.length>0&&<span style={{fontSize:'11px',fontFamily:T.mono,color:allDone?T.accent:T.textDim,background:T.surface2,borderRadius:'4px',padding:'2px 7px'}}>{doneCount}/{subs.length}</span>}
          {canManage&&<DotsMenu items={[
            {icon:<Ic.note/>,label:'Details / Notes',action:()=>setShowDetails(true)},
            ...(canDelete?['divider',{icon:<Ic.trash/>,label:'Delete',danger:true,action:()=>setConfirming(true)}]:[]),
          ]}/>}
          <div style={{color:T.textDim}}>{Ic.chevron(expanded)}</div>
        </div>
        {subs.length>0&&<div style={{height:'2px',background:'rgba(255,255,255,0.04)'}}><div style={{height:'100%',background:T.primary,width:`${progress}%`,transition:'width 0.4s'}}/></div>}
        {expanded&&(
          <div style={{padding:'14px 16px'}}>
            {task.notes&&<div style={{background:'rgba(0,0,0,0.15)',border:`1px solid ${T.border}`,borderRadius:'7px',padding:'10px 12px',marginBottom:'12px',fontSize:'12px',color:T.textMid,fontFamily:T.sans,lineHeight:'1.6'}}>{task.notes}</div>}
            {subs.length===0&&<div style={{fontSize:'12px',color:T.textFaint,fontFamily:T.sans,marginBottom:'10px',fontStyle:'italic'}}>No subtasks yet</div>}
            {subs.map(sub=><SubtaskRow key={sub.id} subtask={sub} canManage={canManage} canDelete={canDelete}
              onToggle={()=>onToggleSubtask(sub.id,!sub.completed)}
              onDelete={()=>onDeleteSubtask(sub.id)}
              onAddMaterial={onAddMaterial}
              onToggleMaterial={(mid,acq)=>onToggleMaterial(mid,acq)}
              onDeleteMaterial={onDeleteMaterial}
            />)}
            {canManage&&<div style={{marginTop:'12px'}}>
              {addingSub?(
                <div style={{display:'flex',gap:'6px'}}>
                  <input autoFocus value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitSub();if(e.key==='Escape'){setAddingSub(false);setNewSub('');}}} placeholder="Subtask name…" style={{...S.input,flex:1,minWidth:0}}/>
                  <button onClick={submitSub} style={{...S.btnPrimary,padding:'7px 14px'}}>Add</button>
                  <button onClick={()=>{setAddingSub(false);setNewSub('');}} style={{...S.btnGhost,padding:'7px 10px'}}>✕</button>
                </div>
              ):(
                <button onClick={()=>setAddingSub(true)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'none',border:`1px dashed ${T.primary}`,color:T.accent,fontSize:'12px',borderRadius:'5px',padding:'5px 11px',cursor:'pointer',fontFamily:T.sans}}>
                  {Ic.plus(11)} Add subtask
                </button>
              )}
            </div>}
          </div>
        )}
      </div>
    </>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────
function TasksTab({ property }) {
  const { canManage, canDelete, isAdmin } = useAuth();
  const { tasks, loading, addTask, updateTask, deleteTask, moveTask, addSubtask, updateSubtask, deleteSubtask, addMaterial, updateMaterial, deleteMaterial } = useTasks(property.id);
  const { rooms } = useRooms(property.id);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('active');

  const isComplete = t => (t.subtasks||[]).length>0 && (t.subtasks||[]).every(s=>s.completed);
  const filtered = tasks.filter(t => filter==='active'?!isComplete(t):filter==='completed'?isComplete(t):true);
  const completedCount = tasks.filter(isComplete).length;

  const handleToggleMaterial = (matId, acquired) => {
    updateMaterial(matId, { status: acquired ? 'acquired' : 'needed' });
  };

  if (loading) return <div style={{textAlign:'center',padding:'40px',color:T.textDim,fontFamily:T.mono,fontSize:'13px'}}>Loading tasks…</div>;

  return (
    <div>
      {(canManage||isAdmin)&&(
        <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:'10px',padding:'11px 14px',marginBottom:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
          <div style={{color:T.accent,display:'flex',flexShrink:0}}>{Ic.plus()}</div>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&newTask.trim()&&(addTask(newTask.trim()),setNewTask(''))} placeholder="Add a new task…" style={{flex:1,background:'none',border:'none',color:T.text,fontSize:'14px',outline:'none',fontFamily:T.sans}}/>
          <button onClick={()=>{if(newTask.trim()){addTask(newTask.trim());setNewTask('');}}} style={{...S.btnPrimary,padding:'7px 14px',fontSize:'12px',whiteSpace:'nowrap'}}>Add</button>
        </div>
      )}
      <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
        {['active','all','completed'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?T.primary:'rgba(255,255,255,0.05)',border:'none',color:filter===f?T.text:T.textDim,borderRadius:'5px',padding:'5px 12px',cursor:'pointer',fontSize:'11px',fontWeight:filter===f?'700':'500',fontFamily:T.sans,textTransform:'capitalize'}}>{f}</button>)}
        <span style={{marginLeft:'auto',fontSize:'11px',color:T.textDim,fontFamily:T.mono,alignSelf:'center'}}>{completedCount}/{tasks.length} done</span>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'50px 20px',color:T.textFaint,fontFamily:T.mono,fontSize:'13px'}}>
          {filter==='completed'?'No completed tasks yet':filter==='active'?'All caught up! 🎉':'No tasks — add one above'}
        </div>
      ):filtered.map((task,idx)=>(
        <TaskCard key={task.id} task={task} rooms={rooms} isFirst={idx===0} isLast={idx===filtered.length-1}
          canManage={canManage||isAdmin} canDelete={canDelete||isAdmin}
          onUpdate={updateTask} onDelete={deleteTask} onMove={moveTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={(sid,completed)=>updateSubtask(sid,{completed})}
          onDeleteSubtask={deleteSubtask}
          onAddMaterial={addMaterial}
          onToggleMaterial={handleToggleMaterial}
          onDeleteMaterial={deleteMaterial}
        />
      ))}
    </div>
  );
}

// ── Service Log Modal ─────────────────────────────────────────────
function ServiceLogModal({ service, onSave, onClose }) {
  const [form, setForm] = useState({
    doneDate: new Date().toISOString().split('T')[0],
    company: '', invoiceNumber: '', invoiceAmount: '',
    warranty: false, warrantyMonths: '', notes: ''
  });
  const fld = (label, child) => <div style={{marginBottom:'12px'}}><div style={S.fieldLabel}>{label}</div>{child}</div>;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>LOG SERVICE — {service.name}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        {fld('DATE COMPLETED',<input type="date" value={form.doneDate} onChange={e=>setForm(p=>({...p,doneDate:e.target.value}))} style={{...S.input,colorScheme:'dark'}}/>)}
        {fld('COMPANY / SERVICE PROVIDER (optional)',<input value={form.company} onChange={e=>setForm(p=>({...p,company:e.target.value}))} placeholder="e.g. ABC Pool Services" style={S.input}/>)}
        {fld('INVOICE NUMBER (optional)',<input value={form.invoiceNumber} onChange={e=>setForm(p=>({...p,invoiceNumber:e.target.value}))} placeholder="e.g. INV-2024-001" style={S.input}/>)}
        {fld('INVOICE AMOUNT (optional)',<input value={form.invoiceAmount} onChange={e=>setForm(p=>({...p,invoiceAmount:e.target.value}))} type="number" min="0" step="0.01" placeholder="e.g. 850.00" style={S.input}/>)}
        <div style={{marginBottom:'12px'}}>
          <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
            <input type="checkbox" checked={form.warranty} onChange={e=>setForm(p=>({...p,warranty:e.target.checked}))} style={{width:'18px',height:'18px',accentColor:T.primary}}/>
            <span style={{fontSize:'13px',color:T.textMid,fontFamily:T.sans}}>Warranty provided</span>
          </label>
          {form.warranty&&<input value={form.warrantyMonths} onChange={e=>setForm(p=>({...p,warrantyMonths:e.target.value}))} type="number" min="0" placeholder="Warranty duration (months)" style={{...S.input,marginTop:'8px'}}/>}
        </div>
        {fld('NOTES (optional)',<input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. Replaced pump impeller, all good" style={S.input}/>)}
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={()=>{onSave(form);onClose();}} style={{...S.btnPrimary,flex:2}}>Log Service</button>
        </div>
      </div>
    </div>
  );
}

// ── Services Tab ──────────────────────────────────────────────────
function ServicesTab({ property }) {
  const { canManage, isAdmin } = useAuth();
  const { services, loading, addService, deleteService, logService } = useServices(property.id);
  const [adding, setAdding] = useState(false);
  const [loggingId, setLoggingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [form, setForm] = useState({ name:'', freqMonths:'12', isRecurring:true, notes:'' });

  const loggingService = services.find(s=>s.id===loggingId);
  const confirmingService = services.find(s=>s.id===confirmingId);

  const addSvc = () => {
    if (!form.name.trim()) return;
    addService({ name:form.name.trim(), freqMonths:form.isRecurring?(parseFloat(form.freqMonths)||12):null, isRecurring:form.isRecurring, notes:form.notes.trim() });
    setForm({ name:'', freqMonths:'12', isRecurring:true, notes:'' });
    setAdding(false);
  };

  if (loading) return <div style={{textAlign:'center',padding:'40px',color:T.textDim,fontFamily:T.mono,fontSize:'13px'}}>Loading services…</div>;

  return (
    <div>
      {loggingService&&<ServiceLogModal service={loggingService} onSave={data=>logService(loggingId,data)} onClose={()=>setLoggingId(null)}/>}
      {confirmingService&&<ConfirmDelete label={confirmingService.name} onConfirm={()=>deleteService(confirmingId)} onClose={()=>setConfirmingId(null)}/>}

      {services.map(svc=>{
        const days = daysUntil(svc.next_due);
        const isOverdue = days!==null&&days<0;
        const isDueSoon = days!==null&&days>=0&&days<=30;
        const statusColor = isOverdue?T.red:isDueSoon?T.warn:T.accent;
        const statusText = isOverdue?`${Math.abs(days)}d overdue`:days===0?'Due today':days!==null?`in ${days}d`:'Not scheduled';
        const logs = svc.service_logs||[];
        return (
          <div key={svc.id} style={{background:T.surface2,border:`1px solid ${isOverdue?T.red:isDueSoon?T.warnBorder:T.border}`,borderRadius:'10px',marginBottom:'8px',padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:'600',color:T.text,fontFamily:T.sans}}>{svc.name}</div>
                <div style={{display:'flex',gap:'8px',marginTop:'3px',flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:'10px',color:T.textDim,fontFamily:T.mono}}>{svc.is_recurring?(svc.freq_months<1?'Weekly':svc.freq_months<12?`Every ${svc.freq_months}mo`:`Every ${svc.freq_months/12}yr`):'One-off'}</span>
                  {svc.last_done&&<span style={{fontSize:'10px',color:T.textDim,fontFamily:T.mono}}>Last: {fmtDate(svc.last_done)}</span>}
                </div>
                {svc.notes&&<div style={{fontSize:'12px',color:T.textMid,fontFamily:T.sans,marginTop:'6px'}}>💡 {svc.notes}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                <span style={{fontSize:'11px',fontFamily:T.mono,color:statusColor,background:`${statusColor}18`,border:`1px solid ${statusColor}40`,borderRadius:'4px',padding:'2px 8px'}}>{statusText}</span>
                {svc.next_due&&<span style={{fontSize:'10px',color:T.textDim,fontFamily:T.mono}}>Due {fmtDate(svc.next_due)}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
              <button onClick={()=>setLoggingId(svc.id)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,color:T.accent,fontSize:'12px',borderRadius:'6px',padding:'6px 12px',cursor:'pointer',fontFamily:T.sans,fontWeight:'600'}}>
                <Ic.bell/> Log Service Done
              </button>
              {(canManage||isAdmin)&&<button onClick={()=>setConfirmingId(svc.id)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'none',border:`1px solid ${T.border}`,color:T.textDim,fontSize:'12px',borderRadius:'6px',padding:'6px 10px',cursor:'pointer',fontFamily:T.sans}}>
                <Ic.trash/> Remove
              </button>}
            </div>
            {logs.length>0&&(
              <div style={{marginTop:'10px',borderTop:`1px solid ${T.border}`,paddingTop:'10px'}}>
                <div style={{...S.fieldLabel,marginBottom:'6px'}}>RECENT HISTORY</div>
                {logs.slice(0,2).map(log=>(
                  <div key={log.id} style={{display:'flex',gap:'8px',fontSize:'12px',color:T.textDim,fontFamily:T.sans,padding:'4px 0',borderBottom:`1px solid ${T.border}`}}>
                    <span style={{color:T.accent,fontFamily:T.mono,flexShrink:0}}>{fmtDate(log.done_date)}</span>
                    <span>{log.company||log.notes||'Service completed'}</span>
                    {log.invoice_number&&<span style={{color:T.textFaint,fontFamily:T.mono,marginLeft:'auto'}}>#{log.invoice_number}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(canManage||isAdmin)&&(adding?(
        <div style={{background:T.surface2,border:`1px solid ${T.primaryBorder}`,borderRadius:'10px',padding:'16px',marginTop:'12px'}}>
          <div style={{...S.mLabel,marginBottom:'14px'}}>ADD SERVICE ITEM</div>
          <div style={{marginBottom:'10px'}}><div style={S.fieldLabel}>SERVICE NAME</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Borehole pump check" style={S.input}/></div>
          <div style={{marginBottom:'10px'}}>
            <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:'8px'}}>
              <input type="checkbox" checked={form.isRecurring} onChange={e=>setForm(p=>({...p,isRecurring:e.target.checked}))} style={{width:'18px',height:'18px',accentColor:T.primary}}/>
              <span style={{fontSize:'13px',color:T.textMid,fontFamily:T.sans}}>Recurring service</span>
            </label>
            {form.isRecurring&&<select value={form.freqMonths} onChange={e=>setForm(p=>({...p,freqMonths:e.target.value}))} style={{...S.input,appearance:'none',colorScheme:'dark',cursor:'pointer'}}>
              {[['Weekly','0.25'],['Monthly','1'],['Every 3 months','3'],['Every 6 months','6'],['Yearly','12'],['Every 2 years','24'],['Every 3 years','36']].map(([l,v])=><option key={v} value={v}>{l}</option>)}
            </select>}
          </div>
          <div style={{marginBottom:'14px'}}><div style={S.fieldLabel}>NOTES (optional)</div><input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. Check output and pressure" style={S.input}/></div>
          <div style={{display:'flex',gap:'8px'}}><button onClick={()=>setAdding(false)} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={addSvc} style={{...S.btnPrimary,flex:2}}>Add Service</button></div>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'none',border:`1px dashed ${T.primary}`,color:T.accent,fontSize:'12px',borderRadius:'6px',padding:'6px 14px',cursor:'pointer',fontFamily:T.sans,marginTop:'10px',fontWeight:'600'}}>
          {Ic.plus(11)} Add Service Item
        </button>
      ))}
    </div>
  );
}

// ── Shopping Tab ──────────────────────────────────────────────────
function ShoppingTab({ property }) {
  const { tasks, updateMaterial } = useTasks(property.id);
  const [showAcquired, setShowAcquired] = useState(true);
  const [shareModal, setShareModal] = useState(false);

  const groups = tasks.map(task => {
    const items = (task.subtasks||[]).flatMap(sub=>(sub.materials||[]).map(m=>({...m,subtaskName:sub.name,taskId:task.id})));
    return { taskName:task.name, items };
  }).filter(g=>g.items.length>0);

  const allItems = groups.flatMap(g=>g.items);
  const total = allItems.length;
  const acquired = allItems.filter(m=>m.status==='acquired'||m.acquired_at).length;

  const shareText = () => {
    const date = new Date().toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'});
    const lines = [`📋 SHOPPING LIST — ${property.name.toUpperCase()}`,date,''];
    groups.forEach(g=>{
      const pending = g.items.filter(m=>m.status!=='acquired'&&!m.acquired_at);
      if(!pending.length)return;
      lines.push('▸ '+g.taskName.toUpperCase());
      pending.forEach(m=>lines.push(`  • ${m.name}${m.qty?' — '+m.qty+' '+(m.unit||''):''}${!m.qty||!m.unit?' ⚠️':''}`));
      lines.push('');
    });
    lines.push('Property Tracker');
    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = shareText();
    if (navigator.share) { try { await navigator.share({text}); return; } catch(e) { if(e.name==='AbortError')return; } }
    setShareModal(true);
  };

  if (total===0) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:'32px',marginBottom:'12px'}}>🛒</div>
      <div style={{color:T.textDim,fontFamily:T.mono,fontSize:'13px'}}>No materials added yet</div>
    </div>
  );

  return (
    <div>
      {shareModal&&(
        <div style={S.overlay} onClick={()=>setShareModal(false)}>
          <div style={{...S.card,maxHeight:'80vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div style={S.mHead}><span style={S.mLabel}>SHARE LIST</span><button onClick={()=>setShareModal(false)} style={S.closeBtn}>×</button></div>
            <textarea readOnly value={shareText()} style={{flex:1,background:'rgba(0,0,0,0.2)',border:`1px solid ${T.border}`,borderRadius:'8px',color:'rgba(240,237,232,0.85)',padding:'12px',fontSize:'13px',fontFamily:T.mono,resize:'none',outline:'none',minHeight:'200px',WebkitUserSelect:'text',userSelect:'text'}} onFocus={e=>e.target.select()}/>
            <button onClick={()=>setShareModal(false)} style={{...S.btnGhost,marginTop:'10px'}}>Close</button>
          </div>
        </div>
      )}
      <div style={{background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,borderRadius:'10px',padding:'14px 16px',marginBottom:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <div style={{flex:1}}><div style={{fontSize:'20px',fontWeight:'700',color:T.text,fontFamily:T.sans}}>{total-acquired} <span style={{fontSize:'13px',fontWeight:'400',color:T.textDim}}>items to get</span></div><div style={{fontSize:'11px',color:T.textDim,fontFamily:T.mono,marginTop:'2px'}}>{acquired}/{total} acquired</div></div>
          <div style={{width:'70px'}}><div style={{height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'3px'}}><div style={{height:'100%',background:T.primary,borderRadius:'3px',width:`${total>0?(acquired/total)*100:0}%`,transition:'width 0.4s'}}/></div></div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setShowAcquired(!showAcquired)} style={{flex:1,background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.textDim,borderRadius:'6px',padding:'8px',cursor:'pointer',fontSize:'11px',fontFamily:T.sans}}>{showAcquired?'Hide':'Show'} acquired</button>
          <button onClick={handleShare} style={{flex:2,background:T.primary,border:'none',color:T.text,fontWeight:'700',borderRadius:'6px',padding:'8px',cursor:'pointer',fontSize:'12px',fontFamily:T.sans,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>📤 Share via WhatsApp</button>
        </div>
      </div>
      {groups.map(g=>{
        const visible = showAcquired?g.items:g.items.filter(m=>m.status!=='acquired'&&!m.acquired_at);
        if(!visible.length)return null;
        return <div key={g.taskName} style={{marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',paddingBottom:'6px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:T.primary,flexShrink:0}}/>
            <span style={{fontSize:'12px',fontWeight:'700',color:T.textMid,fontFamily:T.sans,flex:1}}>{g.taskName}</span>
          </div>
          {visible.map(mat=>{
            const isAcq = mat.status==='acquired'||!!mat.acquired_at;
            return <div key={mat.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'8px',marginBottom:'4px',background:isAcq?T.primaryFade:T.surface2,border:`1px solid ${isAcq?T.primaryBorder:T.border}`,cursor:'pointer'}} onClick={()=>updateMaterial(mat.id,{status:isAcq?'needed':'acquired'})}>
              <button style={{width:'22px',height:'22px',flexShrink:0,borderRadius:'5px',background:isAcq?T.primary:'transparent',border:isAcq?`2px solid ${T.primary}`:'2px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:T.text,outline:'none',padding:0}}>{isAcq&&<Ic.check/>}</button>
              <div style={{flex:1}}>
                <div style={{fontSize:'14px',fontFamily:T.sans,color:isAcq?T.textDim:T.text,textDecoration:isAcq?'line-through':'none'}}>{mat.name}</div>
                {mat.qty&&<span style={S.pill}>{mat.qty} {mat.unit||''}</span>}
              </div>
              {isAcq&&<span style={{fontSize:'11px',color:T.accent,fontFamily:T.mono}}>✓ got it</span>}
            </div>;
          })}
        </div>;
      })}
    </div>
  );
}

// ── Rooms Tab ─────────────────────────────────────────────────────
function RoomsTab({ property }) {
  const { canManage, isAdmin } = useAuth();
  const { rooms, loading, addRoom, renameRoom, deleteRoom, moveRoom } = useRooms(property.id);
  const [adding, setAdding] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [confirming, setConfirming] = useState(null);

  if (loading) return <div style={{textAlign:'center',padding:'40px',color:T.textDim,fontFamily:T.mono,fontSize:'13px'}}>Loading rooms…</div>;

  return (
    <div>
      {renaming&&<RenameModal label="RENAME ROOM" currentName={renaming.name} onSave={n=>renameRoom(renaming.id,n)} onClose={()=>setRenaming(null)}/>}
      {confirming&&<ConfirmDelete label={confirming.name} onConfirm={()=>deleteRoom(confirming.id)} onClose={()=>setConfirming(null)}/>}
      <div style={{fontSize:'11px',fontFamily:T.mono,color:T.accent,letterSpacing:'0.08em',marginBottom:'14px'}}>ROOMS & AREAS</div>
      {rooms.length===0&&<div style={{fontSize:'13px',color:T.textFaint,fontFamily:T.sans,marginBottom:'12px',fontStyle:'italic'}}>No rooms added yet</div>}
      {rooms.map((room,idx)=>(
        <div key={room.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:'8px',marginBottom:'6px'}}>
          {(canManage||isAdmin)&&<div style={{display:'flex',flexDirection:'column',gap:'1px'}}>
            <button onClick={()=>moveRoom(room.id,-1)} disabled={idx===0} style={{background:'none',border:'none',cursor:idx===0?'default':'pointer',color:idx===0?T.textFaint:T.textDim,padding:'1px',display:'flex'}}><Ic.up/></button>
            <button onClick={()=>moveRoom(room.id,1)} disabled={idx===rooms.length-1} style={{background:'none',border:'none',cursor:idx===rooms.length-1?'default':'pointer',color:idx===rooms.length-1?T.textFaint:T.textDim,padding:'1px',display:'flex'}}><Ic.down/></button>
          </div>}
          <span style={{flex:1,fontSize:'14px',fontFamily:T.sans,color:T.textMid}}>📍 {room.name}</span>
          {(canManage||isAdmin)&&<DotsMenu items={[
            {icon:<Ic.pencil/>,label:'Rename',action:()=>setRenaming(room)},
            'divider',
            {icon:<Ic.trash/>,label:'Delete',danger:true,action:()=>setConfirming(room)},
          ]}/>}
        </div>
      ))}
      {(canManage||isAdmin)&&(adding?(
        <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
          <input autoFocus value={newRoom} onChange={e=>setNewRoom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newRoom.trim()){addRoom(newRoom.trim());setNewRoom('');setAdding(false);}if(e.key==='Escape')setAdding(false);}} placeholder="Room or area name…" style={{...S.input,flex:1,minWidth:0}}/>
          <button onClick={()=>{if(newRoom.trim()){addRoom(newRoom.trim());setNewRoom('');setAdding(false);}}} style={{...S.btnPrimary,padding:'8px 14px'}}>Add</button>
          <button onClick={()=>setAdding(false)} style={{...S.btnGhost,padding:'8px 10px'}}>✕</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'none',border:`1px dashed ${T.primary}`,color:T.accent,fontSize:'12px',borderRadius:'6px',padding:'6px 14px',cursor:'pointer',fontFamily:T.sans,marginTop:'8px'}}>
          {Ic.plus(11)} Add Room / Area
        </button>
      ))}
    </div>
  );
}

// ── Main PropertyPage ─────────────────────────────────────────────
export default function PropertyPage({ property, properties, onBack, onEditProperty }) {
  const [tab, setTab] = useState('tasks');
  const { tasks } = useTasks(property.id);
  const { services } = useServices(property.id);

  const pendingMats = tasks.flatMap(t=>(t.subtasks||[]).flatMap(s=>(s.materials||[]))).filter(m=>m.status!=='acquired'&&!m.acquired_at).length;
  const overdueSvcs = services.filter(s=>daysUntil(s.next_due)!==null&&daysUntil(s.next_due)<0).length;

  const isCommercial = property.type === 'commercial';
  const TABS = [
    {id:'tasks',    label:'Tasks',    icon:<Ic.tool/>},
    {id:'services', label:'Services', icon:<Ic.wrench/>},
    {id:'shopping', label:'Shopping', icon:<Ic.cart/>},
    {id:'rooms',    label:'Rooms',    icon:<Ic.home/>},
    ...(isCommercial ? [{id:'assets', label:'Assets', icon:<Ic.wrench/>}] : []),
  ];

  return (
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:T.sans}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:'rgba(15,20,18,0.95)',borderBottom:`1px solid ${T.border}`,backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:10}}>
        <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'4px',background:'none',border:'none',color:T.textDim,cursor:'pointer',fontFamily:T.sans,fontSize:'12px',padding:'4px 0'}}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <Ic.back/> Properties
          </button>
          <div style={{width:'1px',height:'16px',background:T.border}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'15px',fontWeight:'700',color:T.text,lineHeight:1.1}}>{property.icon} {property.name}</div>
            <div style={{fontSize:'11px',color:T.textDim,fontFamily:T.mono,marginTop:'1px',textTransform:'capitalize'}}>{property.type}</div>
          </div>
        </div>
        <div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,0.05)',overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',padding:'11px 8px',background:'none',border:'none',cursor:'pointer',borderBottom:tab===t.id?`2px solid ${T.primary}`:'2px solid transparent',color:tab===t.id?T.accent:T.textDim,fontSize:'12px',fontWeight:tab===t.id?'700':'500',fontFamily:T.sans,transition:'all 0.15s',whiteSpace:'nowrap',position:'relative'}}>
              {t.icon} {t.label}
              {t.id==='shopping'&&pendingMats>0&&<span style={{background:T.primary,color:T.text,borderRadius:'10px',padding:'0 5px',fontSize:'9px',fontFamily:T.mono,fontWeight:'700'}}>{pendingMats}</span>}
              {t.id==='services'&&overdueSvcs>0&&<span style={{background:T.red,color:'#fff',borderRadius:'10px',padding:'0 5px',fontSize:'9px',fontFamily:T.mono,fontWeight:'700'}}>{overdueSvcs}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:'680px',margin:'0 auto',padding:'20px 14px'}}>
        {tab==='tasks'&&<TasksTab property={property}/>}
        {tab==='services'&&<ServicesTab property={property}/>}
        {tab==='shopping'&&<ShoppingTab property={property}/>}
        {tab==='rooms'&&<RoomsTab property={property}/>}
        {tab==='assets'&&<AssetsTab property={property} properties={properties||[]}/>}
      </div>
    </div>
  );
}

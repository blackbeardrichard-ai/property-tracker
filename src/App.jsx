import { useState, useEffect, useRef, useContext, createContext, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const CANONICAL_KEY = "home-tracker-v1";
const LEGACY_KEYS   = ["taskmanager-v2","taskmanager-v1","task-manager-data"];

// ─────────────────────────────────────────────────────────────────────────────
// THEME — forest green / warm cream
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  primary:      "#2D6A4F",
  primaryFade:  "rgba(45,106,79,0.18)",
  primaryBorder:"rgba(45,106,79,0.45)",
  primaryLight: "rgba(45,106,79,0.12)",
  accent:       "#95D5B2",
  accentFade:   "rgba(149,213,178,0.15)",
  bg:           "#0f1412",
  surface:      "#1a2420",
  surface2:     "rgba(255,255,255,0.04)",
  border:       "rgba(255,255,255,0.08)",
  borderLight:  "rgba(255,255,255,0.14)",
  text:         "#f0ede8",
  textMid:      "rgba(240,237,232,0.6)",
  textDim:      "rgba(240,237,232,0.35)",
  textFaint:    "rgba(240,237,232,0.15)",
  red:          "#e07070",
  redFade:      "rgba(224,112,112,0.08)",
  warn:         "#e8c44a",
  warnFade:     "rgba(232,196,74,0.12)",
  warnBorder:   "rgba(232,196,74,0.35)",
  sans:         "'DM Sans', sans-serif",
  mono:         "'DM Mono', monospace",
  radius:       "10px",
  shadow:       "0 16px 48px rgba(0,0,0,0.6)",
};

const S = {
  input:      { width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", borderRadius:"8px", color:T.text, padding:"10px 13px", fontSize:"14px", outline:"none", fontFamily:T.sans, border:`1px solid ${T.primaryBorder}` },
  btnPrimary: { background:T.primary, border:"none", color:T.text, fontWeight:"700", borderRadius:"8px", padding:"11px", cursor:"pointer", fontSize:"13px", fontFamily:T.sans },
  btnGhost:   { background:"none", border:`1px solid ${T.borderLight}`, color:T.textMid, borderRadius:"8px", padding:"11px", cursor:"pointer", fontSize:"13px", fontFamily:T.sans },
  btnDanger:  { background:"none", border:"none", color:T.red, padding:"9px 12px", borderRadius:"7px", cursor:"pointer", fontSize:"13px", fontFamily:T.sans, textAlign:"left", width:"100%", display:"flex", alignItems:"center", gap:"9px" },
  overlay:    { position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(5px)", padding:"16px" },
  card:       { background:T.surface, border:`1px solid ${T.primaryBorder}`, borderRadius:"14px", padding:"22px", width:"100%", maxWidth:"440px", boxShadow:T.shadow, maxHeight:"92vh", overflowY:"auto" },
  mHead:      { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" },
  mLabel:     { fontSize:"11px", fontFamily:T.mono, color:T.accent, letterSpacing:"0.1em" },
  closeBtn:   { background:"none", border:"none", color:T.textDim, cursor:"pointer", fontSize:"22px", lineHeight:1, padding:"0 2px" },
  menuItem:   { display:"flex", alignItems:"center", gap:"9px", width:"100%", background:"none", border:"none", color:T.textMid, padding:"10px 13px", borderRadius:"7px", cursor:"pointer", fontSize:"13px", fontFamily:T.sans, textAlign:"left" },
  pill:       { fontSize:"11px", fontFamily:T.mono, color:T.accent, background:T.accentFade, borderRadius:"4px", padding:"2px 8px", whiteSpace:"nowrap" },
  fieldLabel: { fontSize:"10px", fontFamily:T.mono, color:T.accent, letterSpacing:"0.08em", marginBottom:"6px" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const WONDERBOOM_ROOMS = ["Kitchen","Dining Room","Living Room","Guest Bedroom","Björn's Bedroom","Main Bedroom","Guest Bathroom","Main Bathroom","Changing Room","Lapa","Boma","Wendy House","Garage","Laundry"].map((name,i)=>({id:`room-wb-${i}`,name,position:i}));
const ALLDAYS_ROOMS    = [{id:"room-ad-0",name:"Main House",position:0},{id:"room-ad-1",name:"Outbuildings",position:1},{id:"room-ad-2",name:"Land / Garden",position:2}];
const BELABELA_ROOMS   = [{id:"room-bb-0",name:"Main House",position:0},{id:"room-bb-1",name:"Outbuildings",position:1},{id:"room-bb-2",name:"Land / Garden",position:2}];

const mkSvc = (id,name,freqMonths,notes="") => ({id,name,freqMonths,notes,lastDone:"",nextDue:"",history:[]});

const COMMON_SVCS = [
  mkSvc("svc-pool-float",   "Pool Floaters / Chemical Check",   1,  "Check and balance chlorine, pH, alkalinity"),
  mkSvc("svc-pool-weir",    "Pool Weir / Skimmer Basket",       0.25,"Clear debris weekly"),
  mkSvc("svc-pool-pump",    "Pool Pump Service",                12, "Full pump and filter service"),
  mkSvc("svc-water-filter", "Water Filters",                    6,  "Replace filter cartridges"),
  mkSvc("svc-aircon-clean", "Aircon Filter Clean",              6,  "Clean or replace filters"),
  mkSvc("svc-aircon-full",  "Aircon Full Service",              12, "Professional service"),
  mkSvc("svc-pest",         "Pest Control",                     6,  "Full property treatment"),
  mkSvc("svc-alarm-test",   "Alarm System Test",                6,  "Test all zones and sensors"),
  mkSvc("svc-alarm-batt",   "Alarm Battery Replacement",        12, "Backup battery check"),
  mkSvc("svc-smoke",        "Smoke Detector Battery",           12, "Replace batteries"),
  mkSvc("svc-extinguisher", "Fire Extinguisher Check",          12, "Inspect and recharge if needed"),
  mkSvc("svc-electrical",   "Electrical Compliance Check",      24, "COC inspection"),
];

const WB_SVCS = [...COMMON_SVCS,
  mkSvc("svc-fireplace",  "Fireplace / Chimney Sweep",  12, "Before winter season"),
  mkSvc("svc-geyser",     "Geyser Service",             24, "Full geyser inspection"),
  mkSvc("svc-car",        "Car Service",                12, "Or every 15,000km"),
  mkSvc("svc-irrigation", "Garden Irrigation Service",   6, "Check and adjust heads"),
  mkSvc("svc-roof-wb",    "Roof Inspection",            24, "Check for leaks and damage"),
];

const farmSvcs = (p) => [...COMMON_SVCS,
  mkSvc(`${p}-borehole`,  "Borehole Pump Check",    12, "Test pump output and pressure"),
  mkSvc(`${p}-septic`,    "Septic Tank Pump-Out",   30, "Every 2-3 years"),
  mkSvc(`${p}-generator`, "Generator Service",      12, "Oil, filters, load test"),
  mkSvc(`${p}-fencing`,   "Fencing Inspection",      6, "Check and repair boundary fencing"),
  mkSvc(`${p}-roof`,      "Roof Inspection",         24, "Check for leaks and damage"),
  mkSvc(`${p}-car`,       "Car / Bakkie Service",    12, "Or every 15,000km"),
];

const SEED_PROPERTIES = [
  { id:"prop-wonderboom", name:"Wonderboom", icon:"🏠", rooms:WONDERBOOM_ROOMS, services:WB_SVCS,
    tasks:[
      { id:"painting-bedroom", name:"Paint the Bedroom", room:"Main Bedroom", notes:"", dueDate:"", subtasks:[
        {id:"pb-1",name:"Remove all hangings from the walls",completed:false,materials:[]},
        {id:"pb-2",name:"Patch the walls",completed:false,materials:[]},
        {id:"pb-3",name:"Paint the ceilings",completed:false,materials:[]},
        {id:"pb-4",name:"Paint the walls",completed:false,materials:[]},
        {id:"pb-5",name:"Paint the trims",completed:false,materials:[]},
        {id:"pb-6",name:"Paint the doors",completed:false,materials:[]},
      ]},
      {id:"fix-cornice",name:"Fix the Cornice on the Veranda",room:"Lapa",notes:"",dueDate:"",subtasks:[]},
      {id:"remove-security",name:"Remove Old Security Camera and Alarm Wiring",room:"",notes:"",dueDate:"",subtasks:[]},
      {id:"swimming-pool",name:"Swimming Pool",room:"",notes:"",dueDate:"",subtasks:[
        {id:"sp-1",name:"Timer for the pool light",completed:false,materials:[]},
      ]},
      {id:"remove-rubble",name:"Remove Building Rubble",room:"",notes:"",dueDate:"",subtasks:[
        {id:"rbr-1",name:"Stone removal",completed:false,materials:[]},
        {id:"rbr-2",name:"Brick removal",completed:false,materials:[]},
      ]},
    ],
  },
  { id:"prop-alldays",  name:"Alldays",  icon:"🌾", rooms:ALLDAYS_ROOMS,  tasks:[], services:farmSvcs("ad") },
  { id:"prop-belabela", name:"Bela-Bela",icon:"🌿", rooms:BELABELA_ROOMS, tasks:[], services:farmSvcs("bb") },
];

// ─────────────────────────────────────────────────────────────────────────────
// UNITS
// ─────────────────────────────────────────────────────────────────────────────
const UNIT_DATA = [
  {label:"mm",      group:"Metric",       aliases:["millimeter","millimetre","milli","millimeters","millimetres"]},
  {label:"mm²",     group:"Metric",       aliases:["mm2","square millimeter","square millimetre","sq mm","sqmm"]},
  {label:"mm³",     group:"Metric",       aliases:["mm3","cubic millimeter","cubic millimetre","cubic mm"]},
  {label:"m",       group:"Metric",       aliases:["meter","metre","meters","metres","linear"]},
  {label:"m²",      group:"Metric",       aliases:["m2","square meter","square metre","sqm","sq m","area","square"]},
  {label:"m³",      group:"Metric",       aliases:["m3","cube","cubes","cubic","cubic meter","sand","stone","gravel","fill"]},
  {label:"ml",      group:"Metric",       aliases:["milliliter","millilitre","milliliters","millilitres"]},
  {label:"L",       group:"Metric",       aliases:["liter","litre","liters","litres","liquid","l"]},
  {label:"g",       group:"Metric",       aliases:["gram","grams","gramme","grammes"]},
  {label:"kg",      group:"Metric",       aliases:["kilogram","kilograms","kilogramme","kilo","kilos"]},
  {label:"pcs",     group:"Site & Trade", aliases:["pieces","piece","each","items","item","units","unit","pc","number","no","qty"]},
  {label:"Box 50",  group:"Site & Trade", aliases:["box","boxes","box50","carton","50"]},
  {label:"Box 100", group:"Site & Trade", aliases:["box","boxes","box100","carton","100"]},
  {label:"bag",     group:"Site & Trade", aliases:["bags","sack","sacks"]},
  {label:"Roll 100",group:"Site & Trade", aliases:["roll","rolls","reel","roll100"]},
  {label:"Roll 500",group:"Site & Trade", aliases:["roll","rolls","reel","roll500"]},
  {label:"packet",  group:"Site & Trade", aliases:["packets","pack","packs"]},
  {label:"pallet",  group:"Site & Trade", aliases:["pallets","skid","skids"]},
  {label:"sheet",   group:"Site & Trade", aliases:["sheets","board","boards","panel","panels"]},
  {label:"pair",    group:"Site & Trade", aliases:["pairs","double","doubles"]},
  {label:"bucket",  group:"Site & Trade", aliases:["buckets","pail","pails"]},
  {label:"length",  group:"Site & Trade", aliases:["lengths","bar","bars","stick","sticks","rod","rods"]},
  {label:"set",     group:"Site & Trade", aliases:["sets","kit","kits"]},
  {label:"Other",   group:"Other",        aliases:["custom","specify","other"]},
];
const norm = s => s.toLowerCase().trim().replace(/²/g,"2").replace(/³/g,"3").replace(/¹/g,"1");
const filterUnits = search => {
  if (!search.trim()) return UNIT_DATA;
  const q = norm(search);
  return UNIT_DATA.filter(u => norm(u.label).includes(q) || u.aliases.some(a => norm(a).includes(q)));
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2,9) + Date.now().toString(36);
const calcNextDue = (lastDone, freqMonths) => {
  if (!lastDone || !freqMonths) return "";
  const d = new Date(lastDone);
  d.setMonth(d.getMonth() + Math.round(freqMonths));
  return d.toISOString().split("T")[0];
};
const daysUntil = dateStr => {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
};
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"}) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const Ctx = createContext(null);
const useCtx = () => useContext(Ctx);

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ic = {
  check:   () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:    (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevron: (open) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.2s",flexShrink:0}}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="8" r="1.4" fill="currentColor"/></svg>,
  pencil:  () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M4 3V2h5v1M2 3l1 8h7l1-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  up:      () => <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  down:    () => <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  home:    () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10L10 2l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="10" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  tool:    () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="10" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="12" height="2" rx="1" fill="currentColor"/></svg>,
  wrench:  () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M14.5 3a3.5 3.5 0 00-3.45 4.1L4 14.2 5.8 16l7.1-7.05A3.5 3.5 0 1014.5 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cart:    () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M1 1h2l2.5 10h10l2-7H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/></svg>,
  undo:    () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 1 1 1.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M2 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  note:    () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4h8M3 7h8M3 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  cal:     () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h12M4 1v2M10 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  bell:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1a4 4 0 014 4v3l1 2H2l1-2V5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  backup:  () => <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  back:    () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function UndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",zIndex:300,background:T.surface,border:`1px solid ${T.borderLight}`,borderRadius:T.radius,padding:"10px 16px",display:"flex",alignItems:"center",gap:"12px",boxShadow:T.shadow,whiteSpace:"nowrap",maxWidth:"90vw"}}>
      <span style={{fontSize:"13px",color:T.textMid,fontFamily:T.sans,overflow:"hidden",textOverflow:"ellipsis"}}>{message}</span>
      <button onClick={onUndo} style={{display:"flex",alignItems:"center",gap:"5px",background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,color:T.accent,borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontFamily:T.sans,fontWeight:"700",flexShrink:0}}>
        <Ic.undo /> Undo
      </button>
    </div>
  );
}

function ConfirmDelete({ label, onConfirm, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxWidth:"300px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{...S.closeBtn,display:"block",marginLeft:"auto",marginBottom:"4px"}}>×</button>
        <div style={{fontSize:"28px",marginBottom:"10px"}}>🗑️</div>
        <div style={{fontSize:"14px",fontWeight:"700",color:T.text,fontFamily:T.sans,marginBottom:"6px"}}>Delete "{label}"?</div>
        <div style={{fontSize:"12px",color:T.textDim,fontFamily:T.sans,marginBottom:"20px"}}>You'll have 5 seconds to undo.</div>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={()=>{onConfirm();onClose();}} style={{flex:2,background:T.red,border:"none",color:"#fff",fontWeight:"700",borderRadius:"8px",padding:"11px",cursor:"pointer",fontSize:"13px",fontFamily:T.sans}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function RenameModal({ label, currentName, onSave, onClose }) {
  const [val, setVal] = useState(currentName);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 60); }, []);
  const save = () => { if (val.trim()) { onSave(val.trim()); onClose(); } };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>{label}</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")onClose();}} style={{...S.input,marginBottom:"16px"}} />
        <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={save} style={S.btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DotsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div style={{position:"relative",flexShrink:0}} ref={ref} onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();setOpen(!open);}} style={{background:open?T.primaryFade:"none",border:open?`1px solid ${T.primaryBorder}`:"1px solid transparent",cursor:"pointer",color:open?T.accent:T.textDim,borderRadius:"6px",display:"flex",alignItems:"center",padding:"4px 6px",transition:"all 0.15s"}}>
        <Ic.dots />
      </button>
      {open && (
        <div style={{position:"absolute",right:0,top:"calc(100% + 5px)",zIndex:150,background:"#1e2b27",border:`1px solid ${T.borderLight}`,borderRadius:T.radius,padding:"6px",minWidth:"160px",boxShadow:T.shadow}}>
          {items.map((item,i) => item==="divider"
            ? <div key={i} style={{height:"1px",background:T.border,margin:"4px 0"}} />
            : <button key={i} onClick={()=>{item.action();setOpen(false);}} style={{...S.menuItem,color:item.danger?T.red:T.textMid}}
                onMouseEnter={e=>e.currentTarget.style.background=item.danger?T.redFade:T.primaryFade}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >{item.icon} {item.label}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT PICKER
// ─────────────────────────────────────────────────────────────────────────────
function UnitPicker({ value, onChange, error, searchId }) {
  const [search, setSearch] = useState("");
  const [other, setOther] = useState("");
  const results = filterUnits(search);
  const select = lbl => { onChange(lbl); if (lbl !== "Other") setSearch(""); };
  return (
    <div>
      {value && (
        <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
          <div style={{flex:1,background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,borderRadius:"6px",padding:"7px 12px",fontSize:"13px",fontFamily:T.sans,color:T.accent,fontWeight:"700"}}>✓ {value.startsWith("__other__:") ? value.replace("__other__:","") : value}</div>
          <button onClick={()=>{onChange("");setSearch("");setOther("");}} style={{background:"none",border:`1px solid ${T.borderLight}`,color:T.textDim,borderRadius:"6px",padding:"7px 10px",cursor:"pointer",fontSize:"12px",fontFamily:T.sans}}>Change</button>
        </div>
      )}
      <input id={searchId} tabIndex={3} value={search} onChange={e=>setSearch(e.target.value)} placeholder={value?"Search to change…":"Search units — mm, L, bag, m³…"} style={{...S.input,border:`1px solid ${error?T.red:T.primaryBorder}`,marginBottom:"8px"}} />
      {(search.trim()||!value) && (
        <div style={{maxHeight:"190px",overflowY:"auto",borderRadius:"7px",border:`1px solid ${error?"rgba(224,112,112,0.3)":T.border}`,background:"rgba(0,0,0,0.25)"}}>
          {results.length===0 && <div style={{padding:"14px",fontSize:"13px",color:T.textDim,fontFamily:T.sans,textAlign:"center"}}>No match — try Other</div>}
          {results.map(u=>{
            const sel=value===u.label;
            return <button key={u.label} onMouseDown={e=>{e.preventDefault();select(u.label);}} onClick={()=>select(u.label)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:sel?T.primaryFade:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,color:sel?T.accent:"rgba(240,237,232,0.85)",padding:"13px 14px",cursor:"pointer",fontSize:"15px",fontFamily:T.sans,fontWeight:sel?"700":"400",minHeight:"48px"}}>
              <span>{u.label}</span><span style={{fontSize:"10px",color:sel?"rgba(149,213,178,0.5)":T.textFaint,fontFamily:T.mono}}>{u.group}</span>
            </button>;
          })}
        </div>
      )}
      {value==="Other" && <input value={other} onChange={e=>{setOther(e.target.value);onChange("__other__:"+e.target.value);}} placeholder="Type your custom unit…" style={{...S.input,marginTop:"8px"}} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL MODAL + QTY/UNIT EDIT
// ─────────────────────────────────────────────────────────────────────────────
function MaterialModal({ onSave, onClose }) {
  const [name,setName]=useState(""); const [qty,setQty]=useState(""); const [unit,setUnit]=useState("");
  const [errors,setErrors]=useState({}); const [warnQty,setWarnQty]=useState(false);
  const nameRef=useRef(null);
  useEffect(()=>{setTimeout(()=>nameRef.current?.focus(),60);},[]);
  const resolved=unit.startsWith("__other__:")?unit.replace("__other__:",""):unit;
  const trySubmit=()=>{
    const e={};
    if(!name.trim())e.name="Name required.";
    if(!resolved)e.unit="Please select a unit.";
    if(Object.keys(e).length>0){setErrors(e);return;}
    if(!qty.trim()||isNaN(parseFloat(qty))||parseFloat(qty)===0){setWarnQty(true);return;}
    onSave({name:name.trim(),qty:qty.trim(),unit:resolved});onClose();
  };
  const doSave=()=>{
    const e={};
    if(!name.trim())e.name="Name required.";
    if(!resolved)e.unit="Please select a unit.";
    if(Object.keys(e).length>0){setErrors(e);return;}
    onSave({name:name.trim(),qty:qty.trim(),unit:resolved});onClose();
  };
  const fld=(lbl,child,err)=><div style={{marginBottom:"14px"}}><div style={{...S.fieldLabel,color:err?T.red:T.accent}}>{lbl}{err?" — "+err:""}</div>{child}</div>;
  if(warnQty) return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxWidth:"300px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{...S.closeBtn,display:"block",marginLeft:"auto"}}>×</button>
        <div style={{fontSize:"24px",marginBottom:"10px"}}>⚠️</div>
        <div style={{fontSize:"14px",color:T.text,fontFamily:T.sans,marginBottom:"6px",fontWeight:"600"}}>No quantity entered</div>
        <div style={{fontSize:"13px",color:T.textDim,fontFamily:T.sans,marginBottom:"20px"}}>Item saved with ⚠️ flag to fill in later.</div>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>setWarnQty(false)} style={{...S.btnGhost,flex:1}}>Go back</button>
          <button onClick={doSave} style={{...S.btnPrimary,flex:2}}>Save anyway</button>
        </div>
      </div>
    </div>
  );
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>ADD MATERIAL</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        {fld("MATERIAL NAME",<input ref={nameRef} value={name} onChange={e=>{setName(e.target.value);setErrors(p=>({...p,name:""}));}} placeholder="e.g. River sand" tabIndex={1} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();document.getElementById("mat-qty")?.focus();}}} style={{...S.input,border:`1px solid ${errors.name?T.red:T.primaryBorder}`}}/>,errors.name)}
        {fld("QUANTITY (optional)",<input id="mat-qty" value={qty} onChange={e=>setQty(e.target.value)} placeholder="e.g. 2.5" type="number" min="0" step="any" tabIndex={2} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();document.getElementById("mat-unit-search")?.focus();}}} style={S.input}/>,null)}
        {fld("UNIT OF MEASUREMENT",<UnitPicker value={unit} onChange={v=>{setUnit(v);setErrors(p=>({...p,unit:""}));}} error={errors.unit} searchId="mat-unit-search"/>,errors.unit)}
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button>
          <button onClick={trySubmit} style={{...S.btnPrimary,flex:2}}>Add Material</button>
        </div>
      </div>
    </div>
  );
}

function QtyEditModal({ current, onSave, onClose }) {
  const [val,setVal]=useState(current||""); const ref=useRef(null);
  useEffect(()=>{setTimeout(()=>ref.current?.focus(),60);},[]);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxWidth:"320px"}} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>EDIT QUANTITY</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} type="number" min="0" step="any" placeholder="e.g. 2.5" style={{...S.input,marginBottom:"6px"}} onKeyDown={e=>{if(e.key==="Enter"){onSave(val.trim());onClose();}if(e.key==="Escape")onClose();}}/>
        <div style={{fontSize:"12px",color:T.textDim,fontFamily:T.sans,marginBottom:"16px"}}>Leave blank to flag for later.</div>
        <div style={{display:"flex",gap:"8px"}}><button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={()=>{onSave(val.trim());onClose();}} style={{...S.btnPrimary,flex:2}}>Save</button></div>
      </div>
    </div>
  );
}

function UnitEditModal({ current, onSave, onClose }) {
  const [unit,setUnit]=useState(current||"");
  const resolved=unit.startsWith("__other__:")?unit.replace("__other__:",""):unit;
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxWidth:"420px",maxHeight:"85vh"}} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>EDIT UNIT</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <UnitPicker value={unit} onChange={setUnit} />
        <div style={{display:"flex",gap:"8px",marginTop:"14px"}}><button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={()=>{if(resolved.trim()){onSave(resolved.trim());onClose();}}} style={{...S.btnPrimary,flex:2}}>Save</button></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL ROW
// ─────────────────────────────────────────────────────────────────────────────
function MaterialRow({ m, onToggle, onRename, onEditQty, onEditUnit, onDelete }) {
  const [editQty,setEditQty]=useState(false); const [editUnit,setEditUnit]=useState(false);
  const [confirming,setConfirming]=useState(false); const [renaming,setRenaming]=useState(false);
  const missingQty=!m.qty||m.qty==="0"||parseFloat(m.qty)===0; const missingUnit=!m.unit;
  return (
    <>
      {renaming && <RenameModal label="RENAME MATERIAL" currentName={m.name} onSave={onRename} onClose={()=>setRenaming(false)}/>}
      {editQty && <QtyEditModal current={m.qty} onSave={onEditQty} onClose={()=>setEditQty(false)}/>}
      {editUnit && <UnitEditModal current={m.unit} onSave={onEditUnit} onClose={()=>setEditUnit(false)}/>}
      {confirming && <ConfirmDelete label={m.name} onConfirm={onDelete} onClose={()=>setConfirming(false)}/>}
      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 4px",borderRadius:"6px",background:m.acquired?T.primaryFade:"transparent",marginBottom:"3px"}}>
        <button onClick={onToggle} style={{width:"18px",height:"18px",borderRadius:"3px",flexShrink:0,background:m.acquired?T.primary:"transparent",border:m.acquired?`2px solid ${T.primary}`:"2px solid rgba(255,255,255,0.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.text,outline:"none",padding:0}}>{m.acquired&&<Ic.check/>}</button>
        <span style={{flex:1,fontSize:"13px",color:m.acquired?T.textDim:"rgba(240,237,232,0.85)",textDecoration:m.acquired?"line-through":"none",fontFamily:T.sans}}>{m.name}</span>
        <button onClick={()=>!m.acquired&&setEditQty(true)} style={{display:"flex",alignItems:"center",gap:"3px",background:(missingQty||missingUnit)&&!m.acquired?T.warnFade:T.accentFade,border:`1px solid ${(missingQty||missingUnit)&&!m.acquired?T.warnBorder:T.primaryBorder}`,borderRadius:"4px",padding:"2px 7px",cursor:m.acquired?"default":"pointer",fontSize:"11px",fontFamily:T.mono,whiteSpace:"nowrap",color:m.acquired?T.textFaint:(missingQty||missingUnit)?T.warn:T.accent}}>
          {(missingQty||missingUnit)&&!m.acquired&&"⚠️ "}{m.qty&&!missingQty?m.qty:"—"} {m.unit||"no unit"}
        </button>
        <DotsMenu items={[
          {icon:<Ic.pencil/>,label:"Rename",action:()=>setRenaming(true)},
          {icon:<Ic.pencil/>,label:"Edit Quantity",action:()=>setEditQty(true)},
          {icon:<Ic.pencil/>,label:"Edit Unit",action:()=>setEditUnit(true)},
          "divider",
          {icon:<Ic.trash/>,label:"Delete",danger:true,action:()=>setConfirming(true)},
        ]}/>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBTASK ROW
// ─────────────────────────────────────────────────────────────────────────────
function SubtaskRow({ taskId, subtask, propId }) {
  const {updSubtask,delSubtask,addMaterial,updMaterial,delMaterial}=useCtx();
  const [matOpen,setMatOpen]=useState(false); const [addingMat,setAddingMat]=useState(false);
  const [renaming,setRenaming]=useState(false); const [confirming,setConfirming]=useState(false);
  const acq=subtask.materials.filter(m=>m.acquired).length; const tot=subtask.materials.length;
  return (
    <div style={{borderLeft:`2px solid ${subtask.completed?"rgba(45,106,79,0.5)":T.border}`,marginLeft:"6px",paddingLeft:"14px",marginBottom:"8px",transition:"border-color 0.2s"}}>
      {renaming&&<RenameModal label="RENAME SUBTASK" currentName={subtask.name} onSave={n=>updSubtask(propId,taskId,subtask.id,{name:n})} onClose={()=>setRenaming(false)}/>}
      {confirming&&<ConfirmDelete label={subtask.name} onConfirm={()=>delSubtask(propId,taskId,subtask.id)} onClose={()=>setConfirming(false)}/>}
      {addingMat&&<MaterialModal onSave={mat=>{addMaterial(propId,taskId,subtask.id,mat);setAddingMat(false);}} onClose={()=>setAddingMat(false)}/>}
      <div style={{display:"flex",alignItems:"center",gap:"9px",padding:"5px 0"}}>
        <button onClick={()=>updSubtask(propId,taskId,subtask.id,{completed:!subtask.completed})} style={{width:"20px",height:"20px",flexShrink:0,borderRadius:"50%",background:subtask.completed?T.primary:"transparent",border:subtask.completed?`2px solid ${T.primary}`:"2px solid rgba(255,255,255,0.22)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.text,transition:"all 0.18s",outline:"none",padding:0}}>{subtask.completed&&<Ic.check/>}</button>
        <span style={{flex:1,fontSize:"14px",fontFamily:T.sans,color:subtask.completed?T.textDim:"rgba(240,237,232,0.9)",textDecoration:subtask.completed?"line-through":"none"}}>{subtask.name}</span>
        <button onClick={()=>setMatOpen(!matOpen)} style={{display:"flex",alignItems:"center",gap:"4px",background:matOpen?T.primaryFade:T.surface2,border:`1px solid ${matOpen?T.primaryBorder:T.border}`,borderRadius:"4px",padding:"3px 7px",cursor:"pointer",color:tot>0?(acq===tot?T.accent:T.textMid):T.textFaint,fontSize:"11px",fontFamily:T.mono,whiteSpace:"nowrap"}}>
          {tot>0?`${acq}/${tot}`:"mats"} {Ic.chevron(matOpen)}
        </button>
        <DotsMenu items={[{icon:<Ic.pencil/>,label:"Rename",action:()=>setRenaming(true)},"divider",{icon:<Ic.trash/>,label:"Delete",danger:true,action:()=>setConfirming(true)}]}/>
      </div>
      {matOpen&&(
        <div style={{background:"rgba(0,0,0,0.2)",borderRadius:"8px",padding:"10px 12px",margin:"4px 0 8px 0",border:`1px solid ${T.border}`}}>
          <div style={{...S.fieldLabel,marginBottom:"8px"}}>MATERIALS</div>
          {subtask.materials.length===0&&<div style={{fontSize:"12px",color:T.textFaint,fontStyle:"italic",marginBottom:"8px",fontFamily:T.sans}}>None yet</div>}
          {subtask.materials.map(m=><MaterialRow key={m.id} m={m}
            onToggle={()=>updMaterial(propId,taskId,subtask.id,m.id,{acquired:!m.acquired})}
            onRename={n=>updMaterial(propId,taskId,subtask.id,m.id,{name:n})}
            onEditQty={q=>updMaterial(propId,taskId,subtask.id,m.id,{qty:q})}
            onEditUnit={u=>updMaterial(propId,taskId,subtask.id,m.id,{unit:u})}
            onDelete={()=>delMaterial(propId,taskId,subtask.id,m.id)}
          />)}
          <button onClick={()=>setAddingMat(true)} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"none",border:`1px dashed ${T.border}`,color:T.textDim,fontSize:"12px",borderRadius:"5px",padding:"5px 10px",cursor:"pointer",fontFamily:T.sans,marginTop:"6px"}}>
            {Ic.plus(11)} Add material
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────────────────────────────────────
function TaskDetailsModal({ task, rooms, onSave, onClose }) {
  const [notes,setNotes]=useState(task.notes||""); const [dueDate,setDueDate]=useState(task.dueDate||""); const [room,setRoom]=useState(task.room||"");
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>TASK DETAILS</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <div style={{fontSize:"13px",color:T.textMid,fontFamily:T.sans,marginBottom:"16px",fontStyle:"italic"}}>{task.name}</div>
        <div style={{marginBottom:"12px"}}><div style={S.fieldLabel}>ROOM / AREA</div>
          <select value={room} onChange={e=>setRoom(e.target.value)} style={{...S.input,appearance:"none",cursor:"pointer",colorScheme:"dark"}}>
            <option value="">— None —</option>
            {rooms.map(r=><option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div style={{marginBottom:"12px"}}><div style={S.fieldLabel}>NOTES</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Instructions, dimensions, context…" rows={3} style={{...S.input,resize:"none"}}/></div>
        <div style={{marginBottom:"20px"}}><div style={S.fieldLabel}>DUE DATE</div><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{...S.input,colorScheme:"dark"}}/></div>
        <div style={{display:"flex",gap:"8px"}}><button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={()=>{onSave({notes,dueDate,room});onClose();}} style={{...S.btnPrimary,flex:2}}>Save</button></div>
      </div>
    </div>
  );
}

function TaskCard({ task, propId, rooms, isFirst, isLast }) {
  const {updTask,delTask,addSubtask,moveTask}=useCtx();
  const [expanded,setExpanded]=useState(false); const [showDetails,setShowDetails]=useState(false);
  const [renaming,setRenaming]=useState(false); const [confirming,setConfirming]=useState(false);
  const [addingSub,setAddingSub]=useState(false); const [newSub,setNewSub]=useState("");
  const allDone=task.subtasks.length>0&&task.subtasks.every(s=>s.completed);
  const doneCount=task.subtasks.filter(s=>s.completed).length;
  const progress=task.subtasks.length>0?Math.round((doneCount/task.subtasks.length)*100):0;
  const hasMeta=task.notes||task.dueDate||task.room;
  const submitSub=()=>{if(newSub.trim()){addSubtask(propId,task.id,newSub.trim());setNewSub("");setAddingSub(false);}};
  const MoveBtn=({dir,disabled})=><button onClick={e=>{e.stopPropagation();if(!disabled)moveTask(propId,task.id,dir);}} style={{background:"none",border:"none",padding:"2px 3px",cursor:disabled?"default":"pointer",display:"flex",alignItems:"center",color:disabled?T.textFaint:T.textDim,transition:"color 0.15s"}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=disabled?T.textFaint:T.textDim;}}>{dir===-1?<Ic.up/>:<Ic.down/>}</button>;
  return (
    <>
      {renaming&&<RenameModal label="RENAME TASK" currentName={task.name} onSave={n=>updTask(propId,task.id,{name:n})} onClose={()=>setRenaming(false)}/>}
      {confirming&&<ConfirmDelete label={task.name} onConfirm={()=>delTask(propId,task.id)} onClose={()=>setConfirming(false)}/>}
      {showDetails&&<TaskDetailsModal task={task} rooms={rooms} onSave={d=>updTask(propId,task.id,d)} onClose={()=>setShowDetails(false)}/>}
      <div style={{background:T.surface2,border:`1px solid ${allDone?"rgba(45,106,79,0.5)":T.border}`,borderRadius:"12px",marginBottom:"10px",overflow:"hidden",transition:"all 0.3s"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"13px 14px",cursor:"pointer",borderBottom:expanded?`1px solid ${T.border}`:"none"}} onClick={()=>setExpanded(!expanded)}>
          <div style={{display:"flex",flexDirection:"column",gap:"1px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <MoveBtn dir={-1} disabled={isFirst}/><MoveBtn dir={1} disabled={isLast}/>
          </div>
          <div style={{width:"9px",height:"9px",borderRadius:"50%",flexShrink:0,background:allDone?T.primary:"rgba(255,255,255,0.12)",boxShadow:allDone?`0 0 8px ${T.primary}`:"none",transition:"all 0.3s"}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:"700",color:allDone?T.textDim:T.text,textDecoration:allDone?"line-through":"none",fontFamily:T.sans,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.name}</div>
            {hasMeta&&<div style={{display:"flex",gap:"8px",marginTop:"3px",flexWrap:"wrap"}}>
              {task.room&&<span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono}}>📍 {task.room}</span>}
              {task.dueDate&&<span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono,display:"flex",alignItems:"center",gap:"2px"}}><Ic.cal/> {task.dueDate}</span>}
              {task.notes&&<span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono,display:"flex",alignItems:"center",gap:"2px"}}><Ic.note/> note</span>}
            </div>}
          </div>
          {task.subtasks.length>0&&<span style={{fontSize:"11px",fontFamily:T.mono,color:allDone?T.accent:T.textDim,background:T.surface2,borderRadius:"4px",padding:"2px 7px"}}>{doneCount}/{task.subtasks.length}</span>}
          <DotsMenu items={[{icon:<Ic.pencil/>,label:"Rename",action:()=>setRenaming(true)},{icon:<Ic.note/>,label:"Details / Notes",action:()=>setShowDetails(true)},"divider",{icon:<Ic.trash/>,label:"Delete",danger:true,action:()=>setConfirming(true)}]}/>
          <div style={{color:T.textDim}}>{Ic.chevron(expanded)}</div>
        </div>
        {task.subtasks.length>0&&<div style={{height:"2px",background:"rgba(255,255,255,0.04)"}}><div style={{height:"100%",background:T.primary,width:`${progress}%`,transition:"width 0.4s"}}/></div>}
        {expanded&&(
          <div style={{padding:"14px 16px"}}>
            {task.notes&&<div style={{background:"rgba(0,0,0,0.15)",border:`1px solid ${T.border}`,borderRadius:"7px",padding:"10px 12px",marginBottom:"12px",fontSize:"12px",color:T.textMid,fontFamily:T.sans,lineHeight:"1.6"}}>{task.notes}</div>}
            {task.subtasks.length===0&&<div style={{fontSize:"12px",color:T.textFaint,fontFamily:T.sans,marginBottom:"10px",fontStyle:"italic"}}>No subtasks yet</div>}
            {task.subtasks.map(sub=><SubtaskRow key={sub.id} taskId={task.id} subtask={sub} propId={propId}/>)}
            <div style={{marginTop:"12px"}}>
              {addingSub?(
                <div style={{display:"flex",gap:"6px"}}>
                  <input autoFocus value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitSub();if(e.key==="Escape"){setAddingSub(false);setNewSub("");}}} placeholder="Subtask name…" style={{...S.input,flex:1,minWidth:0}}/>
                  <button onClick={submitSub} style={{...S.btnPrimary,padding:"7px 14px"}}>Add</button>
                  <button onClick={()=>{setAddingSub(false);setNewSub("");}} style={{...S.btnGhost,padding:"7px 10px"}}>✕</button>
                </div>
              ):(
                <button onClick={()=>setAddingSub(true)} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"none",border:`1px dashed ${T.primary}`,color:T.accent,fontSize:"12px",borderRadius:"5px",padding:"5px 11px",cursor:"pointer",fontFamily:T.sans}}>
                  {Ic.plus(11)} Add subtask
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function RoomsTab({ propId, rooms }) {
  const {updProp}=useCtx();
  const [adding,setAdding]=useState(false); const [newRoom,setNewRoom]=useState("");
  const [renaming,setRenaming]=useState(null); const [confirming,setConfirming]=useState(null);
  const save=r=>updProp(propId,{rooms:r});
  const addRoom=()=>{if(!newRoom.trim())return;save([...rooms,{id:genId(),name:newRoom.trim(),position:rooms.length}]);setNewRoom("");setAdding(false);};
  const move=(id,dir)=>{const idx=rooms.findIndex(r=>r.id===id),j=idx+dir;if(j<0||j>=rooms.length)return;const n=[...rooms];[n[idx],n[j]]=[n[j],n[idx]];save(n.map((r,i)=>({...r,position:i})));};
  const rename=(id,name)=>save(rooms.map(r=>r.id===id?{...r,name}:r));
  const del=id=>save(rooms.filter(r=>r.id!==id));
  return (
    <div>
      {renaming&&<RenameModal label="RENAME ROOM" currentName={renaming.name} onSave={n=>rename(renaming.id,n)} onClose={()=>setRenaming(null)}/>}
      {confirming&&<ConfirmDelete label={confirming.name} onConfirm={()=>del(confirming.id)} onClose={()=>setConfirming(null)}/>}
      <div style={{fontSize:"11px",fontFamily:T.mono,color:T.accent,letterSpacing:"0.08em",marginBottom:"14px"}}>ROOMS & AREAS</div>
      {rooms.map((room,idx)=>(
        <div key={room.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:"8px",marginBottom:"6px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
            <button onClick={()=>move(room.id,-1)} disabled={idx===0} style={{background:"none",border:"none",cursor:idx===0?"default":"pointer",color:idx===0?T.textFaint:T.textDim,padding:"1px",display:"flex"}}><Ic.up/></button>
            <button onClick={()=>move(room.id,1)} disabled={idx===rooms.length-1} style={{background:"none",border:"none",cursor:idx===rooms.length-1?"default":"pointer",color:idx===rooms.length-1?T.textFaint:T.textDim,padding:"1px",display:"flex"}}><Ic.down/></button>
          </div>
          <span style={{flex:1,fontSize:"14px",fontFamily:T.sans,color:T.textMid}}>📍 {room.name}</span>
          <DotsMenu items={[{icon:<Ic.pencil/>,label:"Rename",action:()=>setRenaming(room)},"divider",{icon:<Ic.trash/>,label:"Delete",danger:true,action:()=>setConfirming(room)}]}/>
        </div>
      ))}
      {adding?(
        <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
          <input autoFocus value={newRoom} onChange={e=>setNewRoom(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addRoom();if(e.key==="Escape")setAdding(false);}} placeholder="Room or area name…" style={{...S.input,flex:1,minWidth:0}}/>
          <button onClick={addRoom} style={{...S.btnPrimary,padding:"8px 14px"}}>Add</button>
          <button onClick={()=>setAdding(false)} style={{...S.btnGhost,padding:"8px 10px"}}>✕</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"none",border:`1px dashed ${T.primary}`,color:T.accent,fontSize:"12px",borderRadius:"6px",padding:"6px 14px",cursor:"pointer",fontFamily:T.sans,marginTop:"8px"}}>
          {Ic.plus(11)} Add Room / Area
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES TAB
// ─────────────────────────────────────────────────────────────────────────────
function ServiceCard({ svc, propId, onDelete }) {
  const {updService}=useCtx();
  const [logging,setLogging]=useState(false); const [logDate,setLogDate]=useState(new Date().toISOString().split("T")[0]); const [logNote,setLogNote]=useState(""); const [expanded,setExpanded]=useState(false);
  const [confirming,setConfirming]=useState(false);
  const days=daysUntil(svc.nextDue); const isOverdue=days!==null&&days<0; const isDueSoon=days!==null&&days>=0&&days<=30;
  const statusColor=isOverdue?T.red:isDueSoon?T.warn:T.accent;
  const statusText=isOverdue?`${Math.abs(days)}d overdue`:days===0?"Due today":days!==null?`in ${days}d`:"Not scheduled";
  const logService=()=>{
    const entry={date:logDate,note:logNote.trim(),id:genId()};
    updService(propId,svc.id,{lastDone:logDate,nextDue:calcNextDue(logDate,svc.freqMonths),history:[entry,...(svc.history||[])]});
    setLogging(false);setLogNote("");
  };
  return (
    <>
      {confirming&&<ConfirmDelete label={svc.name} onConfirm={onDelete} onClose={()=>setConfirming(false)}/>}
      <div style={{background:T.surface2,border:`1px solid ${isOverdue?T.red:isDueSoon?T.warnBorder:T.border}`,borderRadius:"10px",marginBottom:"8px",overflow:"hidden",transition:"border-color 0.3s"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:"600",color:T.text,fontFamily:T.sans,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc.name}</div>
            <div style={{display:"flex",gap:"8px",marginTop:"3px",flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono}}>Every {svc.freqMonths<1?"week":svc.freqMonths<12?`${svc.freqMonths}mo`:`${svc.freqMonths/12}yr`}</span>
              {svc.lastDone&&<span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono}}>Last: {fmtDate(svc.lastDone)}</span>}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"3px",flexShrink:0}}>
            <span style={{fontSize:"11px",fontFamily:T.mono,color:statusColor,background:`${statusColor}18`,border:`1px solid ${statusColor}40`,borderRadius:"4px",padding:"2px 8px"}}>{statusText}</span>
            {svc.nextDue&&<span style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono}}>Due {fmtDate(svc.nextDue)}</span>}
          </div>
          <DotsMenu items={[
            {icon:<Ic.bell/>,label:"Log Service",action:()=>{setExpanded(true);setLogging(true);}},
            "divider",
            {icon:<Ic.trash/>,label:"Remove Service",danger:true,action:()=>setConfirming(true)},
          ]}/>
          <div style={{color:T.textDim}} onClick={e=>{e.stopPropagation();setExpanded(!expanded);}}>{Ic.chevron(expanded)}</div>
        </div>
      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:`1px solid ${T.border}`,paddingTop:"12px"}}>
          {svc.notes&&<div style={{fontSize:"12px",color:T.textMid,fontFamily:T.sans,marginBottom:"12px",lineHeight:"1.5"}}>💡 {svc.notes}</div>}
          {logging?(
            <div style={{background:"rgba(0,0,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"10px"}}>
              <div style={{...S.fieldLabel,marginBottom:"8px"}}>LOG SERVICE</div>
              <div style={{marginBottom:"8px"}}><div style={{...S.fieldLabel,marginBottom:"4px"}}>DATE COMPLETED</div><input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} style={{...S.input,colorScheme:"dark"}}/></div>
              <div style={{marginBottom:"10px"}}><div style={{...S.fieldLabel,marginBottom:"4px"}}>NOTE (optional)</div><input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="e.g. Replaced filter, all good" style={S.input}/></div>
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={()=>setLogging(false)} style={{...S.btnGhost,flex:1,padding:"8px"}}>Cancel</button>
                <button onClick={logService} style={{...S.btnPrimary,flex:2,padding:"8px"}}>Log It</button>
              </div>
            </div>
          ):(
            <button onClick={()=>setLogging(true)} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,color:T.accent,fontSize:"12px",borderRadius:"6px",padding:"7px 14px",cursor:"pointer",fontFamily:T.sans,marginBottom:"10px",fontWeight:"600"}}>
              <Ic.bell/> Log Service Done
            </button>
          )}
          {(svc.history||[]).length>0&&(
            <div>
              <div style={{...S.fieldLabel,marginBottom:"6px"}}>HISTORY</div>
              {(svc.history||[]).slice(0,3).map(h=>(
                <div key={h.id} style={{display:"flex",gap:"8px",fontSize:"12px",color:T.textDim,fontFamily:T.sans,padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{color:T.accent,fontFamily:T.mono,flexShrink:0}}>{fmtDate(h.date)}</span>
                  <span>{h.note||"Service completed"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

function ServicesTab({ prop }) {
  const {addService,delService}=useCtx();
  const [adding,setAdding]=useState(false); const [form,setForm]=useState({name:"",freqMonths:"12",notes:""});

  // Sort: overdue first (most overdue at top), then due soon (soonest first),
  // then scheduled (soonest first), then unscheduled at bottom
  const sorted=[...prop.services].sort((a,b)=>{
    const da=daysUntil(a.nextDue); const db=daysUntil(b.nextDue);
    const scoreA=da===null?9999:da; const scoreB=db===null?9999:db;
    return scoreA-scoreB;
  });

  const addSvc=()=>{
    if(!form.name.trim())return;
    addService(prop.id,{id:genId(),name:form.name.trim(),freqMonths:parseFloat(form.freqMonths)||12,notes:form.notes.trim(),lastDone:"",nextDue:"",history:[]});
    setForm({name:"",freqMonths:"12",notes:""});setAdding(false);
  };

  return (
    <div>
      {sorted.map(svc=><ServiceCard key={svc.id} svc={svc} propId={prop.id} onDelete={()=>delService(prop.id,svc.id)}/>)}
      {adding?(
        <div style={{background:T.surface2,border:`1px solid ${T.primaryBorder}`,borderRadius:"10px",padding:"16px",marginTop:"12px"}}>
          <div style={{...S.mLabel,marginBottom:"14px"}}>ADD SERVICE ITEM</div>
          {[["SERVICE NAME","name","e.g. Borehole pump check"],["NOTES (optional)","notes","e.g. Check output and pressure"]].map(([lbl,key,ph])=>(
            <div key={key} style={{marginBottom:"10px"}}><div style={S.fieldLabel}>{lbl}</div><input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={S.input}/></div>
          ))}
          <div style={{marginBottom:"14px"}}><div style={S.fieldLabel}>FREQUENCY</div>
            <select value={form.freqMonths} onChange={e=>setForm(p=>({...p,freqMonths:e.target.value}))} style={{...S.input,appearance:"none",colorScheme:"dark",cursor:"pointer"}}>
              {[["Weekly","0.25"],["Monthly","1"],["Every 3 months","3"],["Every 6 months","6"],["Yearly","12"],["Every 2 years","24"],["Every 3 years","36"]].map(([l,v])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:"8px"}}><button onClick={()=>setAdding(false)} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={addSvc} style={{...S.btnPrimary,flex:2}}>Add Service</button></div>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"none",border:`1px dashed ${T.primary}`,color:T.accent,fontSize:"12px",borderRadius:"6px",padding:"6px 14px",cursor:"pointer",fontFamily:T.sans,marginTop:"10px",fontWeight:"600"}}>
          {Ic.plus(11)} Add Service Item
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOPPING LIST TAB
// ─────────────────────────────────────────────────────────────────────────────
function buildShareText(groups,propName){
  const date=new Date().toLocaleDateString("en-ZA",{day:"2-digit",month:"short",year:"numeric"});
  const lines=[`📋 SHOPPING LIST — ${propName.toUpperCase()}`,date,""];
  groups.forEach(g=>{
    const pending=g.items.filter(m=>!m.acquired);if(!pending.length)return;
    lines.push("▸ "+g.taskName.toUpperCase());
    pending.forEach(m=>{const qty=m.qty&&parseFloat(m.qty)!==0?m.qty:"?";const unit=m.unit||"(unit TBC)";lines.push("  • "+m.name+" — "+qty+" "+unit+((!m.qty||parseFloat(m.qty)===0||!m.unit)?" ⚠️":""));});
    lines.push("");
  });
  lines.push("Property Tracker");return lines.join("\n");
}

function ShoppingListTab({ prop }) {
  const {toggleMaterial}=useCtx();
  const [showAcquired,setShowAcquired]=useState(true); const [shareModal,setShareModal]=useState(false);
  const groups=prop.tasks.map(task=>{const items=[];task.subtasks.forEach(sub=>sub.materials.forEach(mat=>items.push({...mat,subtaskName:sub.name,taskId:task.id,subtaskId:sub.id})));return{taskId:task.id,taskName:task.name,items};}).filter(g=>g.items.length>0);
  const allItems=groups.flatMap(g=>g.items); const total=allItems.length,acquired=allItems.filter(m=>m.acquired).length;
  const shareText=buildShareText(groups,prop.name);
  const handleShare=async()=>{if(navigator.share){try{await navigator.share({text:shareText});return;}catch(e){if(e.name==="AbortError")return;}}setShareModal(true);};
  if (total === 0) return (
    <div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:"32px",marginBottom:"12px"}}>🛒</div>
      <div style={{color:T.textDim,fontFamily:T.mono,fontSize:"13px"}}>No materials added yet</div>
      <div style={{color:T.textFaint,fontFamily:T.sans,fontSize:"12px",marginTop:"6px"}}>Add materials to subtasks in the Tasks tab</div>
    </div>
  );
  return (
    <div>
      {shareModal&&(
        <div style={S.overlay} onClick={()=>setShareModal(false)}>
          <div style={{...S.card,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={S.mHead}><span style={S.mLabel}>SHARE LIST</span><button onClick={()=>setShareModal(false)} style={S.closeBtn}>×</button></div>
            <div style={{fontSize:"12px",color:T.textDim,fontFamily:T.sans,marginBottom:"8px"}}>Long-press, Select All, Copy — then paste into WhatsApp.</div>
            <textarea readOnly value={shareText} style={{flex:1,background:"rgba(0,0,0,0.2)",border:`1px solid ${T.border}`,borderRadius:"8px",color:"rgba(240,237,232,0.85)",padding:"12px",fontSize:"13px",fontFamily:T.mono,resize:"none",outline:"none",minHeight:"200px",lineHeight:"1.6",WebkitUserSelect:"text",userSelect:"text"}} onFocus={e=>e.target.select()}/>
            <div style={{display:"flex",gap:"8px",marginTop:"10px"}}><button onClick={()=>setShareModal(false)} style={{...S.btnGhost,flex:1}}>Close</button><button onClick={()=>{const el=document.querySelector("textarea[readonly]");if(el){el.focus();el.select();}try{document.execCommand("copy");}catch{}}} style={{...S.btnGhost,flex:2,fontWeight:"600"}}>Select All</button></div>
          </div>
        </div>
      )}
      <div style={{background:T.primaryFade,border:`1px solid ${T.primaryBorder}`,borderRadius:"10px",padding:"14px 16px",marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
          <div style={{flex:1}}><div style={{fontSize:"20px",fontWeight:"700",color:T.text,fontFamily:T.sans}}>{total-acquired} <span style={{fontSize:"13px",fontWeight:"400",color:T.textDim}}>items to get</span></div><div style={{fontSize:"11px",color:T.textDim,fontFamily:T.mono,marginTop:"2px"}}>{acquired}/{total} acquired</div></div>
          <div style={{width:"70px"}}><div style={{height:"6px",background:"rgba(255,255,255,0.08)",borderRadius:"3px"}}><div style={{height:"100%",background:T.primary,borderRadius:"3px",width:`${total>0?(acquired/total)*100:0}%`,transition:"width 0.4s"}}/></div><div style={{fontSize:"10px",color:T.textDim,fontFamily:T.mono,marginTop:"3px",textAlign:"right"}}>{total>0?Math.round((acquired/total)*100):0}%</div></div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>setShowAcquired(!showAcquired)} style={{flex:1,background:showAcquired?"rgba(255,255,255,0.04)":T.primaryFade,border:`1px solid ${showAcquired?T.border:T.primaryBorder}`,color:showAcquired?T.textDim:T.accent,borderRadius:"6px",padding:"8px",cursor:"pointer",fontSize:"11px",fontFamily:T.sans}}>{showAcquired?"Hide":"Show"} acquired</button>
          <button onClick={handleShare} style={{flex:2,background:T.primary,border:"none",color:T.text,fontWeight:"700",borderRadius:"6px",padding:"8px",cursor:"pointer",fontSize:"12px",fontFamily:T.sans,display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>📤 Share via WhatsApp</button>
        </div>
      </div>
      {groups.map(g=>{
        const visible=showAcquired?g.items:g.items.filter(m=>!m.acquired);if(!visible.length)return null;
        return <div key={g.taskId} style={{marginBottom:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",paddingBottom:"6px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{width:"7px",height:"7px",borderRadius:"50%",background:T.primary,flexShrink:0}}/>
            <span style={{fontSize:"12px",fontWeight:"700",color:T.textMid,fontFamily:T.sans,flex:1}}>{g.taskName}</span>
            <span style={{fontSize:"10px",color:T.textFaint,fontFamily:T.mono}}>{g.items.filter(m=>m.acquired).length}/{g.items.length}</span>
          </div>
          {visible.map(mat=>(
            <div key={mat.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",borderRadius:"8px",marginBottom:"4px",background:mat.acquired?T.primaryFade:T.surface2,border:`1px solid ${mat.acquired?T.primaryBorder:T.border}`,cursor:"pointer"}} onClick={()=>toggleMaterial(prop.id,mat.taskId,mat.subtaskId,mat.id)}>
              <button style={{width:"22px",height:"22px",flexShrink:0,borderRadius:"5px",background:mat.acquired?T.primary:"transparent",border:mat.acquired?`2px solid ${T.primary}`:"2px solid rgba(255,255,255,0.18)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.text,outline:"none",padding:0}}>{mat.acquired&&<Ic.check/>}</button>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"14px",fontFamily:T.sans,color:mat.acquired?T.textDim:T.text,textDecoration:mat.acquired?"line-through":"none"}}>{mat.name}</span>
                  {((!mat.qty||parseFloat(mat.qty)===0)||!mat.unit)&&!mat.acquired&&<span>⚠️</span>}
                  {mat.qty&&parseFloat(mat.qty)!==0&&mat.unit&&<span style={S.pill}>{mat.qty} {mat.unit}</span>}
                </div>
                <div style={{fontSize:"11px",color:T.textFaint,fontFamily:T.mono,marginTop:"2px"}}>for: {mat.subtaskName}</div>
              </div>
              {mat.acquired&&<span style={{fontSize:"11px",color:T.accent,fontFamily:T.mono}}>✓ got it</span>}
            </div>
          ))}
        </div>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP MODAL
// ─────────────────────────────────────────────────────────────────────────────
function BackupModal({ properties, onRestore, onClose }) {
  const json=JSON.stringify(properties,null,2); const [tab,setTab]=useState("backup"); const [restoreText,setRestoreText]=useState(""); const [error,setError]=useState(""); const [status,setStatus]=useState(""); const textRef=useRef(null); const canShare=!!navigator.share;
  const doRestore=()=>{try{const d=JSON.parse(restoreText);if(!Array.isArray(d))throw new Error();onRestore(d);onClose();}catch{setError("Invalid backup data.");}};
  const handleShare=async()=>{try{const file=new File([json],"property-tracker-backup.json",{type:"application/json"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:"Property Tracker Backup",files:[file]});}else{await navigator.share({title:"Property Tracker Backup",text:json});}setStatus("Shared!");setTimeout(()=>setStatus(""),3000);}catch(e){if(e.name!=="AbortError")setStatus("Use Select All instead.");setTimeout(()=>setStatus(""),3000);}};
  const handleSelect=()=>{if(textRef.current){textRef.current.focus();textRef.current.select();try{document.execCommand("copy");setStatus("Copied!");}catch{setStatus("Text selected — long-press to Copy");}setTimeout(()=>setStatus(""),4000);}};
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{...S.card,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={S.mHead}><span style={S.mLabel}>BACKUP & RESTORE</span><button onClick={onClose} style={S.closeBtn}>×</button></div>
        <div style={{display:"flex",gap:"6px",marginBottom:"14px"}}>
          {["backup","restore"].map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?T.primary:"rgba(255,255,255,0.06)",border:"none",color:tab===t?T.text:T.textMid,borderRadius:"6px",padding:"8px",cursor:"pointer",fontSize:"12px",fontWeight:tab===t?"700":"500",fontFamily:T.sans,textTransform:"capitalize"}}>{t}</button>)}
        </div>
        {tab==="backup"&&<>
          <div style={{fontSize:"12px",color:T.textDim,fontFamily:T.sans,marginBottom:"8px"}}>{canShare?"Tap Share to send to Drive, Notes or Email.":"Select All then long-press to Copy."}</div>
          <textarea ref={textRef} readOnly value={json} style={{flex:1,background:"rgba(0,0,0,0.2)",border:`1px solid ${T.border}`,borderRadius:"8px",color:"rgba(240,237,232,0.75)",padding:"10px",fontSize:"11px",fontFamily:T.mono,resize:"none",outline:"none",minHeight:"150px",WebkitUserSelect:"text",userSelect:"text"}} onFocus={e=>e.target.select()}/>
          {status&&<div style={{fontSize:"12px",color:T.accent,fontFamily:T.sans,marginTop:"6px",textAlign:"center"}}>{status}</div>}
          <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            {canShare&&<button onClick={handleShare} style={{...S.btnPrimary,flex:1}}>📤 Share</button>}
            <button onClick={handleSelect} style={{...S.btnGhost,flex:1}}>Select All</button>
          </div>
        </>}
        {tab==="restore"&&<>
          <div style={{fontSize:"12px",color:T.textDim,fontFamily:T.sans,marginBottom:"10px"}}>Paste your backup JSON here.</div>
          <textarea value={restoreText} onChange={e=>{setRestoreText(e.target.value);setError("");}} placeholder="Paste backup JSON here…" style={{flex:1,background:"rgba(0,0,0,0.2)",border:`1px solid ${error?T.red:T.border}`,borderRadius:"8px",color:"rgba(240,237,232,0.75)",padding:"10px",fontSize:"11px",fontFamily:T.mono,resize:"none",outline:"none",minHeight:"150px"}}/>
          {error&&<div style={{color:T.red,fontSize:"12px",fontFamily:T.sans,marginTop:"6px"}}>{error}</div>}
          <button onClick={doRestore} style={{...S.btnPrimary,marginTop:"10px"}}>Restore</button>
        </>}
        <button onClick={onClose} style={{...S.btnGhost,marginTop:"8px"}}>Close</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW — cross-property materials + overdue services
// ─────────────────────────────────────────────────────────────────────────────
function OverviewPage({ properties, onSelectProperty }) {
  const allPendingMats = [];
  properties.forEach(prop => {
    prop.tasks.forEach(task => {
      task.subtasks.forEach(sub => {
        sub.materials.forEach(mat => {
          if (!mat.acquired) allPendingMats.push({ ...mat, propName:prop.name, propIcon:prop.icon, propId:prop.id, taskName:task.name, subtaskName:sub.name });
        });
      });
    });
  });

  const allServices = [];
  properties.forEach(prop => {
    prop.services.forEach(svc => {
      const d = daysUntil(svc.nextDue);
      if (d !== null && d <= 30) allServices.push({ ...svc, propName:prop.name, propIcon:prop.icon, days:d });
    });
  });
  allServices.sort((a,b) => a.days - b.days);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.sans }}>
      <div style={{ background:"rgba(15,20,18,0.9)", borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(12px)", padding:"16px 18px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ width:"36px", height:"36px", background:T.primary, borderRadius:"9px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"18px" }}>📊</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"15px", fontWeight:"700", color:T.text, lineHeight:1.1 }}>Overview</div>
          <div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono, marginTop:"2px" }}>All properties at a glance</div>
        </div>
      </div>
      <div style={{ maxWidth:"680px", margin:"0 auto", padding:"20px 14px" }}>

        {/* Summary cards */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"24px" }}>
          {properties.map(prop => {
            const pending = prop.tasks.flatMap(t=>t.subtasks.flatMap(s=>s.materials)).filter(m=>!m.acquired).length;
            const overdue = prop.services.filter(s=>daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<0).length;
            const active  = prop.tasks.filter(t=>t.subtasks.length>0&&!t.subtasks.every(s=>s.completed)).length;
            return (
              <button key={prop.id} onClick={()=>onSelectProperty(prop)} style={{ flex:1, background:T.surface2, border:`1px solid ${overdue>0?T.red:T.border}`, borderRadius:"10px", padding:"12px 10px", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.primary;e.currentTarget.style.background=T.primaryFade;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=overdue>0?T.red:T.border;e.currentTarget.style.background=T.surface2;}}
              >
                <div style={{ fontSize:"22px", marginBottom:"4px" }}>{prop.icon}</div>
                <div style={{ fontSize:"12px", fontWeight:"700", color:T.text, fontFamily:T.sans, marginBottom:"6px" }}>{prop.name}</div>
                {active>0 && <div style={{ fontSize:"10px", color:T.accent, fontFamily:T.mono }}>{active} task{active!==1?"s":""}</div>}
                {pending>0 && <div style={{ fontSize:"10px", color:T.accent, fontFamily:T.mono }}>{pending} material{pending!==1?"s":""}</div>}
                {overdue>0 && <div style={{ fontSize:"10px", color:T.red, fontFamily:T.mono }}>⚠️ {overdue} overdue</div>}
                {active===0&&pending===0&&overdue===0 && <div style={{ fontSize:"10px", color:T.textFaint, fontFamily:T.mono }}>All clear</div>}
              </button>
            );
          })}
        </div>

        {/* Overdue / due soon services */}
        {allServices.length > 0 && (
          <div style={{ marginBottom:"28px" }}>
            <div style={{ fontSize:"11px", fontFamily:T.mono, color:T.accent, letterSpacing:"0.08em", marginBottom:"12px" }}>SERVICES — OVERDUE OR DUE WITHIN 30 DAYS</div>
            {allServices.map((svc,i) => {
              const isOverdue = svc.days < 0;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", background:T.surface2, border:`1px solid ${isOverdue?T.red:T.warnBorder}`, borderRadius:"8px", marginBottom:"6px" }}>
                  <div style={{ fontSize:"18px", flexShrink:0 }}>{svc.propIcon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:T.text, fontFamily:T.sans, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{svc.name}</div>
                    <div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono, marginTop:"2px" }}>{svc.propName}</div>
                  </div>
                  <span style={{ fontSize:"11px", fontFamily:T.mono, color:isOverdue?T.red:T.warn, background:isOverdue?T.redFade:T.warnFade, border:`1px solid ${isOverdue?T.red:T.warnBorder}`, borderRadius:"4px", padding:"2px 8px", whiteSpace:"nowrap" }}>
                    {isOverdue?`${Math.abs(svc.days)}d overdue`:svc.days===0?"Today":`${svc.days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* All pending materials */}
        <div>
          <div style={{ fontSize:"11px", fontFamily:T.mono, color:T.accent, letterSpacing:"0.08em", marginBottom:"12px" }}>ALL PENDING MATERIALS — ACROSS ALL PROPERTIES</div>
          {allPendingMats.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px", color:T.textDim, fontFamily:T.sans, fontSize:"13px" }}>No pending materials across any property 🎉</div>
          ) : properties.map(prop => {
            const mats = allPendingMats.filter(m => m.propId === prop.id);
            if (!mats.length) return null;
            return (
              <div key={prop.id} style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:T.textMid, fontFamily:T.sans, marginBottom:"8px", display:"flex", alignItems:"center", gap:"8px" }}>
                  {prop.icon} {prop.name}
                  <span style={{ fontSize:"10px", color:T.textFaint, fontFamily:T.mono }}>({mats.length} item{mats.length!==1?"s":""})</span>
                </div>
                {mats.map(mat => (
                  <div key={mat.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 12px", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:"7px", marginBottom:"4px" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"13px", color:T.text, fontFamily:T.sans }}>{mat.name}</span>
                        {mat.qty&&mat.unit && <span style={S.pill}>{mat.qty} {mat.unit}</span>}
                        {((!mat.qty||parseFloat(mat.qty)===0)||!mat.unit) && <span style={{ fontSize:"11px", color:T.warn }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize:"10px", color:T.textFaint, fontFamily:T.mono, marginTop:"2px" }}>{mat.taskName} › {mat.subtaskName}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY VIEW — tabs: Tasks / Services / Shopping / Rooms
// ─────────────────────────────────────────────────────────────────────────────
function PropertyView({ prop, onBack }) {
  const {addTask}=useCtx();
  const [tab,setTab]=useState("tasks"); const [taskFilter,setTaskFilter]=useState("active"); const [newTask,setNewTask]=useState("");
  const TABS=[{id:"tasks",label:"Tasks",icon:<Ic.tool/>},{id:"services",label:"Services",icon:<Ic.wrench/>},{id:"shopping",label:"Shopping",icon:<Ic.cart/>},{id:"rooms",label:"Rooms",icon:<Ic.home/>}];
  const isComplete=t=>t.subtasks.length>0&&t.subtasks.every(s=>s.completed);
  const filtered=prop.tasks.filter(t=>taskFilter==="active"?!isComplete(t):taskFilter==="completed"?isComplete(t):true);
  const completedCount=prop.tasks.filter(isComplete).length;
  const pendingMats=prop.tasks.flatMap(t=>t.subtasks.flatMap(s=>s.materials)).filter(m=>!m.acquired).length;
  const overdueSvcs=prop.services.filter(s=>daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<0).length;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.sans }}>
      {/* Header */}
      <div style={{ background:"rgba(15,20,18,0.9)", borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
          <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:"4px", background:"none", border:"none", color:T.textDim, cursor:"pointer", fontFamily:T.sans, fontSize:"12px", padding:"4px 0" }}
            onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.textDim}>
            <Ic.back/> Properties
          </button>
          <div style={{ width:"1px", height:"16px", background:T.border }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"15px", fontWeight:"700", color:T.text, lineHeight:1.1 }}>{prop.icon} {prop.name}</div>
            <div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono, marginTop:"1px" }}>{completedCount}/{prop.tasks.length} tasks complete</div>
          </div>
        </div>
        <div style={{ display:"flex", borderTop:"1px solid rgba(255,255,255,0.05)", overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"5px", padding:"11px 8px", background:"none", border:"none", cursor:"pointer", borderBottom:tab===t.id?`2px solid ${T.primary}`:"2px solid transparent", color:tab===t.id?T.accent:T.textDim, fontSize:"12px", fontWeight:tab===t.id?"700":"500", fontFamily:T.sans, transition:"all 0.15s", whiteSpace:"nowrap", position:"relative" }}>
              {t.icon} {t.label}
              {t.id==="shopping"&&pendingMats>0&&<span style={{background:T.primary,color:T.text,borderRadius:"10px",padding:"0 5px",fontSize:"9px",fontFamily:T.mono,fontWeight:"700"}}>{pendingMats}</span>}
              {t.id==="services"&&overdueSvcs>0&&<span style={{background:T.red,color:"#fff",borderRadius:"10px",padding:"0 5px",fontSize:"9px",fontFamily:T.mono,fontWeight:"700"}}>{overdueSvcs}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:"680px", margin:"0 auto", padding:"20px 14px" }}>
        {tab==="tasks"&&(
          <>
            <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:"10px", padding:"11px 14px", marginBottom:"14px", display:"flex", gap:"10px", alignItems:"center" }}>
              <div style={{ color:T.accent, display:"flex", flexShrink:0 }}>{Ic.plus()}</div>
              <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&newTask.trim()&&(addTask(prop.id,newTask.trim()),setNewTask(""))} placeholder="Add a new task…" style={{ flex:1, background:"none", border:"none", color:T.text, fontSize:"14px", outline:"none", fontFamily:T.sans }}/>
              <button onClick={()=>{if(newTask.trim()){addTask(prop.id,newTask.trim());setNewTask("");}}} style={{...S.btnPrimary,padding:"7px 14px",fontSize:"12px",whiteSpace:"nowrap"}}>Add</button>
            </div>
            <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
              {["active","all","completed"].map(f=><button key={f} onClick={()=>setTaskFilter(f)} style={{background:taskFilter===f?T.primary:"rgba(255,255,255,0.05)",border:"none",color:taskFilter===f?T.text:T.textDim,borderRadius:"5px",padding:"5px 12px",cursor:"pointer",fontSize:"11px",fontWeight:taskFilter===f?"700":"500",fontFamily:T.sans,textTransform:"capitalize",transition:"all 0.15s"}}>{f}</button>)}
            </div>
            {filtered.length===0?(
              <div style={{ textAlign:"center", padding:"50px 20px", color:T.textFaint, fontFamily:T.mono, fontSize:"13px" }}>
                {taskFilter==="completed"?"No completed tasks yet":taskFilter==="active"?"All caught up! 🎉":"No tasks — add one above"}
              </div>
            ):filtered.map((task,idx)=><TaskCard key={task.id} task={task} propId={prop.id} rooms={prop.rooms} isFirst={idx===0} isLast={idx===filtered.length-1}/>)}
          </>
        )}
        {tab==="services"&&<ServicesTab prop={prop}/>}
        {tab==="shopping"&&<ShoppingListTab prop={prop}/>}
        {tab==="rooms"&&<RoomsTab propId={prop.id} rooms={prop.rooms}/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY SELECTOR — landing screen
// ─────────────────────────────────────────────────────────────────────────────
function PropertySelector({ properties, onSelect, onAddProperty, setShowBackup }) {
  const [adding,setAdding]=useState(false); const [form,setForm]=useState({name:"",icon:"🏠"});
  const ICONS=["🏠","🌾","🌿","🏡","🏗️","🏢","🌲","🏕️","🌴","🏔️"];
  const addProp=()=>{if(!form.name.trim())return;onAddProperty({id:genId(),name:form.name.trim(),icon:form.icon,rooms:[],tasks:[],services:[]});setForm({name:"",icon:"🏠"});setAdding(false);};
  const totalPending=properties.flatMap(p=>p.tasks.flatMap(t=>t.subtasks.flatMap(s=>s.materials))).filter(m=>!m.acquired).length;
  const totalOverdue=properties.flatMap(p=>p.services).filter(s=>daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<0).length;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.sans }}>
      <div style={{ background:"rgba(15,20,18,0.9)", borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(12px)", padding:"16px 18px", display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{ width:"38px", height:"38px", background:T.primary, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"20px" }}>🏡</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"16px", fontWeight:"700", color:T.text, lineHeight:1.1 }}>Property Tracker</div>
          <div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono, marginTop:"2px" }}>{properties.length} propert{properties.length===1?"y":"ies"}</div>
        </div>
        <button onClick={()=>setShowBackup(true)} style={{ display:"flex", alignItems:"center", gap:"5px", background:T.surface2, border:`1px solid ${T.border}`, color:T.textDim, borderRadius:"7px", padding:"6px 10px", cursor:"pointer", fontSize:"11px", fontFamily:T.sans, whiteSpace:"nowrap" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textDim;}}
        ><Ic.backup/> Backup</button>
      </div>

      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"24px 16px" }}>
        {(totalPending>0||totalOverdue>0)&&(
          <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
            {totalOverdue>0&&<div style={{ flex:1, background:T.redFade, border:`1px solid ${T.red}`, borderRadius:"8px", padding:"10px 14px" }}><div style={{ fontSize:"18px", fontWeight:"700", color:T.red, fontFamily:T.sans }}>{totalOverdue}</div><div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono }}>services overdue</div></div>}
            {totalPending>0&&<div style={{ flex:1, background:T.primaryFade, border:`1px solid ${T.primaryBorder}`, borderRadius:"8px", padding:"10px 14px" }}><div style={{ fontSize:"18px", fontWeight:"700", color:T.accent, fontFamily:T.sans }}>{totalPending}</div><div style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono }}>materials needed</div></div>}
          </div>
        )}

        <div style={{ fontSize:"11px", fontFamily:T.mono, color:T.accent, letterSpacing:"0.08em", marginBottom:"14px" }}>YOUR PROPERTIES</div>

        {properties.map(prop=>{
          const propPending=prop.tasks.flatMap(t=>t.subtasks.flatMap(s=>s.materials)).filter(m=>!m.acquired).length;
          const propOverdue=prop.services.filter(s=>daysUntil(s.nextDue)!==null&&daysUntil(s.nextDue)<0).length;
          const propActive=prop.tasks.filter(t=>t.subtasks.length>0&&!t.subtasks.every(s=>s.completed)).length;
          return (
            <button key={prop.id} onClick={()=>onSelect(prop)} style={{ display:"flex", alignItems:"center", gap:"14px", width:"100%", background:T.surface2, border:`1px solid ${propOverdue>0?T.red:T.border}`, borderRadius:"12px", padding:"16px 18px", cursor:"pointer", marginBottom:"10px", textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.primary;e.currentTarget.style.background=T.primaryFade;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=propOverdue>0?T.red:T.border;e.currentTarget.style.background=T.surface2;}}
            >
              <div style={{ width:"44px", height:"44px", background:T.primaryLight, border:`1px solid ${T.primaryBorder}`, borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>{prop.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"16px", fontWeight:"700", color:T.text, fontFamily:T.sans }}>{prop.name}</div>
                <div style={{ display:"flex", gap:"10px", marginTop:"4px", flexWrap:"wrap" }}>
                  {propActive>0&&<span style={{ fontSize:"11px", color:T.textDim, fontFamily:T.mono }}>{propActive} active task{propActive!==1?"s":""}</span>}
                  {propPending>0&&<span style={{ fontSize:"11px", color:T.accent, fontFamily:T.mono }}>{propPending} material{propPending!==1?"s":""} needed</span>}
                  {propOverdue>0&&<span style={{ fontSize:"11px", color:T.red, fontFamily:T.mono }}>⚠️ {propOverdue} overdue</span>}
                  {propActive===0&&propPending===0&&propOverdue===0&&<span style={{ fontSize:"11px", color:T.textFaint, fontFamily:T.mono }}>All up to date</span>}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color:T.textDim, flexShrink:0 }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          );
        })}

        {adding?(
          <div style={{ background:T.surface2, border:`1px solid ${T.primaryBorder}`, borderRadius:"12px", padding:"18px", marginTop:"8px" }}>
            <div style={{ ...S.mLabel, marginBottom:"14px" }}>ADD PROPERTY</div>
            <div style={{ marginBottom:"12px" }}><div style={S.fieldLabel}>NAME</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addProp()} placeholder="e.g. Waterfall Farm" style={S.input}/></div>
            <div style={{ marginBottom:"16px" }}><div style={S.fieldLabel}>ICON</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ width:"42px", height:"42px", borderRadius:"8px", border:`2px solid ${form.icon===ic?T.primary:T.border}`, background:form.icon===ic?T.primaryFade:"transparent", cursor:"pointer", fontSize:"20px", transition:"all 0.15s" }}>{ic}</button>)}
              </div>
            </div>
            <div style={{ display:"flex", gap:"8px" }}><button onClick={()=>setAdding(false)} style={{...S.btnGhost,flex:1}}>Cancel</button><button onClick={addProp} style={{...S.btnPrimary,flex:2}}>Add Property</button></div>
          </div>
        ):(
          <button onClick={()=>setAdding(true)} style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", background:T.primaryFade, border:`1px dashed ${T.primary}`, color:T.accent, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", fontSize:"14px", fontFamily:T.sans, fontWeight:"600", marginTop:"8px" }}>
            {Ic.plus()} Add Property
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [properties,setProperties]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [activePropId,setActivePropId]=useState(null);
  const [view,setView]=useState("properties"); // "properties" | "property" | "overview"
  const [showBackup,setShowBackup]=useState(false);
  const [toast,setToast]=useState(null);
  const saveTimer=useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load(){
      try{
        let stored=null;
        try{const r=await window.storage.get(CANONICAL_KEY);if(r?.value)stored=JSON.parse(r.value);}catch{}
        if(!stored){for(const k of LEGACY_KEYS){try{const r=await window.storage.get(k);if(r?.value){stored=JSON.parse(r.value);break;}}catch{}}}
        if(stored&&Array.isArray(stored)){
          // Detect old flat tasks format (migrate into Wonderboom)
          if(stored.length>0&&stored[0].subtasks!==undefined&&!stored[0].rooms){
            const migrated=JSON.parse(JSON.stringify(SEED_PROPERTIES));
            migrated[0].tasks=stored;
            setProperties(migrated);
            await window.storage.set(CANONICAL_KEY,JSON.stringify(migrated));
          } else {
            // Merge: keep stored, add any missing seed properties
            const seenIds=new Set(stored.map(p=>p.id));
            const missing=SEED_PROPERTIES.filter(p=>!seenIds.has(p.id));
            const merged=[...stored,...missing];
            setProperties(merged);
            await window.storage.set(CANONICAL_KEY,JSON.stringify(merged));
          }
        } else {
          setProperties(SEED_PROPERTIES);
          await window.storage.set(CANONICAL_KEY,JSON.stringify(SEED_PROPERTIES));
        }
      }catch{setProperties(SEED_PROPERTIES);}
      setLoaded(true);
    }
    load();
  },[]);

  // ── Debounced save ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!loaded)return;
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>{window.storage.set(CANONICAL_KEY,JSON.stringify(properties)).catch(()=>{});},500);
    return()=>clearTimeout(saveTimer.current);
  },[properties,loaded]);

  // ── Undo helper ─────────────────────────────────────────────────────────────
  const withUndo=useCallback((label,action)=>{
    const snap=JSON.parse(JSON.stringify(properties));
    action();
    setToast({message:`"${label}" deleted`,restore:()=>setProperties(snap)});
  },[properties]);

  // ── All operations ──────────────────────────────────────────────────────────
  const updProp=(pid,patch)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,...patch}));

  const ops={
    updProp,
    addProperty:prop=>setProperties(p=>[...p,prop]),

    // Tasks
    addTask:(pid,name)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:[...x.tasks,{id:genId(),name,room:"",notes:"",dueDate:"",subtasks:[]}]})),
    updTask:(pid,tid,patch)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,...patch})})),
    delTask:(pid,tid)=>{const t=properties.find(x=>x.id===pid)?.tasks.find(x=>x.id===tid);withUndo(t?.name||"Task",()=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.filter(t=>t.id!==tid)})));},
    moveTask:(pid,tid,dir)=>setProperties(p=>p.map(x=>{if(x.id!==pid)return x;const ts=[...x.tasks],i=ts.findIndex(t=>t.id===tid),j=i+dir;if(j<0||j>=ts.length)return x;[ts[i],ts[j]]=[ts[j],ts[i]];return{...x,tasks:ts};})),

    // Subtasks
    addSubtask:(pid,tid,name)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:[...t.subtasks,{id:genId(),name,completed:false,materials:[]}]})})),
    updSubtask:(pid,tid,sid,patch)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.map(s=>s.id!==sid?s:{...s,...patch})})})),
    delSubtask:(pid,tid,sid)=>{const s=properties.find(x=>x.id===pid)?.tasks.find(x=>x.id===tid)?.subtasks.find(x=>x.id===sid);withUndo(s?.name||"Subtask",()=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.filter(s=>s.id!==sid)})})));},

    // Materials
    addMaterial:(pid,tid,sid,mat)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.map(s=>s.id!==sid?s:{...s,materials:[...s.materials,{id:genId(),name:mat.name,qty:mat.qty||"",unit:mat.unit||"",acquired:false}]})})})),
    updMaterial:(pid,tid,sid,mid,patch)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.map(s=>s.id!==sid?s:{...s,materials:s.materials.map(m=>m.id!==mid?m:{...m,...patch})})})})),
    delMaterial:(pid,tid,sid,mid)=>{const m=properties.find(x=>x.id===pid)?.tasks.find(x=>x.id===tid)?.subtasks.find(x=>x.id===sid)?.materials.find(x=>x.id===mid);withUndo(m?.name||"Material",()=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.map(s=>s.id!==sid?s:{...s,materials:s.materials.filter(m=>m.id!==mid)})})})));},
    toggleMaterial:(pid,tid,sid,mid)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,tasks:x.tasks.map(t=>t.id!==tid?t:{...t,subtasks:t.subtasks.map(s=>s.id!==sid?s:{...s,materials:s.materials.map(m=>m.id!==mid?m:{...m,acquired:!m.acquired})})})})),

    // Services
    addService:(pid,svc)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,services:[...x.services,svc]})),
    updService:(pid,sid,patch)=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,services:x.services.map(s=>s.id!==sid?s:{...s,...patch})})),
    delService:(pid,sid)=>{const svc=properties.find(x=>x.id===pid)?.services.find(x=>x.id===sid);withUndo(svc?.name||"Service",()=>setProperties(p=>p.map(x=>x.id!==pid?x:{...x,services:x.services.filter(s=>s.id!==sid)})));},
  };

  if(!loaded)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:T.accent,fontFamily:T.mono,fontSize:"13px"}}>Loading Property Tracker…</div>
    </div>
  );

  // Always sync active prop from latest state
  const activeProp=activePropId?properties.find(p=>p.id===activePropId):null;

  return (
    <Ctx.Provider value={ops}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {showBackup&&<BackupModal properties={properties} onRestore={d=>setProperties(d)} onClose={()=>setShowBackup(false)}/>}
      {toast&&<UndoToast message={toast.message} onUndo={()=>{toast.restore();setToast(null);}} onDismiss={()=>setToast(null)}/>}

      {/* Bottom nav — only on selector and overview */}
      {!activeProp&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"rgba(15,20,18,0.95)",borderTop:`1px solid ${T.border}`,display:"flex",backdropFilter:"blur(12px)"}}>
          {[{id:"properties",label:"Properties",icon:"🏡"},{id:"overview",label:"Overview",icon:"📊"}].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 8px",background:"none",border:"none",cursor:"pointer",borderTop:view===v.id?`2px solid ${T.primary}`:"2px solid transparent",color:view===v.id?T.accent:T.textDim,fontSize:"11px",fontFamily:T.sans,fontWeight:view===v.id?"700":"500",transition:"all 0.15s"}}>
              <span style={{fontSize:"18px"}}>{v.icon}</span>{v.label}
            </button>
          ))}
        </div>
      )}

      <div style={{paddingBottom:activeProp?0:"72px"}}>
        {activeProp?(
          <PropertyView prop={activeProp} onBack={()=>setActivePropId(null)}/>
        ):view==="overview"?(
          <OverviewPage properties={properties} onSelectProperty={p=>{setActivePropId(p.id);}}/>
        ):(
          <PropertySelector properties={properties} onSelect={p=>setActivePropId(p.id)} onAddProperty={ops.addProperty} setShowBackup={setShowBackup}/>
        )}
      </div>
    </Ctx.Provider>
  );
}

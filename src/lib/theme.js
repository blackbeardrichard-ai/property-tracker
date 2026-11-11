// Property Tracker theme — "Option B" (Nov 2026).
// Neutral base, one action colour (ink blue), and a separate colour per status.
// Every text colour passes WCAG 4.5:1 on both `surface` (#FFFFFF) and `bg` (#F4F5F7).
// Never hard-code colours in components: use these tokens.

export const T = {
  // Action colour — buttons, active tab, links, selected chips (white text on it: 8.7:1)
  primary:       '#1F4E79',
  primaryHover:  '#163A5C',
  primaryFade:   '#E7EEF6',   // selected / "to buy" background (primary text on it: 7.4:1)
  primaryBorder: '#C9D3DF',

  // Surfaces
  bg:            '#F4F5F7',   // page
  surface:       '#FFFFFF',   // cards, header, bottom bar
  surface2:      '#F4F5F7',   // inset panels inside a card
  controlBg:     '#EEF0F3',   // unselected chips / segmented control track
  controlBgFaint:'#F7F8FA',
  popoverBg:     '#FFFFFF',

  // Lines
  border:        '#D5DAE1',
  borderLight:   '#E6E9EE',   // dividers inside a card

  // Text (all ≥4.5:1 on white and on bg)
  text:          '#111827',   // 17.7:1
  textMid:       '#4B5563',   // 7.6:1
  textDim:       '#5F6875',   // 5.6:1 — dates, quantities, hints
  textFaint:     '#5F6875',   // kept as an alias: nothing lighter is used for text
  onPrimary:     '#FFFFFF',

  // Status — each meaning has its own colour, never the action colour
  red:           '#B42318',   // overdue / danger (on redFade 5.8:1)
  redFade:       '#FDECEA',
  redBorder:     '#F3C3BD',
  warn:          '#8A5300',   // needs attention: no due date, due soon (on warnFade 5.7:1)
  warnFade:      '#FFF3D6',
  warnBorder:    '#EED9A4',
  info:          '#0E6576',   // on site / delivered (on infoFade 5.9:1)
  infoFade:      '#E3F4F6',
  infoBorder:    '#B7DDE3',
  ok:            '#1E6B3F',   // done / used / good (on okFade 5.7:1)
  okFade:        '#E6F4EC',
  okBorder:      '#BFE0CC',

  // Legacy aliases still referenced by older screens
  accent:        '#1F4E79',
  accentFade:    '#E7EEF6',

  // Typography
  sans:          "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono:          "'Inter', system-ui, sans-serif",   // DM Mono retired; figures use tabular numerals
  num:           "'tnum' 1",

  // Shape
  radius:        '12px',
  radiusSm:      '9px',
  shadow:        '0 1px 2px rgba(17,24,39,0.06)',
  shadowMd:      '0 4px 16px rgba(17,24,39,0.10)',
  shadowLg:      '0 12px 40px rgba(17,24,39,0.18)',
  tap:           '44px',      // minimum touch target
};

export const S = {
  input: {
    width:'100%', boxSizing:'border-box', height:'44px',
    background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm,
    color:T.text, padding:'0 12px', fontSize:'15px', outline:'none', fontFamily:T.sans,
  },
  textarea: {
    width:'100%', boxSizing:'border-box',
    background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm,
    color:T.text, padding:'10px 12px', fontSize:'15px', lineHeight:1.45, outline:'none',
    fontFamily:T.sans, resize:'vertical',
  },
  btnPrimary: {
    height:'44px', padding:'0 18px', background:T.primary, border:'none', color:T.onPrimary,
    fontWeight:600, borderRadius:'10px', cursor:'pointer', fontSize:'15px', fontFamily:T.sans,
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px',
  },
  btnGhost: {
    height:'44px', padding:'0 16px', background:T.surface, border:`1px solid ${T.border}`,
    color:T.text, borderRadius:'10px', cursor:'pointer', fontSize:'15px', fontWeight:500,
    fontFamily:T.sans, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px',
  },
  btnOutline: {
    height:'40px', padding:'0 12px', background:T.surface, border:`1px solid ${T.primaryBorder}`,
    color:T.primary, borderRadius:T.radiusSm, cursor:'pointer', fontSize:'14px', fontWeight:600,
    fontFamily:T.sans, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'6px',
    whiteSpace:'nowrap',
  },
  btnDanger: {
    height:'44px', padding:'0 18px', background:T.red, border:'none', color:'#FFFFFF',
    fontWeight:600, borderRadius:'10px', cursor:'pointer', fontSize:'15px', fontFamily:T.sans,
  },
  btnDashed: {
    height:'48px', width:'100%', background:'transparent', border:'1px dashed #9FB3C8',
    borderRadius:'14px', color:T.primary, fontSize:'15px', fontWeight:600, cursor:'pointer',
    fontFamily:T.sans, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
  },
  iconBtn: {
    width:'44px', height:'44px', border:'none', background:'transparent', color:T.textMid,
    display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
    borderRadius:'10px', flexShrink:0, padding:0,
  },
  card: {
    background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px',
  },
  overlay: {
    position:'fixed', inset:0, zIndex:200, background:'rgba(17,24,39,0.45)',
    display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0',
  },
  sheet: {
    background:T.surface, borderRadius:'18px 18px 0 0', padding:'20px 18px 24px',
    width:'100%', maxWidth:'520px', boxShadow:T.shadowLg, maxHeight:'92vh', overflowY:'auto',
    boxSizing:'border-box',
  },
  mHead: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'14px' },
  mLabel: { fontSize:'17px', fontWeight:700, color:T.text, fontFamily:T.sans },
  fieldLabel: { display:'block', fontSize:'13px', fontWeight:600, color:T.textMid, marginBottom:'6px', fontFamily:T.sans },
  sectionLabel: { margin:0, fontSize:'14px', fontWeight:600, color:T.textMid, fontFamily:T.sans },
  meta: { fontSize:'13px', color:T.textDim, fontFamily:T.sans },
  chip: {
    display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'12px', fontWeight:600,
    borderRadius:'8px', padding:'4px 9px', whiteSpace:'nowrap', fontFamily:T.sans,
  },
  empty: { textAlign:'center', padding:'40px 20px', color:T.textDim, fontSize:'14px', fontFamily:T.sans },
};

// Back-compat for screens that still spread S.closeBtn / S.pill / S.menuItem
S.closeBtn = S.iconBtn;
S.pill = { ...S.chip, color:T.primary, background:T.primaryFade };
S.menuItem = {
  display:'flex', alignItems:'center', gap:'10px', width:'100%', minHeight:'44px',
  background:'none', border:'none', color:T.text, padding:'0 14px', borderRadius:'8px',
  cursor:'pointer', fontSize:'15px', fontFamily:T.sans, textAlign:'left',
};

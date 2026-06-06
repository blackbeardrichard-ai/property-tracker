export const T = {
  // Core colours
  primary:       '#C8531A',
  primaryFade:   'rgba(200,83,26,0.10)',
  primaryBorder: 'rgba(200,83,26,0.30)',
  primaryLight:  'rgba(200,83,26,0.06)',
  accent:        '#E8742A',
  accentFade:    'rgba(232,116,42,0.12)',

  // Backgrounds
  bg:            '#F2F2F2',
  surface:       '#FFFFFF',
  surface2:      '#EBEBEB',
  surfaceCard:   '#FFFFFF',
  controlBg:     '#EFEFEF',   // unselected buttons / filter chips / control fills
  controlBgFaint:'#F5F5F5',   // very subtle fills (progress tracks, etc.)
  popoverBg:     '#FFFFFF',   // dropdown / popover menu background

  // Borders
  border:        '#DEDEDE',
  borderLight:   '#E8E8E8',

  // Text
  text:          '#1A1A1A',
  textMid:       '#555555',
  textDim:       '#888888',
  textFaint:     '#BBBBBB',

  // Status
  red:           '#D94040',
  redFade:       'rgba(217,64,64,0.08)',
  warn:          '#C47A00',
  warnFade:      'rgba(196,122,0,0.10)',
  warnBorder:    'rgba(196,122,0,0.30)',

  // Priority colours
  high:          '#D94040',
  medium:        '#C47A00',
  low:           '#2D7A4F',

  // Typography
  sans:          "'DM Sans', sans-serif",
  mono:          "'DM Mono', monospace",

  // Misc
  radius:        '10px',
  shadow:        '0 2px 12px rgba(0,0,0,0.09)',
  shadowMd:      '0 4px 24px rgba(0,0,0,0.13)',
  shadowLg:      '0 8px 40px rgba(0,0,0,0.16)',
};

export const S = {
  input: {
    width:'100%', boxSizing:'border-box',
    background:'#FFFFFF',
    borderRadius:'8px',
    color:'#1A1A1A',
    padding:'10px 13px',
    fontSize:'14px',
    outline:'none',
    fontFamily:"'DM Sans', sans-serif",
    border:'1px solid #DEDEDE',
  },
  btnPrimary: {
    background:'#C8531A',
    border:'none',
    color:'#FFFFFF',
    fontWeight:'700',
    borderRadius:'8px',
    padding:'11px',
    cursor:'pointer',
    fontSize:'13px',
    fontFamily:"'DM Sans', sans-serif",
  },
  btnGhost: {
    background:'none',
    border:'1px solid #DEDEDE',
    color:'#555555',
    borderRadius:'8px',
    padding:'11px',
    cursor:'pointer',
    fontSize:'13px',
    fontFamily:"'DM Sans', sans-serif",
  },
  overlay: {
    position:'fixed', inset:0, zIndex:200,
    background:'rgba(0,0,0,0.4)',
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:'16px',
  },
  card: {
    background:'#FFFFFF',
    border:'1px solid #DEDEDE',
    borderRadius:'14px',
    padding:'22px',
    width:'100%',
    maxWidth:'440px',
    boxShadow:'0 8px 40px rgba(0,0,0,0.16)',
    maxHeight:'92vh',
    overflowY:'auto',
  },
  mHead: {
    display:'flex', alignItems:'center',
    justifyContent:'space-between', marginBottom:'16px',
  },
  mLabel: {
    fontSize:'11px',
    fontFamily:"'DM Mono', monospace",
    color:'#C8531A',
    letterSpacing:'0.1em',
  },
  closeBtn: {
    background:'none', border:'none',
    color:'#888888', cursor:'pointer',
    fontSize:'22px', lineHeight:1, padding:'0 2px',
  },
  fieldLabel: {
    fontSize:'10px',
    fontFamily:"'DM Mono', monospace",
    color:'#C8531A',
    letterSpacing:'0.08em',
    marginBottom:'6px',
  },
  pill: {
    fontSize:'11px',
    fontFamily:"'DM Mono', monospace",
    color:'#C8531A',
    background:'rgba(200,83,26,0.10)',
    borderRadius:'4px',
    padding:'2px 8px',
    whiteSpace:'nowrap',
  },
  menuItem: {
    display:'flex', alignItems:'center', gap:'9px',
    width:'100%', background:'none', border:'none',
    color:'#555555', padding:'10px 13px',
    borderRadius:'7px', cursor:'pointer',
    fontSize:'13px', fontFamily:"'DM Sans', sans-serif",
    textAlign:'left',
  },
};

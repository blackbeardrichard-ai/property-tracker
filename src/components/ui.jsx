import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { T, S } from '../lib/theme';

// ── Icons (stroke, currentColor) ───────────────────────────────────
const PATHS = {
  back:     <path d="M15 5l-7 7 7 7"/>,
  chevronR: <path d="M9 5l7 7-7 7"/>,
  chevronD: <path d="M5 9l7 7 7-7"/>,
  chevronU: <path d="M5 15l7-7 7 7"/>,
  plus:     <path d="M12 5v14M5 12h14"/>,
  check:    <path d="M5 12.5l4.5 4.5L19 7.5"/>,
  close:    <path d="M6 6l12 12M18 6L6 18"/>,
  dots:     <><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></>,
  tasks:    <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></>,
  wrench:   <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>,
  cart:     <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12h11l2-8H6.2"/></>,
  rooms:    <><path d="M4 21V4h11v17"/><path d="M15 8h5v13H4"/><circle cx="12" cy="13" r="0.8" fill="currentColor"/></>,
  more:     <><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></>,
  home:     <><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></>,
  wheat:    <><path d="M12 22V9"/><path d="M12 13c-3 0-4-2-4-4 3 0 4 2 4 4z"/><path d="M12 13c3 0 4-2 4-4-3 0-4 2-4 4z"/><path d="M12 9c-2.5 0-3.5-2-3.5-4 2.5 0 3.5 2 3.5 4z"/><path d="M12 9c2.5 0 3.5-2 3.5-4-2.5 0-3.5 2-3.5 4z"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>,
  truck:    <><rect x="2" y="7" width="12" height="8" rx="1"/><path d="M14 10h4l3 3v2h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></>,
  box:      <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
  cow:      <><path d="M6 8c-2 0-3-1.5-3-3 2 0 3 1 3.5 2M18 8c2 0 3-1.5 3-3-2 0-3 1-3.5 2"/><rect x="6" y="7" width="12" height="9" rx="4"/><path d="M9 16v3M15 16v3"/><circle cx="10" cy="11" r="0.8" fill="currentColor"/><circle cx="14" cy="11" r="0.8" fill="currentColor"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  person:   <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
  note:     <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  trash:    <><path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13"/></>,
  pencil:   <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z"/>,
  up:       <path d="M12 19V5M6 11l6-6 6 6"/>,
  down:     <path d="M12 5v14M6 13l6 6 6-6"/>,
  send:     <path d="M4 12l16-8-6 16-2-7z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
  logout:   <><path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/></>,
  key:      <><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3"/></>,
  flag:     <><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>,
  image:    <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></>,
  download: <><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 20h16"/></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  users:    <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.7c2 .9 3.5 3 3.5 5.3"/></>,
  move:     <><path d="M5 12h14M15 8l4 4-4 4"/></>,
  cloudOff: <><path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 17.5 18z"/><path d="M4 4l16 16"/></>,
  camera:   <><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></>,
  list:     <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  alert:    <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></>,
  rain:     <><path d="M7 15a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 17.5 15z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></>,
  money:    <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>,
  fuel:     <><path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M14 9h2l2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M7 8h5"/></>,
  gauge:    <><path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/></>,
  store:    <><path d="M4 9l2-5h12l2 5M4 9h16v11H4zM9 20v-6h6v6"/></>,
  water:    <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></>,
  phone:    <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></>,
  fire:     <><path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4s.5 2 2 2.5C10 8 12 3 12 3z"/></>,
  medical:  <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></>,
  snake:    <><path d="M5 19c3 0 3-4 6-4s3 4 6 4M7 15c0-4 2-6 5-6h3a3 3 0 0 0 0-6h-1"/><circle cx="15" cy="5" r=".6"/></>,
  shield:   <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></>,
  siren:    <><path d="M7 18v-6a5 5 0 0 1 10 0v6M5 18h14v3H5zM12 3v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4"/></>,
  whatsapp: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.2 2 .8-.4 1.6c-3.6.4-7.4-3.4-7-7l1.6-.4.8 2z"/></>,
  pin:      <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></>,
  map:      <><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13.5M15 6.5V20"/></>,
};

export function Icon({ name, size = 20, color, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}>
      {PATHS[name] || null}
    </svg>
  );
}

// Property tile: uploaded logo, else a neutral icon. Emoji icons from older data still render.
export function PropertyBadge({ property, size = 48 }) {
  const box = {
    width: size, height: size, borderRadius: Math.round(size / 4), flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: property?.logo_url ? T.surface : T.bg, border: `1px solid ${T.borderLight}`, color: T.textMid,
    fontSize: Math.round(size / 2),
  };
  if (property?.logo_url) return <div style={box}><img src={property.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, boxSizing: 'border-box' }}/></div>;
  if (property?.icon) return <div style={box} aria-hidden="true">{property.icon}</div>;
  return <div style={box}><Icon name={property?.type === 'commercial' ? 'wheat' : 'home'} size={Math.round(size / 2)}/></div>;
}

// ── Layout pieces ──────────────────────────────────────────────────
export function PageHeader({ title, subtitle, onBack, backLabel = 'Back', right }) {
  return (
    <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', minHeight: 64, boxSizing: 'border-box', padding: onBack ? '8px 8px 8px 4px' : '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
        {onBack && (
          <button onClick={onBack} aria-label={backLabel} style={S.iconBtn}><Icon name="back" size={22}/></button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.25, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: T.textDim }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </header>
  );
}

export const Page = ({ children, bottomPad = 24 }) => (
  <main style={{ maxWidth: 720, margin: '0 auto', padding: `16px 16px ${bottomPad}px`, boxSizing: 'border-box' }}>{children}</main>
);

export const SectionLabel = ({ children, color, style }) => (
  <h2 style={{ ...S.sectionLabel, color: color || T.textMid, ...style }}>{children}</h2>
);

export const Loading = ({ label = 'Loading…' }) => <div style={S.empty} role="status">{label}</div>;
export const Empty = ({ children }) => <div style={S.empty}>{children}</div>;

const TONES = {
  red:     [T.red, T.redFade],
  warn:    [T.warn, T.warnFade],
  primary: [T.primary, T.primaryFade],
  info:    [T.info, T.infoFade],
  ok:      [T.ok, T.okFade],
  neutral: [T.textMid, T.controlBg],
};
export function Chip({ tone = 'neutral', children, onClick, style }) {
  const [fg, bg] = TONES[tone] || TONES.neutral;
  const st = { ...S.chip, color: fg, background: bg, border: 'none', ...style };
  if (onClick) return <button onClick={onClick} style={{ ...st, cursor: 'pointer', minHeight: 28 }}>{children}</button>;
  return <span style={st}>{children}</span>;
}

// Segmented control (filters). White text on the action colour when selected.
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', background: T.controlBg, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <button key={v} aria-pressed={on} onClick={() => onChange(v)}
            style={{ height: 36, padding: '0 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: T.sans, fontSize: 14,
              fontWeight: on ? 600 : 500, background: on ? T.primary : 'transparent', color: on ? T.onPrimary : T.textMid }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, htmlFor, children, error, hint, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label htmlFor={htmlFor} style={{ ...S.fieldLabel, color: error ? T.red : T.textMid }}>{label}{error ? ` — ${error}` : ''}</label>}
      {children}
      {hint && <div style={{ ...S.meta, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ── Overlays (always portalled to <body>) ──────────────────────────
export function Sheet({ title, onClose, children, footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div className="pt-overlay" style={S.overlay} onClick={onClose}>
      <div className="pt-sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={S.sheet} onClick={e => e.stopPropagation()}>
        {title && (
          <div style={S.mHead}>
            <div style={S.mLabel}>{title}</div>
            <button onClick={onClose} aria-label="Close" style={{ ...S.iconBtn, marginRight: -10 }}><Icon name="close"/></button>
          </div>
        )}
        {children}
        {footer && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmSheet({ title, body, confirmLabel = 'Delete', danger = true, onConfirm, onClose }) {
  return (
    <Sheet title={title} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }} style={{ ...(danger ? S.btnDanger : S.btnPrimary), flex: 1 }}>{confirmLabel}</button>
      </>}>
      {body && <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.5, color: T.textMid }}>{body}</p>}
    </Sheet>
  );
}

// "⋯" button that opens a bottom sheet of actions.
// items: [{ icon, label, onClick, danger, disabled }] — falsy entries are skipped.
export function ActionMenu({ title, items, label = 'More actions', size = 44 }) {
  const [open, setOpen] = useState(false);
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <>
      <button aria-label={label} onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{ ...S.iconBtn, width: size, height: size }}>
        <Icon name="dots"/>
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {list.map((it, i) => (
              <button key={i} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}
                style={{ ...S.menuItem, minHeight: 52, color: it.danger ? T.red : T.text, opacity: it.disabled ? 0.45 : 1, cursor: it.disabled ? 'default' : 'pointer' }}>
                {it.icon && <Icon name={it.icon} size={20} color={it.danger ? T.red : T.textMid}/>}
                {it.label}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

export function Toast({ message, onDismiss, tone = 'ok' }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => { const t = setTimeout(() => dismissRef.current(), 3500); return () => clearTimeout(t); }, [message]);
  const bg = tone === 'error' ? T.red : T.text;
  return createPortal(
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 88, transform: 'translateX(-50%)', zIndex: 300, background: bg, color: '#FFFFFF',
      borderRadius: 10, padding: '12px 18px', fontFamily: T.sans, fontSize: 14, fontWeight: 500, boxShadow: T.shadowMd, maxWidth: 'calc(100vw - 32px)' }}>
      {message}
    </div>,
    document.body
  );
}

// Shown when a farm feature's database tables haven't been created yet.
export function SetupNote({ what }) {
  return (
    <div style={{ background: T.warnFade, border: `1px solid ${T.warnBorder}`, color: T.warn, borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.5 }}>
      <b>{what} isn’t set up in the database yet.</b> An admin needs to run the farm-features SQL in Supabase once.
    </div>
  );
}

// Small number tiles used at the top of tabs.
export function Tiles({ items }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      {items.map(([n, l, c]) => (
        <div key={l} style={{ ...S.card, flex: 1, minWidth: 0, padding: '12px 14px' }}>
          <div style={{ fontSize: String(n).length > 7 ? 16 : String(n).length > 5 ? 19 : 22, fontWeight: 700, lineHeight: 1.25, color: n && n !== '0' ? (c || T.text) : T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</div>
          <div style={{ ...S.meta, marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

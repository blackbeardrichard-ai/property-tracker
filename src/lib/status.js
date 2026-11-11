import { T } from './theme';
import { daysUntil } from './format';

// ── Materials ─────────────────────────────────────────────────────
// Needed → Ordered → Delivered → Used. "To buy" = needed + ordered.
export const MATERIAL_STATUSES = ['needed', 'ordered', 'delivered', 'used'];

export const MAT_STATUS = {
  needed:    { label: 'Needed',    color: T.primary, bg: T.primaryFade, border: T.primaryBorder, next: 'ordered',   nextLabel: 'Mark ordered' },
  ordered:   { label: 'Ordered',   color: T.textMid, bg: T.controlBg,   border: T.border,        next: 'delivered', nextLabel: 'Mark delivered' },
  delivered: { label: 'On site',   color: T.info,    bg: T.infoFade,    border: T.infoBorder,    next: 'used',      nextLabel: 'Mark used' },
  used:      { label: 'Used',      color: T.ok,      bg: T.okFade,      border: T.okBorder,      next: null,        nextLabel: null },
};

export const matStatus = m => (m && m.status) || 'needed';
export const isToBuy = m => ['needed', 'ordered'].includes(matStatus(m));
export const isOnSite = m => matStatus(m) === 'delivered';
export const isUsed = m => matStatus(m) === 'used';

// ── Services ──────────────────────────────────────────────────────
// A service with no next_due and never logged is "unscheduled": it can't fall due.
export const DUE_SOON_DAYS = 30;

export const serviceState = svc => {
  const d = daysUntil(svc.next_due);
  if (d === null) return svc.last_done ? 'done' : 'unscheduled'; // one-off already done
  if (d < 0) return 'overdue';
  if (d <= DUE_SOON_DAYS) return 'soon';
  return 'upcoming';
};

export const SERVICE_GROUPS = [
  { id: 'overdue',     label: 'Overdue',                  color: T.red },
  { id: 'soon',        label: 'Due in the next 30 days',  color: T.textMid },
  { id: 'unscheduled', label: 'No due date',              color: T.warn },
  { id: 'upcoming',    label: 'Later',                    color: T.textMid },
  { id: 'done',        label: 'Done (one-off)',           color: T.textMid },
];

// ── Task priority ─────────────────────────────────────────────────
// Medium is the default and is not shown; only high and low get a badge.
export const PRIORITY = {
  high:   { label: 'High',   color: T.red,     bg: T.redFade },
  medium: { label: 'Medium', color: T.textMid, bg: T.controlBg },
  low:    { label: 'Low',    color: T.textMid, bg: T.controlBg },
};

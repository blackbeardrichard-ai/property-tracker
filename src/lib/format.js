// Shared date/number helpers. One copy only — import from here.

export const todayISO = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Parse a YYYY-MM-DD date as a local calendar date (avoids UTC off-by-one).
const parseDay = s => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const fmtDate = d => {
  if (!d) return '—';
  const dt = String(d).length <= 10 ? parseDay(d) : new Date(d);
  return dt.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = d =>
  d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// Whole days from today until a YYYY-MM-DD date (negative = past). null if no date.
export const daysUntil = d => {
  const t = parseDay(d);
  if (!t) return null;
  const now = parseDay(todayISO());
  return Math.round((t - now) / 86400000);
};

// Next due date from a "last done" date and a frequency in months.
// Whole months are added as calendar months; weekly (0.25) as 7 days.
export const calcNextDue = (lastDone, freqMonths) => {
  if (!lastDone || !freqMonths) return null;
  const d = parseDay(lastDone);
  const f = Number(freqMonths);
  if (f < 1) d.setDate(d.getDate() + Math.round(f * 28));
  else d.setMonth(d.getMonth() + Math.round(f));
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const FREQUENCIES = [
  ['Weekly', '0.25'], ['Monthly', '1'], ['Every 3 months', '3'], ['Every 6 months', '6'],
  ['Yearly', '12'], ['Every 2 years', '24'], ['Every 3 years', '36'],
];

export const freqLabel = (months, recurring = true) => {
  if (!recurring) return 'One-off';
  const m = Number(months);
  if (!m) return 'Recurring';
  const hit = FREQUENCIES.find(([, v]) => Number(v) === m);
  if (hit) return hit[0];
  if (m < 12) return `Every ${m} months`;
  return `Every ${m / 12} years`;
};

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "Today 09:14", "Yesterday 17:02", "3 days ago", else "02 Oct 2026".
export function fmtAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const startOf = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000); // local calendar days
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `today ${time}`;
  if (days === 1) return `yesterday ${time}`;
  if (days > 1 && days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { T, S } from '../../lib/theme';
import { fmtDate } from '../../lib/format';
import { Icon, Loading, Empty, SectionLabel } from '../../components/ui';

// Everything with a price, for one property, over the last 12 months. All amounts excl. VAT.
const VAT = 0.15;
const R = v => `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const R2 = v => `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CATS = [
  ['diesel', 'Diesel', T.primary],
  ['materials', 'Materials', T.info],
  ['store', 'Store stock', '#5B4B8A'],
  ['services', 'Services & repairs', T.warn],
  ['livestock', 'Livestock (vet, dip, feed, animals)', T.ok],
];
const monthKey = d => (d || '').slice(0, 7);
const monthLabel = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }); };

async function loadSpend(propertyId, since) {
  const ok = r => (r.error ? [] : r.data || []);
  const assetsRes = await supabase.from('assets').select('id, name').eq('current_property_id', propertyId);
  const assets = ok(assetsRes);
  const [mat, svc, asl, lev, ani, fuel, store] = await Promise.all([
    supabase.from('materials').select('id, name, price_excl, supplier, acquired_at, created_at').eq('property_id', propertyId).not('price_excl', 'is', null),
    supabase.from('service_logs').select('id, done_date, invoice_amount, company, services(name)').eq('property_id', propertyId).gte('done_date', since).not('invoice_amount', 'is', null),
    assets.length ? supabase.from('asset_service_logs').select('id, asset_id, done_date, invoice_amount, company, description').in('asset_id', assets.map(a => a.id)).gte('done_date', since).not('invoice_amount', 'is', null) : { data: [] },
    supabase.from('livestock_events').select('id, event_type, event_date, cost, company, product, group_size').eq('property_id', propertyId).gte('event_date', since).not('cost', 'is', null),
    supabase.from('livestock').select('id, species, tag_number, name, purchase_date, purchase_price').eq('property_id', propertyId).gte('purchase_date', since).not('purchase_price', 'is', null),
    supabase.from('fuel_log').select('id, entry_date, litres, price_excl, notes').eq('property_id', propertyId).eq('kind', 'fill').gte('entry_date', since).not('price_excl', 'is', null),
    supabase.from('store_moves').select('id, created_at, qty, price_excl, note, store_items(name, unit)').eq('property_id', propertyId).eq('kind', 'in').gte('created_at', since).not('price_excl', 'is', null),
  ]);
  const aName = id => assets.find(a => a.id === id)?.name || 'Asset';
  const out = [];
  ok(mat).forEach(m => { const d = (m.acquired_at || m.created_at || '').slice(0, 10); if (d >= since) out.push({ id: `m${m.id}`, cat: 'materials', date: d, what: m.name, who: m.supplier, amount: Number(m.price_excl) }); });
  ok(svc).forEach(l => out.push({ id: `s${l.id}`, cat: 'services', date: l.done_date, what: l.services?.name || 'Service', who: l.company, amount: Number(l.invoice_amount) }));
  ok(asl).forEach(l => out.push({ id: `a${l.id}`, cat: 'services', date: l.done_date, what: `${aName(l.asset_id)}: ${l.description || 'service'}`, who: l.company, amount: Number(l.invoice_amount) }));
  ok(lev).forEach(e => out.push({ id: `e${e.id}`, cat: 'livestock', date: e.event_date, what: `${e.product || e.event_type}${e.group_size > 1 ? ` (${e.group_size} animals)` : ''}`, who: e.company, amount: Number(e.cost) }));
  ok(ani).forEach(a => out.push({ id: `p${a.id}`, cat: 'livestock', date: a.purchase_date, what: `Bought ${a.species} ${a.tag_number || a.name || ''}`.trim(), who: null, amount: Number(a.purchase_price) }));
  ok(fuel).forEach(f => out.push({ id: `f${f.id}`, cat: 'diesel', date: f.entry_date, what: `Diesel ${Number(f.litres).toLocaleString('en-ZA')} L`, who: f.notes, amount: Number(f.price_excl) }));
  ok(store).forEach(s => out.push({ id: `t${s.id}`, cat: 'store', date: s.created_at.slice(0, 10), what: `${s.store_items?.name || 'Store item'} × ${Number(s.qty)} ${s.store_items?.unit || ''}`.trim(), who: s.note, amount: Number(s.price_excl) }));
  return out.filter(x => x.amount > 0);
}

export default function SpendingTab({ property }) {
  const [rows, setRows] = useState(null);
  const now = new Date();
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [month, setMonth] = useState(months[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { let live = true; loadSpend(property.id, `${months[11]}-01`).then(r => { if (live) setRows(r); }); return () => { live = false; }; }, [property.id, months]);
  if (!rows) return <Loading label="Adding up spending…"/>;

  const inMonth = rows.filter(r => monthKey(r.date) === month).sort((a, b) => b.amount - a.amount);
  const total = inMonth.reduce((a, r) => a + r.amount, 0);
  const prevKey = months[months.indexOf(month) + 1];
  const prev = prevKey ? rows.filter(r => monthKey(r.date) === prevKey).reduce((a, r) => a + r.amount, 0) : null;
  const byCat = CATS.map(([k, l, c]) => [k, l, c, inMonth.filter(r => r.cat === k).reduce((a, r) => a + r.amount, 0)]).filter(x => x[3] > 0);
  const yearTotal = rows.reduce((a, r) => a + r.amount, 0);

  const exportXlsx = async () => {
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const data = inMonth.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map(r => ({
        Date: r.date, Category: CATS.find(c => c[0] === r.cat)[1], Item: r.what, 'Supplier / note': r.who || '',
        'Excl. VAT': Math.round(r.amount * 100) / 100, 'VAT 15%': Math.round(r.amount * VAT * 100) / 100, 'Incl. VAT': Math.round(r.amount * (1 + VAT) * 100) / 100,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, month);
      XLSX.writeFile(wb, `${property.name} spending ${month}.xlsx`);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <select aria-label="Month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...S.input, marginBottom: 12 }}>
        {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
      <div style={{ ...S.card, padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28, fontWeight: 700 }}>{R(total)}</span>
          <span style={{ fontSize: 14, color: T.textMid }}>excl. VAT</span>
        </div>
        <div style={S.meta}>{R(total * (1 + VAT))} incl. VAT{prev != null ? ` · ${monthLabel(prevKey).split(' ')[0]} ${R(prev)}` : ''} · last 12 months {R(yearTotal)}</div>
        {byCat.length > 0 && <div style={{ height: 1, background: T.borderLight, margin: '12px 0 4px' }}/>}
        {byCat.map(([k, l, c, v]) => (
          <div key={k} style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', fontSize: 15 }}><span style={{ flex: 1 }}>{l}</span><b>{R(v)}</b></div>
            <div style={{ height: 8, background: T.controlBg, borderRadius: 4, marginTop: 6 }}><div style={{ width: `${Math.max(2, (v / total) * 100)}%`, height: '100%', background: c, borderRadius: 4 }}/></div>
          </div>
        ))}
      </div>

      {inMonth.length === 0 ? <Empty>Nothing with a price in {monthLabel(month)}.</Empty> : (
        <>
          <SectionLabel style={{ marginBottom: 8 }}>Items ({inMonth.length})</SectionLabel>
          <div style={{ ...S.card, overflow: 'hidden', marginBottom: 12 }}>
            {inMonth.slice(0, 40).map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15 }}>{r.what}</div>
                  <div style={S.meta}>{[fmtDate(r.date), r.who].filter(Boolean).join(' · ')}</div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{R2(r.amount)}</span>
              </div>
            ))}
          </div>
          <button onClick={exportXlsx} disabled={busy} style={{ ...S.btnGhost, width: '100%' }}><Icon name="download" size={18}/>{busy ? 'Preparing…' : 'Export month for the accountant'}</button>
        </>
      )}
      <p style={{ ...S.meta, marginTop: 14, lineHeight: 1.5 }}>
        Adds up prices on materials, store stock-ins, diesel deliveries, service invoices, asset services, vet costs and animal purchases. All entered excl. VAT; incl. VAT is at 15%.
      </p>
    </div>
  );
}

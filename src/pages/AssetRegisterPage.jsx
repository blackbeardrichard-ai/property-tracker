import { useState } from 'react';
import { useAssetRegister } from '../hooks/useAssetRegister';
import { T, S } from '../lib/theme';
import { fmtDate } from '../lib/format';
import { Icon, PageHeader, Page, Loading, Empty } from '../components/ui';

function daysLabel(d) {
  if (d == null) return '';
  if (d === 0) return 'today';
  if (d < 30) return `${d} day${d === 1 ? '' : 's'}`;
  if (d < 365) { const m = Math.round(d / 30); return `${m} month${m > 1 ? 's' : ''}`; }
  const y = Math.floor(d / 365), rem = Math.round((d % 365) / 30);
  return `${y} yr${rem ? ` ${rem} mo` : ''}`;
}

function RegisterCard({ asset, propsById }) {
  const [open, setOpen] = useState(false);
  const cur = propsById[asset.current_property_id];
  const moves = asset._movements || [];
  const facts = [['Category', asset.category], ['Year', asset.year], ['Serial no.', asset.serial_number], ['Location', cur?.name]].filter(([, v]) => v);

  return (
    <article style={{ ...S.card, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: T.surface2, color: T.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="truck" size={22}/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{asset.name}</div>
          <div style={S.meta}>{[[asset.make, asset.model].filter(Boolean).join(' '), asset.serial_number && `SN ${asset.serial_number}`].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{cur?.name || '—'}</div>
          {asset._daysHere != null && <div style={S.meta}>here {daysLabel(asset._daysHere)}</div>}
        </div>
        <Icon name={open ? 'chevronU' : 'chevronD'} size={18} color={T.textDim}/>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${T.borderLight}`, padding: '12px 14px 14px' }}>
          {facts.length > 0 && (
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 14px' }}>
              {facts.map(([k, v]) => (
                <div key={k} style={{ background: T.surface2, borderRadius: 8, padding: '8px 10px' }}>
                  <dt style={S.meta}>{k}</dt>
                  <dd style={{ margin: 0, fontSize: 14, color: T.text }}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div style={S.fieldLabel}>Movement history</div>
          {moves.length === 0 ? (
            <div style={{ fontSize: 14, color: T.textMid }}>No moves recorded. At {cur ? cur.name : 'its current property'} since it was registered.</div>
          ) : moves.map((m, i) => {
            const from = propsById[m.from_property], to = propsById[m.to_property];
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, paddingTop: i ? 10 : 2 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0, background: i === 0 ? T.primary : T.border }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{from?.name || 'Unknown'} → {to?.name || 'Unknown'}</div>
                  <div style={S.meta}>{fmtDate(m.moved_date)}{m.authoriser?.full_name ? ` · authorised by ${m.authoriser.full_name}` : ''}</div>
                  {m.reason && <div style={{ fontSize: 14, color: T.textMid, marginTop: 2 }}>“{m.reason}”</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function AssetRegisterPage({ onBack }) {
  const { assets, propsById, loading } = useAssetRegister(true);
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const filtered = !ql ? assets : assets.filter(a =>
    [a.name, a.make, a.model, a.serial_number, a.category, propsById[a.current_property_id]?.name].filter(Boolean).some(v => String(v).toLowerCase().includes(ql)));

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title="Asset register" subtitle="All properties" onBack={onBack}/>
      <Page>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Icon name="search" size={20} color={T.textDim} style={{ position: 'absolute', left: 12, top: 12 }}/>
          <input type="search" aria-label="Search assets" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, make, serial, location…" style={{ ...S.input, paddingLeft: 42 }}/>
        </div>
        {loading ? <Loading label="Loading register…"/> : filtered.length === 0 ? (
          <Empty>{assets.length === 0 ? 'No assets registered yet.' : 'No assets match your search.'}</Empty>
        ) : (
          <>
            <div style={{ ...S.meta, marginBottom: 10 }}>{filtered.length} asset{filtered.length === 1 ? '' : 's'}</div>
            {filtered.map(a => <RegisterCard key={a.id} asset={a} propsById={propsById}/>)}
          </>
        )}
      </Page>
    </div>
  );
}

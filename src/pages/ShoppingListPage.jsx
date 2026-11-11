import { useMemo, useState } from 'react';
import { useGlobalData } from '../hooks/useGlobalData';
import { T, S } from '../lib/theme';
import { fmtDate, todayISO } from '../lib/format';
import { MAT_STATUS, matStatus, isToBuy, isOnSite } from '../lib/status';
import { Icon, PageHeader, Page, PropertyBadge, Chip, Loading, Empty } from '../components/ui';
import { shareList, ShareSheet } from './property/ShoppingTab';

const TONE = { needed: 'primary', ordered: 'neutral', delivered: 'info' };
const taskOf = m => m.subtask?.task?.name || '';

// All properties' "to buy" lists (Needed + Ordered — the same rule as each property's Shopping tab).
export default function ShoppingListPage({ onBack }) {
  const { properties, materials, loading } = useGlobalData(['materials']);
  const [showOnSite, setShowOnSite] = useState(false);
  const [sharing, setSharing] = useState(false);
  const propById = useMemo(() => Object.fromEntries((properties || []).map(p => [p.id, p])), [properties]);

  const groups = useMemo(() => {
    const keep = m => isToBuy(m) || (showOnSite && isOnSite(m));
    const order = { needed: 0, ordered: 1, delivered: 2 };
    const byProp = {};
    (materials || []).filter(keep).forEach(m => { (byProp[m.property_id] = byProp[m.property_id] || []).push(m); });
    return Object.entries(byProp)
      .map(([pid, items]) => ({ property: propById[pid], items: items.sort((a, b) => order[matStatus(a)] - order[matStatus(b)]) }))
      .filter(g => g.property).sort((a, b) => a.property.name.localeCompare(b.property.name));
  }, [materials, propById, showOnSite]);

  const toBuy = (materials || []).filter(m => isToBuy(m) && propById[m.property_id]);
  const text = useMemo(() => {
    const lines = ['Shopping list', fmtDate(todayISO()), ''];
    groups.forEach(g => {
      const items = g.items.filter(isToBuy);
      if (!items.length) return;
      lines.push(`*${g.property.name}*`);
      items.forEach(m => lines.push(`• ${m.name}${m.qty ? ` — ${m.qty} ${m.unit || ''}`.trimEnd() : ''}${matStatus(m) === 'ordered' ? ' (ordered)' : ''}`));
      lines.push('');
    });
    return lines.join('\n').trim();
  }, [groups]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title="Shopping list" subtitle="All properties" onBack={onBack}/>
      <Page>
        {loading ? <Loading/> : (
          <>
            <div style={{ ...S.card, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: toBuy.length ? T.primary : T.textDim }}>{toBuy.length}</span>
                <span style={{ fontSize: 15, color: T.text }}>to buy</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {toBuy.length > 0 && (
                  <button onClick={() => shareList(text, () => setSharing(true))} style={{ ...S.btnPrimary, flex: 2, minWidth: 180 }}><Icon name="send" size={18}/> Share on WhatsApp</button>
                )}
                <button onClick={() => setShowOnSite(v => !v)} aria-pressed={showOnSite} style={{ ...S.btnGhost, flex: 1, minWidth: 140 }}>
                  {showOnSite ? 'Hide on-site items' : 'Show on-site items'}
                </button>
              </div>
            </div>

            {groups.length === 0 && <Empty>Nothing to buy.</Empty>}
            {groups.map(g => (
              <section key={g.property.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <PropertyBadge property={g.property} size={28}/>
                  <h2 style={{ ...S.sectionLabel, color: T.text, fontSize: 15, flex: 1 }}>{g.property.name}</h2>
                  <span style={S.meta}>{g.items.length}</span>
                </div>
                <div style={{ ...S.card, overflow: 'hidden' }}>
                  {g.items.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 14px', borderTop: i ? `1px solid ${T.borderLight}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: T.text }}>{m.name}</div>
                        <div style={S.meta}>{[m.qty ? `${m.qty} ${m.unit || ''}`.trim() : '', taskOf(m)].filter(Boolean).join(' · ')}</div>
                      </div>
                      <Chip tone={TONE[matStatus(m)]}>{MAT_STATUS[matStatus(m)].label}</Chip>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </Page>
      {sharing && <ShareSheet text={text} onClose={() => setSharing(false)}/>}
    </div>
  );
}

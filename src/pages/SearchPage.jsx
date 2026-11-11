import { useState, useMemo } from 'react';
import { useGlobalData } from '../hooks/useGlobalData';
import { T, S } from '../lib/theme';
import { fmtDate } from '../lib/format';
import { MAT_STATUS, matStatus } from '../lib/status';
import { Icon, PageHeader, Page, SectionLabel, Loading, Empty } from '../components/ui';

// Each result opens its property on the matching tab.
const TYPE_META = {
  task:      { icon: 'tasks',  label: 'Tasks',     tab: 'tasks' },
  material:  { icon: 'box',    label: 'Materials', tab: 'shopping' },
  service:   { icon: 'wrench', label: 'Services',  tab: 'services' },
  asset:     { icon: 'truck',  label: 'Assets',    tab: 'assets' },
  livestock: { icon: 'cow',    label: 'Livestock', tab: 'livestock' },
};

export default function SearchPage({ onBack, onOpenProperty }) {
  const { properties, tasks, materials, services, assets, livestock, loading } = useGlobalData();
  const [q, setQ] = useState('');
  const propById = useMemo(() => Object.fromEntries((properties || []).map(p => [p.id, p])), [properties]);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const hit = (...f) => f.filter(Boolean).some(x => String(x).toLowerCase().includes(ql));
    const r = [];
    tasks.forEach(t => {
      if (hit(t.name, t.notes)) r.push({ type: 'task', id: t.id, title: t.name, sub: t.notes || '', propId: t.property_id });
      (t.subtasks || []).forEach(s => { if (hit(s.name)) r.push({ type: 'task', id: s.id, title: s.name, sub: `Subtask of ${t.name}`, propId: t.property_id }); });
    });
    materials.forEach(m => {
      if (hit(m.name, m.unit)) r.push({ type: 'material', id: m.id, title: m.name, sub: [MAT_STATUS[matStatus(m)].label, m.qty ? `${m.qty} ${m.unit || ''}`.trim() : ''].filter(Boolean).join(' · '), propId: m.property_id });
    });
    services.forEach(s => {
      if (hit(s.name, s.notes)) r.push({ type: 'service', id: s.id, title: s.name, sub: s.next_due ? `Next due ${fmtDate(s.next_due)}` : 'No due date', propId: s.property_id });
    });
    assets.forEach(a => {
      if (hit(a.name, a.make, a.model, a.serial_number, a.category)) r.push({ type: 'asset', id: a.id, title: a.name, sub: [a.make, a.model].filter(Boolean).join(' '), propId: a.current_property_id });
    });
    livestock.forEach(l => {
      if (hit(l.name, l.tag_number, l.species, l.breed)) r.push({ type: 'livestock', id: l.id, title: l.name || l.tag_number || l.species, sub: [l.species, l.breed, l.tag_number ? `#${l.tag_number}` : ''].filter(Boolean).join(' · '), propId: l.property_id });
    });
    return r;
  }, [q, tasks, materials, services, assets, livestock]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(r => { (g[r.type] = g[r.type] || []).push(r); });
    return g;
  }, [results]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title="Search" onBack={onBack}/>
      <Page>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Icon name="search" size={20} color={T.textDim} style={{ position: 'absolute', left: 12, top: 12 }}/>
          <input autoFocus type="search" aria-label="Search" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Tasks, materials, services, assets…" style={{ ...S.input, paddingLeft: 42 }}/>
        </div>
        {loading ? <Loading/> : !q.trim() ? <Empty>Search across all your properties.</Empty> : results.length === 0 ? <Empty>No matches for “{q}”.</Empty> : (
          <>
            <div style={{ ...S.meta, marginBottom: 12 }}>{results.length} result{results.length === 1 ? '' : 's'}</div>
            {Object.entries(grouped).map(([type, items]) => {
              const meta = TYPE_META[type];
              return (
                <section key={type} style={{ marginBottom: 18 }}>
                  <SectionLabel style={{ marginBottom: 8 }}>{meta.label} ({items.length})</SectionLabel>
                  <div style={{ ...S.card, overflow: 'hidden' }}>
                    {items.map((item, i) => {
                      const prop = propById[item.propId];
                      return (
                        <button key={`${item.type}-${item.id}`} disabled={!prop} onClick={() => prop && onOpenProperty(prop, meta.tab)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '8px 12px 8px 14px', background: 'none', border: 'none',
                            borderTop: i ? `1px solid ${T.borderLight}` : 'none', textAlign: 'left', cursor: prop ? 'pointer' : 'default', fontFamily: T.sans }}>
                          <Icon name={meta.icon} size={20} color={T.textDim}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{item.title}</div>
                            <div style={{ ...S.meta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[prop?.name, item.sub].filter(Boolean).join(' · ')}</div>
                          </div>
                          {prop && <Icon name="chevronR" size={18} color={T.textDim}/>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </Page>
    </div>
  );
}

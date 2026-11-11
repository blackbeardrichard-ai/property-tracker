import { useState, useEffect, lazy, Suspense } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useServices } from '../hooks/useServices';
import { useRooms } from '../hooks/useRooms';
import { T, S } from '../lib/theme';
import { serviceState, isToBuy } from '../lib/status';
import { Icon, PageHeader, Page, Sheet, Loading } from '../components/ui';
import TasksTab from './property/TasksTab';
import ServicesTab from './property/ServicesTab';
import ShoppingTab from './property/ShoppingTab';
import RoomsTab from './property/RoomsTab';
import MapTab from './property/MapTab';
import { PropertyDetailsSheet } from './property/PropertyDetails';
import { useAuth } from '../context/AuthContext';
import { useRows } from '../hooks/useRows';
import { isLow } from './property/StoreTab';

// Tabs under More are loaded on demand.
const AssetsTab = lazy(() => import('./AssetsTab'));
const LivestockTab = lazy(() => import('./LivestockTab'));
const DieselTab = lazy(() => import('./property/DieselTab'));
const RoundsTab = lazy(() => import('./property/RoundsTab'));
const StoreTab = lazy(() => import('./property/StoreTab'));
const IncidentsTab = lazy(() => import('./property/IncidentsTab'));
const WaterTab = lazy(() => import('./property/WaterTab'));
const SpendingTab = lazy(() => import('./property/SpendingTab'));
const EmergencyTab = lazy(() => import('./property/EmergencyTab'));

const MAIN_TABS = [
  { id: 'tasks',    label: 'Tasks',    icon: 'tasks' },
  { id: 'services', label: 'Services', icon: 'wrench' },
  { id: 'shopping', label: 'Shopping', icon: 'cart' },
  { id: 'rooms',    label: 'Areas',    icon: 'rooms' },
];
const MORE_TABS = [
  { id: 'emergency', label: 'Emergency',      icon: 'siren' },
  { id: 'map',       label: 'Map',            icon: 'map' },
  { id: 'rounds',    label: 'Rounds',         icon: 'list' },
  { id: 'assets',    label: 'Asset register', short: 'Assets', icon: 'truck', commercial: true },
  { id: 'livestock', label: 'Livestock',      icon: 'cow', commercial: true },
  { id: 'store',     label: 'Store',          icon: 'store' },
  { id: 'diesel',    label: 'Diesel',         icon: 'fuel', commercial: true },
  { id: 'incidents', label: 'Incidents',      icon: 'alert' },
  { id: 'water',     label: 'Rain & water',   short: 'Water', icon: 'rain', commercial: true },
  { id: 'spending',  label: 'Spending',       icon: 'money' },
];

function Badge({ n, tone }) {
  if (!n) return null;
  return (
    <span aria-hidden="true" style={{ position: 'absolute', top: -6, left: '50%', marginLeft: 6, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box',
      borderRadius: 9, background: tone === 'red' ? T.red : T.primary, color: '#FFFFFF', fontSize: 11, fontWeight: 700, lineHeight: '18px', textAlign: 'center' }}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

function TabButton({ tab, active, badge, badgeTone, onClick }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      aria-label={badge ? `${tab.label}, ${badge}` : tab.label}
      style={{ flex: 1, minWidth: 0, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.sans, fontSize: 12, fontWeight: active ? 700 : 500,
        color: active ? T.primary : T.textMid }}>
      <span style={{ position: 'relative', display: 'flex' }}>
        <Icon name={tab.icon} size={22}/>
        <Badge n={badge} tone={badgeTone}/>
      </span>
      {tab.short || tab.label}
    </button>
  );
}

export default function PropertyPage({ property, properties, onBack, initialTab, onSaveProperty }) {
  const { isAdmin } = useAuth();
  const isCommercial = property.type === 'commercial';
  const moreTabs = MORE_TABS.filter(t => !t.commercial || isCommercial);
  const allowed = [...MAIN_TABS, ...moreTabs].map(t => t.id);
  const [tab, setTab] = useState(allowed.includes(initialTab) ? initialTab : 'tasks');
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  // If the property's type changes, leave a tab it no longer has.
  useEffect(() => { if (!allowed.includes(tab)) setTab('tasks'); }, [allowed.join(), tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetched once here and shared by the tabs, so badges stay live as things change.
  const tasksApi = useTasks(property.id);
  const servicesApi = useServices(property.id);
  const roomsApi = useRooms(property.id);
  const storeApi = useRows('store_items', property.id, { order: [['name', true]], audit: 'store' });

  const overdue = servicesApi.services.filter(s => serviceState(s) === 'overdue').length;
  const toBuy = tasksApi.tasks.flatMap(t => (t.subtasks || []).flatMap(s => s.materials || [])).filter(isToBuy).length + storeApi.rows.filter(isLow).length;
  const current = [...MAIN_TABS, ...MORE_TABS].find(t => t.id === tab);
  const inMore = moreTabs.some(t => t.id === tab);
  const typeLabel = isCommercial ? 'Commercial' : 'Residential';

  const select = id => { setTab(id); setMoreOpen(false); window.scrollTo(0, 0); };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <PageHeader title={property.name} subtitle={`${typeLabel} · ${current?.label}`} onBack={onBack} backLabel="Back to properties"
        right={tab !== 'emergency' && (
          <button onClick={() => select('emergency')} aria-label="Emergency"
            style={{ height: 40, padding: '0 12px', borderRadius: 20, border: 'none', background: T.red, color: '#FFFFFF', fontFamily: T.sans, fontSize: 14, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginRight: 4 }}>
            <Icon name="siren" size={18}/> SOS
          </button>
        )}/>

      <Page bottomPad={96}>
        {tab === 'tasks'    && <TasksTab tasksApi={tasksApi} rooms={roomsApi.rooms}/>}
        {tab === 'services' && <ServicesTab servicesApi={servicesApi}/>}
        {tab === 'shopping' && <ShoppingTab property={property} tasksApi={tasksApi} storeApi={storeApi}/>}
        {tab === 'rooms'    && <RoomsTab roomsApi={roomsApi} tasks={tasksApi.tasks}/>}
        {tab === 'map'      && <MapTab property={property} canEdit={isAdmin} onEdit={() => setEditing(true)} onSaveProperty={onSaveProperty}/>}
        <Suspense fallback={<Loading/>}>
          {tab === 'assets'    && <AssetsTab property={property} properties={properties || []}/>}
          {tab === 'livestock' && <LivestockTab property={property} areas={roomsApi.rooms}/>}
          {tab === 'diesel'    && <DieselTab property={property}/>}
          {tab === 'rounds'    && <RoundsTab property={property} onTasksChanged={() => tasksApi.fetchTasks()}/>}
          {tab === 'store'     && <StoreTab property={property} storeApi={storeApi}/>}
          {tab === 'incidents' && <IncidentsTab property={property} areas={roomsApi.rooms}/>}
          {tab === 'water'     && <WaterTab property={property}/>}
          {tab === 'spending'  && <SpendingTab property={property}/>}
          {tab === 'emergency' && <EmergencyTab property={property} onSaveProperty={onSaveProperty}/>}
        </Suspense>
      </Page>

      <nav aria-label="Property sections" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, background: T.surface, borderTop: `1px solid ${T.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex' }}>
          {MAIN_TABS.map(t => (
            <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => select(t.id)}
              badge={t.id === 'services' ? overdue : t.id === 'shopping' ? toBuy : 0}
              badgeTone={t.id === 'services' ? 'red' : 'primary'}/>
          ))}
          <TabButton tab={inMore ? current : { id: 'more', label: 'More', icon: 'more' }} active={inMore} onClick={() => setMoreOpen(true)}/>
        </div>
      </nav>

      {moreOpen && (
        <Sheet title="More" onClose={() => setMoreOpen(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {moreTabs.map(t => (
              <button key={t.id} onClick={() => select(t.id)}
                style={{ ...S.menuItem, minHeight: 56, background: tab === t.id ? T.primaryFade : 'none', color: tab === t.id ? T.primary : T.text, fontWeight: tab === t.id ? 600 : 500 }}>
                <Icon name={t.icon} size={22} color={tab === t.id ? T.primary : T.textMid}/> {t.label}
              </button>
            ))}
            {isAdmin && onSaveProperty && (
              <button onClick={() => { setMoreOpen(false); setEditing(true); }} style={{ ...S.menuItem, minHeight: 56, borderTop: `1px solid ${T.borderLight}`, borderRadius: 0, marginTop: 4, gridColumn: '1 / -1' }}>
                <Icon name="pencil" size={22} color={T.textMid}/> Property details
              </button>
            )}
          </div>
        </Sheet>
      )}
      {editing && <PropertyDetailsSheet property={property} onSave={onSaveProperty} onClose={() => setEditing(false)}/>}
    </div>
  );
}

// Working without signal.
//
// Every database call goes through `wrapClient`.
//  • While there is signal, a full copy of everything this user can see (every property, every
//    table) is kept on the phone (IndexedDB) and refreshed in the background.
//  • Without signal, reads are answered from that copy, so any property and any screen opens,
//    not only ones looked at before.
//  • Changes made without signal are applied to the copy at once (so they show everywhere) and
//    queued, in order; they are sent by themselves when signal returns. Photos are queued too.
//  • Requests that hang on a weak signal give up after a few seconds and fall back the same way.

const DB_NAME = 'pt-offline';
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'seq', autoIncrement: true });
      if (!db.objectStoreNames.contains('failed')) db.createObjectStore('failed', { keyPath: 'seq', autoIncrement: true });
      if (!db.objectStoreNames.contains('tables')) db.createObjectStore('tables');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  try {
    const db = await idb();
    return await new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(typeof IDBRequest !== 'undefined' && out instanceof IDBRequest ? out.result : out);
      t.onerror = () => reject(t.error);
    });
  } catch { return undefined; }
}
const cacheGet = key => tx('cache', 'readonly', s => s.get(key));
const cachePut = (key, val) => tx('cache', 'readwrite', s => s.put(val, key));
const queueAll = () => tx('queue', 'readonly', s => s.getAll());
const queueAdd = op => tx('queue', 'readwrite', s => s.add(op));
const queueDel = seq => tx('queue', 'readwrite', s => s.delete(seq));
const failedAll = () => tx('failed', 'readonly', s => s.getAll());
const failedAdd = op => tx('failed', 'readwrite', s => s.add(op));
const failedDel = seq => tx('failed', 'readwrite', s => s.delete(seq));

// ── Status for the banner ─────────────────────────────────────────────────────
const state = { online: typeof navigator === 'undefined' ? true : navigator.onLine !== false, pending: 0, failed: 0, syncing: false, downloading: false, lastSent: 0, lastSync: 0 };
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn({ ...state }));
export const subscribeSync = fn => { listeners.add(fn); fn({ ...state }); return () => listeners.delete(fn); };
async function recount() {
  state.pending = (await queueAll() || []).length;
  state.failed = (await failedAll() || []).length;
  emit();
}
const navOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const useServer = () => state.online && navOnline();

const WRITE = new Set(['insert', 'update', 'upsert', 'delete']);
export const isNetworkError = res =>
  !!res && (res.status === 0 || (res.error && /Failed to fetch|NetworkError|Load failed|network|fetch failed|AbortError|aborted|timed out/i.test(res.error.message || '')));
const isAuthError = res => !!res?.error && (res.status === 401 || /PGRST30[13]|JWT/i.test(`${res.error.code || ''} ${res.error.message || ''}`));
const isMissingTable = err => !!err && /PGRST205|42P01/.test(err.code || '') || /does not exist|Could not find the table/i.test(err?.message || '');
const newId = () => (crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

let raw = null;
// Send one recorded call to the server; gives up after `ms` (weak signal) and reports that as no signal.
async function replay(op, ms = 0) {
  if (op.kind === 'upload') return raw.storage.from(op.bucket).upload(op.path, op.blob, op.opts);
  let b = raw.from(op.table);
  for (const [m, args] of op.calls) b = b[m](...args);
  // The library's own retries (1 + 2 + 4 s on a dropped connection) only delay falling back to the phone copy.
  if (typeof b.retry === 'function') b = b.retry(false);
  if (!ms) return b;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  if (ctl && typeof b.abortSignal === 'function') b = b.abortSignal(ctl.signal);
  let timer;
  const timeout = new Promise(res => { timer = setTimeout(() => { ctl?.abort(); res({ data: null, error: { message: 'Request timed out' }, status: 0 }); }, ms); });
  try { return await Promise.race([b, timeout]); } finally { clearTimeout(timer); }
}
const call = async (op, ms) => { try { return await replay(op, ms); } catch (e) { return { data: null, error: { message: String(e) }, status: 0 }; } };

// After a request fails, work from the phone at once and check for signal in the background
// (so a weak signal doesn't make every screen wait).
let probeTimer = null;
function probeSoon(ms = 3000) {
  if (probeTimer || !raw) return;
  probeTimer = setTimeout(async () => {
    probeTimer = null;
    if (!navOnline()) return;
    const res = await call({ table: 'properties', calls: [['select', ['id']], ['limit', [1]]] }, 6000);
    if (isNetworkError(res)) return;
    state.online = true; emit();
    flushQueue();
  }, ms);
}
const goneOffline = () => { if (state.online) { state.online = false; emit(); } probeSoon(); };

// ── The copy on the phone ─────────────────────────────────────────────────────
// Everything the app reads. Each is downloaded whole (the database only sends rows this user may see).
export const TABLES = ['properties', 'profiles', 'property_users', 'user_permissions', 'rooms', 'tasks', 'subtasks', 'materials',
  'services', 'service_logs', 'assets', 'asset_movements', 'asset_service_logs', 'livestock', 'livestock_events', 'game_counts',
  'meter_readings', 'photos', 'round_templates', 'round_items', 'round_checks', 'store_items', 'store_moves', 'fuel_tanks', 'fuel_log',
  'incidents', 'rain_log', 'boreholes', 'borehole_readings', 'neighbours', 'neighbour_people', 'emergency_contacts',
  'emergency_procedures', 'audit_log', 'branding'];
const NEWEST_ONLY = { audit_log: 'created_at' }; // keep the newest 1 000 only

// How tables join (for selects like '*, subtasks(*, materials(*))').
//   many: child rows whose `fk` points at this row; one: the row this row's `local` column points at.
const RELS = {
  properties:     {},
  tasks:          { subtasks: { table: 'subtasks', fk: 'task_id', many: true }, rooms: { table: 'rooms', local: 'room_id' } },
  subtasks:       { materials: { table: 'materials', fk: 'subtask_id', many: true }, tasks: { table: 'tasks', local: 'task_id' } },
  materials:      { subtasks: { table: 'subtasks', local: 'subtask_id' } },
  services:       { service_logs: { table: 'service_logs', fk: 'service_id', many: true } },
  service_logs:   { services: { table: 'services', local: 'service_id' } },
  assets:         { asset_movements: { table: 'asset_movements', fk: 'asset_id', many: true }, asset_service_logs: { table: 'asset_service_logs', fk: 'asset_id', many: true }, meter_readings: { table: 'meter_readings', fk: 'asset_id', many: true } },
  livestock:      { livestock_events: { table: 'livestock_events', fk: 'animal_id', many: true }, mother_id: { table: 'livestock', local: 'mother_id' } },
  store_items:    { store_moves: { table: 'store_moves', fk: 'item_id', many: true } },
  store_moves:    { store_items: { table: 'store_items', local: 'item_id' } },
  property_users: { profiles: { table: 'profiles', local: 'user_id' }, properties: { table: 'properties', local: 'property_id' } },
  neighbours:     { neighbour_people: { table: 'neighbour_people', fk: 'neighbour_id', many: true } },
  round_templates: { round_items: { table: 'round_items', fk: 'template_id', many: true }, round_checks: { table: 'round_checks', fk: 'template_id', many: true } },
  boreholes:      { borehole_readings: { table: 'borehole_readings', fk: 'borehole_id', many: true } },
  fuel_tanks:     { fuel_log: { table: 'fuel_log', fk: 'tank_id', many: true } },
};
// Deleting a row also deletes these (as the database does).
const CASCADE = {
  tasks: [['subtasks', 'task_id']], subtasks: [['materials', 'subtask_id']], services: [['service_logs', 'service_id']],
  assets: [['asset_movements', 'asset_id'], ['asset_service_logs', 'asset_id'], ['meter_readings', 'asset_id']],
  livestock: [['livestock_events', 'animal_id']], neighbours: [['neighbour_people', 'neighbour_id']],
  round_templates: [['round_items', 'template_id'], ['round_checks', 'template_id']], round_items: [['round_checks', 'item_id']],
  store_items: [['store_moves', 'item_id']], boreholes: [['borehole_readings', 'borehole_id']],
};
// Column defaults the database would fill in, for rows added without signal.
const today = () => new Date().toISOString().slice(0, 10);
const DEFAULTS = {
  incidents: () => ({ status: 'open', occurred_on: today() }), rain_log: () => ({ rain_on: today() }),
  round_templates: () => ({ frequency: 'daily', active: true }), emergency_procedures: () => ({ contact_ids: [], neighbour_ids: [] }),
  subtasks: () => ({ completed: false }), materials: () => ({ status: 'needed' }),
};

const mem = new Map();       // table → { rows: Map(id → row), missing: error|null }
const touched = new Map();   // table → count of local changes (so a download in flight doesn't undo them)
let me = null;               // signed-in user id, for created_by on rows added without signal
let ready = Promise.resolve();

function loadAll() {
  ready = (async () => {
    const db = await idb().catch(() => null);
    if (!db) return;
    const all = await new Promise(res => {
      const out = {}; const t = db.transaction('tables', 'readonly'); const s = t.objectStore('tables');
      const r = s.openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
      r.onerror = () => res(out);
    });
    for (const [t, v] of Object.entries(all)) {
      if (t === '__meta') { state.lastSync = v.lastSync || 0; continue; }
      mem.set(t, { rows: new Map((v.rows || []).map(r => [r.id, r])), missing: v.missing || null });
    }
    emit();
  })();
  return ready;
}
const saveTimers = new Map();
function save(table) {
  clearTimeout(saveTimers.get(table));
  saveTimers.set(table, setTimeout(() => {
    const t = mem.get(table);
    if (t) tx('tables', 'readwrite', s => s.put({ rows: [...t.rows.values()], missing: t.missing }, table));
  }, 200));
}
const bump = table => touched.set(table, (touched.get(table) || 0) + 1);

// Download everything this user can see. Waits until queued changes have gone, so they aren't overwritten.
let syncing = null;
export function syncNow() {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      if (!raw || !navOnline()) return;
      const { data } = await raw.auth.getSession().catch(() => ({ data: null }));
      if (!data?.session) return;
      me = data.session.user?.id || me;
      if (state.pending) { await flushQueue(); if (state.pending) return; }
      await ready;
      state.downloading = true; emit();
      let complete = true;
      const one = async t => {
        const before = touched.get(t) || 0;
        const rows = []; let error = null;
        for (let from = 0; ; from += 1000) {
          const calls = [['select', ['*']]];
          if (NEWEST_ONLY[t]) calls.push(['order', [NEWEST_ONLY[t], { ascending: false }]]);
          calls.push(['range', [from, from + 999]]);
          const res = await call({ table: t, calls }, 20000);
          if (isNetworkError(res) || isAuthError(res)) { complete = false; return false; }
          if (res.error) { error = res.error; break; }
          rows.push(...(res.data || []));
          if ((res.data || []).length < 1000 || NEWEST_ONLY[t]) break;
        }
        if (error && !isMissingTable(error)) { complete = false; return true; }
        if ((touched.get(t) || 0) !== before) { complete = false; return true; } // changed meanwhile; next round
        mem.set(t, { rows: new Map(rows.map(r => [r.id, r])), missing: error ? { code: error.code, message: error.message } : null });
        clearTimeout(saveTimers.get(t));
        await tx('tables', 'readwrite', s => s.put({ rows, missing: mem.get(t).missing }, t));
        return true;
      };
      const todo = [...TABLES];
      let lost = false;
      const workers = Array.from({ length: 5 }, async () => {
        while (todo.length) { if (!(await one(todo.shift()))) { todo.length = 0; lost = true; } }
      });
      await Promise.all(workers);
      if (lost) goneOffline();
      if (complete) {
        state.online = true; state.lastSync = Date.now();
        tx('tables', 'readwrite', s => s.put({ lastSync: state.lastSync }, '__meta'));
      }
    } finally {
      state.downloading = false; emit();
      syncing = null;
    }
  })();
  return syncing;
}
export const setCurrentUser = id => { me = id || null; };

// Forget everything kept on this phone (on sign-out).
export async function clearLocal() {
  mem.clear(); touched.clear(); state.lastSync = 0;
  await tx('tables', 'readwrite', s => s.clear());
  await tx('cache', 'readwrite', s => s.clear());
  await tx('queue', 'readwrite', s => s.clear());
  await tx('failed', 'readwrite', s => s.clear());
  await recount();
}

// ── Answering a query from the copy ───────────────────────────────────────────
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const singular = t => (t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.endsWith('s') ? t.slice(0, -1) : t);
function relation(parent, name) {
  const def = RELS[parent]?.[name];
  if (def) return def;
  const target = mem.get(name);
  if (!target) throw new Error(`unsupported embed ${parent}.${name}`);
  const anyParent = mem.get(parent)?.rows.values().next().value;
  if (anyParent && `${singular(name)}_id` in anyParent) return { table: name, local: `${singular(name)}_id` };
  return { table: name, fk: `${singular(parent)}_id`, many: true };
}
function project(table, row, sel) {
  const tokens = splitTop((sel || '*').replace(/\s+/g, ' '));
  let out = {}; let keep = true;
  for (const tok of tokens) {
    if (tok === '*') { out = { ...row, ...out }; continue; }
    const em = tok.match(/^(?:(\w+):)?(\w+)(?:!(\w+))?\s*\((.*)\)$/s);
    if (em) {
      const [, alias, name, hint, inner] = em;
      const def = relation(table, name);
      const rows = mem.get(def.table)?.rows;
      if (!rows) throw new Error(`no local copy of ${def.table}`);
      let v;
      if (def.many) v = [...rows.values()].filter(r => r[def.fk] === row.id).map(r => project(def.table, r, inner)).filter(Boolean);
      else { const t = row[def.local] != null ? rows.get(row[def.local]) : null; v = t ? project(def.table, t, inner) : null; }
      if (hint === 'inner' && (v == null || (Array.isArray(v) && !v.length))) keep = false;
      out[alias || name] = v;
      continue;
    }
    const col = tok.match(/^(?:(\w+):)?(\w+)(?:::\w+)?$/);
    if (!col) throw new Error(`unsupported select ${tok}`);
    out[col[1] || col[2]] = row[col[2]] === undefined ? null : row[col[2]];
  }
  return keep ? out : null;
}
const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null);
function cmp(a, b) {
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  const x = num(a), y = num(b);
  if (x != null && y != null && (typeof a === 'number' || typeof b === 'number')) return x - y;
  return String(a).localeCompare(String(b), 'en');
}
const same = (a, b) => (a == null || b == null ? false : a === b || cmp(a, b) === 0);
const listOf = v => (Array.isArray(v) ? v : String(v).replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')));
const like = (pat, flags) => new RegExp('^' + String(pat).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*').replace(/_/g, '.') + '$', flags);
function test(op, c, v) {
  switch (op) {
    case 'eq': return r => same(r[c], v);
    case 'neq': return r => r[c] != null && !same(r[c], v);
    case 'gt': return r => r[c] != null && cmp(r[c], v) > 0;
    case 'gte': return r => r[c] != null && cmp(r[c], v) >= 0;
    case 'lt': return r => r[c] != null && cmp(r[c], v) < 0;
    case 'lte': return r => r[c] != null && cmp(r[c], v) <= 0;
    case 'in': { const l = listOf(v); return r => l.some(x => same(r[c], x)); }
    case 'is': return r => (v === null || v === 'null' ? r[c] == null : r[c] === (v === true || v === 'true'));
    case 'like': return r => r[c] != null && like(v).test(String(r[c]));
    case 'ilike': return r => r[c] != null && like(v, 'i').test(String(r[c]));
    case 'contains': return r => {
      const have = r[c];
      if (Array.isArray(have)) return listOf(typeof v === 'string' ? v.replace(/^\{|\}$/g, '') : v).every(x => have.some(h => same(h, x)));
      if (have && typeof have === 'object') return Object.entries(v || {}).every(([k, x]) => same(have[k], x));
      return false;
    };
    default: throw new Error(`unsupported filter ${op}`);
  }
}
function parse(calls) {
  const q = { sel: '*', filters: [], orders: [], limit: null, range: null, single: null, write: null };
  for (const [m, a] of calls) {
    switch (m) {
      case 'select': q.sel = a[0] ?? '*'; q.returning = true; break;
      case 'eq': case 'neq': case 'gt': case 'gte': case 'lt': case 'lte': case 'in': case 'is': case 'like': case 'ilike': case 'contains':
        if (String(a[0]).includes('.')) throw new Error('unsupported filter on joined table');
        q.filters.push(test(m, a[0], a[1])); break;
      case 'not': { const f = test(a[1], a[0], a[2]); q.filters.push(r => r[a[0]] != null && !f(r)); break; }
      case 'filter': { const f = test(a[1], a[0], a[2]); q.filters.push(f); break; }
      case 'match': Object.entries(a[0] || {}).forEach(([c, v]) => q.filters.push(test('eq', c, v))); break;
      case 'order': if (!(a[1]?.foreignTable || a[1]?.referencedTable)) q.orders.push([a[0], a[1] || {}]); break;
      case 'limit': if (!(a[1]?.foreignTable || a[1]?.referencedTable)) q.limit = a[0]; break;
      case 'range': q.range = [a[0], a[1]]; break;
      case 'single': q.single = 'one'; break;
      case 'maybeSingle': q.single = 'maybe'; break;
      case 'insert': case 'update': case 'upsert': case 'delete': q.write = [m, a]; break;
      case 'abortSignal': case 'throwOnError': case 'returns': break;
      default: throw new Error(`unsupported ${m}`);
    }
  }
  return q;
}
function shape(table, q, rows) {
  let list = rows.map(r => project(table, r, q.sel)).filter(Boolean);
  if (q.single === 'one') {
    if (list.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, status: 406 };
    return { data: list[0], error: null, status: 200 };
  }
  if (q.single === 'maybe') {
    if (list.length > 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple rows returned' }, status: 406 };
    return { data: list[0] || null, error: null, status: 200 };
  }
  return { data: list, error: null, status: 200 };
}
function evaluate(table, calls) {
  const q = parse(calls);
  const t = mem.get(table);
  let rows = [...t.rows.values()].filter(r => q.filters.every(f => f(r)));
  if (q.orders.length) {
    rows.sort((a, b) => {
      for (const [c, o] of q.orders) {
        const asc = o.ascending !== false;
        const nullsFirst = o.nullsFirst ?? !asc;
        const x = a[c], y = b[c];
        if (x == null && y == null) continue;
        if (x == null) return nullsFirst ? -1 : 1;
        if (y == null) return nullsFirst ? 1 : -1;
        const d = cmp(x, y);
        if (d) return asc ? d : -d;
      }
      return 0;
    });
  }
  if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
  if (q.limit != null) rows = rows.slice(0, q.limit);
  return shape(table, q, rows);
}

// Apply a change to the copy. `fromServer`: the rows the server sent back, if any.
function applyLocal(op, fromServer) {
  const t = mem.get(op.table);
  if (!t || t.missing) return null;
  const q = parse(op.calls);
  if (!q.write) return null;
  const [m, args] = q.write;
  const now = new Date().toISOString();
  const serverRows = fromServer == null ? [] : Array.isArray(fromServer) ? fromServer : [fromServer];
  const byId = new Map(serverRows.filter(r => r?.id).map(r => [r.id, r]));
  const put = r => { t.rows.set(r.id, r); return r; };
  let changed = [];
  if (m === 'insert' || m === 'upsert') {
    const conflict = (m === 'upsert' && args[1]?.onConflict ? args[1].onConflict.split(',').map(s => s.trim()) : ['id']);
    for (const given of Array.isArray(args[0]) ? args[0] : [args[0]]) {
      const existing = m === 'upsert' ? [...t.rows.values()].find(r => conflict.every(c => same(r[c], given[c]))) : null;
      const base = existing || { created_at: now, created_by: me, ...(DEFAULTS[op.table]?.() || {}) };
      const row = { ...base, ...given, ...(byId.get(given.id) || {}) };
      if (!row.id) row.id = newId();
      changed.push(put(row));
      if (op.table === 'store_moves' && m === 'insert') {
        const items = mem.get('store_items');
        const it = items?.rows.get(row.item_id);
        if (it) {
          const q2 = Number(row.qty) || 0, cur = Number(it.qty) || 0;
          items.rows.set(it.id, { ...it, qty: row.kind === 'in' ? cur + q2 : row.kind === 'out' ? Math.max(cur - q2, 0) : q2 });
          bump('store_items'); save('store_items');
        }
      }
    }
  } else if (m === 'update') {
    for (const r of [...t.rows.values()].filter(r => q.filters.every(f => f(r)))) {
      changed.push(put({ ...r, ...args[0], ...('updated_at' in r ? { updated_at: now } : {}), ...(byId.get(r.id) || {}) }));
    }
  } else if (m === 'delete') {
    const gone = [...t.rows.values()].filter(r => q.filters.every(f => f(r)));
    const drop = (table, ids) => {
      const tt = mem.get(table); if (!tt || !ids.length) return;
      ids.forEach(id => tt.rows.delete(id)); bump(table); save(table);
      (CASCADE[table] || []).forEach(([child, fk]) => {
        const c = mem.get(child); if (!c) return;
        drop(child, [...c.rows.values()].filter(r => ids.includes(r[fk])).map(r => r.id));
      });
    };
    drop(op.table, gone.map(r => r.id));
    changed = gone;
  }
  bump(op.table); save(op.table);
  return { q, rows: changed };
}

// ── Sending queued changes ────────────────────────────────────────────────────
let flushing = null;
let retryTimer = null;
export function flushQueue() {
  if (flushing) return flushing;
  flushing = (async () => {
    state.syncing = true; emit();
    let stoppedForAuth = false;
    try {
      const ops0 = (await queueAll()) || [];
      if (ops0.length) {
        // Make sure the sign-in is fresh before sending (it may have expired while offline).
        const { data } = await raw.auth.getSession().catch(() => ({ data: null }));
        if (!data?.session) { stoppedForAuth = true; return; }
      }
      for (;;) {
        const ops = (await queueAll()) || [];
        if (!ops.length) break;
        const op = ops[0];
        const res = await call(op, 30000);
        if (isNetworkError(res)) { goneOffline(); break; }
        if (isAuthError(res)) { stoppedForAuth = true; break; }
        state.online = true;
        const dup = /23505|already exists|Duplicate/i.test(`${res?.error?.code || ''} ${res?.error?.message || ''} ${res?.error?.statusCode || ''}`);
        // A change that reached the server before the signal dropped comes back as a duplicate: it's already there.
        if (res?.error && !(dup && (op.kind === 'upload' || op.idsAssigned))) await failedAdd({ ...op, error: res.error.message || 'Rejected', failedAt: Date.now() });
        else state.lastSent = Date.now();
        await queueDel(op.seq);
        await recount();
      }
    } finally {
      state.syncing = false;
      await recount();
      flushing = null;
      if (stoppedForAuth && state.pending) { clearTimeout(retryTimer); retryTimer = setTimeout(() => flushQueue(), 20000); }
      else if (!state.pending && state.online) setTimeout(() => syncNow(), 0);
    }
  })();
  return flushing;
}
export const listFailed = failedAll;
export const discardFailed = async seq => { await failedDel(seq); await recount(); syncNow(); };
export async function retryFailed(seq) {
  const all = (await failedAll()) || [];
  const op = all.find(o => o.seq === seq);
  if (!op) return;
  const { seq: _s, error: _e, failedAt: _f, ...rest } = op;
  await failedDel(seq);
  await queueAdd(rest);
  await recount();
  flushQueue();
}
// A photo waiting to be uploaded, so it can still be shown after the app is reopened.
export async function queuedUpload(path) {
  const op = ((await queueAll()) || []).find(o => o.kind === 'upload' && o.path === path);
  return op?.blob || null;
}

// ── Recording query builder ──────────────────────────────────────────────────
function builder(table) {
  const calls = [];
  let promise = null;
  const run = () => {
    if (!promise) {
      const write = calls.find(([m]) => WRITE.has(m));
      promise = write ? runWrite(table, calls, write) : runRead(table, calls);
    }
    return promise;
  };
  const proxy = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (res, rej) => run().then(res, rej);
      if (prop === 'catch') return fn => run().catch(fn);
      if (prop === 'finally') return fn => run().finally(fn);
      return (...args) => { calls.push([prop, args]); return proxy; };
    },
  });
  return proxy;
}

const localAnswer = (table, calls) => {
  const t = mem.get(table);
  if (!t) return null;
  if (t.missing) return { data: null, error: t.missing, status: 404, fromCache: true };
  try { return { ...evaluate(table, calls), fromCache: true }; } catch (e) { console.warn('[offline] not answerable from the phone copy:', table, e.message); return null; }
};

async function runRead(table, calls) {
  await ready;
  const key = JSON.stringify([table, calls]);
  // Without signal, or while changes are waiting to be sent, the copy on the phone is the one to use.
  if (state.pending || !useServer()) {
    const l = localAnswer(table, calls);
    if (l) { if (!state.online) probeSoon(); return l; }
  }
  if (navOnline()) {
    const res = await call({ table, calls }, 8000);
    if (!isNetworkError(res)) {
      if (!state.online) { state.online = true; emit(); flushQueue(); }
      if (!res.error) cachePut(key, res.data);
      return res;
    }
    goneOffline();
  }
  const l = localAnswer(table, calls);
  if (l) return l;
  const cached = await cacheGet(key);
  if (cached !== undefined) return { data: cached, error: null, status: 200, fromCache: true };
  return { data: null, error: { message: 'No signal, and this isn’t saved on this phone yet. Open the app once with signal.' }, status: 0 };
}

async function runWrite(table, calls, write) {
  await ready;
  // New rows get their id here, so the copy on the phone and the server agree, and so later
  // changes and photos can refer to a row before it has been sent.
  const [m, args] = write;
  let idsAssigned = false;
  if (m === 'insert' || (m === 'upsert' && !args[1]?.onConflict)) {
    const list = (Array.isArray(args[0]) ? args[0] : [args[0]]).map(r => (r.id ? r : (idsAssigned = true, { id: newId(), ...r })));
    args[0] = Array.isArray(args[0]) ? list : list[0];
  }
  const op = { kind: 'db', table, calls, idsAssigned, queuedAt: Date.now() };
  // Keep the order of changes: if older changes are still waiting, try to send them first.
  if (state.pending && useServer()) await flushQueue();
  if (!state.pending && useServer()) {
    const res = await call(op, 15000);
    if (!isNetworkError(res)) {
      if (!res.error) applyLocal(op, res.data);
      return res;
    }
    goneOffline();
    // It may or may not have reached the server; queued, it is sent again safely (same ids).
  }
  await queueAdd(op);
  await recount();
  if (!state.online) probeSoon();
  const done = applyLocal(op);
  let data = null;
  if (done?.q.returning) data = shape(table, done.q, done.rows).data;
  else if (m === 'insert' || m === 'upsert') {
    const list = (Array.isArray(args[0]) ? args[0] : [args[0]]).map(r => ({ created_at: new Date().toISOString(), ...r }));
    data = calls.some(([c]) => c === 'single' || c === 'maybeSingle') ? list[0] : list;
  }
  return { data, error: null, status: 202, queued: true };
}

function wrapStorage(storage) {
  return {
    ...storage,
    from(bucket) {
      const real = storage.from(bucket);
      return new Proxy(real, {
        get(t, prop) {
          if (prop !== 'upload') return typeof t[prop] === 'function' ? t[prop].bind(t) : t[prop];
          return async (path, blob, opts) => {
            if (!state.pending && useServer()) {
              let res;
              try { res = await t.upload(path, blob, opts); } catch (e) { res = { error: { message: String(e) }, status: 0 }; }
              if (!isNetworkError(res) && !(res.error && /fetch/i.test(res.error.message || ''))) return res;
              goneOffline();
            }
            await queueAdd({ kind: 'upload', bucket, path, blob, opts, queuedAt: Date.now() });
            await recount();
            return { data: { path }, error: null, queued: true };
          };
        },
      });
    },
  };
}

export function wrapClient(client) {
  raw = client;
  if (typeof window !== 'undefined') {
    loadAll();
    window.addEventListener('online', () => { state.online = true; emit(); flushQueue().then(() => syncNow()); });
    window.addEventListener('offline', () => { state.online = false; emit(); });
    recount().then(() => { if (state.pending) flushQueue(); });
    // Send anything waiting, and refresh the copy every 10 minutes while the app is open.
    setInterval(() => {
      if (!state.online) probeSoon(0);
      else if (state.pending && navOnline()) flushQueue();
      else if (Date.now() - state.lastSync > 10 * 60 * 1000 && document.visibilityState === 'visible') syncNow();
    }, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (state.pending) flushQueue();
      else if (Date.now() - state.lastSync > 2 * 60 * 1000) syncNow();
    });
  }
  return {
    from: table => builder(table),
    rpc: async (...a) => { try { return await client.rpc(...a); } catch (e) { return { data: null, error: { message: String(e) }, status: 0 }; } },
    auth: client.auth,
    functions: client.functions,
    storage: wrapStorage(client.storage),
    raw: client,
  };
}

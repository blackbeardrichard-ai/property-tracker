// Working without signal.
//
// Every database call goes through `wrapClient`. Reads that succeed are kept on the
// phone (IndexedDB) and served from there when there is no signal. Writes made
// without signal are queued, in order, and sent by themselves when signal returns.
// Photo uploads are queued the same way (the photo itself is kept on the phone).

const DB_NAME = 'pt-offline';
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'seq', autoIncrement: true });
      if (!db.objectStoreNames.contains('failed')) db.createObjectStore('failed', { keyPath: 'seq', autoIncrement: true });
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
      t.oncomplete = () => resolve(out?.result !== undefined ? out.result : out);
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
const state = { online: typeof navigator === 'undefined' ? true : navigator.onLine !== false, pending: 0, failed: 0, syncing: false, lastSent: 0 };
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn({ ...state }));
export const subscribeSync = fn => { listeners.add(fn); fn({ ...state }); return () => listeners.delete(fn); };
async function recount() {
  state.pending = (await queueAll() || []).length;
  state.failed = (await failedAll() || []).length;
  emit();
}

const WRITE = new Set(['insert', 'update', 'upsert', 'delete']);
export const isNetworkError = res =>
  !!res && (res.status === 0 || (res.error && /Failed to fetch|NetworkError|Load failed|network|fetch failed/i.test(res.error.message || '')));
const newId = () => (crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

let raw = null;
function replay(op) {
  if (op.kind === 'upload') return raw.storage.from(op.bucket).upload(op.path, op.blob, op.opts);
  let b = raw.from(op.table);
  for (const [m, args] of op.calls) b = b[m](...args);
  return b;
}

// Send everything that was queued, oldest first. Stops at the first network failure.
let flushing = null;
export function flushQueue() {
  if (flushing) return flushing;
  flushing = (async () => {
    state.syncing = true; emit();
    try {
      for (;;) {
        const ops = (await queueAll()) || [];
        if (!ops.length) break;
        const op = ops[0];
        let res;
        try { res = await replay(op); } catch (e) { res = { error: { message: String(e) }, status: 0 }; }
        if (isNetworkError(res)) { state.online = false; break; }
        state.online = true;
        if (res?.error) await failedAdd({ ...op, error: res.error.message || 'Rejected', failedAt: Date.now() });
        else state.lastSent = Date.now();
        await queueDel(op.seq);
        await recount();
      }
    } finally {
      state.syncing = false;
      await recount();
      flushing = null;
    }
  })();
  return flushing;
}
export const listFailed = failedAll;
export const discardFailed = async seq => { await failedDel(seq); await recount(); };
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

// ── Recording query builder ──────────────────────────────────────────────────
function builder(table) {
  const calls = [];
  const run = async () => {
    const write = calls.find(([m]) => WRITE.has(m));
    if (write) return runWrite(table, calls, write);
    return runRead(table, calls);
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

async function runRead(table, calls) {
  const key = JSON.stringify([table, calls]);
  let res = null;
  if (state.online || navigator.onLine !== false) {
    try { res = await replay({ table, calls }); } catch (e) { res = { error: { message: String(e) }, status: 0 }; }
    if (!isNetworkError(res)) {
      if (!state.online) { state.online = true; emit(); flushQueue(); }
      if (!res.error) cachePut(key, res.data);
      return res;
    }
    state.online = false; emit();
  }
  const cached = await cacheGet(key);
  if (cached !== undefined) return { data: cached, error: null, status: 200, fromCache: true };
  return { data: null, error: { message: 'No signal, and this hasn’t been opened on this phone before.' }, status: 0 };
}

async function runWrite(table, calls, write) {
  // Keep the order of changes: if older changes are still waiting, try to send them first.
  if (state.pending) await flushQueue();
  if (!state.pending && (state.online || navigator.onLine !== false)) {
    let res;
    try { res = await replay({ table, calls }); } catch (e) { res = { error: { message: String(e) }, status: 0 }; }
    if (!isNetworkError(res)) { if (!state.online) { state.online = true; emit(); } return res; }
    state.online = false; emit();
  }
  // Queue it. New rows get their id now, so later changes (and photos) can refer to them.
  const [m, args] = write;
  let rows = null;
  if (m === 'insert' || m === 'upsert') {
    const list = (Array.isArray(args[0]) ? args[0] : [args[0]]).map(r => ({ id: newId(), ...r }));
    rows = list.map(r => ({ created_at: new Date().toISOString(), ...r }));
    args[0] = Array.isArray(args[0]) ? list : list[0];
  }
  await queueAdd({ kind: 'db', table, calls, queuedAt: Date.now() });
  await recount();
  const single = calls.some(([c]) => c === 'single' || c === 'maybeSingle');
  return { data: rows ? (single ? rows[0] : rows) : null, error: null, status: 202, queued: true };
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
            if (!state.pending && (state.online || navigator.onLine !== false)) {
              let res;
              try { res = await t.upload(path, blob, opts); } catch (e) { res = { error: { message: String(e) }, status: 0 }; }
              if (!isNetworkError(res) && !(res.error && /fetch/i.test(res.error.message || ''))) return res;
              state.online = false; emit();
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
    window.addEventListener('online', () => { state.online = true; emit(); flushQueue(); });
    window.addEventListener('offline', () => { state.online = false; emit(); });
    recount().then(() => { if (state.pending) flushQueue(); });
    setInterval(() => { if (state.pending && navigator.onLine !== false) flushQueue(); }, 30000);
  }
  return {
    from: table => builder(table),
    rpc: (...a) => client.rpc(...a),
    auth: client.auth,
    functions: client.functions,
    storage: wrapStorage(client.storage),
    raw: client,
  };
}

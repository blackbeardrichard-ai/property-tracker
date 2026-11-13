// Property Tracker — automatic backup to OneDrive.
//
// Reads every table (all properties) and saves two files into the admin's OneDrive:
//   Property Tracker backup YYYY-MM-DD.xlsx   one sheet per table, to open and read
//   Property Tracker backup YYYY-MM-DD.json   everything exactly as stored, for a restore
// Run twice a week by the database scheduler (supabase/sql/2026-11-13_backups.sql), or from
// Settings › Export › "Back up now". Each run is recorded in public.backup_log.
// Photos (files in storage) are not included, only their records.
//
// Secrets (Supabase › Edge Functions › Secrets):
//   SERVICE_ROLE_KEY        already set (used by invite-user)
//   MS_TENANT_ID            Microsoft 365 tenant (directory) id
//   MS_CLIENT_ID            the "Property Tracker Backup" app registration's client id
//   MS_CLIENT_SECRET        that app's client secret
//   BACKUP_ONEDRIVE_USER    the Microsoft 365 sign-in whose OneDrive receives the files
//   BACKUP_FOLDER           optional; default "Property Tracker Backups"
// Deploy with "Verify JWT" off: the function checks callers itself.
import * as XLSX from 'npm:xlsx@0.18.5';

const TABLES = ['properties', 'profiles', 'property_users', 'user_permissions', 'rooms', 'tasks', 'subtasks', 'materials',
  'services', 'service_logs', 'assets', 'asset_movements', 'asset_service_logs', 'livestock', 'livestock_events', 'game_counts',
  'meter_readings', 'photos', 'round_templates', 'round_items', 'round_checks', 'store_items', 'store_moves', 'fuel_tanks', 'fuel_log',
  'incidents', 'rain_log', 'boreholes', 'borehole_readings', 'neighbours', 'neighbour_people', 'emergency_contacts',
  'emergency_procedures', 'audit_log', 'backup_log'];
const MIN_HOURS_BETWEEN = 60; // the scheduler (or anyone else) can't trigger more than one run per 2½ days

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const env = (k: string) => Deno.env.get(k) || '';

export async function run(req: Request, fetchFn: typeof fetch = fetch, now = new Date()): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = env('SUPABASE_URL');
  const key = env('SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ ok: false, error: 'SERVICE_ROLE_KEY secret is not set' }, 500);
  const db = (path: string, init: RequestInit = {}) => fetchFn(`${url}/rest/v1/${path}`, {
    ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

  // Who's asking: an admin (Back up now) runs at once; anyone else only if the last good backup is old enough.
  let by = 'schedule';
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (jwt && jwt.split('.').length === 3) {
    const u = await fetchFn(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${jwt}` } });
    if (u.ok) {
      const user = await u.json();
      const p = await (await db(`profiles?select=role,full_name&id=eq.${user.id}`)).json();
      if (p?.[0]?.role === 'admin') by = p[0].full_name || 'admin';
    }
  }
  if (by === 'schedule') {
    const last = await (await db('backup_log?select=ran_at&ok=eq.true&order=ran_at.desc&limit=1')).json().catch(() => []);
    const hours = last?.[0] ? (now.getTime() - new Date(last[0].ran_at).getTime()) / 3.6e6 : Infinity;
    if (hours < MIN_HOURS_BETWEEN) return reply({ ok: true, skipped: `last backup ${hours.toFixed(1)} h ago` });
  }

  const log = (row: Record<string, unknown>) => db('backup_log', { method: 'POST', body: JSON.stringify({ ran_by: by, ...row }) }).catch(() => null);
  try {
    // 1. Every table, in full (1 000 rows a page).
    const data: Record<string, unknown[]> = {};
    for (const t of TABLES) {
      const rows: unknown[] = [];
      for (let from = 0; ; from += 1000) {
        const r = await db(`${t}?select=*`, { headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
        if (r.status === 404) break;                      // table not created on this database
        if (r.status === 416) break;                      // past the last row
        if (!r.ok) throw new Error(`${t}: ${r.status} ${(await r.text()).slice(0, 200)}`);
        const page = await r.json();
        rows.push(...page);
        if (page.length < 1000) break;
      }
      data[t] = rows;
    }
    const total = Object.values(data).reduce((a, r) => a + r.length, 0);

    // 2. The two files.
    const day = new Date(now.getTime() + 2 * 3.6e6).toISOString().slice(0, 10); // South African date
    const wb = XLSX.utils.book_new();
    const cell = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v).slice(0, 32000) : v);
    for (const [t, rows] of Object.entries(data)) {
      const flat = rows.map(r => Object.fromEntries(Object.entries(r as Record<string, unknown>).map(([k, v]) => [k, cell(v)])));
      XLSX.utils.book_append_sheet(wb, flat.length ? XLSX.utils.json_to_sheet(flat) : XLSX.utils.aoa_to_sheet([['(empty)']]), t.slice(0, 31));
    }
    const xlsx = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
    const json = new TextEncoder().encode(JSON.stringify({ app: 'Property Tracker', made_at: now.toISOString(), tables: data }));

    // 3. Into OneDrive (Microsoft Graph, app-only).
    const tok = await fetchFn(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env('MS_CLIENT_ID'), client_secret: env('MS_CLIENT_SECRET'), scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
    });
    if (!tok.ok) throw new Error(`Microsoft sign-in failed (${tok.status}): ${(await tok.text()).slice(0, 200)}`);
    const { access_token } = await tok.json();
    const g = (path: string, init: RequestInit = {}) => fetchFn(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env('BACKUP_ONEDRIVE_USER'))}/drive/${path}`, {
      ...init, headers: { Authorization: `Bearer ${access_token}`, ...(init.headers || {}) },
    });
    const folder = env('BACKUP_FOLDER') || 'Property Tracker Backups';
    const mk = await g('root/children', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: folder, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }) });
    if (!mk.ok && mk.status !== 409) throw new Error(`OneDrive folder (${mk.status}): ${(await mk.text()).slice(0, 200)}`);
    const files: string[] = [];
    for (const [name, body, type] of [
      [`Property Tracker backup ${day}.xlsx`, xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      [`Property Tracker backup ${day}.json`, json, 'application/json'],
    ] as const) {
      const up = await g(`root:/${encodeURIComponent(folder)}/${encodeURIComponent(name)}:/content`, { method: 'PUT', headers: { 'Content-Type': type }, body });
      if (!up.ok) throw new Error(`Upload ${name} (${up.status}): ${(await up.text()).slice(0, 200)}`);
      files.push(name);
    }
    await log({ ok: true, rows: total, files: `${folder}/${files.join(', ')}`, bytes: xlsx.length + json.length });
    return reply({ ok: true, rows: total, files });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await log({ ok: false, error: error.slice(0, 500) });
    return reply({ ok: false, error }, 500);
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function' && !Deno.env.get('BACKUP_TEST')) Deno.serve(req => run(req));

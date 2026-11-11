// Daily keep-alive for the Supabase free plan, which pauses a project after a
// week without activity. Vercel calls this once a day (see "crons" in vercel.json).
// It makes one small read through Supabase's REST API; no data is changed.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'unauthorised' });
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Supabase URL or key not set in Vercel environment variables' });
  try {
    const r = await fetch(`${url}/rest/v1/properties?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
}

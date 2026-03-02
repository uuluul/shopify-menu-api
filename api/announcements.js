const SUPABASE_URL = 'https://lhyzkjkewcpnqdlhkgqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeXpramtld2NwbnFkbGhrZ3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTI3OTMsImV4cCI6MjA4MjA4ODc5M30.yAYTQ26tBdvMxRMyi8H-pInZJtWl99MWwDFr9cHHZlA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // GET：取得公告
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=*&order=id.desc&limit=1`, { headers });
      const data = await r.json();
      return res.status(200).json(data[0] || null);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // PUT：更新公告
  if (req.method === 'PUT') {
    try {
      const { id, title, content, start_date, end_date, enabled } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const updates = { title, content, enabled };
      if (start_date !== undefined) updates.start_date = start_date || null;
      if (end_date !== undefined) updates.end_date = end_date || null;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(updates)
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

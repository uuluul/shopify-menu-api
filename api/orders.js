const SUPABASE_URL = 'https://lhyzkjkewcpnqdlhkgqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeXpramtld2NwbnFkbGhrZ3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTAzOTMsImV4cCI6MjA4Nzc4NjM5M30.yAYTQ26tBdvMxRMyi8H-pInZJtWl99MWwDFr9cHHZlA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // GET：讀取所有訂單
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST：新增訂單
  if (req.method === 'POST') {
    try {
      const { order_number, customer_name, customer_phone, delivery_method, address_or_time, items, total } = req.body;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ order_number, customer_name, customer_phone, delivery_method, address_or_time, items, total })
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE：刪除訂單
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

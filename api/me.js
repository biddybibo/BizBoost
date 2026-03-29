export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  // Verify token with Supabase
  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.SUPABASE_ANON_KEY }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const user = await userRes.json();

  // Check pro status in database
  const proRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(user.email)}&select=is_pro`, {
    headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
  });
  const proData = await proRes.json();
  const isPro = proData?.[0]?.is_pro === true;

  return res.status(200).json({ email: user.email, isPro });
}

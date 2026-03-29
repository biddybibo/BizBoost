export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  if (!r.ok) return res.status(400).json({ error: data.msg || data.error_description || 'Signup failed' });
  return res.status(200).json({ user: data.user, session: data.session });
}

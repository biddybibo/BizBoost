import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function setProStatus(email) {
  // Upsert subscriber as pro in Supabase
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ email, is_pro: true, subscribed_at: new Date().toISOString() })
  });
}

async function revokeProStatus(email) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ is_pro: false })
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const email = session.customer_details?.email;
    if (email) await setProStatus(email);
  }

  if (event.type === 'customer.subscription.deleted') {
    // Subscription cancelled — revoke pro
    const customerId = session.customer;
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.email) await revokeProStatus(customer.email);
  }

  return res.status(200).json({ received: true });
}

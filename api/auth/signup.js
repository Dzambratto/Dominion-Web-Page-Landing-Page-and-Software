// Server-side signup handler that auto-confirms users using the service role key.
// This bypasses Supabase's email confirmation requirement and rate limits.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    // Fall back — let client handle it normally
    return res.status(503).json({ error: 'Server signup unavailable', fallback: true });
  }

  const { email, password, name, company } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Use admin API to create user with email_confirm: true (bypasses confirmation email)
    const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: { name: (name || '').trim(), company: (company || '').trim() },
      }),
    });

    const createData = await createResp.json();

    if (!createResp.ok) {
      // User might already exist
      const msg = createData?.msg || createData?.message || createData?.error_description || 'Sign up failed.';
      return res.status(createResp.status).json({ error: msg });
    }

    // Now sign them in to get a session
    const signInResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    });

    const signInData = await signInResp.json();

    if (!signInResp.ok) {
      // Created but couldn't sign in — client can sign in themselves
      return res.status(200).json({ created: true, session: null });
    }

    return res.status(200).json({ created: true, session: signInData });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to Vercel environment variables.' });
  }

  const userId = req.query.userId || '';

  // Determine origin so callback can redirect back to the correct domain
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'getdominiontech.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Encode userId + origin in state as base64 JSON
  const state = Buffer.from(JSON.stringify({ userId, origin })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

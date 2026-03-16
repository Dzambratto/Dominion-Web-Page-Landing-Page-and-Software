export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to Vercel environment variables.' });
  }
  const userId = req.query.userId || '';
  const redirectUri = `https://getdominiontech.com/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

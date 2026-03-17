export default async function handler(req, res) {
  const { code, state: rawState, error } = req.query;

  // Parse state: JSON with { userId, origin } encoded as base64, or plain userId for backwards compat
  let userId = '';
  let origin = 'https://getdominiontech.com';
  try {
    const parsed = JSON.parse(Buffer.from(rawState || '', 'base64').toString());
    userId = parsed.userId || '';
    origin = parsed.origin || origin;
  } catch {
    userId = rawState || '';
  }

  const redirectBase = origin;

  if (error) {
    return res.redirect(`${redirectBase}/?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${redirectBase}/?oauth_error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect(`${redirectBase}/?oauth_error=not_configured`);
  }

  // Determine the correct redirect_uri matching the host that initiated the flow
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'getdominiontech.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(`${redirectBase}/?oauth_error=${encodeURIComponent(tokens.error)}`);
    }

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.email || '';

    // Store tokens in an httpOnly cookie keyed by userId (60-day expiry)
    const cookieKey = `gmail_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
    const tokenPayload = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
      email,
    });
    const encoded = Buffer.from(tokenPayload).toString('base64');
    const maxAge = 60 * 24 * 60 * 60; // 60 days
    res.setHeader('Set-Cookie', [
      `${cookieKey}=${encoded}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`,
    ]);

    // Redirect back to app with success params
    return res.redirect(
      `${redirectBase}/?oauth_success=google&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId || '')}`
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.redirect(`${redirectBase}/?oauth_error=server_error`);
  }
}

export default async function handler(req, res) {
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `https://getdominiontech.com/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(`https://getdominiontech.com/?oauth_error=${encodeURIComponent(tokens.error)}`);
    }

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.email || '';

    // Redirect back to app with success params — frontend stores the connection
    return res.redirect(
      `https://getdominiontech.com/?oauth_success=google&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId || '')}`
    );
  } catch (err) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=server_error`);
  }
}

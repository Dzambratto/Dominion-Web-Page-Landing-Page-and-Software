export default async function handler(req, res) {
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=no_code`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  if (!clientId || !clientSecret) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `https://getdominiontech.com/api/auth/microsoft/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(`https://getdominiontech.com/?oauth_error=${encodeURIComponent(tokens.error)}`);
    }

    // Get user email from Microsoft Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.mail || profile.userPrincipalName || '';

    return res.redirect(
      `https://getdominiontech.com/?oauth_success=microsoft&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId || '')}`
    );
  } catch (err) {
    return res.redirect(`https://getdominiontech.com/?oauth_error=server_error`);
  }
}

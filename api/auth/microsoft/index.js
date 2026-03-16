export default function handler(req, res) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  if (!clientId) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured. Add MICROSOFT_CLIENT_ID to Vercel environment variables.' });
  }
  const userId = req.query.userId || '';
  const redirectUri = `https://getdominiontech.com/api/auth/microsoft/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access https://graph.microsoft.com/Mail.Read',
    state: userId,
  });
  return res.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`);
}

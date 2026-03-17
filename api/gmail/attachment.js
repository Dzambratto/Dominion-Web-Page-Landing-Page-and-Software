/**
 * /api/gmail/attachment
 *
 * Downloads a specific Gmail attachment and returns it as base64.
 *
 * Query params:
 *   userId       — Dominion user ID (for token lookup)
 *   messageId    — Gmail message ID
 *   attachmentId — Gmail attachment ID
 */

function getTokensFromCookie(req, userId) {
  const cookieHeader = req.headers.cookie || '';
  const cookieKey = `gmail_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${cookieKey}=`));
  if (!match) return null;
  try {
    const encoded = match.trim().slice(cookieKey.length + 1);
    return JSON.parse(Buffer.from(encoded, 'base64').toString());
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId, messageId, attachmentId } = req.query;

  if (!userId || !messageId || !attachmentId) {
    return res.status(400).json({ error: 'userId, messageId, and attachmentId are required' });
  }

  let tokens = getTokensFromCookie(req, userId);
  if (!tokens) {
    return res.status(401).json({ error: 'no_tokens' });
  }

  if (Date.now() > tokens.expiry - 60000 && tokens.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (!refreshed.error) {
      tokens.access_token = refreshed.access_token;
    }
  }

  try {
    const attachRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!attachRes.ok) {
      const err = await attachRes.json().catch(() => ({}));
      return res.status(attachRes.status).json({ error: 'gmail_error', details: err });
    }

    const data = await attachRes.json();
    // Gmail returns base64url-encoded data; convert to standard base64
    const base64 = (data.data || '').replace(/-/g, '+').replace(/_/g, '/');

    return res.status(200).json({ data: base64, size: data.size });
  } catch (err) {
    console.error('Attachment fetch error:', err);
    return res.status(500).json({ error: 'fetch_failed', message: err.message });
  }
}

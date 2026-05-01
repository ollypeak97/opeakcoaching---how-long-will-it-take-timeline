import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !listId || !serverPrefix) {
    console.error('Missing Mailchimp env vars');
    return res.status(200).json({ success: true });
  }

  const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}`;
  const authHeader = `apikey ${apiKey}`;
  const emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

  try {
    // Upsert the member (adds if new, updates if existing)
    await fetch(`${baseUrl}/members/${emailHash}`, {
      method: 'PUT',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: { FNAME: firstName || '' },
      }),
    });

    // Add the tag separately — works for both new and existing members
    await fetch(`${baseUrl}/members/${emailHash}/tags`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: [{ name: 'lead-magnet-timeline', status: 'active' }],
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mailchimp error:', err);
    return res.status(200).json({ success: true });
  }
}

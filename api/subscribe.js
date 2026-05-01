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
    return res.status(200).json({ success: true }); // Don't block user
  }

  try {
    const response = await fetch(
      `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`,
      {
        method: 'POST',
        headers: {
          Authorization: `apikey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
          merge_fields: {
            FNAME: firstName || '',
          },
          tags: ['lead-magnet-timeline'],
        }),
      }
    );

    const data = await response.json();

    // Member already exists is fine — still a success
    if (response.ok || data.title === 'Member Exists') {
      return res.status(200).json({ success: true });
    }

    console.error('Mailchimp error:', data);
    return res.status(200).json({ success: true }); // Don't block user on MC errors
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(200).json({ success: true }); // Don't block user
  }
}

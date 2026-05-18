export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password || password.trim() !== (process.env.ADMIN_PASSWORD || '').trim()) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !listId || !serverPrefix) {
    return res.status(500).json({ error: 'Missing Mailchimp config' });
  }

  try {
    const response = await fetch(
      `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members?count=1000&fields=members.email_address,members.merge_fields,members.timestamp_signup,members.tags&status=subscribed`,
      {
        headers: {
          Authorization: `apikey ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    const leads = (data.members || [])
      .filter(m => m.tags && m.tags.some(t => t.name === 'lead-magnet-timeline'))
      .map(m => ({
        name: m.merge_fields?.FNAME || '—',
        email: m.email_address,
        date: m.timestamp_signup ? new Date(m.timestamp_signup).toLocaleDateString('en-GB') : '—',
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ leads });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

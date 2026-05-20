import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  const supplied = Buffer.from((password || '').trim());
  const expected = Buffer.from((process.env.ADMIN_PASSWORD || '').trim());
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
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
      `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members?count=1000&fields=members.email_address,members.merge_fields,members.timestamp_signup,members.timestamp_opt,members.last_changed,members.tags&status=subscribed`,
      {
        headers: {
          Authorization: `apikey ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    const TAGS = ['lead-magnet-timeline', '3-day-full-body', 'new 4 day split'];
    const TAG_LABELS = {
      'lead-magnet-timeline': 'Timeline Calculator',
      '3-day-full-body': '3 Day Split',
      'new 4 day split': '4 Day Split',
    };

    const leads = (data.members || [])
      .filter(m => m.tags && m.tags.some(t => TAGS.includes(t.name)))
      .map(m => {
        const matchedTags = m.tags.filter(t => TAGS.includes(t.name));
        return {
          name: m.merge_fields?.FNAME || '—',
          email: m.email_address,
          sources: matchedTags.map(t => TAG_LABELS[t.name] || t.name),
          date: (m.timestamp_signup || m.timestamp_opt || m.last_changed) ? new Date(m.timestamp_signup || m.timestamp_opt || m.last_changed).toLocaleDateString('en-GB') : '—',
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ leads });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

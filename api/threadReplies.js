export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // handle preflight
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { channel, ts } = req.query;

  if (!channel || !ts) {
    return res.status(400).json({ ok: false, error: 'Missing channel or ts parameter' });
  }

  try {
    const slackRes = await fetch(
      `https://slack.com/api/conversations.replies?channel=${encodeURIComponent(channel)}&ts=${encodeURIComponent(ts)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );

    const data = await slackRes.json();

    if (!data.ok) {
      console.error('Slack API error:', data);
      return res.status(500).json({ ok: false, error: 'Slack API error', details: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'backend_error', details: err.message });
  }
}

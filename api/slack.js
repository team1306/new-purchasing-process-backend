export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // handle preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Ensure body is parsed
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Build Slack payload only with existing fields
    const payload = {
      channel: body.channel,
      text: body.text,
    };
    if (body.thread_ts) payload.thread_ts = body.thread_ts;
    if (body.blocks) payload.blocks = body.blocks;

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

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

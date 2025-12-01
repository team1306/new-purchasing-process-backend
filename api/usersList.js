// api/usersList.js - Get all Slack users for frontend caching
export default async function handler(req, res) {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://team1306.github.io'];
  
  const origin = req.headers.origin;
  
  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Call Slack API to list users
    const slackRes = await fetch(
      'https://slack.com/api/users.list',
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );

    const data = await slackRes.json();

    if (!data.ok) {
      console.error('Slack API error:', data);
      return res.status(500).json({ 
        ok: false, 
        error: 'Slack API error', 
        details: data.error 
      });
    }

    // Filter and format users
    const users = data.members
      .filter(member => !member.deleted && !member.is_bot)
      .map(member => ({
        id: member.id,
        name: member.name,
        realName: member.profile?.real_name || '',
        displayName: member.profile?.display_name || '',
        image: member.profile?.image_48 || '',
      }));

    return res.status(200).json({ 
      ok: true, 
      users 
    });
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'backend_error', 
      details: err.message 
    });
  }
}
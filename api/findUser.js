// api/findUser.js - Find Slack user ID by display name
export default async function handler(req, res) {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  const origin = req.headers.origin;
  
  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name } = req.query;

  // Validate parameter
  if (!name) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing name parameter' 
    });
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

    // Search for user by display name or real name
    const searchName = name.toLowerCase().trim();
    const user = data.members.find(member => {
      if (member.deleted || member.is_bot) return false;
      
      const realName = member.profile?.real_name?.toLowerCase() || '';
      const displayName = member.profile?.display_name?.toLowerCase() || '';
      const userName = member.name?.toLowerCase() || '';
      
      return realName === searchName || 
             displayName === searchName || 
             userName === searchName;
    });

    if (user) {
      return res.status(200).json({ 
        ok: true, 
        userId: user.id,
        displayName: user.profile?.display_name || user.profile?.real_name || user.name
      });
    } else {
      return res.status(200).json({ 
        ok: true, 
        userId: null 
      });
    }
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'backend_error', 
      details: err.message 
    });
  }
}
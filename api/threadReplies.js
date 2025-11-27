// api/threadReplies.js - Vercel serverless function
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

  const { channel, ts } = req.query;

  // Validate parameters
  if (!channel || !ts) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing channel or ts parameter' 
    });
  }

  try {
    // Call Slack API to get conversation replies
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
      return res.status(500).json({ 
        ok: false, 
        error: 'Slack API error', 
        details: data.error 
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'backend_error', 
      details: err.message 
    });
  }
}
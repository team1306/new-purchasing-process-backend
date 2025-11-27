// api/slack.js - Vercel serverless function
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

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Parse body if needed
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Validate required fields
    if (!body.channel) {
      return res.status(400).json({ ok: false, error: 'Missing channel parameter' });
    }

    // Build Slack payload
    const payload = {
      channel: body.channel,
      text: body.text || 'Purchase Request Update',
    };
    
    if (body.thread_ts) {
      payload.thread_ts = body.thread_ts;
    }
    
    if (body.blocks) {
      payload.blocks = body.blocks;
    }

    // Call Slack API
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
// api/updateMessage.js - Update parent Slack message
export default async function handler(req, res) {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://team1306.github.io'];

  const origin = req.headers.origin || "*";

  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Parse body if needed
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Validate required parameters
    if (!body.channel || !body.ts) {
      return res.status(400).json({ 
        ok: false, 
        error: "Missing required parameters: channel and ts" 
      });
    }

    // Build Slack payload
    const payload = {
      channel: body.channel,
      ts: body.ts,
      text: body.text || 'Purchase Request Update',
      blocks: body.blocks || undefined,
    };

    // Call Slack API to update message
    const slackRes = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await slackRes.json();

    if (!data.ok) {
      console.error("Slack API error (update):", data);
      return res.status(500).json({ 
        ok: false, 
        error: "Slack API error - Update",
        details: data.error 
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Backend error (updateMessage):", err);
    return res.status(500).json({ 
      ok: false, 
      error: "backend_error",
      details: err.message 
    });
  }
}
// api/slack.js - Vercel serverless function
export default async function handler(req, res) {
  // Allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = req.headers.origin || "*"; // fallback for OPTIONS

  // Always set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // ---- PRE-FLIGHT ----
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ---- NON-POST ----
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Parse body if needed
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    if (!body.channel) {
      return res.status(400).json({ ok: false, error: "Missing channel parameter" });
    }

    // Slack payload
    const payload = {
      channel: body.channel,
      text: body.text || 'Purchase Request Update',
      blocks: body.blocks || undefined,
      thread_ts: body.thread_ts || undefined,
    };

    // Send to Slack
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await slackRes.json();

    console.log(data)

    if (!data.ok) {
      console.error("Slack API error: (Posting)", data);
      return res.status(500).json({ 
        ok: false, 
        error: "Slack API error - Posting",
        details: data.error 
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ 
      ok: false, 
      error: "backend_error",
      details: err.message 
    });
  }
}

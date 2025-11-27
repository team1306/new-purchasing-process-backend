// api/threadReplies.js - Vercel serverless function
export default async function handler(req, res) {
  // Allowed origins (from env or defaults)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  // Vercel strips origin header sometimes (esp. during OPTIONS)
  const origin = req.headers.origin || "*";

  // Always set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // cache preflight 24h
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // ---- PRE-FLIGHT ----
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ---- ACCEPT ONLY GET ----
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { channel, ts } = req.query;

  // Validate required params
  if (!channel || !ts) {
    return res.status(400).json({
      ok: false,
      error: "Missing channel or ts parameter",
    });
  }

  try {
    // Call Slack API to get conversation replies
    const slackRes = await fetch(
      `https://slack.com/api/conversations.replies?channel=${encodeURIComponent(
        channel
      )}&ts=${encodeURIComponent(ts)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );

    const data = await slackRes.json();

    if (!data.ok) {
      console.error("Slack API error:", data);
      return res.status(500).json({
        ok: false,
        error: "Slack API error",
        details: data.error,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({
      ok: false,
      error: "backend_error",
      details: err.message,
    });
  }
}

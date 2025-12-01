// api/errorReport.js - Log frontend errors
export default async function handler(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://team1306.github.io'];

  const origin = req.headers.origin || "*";

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { error, context, userAgent, timestamp, url } = body;

    // Log to console (in production, you'd send to a logging service)
    console.error('=== Frontend Error Report ===');
    console.error('Timestamp:', timestamp || new Date().toISOString());
    console.error('URL:', url);
    console.error('User Agent:', userAgent);
    console.error('Error:', error);
    console.error('Context:', context);
    console.error('============================');

    // Optionally send to Slack error channel
    if (process.env.SLACK_ERROR_CHANNEL_ID) {
      try {
        const errorMessage = {
          channel: process.env.SLACK_ERROR_CHANNEL_ID,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🚨 Frontend Error Report',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*URL:*\n${url || 'Unknown'}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${timestamp || new Date().toISOString()}`
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error:*\n\`\`\`${JSON.stringify(error, null, 2)}\`\`\``
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Context:*\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\``
              }
            }
          ]
        };

        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          body: JSON.stringify(errorMessage),
        });
      } catch (slackErr) {
        console.error('Failed to send error to Slack:', slackErr);
      }
    }

    return res.status(200).json({ ok: true, logged: true });

  } catch (err) {
    console.error("Error logging error:", err);
    return res.status(500).json({ 
      ok: false, 
      error: "backend_error",
      details: err.message 
    });
  }
}
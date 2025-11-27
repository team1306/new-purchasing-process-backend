export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173'); // allow your frontend
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // handle preflight
  }

  try {
    const body = req.body || {};

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: body.channel,
        text: body.text,
        thread_ts: body.thread_ts ?? undefined,
        blocks: body.blocks ?? undefined,
      }),
    });

    const data = await slackRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "backend_error" });
  }
}

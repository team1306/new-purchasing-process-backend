export default async function handler(req, res) {
  try {
    const body = req.method === "POST"
      ? JSON.parse(req.body || "{}")
      : {};

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

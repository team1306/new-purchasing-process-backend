export default async function handler(req, res) {
  const { channel, ts } = req.query;

  const slackRes = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  );

  const data = await slackRes.json();
  res.status(200).json(data);
}

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
    // First get the conversation replies
    const repliesRes = await fetch(
      `https://slack.com/api/conversations.replies?channel=${encodeURIComponent(channel)}&ts=${encodeURIComponent(ts)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );

    const repliesData = await repliesRes.json();

    if (!repliesData.ok) {
      console.error('Slack API error:', repliesData);
      return res.status(500).json({ 
        ok: false, 
        error: 'Slack API error', 
        details: repliesData.error 
      });
    }

    // Get all unique user IDs from messages
    const userIds = [...new Set(
      repliesData.messages
        .filter(msg => msg.user)
        .map(msg => msg.user)
    )];

    // Fetch user info for all users in the thread
    const userInfoPromises = userIds.map(async (userId) => {
      try {
        const userRes = await fetch(
          `https://slack.com/api/users.info?user=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            },
          }
        );
        const userData = await userRes.json();
        if(userData.is_bot) return null;

        return userData.ok ? { id: userId, profile: userData.user.profile, name: userData.user.name } : null;
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
      }
    });

    const usersInfo = await Promise.all(userInfoPromises);
    const userMap = {};
    usersInfo.filter(user => user != null).forEach(user => {
      if (user) {
        userMap[user.id] = {
          display_name: user.profile.display_name || user.profile.real_name || user.name,
          real_name: user.profile.real_name,
          image: user.profile.image_48
        };
      }
    });

    // Add user profile info to each message
    const messagesWithProfiles = repliesData.messages.map(msg => ({
      ...msg,
      user_profile: msg.user ? userMap[msg.user] : null
    }));

    return res.status(200).json({
      ok: true,
      messages: messagesWithProfiles
    });
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'backend_error', 
      details: err.message 
    });
  }
}
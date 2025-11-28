// api/findUser.js - Find Slack user ID by display name with fuzzy matching
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

  const { name } = req.query;

  // Validate parameter
  if (!name) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing name parameter' 
    });
  }

  try {
    // Call Slack API to list users
    const slackRes = await fetch(
      'https://slack.com/api/users.list',
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

    // Helper function to calculate similarity score
    const calculateSimilarity = (str1, str2) => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      // Exact match
      if (s1 === s2) return 100;
      
      // One contains the other
      if (s1.includes(s2) || s2.includes(s1)) {
        const longer = Math.max(s1.length, s2.length);
        const shorter = Math.min(s1.length, s2.length);
        return (shorter / longer) * 100;
      }
      
      // Levenshtein distance for fuzzy matching
      const matrix = [];
      for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
          if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      const distance = matrix[s2.length][s1.length];
      const maxLength = Math.max(s1.length, s2.length);
      return ((maxLength - distance) / maxLength) * 100;
    };

    // Search for user with best match
    const searchName = name.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    const activeMembers = data.members.filter(member => !member.deleted && !member.is_bot);
    
    for (const member of activeMembers) {
      const realName = member.profile?.real_name || '';
      const displayName = member.profile?.display_name || '';
      const userName = member.name || '';
      
      // Calculate similarity scores
      const realNameScore = calculateSimilarity(realName, searchName);
      const displayNameScore = calculateSimilarity(displayName, searchName);
      const userNameScore = calculateSimilarity(userName, searchName);
      
      const maxScore = Math.max(realNameScore, displayNameScore, userNameScore);
      
      console.log(`Checking user ${member.id}: realName="${realName}" (${realNameScore.toFixed(1)}%), displayName="${displayName}" (${displayNameScore.toFixed(1)}%), userName="${userName}" (${userNameScore.toFixed(1)}%)`);
      
      if (maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = {
          id: member.id,
          displayName: member.profile?.display_name || member.profile?.real_name || member.name,
          realName: realName,
          matchScore: maxScore
        };
      }
    }

    console.log(`Best match for "${name}": ${bestMatch ? `${bestMatch.displayName} (${bestMatch.matchScore.toFixed(1)}%)` : 'none'}`);

    // Return match if score is 90% or higher
    if (bestMatch && bestScore >= 90) {
      return res.status(200).json({ 
        ok: true, 
        userId: bestMatch.id,
        displayName: bestMatch.displayName,
        matchScore: bestScore
      });
    } else if (bestMatch) {
      console.log(`Match score ${bestScore.toFixed(1)}% is below 90% threshold`);
      return res.status(200).json({ 
        ok: true, 
        userId: null,
        bestMatch: bestMatch.displayName,
        matchScore: bestScore
      });
    } else {
      return res.status(200).json({ 
        ok: true, 
        userId: null 
      });
    }
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: 'backend_error', 
      details: err.message 
    });
  }
}
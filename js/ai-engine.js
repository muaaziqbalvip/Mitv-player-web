/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — AI Engine (Groq API)
   ═══════════════════════════════════════════════════════════════ */

const AIEngine = (() => {
  const GROQ_KEY = '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';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL = 'llama3-8b-8192';

  let allChannels = [];

  function setChannels(channels) {
    allChannels = channels;
  }

  // ─── GROQ CHAT ────────────────────────────────────────────────
  async function chat(messages, maxTokens = 300) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error: ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch(e) {
      console.error('Groq error:', e);
      throw e;
    }
  }

  // ─── FIND CHANNELS FROM USER QUERY ───────────────────────────
  async function findChannels(query) {
    if (!allChannels.length) return [];

    // Build a short channel index (names + groups)
    const sample = allChannels.slice(0, 1000).map(ch => `${ch.name}|${ch.group}`).join('\n');

    const messages = [
      {
        role: 'system',
        content: `You are an IPTV channel assistant. Given a user request and channel list, return ONLY a JSON array of matching channel names (max 8). Example: ["BBC News","CNN","Al Jazeera"]. Return only the JSON array, nothing else.`
      },
      {
        role: 'user',
        content: `Available channels:\n${sample}\n\nUser request: "${query}"\n\nReturn JSON array of matching channel names:`
      }
    ];

    try {
      const response = await chat(messages, 200);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const names = JSON.parse(cleaned);
      if (!Array.isArray(names)) return [];

      // Match back to channel objects
      return names
        .map(name => allChannels.find(ch => ch.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(ch.name.toLowerCase())))
        .filter(Boolean)
        .slice(0, 8);
    } catch(e) {
      // Fallback: simple keyword search
      const q = query.toLowerCase();
      return allChannels.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        (ch.group || '').toLowerCase().includes(q)
      ).slice(0, 8);
    }
  }

  // ─── PERSONALIZED RECOMMENDATIONS ────────────────────────────
  async function getPersonalizedRecommendations() {
    const trackData = Tracker.getLocalData();
    const topCats = Tracker.getTopCategories(3);
    const recent = Tracker.getRecentChannels(5);

    if (!topCats.length && !recent.length) {
      return getDefaultRecommendations();
    }

    // Build pool from preferred categories
    const pool = [];
    for (const cat of topCats) {
      const catChannels = allChannels.filter(ch => ch.category === cat);
      pool.push(...catChannels.slice(0, 50));
    }

    if (pool.length < 5) return getDefaultRecommendations();

    // Use Groq to pick best ones based on history
    const recentNames = recent.map(r => r.name).join(', ');
    const poolNames = pool.slice(0, 100).map(ch => ch.name).join('\n');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an IPTV recommendation engine. Return ONLY a JSON array of 6 channel names. No explanation.'
        },
        {
          role: 'user',
          content: `User recently watched: ${recentNames}\nFavorite categories: ${topCats.join(', ')}\n\nAvailable channels:\n${poolNames}\n\nPick 6 best channels to recommend:`
        }
      ];

      const response = await chat(messages, 150);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const names = JSON.parse(cleaned);
      if (!Array.isArray(names)) return getDefaultRecommendations();

      const recs = names
        .map(name => pool.find(ch => ch.name.toLowerCase().includes(name.toLowerCase())))
        .filter(Boolean)
        .slice(0, 6);

      return recs.length >= 3 ? recs : getDefaultRecommendations();
    } catch(e) {
      return getDefaultRecommendations();
    }
  }

  function getDefaultRecommendations() {
    // Mix of Islamic + Live + whatever is available
    const islamic = allChannels.filter(ch => ch.category === 'islamic').slice(0, 3);
    const live = allChannels.filter(ch => ch.category === 'live').slice(0, 3);
    return [...islamic, ...live].slice(0, 6);
  }

  // ─── AI CHAT ASSISTANT ────────────────────────────────────────
  async function assistantChat(userMessage, chatHistory) {
    const recent = Tracker.getRecentChannels(5).map(r => r.name).join(', ');
    const topCats = Tracker.getTopCategories(3).join(', ');

    const systemMsg = {
      role: 'system',
      content: `You are MITV AI Assistant — a friendly IPTV helper for the MITV Player app by Muaaz Iqbal (Muslim Islam project).
You help users find channels, answer IPTV questions, and provide recommendations.
User's favorite categories: ${topCats || 'unknown'}.
Recently watched: ${recent || 'none yet'}.
When user asks to find channels, respond with a brief message AND include a JSON block like: CHANNELS:["name1","name2"].
Keep responses short and friendly. If no channels match, suggest alternatives.`
    };

    const messages = [systemMsg, ...chatHistory, { role: 'user', content: userMessage }];

    const response = await chat(messages, 400);

    // Extract channel names if present
    let text = response;
    let channelNames = [];
    const channelsMatch = response.match(/CHANNELS:\[([^\]]*)\]/);
    if (channelsMatch) {
      try {
        channelNames = JSON.parse('[' + channelsMatch[1] + ']');
        text = response.replace(/CHANNELS:\[[^\]]*\]/, '').trim();
      } catch(e) {}
    }

    // Match to actual channels
    const channels = channelNames
      .map(name => allChannels.find(ch =>
        ch.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(ch.name.toLowerCase())
      ))
      .filter(Boolean);

    return { text, channels };
  }

  // ─── GET AI CHIPS ─────────────────────────────────────────────
  function getAIChips() {
    const topCats = Tracker.getTopCategories(3);
    const chips = [];

    if (topCats.includes('islamic')) chips.push('🕌 Islamic Picks');
    if (topCats.includes('sports')) chips.push('⚽ Sports for You');
    if (topCats.includes('news')) chips.push('📰 Top News');
    if (topCats.includes('movies')) chips.push('🎬 Movie Night');
    if (topCats.includes('music')) chips.push('🎵 Music Mix');

    // Always add
    if (!chips.length) {
      chips.push('🕌 Islamic Channels', '📺 Live TV', '🌍 World News');
    }

    return chips.slice(0, 4);
  }

  return { setChannels, findChannels, getPersonalizedRecommendations, assistantChat, getDefaultRecommendations, getAIChips };
})();

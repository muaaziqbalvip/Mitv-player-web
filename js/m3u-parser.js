/* ═══════════════════════════════════════════════════════════════
   MITV Player — M3U Parser
   By: Muaaz Iqbal · Muslim Islam
   ═══════════════════════════════════════════════════════════════ */

const M3UParser = (() => {

  // Parse raw M3U text into channel objects
  function parse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const channels = [];

    if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
      // Try as plain URL list
      return parsePlain(lines);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXTINF:')) {
        const channel = parseExtInf(line);
        // Find the URL on the next non-comment line
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j];
          if (!next.startsWith('#')) {
            channel.url = next;
            i = j;
            break;
          }
          // Parse extra tags like #EXTVLCOPT, etc.
          if (next.startsWith('#EXTVLCOPT:http-user-agent=')) {
            channel.userAgent = next.split('=')[1];
          }
          if (next.startsWith('#EXTHTTP:')) {
            try { channel.httpHeaders = JSON.parse(next.replace('#EXTHTTP:', '')); } catch(e){}
          }
        }
        if (channel.url) {
          channel.id = `ch_${channels.length}`;
          channels.push(channel);
        }
      }
    }

    return channels;
  }

  function parsePlain(lines) {
    return lines
      .filter(l => l.startsWith('http'))
      .map((url, i) => ({
        id: `ch_${i}`,
        name: `Channel ${i + 1}`,
        url,
        group: 'General',
        logo: '',
        tvgId: '',
        tvgName: '',
      }));
  }

  function parseExtInf(line) {
    const channel = {
      name: 'Unknown Channel',
      group: 'General',
      logo: '',
      tvgId: '',
      tvgName: '',
      url: '',
      userAgent: '',
      httpHeaders: null,
    };

    // Extract duration (not used for IPTV but parsed anyway)
    // #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Name

    // Extract attributes
    const attrs = {
      'tvg-id': /tvg-id="([^"]*)"/i,
      'tvg-name': /tvg-name="([^"]*)"/i,
      'tvg-logo': /tvg-logo="([^"]*)"/i,
      'group-title': /group-title="([^"]*)"/i,
      'tvg-language': /tvg-language="([^"]*)"/i,
      'tvg-country': /tvg-country="([^"]*)"/i,
    };

    for (const [key, rx] of Object.entries(attrs)) {
      const m = line.match(rx);
      if (m) {
        switch(key) {
          case 'tvg-id': channel.tvgId = m[1]; break;
          case 'tvg-name': channel.tvgName = m[1]; break;
          case 'tvg-logo': channel.logo = m[1]; break;
          case 'group-title': channel.group = m[1] || 'General'; break;
          case 'tvg-language': channel.language = m[1]; break;
          case 'tvg-country': channel.country = m[1]; break;
        }
      }
    }

    // Extract channel name (after last comma)
    const commaIdx = line.lastIndexOf(',');
    if (commaIdx !== -1) {
      channel.name = line.slice(commaIdx + 1).trim() || channel.tvgName || 'Unknown';
    }

    // Fallback name
    if (!channel.name || channel.name === 'Unknown') {
      channel.name = channel.tvgName || 'Channel';
    }

    return channel;
  }

  // Categorize channels by keywords
  const CATEGORIES = {
    islamic: [
      'islam', 'muslim', 'quran', 'قرآن', 'مسلم', 'اسلام', 'prayer',
      'ramadan', 'masjid', 'mosque', 'deen', 'iqra', 'peace tv',
      'hidayat', 'huda', 'noor', 'azan', 'sunnah', 'hadith',
      'mecca', 'medina', 'kaba', 'hajj', 'halal', 'islamic',
    ],
    news: [
      'news', 'bbc', 'cnn', 'fox news', 'abc news', 'nbc news',
      'sky news', 'al jazeera', 'aljazeera', 'مخبر', 'geo news',
      'ary news', 'dawn', 'aaj', 'samaa', 'express news', 'dunya',
      'india tv', 'ndtv', 'zee news', 'times now', 'republic',
      'channel 4 news', 'al arabiya', 'france 24', 'dw', 'euronews',
    ],
    movies: [
      'movie', 'cinema', 'film', 'hbo', 'showtime', 'star', 'sony',
      'max', 'filmfare', 'bollywood', 'hollywood', 'oscar',
      'netfli', 'amazon', 'apple tv', 'zee cinema', 'b4u',
      'cinemas', 'pictures', 'entertainment', 'drama',
    ],
    music: [
      'music', 'mtv', 'vh1', 'vevo', 'beats', 'jazz', 'classical',
      'pop', 'rock', 'hip hop', 'radio', 'hits', 'melody', 'sound',
      'audio', 'fm', 'chart', 'songs', 'gaane', 'music tv',
    ],
    sports: [
      'sport', 'espn', 'bein', 'sky sport', 'cricket', 'football',
      'soccer', 'nba', 'nfl', 'tennis', 'golf', 'f1', 'formula',
      'star sports', 'ptv sports', 'willow', 'ten sports',
    ],
  };

  function categorize(channel) {
    const text = `${channel.name} ${channel.group} ${channel.tvgName}`.toLowerCase();
    const groupLower = channel.group.toLowerCase();

    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
      for (const kw of keywords) {
        if (text.includes(kw) || groupLower.includes(kw)) {
          return cat;
        }
      }
    }
    return 'live'; // default → Live TV
  }

  function groupChannels(channels) {
    const groups = {
      live: [],
      news: [],
      movies: [],
      music: [],
      islamic: [],
      sports: [],
    };

    const byGroup = {};

    for (const ch of channels) {
      ch.category = categorize(ch);
      if (groups[ch.category]) {
        groups[ch.category].push(ch);
      } else {
        groups.live.push(ch);
      }

      // Also group by original group-title
      const grp = ch.group || 'General';
      if (!byGroup[grp]) byGroup[grp] = [];
      byGroup[grp].push(ch);
    }

    return { groups, byGroup };
  }

  // Fetch and parse M3U from URL (with CORS proxy fallback)
  async function fetchAndParse(url, onProgress) {
    const proxies = [
      url, // Direct first
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
    ];

    let lastError = null;

    for (let i = 0; i < proxies.length; i++) {
      try {
        onProgress && onProgress(Math.round((i / proxies.length) * 50), `Trying source ${i + 1}...`);

        const res = await fetch(proxies[i], {
          headers: {
            'Accept': 'text/plain, application/x-mpegurl, */*',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();

        if (!text || text.length < 20) throw new Error('Empty response');

        onProgress && onProgress(70, 'Parsing channels...');

        const channels = parse(text);

        if (channels.length === 0) throw new Error('No channels found in playlist');

        onProgress && onProgress(90, `Found ${channels.length} channels...`);

        const { groups, byGroup } = groupChannels(channels);

        onProgress && onProgress(100, 'Done!');

        return { channels, groups, byGroup, total: channels.length };

      } catch (err) {
        lastError = err;
        console.warn(`Source ${i + 1} failed:`, err.message);
      }
    }

    throw new Error(lastError?.message || 'Failed to load playlist from all sources');
  }

  return { parse, fetchAndParse, categorize, groupChannels };
})();

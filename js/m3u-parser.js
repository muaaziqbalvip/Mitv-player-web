/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — M3U Parser v3
   Handles: M3U, M3U8, Xtream Codes, millions of channels
   ═══════════════════════════════════════════════════════════════ */

const M3UParser = (() => {

  // ─── CATEGORY KEYWORDS ───────────────────────────────────────
  const CAT_KEYWORDS = {
    islamic:['islam','muslim','quran','قرآن','مسلم','اسلام','prayer','ramadan','masjid','mosque','deen','iqra','peace tv','hidayat','huda','noor','azan','sunnah','hadith','mecca','medina','kaba','hajj','halal','islamic','al quran','quran kareem','madani','sunni','shia','fatwa','hijri'],
    news:['news','bbc','cnn','fox news','abc news','nbc news','sky news','al jazeera','aljazeera','geo news','ary news','dawn','aaj','samaa','express news','dunya','india tv','ndtv','zee news','times now','republic','channel 4 news','al arabiya','france 24','dw','euronews','cbs news','msnbc','bloomberg','wion','dd news','reporter'],
    movies:['movie','cinema','film','hbo','showtime','star','max','filmfare','bollywood','hollywood','oscar','zee cinema','b4u','cinemas','pictures','entertainment','drama','premiere','channel cinema','cine','filmbox','cinemax','stargate','tv5 monde'],
    series:['series','season','episode','zee tv','star plus','colors','sony tv','life ok','sahara','zee5','hotstar','ullu','altbalaji','netflix','prime video','disney','serial'],
    music:['music','mtv','vh1','vevo','beats','jazz','classical','pop','rock','hip hop','radio','hits','melody','sound','fm','chart','songs','gaane','music tv','b4u music','eros','music india','song'],
    sports:['sport','espn','bein','sky sport','cricket','football','soccer','nba','nfl','tennis','golf','f1','formula','star sports','ptv sports','willow','ten sports','supersport','eurosport','dazn','fight','boxing','ufc','mma','hockey','basketball','olympic'],
    kids:['kids','cartoon','nickelodeon','nick','disney','cartoon network','cn','pogo','baby','junior','child','children','toons','anime','boomerang','discovery kids'],
    news_urdu:['urdu','pakistan','urdu news','geo','ary'],
    documentary:['discovery','nat geo','national geographic','documentary','history channel','animal planet','science','tlc','travel','explore'],
  };

  const PROXIES = [
    url => url,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://thingproxy.freeboard.io/fetch/${url}`,
    url => `https://yacdn.org/serve/${url}`,
  ];

  // ─── MAIN: FETCH & PARSE ──────────────────────────────────────
  async function fetchAndParse(url, onProgress) {
    // Xtream Codes detection
    if (isXtreamUrl(url)) {
      return fetchXtream(url, onProgress);
    }
    return fetchM3U(url, onProgress);
  }

  function isXtreamUrl(url) {
    return url.includes('get.php') || url.includes('player_api') || url.includes('xmltv.php');
  }

  // ─── FETCH M3U ────────────────────────────────────────────────
  async function fetchM3U(url, onProgress) {
    let lastErr = null;

    for (let i = 0; i < PROXIES.length; i++) {
      try {
        onProgress?.(Math.round(10 + i * 10), `Trying source ${i + 1}/${PROXIES.length}...`);
        const proxyUrl = PROXIES[i](url);
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 20000);

        const res = await fetch(proxyUrl, {
          signal: ctrl.signal,
          headers: { 'Accept': 'text/plain,application/x-mpegurl,*/*' }
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text || text.length < 30) throw new Error('Empty response');

        onProgress?.(60, 'Parsing channels...');
        const channels = parseM3UText(text, onProgress);
        if (channels.length === 0) throw new Error('No channels found');

        onProgress?.(90, `Categorizing ${channels.length} channels...`);
        const grouped = groupChannels(channels);

        onProgress?.(100, 'Done!');
        return { channels, ...grouped, total: channels.length, source: 'm3u' };

      } catch(e) {
        lastErr = e;
        console.warn(`Proxy ${i + 1} failed:`, e.message);
      }
    }
    throw new Error(lastErr?.message || 'Failed to load playlist');
  }

  // ─── PARSE M3U TEXT (streaming, chunk-based for large files) ──
  function parseM3UText(text, onProgress) {
    const channels = [];
    // Handle both \r\n and \n
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const total = lines.length;

    let i = 0;
    // Skip until #EXTM3U header (be lenient — some playlists don't have it)
    if (lines[0] && lines[0].startsWith('#EXTM3U')) i = 1;

    while (i < lines.length) {
      const line = lines[i].trim();
      i++;

      if (!line || line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTGRP')) {
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        const channel = parseExtInf(line);
        // Skip empty VLC opts until we find URL
        while (i < lines.length) {
          const next = lines[i].trim();
          i++;
          if (!next) continue;
          if (next.startsWith('#EXTVLCOPT:http-user-agent=')) {
            channel.userAgent = next.split('=').slice(1).join('=');
            continue;
          }
          if (next.startsWith('#EXTHTTP:')) {
            try { channel.httpHeaders = JSON.parse(next.replace('#EXTHTTP:', '')); } catch(e) {}
            continue;
          }
          if (next.startsWith('#')) continue; // skip other comments
          channel.url = next;
          break;
        }
        if (channel.url && channel.url.length > 5) {
          channel.id = `ch_${channels.length}`;
          channels.push(channel);
        }
        // Progress every 5000 channels
        if (channels.length % 5000 === 0) {
          onProgress?.(60 + Math.round((i / total) * 25), `Parsed ${channels.length} channels...`);
        }
      } else if (isUrl(line)) {
        // Plain URL list fallback
        channels.push({
          id: `ch_${channels.length}`,
          name: `Channel ${channels.length + 1}`,
          url: line,
          group: 'General',
          logo: '',
          tvgId: '',
          tvgName: '',
          category: 'live'
        });
      }
    }

    return channels;
  }

  function isUrl(str) {
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('rtmp://') || str.startsWith('rtmpe://') || str.startsWith('rtmps://');
  }

  function parseExtInf(line) {
    const ch = { name: 'Channel', group: 'General', logo: '', tvgId: '', tvgName: '', url: '' };

    const extract = (rx) => { const m = line.match(rx); return m ? m[1] : ''; };

    ch.tvgId = extract(/tvg-id="([^"]*)"/i);
    ch.tvgName = extract(/tvg-name="([^"]*)"/i);
    ch.logo = extract(/tvg-logo="([^"]*)"/i);
    ch.group = extract(/group-title="([^"]*)"/i) || 'General';
    ch.language = extract(/tvg-language="([^"]*)"/i);
    ch.country = extract(/tvg-country="([^"]*)"/i);

    // Name after last comma
    const ci = line.lastIndexOf(',');
    if (ci !== -1) {
      ch.name = line.slice(ci + 1).trim();
    }
    if (!ch.name) ch.name = ch.tvgName || 'Channel';

    return ch;
  }

  // ─── XTREAM CODES ─────────────────────────────────────────────
  async function fetchXtream(url, onProgress) {
    // Parse Xtream URL: http://host:port/get.php?username=X&password=Y
    let host, username, password;
    try {
      const u = new URL(url);
      host = `${u.protocol}//${u.host}`;
      username = u.searchParams.get('username');
      password = u.searchParams.get('password');
    } catch(e) { throw new Error('Invalid Xtream URL'); }

    onProgress?.(10, 'Connecting to Xtream panel...');

    // Live streams
    const allChannels = [];

    try {
      const liveUrl = `${host}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
      const liveRes = await fetchJson(liveUrl);
      if (Array.isArray(liveRes)) {
        onProgress?.(40, `Got ${liveRes.length} live channels...`);
        liveRes.forEach((ch, idx) => {
          allChannels.push({
            id: `xt_live_${idx}`,
            name: ch.name || `Channel ${idx}`,
            url: `${host}/live/${username}/${password}/${ch.stream_id}.m3u8`,
            group: ch.category_name || 'Live TV',
            logo: ch.stream_icon || '',
            tvgId: String(ch.stream_id),
            tvgName: ch.name || '',
            category: 'live',
            xtreamType: 'live'
          });
        });
      }
    } catch(e) { console.warn('Live fetch failed:', e); }

    try {
      onProgress?.(55, 'Fetching VOD movies...');
      const vodUrl = `${host}/player_api.php?username=${username}&password=${password}&action=get_vod_streams`;
      const vodRes = await fetchJson(vodUrl);
      if (Array.isArray(vodRes)) {
        vodRes.slice(0, 5000).forEach((ch, idx) => {
          allChannels.push({
            id: `xt_vod_${idx}`,
            name: ch.name || `Movie ${idx}`,
            url: `${host}/movie/${username}/${password}/${ch.stream_id}.mp4`,
            group: ch.category_name || 'Movies',
            logo: ch.stream_icon || ch.movie_image || '',
            tvgId: String(ch.stream_id),
            tvgName: ch.name || '',
            category: 'movies',
            xtreamType: 'vod'
          });
        });
      }
    } catch(e) { console.warn('VOD fetch failed:', e); }

    try {
      onProgress?.(75, 'Fetching series...');
      const seriesUrl = `${host}/player_api.php?username=${username}&password=${password}&action=get_series`;
      const seriesRes = await fetchJson(seriesUrl);
      if (Array.isArray(seriesRes)) {
        seriesRes.slice(0, 3000).forEach((ch, idx) => {
          allChannels.push({
            id: `xt_series_${idx}`,
            name: ch.name || `Series ${idx}`,
            url: `${host}/series/${username}/${password}/${ch.series_id}.m3u8`,
            group: ch.category_name || 'Series',
            logo: ch.cover || ch.backdrop_path || '',
            tvgId: String(ch.series_id),
            tvgName: ch.name || '',
            category: 'series',
            xtreamType: 'series'
          });
        });
      }
    } catch(e) { console.warn('Series fetch failed:', e); }

    if (allChannels.length === 0) throw new Error('No content found from Xtream panel');

    onProgress?.(90, 'Organizing content...');
    // Re-categorize based on group
    allChannels.forEach(ch => {
      if (ch.xtreamType !== 'live') return;
      ch.category = categorize(ch);
    });

    const grouped = groupChannels(allChannels);
    onProgress?.(100, 'Done!');
    return { channels: allChannels, ...grouped, total: allChannels.length, source: 'xtream' };
  }

  async function fetchJson(url) {
    for (const makeUrl of PROXIES) {
      try {
        const res = await fetch(makeUrl(url), { signal: AbortSignal.timeout(12000) });
        if (!res.ok) continue;
        const json = await res.json();
        return json;
      } catch(e) {}
    }
    throw new Error('JSON fetch failed');
  }

  // ─── CATEGORIZE ───────────────────────────────────────────────
  function categorize(ch) {
    const text = `${ch.name} ${ch.group} ${ch.tvgName}`.toLowerCase();
    for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
      for (const kw of kws) {
        if (text.includes(kw)) return cat;
      }
    }
    return 'live';
  }

  // ─── GROUP CHANNELS ───────────────────────────────────────────
  function groupChannels(channels) {
    const groups = { live:[], news:[], movies:[], series:[], music:[], sports:[], islamic:[], kids:[], documentary:[] };
    const byGroup = {};

    for (const ch of channels) {
      if (!ch.category) ch.category = categorize(ch);
      const cat = ch.category;

      if (groups[cat]) {
        groups[cat].push(ch);
      } else {
        groups.live.push(ch);
        ch.category = 'live';
      }

      const grp = ch.group || 'General';
      if (!byGroup[grp]) byGroup[grp] = [];
      if (byGroup[grp].length < 200) byGroup[grp].push(ch); // cap per group
    }

    return { groups, byGroup };
  }

  // ─── CUSTOM XTREAM BUILD ──────────────────────────────────────
  async function fetchXtreamCustom(host, username, password, onProgress) {
    const url = `${host}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;
    return fetchM3U(url, onProgress);
  }

  return { fetchAndParse, fetchXtreamCustom, parseM3UText, groupChannels, categorize };
})();

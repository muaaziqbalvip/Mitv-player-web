/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — Tracker (Firebase Analytics)
   Tracks: views, duration, searches, categories, behavior
   ═══════════════════════════════════════════════════════════════ */

const Tracker = (() => {
  const LOCAL_KEY = 'mitv_tracking';
  let watchStart = null;
  let currentChannel = null;
  let sessionData = {
    sessionId: 'sess_' + Date.now(),
    startTime: Date.now(),
    events: [],
    channelsWatched: [],
    categoriesViewed: {},
    searchQueries: [],
    totalWatchTime: 0,
  };

  // Local tracking for AI (works even in guest mode)
  let localData = loadLocalData();

  function loadLocalData() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveLocalData() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(localData)); } catch(e) {}
  }

  // ─── Track channel play ───────────────────────────────────────
  function trackChannelPlay(channel) {
    currentChannel = channel;
    watchStart = Date.now();

    const event = {
      type: 'channel_play',
      channelName: channel.name,
      channelGroup: channel.group,
      category: channel.category,
      timestamp: Date.now()
    };

    // Session
    sessionData.events.push(event);
    sessionData.channelsViewed = (sessionData.channelsViewed || 0) + 1;

    // Category frequency
    const cat = channel.category || 'live';
    sessionData.categoriesViewed[cat] = (sessionData.categoriesViewed[cat] || 0) + 1;

    // Local history for AI
    if (!localData.watchHistory) localData.watchHistory = [];
    localData.watchHistory.unshift({
      name: channel.name,
      group: channel.group,
      category: cat,
      logo: channel.logo,
      url: channel.url,
      ts: Date.now()
    });
    localData.watchHistory = localData.watchHistory.slice(0, 200); // keep last 200

    // Category preferences
    if (!localData.categoryPrefs) localData.categoryPrefs = {};
    localData.categoryPrefs[cat] = (localData.categoryPrefs[cat] || 0) + 1;

    saveLocalData();

    // Firebase
    FirebaseConfig.pushUserData('history', {
      channelName: channel.name,
      group: channel.group,
      category: cat,
      logo: channel.logo || '',
      ts: Date.now()
    });
    FirebaseConfig.incrementCounter(`plays/${cat}`);
    FirebaseConfig.incrementCounter('plays/total');
  }

  // ─── Track watch time ─────────────────────────────────────────
  function trackWatchEnd() {
    if (!watchStart || !currentChannel) return;
    const duration = Math.round((Date.now() - watchStart) / 1000);
    if (duration < 2) { watchStart = null; return; }

    sessionData.totalWatchTime += duration;

    // Local
    if (!localData.watchTime) localData.watchTime = {};
    const cat = currentChannel.category || 'live';
    localData.watchTime[cat] = (localData.watchTime[cat] || 0) + duration;
    localData.totalWatchTime = (localData.totalWatchTime || 0) + duration;
    saveLocalData();

    // Firebase
    FirebaseConfig.saveUserData(`watchTime/${Date.now()}`, {
      channel: currentChannel.name,
      category: cat,
      duration,
      ts: Date.now()
    });

    watchStart = null;
    currentChannel = null;
  }

  // ─── Track search ─────────────────────────────────────────────
  function trackSearch(query) {
    if (!query || query.length < 2) return;
    sessionData.searchQueries.push({ q: query, ts: Date.now() });
    if (!localData.searches) localData.searches = [];
    localData.searches.unshift(query);
    localData.searches = localData.searches.slice(0, 50);
    saveLocalData();
    FirebaseConfig.incrementCounter('searches/total');
  }

  // ─── Track category view ──────────────────────────────────────
  function trackCategoryView(category) {
    sessionData.categoriesViewed[category] = (sessionData.categoriesViewed[category] || 0) + 1;
    if (!localData.categoryViews) localData.categoryViews = {};
    localData.categoryViews[category] = (localData.categoryViews[category] || 0) + 1;
    saveLocalData();
    FirebaseConfig.incrementCounter(`categories/${category}`);
  }

  // ─── Track favorite ───────────────────────────────────────────
  function trackFavorite(channel, added) {
    FirebaseConfig.incrementCounter(added ? 'favorites/added' : 'favorites/removed');
  }

  // ─── Track error ──────────────────────────────────────────────
  function trackError(channel, errorMsg) {
    FirebaseConfig.incrementCounter('errors/total');
  }

  // ─── Get local data for AI ────────────────────────────────────
  function getLocalData() { return localData; }

  // ─── Get top categories ───────────────────────────────────────
  function getTopCategories(n = 3) {
    const prefs = localData.categoryPrefs || {};
    return Object.entries(prefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([cat]) => cat);
  }

  // ─── Get recent channels ──────────────────────────────────────
  function getRecentChannels(n = 10) {
    return (localData.watchHistory || []).slice(0, n);
  }

  // ─── Save session on unload ───────────────────────────────────
  window.addEventListener('beforeunload', () => {
    trackWatchEnd();
    sessionData.endTime = Date.now();
    sessionData.duration = sessionData.endTime - sessionData.startTime;
    FirebaseConfig.pushUserData('sessions', sessionData);
  });

  return { trackChannelPlay, trackWatchEnd, trackSearch, trackCategoryView, trackFavorite, trackError, getLocalData, getTopCategories, getRecentChannels };
})();

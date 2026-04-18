/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — Main Application v3
   Firebase Auth + AI + Tracking + Universal M3U + Xtream
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {
  const STORAGE_KEY = 'mitv_m3u_url_v3';
  const FAV_KEY = 'mitv_favorites_v3';
  const CACHE_KEY = 'mitv_cache_v3';
  const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

  let allChannels = [], groups = {}, byGroup = {};
  let favorites = [];
  let currentSection = 'home';
  let currentUser = null;
  let sidebarOpen = false;
  let aiChatHistory = [];

  const CAT_META = {
    live:    { label:'Live TV',     icon:'📺', color:'#ff0057' },
    news:    { label:'News',        icon:'🌍', color:'#00c3ff' },
    movies:  { label:'Movies',      icon:'🎬', color:'#7a00ff' },
    series:  { label:'Series',      icon:'📽️', color:'#ff6b35' },
    music:   { label:'Music',       icon:'🎵', color:'#00e676' },
    sports:  { label:'Sports',      icon:'⚽', color:'#ffb300' },
    islamic: { label:'Islamic',     icon:'🕌', color:'#00e676' },
    kids:    { label:'Kids',        icon:'🧸', color:'#ff9800' },
    documentary:{label:'Documentary',icon:'🎥',color:'#9c27b0'},
    favorites:{ label:'Favorites',  icon:'⭐', color:'#ffd700' },
    history: { label:'History',     icon:'🕐', color:'#607d8b' },
  };

  // ─── INIT ──────────────────────────────────────────────────────
  async function init() {
    // Init Firebase
    FirebaseConfig.init();

    Player.init();
    loadFavorites();
    setupAuthScreen();
    setupSetupScreen();
    setupNavbar();
    setupSidebar();
    setupSearch();
    setupBottomNav();
    setupAIModal();
    setupAboutModal();
  }

  // ─── AUTH SCREEN ───────────────────────────────────────────────
  function setupAuthScreen() {
    document.getElementById('google-login-btn').addEventListener('click', async () => {
      const btn = document.getElementById('google-login-btn');
      btn.textContent = 'Signing in...';
      btn.disabled = true;
      try {
        currentUser = await FirebaseConfig.loginWithGoogle();
        afterLogin();
      } catch(e) {
        btn.textContent = 'Sign in failed — try Guest';
        btn.disabled = false;
        showToast('❌ Google sign-in failed', 'error');
      }
    });

    document.getElementById('guest-btn').addEventListener('click', () => {
      currentUser = FirebaseConfig.loginAsGuest();
      afterLogin();
    });
  }

  function afterLogin() {
    // Update UI with user info
    const name = currentUser.displayName || 'User';
    const photo = currentUser.photoURL;
    const initials = name.charAt(0).toUpperCase();

    document.getElementById('nav-avatar').innerHTML = photo ? `<img src="${photo}" onerror="this.parentNode.textContent='${initials}'" />` : initials;
    document.getElementById('su-name').textContent = name;
    const suAvatar = document.getElementById('su-avatar');
    suAvatar.innerHTML = photo ? `<img src="${photo}" />` : initials;

    // Check saved playlist
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      showSavedUrl(savedUrl);
      const cached = loadCache();
      if (cached) {
        allChannels = cached.channels;
        groups = cached.groups;
        byGroup = cached.byGroup;
        AIEngine.setChannels(allChannels);
        hideAuth();
        showApp();
        renderHome();
        showToast('📦 Loaded from cache · Refreshing...', 'info');
        setTimeout(() => refreshPlaylist(savedUrl, true), 2000);
      } else {
        hideAuth();
        document.getElementById('setup-screen').classList.remove('hidden');
      }
    } else {
      hideAuth();
      document.getElementById('setup-screen').classList.remove('hidden');
    }
  }

  function hideAuth() {
    document.getElementById('auth-screen').style.display = 'none';
  }

  // ─── SETUP SCREEN ─────────────────────────────────────────────
  function setupSetupScreen() {
    // Tabs
    document.querySelectorAll('.stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Load button
    document.getElementById('load-m3u-btn').addEventListener('click', async () => {
      const activeTab = document.querySelector('.stab.active')?.dataset.tab;

      if (activeTab === 'xtream') {
        const host = document.getElementById('xt-host').value.trim();
        const user = document.getElementById('xt-user').value.trim();
        const pass = document.getElementById('xt-pass').value.trim();
        if (!host || !user || !pass) { showToast('Please fill all Xtream fields', 'error'); return; }
        const url = `${host}/get.php?username=${user}&password=${pass}&type=m3u_plus&output=ts`;
        localStorage.setItem(STORAGE_KEY, url);
        loadM3U(url);
      } else {
        const url = document.getElementById('m3u-input').value.trim();
        if (!url) { showToast('Please enter a playlist URL', 'error'); return; }
        if (!url.startsWith('http')) { showToast('URL must start with http(s)://', 'error'); return; }
        localStorage.setItem(STORAGE_KEY, url);
        loadM3U(url);
      }
    });

    ['m3u-input', 'xt-host', 'xt-user', 'xt-pass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('load-m3u-btn').click(); });
    });

    document.getElementById('change-url-btn')?.addEventListener('click', () => {
      document.getElementById('setup-saved').classList.add('hidden');
    });
  }

  function showSavedUrl(url) {
    const saved = document.getElementById('setup-saved');
    const preview = document.getElementById('saved-url-preview');
    if (saved && preview) {
      saved.classList.remove('hidden');
      preview.textContent = url.length > 40 ? url.slice(0, 40) + '...' : url;
      document.getElementById('m3u-input').value = url;
    }
  }

  // ─── LOAD M3U ─────────────────────────────────────────────────
  async function loadM3U(url) {
    document.getElementById('setup-screen').classList.add('hidden');
    showLoading(true, 5, 'Connecting...');

    try {
      const result = await M3UParser.fetchAndParse(url, (pct, msg) => {
        updateLoading(pct, msg, result?.total);
      });

      allChannels = result.channels;
      groups = result.groups;
      byGroup = result.byGroup;

      saveCache({ channels: allChannels, groups, byGroup });
      AIEngine.setChannels(allChannels);

      updateLoading(100, `✓ ${result.total} channels loaded!`);
      await sleep(400);
      showLoading(false);
      showApp();
      renderHome();
      showToast(`✅ ${result.total} channels loaded!`, 'success');

    } catch(e) {
      showLoading(false);
      document.getElementById('setup-screen').classList.remove('hidden');
      showToast('❌ ' + e.message, 'error');
    }
  }

  async function refreshPlaylist(url, silent = false) {
    try {
      const result = await M3UParser.fetchAndParse(url, null);
      allChannels = result.channels;
      groups = result.groups;
      byGroup = result.byGroup;
      saveCache({ channels: allChannels, groups, byGroup });
      AIEngine.setChannels(allChannels);
      if (currentSection === 'home') renderHome();
      if (!silent) showToast(`✅ Refreshed! ${result.total} channels`, 'success');
    } catch(e) {
      if (!silent) showToast('❌ Refresh: ' + e.message, 'error');
    }
  }

  // ─── CACHE ────────────────────────────────────────────────────
  function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), ...data })); } catch(e) {}
  }
  function loadCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!raw || Date.now() - raw.ts > CACHE_TTL) return null;
      return raw;
    } catch(e) { return null; }
  }

  // ─── SHOW APP ─────────────────────────────────────────────────
  function showApp() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  // ─── RENDER HOME ──────────────────────────────────────────────
  function renderHome() {
    updateHero();
    renderAIBanner();
    renderRows();
  }

  // ─── HERO ─────────────────────────────────────────────────────
  function updateHero() {
    const featured = pickFeatured();
    if (!featured) return;

    document.getElementById('hero-title').textContent = featured.name;
    document.getElementById('hero-meta').textContent = `${featured.group || 'Live TV'} · ${CAT_META[featured.category]?.label || 'Live'}`;

    if (featured.logo) {
      const existing = document.querySelector('.hero-bg-img');
      if (existing) existing.remove();
      const img = document.createElement('img');
      img.className = 'hero-bg-img';
      img.src = featured.logo;
      img.onerror = () => img.remove();
      document.getElementById('hero-bg').prepend(img);
    }

    document.getElementById('hero-watch-btn').onclick = () => playChannel(featured, allChannels, allChannels.indexOf(featured));
    document.getElementById('hero-fav-btn').onclick = () => {
      toggleFavorite(featured);
      showToast(isFavorite(featured) ? '⭐ Added' : '✓ Removed', 'success');
    };
  }

  function pickFeatured() {
    const pool = groups.islamic?.length ? groups.islamic :
                 groups.live?.length ? groups.live :
                 allChannels;
    if (!pool?.length) return null;
    return pool[Math.floor(Math.random() * Math.min(15, pool.length))];
  }

  // ─── AI BANNER ────────────────────────────────────────────────
  async function renderAIBanner() {
    const banner = document.getElementById('ai-banner');
    const chipsEl = document.getElementById('ai-chips');
    const chips = AIEngine.getAIChips();
    if (!chips.length) return;

    chipsEl.innerHTML = chips.map(chip => `<div class="ai-chip">${chip}</div>`).join('');
    banner.classList.add('show');

    chipsEl.querySelectorAll('.ai-chip').forEach((chip, i) => {
      chip.addEventListener('click', () => {
        const chipText = chips[i].replace(/^[^\w]+\s/, '');
        openAIModal(chipText);
      });
    });

    // Async AI recs in background
    AIEngine.getPersonalizedRecommendations().then(recs => {
      if (recs.length) {
        chipsEl.innerHTML = recs.map(ch => `
          <div class="ai-chip" title="${esc(ch.name)}">${ch.name.slice(0, 18)}</div>
        `).join('');
        chipsEl.querySelectorAll('.ai-chip').forEach((chip, i) => {
          chip.addEventListener('click', () => playChannel(recs[i], recs, i));
        });
      }
    }).catch(() => {});
  }

  // ─── ROWS ─────────────────────────────────────────────────────
  function renderRows() {
    const container = document.getElementById('rows-container');
    container.innerHTML = '';

    const rowOrder = [
      { key:'islamic', min:1 },
      { key:'live',    min:1 },
      { key:'news',    min:1 },
      { key:'movies',  min:1 },
      { key:'series',  min:1 },
      { key:'sports',  min:1 },
      { key:'music',   min:1 },
      { key:'kids',    min:1 },
      { key:'documentary', min:1 },
    ];

    // Favorites row (top)
    if (favorites.length) container.appendChild(buildRow('favorites', favorites));

    // History row
    const recentLocal = Tracker.getRecentChannels(20);
    const recentChannels = recentLocal
      .map(r => allChannels.find(ch => ch.url === r.url || ch.name === r.name))
      .filter(Boolean);
    if (recentChannels.length >= 2) {
      container.appendChild(buildRow('history', recentChannels));
    }

    // Category rows
    for (const { key, min } of rowOrder) {
      const chs = groups[key] || [];
      if (chs.length < min) continue;
      const skeleton = buildSkeleton(key);
      container.appendChild(skeleton);
      setTimeout(() => {
        const real = buildRow(key, chs);
        if (skeleton.parentNode) container.replaceChild(real, skeleton);
      }, 100 + Math.random() * 400);
    }

    // Extra group rows
    let extra = 0;
    const usedCats = new Set(rowOrder.map(r => r.key));
    for (const [grpName, chs] of Object.entries(byGroup)) {
      if (extra >= 6 || chs.length < 3) continue;
      const lcat = (chs[0]?.category || '');
      if (usedCats.has(lcat)) continue;
      const row = buildRow(grpName, chs, true);
      const delay = 600 + extra * 200;
      setTimeout(() => container.appendChild(row), delay);
      extra++;
    }
  }

  function buildSkeleton(key) {
    const meta = CAT_META[key] || { label: key, icon: '📺' };
    const div = document.createElement('div');
    div.className = 'channel-row';
    div.innerHTML = `
      <div class="row-header">
        <div class="row-title"><span class="row-icon">${meta.icon}</span>${meta.label}</div>
      </div>
      <div class="row-scroll">
        ${Array(8).fill(`<div class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('')}
      </div>`;
    return div;
  }

  function buildRow(key, channels, isCustom = false) {
    const meta = CAT_META[key] || { label: key, icon: '📡' };
    const label = isCustom ? key : meta.label;
    const icon = isCustom ? '📡' : meta.icon;
    const shown = channels.slice(0, 60);

    const div = document.createElement('div');
    div.className = 'channel-row';
    div.dataset.section = key;
    div.innerHTML = `
      <div class="row-header">
        <div class="row-title">
          <span class="row-icon">${icon}</span>${label}
          <span class="row-count">${channels.length}</span>
        </div>
        ${channels.length > 8 ? `<button class="row-see-all" data-key="${key}" data-custom="${isCustom}">See All →</button>` : ''}
      </div>
      <div class="row-scroll">
        ${shown.map(ch => buildCardHTML(ch)).join('')}
      </div>`;

    div.querySelectorAll('.channel-card').forEach((card, i) => {
      card.addEventListener('click', e => {
        addRipple(card, e);
        playChannel(shown[i], shown, i);
      });
    });

    div.querySelector('.row-see-all')?.addEventListener('click', e => {
      const k = e.target.dataset.key;
      const custom = e.target.dataset.custom === 'true';
      const chs = custom ? (byGroup[k] || []) : (groups[k] || []);
      renderSection(k, chs, custom ? k : undefined);
      Tracker.trackCategoryView(k);
    });

    return div;
  }

  function buildCardHTML(ch) {
    const fav = isFavorite(ch);
    const thumbFallback = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'><rect width='80' height='60' fill='%23161616'/><text x='40' y='36' font-size='20' text-anchor='middle' fill='%23333'>📺</text></svg>`;
    return `
      <div class="channel-card${fav ? ' is-fav' : ''}" data-id="${ch.id}">
        <div class="channel-card-thumb">
          ${ch.logo
            ? `<img src="${esc(ch.logo)}" alt="${esc(ch.name)}" loading="lazy" onerror="this.src='${thumbFallback}'" />`
            : `<img src="${thumbFallback}" alt="${esc(ch.name)}" />`}
          <div class="card-play-icon"><div class="card-play-btn">▶</div></div>
        </div>
        <div class="card-fav-star">⭐</div>
        <div class="channel-card-info">
          <div class="card-channel-name">${esc(ch.name)}</div>
          <div class="card-channel-group">${esc(ch.group || 'Live TV')}</div>
        </div>
      </div>`;
  }

  // ─── PLAY CHANNEL ─────────────────────────────────────────────
  function playChannel(channel, list, index) {
    Player.play(channel, list || [channel], index || 0);
  }

  // ─── SECTION VIEW ─────────────────────────────────────────────
  function renderSection(key, channels, title) {
    const meta = CAT_META[key] || { label: title || key, icon: '📡' };
    const label = title || meta.label;
    const icon = meta.icon || '📡';
    currentSection = key;
    setActiveNav(key);
    Tracker.trackCategoryView(key);

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="section-view">
        <div class="section-title"><span>${icon}</span>${label}</div>
        <div class="section-subtitle">${channels.length} channels available</div>
        <div class="grid-view" id="section-grid">
          ${channels.map(ch => buildCardHTML(ch)).join('')}
        </div>
      </div>`;

    main.querySelectorAll('.channel-card').forEach((card, i) => {
      card.addEventListener('click', e => {
        addRipple(card, e);
        playChannel(channels[i], channels, i);
      });
    });
  }

  // ─── RESTORE HOME ─────────────────────────────────────────────
  function restoreHome() {
    currentSection = 'home';
    setActiveNav('home');
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <section class="hero-section" id="hero-section">
        <div class="hero-bg" id="hero-bg"><div class="hero-overlay"></div></div>
        <div class="hero-content" id="hero-content">
          <div class="hero-badge" id="hero-badge">🔴 LIVE NOW</div>
          <h2 class="hero-title" id="hero-title">Loading...</h2>
          <p class="hero-meta" id="hero-meta">Live Streaming</p>
          <div class="hero-actions">
            <button class="hero-btn primary" id="hero-watch-btn">▶ Watch Now</button>
            <button class="hero-btn secondary" id="hero-fav-btn">⭐ Favorites</button>
          </div>
        </div>
      </section>
      <div class="ai-banner" id="ai-banner">
        <div class="ai-banner-inner">
          <span class="ai-icon">🤖</span>
          <div><div class="ai-banner-title">AI Picks For You</div><div class="ai-banner-sub">Based on your watch history</div></div>
          <div class="ai-chips" id="ai-chips"></div>
        </div>
      </div>
      <div class="rows-container" id="rows-container"></div>`;
    renderHome();
  }

  // ─── SEARCH ───────────────────────────────────────────────────
  function setupSearch() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');
    let timer;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { resultsEl.classList.add('hidden'); return; }
      timer = setTimeout(() => doSearch(q), 220);
      Tracker.trackSearch(q);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) resultsEl.classList.remove('hidden');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) {
        resultsEl.classList.add('hidden');
        input.value = '';
      }
    });

    // AI search on Enter
    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter' && input.value.trim().length >= 2) {
        const q = input.value.trim();
        resultsEl.innerHTML = `<div class="search-empty">🤖 AI searching for "${q}"...</div>`;
        resultsEl.classList.remove('hidden');
        try {
          const found = await AIEngine.findChannels(q);
          if (!found.length) { resultsEl.innerHTML = `<div class="search-empty">No channels found</div>`; return; }
          renderSearchResults(found, resultsEl, input);
        } catch(e2) {
          doSearch(q);
        }
      }
    });
  }

  function doSearch(q) {
    const resultsEl = document.getElementById('search-results');
    const ql = q.toLowerCase();
    const matches = allChannels
      .filter(ch => ch.name.toLowerCase().includes(ql) || (ch.group||'').toLowerCase().includes(ql))
      .slice(0, 25);

    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-empty">No results for "${q}"<br><small>Press Enter for AI search</small></div>`;
    } else {
      renderSearchResults(matches, resultsEl, document.getElementById('search-input'));
    }
    resultsEl.classList.remove('hidden');
  }

  function renderSearchResults(channels, el, inputEl) {
    el.innerHTML = channels.map(ch => `
      <div class="search-item" data-id="${ch.id}">
        <img class="search-item-logo" src="${ch.logo||''}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect width=%2240%22 height=%2240%22 fill=%22%23161616%22/><text x=%2220%22 y=%2226%22 font-size=%2214%22 text-anchor=%22middle%22 fill=%22%23333%22>📺</text></svg>'" />
        <div class="search-item-info">
          <div class="search-item-name">${esc(ch.name)}</div>
          <div class="search-item-group">${esc(ch.group||'Live TV')}</div>
        </div>
      </div>`).join('');
    el.querySelectorAll('.search-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        playChannel(channels[i], channels, i);
        el.classList.add('hidden');
        if (inputEl) inputEl.value = '';
      });
    });
  }

  // ─── NAVBAR ───────────────────────────────────────────────────
  function setupNavbar() {
    const main = document.getElementById('main-content');
    main?.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', main.scrollTop > 40);
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      const url = localStorage.getItem(STORAGE_KEY);
      if (url) { showToast('🔄 Refreshing...', 'info'); refreshPlaylist(url); }
    });

    document.getElementById('change-playlist-btn').addEventListener('click', () => {
      document.getElementById('app').classList.add('hidden');
      document.getElementById('setup-screen').classList.remove('hidden');
    });

    document.getElementById('go-home')?.addEventListener('click', e => {
      e.preventDefault();
      if (currentSection !== 'home') restoreHome();
    });

    document.getElementById('ai-btn').addEventListener('click', () => openAIModal());
  }

  // ─── SIDEBAR ──────────────────────────────────────────────────
  function setupSidebar() {
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
    });

    document.getElementById('main-content').addEventListener('click', () => {
      if (sidebarOpen && window.innerWidth < 768) {
        sidebarOpen = false;
        document.getElementById('sidebar').classList.remove('open');
      }
    });

    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.section);
        if (window.innerWidth < 768) {
          sidebarOpen = false;
          document.getElementById('sidebar').classList.remove('open');
        }
      });
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await FirebaseConfig.logout();
      document.getElementById('app').classList.add('hidden');
      document.getElementById('auth-screen').style.display = '';
      showToast('👋 Logged out', 'info');
    });
  }

  function setupBottomNav() {
    document.querySelectorAll('.bn-item[data-section]').forEach(item => {
      item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.section); });
    });
  }

  function navigateTo(section) {
    currentSection = section;
    setActiveNav(section);
    Tracker.trackCategoryView(section);

    if (section === 'home') { restoreHome(); return; }
    if (section === 'about') { openAbout(); return; }
    if (section === 'favorites') { renderSection('favorites', favorites); return; }
    if (section === 'history') {
      const rec = Tracker.getRecentChannels(100).map(r => allChannels.find(ch => ch.url === r.url)).filter(Boolean);
      renderSection('history', rec.length ? rec : []);
      return;
    }
    const chs = groups[section] || [];
    if (chs.length) renderSection(section, chs);
    else { showToast(`No channels in ${section} yet`, 'info'); restoreHome(); }
  }

  function setActiveNav(section) {
    document.querySelectorAll('.sidebar-item[data-section]').forEach(i => i.classList.toggle('active', i.dataset.section === section));
    document.querySelectorAll('.bn-item[data-section]').forEach(i => i.classList.toggle('active', i.dataset.section === section));
  }

  // ─── AI MODAL ─────────────────────────────────────────────────
  function setupAIModal() {
    document.getElementById('ai-modal-close').addEventListener('click', closeAIModal);
    document.getElementById('ai-modal-backdrop').addEventListener('click', closeAIModal);
    document.getElementById('ai-send').addEventListener('click', sendAIMessage);
    document.getElementById('ai-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendAIMessage();
    });
  }

  function openAIModal(prefill = '') {
    document.getElementById('ai-modal').classList.remove('hidden');
    const input = document.getElementById('ai-input');
    if (prefill) input.value = prefill;
    input.focus();
    if (!document.getElementById('ai-chat').children.length) {
      addAIMessage('ai', `👋 Salam! I'm your MITV AI Assistant. Ask me to find channels, like:\n• "Show me cricket channels"\n• "Islamic content for kids"\n• "News in Urdu"`);
    }
  }

  function closeAIModal() {
    document.getElementById('ai-modal').classList.add('hidden');
  }

  async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';

    addAIMessage('user', q);
    addAIMessage('ai', '🤖 Thinking...', 'typing-msg');

    try {
      const { text, channels } = await AIEngine.assistantChat(q, aiChatHistory);
      aiChatHistory.push({ role: 'user', content: q });
      aiChatHistory.push({ role: 'assistant', content: text });
      aiChatHistory = aiChatHistory.slice(-10);

      // Replace typing
      const typing = document.querySelector('.typing-msg');
      if (typing) typing.remove();

      addAIMessage('ai', text, '', channels.length ? channels : null);
    } catch(e) {
      const typing = document.querySelector('.typing-msg');
      if (typing) typing.textContent = '⚠️ AI unavailable. Using local search...';

      const results = allChannels.filter(ch => {
        const ql = q.toLowerCase();
        return ch.name.toLowerCase().includes(ql) || (ch.group||'').toLowerCase().includes(ql);
      }).slice(0, 6);
      if (typing) typing.remove();
      addAIMessage('ai', results.length ? `Found ${results.length} channels:` : 'No channels found for that.', '', results.length ? results : null);
    }
  }

  function addAIMessage(role, text, extraClass = '', channels = null) {
    const chat = document.getElementById('ai-chat');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role} ${extraClass}`;
    msg.textContent = text;
    chat.appendChild(msg);

    if (channels && channels.length) {
      const resultsEl = document.createElement('div');
      resultsEl.className = 'chat-channel-results';
      resultsEl.innerHTML = channels.map(ch => `
        <div class="chat-channel-item">
          <img class="chat-ch-logo" src="${ch.logo||''}" onerror="this.style.display='none'" />
          <span class="chat-ch-name">${esc(ch.name)}</span>
          <span class="chat-ch-play">▶</span>
        </div>`).join('');

      resultsEl.querySelectorAll('.chat-channel-item').forEach((item, i) => {
        item.addEventListener('click', () => {
          playChannel(channels[i], channels, i);
          closeAIModal();
        });
      });
      chat.appendChild(resultsEl);
    }

    chat.scrollTop = chat.scrollHeight;
  }

  // ─── ABOUT MODAL ──────────────────────────────────────────────
  function setupAboutModal() {
    document.getElementById('about-close').addEventListener('click', () => document.getElementById('about-modal').classList.add('hidden'));
    document.getElementById('about-backdrop').addEventListener('click', () => document.getElementById('about-modal').classList.add('hidden'));
  }

  function openAbout() { document.getElementById('about-modal').classList.remove('hidden'); }

  // ─── FAVORITES ────────────────────────────────────────────────
  function loadFavorites() {
    try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { favorites = []; }
  }

  function saveFavorites() { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }

  function isFavorite(ch) { return favorites.some(f => f.url === ch.url); }

  function toggleFavorite(ch) {
    const idx = favorites.findIndex(f => f.url === ch.url);
    if (idx === -1) { favorites.unshift(ch); saveFavorites(); return true; }
    else { favorites.splice(idx, 1); saveFavorites(); return false; }
  }

  // ─── UTILS ────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function showLoading(show, pct, msg) {
    const el = document.getElementById('loading-overlay');
    el.classList.toggle('hidden', !show);
    if (show) { updateLoading(pct || 0, msg || ''); }
  }

  function updateLoading(pct, msg, count) {
    document.getElementById('loading-bar').style.width = pct + '%';
    if (msg) document.getElementById('loading-text').textContent = msg;
    if (count) document.getElementById('loading-count').textContent = `${count.toLocaleString()} channels`;
  }

  function addRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.cssText = `left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  // ─── TOAST ────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toastOut .3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, 3200);
  }

  // ─── PUBLIC ───────────────────────────────────────────────────
  return { init, isFavorite, toggleFavorite, showToast };
})();

function showToast(msg, type) { App.showToast(msg, type); }

document.addEventListener('DOMContentLoaded', () => { App.init(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

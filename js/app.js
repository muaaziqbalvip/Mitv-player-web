/* ═══════════════════════════════════════════════════════════════
   MITV Player — Main Application
   By: Muaaz Iqbal · Muslim Islam
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {

  // State
  let allChannels = [];
  let groups = {};
  let byGroup = {};
  let favorites = [];
  let currentSection = 'home';
  let sidebarOpen = false;

  const STORAGE_KEY = 'mitv_m3u_url';
  const FAV_KEY = 'mitv_favorites';
  const CHANNEL_KEY = 'mitv_channels';

  const CATEGORY_META = {
    live:    { label: 'Live TV',     icon: '📺', color: '#ff0057' },
    news:    { label: 'News',        icon: '🌍', color: '#00c3ff' },
    movies:  { label: 'Movies',      icon: '🎬', color: '#7a00ff' },
    music:   { label: 'Music',       icon: '🎵', color: '#ff6b35' },
    islamic: { label: 'Islamic',     icon: '🕌', color: '#00e676' },
    sports:  { label: 'Sports',      icon: '⚽', color: '#ffb300' },
    favorites: { label: 'Favorites', icon: '⭐', color: '#ffd700' },
  };

  // ─── INIT ───────────────────────────────────────────────────────
  function init() {
    Player.init();
    loadFavorites();
    setupSetupScreen();
    setupNavbar();
    setupSidebar();
    setupSearch();
    setupBottomNav();

    // Check saved URL
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      showSavedUrl(savedUrl);

      // Try cached channels
      const cached = loadCachedChannels();
      if (cached) {
        allChannels = cached.channels;
        groups = cached.groups;
        byGroup = cached.byGroup;
        showApp();
        renderHome();
        showToast('📡 Loaded from cache. Refreshing...', 'info');
        // Refresh in background
        setTimeout(() => refreshPlaylist(savedUrl, true), 1500);
      } else {
        // Auto-load
        loadM3U(savedUrl);
      }
    }
  }

  // ─── SETUP SCREEN ───────────────────────────────────────────────
  function setupSetupScreen() {
    const loadBtn = document.getElementById('load-m3u-btn');
    const input = document.getElementById('m3u-input');
    const changeBtn = document.getElementById('change-url-btn');

    loadBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (!url) { showToast('Please enter a valid M3U URL', 'error'); return; }
      if (!url.startsWith('http')) { showToast('URL must start with http:// or https://', 'error'); return; }
      localStorage.setItem(STORAGE_KEY, url);
      loadM3U(url);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') loadBtn.click();
    });

    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        document.getElementById('setup-saved').style.display = 'none';
        document.getElementById('m3u-input').style.display = '';
        document.getElementById('load-m3u-btn').style.display = '';
      });
    }
  }

  function showSavedUrl(url) {
    const savedEl = document.getElementById('setup-saved');
    const preview = document.getElementById('saved-url-preview');
    const input = document.getElementById('m3u-input');
    if (savedEl && preview) {
      savedEl.style.display = 'flex';
      preview.textContent = url.length > 40 ? url.slice(0, 40) + '...' : url;
      input.value = url;
    }
  }

  // ─── LOAD M3U ───────────────────────────────────────────────────
  async function loadM3U(url) {
    showLoadingOverlay(true);
    updateLoadingProgress(5, 'Connecting...');

    try {
      const result = await M3UParser.fetchAndParse(url, (pct, msg) => {
        updateLoadingProgress(pct, msg);
      });

      allChannels = result.channels;
      groups = result.groups;
      byGroup = result.byGroup;

      // Cache
      cacheChannels({ channels: allChannels, groups, byGroup });

      updateLoadingProgress(100, `✓ ${result.total} channels loaded!`);

      await sleep(500);
      showLoadingOverlay(false);
      showApp();
      renderHome();
      showToast(`✅ ${result.total} channels loaded!`, 'success');

    } catch (err) {
      showLoadingOverlay(false);
      showToast('❌ ' + err.message, 'error');
      console.error('M3U load error:', err);
    }
  }

  async function refreshPlaylist(url, silent = false) {
    try {
      const result = await M3UParser.fetchAndParse(url, null);
      allChannels = result.channels;
      groups = result.groups;
      byGroup = result.byGroup;
      cacheChannels({ channels: allChannels, groups, byGroup });
      if (!silent) {
        renderHome();
        showToast(`✅ Refreshed! ${result.total} channels`, 'success');
      } else {
        renderHome();
      }
    } catch (err) {
      if (!silent) showToast('❌ Refresh failed: ' + err.message, 'error');
    }
  }

  // ─── CACHE ──────────────────────────────────────────────────────
  function cacheChannels(data) {
    try {
      localStorage.setItem(CHANNEL_KEY, JSON.stringify({
        ts: Date.now(),
        ...data
      }));
    } catch(e) {}
  }

  function loadCachedChannels() {
    try {
      const raw = localStorage.getItem(CHANNEL_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const age = Date.now() - (data.ts || 0);
      if (age > 3 * 60 * 60 * 1000) return null; // 3h expiry
      return data;
    } catch(e) { return null; }
  }

  // ─── SHOW APP ───────────────────────────────────────────────────
  function showApp() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
  }

  // ─── RENDER HOME ────────────────────────────────────────────────
  function renderHome() {
    updateHero();
    renderRows();
  }

  // ─── HERO ───────────────────────────────────────────────────────
  function updateHero() {
    const featured = pickFeaturedChannel();
    if (!featured) return;

    const titleEl = document.getElementById('hero-title');
    const metaEl = document.getElementById('hero-meta');

    titleEl.textContent = featured.name;
    metaEl.textContent = featured.group || 'Live Streaming';

    if (featured.logo) {
      const heroSection = document.getElementById('hero-section');
      const existing = heroSection.querySelector('.hero-bg-img');
      if (existing) existing.remove();
      const img = document.createElement('img');
      img.className = 'hero-bg-img';
      img.src = featured.logo;
      img.onerror = () => img.remove();
      document.getElementById('hero-bg').prepend(img);
    }

    document.getElementById('hero-watch-btn').onclick = () => Player.play(featured);
    document.getElementById('hero-fav-btn').onclick = () => {
      toggleFavorite(featured);
      showToast(isFavorite(featured) ? '⭐ Added to Favorites' : '✓ Removed', 'success');
    };
  }

  function pickFeaturedChannel() {
    const pool = groups.islamic?.length ? groups.islamic :
                 groups.live?.length ? groups.live :
                 allChannels;
    if (!pool?.length) return null;
    return pool[Math.floor(Math.random() * Math.min(10, pool.length))];
  }

  // ─── ROWS ───────────────────────────────────────────────────────
  function renderRows() {
    const container = document.getElementById('rows-container');
    container.innerHTML = '';

    const rowDefs = [
      { key: 'islamic', min: 1 },
      { key: 'live',    min: 1 },
      { key: 'news',    min: 1 },
      { key: 'movies',  min: 1 },
      { key: 'music',   min: 1 },
      { key: 'sports',  min: 1 },
    ];

    // Favorites row
    if (favorites.length > 0) {
      container.appendChild(buildRow('favorites', favorites));
    }

    // Show skeletons first then replace
    for (const { key, min } of rowDefs) {
      const channels = groups[key] || [];
      if (channels.length < min) continue;
      const skeletonRow = buildSkeletonRow(key);
      container.appendChild(skeletonRow);
      setTimeout(() => {
        const realRow = buildRow(key, channels);
        container.replaceChild(realRow, skeletonRow);
      }, 200 + Math.random() * 300);
    }

    // Custom group rows (top 5 groups not already covered)
    const coveredCats = new Set(rowDefs.map(r => r.key));
    let extraCount = 0;
    for (const [grpName, chs] of Object.entries(byGroup)) {
      if (extraCount >= 4) break;
      if (chs.length < 2) continue;
      const lower = grpName.toLowerCase();
      const alreadyCovered = [...coveredCats].some(c =>
        lower.includes(c) || chs[0]?.category === c
      );
      if (alreadyCovered) continue;
      const row = buildRow(grpName, chs, true);
      setTimeout(() => container.appendChild(row), 800 + extraCount * 150);
      extraCount++;
    }
  }

  function buildSkeletonRow(key) {
    const meta = CATEGORY_META[key] || { label: key, icon: '📺' };
    const div = document.createElement('div');
    div.className = 'channel-row';
    div.innerHTML = `
      <div class="row-header">
        <div class="row-title">
          <span class="row-icon">${meta.icon}</span>
          ${meta.label}
        </div>
      </div>
      <div class="row-scroll">
        ${Array(8).fill(0).map(() => `
          <div class="skeleton-card">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-info">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return div;
  }

  function buildRow(key, channels, isCustom = false) {
    const meta = CATEGORY_META[key] || { label: key, icon: '📺', color: '#ff0057' };
    const label = isCustom ? key : meta.label;
    const icon = isCustom ? '📡' : meta.icon;
    const shown = channels.slice(0, 40);

    const div = document.createElement('div');
    div.className = 'channel-row';
    div.dataset.section = key;

    div.innerHTML = `
      <div class="row-header">
        <div class="row-title">
          <span class="row-icon">${icon}</span>
          ${label}
          <span class="row-count">${channels.length}</span>
        </div>
        ${channels.length > 10 ? `<button class="row-see-all" data-key="${key}" data-custom="${isCustom}">See All</button>` : ''}
      </div>
      <div class="row-scroll" id="row-scroll-${key.replace(/\s+/g,'-')}">
        ${shown.map(ch => buildCardHTML(ch)).join('')}
      </div>
    `;

    // Bind card clicks
    div.querySelectorAll('.channel-card').forEach((card, idx) => {
      card.addEventListener('click', (e) => {
        addRipple(card, e);
        Player.play(shown[idx]);
      });
    });

    // See All
    const seeAllBtn = div.querySelector('.row-see-all');
    if (seeAllBtn) {
      seeAllBtn.addEventListener('click', () => {
        const k = seeAllBtn.dataset.key;
        const isC = seeAllBtn.dataset.custom === 'true';
        renderSectionView(k, channels, isC ? k : undefined);
      });
    }

    return div;
  }

  function buildCardHTML(ch) {
    const isFav = isFavorite(ch);
    const logo = ch.logo
      ? `<img src="${ch.logo}" alt="${esc(ch.name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 60%22><rect width=%2280%22 height=%2260%22 fill=%22%23161616%22/><text x=%2240%22 y=%2235%22 font-size=%2218%22 text-anchor=%22middle%22 fill=%22%23444%22>📺</text></svg>'" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#333">📺</div>`;

    return `
      <div class="channel-card${isFav ? ' is-fav' : ''}" data-id="${ch.id}" data-url="${esc(ch.url)}">
        <div class="channel-card-thumb">
          ${logo}
          <div class="card-play-icon">
            <div class="card-play-btn">▶</div>
          </div>
        </div>
        <div class="card-fav-star">⭐</div>
        <div class="channel-card-info">
          <div class="card-channel-name">${esc(ch.name)}</div>
          <div class="card-channel-group">${esc(ch.group || 'Live TV')}</div>
        </div>
      </div>
    `;
  }

  // ─── SECTION VIEW (See All) ──────────────────────────────────────
  function renderSectionView(key, channels, title) {
    const meta = CATEGORY_META[key] || { label: title || key, icon: '📡' };
    const label = title || meta.label;
    const icon = meta.icon || '📡';

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="section-view">
        <div class="section-title">
          <span>${icon}</span> ${label}
        </div>
        <div class="section-subtitle">${channels.length} channels available</div>
        <div class="grid-view" id="section-grid">
          ${channels.map(ch => buildCardHTML(ch)).join('')}
        </div>
      </div>
    `;

    main.querySelectorAll('.channel-card').forEach((card, idx) => {
      card.addEventListener('click', (e) => {
        addRipple(card, e);
        Player.play(channels[idx]);
      });
    });

    // Back nav item
    setActiveSidebarItem(key);
  }

  function restoreHome() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <section class="hero-section" id="hero-section">
        <div class="hero-bg" id="hero-bg"><div class="hero-overlay"></div></div>
        <div class="hero-content" id="hero-content">
          <div class="hero-badge">🔴 LIVE NOW</div>
          <h2 class="hero-title" id="hero-title">Loading...</h2>
          <p class="hero-meta" id="hero-meta">Live Streaming</p>
          <div class="hero-actions">
            <button class="hero-btn primary" id="hero-watch-btn"><span>▶</span> Watch Now</button>
            <button class="hero-btn secondary" id="hero-fav-btn"><span>⭐</span> Favorites</button>
          </div>
        </div>
      </section>
      <div class="rows-container" id="rows-container"></div>
    `;
    renderHome();
  }

  // ─── SEARCH ─────────────────────────────────────────────────────
  function setupSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    let timer;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(input.value.trim()), 200);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        results.classList.remove('hidden');
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) {
        results.classList.add('hidden');
        input.value = '';
      }
    });
  }

  function doSearch(q) {
    const resultsEl = document.getElementById('search-results');
    if (!q || q.length < 2) {
      resultsEl.classList.add('hidden');
      return;
    }

    const ql = q.toLowerCase();
    const matches = allChannels
      .filter(ch =>
        ch.name.toLowerCase().includes(ql) ||
        (ch.group || '').toLowerCase().includes(ql) ||
        (ch.tvgName || '').toLowerCase().includes(ql)
      )
      .slice(0, 20);

    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-empty">No channels found for "${q}"</div>`;
    } else {
      resultsEl.innerHTML = matches.map(ch => `
        <div class="search-item" data-id="${ch.id}">
          <img class="search-item-logo" src="${ch.logo || ''}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect width=%2240%22 height=%2240%22 fill=%22%23161616%22/><text x=%2220%22 y=%2226%22 font-size=%2214%22 text-anchor=%22middle%22 fill=%22%23444%22>📺</text></svg>'" />
          <div class="search-item-info">
            <div class="search-item-name">${esc(ch.name)}</div>
            <div class="search-item-group">${esc(ch.group || 'Live TV')}</div>
          </div>
        </div>
      `).join('');

      resultsEl.querySelectorAll('.search-item').forEach((item, i) => {
        item.addEventListener('click', () => {
          Player.play(matches[i]);
          resultsEl.classList.add('hidden');
          document.getElementById('search-input').value = '';
        });
      });
    }

    resultsEl.classList.remove('hidden');
  }

  // ─── NAVBAR ─────────────────────────────────────────────────────
  function setupNavbar() {
    // Scroll effect
    const main = document.getElementById('main-content');
    if (main) {
      main.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        navbar.classList.toggle('scrolled', main.scrollTop > 40);
      });
    }

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
      const url = localStorage.getItem(STORAGE_KEY);
      if (url) {
        showToast('🔄 Refreshing playlist...', 'info');
        refreshPlaylist(url);
      }
    });

    // Change playlist
    document.getElementById('change-playlist-btn').addEventListener('click', () => {
      document.getElementById('app').classList.add('hidden');
      document.getElementById('setup-screen').style.display = 'flex';
    });
  }

  // ─── SIDEBAR ────────────────────────────────────────────────────
  function setupSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    toggle.addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      sidebar.classList.toggle('open', sidebarOpen);
    });

    // Close on outside click (mobile)
    document.getElementById('main-content').addEventListener('click', () => {
      if (sidebarOpen && window.innerWidth < 768) {
        sidebarOpen = false;
        sidebar.classList.remove('open');
      }
    });

    // Nav items
    sidebar.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const section = item.dataset.section;
        navigateTo(section);
        if (window.innerWidth < 768) {
          sidebarOpen = false;
          sidebar.classList.remove('open');
        }
      });
    });
  }

  // ─── BOTTOM NAV ─────────────────────────────────────────────────
  function setupBottomNav() {
    document.querySelectorAll('.bn-item[data-section]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(item.dataset.section);
      });
    });
  }

  function navigateTo(section) {
    currentSection = section;
    setActiveSidebarItem(section);

    if (section === 'home') {
      restoreHome();
    } else if (section === 'favorites') {
      renderSectionView('favorites', favorites);
    } else {
      const channels = groups[section] || [];
      if (channels.length) {
        renderSectionView(section, channels);
      } else {
        showToast(`No channels in ${section} yet`, 'info');
        restoreHome();
      }
    }
  }

  function setActiveSidebarItem(section) {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.bn-item').forEach(i => i.classList.remove('active'));
    const sidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
    const bnItem = document.querySelector(`.bn-item[data-section="${section}"]`);
    if (sidebarItem) sidebarItem.classList.add('active');
    if (bnItem) bnItem.classList.add('active');
  }

  // ─── FAVORITES ──────────────────────────────────────────────────
  function loadFavorites() {
    try {
      favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch(e) { favorites = []; }
  }

  function saveFavorites() {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }

  function isFavorite(ch) {
    return favorites.some(f => f.url === ch.url);
  }

  function toggleFavorite(ch) {
    const idx = favorites.findIndex(f => f.url === ch.url);
    if (idx === -1) {
      favorites.unshift(ch);
      saveFavorites();
      return true;
    } else {
      favorites.splice(idx, 1);
      saveFavorites();
      return false;
    }
  }

  // ─── UTILS ──────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.toggle('hidden', !show);
    if (show) updateLoadingProgress(0, 'Starting...');
  }

  function updateLoadingProgress(pct, text) {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = text || '';
  }

  function addRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  // ─── TOAST ──────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────
  return {
    init,
    isFavorite,
    toggleFavorite,
    showToast,
  };

})();

// Global showToast convenience
function showToast(msg, type) { App.showToast(msg, type); }

// ─── BOOTSTRAP ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

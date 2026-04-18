/* ═══════════════════════════════════════════════
   MITV PLAYER — MAIN APP
   By: Muaaz Iqbal | Muslim Islam Project
═══════════════════════════════════════════════ */

const MITVApp = (() => {

  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  let favourites = JSON.parse(localStorage.getItem('mitv_favs') || '[]');
  let cardSize   = localStorage.getItem('mitv_card_size') || 'normal';
  let heroIdx    = 0;
  let heroInterval;
  const heroChannelIds = MITV_DATA.heroChannels;

  /* ────────────────────────────────────────────
     DOM REFS
  ──────────────────────────────────────────── */
  const sidebar        = document.getElementById('sidebar');
  const hamburger      = document.getElementById('hamburger');
  const mainWrapper    = document.getElementById('mainWrapper');
  const navbar         = document.getElementById('navbar');
  const searchInput    = document.getElementById('searchInput');
  const searchResults  = document.getElementById('searchResults');
  const channelRows    = document.getElementById('channelRows');
  const skeletonSec    = document.getElementById('skeletonSection');
  const heroBg         = document.getElementById('heroBg');
  const heroTitle      = document.getElementById('heroTitle');
  const heroDesc       = document.getElementById('heroDesc');
  const heroWatchBtn   = document.getElementById('heroWatchBtn');
  const heroFavBtn     = document.getElementById('heroFavBtn');
  const settingsBtn    = document.getElementById('settingsBtn');
  const settingsPanel  = document.getElementById('settingsPanel');
  const settingsClose  = document.getElementById('settingsClose');
  const settingsOverlay= document.getElementById('settingsOverlay');
  const toastContainer = document.getElementById('toastContainer');

  /* ────────────────────────────────────────────
     INIT
  ──────────────────────────────────────────── */
  function init() {
    // Apply saved settings
    document.documentElement.dataset.cardSize = cardSize;

    // Sidebar mobile overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-mobile-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeSidebar);

    bindEvents();
    initHero();
    setTimeout(renderRows, 800); // Simulate loading
    initIntersectionObserver();
    initNavbarScroll();
  }

  /* ────────────────────────────────────────────
     HERO BANNER
  ──────────────────────────────────────────── */
  function initHero() {
    renderHeroSlide(heroIdx);
    heroInterval = setInterval(() => {
      heroIdx = (heroIdx + 1) % heroChannelIds.length;
      renderHeroSlide(heroIdx);
    }, 8000);
  }

  function renderHeroSlide(idx) {
    const ch = MITV_DATA.findChannel(heroChannelIds[idx]);
    if (!ch) return;

    heroBg.classList.remove('loaded');
    const img = new Image();
    img.src = ch.thumbnail;
    img.onload = () => {
      heroBg.style.backgroundImage = `url('${ch.thumbnail}')`;
      heroBg.classList.add('loaded');
    };

    heroTitle.textContent = ch.name;
    heroDesc.textContent  = `${ch.category} • ${ch.quality} • Now Streaming`;
    heroWatchBtn.onclick  = () => MITVPlayer.open(ch);
    heroFavBtn.innerHTML  = `<i class="fas fa-heart"></i> ${favourites.includes(ch.id) ? 'Saved' : 'Favourite'}`;
    heroFavBtn.onclick    = () => {
      toggleFavourite(ch.id);
      heroFavBtn.innerHTML = `<i class="fas fa-heart"></i> ${favourites.includes(ch.id) ? 'Saved' : 'Favourite'}`;
    };
  }

  /* ────────────────────────────────────────────
     RENDER ROWS
  ──────────────────────────────────────────── */
  function renderRows() {
    skeletonSec.style.display = 'none';
    channelRows.innerHTML = '';

    MITV_DATA.categories.forEach((cat, catIdx) => {
      let channels = cat.channels;

      // Favourites row: filter by saved IDs
      if (cat.id === 'favorites') {
        channels = MITV_DATA.getAllChannels().filter(c => favourites.includes(c.id));
        if (channels.length === 0) {
          const row = buildNoFavRow();
          channelRows.appendChild(row);
          return;
        }
      }

      const rowEl = buildRow(cat, channels, catIdx);
      channelRows.appendChild(rowEl);
    });
  }

  function buildRow(cat, channels, delay) {
    const row = document.createElement('div');
    row.className = 'channel-row';
    row.dataset.catId = cat.id;
    row.style.transitionDelay = `${delay * 0.07}s`;

    row.innerHTML = `
      <div class="row-header">
        <h2 class="row-title">
          <span class="row-icon"><i class="fas ${cat.icon}"></i></span>
          ${cat.label}
          <span class="row-count">(${channels.length})</span>
        </h2>
        <a href="#" class="row-see-all" data-cat="${cat.id}">
          See All <i class="fas fa-chevron-right"></i>
        </a>
      </div>
      <div class="row-scroll-wrap">
        <button class="row-scroll-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
        <div class="cards-scroll" id="scroll-${cat.id}"></div>
        <button class="row-scroll-right" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>
      </div>
    `;

    const scroll = row.querySelector(`#scroll-${cat.id}`);
    channels.forEach((ch, idx) => {
      const card = buildCard(ch, idx);
      scroll.appendChild(card);
    });

    // Scroll arrows
    const leftBtn  = row.querySelector('.row-scroll-left');
    const rightBtn = row.querySelector('.row-scroll-right');
    const scrollAmt = 600;
    leftBtn.addEventListener('click', () => scroll.scrollBy({ left: -scrollAmt, behavior: 'smooth' }));
    rightBtn.addEventListener('click', () => scroll.scrollBy({ left: scrollAmt, behavior: 'smooth' }));

    return row;
  }

  function buildNoFavRow() {
    const div = document.createElement('div');
    div.className = 'channel-row no-favorites';
    div.dataset.catId = 'favorites';
    div.innerHTML = `
      <div class="row-header">
        <h2 class="row-title">
          <span class="row-icon"><i class="fas fa-star"></i></span>
          My Favourites
        </h2>
      </div>
      <div style="text-align:center;padding:40px 0">
        <i class="fas fa-star" style="font-size:48px;color:var(--text-dim);display:block;margin-bottom:16px"></i>
        <h3 style="font-size:18px;margin-bottom:8px">No favourites yet</h3>
        <p style="font-size:14px;color:var(--text-muted)">Tap the ♥ on any channel to save it here</p>
      </div>
    `;
    return div;
  }

  /* ────────────────────────────────────────────
     CHANNEL CARD
  ──────────────────────────────────────────── */
  function buildCard(channel, idx) {
    const isFaved = favourites.includes(channel.id);
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.dataset.channelId = channel.id;

    card.innerHTML = `
      ${channel.isLive ? '<div class="card-live-badge"><i class="fas fa-circle"></i> LIVE</div>' : ''}
      <button class="card-fav-btn ${isFaved ? 'active' : ''}" title="Favourite" data-id="${channel.id}">
        <i class="fas fa-heart"></i>
      </button>
      <div class="card-thumb">
        <div class="card-logo-inner">
          <img src="${channel.logo}"
               alt="${channel.name}"
               loading="lazy"
               onerror="this.src='https://via.placeholder.com/200x100/111/555?text=${encodeURIComponent(channel.name.charAt(0))}'"
          />
        </div>
        <div class="card-overlay">
          <div class="card-play-btn"><i class="fas fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${channel.name}</div>
        <div class="card-meta">
          <span class="card-category">${channel.category}</span>
          <span class="card-quality">${channel.quality}</span>
        </div>
      </div>
    `;

    // Play on card click
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-fav-btn')) return;
      createRipple(card, e);
      MITVPlayer.open(channel);
    });

    // Fav button
    const favBtn = card.querySelector('.card-fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowFav = toggleFavourite(channel.id);
      favBtn.classList.toggle('active', isNowFav);
      toast(
        isNowFav ? `"${channel.name}" added to Favourites` : `Removed from Favourites`,
        isNowFav ? 'fa-heart' : 'fa-heart-broken'
      );
      // Re-render favorites row
      rerenderFavRow();
    });

    return card;
  }

  function rerenderFavRow() {
    const existingFavRow = document.querySelector('[data-cat-id="favorites"]');
    const favCat = MITV_DATA.categories.find(c => c.id === 'favorites');
    const channels = MITV_DATA.getAllChannels().filter(c => favourites.includes(c.id));

    if (existingFavRow) {
      const newRow = channels.length === 0
        ? buildNoFavRow()
        : buildRow(favCat, channels, 0);
      newRow.classList.add('visible');
      existingFavRow.replaceWith(newRow);
    }
  }

  /* ────────────────────────────────────────────
     RIPPLE EFFECT
  ──────────────────────────────────────────── */
  function createRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  /* ────────────────────────────────────────────
     FAVOURITES
  ──────────────────────────────────────────── */
  function toggleFavourite(id) {
    const idx = favourites.indexOf(id);
    if (idx === -1) favourites.push(id);
    else            favourites.splice(idx, 1);
    localStorage.setItem('mitv_favs', JSON.stringify(favourites));
    // Update all fav buttons across the app
    document.querySelectorAll(`.card-fav-btn[data-id="${id}"]`).forEach(btn => {
      btn.classList.toggle('active', favourites.includes(id));
    });
    return favourites.includes(id);
  }

  function getFavourites() { return [...favourites]; }

  /* ────────────────────────────────────────────
     SEARCH
  ──────────────────────────────────────────── */
  function initSearch() {
    searchInput.addEventListener('input', debounce(handleSearch, 200));
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.length >= 2) searchResults.classList.add('active');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        searchResults.classList.remove('active');
      }
    });
  }

  function handleSearch(e) {
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchResults.classList.remove('active');
      return;
    }
    const results = MITV_DATA.search(q);
    if (results.length === 0) {
      searchResults.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px">No channels found</div>';
    } else {
      searchResults.innerHTML = results.map(ch => `
        <div class="search-result-item" data-id="${ch.id}">
          <img src="${ch.logo}" alt="${ch.name}"
               onerror="this.src='https://via.placeholder.com/36x36/111/555?text=${ch.name.charAt(0)}'"/>
          <div class="sr-info">
            <div class="sr-name">${ch.name}</div>
            <div class="sr-cat">${ch.category} • ${ch.quality}</div>
          </div>
          <i class="fas fa-play sr-play"></i>
        </div>
      `).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const ch = MITV_DATA.findChannel(item.dataset.id);
          if (ch) {
            searchResults.classList.remove('active');
            searchInput.value = '';
            MITVPlayer.open(ch);
          }
        });
      });
    }
    searchResults.classList.add('active');
  }

  /* ────────────────────────────────────────────
     TOAST NOTIFICATIONS
  ──────────────────────────────────────────── */
  function toast(message, icon = 'fa-check-circle') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      el.addEventListener('animationend', () => el.remove());
    }, 3000);
  }

  /* ────────────────────────────────────────────
     INTERSECTION OBSERVER (lazy reveal rows)
  ──────────────────────────────────────────── */
  function initIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const observeRows = () => {
      document.querySelectorAll('.channel-row').forEach(row => observer.observe(row));
    };

    // Observe existing + future
    observeRows();
    const mutObs = new MutationObserver(observeRows);
    mutObs.observe(channelRows, { childList: true });
  }

  /* ────────────────────────────────────────────
     NAVBAR SCROLL EFFECT
  ──────────────────────────────────────────── */
  function initNavbarScroll() {
    const content = document.querySelector('.content');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  /* ────────────────────────────────────────────
     SIDEBAR
  ──────────────────────────────────────────── */
  function openSidebar() {
    sidebar.classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
  }

  /* ────────────────────────────────────────────
     SETTINGS
  ──────────────────────────────────────────── */
  function openSettings() {
    settingsPanel.classList.add('open');
  }
  function closeSettings() {
    settingsPanel.classList.remove('open');
  }

  /* ────────────────────────────────────────────
     EVENTS
  ──────────────────────────────────────────── */
  function bindEvents() {
    // Hamburger
    hamburger.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    // Settings
    settingsBtn.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);

    // Nav items (sidebar + bottom nav)
    document.querySelectorAll('.nav-item, .bnav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;

        document.querySelectorAll('.nav-item, .bnav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`[data-section="${section}"]`).forEach(i => i.classList.add('active'));

        if (section !== 'home') {
          scrollToSection(section);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        closeSidebar();
      });
    });

    // Color pills
    document.querySelectorAll('.color-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.color-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        document.documentElement.dataset.accent = pill.dataset.color;
        localStorage.setItem('mitv_accent', pill.dataset.color);
        toast('Accent color updated', 'fa-palette');
      });
    });

    // Card size
    document.querySelectorAll('.toggle-btn[data-size]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === cardSize);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn[data-size]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cardSize = btn.dataset.size;
        document.documentElement.dataset.cardSize = cardSize;
        localStorage.setItem('mitv_card_size', cardSize);
        toast('Card size updated', 'fa-th-large');
      });
    });

    // Init search
    initSearch();

    // Restore accent
    const savedAccent = localStorage.getItem('mitv_accent');
    if (savedAccent) {
      document.documentElement.dataset.accent = savedAccent;
      document.querySelectorAll('.color-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.color === savedAccent);
      });
    }
  }

  /* ────────────────────────────────────────────
     SCROLL TO SECTION
  ──────────────────────────────────────────── */
  function scrollToSection(catId) {
    const row = document.querySelector(`[data-cat-id="${catId}"]`);
    if (row) {
      const offset = row.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }

  /* ────────────────────────────────────────────
     UTIL
  ──────────────────────────────────────────── */
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  /* ────────────────────────────────────────────
     PUBLIC API
  ──────────────────────────────────────────── */
  return {
    init,
    toast,
    toggleFavourite,
    getFavourites,
  };

})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', MITVApp.init);

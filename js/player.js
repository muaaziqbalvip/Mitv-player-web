/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — Universal Player v3
   Supports: HLS, DASH, RTMP, TS, MP4, MPEG, M3U8, WebRTC
   Features: Audio tracks, Subtitles, Quality levels, Prev/Next
   ═══════════════════════════════════════════════════════════════ */

const Player = (() => {
  let video, modal, loader, loaderText, errorEl, errorMsg, overlay, playPauseBtn;
  let hlsInstance = null, shakaPlayer = null;
  let currentChannel = null, channelList = [], channelIndex = -1;
  let retryCount = 0, maxRetries = 3;
  let hideTimer = null, isFullscreen = false, isMuted = false;
  let prevBtn, nextBtn;

  // ─── INIT ──────────────────────────────────────────────────────
  function init() {
    video = document.getElementById('main-video');
    modal = document.getElementById('player-modal');
    loader = document.getElementById('player-loader');
    loaderText = document.getElementById('loader-text');
    errorEl = document.getElementById('player-error');
    errorMsg = document.getElementById('error-msg');
    overlay = document.getElementById('player-overlay');
    playPauseBtn = document.getElementById('play-pause-btn');

    document.getElementById('player-close').addEventListener('click', close);
    document.getElementById('player-backdrop').addEventListener('click', close);
    document.getElementById('retry-btn').addEventListener('click', () => { retryCount = 0; loadStream(currentChannel); });
    document.getElementById('next-ch-btn-err').addEventListener('click', nextChannel);

    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', () => { showOverlay(); togglePlay(); });

    // Prev / Next
    prevBtn = document.getElementById('prev-ch-btn');
    nextBtn = document.getElementById('next-ch-btn');
    prevBtn.addEventListener('click', prevChannel);
    nextBtn.addEventListener('click', nextChannel);
    document.getElementById('prev-ch-overlay').addEventListener('click', prevChannel);
    document.getElementById('next-ch-overlay').addEventListener('click', nextChannel);

    // Volume
    const volEl = document.getElementById('volume-slider');
    volEl.addEventListener('input', e => { video.volume = parseFloat(e.target.value); updateMuteIcon(); });
    document.getElementById('mute-btn').addEventListener('click', toggleMute);

    // Seek
    const seekEl = document.getElementById('seek-slider');
    seekEl.addEventListener('input', e => {
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = (e.target.value / 1000) * video.duration;
      }
    });

    // Fullscreen
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

    // PiP
    const pipBtn = document.getElementById('pip-btn');
    if (document.pictureInPictureEnabled) {
      pipBtn.addEventListener('click', async () => {
        try {
          document.pictureInPictureElement ? await document.exitPictureInPicture() : await video.requestPictureInPicture();
        } catch(e) { showToast('PiP not supported', 'error'); }
      });
    } else { pipBtn.style.display = 'none'; }

    // Favorite
    document.getElementById('fav-toggle-btn').addEventListener('click', () => {
      if (!currentChannel) return;
      const added = App.toggleFavorite(currentChannel);
      Tracker.trackFavorite(currentChannel, added);
      updateFavBtn();
      showToast(added ? '⭐ Added to Favorites' : '✓ Removed', 'success');
    });

    // Quality menu
    document.getElementById('quality-btn').addEventListener('click', e => {
      e.stopPropagation();
      const menu = document.getElementById('quality-menu');
      menu.classList.toggle('hidden');
    });

    // Audio tracks
    document.getElementById('audio-btn').addEventListener('click', e => {
      e.stopPropagation();
      const menu = document.getElementById('audio-menu');
      menu.classList.toggle('hidden');
    });

    // Subtitles
    document.getElementById('sub-btn').addEventListener('click', e => {
      e.stopPropagation();
      const menu = document.getElementById('sub-menu');
      menu.classList.toggle('hidden');
    });

    // Close menus on outside click
    document.addEventListener('click', () => {
      document.getElementById('quality-menu').classList.add('hidden');
      document.getElementById('audio-menu').classList.add('hidden');
      document.getElementById('sub-menu').classList.add('hidden');
    });

    // Video events
    video.addEventListener('timeupdate', updateSeek);
    video.addEventListener('play', () => updatePlayBtn(true));
    video.addEventListener('pause', () => updatePlayBtn(false));
    video.addEventListener('waiting', showLoader2);
    video.addEventListener('playing', hideLoader);
    video.addEventListener('loadeddata', hideLoader);
    video.addEventListener('error', onError);

    // Fullscreen change
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
      document.getElementById('fullscreen-btn').textContent = isFullscreen ? '⛶' : '⛶';
      modal.classList.toggle('fullscreen', isFullscreen && document.fullscreenElement === modal);
    });

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);

    // Auto-hide controls
    const container = document.getElementById('player-video-wrap');
    container.addEventListener('mousemove', resetHideTimer);
    container.addEventListener('touchstart', resetHideTimer);

    // Init Shaka
    try { shaka.polyfill.installAll(); } catch(e) {}
  }

  // ─── PLAY ──────────────────────────────────────────────────────
  function play(channel, list = null, index = -1) {
    if (!channel) return;
    currentChannel = channel;
    retryCount = 0;

    if (list) { channelList = list; channelIndex = index; }

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Update header
    document.getElementById('player-channel-name').textContent = channel.name;
    document.getElementById('player-channel-group').textContent = channel.group || 'Live TV';
    const logoEl = document.getElementById('player-logo');
    if (channel.logo) { logoEl.src = channel.logo; logoEl.style.display = ''; }
    else { logoEl.style.display = 'none'; }

    // Live pill
    const livePill = document.getElementById('live-pill');
    const isLive = !channel.xtreamType || channel.xtreamType === 'live';
    livePill.style.display = isLive ? '' : 'none';

    showLoader2('Connecting...');
    hideError();
    playClickSound();

    loadStream(channel);
    updateFavBtn();
    updateNavButtons();
    Tracker.trackChannelPlay(channel);
  }

  // ─── LOAD STREAM (Universal) ────────────────────────────────────
  function loadStream(channel) {
    const url = channel.url;
    showLoader2('Loading stream...');
    hideError();

    // Destroy previous instances
    destroyPrev();

    // Detect stream type
    if (isRTMP(url)) {
      showError('RTMP streams require a native player. Copy URL to VLC.');
      return;
    }

    const useDash = isDASH(url);
    const useHls = isHLS(url) || isTS(url) || !useDash;

    if (useDash && window.shaka) {
      loadWithShaka(url);
    } else if (window.Hls && Hls.isSupported() && useHls) {
      loadWithHls(url);
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('video/mp4')) {
      loadNative(url);
    } else {
      loadNative(url);
    }
  }

  function isRTMP(url) { return url.startsWith('rtmp://') || url.startsWith('rtmpe://') || url.startsWith('rtmps://'); }
  function isHLS(url) { return url.includes('.m3u8') || url.includes('hls') || url.includes('stream'); }
  function isDASH(url) { return url.includes('.mpd') || url.includes('dash'); }
  function isTS(url) { return url.includes('.ts') || url.includes('mpeg') || url.includes('/ts/') || url.includes('output=ts'); }

  function loadWithHls(url) {
    loaderText.textContent = 'HLS stream loading...';
    hlsInstance = new Hls({
      enableWorker: true, lowLatencyMode: true,
      maxBufferLength: 60, maxMaxBufferLength: 120,
      maxBufferSize: 120 * 1000 * 1000,
      abrEwmaDefaultEstimate: 500000,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 20000,
      levelLoadingTimeOut: 20000,
    });

    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
      video.play().catch(() => {});
      buildQualityMenu(data.levels);
    });

    hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, (e, data) => {
      buildAudioMenu(data.audioTracks);
    });

    hlsInstance.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (e, data) => {
      buildSubMenu(data.subtitleTracks);
    });

    hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
      const levels = hlsInstance.levels;
      const btn = document.getElementById('quality-btn');
      if (levels[data.level]) {
        const h = levels[data.level].height;
        btn.textContent = h >= 1080 ? 'FHD' : h >= 720 ? 'HD' : h >= 480 ? 'SD' : 'AUTO';
      }
    });

    hlsInstance.on(Hls.Events.ERROR, (e, data) => {
      if (!data.fatal) return;
      retryCount++;
      if (retryCount <= maxRetries) {
        setTimeout(() => {
          loaderText.textContent = `Retry ${retryCount}/${maxRetries}...`;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hlsInstance.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hlsInstance.recoverMediaError();
          else loadNative(url);
        }, 1500 * retryCount);
      } else {
        showError('HLS stream failed. ' + (data.reason || 'Channel may be offline.'));
        Tracker.trackError(currentChannel, data.reason);
      }
    });
  }

  async function loadWithShaka(url) {
    loaderText.textContent = 'DASH stream loading...';
    try {
      if (shakaPlayer) { await shakaPlayer.destroy(); }
      shakaPlayer = new shaka.Player(video);
      shakaPlayer.addEventListener('error', (e) => {
        retryCount++;
        if (retryCount > maxRetries) showError('DASH stream error: ' + e.detail?.message);
      });
      await shakaPlayer.load(url);
      video.play().catch(() => {});
      hideLoader();
    } catch(e) {
      // Fallback to HLS
      loadWithHls(url);
    }
  }

  function loadNative(url) {
    loaderText.textContent = 'Loading...';
    video.src = url;
    video.load();
    video.play().catch(() => {
      // Autoplay blocked — show overlay
      overlay.classList.add('show');
    });
  }

  function destroyPrev() {
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    if (shakaPlayer) { shakaPlayer.destroy().catch(() => {}); shakaPlayer = null; }
    video.src = '';
    video.removeAttribute('src');
    video.load();
    document.getElementById('quality-menu').innerHTML = '';
    document.getElementById('audio-menu').innerHTML = '';
    document.getElementById('sub-menu').innerHTML = '';
    document.getElementById('quality-menu').classList.add('hidden');
    document.getElementById('audio-menu').classList.add('hidden');
    document.getElementById('sub-menu').classList.add('hidden');
  }

  // ─── QUALITY MENU ─────────────────────────────────────────────
  function buildQualityMenu(levels) {
    const menu = document.getElementById('quality-menu');
    if (!levels || !levels.length) return;
    menu.innerHTML = '';

    const autoItem = document.createElement('div');
    autoItem.className = 'quality-item active';
    autoItem.textContent = 'AUTO';
    autoItem.addEventListener('click', () => {
      hlsInstance.currentLevel = -1;
      menu.querySelectorAll('.quality-item').forEach(i => i.classList.remove('active'));
      autoItem.classList.add('active');
      document.getElementById('quality-btn').textContent = 'AUTO';
    });
    menu.appendChild(autoItem);

    levels.forEach((level, idx) => {
      const label = level.height >= 1080 ? '1080p FHD' : level.height >= 720 ? '720p HD' : level.height >= 480 ? '480p SD' : `${level.height}p`;
      const item = document.createElement('div');
      item.className = 'quality-item';
      item.textContent = label;
      item.addEventListener('click', () => {
        hlsInstance.currentLevel = idx;
        menu.querySelectorAll('.quality-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('quality-btn').textContent = label.split(' ')[0];
        menu.classList.add('hidden');
      });
      menu.appendChild(item);
    });
  }

  // ─── AUDIO TRACKS ─────────────────────────────────────────────
  function buildAudioMenu(tracks) {
    const menu = document.getElementById('audio-menu');
    if (!tracks || !tracks.length) return;
    menu.innerHTML = '';
    tracks.forEach((track, idx) => {
      const item = document.createElement('div');
      item.className = 'track-item' + (idx === 0 ? ' active' : '');
      item.textContent = track.name || track.lang || `Track ${idx + 1}`;
      item.addEventListener('click', () => {
        hlsInstance.audioTrack = idx;
        menu.querySelectorAll('.track-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        menu.classList.add('hidden');
        showToast(`🎵 Audio: ${item.textContent}`, 'info');
      });
      menu.appendChild(item);
    });
    document.getElementById('audio-btn').style.opacity = '1';
  }

  // ─── SUBTITLES ────────────────────────────────────────────────
  function buildSubMenu(tracks) {
    const menu = document.getElementById('sub-menu');
    menu.innerHTML = '';

    const offItem = document.createElement('div');
    offItem.className = 'track-item active';
    offItem.textContent = 'Off';
    offItem.addEventListener('click', () => {
      if (hlsInstance) hlsInstance.subtitleTrack = -1;
      menu.querySelectorAll('.track-item').forEach(i => i.classList.remove('active'));
      offItem.classList.add('active');
      menu.classList.add('hidden');
    });
    menu.appendChild(offItem);

    (tracks || []).forEach((track, idx) => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.textContent = track.name || track.lang || `Sub ${idx + 1}`;
      item.addEventListener('click', () => {
        if (hlsInstance) hlsInstance.subtitleTrack = idx;
        menu.querySelectorAll('.track-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        menu.classList.add('hidden');
        showToast(`CC: ${item.textContent}`, 'info');
      });
      menu.appendChild(item);
    });
  }

  // ─── NEXT / PREV CHANNEL ──────────────────────────────────────
  function nextChannel() {
    if (!channelList.length) return;
    channelIndex = (channelIndex + 1) % channelList.length;
    play(channelList[channelIndex], channelList, channelIndex);
  }

  function prevChannel() {
    if (!channelList.length) return;
    channelIndex = (channelIndex - 1 + channelList.length) % channelList.length;
    play(channelList[channelIndex], channelList, channelIndex);
  }

  function updateNavButtons() {
    const hasList = channelList.length > 1;
    [prevBtn, nextBtn, document.getElementById('prev-ch-overlay'), document.getElementById('next-ch-overlay')].forEach(btn => {
      if (btn) btn.style.opacity = hasList ? '1' : '0.3';
    });
  }

  // ─── CONTROLS ─────────────────────────────────────────────────
  function togglePlay() {
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); showOverlayIcon('▶'); }
    else { video.pause(); showOverlayIcon('⏸'); }
    overlay.classList.remove('show');
  }

  function showOverlay() {
    overlay.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => overlay.classList.remove('show'), 3000);
  }

  function showOverlayIcon(icon) {
    document.getElementById('overlay-play-btn').textContent = icon;
    overlay.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => overlay.classList.remove('show'), 800);
  }

  function updatePlayBtn(playing) {
    if (playPauseBtn) playPauseBtn.textContent = playing ? '⏸' : '▶';
  }

  function toggleMute() {
    isMuted = !isMuted;
    video.muted = isMuted;
    const volEl = document.getElementById('volume-slider');
    volEl.value = isMuted ? 0 : video.volume;
    updateMuteIcon();
  }

  function updateMuteIcon() {
    const btn = document.getElementById('mute-btn');
    if (!btn) return;
    btn.textContent = (video.muted || video.volume === 0) ? '🔇' : video.volume < 0.5 ? '🔉' : '🔊';
  }

  function updateSeek() {
    if (!video.duration || !isFinite(video.duration)) {
      document.getElementById('time-display').textContent = 'LIVE';
      document.getElementById('seek-slider').value = 1000;
      return;
    }
    const pct = (video.currentTime / video.duration) * 1000;
    document.getElementById('seek-slider').value = pct;
    document.getElementById('time-display').textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  }

  function fmt(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try { await modal.requestFullscreen(); } catch(e) { try { await video.requestFullscreen(); } catch(e2) {} }
    } else { await document.exitFullscreen(); }
  }

  function resetHideTimer() {
    const ctrls = document.getElementById('player-controls');
    const hdr = document.querySelector('.player-header');
    ctrls.style.opacity = '1';
    if (hdr) hdr.style.opacity = '1';
    clearTimeout(hideTimer);
    if (!video.paused) {
      hideTimer = setTimeout(() => {
        ctrls.style.opacity = '0';
        if (hdr) hdr.style.opacity = '0';
      }, 3000);
    }
  }

  function handleKeyboard(e) {
    if (modal.classList.contains('hidden')) return;
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch(e.key) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'Escape': document.fullscreenElement ? document.exitFullscreen() : close(); break;
      case 'f': toggleFullscreen(); break;
      case 'm': toggleMute(); break;
      case 'n': case 'N': nextChannel(); break;
      case 'p': case 'P': prevChannel(); break;
      case 'ArrowRight': if (video.duration) video.currentTime = Math.min(video.currentTime + 10, video.duration); break;
      case 'ArrowLeft': if (video.duration) video.currentTime = Math.max(video.currentTime - 10, 0); break;
      case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); document.getElementById('volume-slider').value = video.volume; updateMuteIcon(); break;
      case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); document.getElementById('volume-slider').value = video.volume; updateMuteIcon(); break;
    }
  }

  function onError() {
    retryCount++;
    if (retryCount <= maxRetries) {
      setTimeout(() => loadStream(currentChannel), 1500 * retryCount);
    } else {
      showError('Unable to play stream. Channel may be offline or unsupported.');
    }
  }

  function showLoader2(msg) {
    loader.style.display = 'flex';
    if (msg && loaderText) loaderText.textContent = msg;
    errorEl.classList.add('hidden');
  }

  function hideLoader() { loader.style.display = 'none'; }
  function hideError() { errorEl.classList.add('hidden'); }

  function showError(msg) {
    loader.style.display = 'none';
    errorEl.classList.remove('hidden');
    errorMsg.textContent = msg;
  }

  function updateFavBtn() {
    const btn = document.getElementById('fav-toggle-btn');
    if (!btn || !currentChannel) return;
    const isFav = App.isFavorite(currentChannel);
    btn.classList.toggle('active', isFav);
  }

  function close() {
    Tracker.trackWatchEnd();
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    video.pause();
    destroyPrev();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    retryCount = 0;
  }

  function playClickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 1000; osc.type = 'sine';
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start(); osc.stop(ctx.currentTime + 0.07);
    } catch(e) {}
  }

  return { init, play, close, nextChannel, prevChannel };
})();

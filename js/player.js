/* ═══════════════════════════════════════════════════════════════
   MITV Player — Video Player Module
   By: Muaaz Iqbal · Muslim Islam
   ═══════════════════════════════════════════════════════════════ */

const Player = (() => {

  let video, modal, loader, errorEl, errorMsg, overlay, playPauseBtn;
  let currentChannel = null;
  let hlsInstance = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let hideControlsTimer = null;
  let isFullscreen = false;

  // HLS.js CDN
  const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';

  async function loadHls() {
    if (window.Hls) return;
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = HLS_CDN;
      s.onload = res;
      s.onerror = () => rej(new Error('HLS.js load failed'));
      document.head.appendChild(s);
    });
  }

  function init() {
    video = document.getElementById('main-video');
    modal = document.getElementById('player-modal');
    loader = document.getElementById('player-loader');
    errorEl = document.getElementById('player-error');
    errorMsg = document.getElementById('error-msg');
    overlay = document.getElementById('player-overlay');
    playPauseBtn = document.getElementById('play-pause-btn');

    // Close
    document.getElementById('player-close').addEventListener('click', close);
    document.getElementById('player-backdrop').addEventListener('click', close);

    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);

    // Volume
    const volSlider = document.getElementById('volume-slider');
    volSlider.addEventListener('input', e => {
      video.volume = parseFloat(e.target.value);
      video.muted = video.volume === 0;
      updateMuteBtn();
    });

    document.getElementById('mute-btn').addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 0.5;
      volSlider.value = video.muted ? 0 : video.volume;
      updateMuteBtn();
    });

    // Fullscreen
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

    // PiP
    const pipBtn = document.getElementById('pip-btn');
    if (document.pictureInPictureEnabled) {
      pipBtn.addEventListener('click', async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } catch(e) {
          showToast('PiP not supported', 'error');
        }
      });
    } else {
      pipBtn.style.display = 'none';
    }

    // Retry
    document.getElementById('retry-btn').addEventListener('click', () => {
      retryCount = 0;
      play(currentChannel);
    });

    // Favorite toggle
    document.getElementById('fav-toggle-btn').addEventListener('click', () => {
      if (currentChannel) {
        const wasFav = App.toggleFavorite(currentChannel);
        updateFavBtn();
        showToast(wasFav ? '⭐ Added to Favorites' : '✓ Removed from Favorites', 'success');
      }
    });

    // Seek bar (for VOD)
    const seekBar = document.getElementById('seek-bar');
    seekBar.addEventListener('click', e => {
      if (video.duration && isFinite(video.duration)) {
        const rect = seekBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        video.currentTime = ratio * video.duration;
      }
    });

    // Video events
    video.addEventListener('timeupdate', updateSeek);
    video.addEventListener('play', () => updatePlayBtn(true));
    video.addEventListener('pause', () => updatePlayBtn(false));
    video.addEventListener('waiting', () => { loader.style.display = 'flex'; });
    video.addEventListener('playing', () => { loader.style.display = 'none'; hideError(); });
    video.addEventListener('loadeddata', () => { loader.style.display = 'none'; });
    video.addEventListener('error', onVideoError);
    video.addEventListener('stalled', () => { if (retryCount < MAX_RETRIES) setTimeout(() => video.load(), 2000); });

    // Fullscreen change
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
      const btn = document.getElementById('fullscreen-btn');
      btn.textContent = isFullscreen ? '⛶' : '⛶';
      modal.classList.toggle('fullscreen', isFullscreen && document.fullscreenElement === modal);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Auto-hide controls
    const playerContainer = document.getElementById('player-container');
    playerContainer.addEventListener('mousemove', resetControlsTimer);
    playerContainer.addEventListener('touchstart', resetControlsTimer);
  }

  function resetControlsTimer() {
    const controls = document.getElementById('player-controls');
    const header = document.querySelector('.player-header');
    controls.style.opacity = '1';
    if (header) header.style.opacity = '1';
    clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(() => {
      if (!video.paused) {
        controls.style.opacity = '0';
        if (header) header.style.opacity = '0';
      }
    }, 3000);
  }

  async function play(channel) {
    if (!channel) return;
    currentChannel = channel;

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Update header UI
    document.getElementById('player-channel-name').textContent = channel.name;
    document.getElementById('player-channel-group').textContent = channel.group || 'Live TV';
    const logoEl = document.getElementById('player-logo');
    if (channel.logo) {
      logoEl.src = channel.logo;
      logoEl.style.display = '';
    } else {
      logoEl.style.display = 'none';
    }

    showLoader();
    hideError();

    // Play click sound
    playClickSound();

    try {
      await loadHls();
    } catch(e) {
      console.warn('HLS.js unavailable, using native');
    }

    loadStream(channel.url);
    updateFavBtn();
  }

  function loadStream(url) {
    showLoader();
    hideError();

    // Destroy existing HLS
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    const isHls = url.includes('.m3u8') || url.includes('.m3u') ||
                  url.includes('hls') || url.includes('stream');

    if (window.Hls && Hls.isSupported() && isHls) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        xhrSetup: (xhr) => {
          xhr.timeout = 15000;
        }
      });

      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn('Autoplay prevented:', e));
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(() => hlsInstance.startLoad(), 1500 * retryCount);
              } else {
                showError('Network error. Check your connection or stream URL.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                hlsInstance.recoverMediaError();
              } else {
                showError('Media error. Stream format may be unsupported.');
              }
              break;
            default:
              showError('Stream failed to load. Try again later.');
          }
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = url;
      video.play().catch(e => {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(() => video.play(), 1000);
        }
      });
    } else {
      // Direct stream
      video.src = url;
      video.play().catch(onVideoError);
    }
  }

  function onVideoError(e) {
    retryCount++;
    if (retryCount <= MAX_RETRIES) {
      setTimeout(() => {
        loadStream(currentChannel.url);
      }, 1500 * retryCount);
    } else {
      showError('Unable to play this stream. The channel may be offline or geo-restricted.');
    }
  }

  function togglePlayPause() {
    if (!video) return;
    if (video.paused) {
      video.play().catch(()=>{});
      showOverlayIcon('▶');
    } else {
      video.pause();
      showOverlayIcon('⏸');
    }
  }

  function showOverlayIcon(icon) {
    overlay.querySelector('.overlay-play-btn').textContent = icon;
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 800);
  }

  function updatePlayBtn(playing) {
    if (playPauseBtn) playPauseBtn.textContent = playing ? '⏸' : '▶';
  }

  function updateMuteBtn() {
    const btn = document.getElementById('mute-btn');
    if (!btn || !video) return;
    btn.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  }

  function updateSeek() {
    if (!video.duration || !isFinite(video.duration)) {
      document.getElementById('current-time').textContent = 'LIVE';
      document.getElementById('seek-progress').style.width = '100%';
      return;
    }
    const pct = (video.currentTime / video.duration) * 100;
    document.getElementById('seek-progress').style.width = pct + '%';
    document.getElementById('seek-thumb').style.left = pct + '%';
    document.getElementById('current-time').textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await modal.requestFullscreen();
      } catch(e) {
        try { await video.requestFullscreen(); } catch(e2){}
      }
    } else {
      await document.exitFullscreen();
    }
  }

  function handleKeyboard(e) {
    if (modal.classList.contains('hidden')) return;
    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          close();
        }
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'm':
        video.muted = !video.muted;
        updateMuteBtn();
        break;
      case 'ArrowRight':
        if (video.duration) video.currentTime = Math.min(video.currentTime + 10, video.duration);
        break;
      case 'ArrowLeft':
        if (video.duration) video.currentTime = Math.max(video.currentTime - 10, 0);
        break;
      case 'ArrowUp':
        video.volume = Math.min(1, video.volume + 0.1);
        document.getElementById('volume-slider').value = video.volume;
        updateMuteBtn();
        break;
      case 'ArrowDown':
        video.volume = Math.max(0, video.volume - 0.1);
        document.getElementById('volume-slider').value = video.volume;
        updateMuteBtn();
        break;
    }
  }

  function close() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    video.pause();
    video.src = '';
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    retryCount = 0;
  }

  function showLoader() {
    loader.style.display = 'flex';
    errorEl.classList.add('hidden');
  }

  function hideError() {
    errorEl.classList.add('hidden');
  }

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
    btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
  }

  // Click sound
  function playClickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
  }

  return { init, play, close };
})();

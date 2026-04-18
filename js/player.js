/* ═══════════════════════════════════════════════
   MITV PLAYER — VIDEO PLAYER ENGINE
   By: Muaaz Iqbal | Muslim Islam Project
═══════════════════════════════════════════════ */

const MITVPlayer = (() => {
  let hls = null;
  let currentChannel = null;
  let controlsTimeout = null;
  let isFav = false;

  const modal     = document.getElementById('playerModal');
  const video     = document.getElementById('videoPlayer');
  const spinner   = document.getElementById('videoSpinner');
  const errorBox  = document.getElementById('videoError');
  const errorMsg  = document.getElementById('videoErrorMsg');
  const retryBtn  = document.getElementById('retryBtn');

  const playerName  = document.getElementById('playerName');
  const playerLogo  = document.getElementById('playerLogo');
  const playerClose = document.getElementById('playerClose');
  const playerFav   = document.getElementById('playerFavBtn');
  const ctrlName    = document.getElementById('ctrlChannelName');

  const playPauseBtn   = document.getElementById('playPauseBtn');
  const muteBtn        = document.getElementById('muteBtn');
  const volumeSlider   = document.getElementById('volumeSlider');
  const fullscreenBtn  = document.getElementById('fullscreenBtn');
  const pipBtn         = document.getElementById('pipBtn');
  const controls       = document.getElementById('playerControls');
  const overlay        = document.getElementById('videoOverlayCenter');

  // ── Open player ──
  function open(channel) {
    currentChannel = channel;
    isFav = MITVApp?.getFavourites?.()?.includes(channel.id) || false;

    // Update UI
    playerName.textContent = channel.name;
    ctrlName.textContent   = channel.name;
    playerLogo.src         = channel.logo;
    playerLogo.onerror     = () => { playerLogo.style.display = 'none'; };
    playerFav.classList.toggle('active', isFav);

    // Show modal
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Load stream
    loadStream(channel.stream);
    playClickSound();
    showControls();
  }

  // ── Load HLS stream ──
  function loadStream(url) {
    showSpinner();
    hideError();

    if (hls) {
      hls.destroy();
      hls = null;
    }
    video.pause();

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 20,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(hideSpinner).catch(onError);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              onError('Stream unavailable. Please try another channel.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().then(hideSpinner).catch(onError);
      }, { once: true });
    } else {
      onError('HLS streaming is not supported in your browser.');
    }
  }

  function onError(msg) {
    hideSpinner();
    showError(typeof msg === 'string' ? msg : 'Stream connection failed. Check your network.');
  }

  // ── Close ──
  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    video.pause();
    if (hls) { hls.destroy(); hls = null; }
    video.src = '';
    clearTimeout(controlsTimeout);
  }

  // ── Spinner / Error ──
  function showSpinner() { spinner.classList.remove('hidden'); }
  function hideSpinner() { spinner.classList.add('hidden'); }
  function showError(msg) { errorMsg.textContent = msg; errorBox.classList.add('show'); }
  function hideError() { errorBox.classList.remove('show'); }

  // ── Controls visibility ──
  function showControls() {
    controls.style.opacity = '1';
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!video.paused) controls.style.opacity = '0';
    }, 3500);
  }

  // ── Play/Pause ──
  function togglePlay() {
    if (video.paused) {
      video.play();
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      flashOverlay('fa-pause');
    } else {
      video.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      flashOverlay('fa-play');
    }
  }

  function flashOverlay(icon) {
    overlay.innerHTML = `<div class="play-pause-flash"><i class="fas ${icon}"></i></div>`;
    setTimeout(() => { overlay.innerHTML = ''; }, 600);
  }

  // ── Mute ──
  function toggleMute() {
    video.muted = !video.muted;
    muteBtn.innerHTML = video.muted
      ? '<i class="fas fa-volume-mute"></i>'
      : '<i class="fas fa-volume-up"></i>';
  }

  // ── Volume ──
  function setVolume(v) {
    video.volume = v;
    video.muted = v === 0;
    muteBtn.innerHTML = v === 0
      ? '<i class="fas fa-volume-mute"></i>'
      : v < 0.5
        ? '<i class="fas fa-volume-down"></i>'
        : '<i class="fas fa-volume-up"></i>';
  }

  // ── Fullscreen ──
  function toggleFullscreen() {
    const container = modal.querySelector('.player-container');
    if (!document.fullscreenElement) {
      (container.requestFullscreen?.() || container.webkitRequestFullscreen?.());
      fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  }

  // ── PiP ──
  async function togglePiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      MITVApp.toast('PiP not supported in this browser', 'fa-info-circle');
    }
  }

  // ── Favourite toggle ──
  function toggleFav() {
    if (!currentChannel) return;
    isFav = MITVApp.toggleFavourite(currentChannel.id);
    playerFav.classList.toggle('active', isFav);
    MITVApp.toast(
      isFav ? `Added "${currentChannel.name}" to Favourites` : `Removed from Favourites`,
      isFav ? 'fa-heart' : 'fa-heart-broken'
    );
  }

  // ── Click sound ──
  function playClickSound() {
    const sound = document.getElementById('clickSound');
    if (sound && document.getElementById('soundToggle')?.checked) {
      sound.currentTime = 0;
      sound.volume = 0.3;
      sound.play().catch(() => {});
    }
  }

  // ── Event Listeners ──
  playerClose.addEventListener('click', close);
  modal.querySelector('.player-backdrop').addEventListener('click', close);
  playPauseBtn.addEventListener('click', togglePlay);
  muteBtn.addEventListener('click', toggleMute);
  volumeSlider.addEventListener('input', e => setVolume(parseFloat(e.target.value)));
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  pipBtn.addEventListener('click', togglePiP);
  playerFav.addEventListener('click', toggleFav);
  retryBtn.addEventListener('click', () => {
    if (currentChannel) { hideError(); loadStream(currentChannel.stream); }
  });

  video.addEventListener('waiting', showSpinner);
  video.addEventListener('playing', hideSpinner);
  video.addEventListener('error', () => onError());

  // Mouse move → show controls
  modal.addEventListener('mousemove', showControls);
  modal.addEventListener('touchstart', showControls, { passive: true });

  // Click video to toggle play
  video.addEventListener('click', togglePlay);

  // Keyboard controls
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    switch(e.key) {
      case ' ':
      case 'k': e.preventDefault(); togglePlay(); break;
      case 'm': toggleMute(); break;
      case 'f': toggleFullscreen(); break;
      case 'Escape': close(); break;
      case 'ArrowUp':
        setVolume(Math.min(1, video.volume + 0.1));
        volumeSlider.value = video.volume;
        break;
      case 'ArrowDown':
        setVolume(Math.max(0, video.volume - 0.1));
        volumeSlider.value = video.volume;
        break;
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  });

  return { open, close, playClickSound };
})();

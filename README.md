# 🔥 MITV Player
### 👑 By Muaaz Iqbal · Muslim Islam Project 🌙

A **Premium Netflix-Style OTT Streaming PWA** for IPTV channels.

---

## 🚀 Quick Start

1. **Extract** the ZIP file
2. **Open** `index.html` in a browser  
   *(For best experience, serve via local server — see below)*
3. That's it! The UI loads instantly.

## 🖥️ Local Server (Recommended)

For HLS stream playback to work correctly, serve from a local HTTP server:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code
Install "Live Server" extension → Right-click index.html → Open with Live Server
```

Then visit: `http://localhost:8080`

---

## 📁 Project Structure

```
mitv-player/
├── index.html          # Main entry point
├── manifest.json       # PWA manifest
├── css/
│   └── style.css       # All styles (dark theme + animations)
└── js/
    ├── data.js         # Channel data & categories
    ├── player.js       # HLS video player engine
    └── app.js          # Main app logic
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎨 Theme | Deep black with neon pink/purple/blue gradients |
| 📺 HLS Streaming | Via hls.js with low-latency mode |
| 🔍 Live Search | Instant channel search across all categories |
| ⭐ Favourites | Persistent across sessions (localStorage) |
| 🎛️ Settings | Accent color, card size, audio, playback |
| 🖥️ Desktop | Sidebar navigation, hover effects |
| 📱 Mobile | Bottom nav bar, touch-friendly cards |
| ⌨️ Keyboard | Space/K = play, M = mute, F = fullscreen, Esc = close |
| 🖼️ PiP | Picture-in-Picture support |
| 🌀 Animations | Skeleton loaders, scroll reveal, card hover glow |
| 🔔 Toast Alerts | Smooth notification system |

---

## 🛠️ Customization

### Add Channels
Edit `js/data.js` → add to any category's `channels` array:

```js
{
  id: 'unique_id',
  name: 'Channel Name',
  category: 'Live TV',
  quality: 'HD',          // HD / FHD / 4K
  logo: 'URL_TO_LOGO',
  thumbnail: 'URL_TO_BG',
  stream: 'HLS_STREAM_URL.m3u8',
  isLive: true
}
```

### Change Accent Color
In `css/style.css`, update `:root` variables:
```css
--accent1: #ff0057;
--accent2: #7a00ff;
--accent3: #00c3ff;
```

### M3U Playlist Integration
Replace static `MITV_DATA.categories` with dynamic parsing of your `.m3u` playlist in `js/data.js`.

---

## 📦 Dependencies (CDN)

- **hls.js** — HLS stream playback
- **Font Awesome 6** — Icons
- **Google Fonts** — Bebas Neue + Outfit

---

## 🌙 Muslim Islam Project

Built with ❤️ for the Muslim community to access:
- Mecca & Medina Live streams
- Quran channels
- Islamic lectures
- Peace TV, Huda TV, Iqraa, Islam Channel

---

*© 2025 MITV Player by Muaaz Iqbal. All rights reserved.*

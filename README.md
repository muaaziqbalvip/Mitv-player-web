# 🔥 MITV PLAYER
### By: Muaaz Iqbal · Muslim Islam Project

A premium, Netflix-style Progressive Web App for IPTV streaming.

---

## 🚀 Quick Start

### Option 1: Open Directly
Just open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local Server (Recommended for PWA features)
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```
Then open: `http://localhost:8080`

### Option 3: Deploy Online
Upload to any static host:
- **Netlify** (drag & drop the folder)
- **Vercel** (`vercel deploy`)
- **GitHub Pages**
- **Firebase Hosting**

---

## 📡 Using the App

1. Open MITV Player
2. Enter your M3U/M3U8 playlist URL
3. Click **Load Channels**
4. Browse and enjoy!

### Supported URL formats:
- `https://example.com/playlist.m3u`
- `https://example.com/playlist.m3u8`
- `https://example.com/get.php?username=X&password=Y&type=m3u_plus`

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🎨 Netflix-style UI | Dark theme with neon glow effects |
| 📺 Auto-categorization | Live TV, News, Movies, Music, Islamic, Sports |
| 🔍 Live search | Instant channel search |
| ⭐ Favorites | Save & manage favorite channels |
| 📱 Mobile-first | Fully responsive + touch gestures |
| 💾 PWA | Install as app, offline support |
| 🎬 HLS Support | Native HLS.js integration |
| ⌨️ Keyboard shortcuts | Space, F, M, Arrow keys |
| 🔄 Auto-refresh | Background playlist refresh |
| 💿 Channel cache | 3-hour local cache |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Toggle Mute |
| `↑` / `↓` | Volume |
| `←` / `→` | Seek (VOD) |
| `Esc` | Close Player |

---

## 🏗️ File Structure

```
mitv-player/
├── index.html          # Main HTML
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/
│   └── style.css       # All styles
└── js/
    ├── m3u-parser.js   # M3U parser + categorizer
    ├── player.js       # Video player module
    └── app.js          # Main app logic
```

---

## 🛠️ Backend Integration

To connect to your IPTV backend, use any standard M3U URL:

```
http://your-server.com/get.php?username=USER&password=PASS&type=m3u_plus&output=ts
```

The app auto-handles:
- CORS proxy fallback
- HLS stream detection
- Channel grouping
- Error recovery

---

## 📱 Install as App (PWA)

**Android (Chrome):**
1. Open in Chrome
2. Tap menu → "Add to Home Screen"

**iOS (Safari):**
1. Open in Safari
2. Tap Share → "Add to Home Screen"

**Desktop (Chrome/Edge):**
1. Click the install icon in the address bar

---

## 🎨 Color Theme

| Color | Hex | Use |
|-------|-----|-----|
| Background | `#0a0a0a` | Main bg |
| Cards | `#111111` | Card bg |
| Pink | `#ff0057` | Primary accent |
| Purple | `#7a00ff` | Gradient |
| Blue | `#00c3ff` | Secondary accent |

---

**MITV Player v2.0** · Made with ❤️ by Muaaz Iqbal · Muslim Islam

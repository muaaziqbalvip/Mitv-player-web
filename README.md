# 🔥 MITV Player Pro v3.0
### By Muaaz Iqbal · Muslim Islam Project
### Premium AI-Powered IPTV PWA

---

## 🚀 Quick Start

### Open Directly:
```
Open index.html in Chrome / Edge / Firefox / Safari
```

### Local Server (Recommended):
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# Then open: http://localhost:8080
```

### Deploy Online:
- **Netlify**: Drag the folder → Live instantly
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to repo → Enable Pages
- **Firebase Hosting**: `firebase deploy`

---

## 🔑 Credentials Already Configured

| Service | Status |
|---------|--------|
| Firebase Auth | ✅ Google Login enabled |
| Firebase Realtime DB | ✅ Connected |
| Groq AI API | ✅ Integrated |

---

## 📡 Supported Input Formats

| Format | Example |
|--------|---------|
| M3U URL | `http://server.com/list.m3u` |
| M3U8 URL | `http://server.com/playlist.m3u8` |
| Xtream Codes | `http://server.com/get.php?username=X&password=Y&type=m3u_plus` |
| Xtream Panel | Use built-in panel tab in setup |
| Player API | `http://server.com/player_api.php?username=X&password=Y` |

---

## 🎬 Supported Stream Types

| Type | Support |
|------|---------|
| HLS (.m3u8) | ✅ Native HLS.js |
| TS streams | ✅ HLS.js |
| MPEG-DASH (.mpd) | ✅ Shaka Player |
| MP4 / WebM | ✅ Native |
| RTMP | ⚠️ Display URL only (needs VLC) |

---

## ✨ Features

### 🔐 Authentication
- Google Sign-In via Firebase
- Guest mode (no account needed)
- User profiles saved to Firebase

### 🤖 AI (Groq API - Llama 3)
- Natural language channel search
- Personalized recommendations
- AI chat assistant in modal
- Tracks your preferences

### 📊 Analytics (Firebase Realtime DB)
- Watch time per category
- Channel view history
- Search queries tracked
- Session analytics
- Category preferences

### 🎬 Player
- HLS.js + Shaka Player (DASH)
- Audio track switching
- Subtitle/CC support
- Quality level selection (AUTO/HD/SD)
- Previous/Next channel
- Picture-in-Picture
- Fullscreen
- Keyboard shortcuts
- Auto-retry on error (3x)
- Click sound UX

### 📺 UI/UX
- Netflix-style dark theme
- Neon glow accents
- Hero banner
- AI recommendation chips
- Horizontal scrollable rows
- Skeleton loaders
- Search (instant + AI-powered)
- Favorites (localStorage)
- Watch history
- About section
- Xtream Codes support
- Millions of channels handled
- 4-hour local cache

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / K | Play/Pause |
| F | Fullscreen |
| M | Mute |
| N | Next Channel |
| P | Previous Channel |
| ↑↓ | Volume |
| ←→ | Seek (VOD) |
| Esc | Close player |

---

## 🔥 Firebase Setup

1. Go to Firebase Console → Authentication → Sign-in methods
2. Enable **Google** sign-in
3. Add your domain to **Authorized domains**
4. Import `firebase-rules.json` to Realtime Database rules

---

## 📁 File Structure

```
mitv-player-pro/
├── index.html              ← Main UI
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service Worker
├── firebase-rules.json     ← DB security rules
├── css/
│   └── style.css           ← Premium styles
└── js/
    ├── firebase-config.js  ← Firebase + Auth
    ├── tracker.js          ← Analytics tracking
    ├── m3u-parser.js       ← M3U + Xtream parser
    ├── ai-engine.js        ← Groq AI integration
    ├── player.js           ← Universal video player
    └── app.js              ← Main app logic
```

---

**MITV Player Pro v3.0** · Made with ❤️ by Muaaz Iqbal · Muslim Islam

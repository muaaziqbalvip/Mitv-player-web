/* ═══════════════════════════════════════════════════════════════
   MITV Player Pro — Firebase Config & Auth
   ═══════════════════════════════════════════════════════════════ */

const FirebaseConfig = (() => {
  const config = {
    apiKey: "AIzaSyBbnU8DkthpYQMHOLLyj6M0cc05qXfjMcw",
    authDomain: "ramadan-2385b.firebaseapp.com",
    databaseURL: "https://ramadan-2385b-default-rtdb.firebaseio.com",
    projectId: "ramadan-2385b",
    storageBucket: "ramadan-2385b.firebasestorage.app",
    messagingSenderId: "882828936310",
    appId: "1:882828936310:web:7f97b921031fe130fe4b57"
  };

  let app, auth, db;
  let currentUser = null;
  let isGuest = false;

  function init() {
    try {
      firebase.initializeApp(config);
      auth = firebase.auth();
      db = firebase.database();
      return true;
    } catch(e) {
      console.error('Firebase init failed:', e);
      return false;
    }
  }

  async function loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;
      await createUserProfile(currentUser);
      return currentUser;
    } catch(e) {
      console.error('Google login error:', e);
      throw e;
    }
  }

  function loginAsGuest() {
    isGuest = true;
    currentUser = {
      uid: 'guest_' + Date.now(),
      displayName: 'Guest',
      email: null,
      photoURL: null,
      isGuest: true
    };
    return currentUser;
  }

  async function createUserProfile(user) {
    if (!db || !user) return;
    try {
      const ref = db.ref(`users/${user.uid}/profile`);
      const snap = await ref.once('value');
      if (!snap.exists()) {
        await ref.set({
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          joinedAt: Date.now(),
          plan: 'free'
        });
      }
    } catch(e) {}
  }

  async function logout() {
    try {
      if (!isGuest) await auth.signOut();
    } catch(e) {}
    currentUser = null;
    isGuest = false;
  }

  function getUser() { return currentUser; }
  function isGuestMode() { return isGuest; }
  function getDb() { return db; }
  function isReady() { return !!db; }

  // User data helpers
  async function saveUserData(path, data) {
    if (!db || !currentUser || isGuest) return;
    try {
      await db.ref(`users/${currentUser.uid}/${path}`).set(data);
    } catch(e) {}
  }

  async function pushUserData(path, data) {
    if (!db || !currentUser || isGuest) return null;
    try {
      const ref = db.ref(`users/${currentUser.uid}/${path}`);
      return await ref.push(data);
    } catch(e) { return null; }
  }

  async function getUserData(path) {
    if (!db || !currentUser || isGuest) return null;
    try {
      const snap = await db.ref(`users/${currentUser.uid}/${path}`).once('value');
      return snap.val();
    } catch(e) { return null; }
  }

  // Real-time analytics counters
  async function incrementCounter(key) {
    if (!db) return;
    try {
      const ref = db.ref(`analytics/${key}`);
      await ref.transaction(val => (val || 0) + 1);
    } catch(e) {}
  }

  return { init, loginWithGoogle, loginAsGuest, logout, getUser, isGuestMode, getDb, isReady, saveUserData, pushUserData, getUserData, incrementCounter };
})();

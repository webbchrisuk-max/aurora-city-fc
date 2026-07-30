/* Aurora City FC Cloud Sync • Firebase/Firestore • 30 Jul 2026 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCWniUugILvvyTqXCnpQQQ352V0ECKPKo0",
  authDomain: "aurora-city-fc.firebaseapp.com",
  projectId: "aurora-city-fc",
  storageBucket: "aurora-city-fc.firebasestorage.app",
  messagingSenderId: "254659241407",
  appId: "1:254659241407:web:f6c0e7daf5d1d65b7d6d0a"
};

const VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const DEVICE_ID_KEY = "aurora_cloud_device_id_v1";
const DEVICE_NAME_KEY = "aurora_cloud_device_name_v1";
const META_KEY = "aurora_cloud_meta_v1";
const LOCAL_BACKUP_KEY = "aurora_cloud_restore_backup_v1";
const RELOAD_GUARD_KEY = "aurora_cloud_reload_guard_v1";
const SYNC_PAGE = "auroracloudsync.html";

const EXCLUDED_KEY_PATTERNS = [
  /^aurora_cloud_/i,
  /^aurora_browser_/i,
  /^aurora_motion_/i,
  /(?:^|_)last_refresh(?:_|$)/i,
  /^aurora_manager_refresh_ack/i,
  /^aurora_beast_dashboard_(?:settings|order)/i,
  /^aurora_beast_alerts_read/i,
  /^aurora_registration_connection_v1$/i,
  /(?:^|_)sidebar(?:_|$)/i,
  /(?:^|_)(?:active_tab|active_view|last_page)(?:_|$)/i,
  /(?:^|_)test(?:_|$)/i,
  /backup/i,
  /cache/i
];

const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;
const nativeClear = Storage.prototype.clear;

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let cloudInitialised = false;
let syncEnabled = false;
let applyingRemote = false;
let unsubscribeRemote = null;
let firstAuthResolved = false;
let pendingRefresh = false;
let lastSyncAt = null;
let lastError = null;
let pendingTimers = new Map();

const stateListeners = new Set();
let resolveReady;
const ready = new Promise(resolve => { resolveReady = resolve; });

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() || `aurora-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    nativeSetItem.call(localStorage, DEVICE_ID_KEY, id);
  }
  return id;
}

function defaultDeviceName() {
  const ua = navigator.userAgent || "";
  const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIPad) return "Chris’s iPad";
  if (/iPhone/i.test(ua)) return "Chris’s iPhone";
  if (/Android/i.test(ua)) return "Chris’s phone";
  return "Aurora device";
}

function getDeviceName() {
  return localStorage.getItem(DEVICE_NAME_KEY) || defaultDeviceName();
}

function setDeviceName(name) {
  const clean = String(name || "").trim().slice(0, 60) || defaultDeviceName();
  nativeSetItem.call(localStorage, DEVICE_NAME_KEY, clean);
  emitState();
  return clean;
}

function getMeta() {
  const parsed = safeParse(localStorage.getItem(META_KEY) || "{}", {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveMeta(meta) {
  nativeSetItem.call(localStorage, META_KEY, JSON.stringify(meta));
}

function setMetaTime(key, time) {
  const meta = getMeta();
  meta[key] = Number(time) || Date.now();
  saveMeta(meta);
}

function isSyncKey(key) {
  const value = String(key || "");
  if (!/^aurora/i.test(value)) return false;
  return !EXCLUDED_KEY_PATTERNS.some(pattern => pattern.test(value));
}

function localEntries() {
  const entries = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && isSyncKey(key)) entries.push([key, localStorage.getItem(key)]);
  }
  return entries.sort((a, b) => a[0].localeCompare(b[0]));
}

function encodeKey(key) {
  return encodeURIComponent(key).replaceAll("%", "~");
}

function configRef(uid = currentUser?.uid) {
  return doc(db, "users", uid, "cloud", "config");
}

function storageRef(key, uid = currentUser?.uid) {
  return doc(db, "users", uid, "storage", encodeKey(key));
}

function storageCollection(uid = currentUser?.uid) {
  return collection(db, "users", uid, "storage");
}

function stateSnapshot(extra = {}) {
  return {
    version: VERSION,
    user: currentUser ? { uid: currentUser.uid, email: currentUser.email || "" } : null,
    signedIn: Boolean(currentUser),
    cloudInitialised,
    syncEnabled,
    online: navigator.onLine,
    localKeyCount: localEntries().length,
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    lastSyncAt,
    lastError,
    pendingRefresh,
    ...extra
  };
}

function emitState(extra = {}) {
  const snapshot = stateSnapshot(extra);
  stateListeners.forEach(listener => {
    try { listener(snapshot); } catch (_) {}
  });
  window.dispatchEvent(new CustomEvent("aurora-cloud-status", { detail: snapshot }));
  updatePill(snapshot);
}

function humanError(error) {
  const code = String(error?.code || "");
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "The email or password was not recognised.";
  }
  if (code.includes("too-many-requests")) return "Too many sign-in attempts. Wait a little and try again.";
  if (code.includes("network-request-failed") || !navigator.onLine) return "No internet connection. Aurora is still saved on this device.";
  if (code.includes("permission-denied")) return "Firebase blocked the request. Check that you are signed into the correct Aurora account.";
  return error?.message || "Aurora cloud sync could not complete that action.";
}

function serverMillis(data) {
  const stamp = data?.updatedAt;
  if (stamp && typeof stamp.toMillis === "function") return stamp.toMillis();
  return Number(data?.clientUpdatedAt) || 0;
}

async function pushKeyNow(key, valueOverride, deletedOverride = false) {
  if (!syncEnabled || !currentUser || !isSyncKey(key)) return;
  const deleted = deletedOverride || valueOverride === null;
  const value = deleted ? null : (valueOverride ?? localStorage.getItem(key));
  const clientUpdatedAt = Date.now();
  setMetaTime(key, clientUpdatedAt);
  await setDoc(storageRef(key), {
    key,
    value,
    deleted,
    clientUpdatedAt,
    updatedAt: serverTimestamp(),
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    schemaVersion: SCHEMA_VERSION
  }, { merge: true });
  lastSyncAt = new Date().toISOString();
  lastError = null;
  emitState();
}

function schedulePush(key, value, deleted = false) {
  if (!syncEnabled || !currentUser || !isSyncKey(key) || applyingRemote) return;
  const previous = pendingTimers.get(key);
  if (previous) clearTimeout(previous);
  const timer = setTimeout(async () => {
    pendingTimers.delete(key);
    try {
      await pushKeyNow(key, value, deleted);
    } catch (error) {
      lastError = humanError(error);
      emitState();
    }
  }, 450);
  pendingTimers.set(key, timer);
}

Storage.prototype.setItem = function auroraCloudSetItem(key, value) {
  nativeSetItem.call(this, key, value);
  if (this === localStorage && isSyncKey(key)) schedulePush(String(key), String(value), false);
};

Storage.prototype.removeItem = function auroraCloudRemoveItem(key) {
  nativeRemoveItem.call(this, key);
  if (this === localStorage && isSyncKey(key)) schedulePush(String(key), null, true);
};

Storage.prototype.clear = function auroraCloudClear() {
  if (this !== localStorage) return nativeClear.call(this);
  const keys = localEntries().map(([key]) => key);
  nativeClear.call(this);
  getDeviceId();
  keys.forEach(key => schedulePush(key, null, true));
};

function applyRemoteRecord(data, allowReload = true) {
  const key = data?.key;
  if (!key || !isSyncKey(key)) return false;
  const remoteTime = serverMillis(data);
  const localTime = Number(getMeta()[key]) || 0;
  if (remoteTime && localTime > remoteTime) return false;

  const current = localStorage.getItem(key);
  applyingRemote = true;
  try {
    if (data.deleted) {
      if (current !== null) nativeRemoveItem.call(localStorage, key);
    } else if (current !== String(data.value ?? "")) {
      nativeSetItem.call(localStorage, key, String(data.value ?? ""));
    }
    setMetaTime(key, remoteTime || Date.now());
  } finally {
    applyingRemote = false;
  }

  const changed = data.deleted ? current !== null : current !== String(data.value ?? "");
  if (changed && allowReload) pendingRefresh = true;
  return changed;
}

async function readConfig() {
  if (!currentUser) return null;
  const snapshot = await getDoc(configRef());
  return snapshot.exists() ? snapshot.data() : null;
}

async function reconcileFromCloud({ allowReload = true } = {}) {
  if (!currentUser) return { changed: 0, cloudCount: 0 };
  const config = await readConfig();
  cloudInitialised = Boolean(config?.initialised);
  if (!cloudInitialised) {
    syncEnabled = false;
    emitState();
    return { changed: 0, cloudCount: 0 };
  }

  const cloudSnapshot = await getDocs(storageCollection());
  const cloudKeys = new Set();
  const meta = getMeta();
  let changed = 0;
  const localPushes = [];

  cloudSnapshot.forEach(record => {
    const data = record.data();
    if (!data?.key || !isSyncKey(data.key)) return;
    cloudKeys.add(data.key);
    const remoteTime = serverMillis(data);
    const localTime = Number(meta[data.key]) || 0;
    if (localTime > remoteTime && localStorage.getItem(data.key) !== null) {
      localPushes.push(pushKeyNow(data.key, localStorage.getItem(data.key), false));
    } else if (applyRemoteRecord(data, allowReload)) {
      changed += 1;
    }
  });

  for (const [key, value] of localEntries()) {
    if (!cloudKeys.has(key) && Number(meta[key]) > 0) {
      localPushes.push(pushKeyNow(key, value, false));
    }
  }

  if (localPushes.length) await Promise.allSettled(localPushes);
  syncEnabled = true;
  lastSyncAt = new Date().toISOString();
  lastError = null;
  emitState({ changed, cloudCount: cloudSnapshot.size });
  return { changed, cloudCount: cloudSnapshot.size };
}

function startRemoteListener() {
  if (!currentUser || !cloudInitialised) return;
  if (unsubscribeRemote) unsubscribeRemote();
  unsubscribeRemote = onSnapshot(storageCollection(), { includeMetadataChanges: true }, snapshot => {
    let changed = 0;
    snapshot.docChanges().forEach(change => {
      if (change.doc.metadata.hasPendingWrites) return;
      if (applyRemoteRecord(change.doc.data(), true)) changed += 1;
    });
    if (changed) {
      lastSyncAt = new Date().toISOString();
      emitState({ changed });
    }
  }, error => {
    lastError = humanError(error);
    emitState();
  });
}

async function signIn(email, password) {
  lastError = null;
  emitState({ working: true });
  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
    return credential.user;
  } catch (error) {
    lastError = humanError(error);
    emitState();
    throw new Error(lastError);
  }
}

async function signOut() {
  if (unsubscribeRemote) unsubscribeRemote();
  unsubscribeRemote = null;
  syncEnabled = false;
  cloudInitialised = false;
  await firebaseSignOut(auth);
}

function backupLocalState(reason = "manual") {
  const payload = {
    createdAt: new Date().toISOString(),
    reason,
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    entries: Object.fromEntries(localEntries())
  };
  nativeSetItem.call(localStorage, LOCAL_BACKUP_KEY, JSON.stringify(payload));
  return payload;
}

function restoreLocalBackup() {
  const payload = safeParse(localStorage.getItem(LOCAL_BACKUP_KEY) || "null", null);
  if (!payload?.entries || typeof payload.entries !== "object") throw new Error("No Aurora restore backup is available on this device.");
  applyingRemote = true;
  try {
    for (const [key, value] of Object.entries(payload.entries)) {
      if (isSyncKey(key)) nativeSetItem.call(localStorage, key, String(value));
    }
  } finally {
    applyingRemote = false;
  }
  return payload;
}

async function commitInChunks(operations) {
  for (let start = 0; start < operations.length; start += 400) {
    const batch = writeBatch(db);
    operations.slice(start, start + 400).forEach(operation => operation(batch));
    await batch.commit();
  }
}

async function uploadMaster() {
  if (!currentUser) throw new Error("Sign in to Aurora Cloud first.");
  const entries = localEntries();
  if (!entries.length) throw new Error("No Aurora data was found on this device.");

  backupLocalState("before-master-upload");
  syncEnabled = false;
  emitState({ working: true, action: "upload-master" });

  const existing = await getDocs(storageCollection());
  const localKeySet = new Set(entries.map(([key]) => key));
  const now = Date.now();
  const operations = [];

  existing.forEach(record => {
    const key = record.data()?.key;
    if (key && !localKeySet.has(key)) operations.push(batch => batch.delete(record.ref));
  });

  entries.forEach(([key, value]) => {
    operations.push(batch => batch.set(storageRef(key), {
      key,
      value,
      deleted: false,
      clientUpdatedAt: now,
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      schemaVersion: SCHEMA_VERSION
    }, { merge: true }));
  });

  await commitInChunks(operations);
  await setDoc(configRef(), {
    initialised: true,
    schemaVersion: SCHEMA_VERSION,
    masterDeviceId: getDeviceId(),
    masterDeviceName: getDeviceName(),
    keyCount: entries.length,
    initialisedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  const meta = getMeta();
  entries.forEach(([key]) => { meta[key] = now; });
  saveMeta(meta);
  cloudInitialised = true;
  syncEnabled = true;
  lastSyncAt = new Date().toISOString();
  lastError = null;
  startRemoteListener();
  emitState({ uploaded: entries.length });
  return { uploaded: entries.length };
}

async function downloadCloud({ reload = false } = {}) {
  if (!currentUser) throw new Error("Sign in to Aurora Cloud first.");
  const config = await readConfig();
  if (!config?.initialised) throw new Error("Aurora Cloud is empty. Upload the iPad master copy first.");

  backupLocalState("before-cloud-download");
  emitState({ working: true, action: "download-cloud" });
  const result = await reconcileFromCloud({ allowReload: false });
  pendingRefresh = false;
  emitState({ downloaded: result.cloudCount });
  if (reload) location.reload();
  return { downloaded: result.cloudCount, changed: result.changed };
}

async function syncNow() {
  if (!currentUser) throw new Error("Sign in to Aurora Cloud first.");
  const config = await readConfig();
  if (!config?.initialised) throw new Error("Aurora Cloud is empty. Upload this iPad as the master copy first.");

  syncEnabled = true;
  const result = await reconcileFromCloud({ allowReload: false });
  startRemoteListener();
  lastSyncAt = new Date().toISOString();
  emitState({ synced: true });
  return { checked: localEntries().length, ...result };
}

function subscribe(listener) {
  stateListeners.add(listener);
  listener(stateSnapshot());
  return () => stateListeners.delete(listener);
}

function injectPill() {
  if (document.getElementById("auroraCloudPill")) return;
  const style = document.createElement("style");
  style.id = "auroraCloudPillStyles";
  style.textContent = `
    #auroraCloudPill{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:min(270px,calc(100vw - 28px));padding:10px 13px;border:1px solid rgba(125,211,252,.28);border-radius:999px;background:rgba(2,6,18,.92);box-shadow:0 14px 45px rgba(0,0,0,.42);backdrop-filter:blur(16px);color:#dbeafe;font:800 12px/1.1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
    #auroraCloudPill:hover{border-color:rgba(34,211,238,.58);transform:translateY(-1px)}
    #auroraCloudPill .aurora-cloud-dot{width:9px;height:9px;border-radius:50%;background:#94a3b8;box-shadow:0 0 0 5px rgba(148,163,184,.10);flex:0 0 auto}
    #auroraCloudPill[data-state="synced"] .aurora-cloud-dot{background:#34d399;box-shadow:0 0 0 5px rgba(52,211,153,.12)}
    #auroraCloudPill[data-state="working"] .aurora-cloud-dot{background:#22d3ee;animation:auroraCloudPulse 1.1s infinite}
    #auroraCloudPill[data-state="attention"] .aurora-cloud-dot{background:#fbbf24;box-shadow:0 0 0 5px rgba(251,191,36,.12)}
    #auroraCloudPill[data-state="error"] .aurora-cloud-dot{background:#fb7185;box-shadow:0 0 0 5px rgba(251,113,133,.12)}
    @keyframes auroraCloudPulse{50%{transform:scale(1.35);opacity:.7}}
    @media(max-width:700px){#auroraCloudPill{padding:9px 11px;font-size:11px}}
  `;
  document.head.appendChild(style);

  const pill = document.createElement("button");
  pill.id = "auroraCloudPill";
  pill.type = "button";
  pill.innerHTML = '<span class="aurora-cloud-dot" aria-hidden="true"></span><span class="aurora-cloud-copy">Cloud loading…</span>';
  pill.addEventListener("click", () => {
    if (pendingRefresh && location.pathname.split("/").pop()?.toLowerCase() !== SYNC_PAGE) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      location.reload();
      return;
    }
    if (location.pathname.split("/").pop()?.toLowerCase() === SYNC_PAGE) {
      document.getElementById("cloudControlCentre")?.scrollIntoView({ behavior: "smooth" });
    } else {
      location.href = "AuroraCloudSync.html";
    }
  });
  document.body.appendChild(pill);
}

function updatePill(snapshot = stateSnapshot()) {
  const pill = document.getElementById("auroraCloudPill");
  if (!pill) return;
  const copy = pill.querySelector(".aurora-cloud-copy");
  let label = "Cloud sign in";
  let state = "attention";

  if (snapshot.lastError) {
    label = "Cloud needs attention";
    state = "error";
  } else if (!snapshot.online) {
    label = "Saved offline";
    state = "attention";
  } else if (!snapshot.signedIn) {
    label = "Cloud sign in";
    state = "attention";
  } else if (!snapshot.cloudInitialised) {
    label = "Upload iPad master";
    state = "attention";
  } else if (snapshot.pendingRefresh) {
    label = "Cloud update — tap to refresh";
    state = "attention";
  } else if (snapshot.syncEnabled) {
    label = "Cloud synced";
    state = "synced";
  } else {
    label = "Cloud connecting…";
    state = "working";
  }

  pill.dataset.state = state;
  copy.textContent = label;
  pill.title = snapshot.lastError || label;
}

async function initialiseForUser(user) {
  currentUser = user;
  if (!user) {
    cloudInitialised = false;
    syncEnabled = false;
    if (unsubscribeRemote) unsubscribeRemote();
    unsubscribeRemote = null;
    emitState();
    return;
  }

  try {
    const result = await reconcileFromCloud({ allowReload: true });
    if (cloudInitialised) startRemoteListener();
    if (result.changed > 0 && location.pathname.split("/").pop()?.toLowerCase() !== SYNC_PAGE) {
      const guard = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - guard > 8000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        location.reload();
        return;
      }
    }
  } catch (error) {
    lastError = humanError(error);
    emitState();
  }
}

window.addEventListener("online", () => {
  emitState();
  if (currentUser && cloudInitialised) syncNow().catch(error => {
    lastError = humanError(error);
    emitState();
  });
});
window.addEventListener("offline", () => emitState());
window.addEventListener("storage", event => {
  if (event.storageArea === localStorage && event.key && isSyncKey(event.key)) {
    schedulePush(event.key, event.newValue, event.newValue === null);
  }
});

const api = {
  version: VERSION,
  ready,
  auth,
  signIn,
  signOut,
  uploadMaster,
  downloadCloud,
  syncNow,
  backupLocalState,
  restoreLocalBackup,
  localEntries,
  isSyncKey,
  getState: stateSnapshot,
  subscribe,
  getDeviceName,
  setDeviceName
};
window.AuroraCloudSync = api;

function bootUi() {
  injectPill();
  emitState();
  window.dispatchEvent(new CustomEvent("aurora-cloud-ready", { detail: api }));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootUi, { once: true });
else bootUi();

setPersistence(auth, browserLocalPersistence).catch(() => {});
onAuthStateChanged(auth, async user => {
  await initialiseForUser(user);
  if (!firstAuthResolved) {
    firstAuthResolved = true;
    resolveReady(stateSnapshot());
  }
});

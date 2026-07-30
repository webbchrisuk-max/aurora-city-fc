/* Aurora City FC Cloud Sync • Direct Firebase REST transport • 30 Jul 2026 */
(function(){
  "use strict";

  if(window.__AURORA_CLOUD_REST_ENGINE__) return;
  window.__AURORA_CLOUD_REST_ENGINE__ = true;
  window.__AURORA_CLOUD_ENGINE_LOADING__ = true;

  const API_KEY = "AIzaSyCWniUugILvyvTqXCnpQQQ352V0ECKPKo0";
  const PROJECT_ID = "aurora-city-fc";
  const VERSION = "2.0.0-rest";
  const SCHEMA_VERSION = 1;
  const SESSION_KEY = "aurora_cloud_rest_session_v1";
  const DEVICE_ID_KEY = "aurora_cloud_device_id_v1";
  const DEVICE_NAME_KEY = "aurora_cloud_device_name_v1";
  const META_KEY = "aurora_cloud_meta_v1";
  const LOCAL_BACKUP_KEY = "aurora_cloud_restore_backup_v1";
  const RELOAD_GUARD_KEY = "aurora_cloud_reload_guard_v1";
  const SYNC_PAGE = "auroracloudsync.html";
  const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const COMMIT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

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

  let currentUser = null;
  let cloudInitialised = false;
  let syncEnabled = false;
  let applyingRemote = false;
  let firstAuthResolved = false;
  let pendingRefresh = false;
  let lastSyncAt = null;
  let lastError = null;
  let working = false;
  let action = "";
  let pendingTimers = new Map();
  let pollTimer = null;

  const stateListeners = new Set();
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function safeParse(value, fallback){
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function humanError(error){
    const raw = String(error?.message || error || "Cloud request failed.");
    const code = String(error?.code || "");
    const combined = `${code} ${raw}`.toUpperCase();
    if(combined.includes("INVALID_PASSWORD") || combined.includes("INVALID_LOGIN_CREDENTIALS")) return "The Aurora email or password is incorrect.";
    if(combined.includes("EMAIL_NOT_FOUND")) return "No Aurora Firebase account was found for that email.";
    if(combined.includes("USER_DISABLED")) return "This Aurora Firebase account has been disabled.";
    if(combined.includes("TOO_MANY_ATTEMPTS")) return "Firebase has temporarily limited sign-in attempts. Wait a few minutes and try again.";
    if(combined.includes("PERMISSION_DENIED") || combined.includes("403")) return "Firestore blocked this request. Check that you are signed in to the correct Aurora account.";
    if(combined.includes("FAILED_TO_FETCH") || combined.includes("NETWORK") || combined.includes("OFFLINE")) return "The cloud could not be reached. Check the internet connection and try again.";
    return raw.replace(/^Firebase:\s*/i, "");
  }

  function getDeviceId(){
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if(!id){
      id = globalThis.crypto?.randomUUID?.() || `aurora-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      nativeSetItem.call(localStorage, DEVICE_ID_KEY, id);
    }
    return id;
  }

  function defaultDeviceName(){
    const ua = navigator.userAgent || "";
    const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if(isIPad) return "Chris’s iPad";
    if(/iPhone/i.test(ua)) return "Chris’s iPhone";
    if(/Android/i.test(ua)) return "Chris’s phone";
    return "Aurora device";
  }

  function getDeviceName(){
    return localStorage.getItem(DEVICE_NAME_KEY) || defaultDeviceName();
  }

  function setDeviceName(name){
    const clean = String(name || "").trim().slice(0, 60) || defaultDeviceName();
    nativeSetItem.call(localStorage, DEVICE_NAME_KEY, clean);
    emitState();
    return clean;
  }

  function getMeta(){
    const parsed = safeParse(localStorage.getItem(META_KEY) || "{}", {});
    return parsed && typeof parsed === "object" ? parsed : {};
  }

  function saveMeta(meta){
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify(meta));
  }

  function setMetaTime(key, time){
    const meta = getMeta();
    meta[key] = Number(time) || Date.now();
    saveMeta(meta);
  }

  function isSyncKey(key){
    const value = String(key || "");
    if(!/^aurora/i.test(value)) return false;
    return !EXCLUDED_KEY_PATTERNS.some(pattern => pattern.test(value));
  }

  function localEntries(){
    const entries = [];
    for(let index = 0; index < localStorage.length; index += 1){
      const key = localStorage.key(index);
      if(key && isSyncKey(key)) entries.push([key, localStorage.getItem(key)]);
    }
    return entries.sort((a,b) => a[0].localeCompare(b[0]));
  }

  function encodeKey(key){
    return encodeURIComponent(key).replace(/%/g, "~");
  }

  function stateSnapshot(extra = {}){
    return {
      version: VERSION,
      transport: "rest",
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
      working,
      action,
      ...extra
    };
  }

  function emitState(extra = {}){
    const snapshot = stateSnapshot(extra);
    stateListeners.forEach(listener => {
      try { listener(snapshot); } catch (_) {}
    });
    updatePill(snapshot);
    return snapshot;
  }

  function loadSession(){
    const session = safeParse(localStorage.getItem(SESSION_KEY) || "null", null);
    return session && session.refreshToken && session.uid ? session : null;
  }

  function saveSession(session){
    nativeSetItem.call(localStorage, SESSION_KEY, JSON.stringify(session));
  }

  function clearSession(){
    nativeRemoveItem.call(localStorage, SESSION_KEY);
  }

  async function readJsonResponse(response){
    const text = await response.text();
    const data = text ? safeParse(text, { raw: text }) : {};
    if(!response.ok){
      const message = data?.error?.message || data?.error?.status || data?.raw || `Request failed (${response.status}).`;
      const error = new Error(message);
      error.code = data?.error?.status || String(response.status);
      throw error;
    }
    return data;
  }

  async function signInRequest(email, password){
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim(), password: String(password || ""), returnSecureToken: true })
    });
    return readJsonResponse(response);
  }

  async function refreshRequest(refreshToken){
    const response = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString()
    });
    return readJsonResponse(response);
  }

  async function ensureToken(force = false){
    let session = loadSession();
    if(!session) throw new Error("Sign in to Aurora Cloud first.");
    if(!force && session.idToken && Number(session.expiresAt) - Date.now() > 90000) return session.idToken;
    const refreshed = await refreshRequest(session.refreshToken);
    session = {
      ...session,
      idToken: refreshed.id_token,
      refreshToken: refreshed.refresh_token || session.refreshToken,
      uid: refreshed.user_id || session.uid,
      expiresAt: Date.now() + (Number(refreshed.expires_in || 3600) * 1000)
    };
    saveSession(session);
    currentUser = { uid: session.uid, email: session.email || "" };
    return session.idToken;
  }

  async function authFetch(url, options = {}, retry = true){
    const token = await ensureToken(false);
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });
    if(response.status === 401 && retry){
      await ensureToken(true);
      return authFetch(url, options, false);
    }
    return response;
  }

  function firestoreValue(value){
    if(value === null || value === undefined) return null;
    if(Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
    if(Object.prototype.hasOwnProperty.call(value, "booleanValue")) return value.booleanValue;
    if(Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
    if(Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
    if(Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
    return null;
  }

  function parseDocument(document){
    const fields = document?.fields || {};
    const parsed = { _name: document?.name || "", _createTime: document?.createTime || "", _updateTime: document?.updateTime || "" };
    Object.entries(fields).forEach(([key,value]) => { parsed[key] = firestoreValue(value); });
    return parsed;
  }

  function recordFields(key, value, deleted, time = Date.now()){
    return {
      key: { stringValue: String(key) },
      value: { stringValue: String(value ?? "") },
      deleted: { booleanValue: Boolean(deleted) },
      clientUpdatedAt: { integerValue: String(Math.round(time)) },
      updatedAt: { timestampValue: new Date(time).toISOString() },
      deviceId: { stringValue: getDeviceId() },
      deviceName: { stringValue: getDeviceName() },
      schemaVersion: { integerValue: String(SCHEMA_VERSION) }
    };
  }

  function configFields(keyCount, time = Date.now(), initial = false){
    const fields = {
      initialised: { booleanValue: true },
      schemaVersion: { integerValue: String(SCHEMA_VERSION) },
      masterDeviceId: { stringValue: getDeviceId() },
      masterDeviceName: { stringValue: getDeviceName() },
      keyCount: { integerValue: String(keyCount) },
      updatedAt: { timestampValue: new Date(time).toISOString() }
    };
    if(initial) fields.initialisedAt = { timestampValue: new Date(time).toISOString() };
    return fields;
  }

  function documentName(path){
    return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  }

  async function getDocument(path){
    const response = await authFetch(`${FIRESTORE_BASE}/${path}`);
    if(response.status === 404) return null;
    return parseDocument(await readJsonResponse(response));
  }

  async function listDocuments(collectionPath){
    const documents = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({ pageSize: "500" });
      if(pageToken) params.set("pageToken", pageToken);
      const response = await authFetch(`${FIRESTORE_BASE}/${collectionPath}?${params.toString()}`);
      const data = await readJsonResponse(response);
      (data.documents || []).forEach(document => documents.push(parseDocument(document)));
      pageToken = data.nextPageToken || "";
    } while(pageToken);
    return documents;
  }

  async function patchDocument(path, fields){
    const response = await authFetch(`${FIRESTORE_BASE}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return parseDocument(await readJsonResponse(response));
  }

  async function commitWrites(writes){
    for(let start = 0; start < writes.length; start += 400){
      const response = await authFetch(COMMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes: writes.slice(start, start + 400) })
      });
      await readJsonResponse(response);
    }
  }

  function configPath(uid = currentUser?.uid){
    return `users/${uid}/cloud/config`;
  }

  function storagePath(key, uid = currentUser?.uid){
    return `users/${uid}/storage/${encodeKey(key)}`;
  }

  function storageCollectionPath(uid = currentUser?.uid){
    return `users/${uid}/storage`;
  }

  function remoteMillis(data){
    const clientTime = Number(data?.clientUpdatedAt) || 0;
    const timestamp = Date.parse(data?.updatedAt || data?._updateTime || "") || 0;
    return Math.max(clientTime, timestamp);
  }

  async function pushKeyNow(key, value, deleted = false){
    if(!currentUser || !cloudInitialised || !isSyncKey(key)) return false;
    const now = Date.now();
    await patchDocument(storagePath(key), recordFields(key, value, deleted, now));
    setMetaTime(key, now);
    lastSyncAt = new Date().toISOString();
    lastError = null;
    emitState({ pushedKey: key });
    return true;
  }

  function schedulePush(key, value, deleted = false){
    if(applyingRemote || !currentUser || !cloudInitialised || !syncEnabled || !isSyncKey(key)) return;
    const existing = pendingTimers.get(key);
    if(existing) clearTimeout(existing);
    pendingTimers.set(key, setTimeout(async () => {
      pendingTimers.delete(key);
      try { await pushKeyNow(key, value, deleted); }
      catch(error){ lastError = humanError(error); emitState(); }
    }, 850));
  }

  Storage.prototype.setItem = function auroraCloudSetItem(key, value){
    const result = nativeSetItem.call(this, key, value);
    if(this === localStorage) schedulePush(String(key), String(value), false);
    return result;
  };

  Storage.prototype.removeItem = function auroraCloudRemoveItem(key){
    const existing = this === localStorage ? localStorage.getItem(key) : null;
    const result = nativeRemoveItem.call(this, key);
    if(this === localStorage && existing !== null) schedulePush(String(key), "", true);
    return result;
  };

  Storage.prototype.clear = function auroraCloudClear(){
    if(this !== localStorage) return nativeClear.call(this);
    const keys = localEntries().map(([key]) => key);
    nativeClear.call(this);
    getDeviceId();
    keys.forEach(key => schedulePush(key, "", true));
  };

  function applyRemoteRecord(data, allowReload = true){
    const key = data?.key;
    if(!key || !isSyncKey(key)) return false;
    const remoteTime = remoteMillis(data);
    const localTime = Number(getMeta()[key]) || 0;
    if(remoteTime && localTime > remoteTime) return false;

    const current = localStorage.getItem(key);
    applyingRemote = true;
    try {
      if(data.deleted){
        if(current !== null) nativeRemoveItem.call(localStorage, key);
      } else if(current !== String(data.value ?? "")){
        nativeSetItem.call(localStorage, key, String(data.value ?? ""));
      }
      setMetaTime(key, remoteTime || Date.now());
    } finally {
      applyingRemote = false;
    }

    const changed = data.deleted ? current !== null : current !== String(data.value ?? "");
    if(changed && allowReload) pendingRefresh = true;
    return changed;
  }

  async function readConfig(){
    if(!currentUser) return null;
    return getDocument(configPath());
  }

  async function reconcileFromCloud({ allowReload = true } = {}){
    if(!currentUser) return { changed: 0, cloudCount: 0 };
    const config = await readConfig();
    cloudInitialised = Boolean(config?.initialised);
    if(!cloudInitialised){
      syncEnabled = false;
      emitState();
      return { changed: 0, cloudCount: 0 };
    }

    const cloudRecords = await listDocuments(storageCollectionPath());
    const cloudKeys = new Set();
    const meta = getMeta();
    let changed = 0;
    const pushes = [];

    cloudRecords.forEach(data => {
      if(!data?.key || !isSyncKey(data.key)) return;
      cloudKeys.add(data.key);
      const remoteTime = remoteMillis(data);
      const localTime = Number(meta[data.key]) || 0;
      const localValue = localStorage.getItem(data.key);
      if(localTime > remoteTime && localValue !== null){
        pushes.push(pushKeyNow(data.key, localValue, false));
      } else if(applyRemoteRecord(data, allowReload)){
        changed += 1;
      }
    });

    for(const [key,value] of localEntries()){
      if(!cloudKeys.has(key) && Number(meta[key]) > 0){
        pushes.push(pushKeyNow(key, value, false));
      }
    }

    if(pushes.length) await Promise.allSettled(pushes);
    syncEnabled = true;
    lastSyncAt = new Date().toISOString();
    lastError = null;
    emitState({ changed, cloudCount: cloudRecords.length });
    return { changed, cloudCount: cloudRecords.length };
  }

  function backupLocalState(reason = "manual"){
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

  function restoreLocalBackup(){
    const payload = safeParse(localStorage.getItem(LOCAL_BACKUP_KEY) || "null", null);
    if(!payload?.entries || typeof payload.entries !== "object") throw new Error("No Aurora restore backup is available on this device.");
    applyingRemote = true;
    try {
      for(const [key,value] of Object.entries(payload.entries)){
        if(isSyncKey(key)) nativeSetItem.call(localStorage, key, String(value));
      }
    } finally {
      applyingRemote = false;
    }
    return payload;
  }

  async function signIn(email, password){
    lastError = null;
    working = true;
    action = "sign-in";
    emitState();
    try {
      const result = await signInRequest(email, password);
      const session = {
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresAt: Date.now() + (Number(result.expiresIn || 3600) * 1000),
        uid: result.localId,
        email: result.email || String(email || "").trim()
      };
      saveSession(session);
      currentUser = { uid: session.uid, email: session.email };
      await reconcileFromCloud({ allowReload: false });
      startPolling();
      return currentUser;
    } catch(error){
      lastError = humanError(error);
      emitState();
      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function signOut(){
    stopPolling();
    clearSession();
    currentUser = null;
    cloudInitialised = false;
    syncEnabled = false;
    lastSyncAt = null;
    lastError = null;
    emitState();
  }

  async function uploadMaster(){
    if(!currentUser) throw new Error("Sign in to Aurora Cloud first.");
    const entries = localEntries();
    if(!entries.length) throw new Error("No Aurora data was found on this device.");

    backupLocalState("before-master-upload");
    working = true;
    action = "upload-master";
    syncEnabled = false;
    emitState();

    try {
      const existing = await listDocuments(storageCollectionPath());
      const localKeySet = new Set(entries.map(([key]) => key));
      const now = Date.now();
      const writes = [];

      existing.forEach(record => {
        const key = record?.key;
        if(key && !localKeySet.has(key)) writes.push({ delete: documentName(storagePath(key)) });
      });

      entries.forEach(([key,value]) => {
        writes.push({ update: { name: documentName(storagePath(key)), fields: recordFields(key, value, false, now) } });
      });
      writes.push({ update: { name: documentName(configPath()), fields: configFields(entries.length, now, !cloudInitialised) } });

      await commitWrites(writes);
      const meta = getMeta();
      entries.forEach(([key]) => { meta[key] = now; });
      saveMeta(meta);
      cloudInitialised = true;
      syncEnabled = true;
      lastSyncAt = new Date().toISOString();
      lastError = null;
      startPolling();
      emitState({ uploaded: entries.length });
      return { uploaded: entries.length };
    } catch(error){
      lastError = humanError(error);
      emitState();
      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function downloadCloud({ reload = false } = {}){
    if(!currentUser) throw new Error("Sign in to Aurora Cloud first.");
    const config = await readConfig();
    if(!config?.initialised) throw new Error("Aurora Cloud is empty. Upload the iPad master copy first.");

    backupLocalState("before-cloud-download");
    working = true;
    action = "download-cloud";
    emitState();
    try {
      const result = await reconcileFromCloud({ allowReload: false });
      pendingRefresh = false;
      emitState({ downloaded: result.cloudCount });
      if(reload) location.reload();
      return { downloaded: result.cloudCount, changed: result.changed };
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function syncNow(){
    if(!currentUser) throw new Error("Sign in to Aurora Cloud first.");
    working = true;
    action = "sync";
    emitState();
    try {
      const config = await readConfig();
      if(!config?.initialised) throw new Error("Aurora Cloud is empty. Upload this iPad as the master copy first.");
      syncEnabled = true;
      const result = await reconcileFromCloud({ allowReload: false });
      lastSyncAt = new Date().toISOString();
      emitState({ synced: true });
      return { checked: localEntries().length, ...result };
    } catch(error){
      lastError = humanError(error);
      emitState();
      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  function subscribe(listener){
    stateListeners.add(listener);
    listener(stateSnapshot());
    return () => stateListeners.delete(listener);
  }

  function injectPill(){
    if(document.getElementById("auroraCloudPill")) return;
    const style = document.createElement("style");
    style.id = "auroraCloudPillStyles";
    style.textContent = `
      #auroraCloudPill{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:min(290px,calc(100vw - 28px));padding:10px 13px;border:1px solid rgba(125,211,252,.28);border-radius:999px;background:rgba(2,6,18,.92);box-shadow:0 14px 45px rgba(0,0,0,.42);backdrop-filter:blur(16px);color:#dbeafe;font:800 12px/1.1 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
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
      if(pendingRefresh && location.pathname.split("/").pop()?.toLowerCase() !== SYNC_PAGE){
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        location.reload();
        return;
      }
      if(location.pathname.split("/").pop()?.toLowerCase() === SYNC_PAGE){
        document.getElementById("cloudControlCentre")?.scrollIntoView({ behavior: "smooth" });
      } else {
        location.href = "AuroraCloudSync.html";
      }
    });
    document.body.appendChild(pill);
  }

  function updatePill(snapshot = stateSnapshot()){
    const pill = document.getElementById("auroraCloudPill");
    if(!pill) return;
    const copy = pill.querySelector(".aurora-cloud-copy");
    let label = "Cloud sign in";
    let state = "attention";

    if(snapshot.lastError){ label = "Cloud needs attention"; state = "error"; }
    else if(snapshot.working){ label = snapshot.action === "sign-in" ? "Cloud signing in…" : "Cloud syncing…"; state = "working"; }
    else if(!snapshot.online){ label = "Saved offline"; state = "attention"; }
    else if(!snapshot.signedIn){ label = "Cloud sign in"; state = "attention"; }
    else if(!snapshot.cloudInitialised){ label = "Upload iPad master"; state = "attention"; }
    else if(snapshot.pendingRefresh){ label = "Cloud update — tap to refresh"; state = "attention"; }
    else if(snapshot.syncEnabled){ label = "Cloud synced"; state = "synced"; }
    else { label = "Cloud connecting…"; state = "working"; }

    pill.dataset.state = state;
    copy.textContent = label;
    pill.title = snapshot.lastError || label;
  }

  function stopPolling(){
    if(pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function startPolling(){
    stopPolling();
    if(!currentUser || !cloudInitialised) return;
    pollTimer = setInterval(() => {
      if(document.visibilityState === "visible" && navigator.onLine && !working){
        reconcileFromCloud({ allowReload: true }).catch(error => { lastError = humanError(error); emitState(); });
      }
    }, 45000);
  }

  async function initialiseSession(){
    const session = loadSession();
    if(!session){
      currentUser = null;
      cloudInitialised = false;
      syncEnabled = false;
      return;
    }
    try {
      await ensureToken(false);
      const refreshed = loadSession();
      currentUser = { uid: refreshed.uid, email: refreshed.email || "" };
      await reconcileFromCloud({ allowReload: true });
      startPolling();
    } catch(error){
      clearSession();
      currentUser = null;
      cloudInitialised = false;
      syncEnabled = false;
      lastError = humanError(error);
    }
  }

  window.addEventListener("online", () => {
    emitState();
    if(currentUser && cloudInitialised && !working){
      syncNow().catch(() => {});
    }
  });
  window.addEventListener("offline", () => emitState());
  window.addEventListener("storage", event => {
    if(event.storageArea === localStorage && event.key && isSyncKey(event.key)){
      schedulePush(event.key, event.newValue, event.newValue === null);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible" && currentUser && cloudInitialised && navigator.onLine && !working){
      reconcileFromCloud({ allowReload: true }).catch(error => { lastError = humanError(error); emitState(); });
    }
  });

  const api = {
    version: VERSION,
    transport: "rest",
    ready,
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

  function bootUi(){
    injectPill();
    emitState();
    window.dispatchEvent(new CustomEvent("aurora-cloud-ready", { detail: api }));
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootUi, { once: true });
  else bootUi();

  initialiseSession().finally(() => {
    if(!firstAuthResolved){
      firstAuthResolved = true;
      resolveReady(stateSnapshot());
    }
    emitState();
  });
})();

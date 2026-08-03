/* Aurora City FC Cloud Sync • Authoritative Restore v3 • 03 Aug 2026 */
(function(){
  "use strict";

  if(window.__AURORA_CLOUD_REST_ENGINE__) return;

  window.__AURORA_CLOUD_REST_ENGINE__ = true;
  window.__AURORA_CLOUD_ENGINE_LOADING__ = true;

  const API_KEY =
    "AIzaSyCWniUugILvyvTqXCnpQQQ352V0ECKPKo0";

  const PROJECT_ID = "aurora-city-fc";
  const VERSION = "3.0.0-authoritative-restore";
  const SCHEMA_VERSION = 2;

  const SESSION_KEY =
    "aurora_cloud_rest_session_v1";

  const DEVICE_ID_KEY =
    "aurora_cloud_device_id_v1";

  const DEVICE_NAME_KEY =
    "aurora_cloud_device_name_v1";

  const META_KEY =
    "aurora_cloud_meta_v1";

  const LOCAL_BACKUP_KEY =
    "aurora_cloud_restore_backup_v2";

  const LEGACY_BACKUP_KEY =
    "aurora_cloud_restore_backup_v1";

  const RELOAD_GUARD_KEY =
    "aurora_cloud_reload_guard_v2";

  const FORCE_RESTORE_MARKER_KEY =
    "aurora_cloud_force_restore_v2";

  const CLOUD_BOOTSTRAP_KEY =
    "aurora_cloud_bootstrap_complete_v1";

  const FINANCE_PRIMARY_KEY =
    "aurora_wealth_centre";

  const FINANCE_BACKUP_KEYS = [
    "aurora_wealth_centre_backup_v3",
    "aurora_wealth_centre_backup_v2",
    "aurora_wealth_centre_backup_v1"
  ];

  const FINANCE_SESSION_KEYS = [
    "aurora_wealth_centre_session_v3",
    "aurora_wealth_centre_session_v2",
    "aurora_wealth_centre_session_v1"
  ];

  const SYNC_PAGE = "auroracloudsync.html";

  const AUTH_URL =
    "https://identitytoolkit.googleapis.com/v1/"
    + `accounts:signInWithPassword?key=${API_KEY}`;

  const REFRESH_URL =
    "https://securetoken.googleapis.com/v1/"
    + `token?key=${API_KEY}`;

  const FIRESTORE_BASE =
    "https://firestore.googleapis.com/v1/"
    + `projects/${PROJECT_ID}/databases/(default)/documents`;

  const COMMIT_URL =
    `${FIRESTORE_BASE}:commit`;

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

  const nativeSetItem =
    Storage.prototype.setItem;

  const nativeRemoveItem =
    Storage.prototype.removeItem;

  const nativeClear =
    Storage.prototype.clear;

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
  let pollTimer = null;

  const pendingTimers = new Map();
  const stateListeners = new Set();

  let resolveReady;

  const ready = new Promise(resolve => {
    resolveReady = resolve;
  });

  function safeParse(value, fallback){
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function moneyNumber(value){
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function financeBalanceFromValue(rawValue){
    const data = safeParse(
      String(rawValue || ""),
      null
    );

    return moneyNumber(
      data?.holdingBalance
    );
  }

  function localFinanceBalance(){
    return financeBalanceFromValue(
      localStorage.getItem(
        FINANCE_PRIMARY_KEY
      )
    );
  }

  function humanError(error){
    const raw = String(
      error?.message
      || error
      || "Cloud request failed."
    );

    const code = String(
      error?.code || ""
    );

    const combined =
      `${code} ${raw}`.toUpperCase();

    if(
      combined.includes("INVALID_PASSWORD")
      || combined.includes(
        "INVALID_LOGIN_CREDENTIALS"
      )
    ){
      return "The Aurora email or password is incorrect.";
    }

    if(combined.includes("EMAIL_NOT_FOUND")){
      return "No Aurora Firebase account was found for that email.";
    }

    if(combined.includes("USER_DISABLED")){
      return "This Aurora Firebase account has been disabled.";
    }

    if(combined.includes("TOO_MANY_ATTEMPTS")){
      return "Firebase has temporarily limited sign-in attempts. "
        + "Wait a few minutes and try again.";
    }

    if(
      combined.includes("PERMISSION_DENIED")
      || combined.includes("403")
    ){
      return "Firestore blocked this request. Check that you are "
        + "signed in to the correct Aurora account.";
    }

    if(
      combined.includes("FAILED_TO_FETCH")
      || combined.includes("NETWORK")
      || combined.includes("OFFLINE")
    ){
      return "The cloud could not be reached. Check the internet "
        + "connection and try again.";
    }

    return raw.replace(
      /^Firebase:\s*/i,
      ""
    );
  }

  function getDeviceId(){
    let id = localStorage.getItem(
      DEVICE_ID_KEY
    );

    if(!id){
      id =
        globalThis.crypto?.randomUUID?.()
        || `aurora-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      nativeSetItem.call(
        localStorage,
        DEVICE_ID_KEY,
        id
      );
    }

    return id;
  }

  function defaultDeviceName(){
    const ua =
      navigator.userAgent || "";

    const isIPad =
      /iPad/i.test(ua)
      || (
        navigator.platform === "MacIntel"
        && navigator.maxTouchPoints > 1
      );

    if(isIPad) return "Chris’s iPad";
    if(/iPhone/i.test(ua)) return "Chris’s iPhone";
    if(/Android/i.test(ua)) return "Chris’s phone";

    return "Aurora device";
  }

  function getDeviceName(){
    return (
      localStorage.getItem(
        DEVICE_NAME_KEY
      )
      || defaultDeviceName()
    );
  }

  function setDeviceName(name){
    const clean =
      String(name || "")
        .trim()
        .slice(0, 60)
      || defaultDeviceName();

    nativeSetItem.call(
      localStorage,
      DEVICE_NAME_KEY,
      clean
    );

    emitState();

    return clean;
  }

  function getMeta(){
    const parsed = safeParse(
      localStorage.getItem(
        META_KEY
      ) || "{}",
      {}
    );

    return parsed
      && typeof parsed === "object"
      ? parsed
      : {};
  }

  function saveMeta(meta){
    nativeSetItem.call(
      localStorage,
      META_KEY,
      JSON.stringify(meta || {})
    );
  }

  function setMetaTime(key, time){
    const meta = getMeta();

    meta[key] =
      Number(time)
      || Date.now();

    saveMeta(meta);
  }

  function isSyncKey(key){
    const value =
      String(key || "");

    if(!/^aurora/i.test(value)){
      return false;
    }

    return !EXCLUDED_KEY_PATTERNS.some(
      pattern => pattern.test(value)
    );
  }

  function localEntries(){
    const entries = [];

    for(
      let index = 0;
      index < localStorage.length;
      index += 1
    ){
      const key =
        localStorage.key(index);

      if(
        key
        && isSyncKey(key)
      ){
        entries.push([
          key,
          localStorage.getItem(key)
        ]);
      }
    }

    return entries.sort(
      (a, b) =>
        a[0].localeCompare(b[0])
    );
  }

  function encodeKey(key){
    return encodeURIComponent(key)
      .replace(/%/g, "~");
  }

  function stateSnapshot(extra = {}){
    return {
      version:VERSION,
      transport:"rest",
      user:currentUser
        ? {
            uid:currentUser.uid,
            email:currentUser.email || ""
          }
        : null,
      signedIn:Boolean(currentUser),
      cloudInitialised,
      syncEnabled,
      online:navigator.onLine,
      localKeyCount:localEntries().length,
      localFinanceBalance:
        localFinanceBalance(),
      deviceId:getDeviceId(),
      deviceName:getDeviceName(),
      lastSyncAt,
      lastError,
      pendingRefresh,
      working,
      action,
      ...extra
    };
  }

  function emitState(extra = {}){
    const snapshot =
      stateSnapshot(extra);

    stateListeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (_) {}
    });

    updatePill(snapshot);

    return snapshot;
  }

  function loadSession(){
    const session = safeParse(
      localStorage.getItem(
        SESSION_KEY
      ) || "null",
      null
    );

    return session
      && session.refreshToken
      && session.uid
      ? session
      : null;
  }

  function saveSession(session){
    nativeSetItem.call(
      localStorage,
      SESSION_KEY,
      JSON.stringify(session)
    );
  }

  function clearSession(){
    nativeRemoveItem.call(
      localStorage,
      SESSION_KEY
    );
  }

  async function readJsonResponse(
    response
  ){
    const text =
      await response.text();

    const data =
      text
        ? safeParse(
            text,
            {raw:text}
          )
        : {};

    if(!response.ok){
      const message =
        data?.error?.message
        || data?.error?.status
        || data?.raw
        || `Request failed (${response.status}).`;

      const error =
        new Error(message);

      error.code =
        data?.error?.status
        || String(response.status);

      throw error;
    }

    return data;
  }

  async function signInRequest(
    email,
    password
  ){
    const response = await fetch(
      AUTH_URL,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          email:String(email || "").trim(),
          password:String(password || ""),
          returnSecureToken:true
        })
      }
    );

    return readJsonResponse(response);
  }

  async function refreshRequest(
    refreshToken
  ){
    const response = await fetch(
      REFRESH_URL,
      {
        method:"POST",
        headers:{
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body:new URLSearchParams({
          grant_type:"refresh_token",
          refresh_token:refreshToken
        }).toString()
      }
    );

    return readJsonResponse(response);
  }

  async function ensureToken(
    force = false
  ){
    let session = loadSession();

    if(!session){
      throw new Error(
        "Sign in to Aurora Cloud first."
      );
    }

    if(
      !force
      && session.idToken
      && Number(session.expiresAt)
        - Date.now() > 90000
    ){
      return session.idToken;
    }

    const refreshed =
      await refreshRequest(
        session.refreshToken
      );

    session = {
      ...session,
      idToken:refreshed.id_token,
      refreshToken:
        refreshed.refresh_token
        || session.refreshToken,
      uid:
        refreshed.user_id
        || session.uid,
      expiresAt:
        Date.now()
        + (
          Number(
            refreshed.expires_in
            || 3600
          )
          * 1000
        )
    };

    saveSession(session);

    currentUser = {
      uid:session.uid,
      email:session.email || ""
    };

    return session.idToken;
  }

  async function authFetch(
    url,
    options = {},
    retry = true
  ){
    const token =
      await ensureToken(false);

    const headers =
      new Headers(
        options.headers || {}
      );

    headers.set(
      "Authorization",
      `Bearer ${token}`
    );

    const response = await fetch(
      url,
      {
        ...options,
        headers
      }
    );

    if(
      response.status === 401
      && retry
    ){
      await ensureToken(true);

      return authFetch(
        url,
        options,
        false
      );
    }

    return response;
  }

  function firestoreValue(value){
    if(
      value === null
      || value === undefined
    ){
      return null;
    }

    if(
      Object.prototype.hasOwnProperty.call(
        value,
        "stringValue"
      )
    ){
      return value.stringValue;
    }

    if(
      Object.prototype.hasOwnProperty.call(
        value,
        "booleanValue"
      )
    ){
      return value.booleanValue;
    }

    if(
      Object.prototype.hasOwnProperty.call(
        value,
        "integerValue"
      )
    ){
      return Number(
        value.integerValue
      );
    }

    if(
      Object.prototype.hasOwnProperty.call(
        value,
        "doubleValue"
      )
    ){
      return Number(
        value.doubleValue
      );
    }

    if(
      Object.prototype.hasOwnProperty.call(
        value,
        "timestampValue"
      )
    ){
      return value.timestampValue;
    }

    return null;
  }

  function parseDocument(document){
    const fields =
      document?.fields || {};

    const parsed = {
      _name:document?.name || "",
      _createTime:
        document?.createTime || "",
      _updateTime:
        document?.updateTime || ""
    };

    Object.entries(fields)
      .forEach(([key, value]) => {
        parsed[key] =
          firestoreValue(value);
      });

    return parsed;
  }

  function recordFields(
    key,
    value,
    deleted,
    time = Date.now()
  ){
    return {
      key:{
        stringValue:String(key)
      },
      value:{
        stringValue:String(
          value ?? ""
        )
      },
      deleted:{
        booleanValue:Boolean(deleted)
      },
      clientUpdatedAt:{
        integerValue:String(
          Math.round(time)
        )
      },
      updatedAt:{
        timestampValue:
          new Date(time).toISOString()
      },
      deviceId:{
        stringValue:getDeviceId()
      },
      deviceName:{
        stringValue:getDeviceName()
      },
      schemaVersion:{
        integerValue:
          String(SCHEMA_VERSION)
      }
    };
  }

  function configFields(
    keyCount,
    time = Date.now(),
    initial = false
  ){
    const fields = {
      initialised:{
        booleanValue:true
      },
      schemaVersion:{
        integerValue:
          String(SCHEMA_VERSION)
      },
      masterDeviceId:{
        stringValue:getDeviceId()
      },
      masterDeviceName:{
        stringValue:getDeviceName()
      },
      keyCount:{
        integerValue:
          String(keyCount)
      },
      updatedAt:{
        timestampValue:
          new Date(time).toISOString()
      }
    };

    if(initial){
      fields.initialisedAt = {
        timestampValue:
          new Date(time).toISOString()
      };
    }

    return fields;
  }

  function documentName(path){
    return (
      `projects/${PROJECT_ID}/`
      + "databases/(default)/"
      + `documents/${path}`
    );
  }

  function configPath(
    uid = currentUser?.uid
  ){
    return `users/${uid}/cloud/config`;
  }

  function storagePath(
    key,
    uid = currentUser?.uid
  ){
    return (
      `users/${uid}/storage/`
      + encodeKey(key)
    );
  }

  function storageCollectionPath(
    uid = currentUser?.uid
  ){
    return `users/${uid}/storage`;
  }

  async function getDocument(path){
    const response =
      await authFetch(
        `${FIRESTORE_BASE}/${path}`
      );

    if(response.status === 404){
      return null;
    }

    return parseDocument(
      await readJsonResponse(response)
    );
  }

  async function listDocuments(
    collectionPath
  ){
    const documents = [];
    let pageToken = "";

    do {
      const params =
        new URLSearchParams({
          pageSize:"500"
        });

      if(pageToken){
        params.set(
          "pageToken",
          pageToken
        );
      }

      const response =
        await authFetch(
          `${FIRESTORE_BASE}/`
          + `${collectionPath}?`
          + params.toString()
        );

      const data =
        await readJsonResponse(response);

      (data.documents || [])
        .forEach(document => {
          documents.push(
            parseDocument(document)
          );
        });

      pageToken =
        data.nextPageToken || "";
    } while(pageToken);

    return documents;
  }

  async function patchDocument(
    path,
    fields
  ){
    const response =
      await authFetch(
        `${FIRESTORE_BASE}/${path}`,
        {
          method:"PATCH",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({
            fields
          })
        }
      );

    return parseDocument(
      await readJsonResponse(response)
    );
  }

  async function commitWrites(writes){
    for(
      let start = 0;
      start < writes.length;
      start += 400
    ){
      const response =
        await authFetch(
          COMMIT_URL,
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              writes:writes.slice(
                start,
                start + 400
              )
            })
          }
        );

      await readJsonResponse(response);
    }
  }

  function remoteMillis(data){
    const clientTime =
      Number(
        data?.clientUpdatedAt
      ) || 0;

    const timestamp =
      Date.parse(
        data?.updatedAt
        || data?._updateTime
        || ""
      ) || 0;

    return Math.max(
      clientTime,
      timestamp
    );
  }

  function backupLocalState(
    reason = "manual"
  ){
    const payload = {
      createdAt:
        new Date().toISOString(),
      reason,
      deviceId:getDeviceId(),
      deviceName:getDeviceName(),
      entries:Object.fromEntries(
        localEntries()
      ),
      financeBackup:
        localStorage.getItem(
          "aurora_wealth_centre_backup_v3"
        ),
      financeSession:
        sessionStorage.getItem(
          "aurora_wealth_centre_session_v3"
        )
    };

    nativeSetItem.call(
      localStorage,
      LOCAL_BACKUP_KEY,
      JSON.stringify(payload)
    );

    return payload;
  }

  function restoreLocalBackup(){
    const payload =
      safeParse(
        localStorage.getItem(
          LOCAL_BACKUP_KEY
        )
        || localStorage.getItem(
          LEGACY_BACKUP_KEY
        )
        || "null",
        null
      );

    if(
      !payload?.entries
      || typeof payload.entries
        !== "object"
    ){
      throw new Error(
        "No Aurora restore backup is available on this device."
      );
    }

    applyingRemote = true;

    try {
      for(
        const [key, value]
        of Object.entries(
          payload.entries
        )
      ){
        if(isSyncKey(key)){
          nativeSetItem.call(
            localStorage,
            key,
            String(value)
          );
        }
      }

      if(payload.financeBackup){
        nativeSetItem.call(
          localStorage,
          "aurora_wealth_centre_backup_v3",
          String(payload.financeBackup)
        );
      }

      if(payload.financeSession){
        nativeSetItem.call(
          sessionStorage,
          "aurora_wealth_centre_session_v3",
          String(payload.financeSession)
        );
      }
    } finally {
      applyingRemote = false;
    }

    return payload;
  }

  function clearFinanceShadowCopies(){
    FINANCE_BACKUP_KEYS
      .forEach(key => {
        nativeRemoveItem.call(
          localStorage,
          key
        );
      });

    FINANCE_SESSION_KEYS
      .forEach(key => {
        nativeRemoveItem.call(
          sessionStorage,
          key
        );
      });
  }

  function writeForceRestoreMarker(
    financeRecord
  ){
    const marker = {
      version:2,
      restoredAt:Date.now(),
      restoredIso:
        new Date().toISOString(),
      key:FINANCE_PRIMARY_KEY,
      remoteUpdatedAt:
        remoteMillis(
          financeRecord
        ),
      financeBalance:
        financeBalanceFromValue(
          financeRecord?.value
        ),
      source:"aurora-cloud-force-download"
    };

    nativeSetItem.call(
      localStorage,
      FORCE_RESTORE_MARKER_KEY,
      JSON.stringify(marker)
    );

    nativeSetItem.call(
      localStorage,
      CLOUD_BOOTSTRAP_KEY,
      JSON.stringify({
        completedAt:
          marker.restoredAt,
        deviceId:getDeviceId()
      })
    );

    return marker;
  }

  function applyRemoteRecord(
    data,
    {
      force = false,
      allowReload = true
    } = {}
  ){
    const key = data?.key;

    if(
      !key
      || !isSyncKey(key)
    ){
      return false;
    }

    const remoteTime =
      remoteMillis(data);

    const localTime =
      Number(
        getMeta()[key]
      ) || 0;

    if(
      !force
      && remoteTime
      && localTime > remoteTime
    ){
      return false;
    }

    const current =
      localStorage.getItem(key);

    applyingRemote = true;

    try {
      if(data.deleted){
        if(current !== null){
          nativeRemoveItem.call(
            localStorage,
            key
          );
        }
      } else if(
        current
        !== String(data.value ?? "")
      ){
        nativeSetItem.call(
          localStorage,
          key,
          String(data.value ?? "")
        );
      }

      setMetaTime(
        key,
        remoteTime
        || Date.now()
      );
    } finally {
      applyingRemote = false;
    }

    const changed =
      data.deleted
        ? current !== null
        : current
          !== String(data.value ?? "");

    if(
      changed
      && allowReload
    ){
      pendingRefresh = true;
    }

    return changed;
  }

  async function readConfig(){
    if(!currentUser){
      return null;
    }

    return getDocument(
      configPath()
    );
  }

  async function pushKeyNow(
    key,
    value,
    deleted = false
  ){
    if(
      !currentUser
      || !cloudInitialised
      || !isSyncKey(key)
    ){
      return false;
    }

    const time = Date.now();

    await patchDocument(
      storagePath(key),
      recordFields(
        key,
        value,
        deleted,
        time
      )
    );

    setMetaTime(
      key,
      time
    );

    lastSyncAt =
      new Date().toISOString();

    lastError = null;

    emitState({
      pushedKey:key
    });

    return true;
  }

  function schedulePush(
    key,
    value,
    deleted = false
  ){
    if(
      applyingRemote
      || !currentUser
      || !cloudInitialised
      || !syncEnabled
      || !isSyncKey(key)
    ){
      return;
    }

    const existing =
      pendingTimers.get(key);

    if(existing){
      clearTimeout(existing);
    }

    pendingTimers.set(
      key,
      setTimeout(
        async () => {
          pendingTimers.delete(key);

          try {
            await pushKeyNow(
              key,
              value,
              deleted
            );
          } catch (error) {
            lastError =
              humanError(error);

            emitState();
          }
        },
        700
      )
    );
  }

  Storage.prototype.setItem =
    function auroraCloudSetItem(
      key,
      value
    ){
      const result =
        nativeSetItem.call(
          this,
          key,
          value
        );

      if(this === localStorage){
        schedulePush(
          String(key),
          String(value),
          false
        );
      }

      return result;
    };

  Storage.prototype.removeItem =
    function auroraCloudRemoveItem(
      key
    ){
      const existing =
        this === localStorage
          ? localStorage.getItem(key)
          : null;

      const result =
        nativeRemoveItem.call(
          this,
          key
        );

      if(
        this === localStorage
        && existing !== null
      ){
        schedulePush(
          String(key),
          "",
          true
        );
      }

      return result;
    };

  Storage.prototype.clear =
    function auroraCloudClear(){
      if(this !== localStorage){
        return nativeClear.call(this);
      }

      const keys =
        localEntries()
          .map(([key]) => key);

      nativeClear.call(this);

      getDeviceId();

      keys.forEach(key => {
        schedulePush(
          key,
          "",
          true
        );
      });
    };

  async function reconcileFromCloud(
    {
      allowReload = true
    } = {}
  ){
    if(!currentUser){
      return {
        changed:0,
        cloudCount:0
      };
    }

    const config =
      await readConfig();

    cloudInitialised =
      Boolean(
        config?.initialised
      );

    if(!cloudInitialised){
      syncEnabled = false;
      emitState();

      return {
        changed:0,
        cloudCount:0
      };
    }

    const cloudRecords =
      await listDocuments(
        storageCollectionPath()
      );

    const cloudKeys =
      new Set();

    const meta =
      getMeta();

    let changed = 0;
    const pushes = [];

    cloudRecords.forEach(data => {
      if(
        !data?.key
        || !isSyncKey(data.key)
      ){
        return;
      }

      cloudKeys.add(data.key);

      const remoteTime =
        remoteMillis(data);

      const localTime =
        Number(
          meta[data.key]
        ) || 0;

      const localValue =
        localStorage.getItem(
          data.key
        );

      if(
        localTime > remoteTime
        && localValue !== null
      ){
        pushes.push(
          pushKeyNow(
            data.key,
            localValue,
            false
          )
        );
      } else if(
        applyRemoteRecord(
          data,
          {allowReload}
        )
      ){
        changed += 1;
      }
    });

    for(
      const [key, value]
      of localEntries()
    ){
      if(
        !cloudKeys.has(key)
        && Number(meta[key]) > 0
      ){
        pushes.push(
          pushKeyNow(
            key,
            value,
            false
          )
        );
      }
    }

    if(pushes.length){
      await Promise.allSettled(
        pushes
      );
    }

    syncEnabled = true;
    lastSyncAt =
      new Date().toISOString();
    lastError = null;

    emitState({
      changed,
      cloudCount:
        cloudRecords.length
    });

    return {
      changed,
      cloudCount:
        cloudRecords.length
    };
  }

  async function forceDownloadCloud(
    {
      reload = false
    } = {}
  ){
    if(!currentUser){
      throw new Error(
        "Sign in to Aurora Cloud first."
      );
    }

    const config =
      await readConfig();

    if(!config?.initialised){
      throw new Error(
        "Aurora Cloud is empty. Upload the correct browser "
        + "as the master copy first."
      );
    }

    backupLocalState(
      "before-authoritative-cloud-download"
    );

    working = true;
    action = "force-download";
    syncEnabled = false;
    lastError = null;

    emitState();

    try {
      const cloudRecords =
        await listDocuments(
          storageCollectionPath()
        );

      const activeRemoteRecords =
        cloudRecords.filter(
          record =>
            record?.key
            && isSyncKey(record.key)
            && !record.deleted
        );

      const remoteKeys =
        new Set(
          activeRemoteRecords.map(
            record => record.key
          )
        );

      /*
       * The cloud is authoritative during a Download.
       * Remove stale local Aurora records that do not exist remotely.
       */
      applyingRemote = true;

      try {
        localEntries()
          .forEach(([key]) => {
            if(!remoteKeys.has(key)){
              nativeRemoveItem.call(
                localStorage,
                key
              );
            }
          });
      } finally {
        applyingRemote = false;
      }

      clearFinanceShadowCopies();

      let changed = 0;

      cloudRecords.forEach(record => {
        if(
          applyRemoteRecord(
            record,
            {
              force:true,
              allowReload:false
            }
          )
        ){
          changed += 1;
        }
      });

      const financeRecord =
        cloudRecords.find(
          record =>
            record?.key
            === FINANCE_PRIMARY_KEY
            && !record.deleted
        );

      const marker =
        writeForceRestoreMarker(
          financeRecord
        );

      /*
       * Copy the downloaded primary Finance record into the new
       * backup only after stale copies have been removed.
       */
      const financeRaw =
        localStorage.getItem(
          FINANCE_PRIMARY_KEY
        );

      if(financeRaw){
        nativeSetItem.call(
          localStorage,
          "aurora_wealth_centre_backup_v3",
          financeRaw
        );
      }

      syncEnabled = true;
      cloudInitialised = true;
      pendingRefresh = false;
      lastSyncAt =
        new Date().toISOString();

      emitState({
        downloaded:
          cloudRecords.length,
        changed,
        authoritative:true,
        cloudFinanceBalance:
          marker.financeBalance
      });

      if(reload){
        setTimeout(
          () => location.reload(),
          250
        );
      }

      return {
        downloaded:
          cloudRecords.length,
        changed,
        authoritative:true,
        financeBalance:
          marker.financeBalance
      };
    } catch (error) {
      lastError =
        humanError(error);

      emitState();

      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function uploadMaster(){
    if(!currentUser){
      throw new Error(
        "Sign in to Aurora Cloud first."
      );
    }

    const entries =
      localEntries();

    if(!entries.length){
      throw new Error(
        "No Aurora data was found on this device."
      );
    }

    backupLocalState(
      "before-master-upload"
    );

    working = true;
    action = "upload-master";
    syncEnabled = false;
    lastError = null;

    emitState();

    try {
      const existing =
        await listDocuments(
          storageCollectionPath()
        );

      const localKeySet =
        new Set(
          entries.map(
            ([key]) => key
          )
        );

      const time =
        Date.now();

      const writes = [];

      existing.forEach(record => {
        const key =
          record?.key;

        if(
          key
          && !localKeySet.has(key)
        ){
          writes.push({
            delete:documentName(
              storagePath(key)
            )
          });
        }
      });

      entries.forEach(
        ([key, value]) => {
          writes.push({
            update:{
              name:documentName(
                storagePath(key)
              ),
              fields:recordFields(
                key,
                value,
                false,
                time
              )
            }
          });
        }
      );

      writes.push({
        update:{
          name:documentName(
            configPath()
          ),
          fields:configFields(
            entries.length,
            time,
            !cloudInitialised
          )
        }
      });

      await commitWrites(writes);

      const meta =
        getMeta();

      entries.forEach(([key]) => {
        meta[key] = time;
      });

      saveMeta(meta);

      cloudInitialised = true;
      syncEnabled = true;
      lastSyncAt =
        new Date().toISOString();
      lastError = null;

      startPolling();

      const financeBalance =
        localFinanceBalance();

      emitState({
        uploaded:entries.length,
        cloudFinanceBalance:
          financeBalance
      });

      return {
        uploaded:entries.length,
        financeBalance
      };
    } catch (error) {
      lastError =
        humanError(error);

      emitState();

      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function signIn(
    email,
    password
  ){
    lastError = null;
    working = true;
    action = "sign-in";

    emitState();

    try {
      const result =
        await signInRequest(
          email,
          password
        );

      const session = {
        idToken:result.idToken,
        refreshToken:
          result.refreshToken,
        expiresAt:
          Date.now()
          + (
            Number(
              result.expiresIn
              || 3600
            )
            * 1000
          ),
        uid:result.localId,
        email:
          result.email
          || String(email || "").trim()
      };

      saveSession(session);

      currentUser = {
        uid:session.uid,
        email:session.email
      };

      const config =
        await readConfig();

      cloudInitialised =
        Boolean(
          config?.initialised
        );

      syncEnabled =
        cloudInitialised;

      startPolling();

      return currentUser;
    } catch (error) {
      lastError =
        humanError(error);

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

  async function syncNow(){
    if(!currentUser){
      throw new Error(
        "Sign in to Aurora Cloud first."
      );
    }

    working = true;
    action = "sync";
    lastError = null;

    emitState();

    try {
      const config =
        await readConfig();

      if(!config?.initialised){
        throw new Error(
          "Aurora Cloud is empty. Upload the correct device "
          + "as the master copy first."
        );
      }

      syncEnabled = true;

      const result =
        await reconcileFromCloud({
          allowReload:false
        });

      lastSyncAt =
        new Date().toISOString();

      emitState({
        synced:true
      });

      return {
        checked:
          localEntries().length,
        ...result
      };
    } catch (error) {
      lastError =
        humanError(error);

      emitState();

      throw new Error(lastError);
    } finally {
      working = false;
      action = "";
      emitState();
    }
  }

  async function inspectCloud(){
    if(!currentUser){
      throw new Error(
        "Sign in to Aurora Cloud first."
      );
    }

    const config =
      await readConfig();

    cloudInitialised =
      Boolean(
        config?.initialised
      );

    if(!cloudInitialised){
      emitState({
        cloudFinanceBalance:null,
        cloudCount:0
      });

      return {
        initialised:false,
        count:0,
        financeBalance:null,
        masterDeviceName:""
      };
    }

    const records =
      await listDocuments(
        storageCollectionPath()
      );

    const financeRecord =
      records.find(
        record =>
          record?.key
          === FINANCE_PRIMARY_KEY
          && !record.deleted
      );

    const result = {
      initialised:true,
      count:records.length,
      financeBalance:
        financeBalanceFromValue(
          financeRecord?.value
        ),
      masterDeviceName:
        config?.masterDeviceName || "",
      updatedAt:
        config?.updatedAt || ""
    };

    emitState({
      cloudFinanceBalance:
        result.financeBalance,
      cloudCount:
        result.count
    });

    return result;
  }

  function subscribe(listener){
    stateListeners.add(listener);

    listener(
      stateSnapshot()
    );

    return () => {
      stateListeners.delete(listener);
    };
  }

  function stopPolling(){
    if(pollTimer){
      clearInterval(pollTimer);
    }

    pollTimer = null;
  }

  function startPolling(){
    stopPolling();

    if(
      !currentUser
      || !cloudInitialised
    ){
      return;
    }

    pollTimer = setInterval(
      () => {
        if(
          document.visibilityState
            === "visible"
          && navigator.onLine
          && !working
        ){
          reconcileFromCloud({
            allowReload:false
          }).catch(error => {
            lastError =
              humanError(error);

            emitState();
          });
        }
      },
      30000
    );
  }

  function injectPill(){
    /*
     * Child Finance pages run inside GameShell. Do not create another
     * floating cloud pill inside the iframe.
     */
    if(
      window.top !== window
      && location.pathname
        .split("/")
        .pop()
        ?.toLowerCase()
        !== SYNC_PAGE
    ){
      return;
    }

    if(
      document.getElementById(
        "auroraCloudPill"
      )
    ){
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "auroraCloudPillStyles";

    style.textContent = `
      #auroraCloudPill{
        position:fixed;
        right:max(14px,env(safe-area-inset-right));
        bottom:max(14px,env(safe-area-inset-bottom));
        z-index:2147483000;
        display:flex;
        align-items:center;
        gap:8px;
        max-width:min(310px,calc(100vw - 28px));
        padding:10px 13px;
        border:1px solid rgba(125,211,252,.28);
        border-radius:999px;
        background:rgba(2,6,18,.94);
        box-shadow:0 14px 45px rgba(0,0,0,.42);
        backdrop-filter:blur(16px);
        color:#dbeafe;
        font:800 12px/1.1 Inter,system-ui,-apple-system,
          "Segoe UI",sans-serif;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent
      }
      #auroraCloudPill .aurora-cloud-dot{
        width:9px;
        height:9px;
        border-radius:50%;
        background:#94a3b8;
        box-shadow:0 0 0 5px rgba(148,163,184,.10);
        flex:0 0 auto
      }
      #auroraCloudPill[data-state="synced"]
      .aurora-cloud-dot{
        background:#34d399;
        box-shadow:0 0 0 5px rgba(52,211,153,.12)
      }
      #auroraCloudPill[data-state="working"]
      .aurora-cloud-dot{
        background:#22d3ee;
        animation:auroraCloudPulse 1.1s infinite
      }
      #auroraCloudPill[data-state="attention"]
      .aurora-cloud-dot{
        background:#fbbf24;
        box-shadow:0 0 0 5px rgba(251,191,36,.12)
      }
      #auroraCloudPill[data-state="error"]
      .aurora-cloud-dot{
        background:#fb7185;
        box-shadow:0 0 0 5px rgba(251,113,133,.12)
      }
      @keyframes auroraCloudPulse{
        50%{
          transform:scale(1.35);
          opacity:.7
        }
      }
    `;

    document.head.appendChild(style);

    const pill =
      document.createElement(
        "button"
      );

    pill.id =
      "auroraCloudPill";

    pill.type = "button";

    pill.innerHTML =
      '<span class="aurora-cloud-dot" aria-hidden="true"></span>'
      + '<span class="aurora-cloud-copy">Cloud loading…</span>';

    pill.addEventListener(
      "click",
      () => {
        const page =
          location.pathname
            .split("/")
            .pop()
            ?.toLowerCase();

        if(page === SYNC_PAGE){
          document.getElementById(
            "cloudControlCentre"
          )?.scrollIntoView({
            behavior:"smooth"
          });
        } else {
          location.href =
            "AuroraCloudSync.html";
        }
      }
    );

    document.body.appendChild(
      pill
    );
  }

  function updatePill(
    snapshot = stateSnapshot()
  ){
    const pill =
      document.getElementById(
        "auroraCloudPill"
      );

    if(!pill) return;

    const copy =
      pill.querySelector(
        ".aurora-cloud-copy"
      );

    let label =
      "Cloud sign in";

    let state =
      "attention";

    if(snapshot.lastError){
      label =
        "Cloud needs attention";

      state =
        "error";
    } else if(snapshot.working){
      label =
        snapshot.action
          === "force-download"
          ? "Restoring cloud data…"
          : snapshot.action
            === "upload-master"
            ? "Replacing cloud…"
            : snapshot.action
              === "sign-in"
              ? "Cloud signing in…"
              : "Cloud syncing…";

      state =
        "working";
    } else if(!snapshot.online){
      label =
        "Saved offline";

      state =
        "attention";
    } else if(!snapshot.signedIn){
      label =
        "Cloud sign in";

      state =
        "attention";
    } else if(!snapshot.cloudInitialised){
      label =
        "Cloud master required";

      state =
        "attention";
    } else if(snapshot.syncEnabled){
      label =
        "Cloud connected";

      state =
        "synced";
    } else {
      label =
        "Cloud connecting…";

      state =
        "working";
    }

    pill.dataset.state =
      state;

    copy.textContent =
      label;

    pill.title =
      snapshot.lastError
      || label;
  }

  async function initialiseSession(){
    const session =
      loadSession();

    if(!session){
      currentUser = null;
      cloudInitialised = false;
      syncEnabled = false;

      return;
    }

    try {
      await ensureToken(false);

      const refreshed =
        loadSession();

      currentUser = {
        uid:refreshed.uid,
        email:refreshed.email || ""
      };

      const config =
        await readConfig();

      cloudInitialised =
        Boolean(
          config?.initialised
        );

      syncEnabled =
        cloudInitialised;

      /*
       * A context that has already completed an authoritative restore
       * may reconcile normally. A brand-new installed app must wait for
       * the explicit Download button and cannot upload starter defaults.
       */
      const bootstrapped =
        Boolean(
          localStorage.getItem(
            CLOUD_BOOTSTRAP_KEY
          )
        );

      if(
        cloudInitialised
        && bootstrapped
      ){
        await reconcileFromCloud({
          allowReload:false
        });
      }

      startPolling();
    } catch (error) {
      clearSession();

      currentUser = null;
      cloudInitialised = false;
      syncEnabled = false;
      lastError =
        humanError(error);
    }
  }

  window.addEventListener(
    "online",
    () => {
      emitState();

      if(
        currentUser
        && cloudInitialised
        && !working
        && localStorage.getItem(
          CLOUD_BOOTSTRAP_KEY
        )
      ){
        syncNow().catch(
          () => {}
        );
      }
    }
  );

  window.addEventListener(
    "offline",
    () => emitState()
  );

  window.addEventListener(
    "storage",
    event => {
      if(
        event.storageArea
          === localStorage
        && event.key
        && isSyncKey(
          event.key
        )
      ){
        schedulePush(
          event.key,
          event.newValue,
          event.newValue === null
        );
      }
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if(
        document.visibilityState
          === "visible"
        && currentUser
        && cloudInitialised
        && !working
        && localStorage.getItem(
          CLOUD_BOOTSTRAP_KEY
        )
      ){
        reconcileFromCloud({
          allowReload:false
        }).catch(error => {
          lastError =
            humanError(error);

          emitState();
        });
      }
    }
  );

  const api = {
    version:VERSION,
    ready,
    signIn,
    signOut,
    uploadMaster,
    downloadCloud:forceDownloadCloud,
    forceDownloadCloud,
    syncNow,
    inspectCloud,
    backupLocalState,
    restoreLocalBackup,
    localEntries,
    isSyncKey,
    getState:stateSnapshot,
    subscribe,
    getDeviceName,
    setDeviceName
  };

  window.AuroraCloudSync =
    api;

  function bootUi(){
    if(
      document.readyState
        === "loading"
    ){
      document.addEventListener(
        "DOMContentLoaded",
        injectPill,
        {once:true}
      );
    } else {
      injectPill();
    }

    emitState();

    window.dispatchEvent(
      new CustomEvent(
        "aurora-cloud-ready",
        {detail:api}
      )
    );

    window.__AURORA_CLOUD_ENGINE_LOADING__ =
      false;

    if(!firstAuthResolved){
      firstAuthResolved = true;
      resolveReady(api);
    }
  }

  initialiseSession()
    .finally(bootUi);
})();
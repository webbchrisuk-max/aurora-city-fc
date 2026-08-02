/* Aurora City FC — shared rules, navigation and consistent department heroes */
(function(){
  'use strict';

  const PLATFORM_RULES = Object.freeze({
    RKT:'IG ISA', ULVR:'IG ISA', LGEN:'IG ISA', MNG:'IG ISA', SDLF:'IG ISA',
    SUPR:'IG ISA', IMB:'IG ISA', SBRY:'IG ISA', LMP:'IG ISA', FSFL:'Trade 212',
    UKW:'IG ISA', ARCC:'IG ISA', TRIG:'Trade 212', RGL:'Trade 212', GCP:'Trade 212',
    PHP:'IG ISA / Trade 212', FGEN:'IG ISA', SEQI:'Trade 212', TW:'IG ISA', OSB:'IG ISA'
  });

  const ACCOUNT_AVAILABILITY = Object.freeze({
    TRIG:Object.freeze(['TRADE 212']),
    GCP:Object.freeze(['TRADE 212'])
  });

  const PAGE_BY_FILE = Object.freeze({
    'auroracityfc_managerdashboard.html':'home',
    'auroracityfc_transfercentre.html':'transfers',
    'auroracityfc_boardroom.html':'boardroom',
    'auroracityfc_squadhub.html':'squad',
    'auroracityfc_analysisroom.html':'analysis',
    'auroracityfc_mediacentre.html':'media',
    'auroracityfc_trainingground.html':'training'
  });

  function currentFile(){
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function currentPage(){
    const file=currentFile();
    if(!file || file==='index.html' || file==='auroracityfc_index.html') return 'home';
    return PAGE_BY_FILE[file] || '';
  }

  function installPageIdentity(){
    const page=currentPage();
    if(page) document.documentElement.dataset.auroraPage=page;
  }

  function shortTicker(value){
    return String(value||'').trim().toUpperCase().replace(/^LON:/,'').replace(/\.L$/,'').replace(/\.GB$/,'');
  }

  function normalizeAccount(value){
    const account=String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
    if(['TRADE212','TRADING212','TRADING 212','TRADE 212 ISA','TRADING 212 ISA'].includes(account)) return 'TRADE 212';
    if(account==='IG'||account==='IGISA'||account==='IG TRADING'||account.startsWith('IG TRADING')) return 'IG ISA';
    return account;
  }

  function platformFor(ticker){
    return PLATFORM_RULES[shortTicker(ticker)] || 'Check platform';
  }

  function allowedAccounts(ticker){
    const restricted=ACCOUNT_AVAILABILITY[shortTicker(ticker)];
    return restricted ? [...restricted] : ['IG ISA','TRADE 212'];
  }

  function accountAllowed(ticker, account){
    return allowedAccounts(ticker).includes(normalizeAccount(account));
  }

  function generatedAt(data){
    const raw=data?.meta?.generated_at ?? data?.meta?.generatedAt ?? data?.generated_at ?? data?.generatedAt;
    if(!raw) return null;
    const date=new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function freshness(data, freshMinutes=90, staleMinutes=180){
    const date=generatedAt(data);
    if(!date) return {date:null, ageMinutes:NaN, level:'unknown', label:'timestamp unavailable'};
    const ageMinutes=Math.max(0,(Date.now()-date.getTime())/60000);
    const level=ageMinutes<=freshMinutes?'fresh':ageMinutes<=staleMinutes?'warning':'stale';
    return {date, ageMinutes, level, label:level==='fresh'?'fresh':level==='warning'?'getting old':'stale'};
  }

  function setFreshness(targetOrId, data, options={}){
    const target=typeof targetOrId==='string'?document.getElementById(targetOrId):targetOrId;
    if(!target) return freshness(data,options.freshMinutes,options.staleMinutes);
    const info=freshness(data,options.freshMinutes??90,options.staleMinutes??180);
    const prefix=options.prefix || 'Aurora generated';
    target.classList.remove('aurora-fresh','aurora-warning','aurora-stale','aurora-unknown');

    if(!info.date){
      target.textContent=`${prefix}: unavailable`;
      target.classList.add('aurora-unknown');
      target.title='AuroraMaster.json did not contain a readable generated_at timestamp.';
      return info;
    }

    const time=info.date.toLocaleString('en-GB',{
      day:'2-digit',
      month:'short',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    });
    const age=info.ageMinutes<60
      ? `${Math.round(info.ageMinutes)} min old`
      : `${(info.ageMinutes/60).toFixed(1)} hr old`;

    target.textContent=`${prefix}: ${time} • ${age}`;
    target.classList.add(
      info.level==='fresh'
        ? 'aurora-fresh'
        : info.level==='warning'
          ? 'aurora-warning'
          : 'aurora-stale'
    );
    target.title=`AuroraMaster.json is ${info.label}.`;
    return info;
  }

  function installFreshnessStyles(){
    if(document.getElementById('aurora-shared-styles')) return;

    const style=document.createElement('style');
    style.id='aurora-shared-styles';
    style.textContent=`
      .aurora-fresh{
        color:#86efac!important;
        border-color:rgba(52,211,153,.32)!important
      }
      .aurora-warning{
        color:#fde68a!important;
        border-color:rgba(251,191,36,.34)!important
      }
      .aurora-stale{
        color:#fecdd3!important;
        border-color:rgba(251,113,133,.36)!important
      }
      .aurora-unknown{color:#cbd5e1!important}
    `;
    document.head.appendChild(style);
  }

  function installNavigationStyles(){
    if(document.getElementById('aurora-shared-nav-styles')) return;

    const style=document.createElement('style');
    style.id='aurora-shared-nav-styles';
    style.textContent=`
      /* Identical top-navigation geometry on every Aurora department */
      .topbar .nav,
      .nav{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:8px!important;
        flex-wrap:wrap!important;
      }

      .topbar .nav a,
      .topbar .nav button,
      .nav a,
      .nav button{
        box-sizing:border-box!important;
        inline-size:96px!important;
        min-inline-size:96px!important;
        max-inline-size:96px!important;
        block-size:40px!important;
        min-block-size:40px!important;
        max-block-size:40px!important;
        width:96px!important;
        min-width:96px!important;
        max-width:96px!important;
        height:40px!important;
        min-height:40px!important;
        max-height:40px!important;
        flex:0 0 96px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        margin:0!important;
        padding:0 9px!important;
        border:1px solid rgba(148,163,184,.20)!important;
        border-radius:999px!important;
        background:rgba(15,23,42,.72)!important;
        color:#dbeafe!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.045)!important;
        outline:0!important;
        appearance:none!important;
        -webkit-appearance:none!important;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        font-size:12px!important;
        font-weight:800!important;
        line-height:1!important;
        letter-spacing:0!important;
        text-align:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        transform:none!important;
        scale:1!important;
        transition:
          background-color .16s ease,
          border-color .16s ease,
          color .16s ease!important;
      }

      .topbar .nav a:hover,
      .topbar .nav button:hover,
      .nav a:hover,
      .nav button:hover{
        border-color:rgba(34,211,238,.38)!important;
        background:rgba(8,47,73,.58)!important;
        color:#e0f2fe!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.055)!important;
        transform:none!important;
        scale:1!important;
      }

      .topbar .nav a.active,
      .topbar .nav a[aria-current="page"],
      .nav a.active,
      .nav a[aria-current="page"]{
        border-color:rgba(34,211,238,.74)!important;
        background:linear-gradient(180deg,rgba(8,70,92,.92),rgba(8,47,73,.86))!important;
        color:#e6fbff!important;
        box-shadow:
          inset 0 0 0 1px rgba(103,232,249,.18),
          inset 0 1px 0 rgba(255,255,255,.08)!important;
        outline:0!important;
        transform:none!important;
        scale:1!important;
      }

      .topbar .nav a:focus-visible,
      .topbar .nav button:focus-visible,
      .nav a:focus-visible,
      .nav button:focus-visible{
        border-color:rgba(125,211,252,.78)!important;
        box-shadow:
          inset 0 0 0 2px rgba(125,211,252,.24),
          inset 0 1px 0 rgba(255,255,255,.07)!important;
        outline:0!important;
        transform:none!important;
        scale:1!important;
      }

      @media(max-width:760px){
        .topbar .nav a,
        .topbar .nav button,
        .nav a,
        .nav button{
          inline-size:88px!important;
          min-inline-size:88px!important;
          max-inline-size:88px!important;
          block-size:36px!important;
          min-block-size:36px!important;
          max-block-size:36px!important;
          width:88px!important;
          min-width:88px!important;
          max-width:88px!important;
          height:36px!important;
          min-height:36px!important;
          max-height:36px!important;
          flex-basis:88px!important;
          padding:0 7px!important;
          font-size:11px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncActiveNavigation(){
    const current=currentFile();
    const resolvedCurrent=(!current || current==='index.html' || current==='auroracityfc_index.html')
      ? 'auroracityfc_managerdashboard.html'
      : current;

    document.querySelectorAll('.nav a[href]').forEach(link=>{
      let linkFile='';

      try{
        linkFile=new URL(link.getAttribute('href'),window.location.href)
          .pathname
          .split('/')
          .pop()
          .toLowerCase();
      }catch(_){
        linkFile=String(link.getAttribute('href') || '')
          .split('/')
          .pop()
          .toLowerCase();
      }

      const isActive=linkFile===resolvedCurrent;
      link.classList.toggle('active',isActive);

      if(isActive){
        link.setAttribute('aria-current','page');
      }else{
        link.removeAttribute('aria-current');
      }
    });
  }

  function installNavigationState(){
    const apply=()=>syncActiveNavigation();

    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',apply,{once:true});
    }else{
      apply();
    }

    window.addEventListener('pageshow',apply);
  }

  function installHeroStyles(){
    if(document.getElementById('aurora-shared-hero-styles')) return;

    const style=document.createElement('style');
    style.id='aurora-shared-hero-styles';
    style.textContent=`
      :root{
        --aurora-department-hero-height:336px;
      }

      /*
       * Every main department hero uses the same desktop/iPad footprint as Home.
       * Content and background imagery remain page-specific.
       */
      html[data-aurora-page="home"] body main.app > .hq-hero,
      html[data-aurora-page="transfers"] body main.app > .hero,
      html[data-aurora-page="boardroom"] body main.app > .hero,
      html[data-aurora-page="squad"] body main.app > .hero,
      html[data-aurora-page="analysis"] body main.app > .hero,
      html[data-aurora-page="media"] body main.app > .hero,
      html[data-aurora-page="training"] body main.app > .hero{
        box-sizing:border-box!important;
        width:100%!important;
        height:var(--aurora-department-hero-height)!important;
        min-height:var(--aurora-department-hero-height)!important;
        max-height:var(--aurora-department-hero-height)!important;
        margin-top:18px!important;
        margin-bottom:16px!important;
        overflow:hidden!important;
      }

      /* Home */
      html[data-aurora-page="home"] .hq-hero .hero-inner{
        box-sizing:border-box!important;
        height:100%!important;
        min-height:0!important;
        padding:28px!important;
        align-items:stretch!important;
        overflow:hidden!important;
      }

      /* Transfer Centre, Boardroom and Squad Hub */
      html[data-aurora-page="transfers"] main.app > .hero,
      html[data-aurora-page="boardroom"] main.app > .hero,
      html[data-aurora-page="squad"] main.app > .hero{
        align-items:stretch!important;
      }

      html[data-aurora-page="transfers"] main.app > .hero > *,
      html[data-aurora-page="boardroom"] main.app > .hero > *,
      html[data-aurora-page="squad"] main.app > .hero > *{
        box-sizing:border-box!important;
        min-height:0!important;
        max-height:100%!important;
      }

      html[data-aurora-page="transfers"] .hero-card,
      html[data-aurora-page="boardroom"] .hero-card,
      html[data-aurora-page="squad"] .hero-card{
        height:100%!important;
        padding:20px!important;
        overflow:hidden!important;
      }

      html[data-aurora-page="transfers"] .scoreboard,
      html[data-aurora-page="boardroom"] .scoreboard,
      html[data-aurora-page="squad"] .scoreboard{
        height:100%!important;
        min-height:0!important;
        overflow:hidden!important;
        grid-auto-rows:minmax(0,1fr)!important;
      }

      html[data-aurora-page="transfers"] .hero-title,
      html[data-aurora-page="boardroom"] .hero-title,
      html[data-aurora-page="squad"] .hero-title{
        font-size:clamp(30px,5vw,58px)!important;
      }

      /* Analysis Room */
      html[data-aurora-page="analysis"] .hero .hero-inner{
        box-sizing:border-box!important;
        height:100%!important;
        min-height:0!important;
        padding:24px!important;
        align-items:stretch!important;
        overflow:hidden!important;
      }

      html[data-aurora-page="analysis"] .hero h2{
        font-size:clamp(34px,4.3vw,58px)!important;
        margin-top:13px!important;
        margin-bottom:7px!important;
      }

      html[data-aurora-page="analysis"] .hero-copy{
        font-size:clamp(14px,1.18vw,17px)!important;
        line-height:1.4!important;
      }

      html[data-aurora-page="analysis"] .hero-tags{
        margin-top:12px!important;
      }

      html[data-aurora-page="analysis"] .hero-tag{
        padding:7px 10px!important;
        font-size:11px!important;
      }

      html[data-aurora-page="analysis"] .tactics-board{
        box-sizing:border-box!important;
        height:100%!important;
        min-height:0!important;
        max-height:100%!important;
      }

      /* Media Centre and Training Ground */
      html[data-aurora-page="media"] main.app > .hero,
      html[data-aurora-page="training"] main.app > .hero{
        padding:22px!important;
        align-items:flex-end!important;
        background-position:center center!important;
        background-size:cover!important;
      }

      html[data-aurora-page="media"] .hero h2,
      html[data-aurora-page="training"] .hero h2{
        font-size:clamp(38px,5.7vw,64px)!important;
        margin-top:11px!important;
      }

      html[data-aurora-page="media"] .hero p,
      html[data-aurora-page="training"] .hero p{
        margin-top:10px!important;
        line-height:1.42!important;
      }

      html[data-aurora-page="media"] .hero-actions,
      html[data-aurora-page="training"] .hero-actions{
        margin-top:12px!important;
      }

      html[data-aurora-page="media"] .hero .pill,
      html[data-aurora-page="training"] .hero .pill{
        padding:7px 10px!important;
        font-size:11px!important;
      }

      /* Keep any full-bleed hero artwork fitted inside the shared footprint. */
      html[data-aurora-page] main.app > .hero > img:first-child{
        max-height:100%!important;
        object-fit:cover!important;
      }

      /*
       * Phones need natural growth for readable text.
       * iPad landscape and desktop retain the identical 336px department height.
       */
      @media(max-width:760px){
        :root{
          --aurora-department-hero-height:330px;
        }

        html[data-aurora-page="home"] body main.app > .hq-hero,
        html[data-aurora-page="transfers"] body main.app > .hero,
        html[data-aurora-page="boardroom"] body main.app > .hero,
        html[data-aurora-page="squad"] body main.app > .hero,
        html[data-aurora-page="analysis"] body main.app > .hero,
        html[data-aurora-page="media"] body main.app > .hero,
        html[data-aurora-page="training"] body main.app > .hero{
          height:auto!important;
          min-height:330px!important;
          max-height:none!important;
        }

        html[data-aurora-page="analysis"] .hero .hero-inner{
          height:auto!important;
          grid-template-columns:1fr!important;
          overflow:visible!important;
        }

        html[data-aurora-page="analysis"] .tactics-board{
          height:210px!important;
          min-height:210px!important;
        }
      }
    `;

    document.head.appendChild(style);
  }


  /* ===================== SHARED AURORA DATA ENGINE ===================== */
  const DATA_ENGINE_VERSION='1.0.0';
  const MASTER_CACHE_KEY='aurora:master-cache:v1';
  const MASTER_DATA_EVENT='aurora:data-changed';
  const MASTER_STATUS_EVENT='aurora:data-status';
  const MASTER_ERROR_EVENT='aurora:data-error';
  const DEFAULT_CACHE_MAX_AGE_MS=5*60*1000;
  const DEFAULT_CACHE_FALLBACK_MAX_AGE_MS=7*24*60*60*1000;

  let masterUrl='./AuroraMaster.json';
  let masterData=null;
  let masterFingerprint='';
  let masterPromise=null;
  let masterStatus={
    state:'idle',
    source:'none',
    url:masterUrl,
    fetchedAt:null,
    cachedAt:null,
    fromCache:false,
    stale:false,
    error:null
  };

  const dataListeners=new Set();
  const errorListeners=new Set();

  function isObject(value){
    return value!==null && typeof value==='object' && !Array.isArray(value);
  }

  function cloneStatus(){
    return {...masterStatus};
  }

  function emitWindowEvent(name, detail){
    if(typeof window==='undefined' || typeof window.dispatchEvent!=='function') return;
    try{
      window.dispatchEvent(new CustomEvent(name,{detail}));
    }catch(_){
      /* Older embedded browsers may not expose CustomEvent correctly. */
    }
  }

  function emitStatus(){
    emitWindowEvent(MASTER_STATUS_EVENT,cloneStatus());
  }

  function emitData(data, meta){
    const detail={data,meta:{...meta}};
    dataListeners.forEach(listener=>{
      try{ listener(data,{...meta}); }
      catch(err){ console.warn('Aurora data listener failed:',err); }
    });
    emitWindowEvent(MASTER_DATA_EVENT,detail);
  }

  function emitError(error, meta={}){
    const normalized=error instanceof Error ? error : new Error(String(error || 'Unknown Aurora data error'));
    const detail={error:normalized,meta:{...meta}};
    errorListeners.forEach(listener=>{
      try{ listener(normalized,{...meta}); }
      catch(err){ console.warn('Aurora data error listener failed:',err); }
    });
    emitWindowEvent(MASTER_ERROR_EVENT,detail);
  }

  function safeStorageGet(key){
    try{ return window.localStorage?.getItem(key) ?? null; }
    catch(_){ return null; }
  }

  function safeStorageSet(key,value){
    try{
      window.localStorage?.setItem(key,value);
      return true;
    }catch(_){
      return false;
    }
  }

  function safeStorageRemove(key){
    try{ window.localStorage?.removeItem(key); }
    catch(_){ /* Storage can be blocked in private mode. */ }
  }

  function hashText(value){
    const text=String(value || '');
    let hash=2166136261;
    for(let i=0;i<text.length;i+=1){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function fingerprintData(data){
    try{ return hashText(JSON.stringify(data)); }
    catch(_){ return `${Date.now()}-${Math.random()}`; }
  }

  function validateMaster(data){
    if(!isObject(data)) throw new TypeError('AuroraMaster.json must contain a JSON object.');
    return data;
  }

  function readCache(maxAgeMs=DEFAULT_CACHE_MAX_AGE_MS){
    const raw=safeStorageGet(MASTER_CACHE_KEY);
    if(!raw) return null;

    try{
      const record=JSON.parse(raw);
      if(!record || record.version!==1 || !isObject(record.data)) return null;
      const cachedAt=Number(record.cachedAt || 0);
      if(!Number.isFinite(cachedAt) || cachedAt<=0) return null;
      const ageMs=Math.max(0,Date.now()-cachedAt);
      return {
        data:record.data,
        url:String(record.url || masterUrl),
        cachedAt,
        ageMs,
        stale:ageMs>maxAgeMs
      };
    }catch(_){
      safeStorageRemove(MASTER_CACHE_KEY);
      return null;
    }
  }

  function writeCache(data,url){
    const record={
      version:1,
      engineVersion:DATA_ENGINE_VERSION,
      url,
      cachedAt:Date.now(),
      data
    };
    safeStorageSet(MASTER_CACHE_KEY,JSON.stringify(record));
    return record.cachedAt;
  }

  function updateStatus(patch){
    masterStatus={...masterStatus,...patch};
    emitStatus();
    return cloneStatus();
  }

  function commitMaster(data, meta={}){
    const validated=validateMaster(data);
    const nextFingerprint=fingerprintData(validated);
    const changed=nextFingerprint!==masterFingerprint;

    masterData=validated;
    masterFingerprint=nextFingerprint;
    masterStatus={
      ...masterStatus,
      state:'ready',
      source:meta.source || 'memory',
      url:meta.url || masterUrl,
      fetchedAt:meta.fetchedAt || masterStatus.fetchedAt || null,
      cachedAt:meta.cachedAt || masterStatus.cachedAt || null,
      fromCache:Boolean(meta.fromCache),
      stale:Boolean(meta.stale),
      error:null
    };
    emitStatus();

    if(changed || meta.alwaysNotify){
      emitData(masterData,{
        ...cloneStatus(),
        changed
      });
    }

    return masterData;
  }

  function buildRequestUrl(url, force){
    const absolute=new URL(url,window.location.href);
    if(force) absolute.searchParams.set('_aurora',String(Date.now()));
    return absolute.href;
  }

  async function fetchJson(url, options={}){
    const timeoutMs=Number.isFinite(options.timeoutMs) ? Math.max(1000,options.timeoutMs) : 15000;
    const controller=typeof AbortController==='function' ? new AbortController() : null;
    const timer=controller ? window.setTimeout(()=>controller.abort(),timeoutMs) : null;

    try{
      const response=await fetch(buildRequestUrl(url,Boolean(options.force)),{
        method:'GET',
        cache:'no-store',
        credentials:'same-origin',
        headers:{Accept:'application/json'},
        signal:controller?.signal
      });

      if(!response.ok){
        throw new Error(`Aurora data request failed (${response.status} ${response.statusText || ''})`.trim());
      }

      return validateMaster(await response.json());
    }finally{
      if(timer!==null) window.clearTimeout(timer);
    }
  }

  function setMasterUrl(url){
    const next=String(url || '').trim();
    if(!next) throw new TypeError('Aurora master data URL cannot be empty.');
    masterUrl=next;
    updateStatus({url:masterUrl});
    return masterUrl;
  }

  function getMasterUrl(){
    return masterUrl;
  }

  function getData(){
    return masterData;
  }

  function normalizeLookupKey(value){
    return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g,'');
  }

  function findObjectKey(object, requestedKey){
    if(!isObject(object)) return null;
    if(Object.prototype.hasOwnProperty.call(object,requestedKey)) return requestedKey;
    const normalized=normalizeLookupKey(requestedKey);
    return Object.keys(object).find(key=>normalizeLookupKey(key)===normalized) || null;
  }

  function readPath(object,path){
    const parts=Array.isArray(path)
      ? path
      : String(path || '').split('.').map(part=>part.trim()).filter(Boolean);
    let current=object;

    for(const part of parts){
      const key=findObjectKey(current,part);
      if(key===null) return undefined;
      current=current[key];
    }
    return current;
  }

  function getSection(path,fallback=null){
    if(masterData===null) return fallback;

    const direct=readPath(masterData,path);
    if(direct!==undefined) return direct;

    const containers=['tabs','sheets','sections','data'];
    for(const containerName of containers){
      const containerKey=findObjectKey(masterData,containerName);
      if(containerKey===null) continue;
      const nested=readPath(masterData[containerKey],path);
      if(nested!==undefined) return nested;
    }

    return fallback;
  }

  function getTab(name,fallback=[]){
    return getSection(name,fallback);
  }

  function getDataStatus(){
    const status=cloneStatus();
    return {
      ...status,
      loaded:masterData!==null,
      freshness:masterData ? freshness(masterData) : null
    };
  }

  function onDataChanged(callback,options={}){
    if(typeof callback!=='function') throw new TypeError('Aurora data listener must be a function.');
    dataListeners.add(callback);

    if(options.immediate && masterData!==null){
      try{ callback(masterData,{...getDataStatus(),changed:false}); }
      catch(err){ console.warn('Aurora immediate data listener failed:',err); }
    }

    return ()=>dataListeners.delete(callback);
  }

  function onDataError(callback){
    if(typeof callback!=='function') throw new TypeError('Aurora error listener must be a function.');
    errorListeners.add(callback);
    return ()=>errorListeners.delete(callback);
  }

  async function loadMaster(options={}){
    const url=String(options.url || masterUrl);
    const force=Boolean(options.force);
    const preferCache=options.preferCache!==false;
    const allowCacheFallback=options.allowCacheFallback!==false;
    const cacheMaxAgeMs=Number.isFinite(options.cacheMaxAgeMs)
      ? Math.max(0,options.cacheMaxAgeMs)
      : DEFAULT_CACHE_MAX_AGE_MS;
    const fallbackMaxAgeMs=Number.isFinite(options.fallbackMaxAgeMs)
      ? Math.max(0,options.fallbackMaxAgeMs)
      : DEFAULT_CACHE_FALLBACK_MAX_AGE_MS;

    if(!force && masterData!==null && masterStatus.url===url){
      return masterData;
    }

    if(!force && masterPromise) return masterPromise;

    if(!force && preferCache){
      const cached=readCache(cacheMaxAgeMs);
      if(cached && !cached.stale && cached.url===url){
        return commitMaster(cached.data,{
          source:'cache',
          url,
          cachedAt:cached.cachedAt,
          fromCache:true,
          stale:false
        });
      }
    }

    updateStatus({
      state:'loading',
      source:'network',
      url,
      fromCache:false,
      stale:false,
      error:null
    });

    masterPromise=(async()=>{
      try{
        const data=await fetchJson(url,{force,timeoutMs:options.timeoutMs});
        const fetchedAt=Date.now();
        const cachedAt=writeCache(data,url);
        return commitMaster(data,{
          source:'network',
          url,
          fetchedAt,
          cachedAt,
          fromCache:false,
          stale:false
        });
      }catch(error){
        const fallback=allowCacheFallback ? readCache(fallbackMaxAgeMs) : null;
        if(fallback && fallback.url===url && !fallback.stale){
          commitMaster(fallback.data,{
            source:'cache-fallback',
            url,
            cachedAt:fallback.cachedAt,
            fromCache:true,
            stale:true
          });
          emitError(error,{url,recoveredFromCache:true});
          return masterData;
        }

        updateStatus({
          state:'error',
          source:'network',
          url,
          fromCache:false,
          stale:false,
          error:error instanceof Error ? error.message : String(error)
        });
        emitError(error,{url,recoveredFromCache:false});
        throw error;
      }finally{
        masterPromise=null;
      }
    })();

    return masterPromise;
  }

  function refreshMaster(options={}){
    return loadMaster({...options,force:true,preferCache:false});
  }

  function clearCache(options={}){
    safeStorageRemove(MASTER_CACHE_KEY);

    if(options.memory!==false){
      masterData=null;
      masterFingerprint='';
      masterPromise=null;
      masterStatus={
        state:'idle',
        source:'none',
        url:masterUrl,
        fetchedAt:null,
        cachedAt:null,
        fromCache:false,
        stale:false,
        error:null
      };
      emitStatus();
    }

    return true;
  }

  function installCrossTabDataSync(){
    if(typeof window==='undefined' || !window.addEventListener) return;

    window.addEventListener('storage',event=>{
      if(event.key!==MASTER_CACHE_KEY || !event.newValue) return;
      try{
        const record=JSON.parse(event.newValue);
        if(!record || record.version!==1 || !isObject(record.data)) return;
        if(String(record.url || masterUrl)!==masterUrl) return;
        if(Number(record.cachedAt || 0)<=Number(masterStatus.cachedAt || 0)) return;

        commitMaster(record.data,{
          source:'cross-tab-cache',
          url:masterUrl,
          cachedAt:Number(record.cachedAt || Date.now()),
          fromCache:true,
          stale:false
        });
      }catch(_){
        /* Ignore invalid cache events from older builds. */
      }
    });
  }

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;

    window.addEventListener('load',()=>{
      navigator.serviceWorker
        .register('./service-worker.js')
        .catch(err=>console.warn('Aurora City FC service worker registration failed:',err));
    },{once:true});
  }

  installPageIdentity();
  installFreshnessStyles();
  installNavigationStyles();
  installNavigationState();
  installHeroStyles();

  window.AURORA_PLATFORM_RULES=PLATFORM_RULES;
  window.AURORA_ACCOUNT_AVAILABILITY=ACCOUNT_AVAILABILITY;
  installCrossTabDataSync();

  window.AuroraFC=Object.freeze({
    PLATFORM_RULES,
    ACCOUNT_AVAILABILITY,
    DATA_ENGINE_VERSION,
    MASTER_CACHE_KEY,
    MASTER_DATA_EVENT,
    MASTER_STATUS_EVENT,
    MASTER_ERROR_EVENT,
    shortTicker,
    normalizeAccount,
    platformFor,
    allowedAccounts,
    accountAllowed,
    generatedAt,
    freshness,
    setFreshness,
    setMasterUrl,
    getMasterUrl,
    loadMaster,
    refreshMaster,
    loadData:loadMaster,
    refreshData:refreshMaster,
    getData,
    getSection,
    getTab,
    getDataStatus,
    onDataChanged,
    onDataError,
    clearCache,
    registerServiceWorker
  });
})();

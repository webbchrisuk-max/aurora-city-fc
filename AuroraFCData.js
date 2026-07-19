/* Aurora City FC — shared rules and reliability helpers */
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
    const time=info.date.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const age=info.ageMinutes<60?`${Math.round(info.ageMinutes)} min old`:`${(info.ageMinutes/60).toFixed(1)} hr old`;
    target.textContent=`${prefix}: ${time} • ${age}`;
    target.classList.add(info.level==='fresh'?'aurora-fresh':info.level==='warning'?'aurora-warning':'aurora-stale');
    target.title=`AuroraMaster.json is ${info.label}.`;
    return info;
  }

  function installFreshnessStyles(){
    if(document.getElementById('aurora-shared-styles')) return;
    const style=document.createElement('style');
    style.id='aurora-shared-styles';
    style.textContent='.aurora-fresh{color:#86efac!important;border-color:rgba(52,211,153,.32)!important}.aurora-warning{color:#fde68a!important;border-color:rgba(251,191,36,.34)!important}.aurora-stale{color:#fecdd3!important;border-color:rgba(251,113,133,.36)!important}.aurora-unknown{color:#cbd5e1!important}';
    document.head.appendChild(style);
  }

  function installNavigationStyles(){
    if(document.getElementById('aurora-shared-nav-styles')) return;

    const style=document.createElement('style');
    style.id='aurora-shared-nav-styles';
    style.textContent=`
      /* Aurora shared top navigation — identical on every club page */
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
        border-width:1px!important;
        border-style:solid!important;
        border-radius:999px!important;
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
      }

      .topbar .nav a:hover,
      .topbar .nav button:hover,
      .topbar .nav a:focus-visible,
      .topbar .nav button:focus-visible,
      .nav a:hover,
      .nav button:hover,
      .nav a:focus-visible,
      .nav button:focus-visible,
      .topbar .nav a.active,
      .nav a.active{
        width:96px!important;
        min-width:96px!important;
        max-width:96px!important;
        height:40px!important;
        min-height:40px!important;
        max-height:40px!important;
        padding:0 9px!important;
        transform:none!important;
      }

      @media(max-width:760px){
        .topbar .nav a,
        .topbar .nav button,
        .nav a,
        .nav button{
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

        .topbar .nav a:hover,
        .topbar .nav button:hover,
        .topbar .nav a:focus-visible,
        .topbar .nav button:focus-visible,
        .nav a:hover,
        .nav button:hover,
        .nav a:focus-visible,
        .nav button:focus-visible,
        .topbar .nav a.active,
        .nav a.active{
          width:88px!important;
          min-width:88px!important;
          max-width:88px!important;
          height:36px!important;
          min-height:36px!important;
          max-height:36px!important;
          padding:0 7px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Aurora City FC service worker registration failed:',err)),{once:true});
  }

  installFreshnessStyles();
  installNavigationStyles();

  window.AURORA_PLATFORM_RULES=PLATFORM_RULES;
  window.AURORA_ACCOUNT_AVAILABILITY=ACCOUNT_AVAILABILITY;
  window.AuroraFC=Object.freeze({
    PLATFORM_RULES,
    ACCOUNT_AVAILABILITY,
    shortTicker,
    normalizeAccount,
    platformFor,
    allowedAccounts,
    accountAllowed,
    generatedAt,
    freshness,
    setFreshness,
    registerServiceWorker
  });
})();

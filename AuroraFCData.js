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

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Aurora City FC service worker registration failed:',err)),{once:true});
  }

  installFreshnessStyles();
  window.AURORA_PLATFORM_RULES=PLATFORM_RULES;
  window.AURORA_ACCOUNT_AVAILABILITY=ACCOUNT_AVAILABILITY;
  window.AuroraFC=Object.freeze({PLATFORM_RULES,ACCOUNT_AVAILABILITY,shortTicker,normalizeAccount,platformFor,allowedAccounts,accountAllowed,generatedAt,freshness,setFreshness,registerServiceWorker});
})();

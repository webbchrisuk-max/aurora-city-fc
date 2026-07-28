/* Aurora City FC Training Ground — page logic */
(function(){
  'use strict';

const AURORA_MASTER_URL = "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";
let AURORA_MASTER_CACHE=null,state={holdings:[],watchlist:[],scout:[],dividends:[],income:[]};
const $=id=>document.getElementById(id);const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n):'—';
function parseNum(v){if(v===null||v===undefined)return NaN;const s=String(v).replace(/£|,|%/g,'').trim();return s?Number(s):NaN}function cleanTicker(t){return String(t||'').trim().toUpperCase()}function displayTicker(t){return String(t||'').replace('LON:','')}function displayName(r){return r.name||r.company_name||r.company||r.Company||r.Name||displayTicker(r.ticker)||'—'}function impact(r){return parseNum(r.impact??r.impact_score??r.promotion_impact_score??r['Impact Score'])}function buyStrength(r){return parseNum(r.buy_strength??r.buy_strength_score??r.score??r.buy_score)}function yieldPct(r){const n=parseNum(r.yield_pct??r.Yield??r.yield??r.dividend_yield);return Number.isFinite(n)?(n>1?n:n*100):NaN}function annualIncomeFromRow(r){const d=parseNum(r.annual_income??r.income_annual??r.dividend_income??r['Annual Income']);if(Number.isFinite(d))return d;const v=parseNum(r.value??r.market_value??r.current_value??r.holding_value??r['Market Value']);const y=yieldPct(r);return Number.isFinite(v)&&Number.isFinite(y)?v*(y/100):0}function uniqueByTicker(rows){const m=new Map();rows.forEach(r=>{const t=cleanTicker(r.ticker);if(!t)return;const e=m.get(t);if(!e||(impact(r)||buyStrength(r)||0)>(impact(e)||buyStrength(e)||0))m.set(t,r)});return[...m.values()]}
async function fetchMaster(){if(!AURORA_MASTER_CACHE){const res=await fetch(AURORA_MASTER_URL,{cache:'no-store'});if(!res.ok)throw new Error(`AuroraData failed: ${res.status}`);AURORA_MASTER_CACHE=await res.json()}return AURORA_MASTER_CACHE}
async function loadAuroraData(){const b=$('refreshBtn');if(b){b.textContent='Loading…';b.disabled=true}try{const data=await fetchMaster();state={holdings:Array.isArray(data.Holdings)?data.Holdings:[],watchlist:Array.isArray(data.Watchlist)?data.Watchlist:[],scout:Array.isArray(data.AuroraScout)?data.AuroraScout:[],dividends:Array.isArray(data.Dividends)?data.Dividends:[],income:Array.isArray(data.IncomeLog)?data.IncomeLog:[]};renderAll()}catch(e){console.error(e);if(!(state.holdings||[]).length)document.querySelectorAll('[data-loading-target]').forEach(el=>el.innerHTML=`<div class="loading error">${e.message||'Unable to load AuroraData'}</div>`);else if($('topHeadlineNote'))$('topHeadlineNote').textContent='Refresh failed — showing the previous successful Aurora data.'}finally{if(b){b.textContent='Refresh';b.disabled=false}}}

function players(){
  const scoreRows = uniqueByTicker([...(state.watchlist||[]), ...(state.scout||[])]);
  const scoreMap = new Map(scoreRows.map(r => [cleanTicker(r.ticker), r]));
  return uniqueByTicker(state.holdings || [])
    .map(r => {
      const t = cleanTicker(r.ticker);
      const scoreRow = scoreMap.get(t) || {};
      const score = impact(r) || buyStrength(r) || impact(scoreRow) || buyStrength(scoreRow) || 0;
      return {...scoreRow, ...r, _score:score, _yield:yieldPct(r) || yieldPct(scoreRow)};
    })
    .filter(r => cleanTicker(r.ticker) && (r._score || Number.isFinite(r._yield)))
    .sort((a,b)=>(b._score||0)-(a._score||0));
}
function row(icon,title,note,value,cls=''){return `<div class="row"><div class="icon">${icon}</div><div><strong>${title}</strong><span>${note}</span></div><div class="score-pill ${cls}">${value}</div></div>`}function cls(s){return s>=90?'':s>=80?'amber':'red'}function status(s){return s>=95?'Generational':s>=90?'Elite':s>=85?'First team':s>=75?'Rotation':'Needs work'}
function renderAll(){if($('lastUpdated')){if(window.AuroraFC)AuroraFC.setFreshness('lastUpdated',AURORA_MASTER_CACHE,{prefix:'Aurora generated'});else $('lastUpdated').textContent='Aurora generated: unavailable'};const ps=players(),top=ps[0],elite=ps.filter(p=>p._score>=90),risks=ps.filter(p=>p._score&&p._score<75).slice(0,8),topScore=top?Math.round(top._score):NaN;$('topHeadline').textContent=top?displayTicker(top.ticker):'—';$('topHeadlineNote').textContent=top?`${topScore} training score`:'No form data found';$('dividendCount').textContent=elite.length;$('rumourCount').textContent=risks.length;$('pressMood').textContent=elite.length>=3?'Flying':elite.length>=1?'Strong':'Building';$('pressMoodNote').textContent=elite.length>=3?'The lads are training like monsters.':'Training plan still building.';$('coachReport').innerHTML=`<strong>${top?displayTicker(top.ticker)+' leads training':'Coach waiting for fresh data'}</strong><p>${top?`${displayTicker(top.ticker)} is currently the standout performer with a score of ${topScore}. The elite group contains ${elite.length} player${elite.length===1?'':'s'}, while the medical room keeps an eye on lower-score holdings.`:'No player development data is available yet.'}</p>`;$('risingStars').innerHTML=ps.slice(0,8).map((p,i)=>{const s=Math.round(p._score||0);return row(i===0?'🔥':'📈',`${displayTicker(p.ticker)} training well`,`${displayName(p)}${Number.isFinite(p._yield)?' • '+p._yield.toFixed(1)+'% yield':''}`,`${s}`,cls(s))}).join('')||'<div class="loading">No rising stars found.</div>';$('medicalRoom').innerHTML=risks.length?risks.map(p=>{const s=Math.round(p._score||0);return row('🩺',`${displayTicker(p.ticker)} needs monitoring`,`${displayName(p)} is below first-team training threshold.`,`${s}`,'red')}).join(''):[row('✅','Medical room clear','No major low-score players detected in the current training pool.','Clear'),row('🛡️','Risk control active','Keep watching dividend health, price weakness and impact changes.','Monitor','amber')].join('');$('formList').innerHTML=ps.slice(0,10).map(p=>{const s=Math.round(p._score||0);return row('🏃',`${displayTicker(p.ticker)} — ${status(s)}`,`${displayName(p)}${Number.isFinite(p._yield)?' • '+p._yield.toFixed(1)+'% yield':''}`,`${s}`,cls(s))}).join('')||'<div class="loading">No form data found.</div>';$('trainingFocus').innerHTML=[row('⭐','Elite group',elite.length?elite.map(p=>displayTicker(p.ticker)).slice(0,4).join(', '):'Find next 90+ candidate',`${elite.length}`),row('🎯','Development focus',top?`${displayTicker(top.ticker)} is the benchmark`:'Build score history','Active'),row('🩺','Medical watch',risks.length?`${risks.length} players need monitoring`:'No major issues',risks.length?'Watch':'Clear',risks.length?'amber':'')].join('')}
$('refreshBtn')?.addEventListener('click',()=>{AURORA_MASTER_CACHE=null;loadAuroraData();});loadAuroraData();if(window.AuroraFC)AuroraFC.registerServiceWorker()

(()=>{
  'use strict';
  const PLAN_KEY='aurora_m4_plan_v1';
  const DEPLOYMENT_KEY='aurora_monthly_deployment_v1';
  const LIFECYCLE_KEY='aurora_m4_signing_lifecycle_v1';
  const METRICS_KEY='aurora_m4_last_metrics_v1';
  const REFRESH_KEY='aurora_m4_last_refresh_v1';
  const defaults={corePot:25000,coreMonthly:2500,etfPot:8000,etfMonthly:1000,paydayMonthly:1500,months:10,currentMonth:1,monthlyTarget:625,startingIncome:4220,version:4};
  const q=id=>document.getElementById(id);
  const num=value=>{const n=Number(String(value??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:NaN};
  const money=value=>Number.isFinite(value)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(value):'—';
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(_){return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}};
  function plan(){return {...defaults,...read(PLAN_KEY,{})};}
  function savePlan(next){const clean={...defaults,...next,updatedAt:new Date().toISOString(),version:4};write(PLAN_KEY,clean);write(DEPLOYMENT_KEY,{corePot:clean.corePot,coreMonthly:clean.coreMonthly,etfPot:clean.etfPot,etfMonthly:clean.etfMonthly,currentMonth:clean.currentMonth,updatedAt:clean.updatedAt,m4:true});return clean;}
  function migrate(){
    const existing=read(PLAN_KEY,null);
    if(!existing){
      const old=read(DEPLOYMENT_KEY,{});
      savePlan({...defaults,currentMonth:Number.isFinite(num(old.currentMonth))?Math.max(1,num(old.currentMonth)):1});
    }
  }
  function active(row){const status=String(row?.status??row?.holding_status??row?.active??'').toLowerCase();const shares=num(row?.shares??row?.quantity??row?.units);return !/(sold|closed|inactive|former|exited)/.test(status)&&(!Number.isFinite(shares)||shares>0);}
  function ticker(row){return String(row?.ticker??row?.symbol??row?.Ticker??'').toUpperCase().replace(/^LON:/,'').trim();}
  function rowValue(row){for(const key of ['market_value','current_value','holding_value','value','Market Value','Current Value']){const n=num(row?.[key]);if(Number.isFinite(n)&&n>=0)return n}const shares=num(row?.shares??row?.quantity??row?.units),price=num(row?.live_price_gbp??row?.live_price??row?.price_gbp??row?.price);return Number.isFinite(shares)&&Number.isFinite(price)?shares*price:0;}
  function rowIncome(row){for(const key of ['annual_dps_total','annual_income','income_annual','dividend_income','Annual Income']){const n=num(row?.[key]);if(Number.isFinite(n)&&n>=0)return n}const value=rowValue(row);let y=num(row?.yield_pct??row?.yield??row?.Yield??row?.dividend_yield);if(Number.isFinite(y)){if(y>1)y/=100;return value*y}return 0;}
  function metrics(){
    let rows=[];
    try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))rows=state.holdings}catch(_){}
    const holdings=rows.filter(active);
    let annual=holdings.reduce((sum,row)=>sum+rowIncome(row),0);
    let value=holdings.reduce((sum,row)=>sum+rowValue(row),0);
    const saved=read(METRICS_KEY,{});
    if(!(annual>0))annual=Number.isFinite(num(saved.annual))?num(saved.annual):plan().startingIncome;
    let yieldRate=value>0?annual/value:num(saved.yieldRate);
    if(!(yieldRate>0&&yieldRate<.5))yieldRate=.0627033333;
    const output={annual,value,yieldRate,holdings:holdings.length,at:new Date().toISOString()};
    if(rows.length)write(METRICS_KEY,output);
    return output;
  }
  function releaseAt(p,month){const m=Math.max(1,month);const core=Math.max(0,Math.min(p.coreMonthly,p.corePot-(m-1)*p.coreMonthly));const etf=Math.max(0,Math.min(p.etfMonthly,p.etfPot-(m-1)*p.etfMonthly));return {core,etf,total:core+etf};}
  function projections(p,m){
    const baseCapital=p.corePot+p.etfPot;
    const paydayCapital=p.paydayMonthly*p.months;
    const fullCapital=baseCapital+paydayCapital;
    const baseFinal=m.annual+baseCapital*m.yieldRate;
    const fullFinal=m.annual+fullCapital*m.yieldRate;
    let annual=m.annual,targetMonth=null,totalBase=0,totalFull=0;
    const rows=[];
    for(let month=1;month<=Math.max(120,p.months);month++){
      const release=month<=p.months?releaseAt(p,month):{core:0,etf:0,total:0};
      const payday=p.paydayMonthly;
      totalBase+=release.total;
      totalFull+=release.total+payday;
      annual+=((release.total+payday)*m.yieldRate);
      if(month<=p.months)rows.push({month,release,payday,base:release.total,full:release.total+payday,baseIncome:m.annual+totalBase*m.yieldRate,fullIncome:m.annual+totalFull*m.yieldRate});
      if(targetMonth===null&&annual/12>=p.monthlyTarget)targetMonth=month;
    }
    return {baseCapital,paydayCapital,fullCapital,baseFinal,fullFinal,targetMonth,rows};
  }
  function transferPlan(){const x=read('aurora_transfer_plan_v2',{});return x;}
  function lifecycle(){
    const p=plan(),tp=transferPlan(),payday=read('aurora_payday_execution_v1',{}),receipt=read('aurora_m3_last_transfer_receipt_v1',{}),lastReg=read('aurora_registration_last_v1',{}),saved=read(LIFECYCLE_KEY,{});
    const route=Array.isArray(tp.rows)?tp.rows:Array.isArray(tp.route)?tp.route:[];
    const routeTickers=route.map(x=>ticker(x.row||x)).filter(Boolean);
    const purchased=Boolean(payday.completedAt||receipt.completedAt||saved.purchasedAt);
    const registered=Boolean(lastReg.at||saved.registeredAt);
    const regTicker=ticker(lastReg)||ticker({ticker:lastReg.ticker})||saved.ticker||'';
    let holdings=[];try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))holdings=state.holdings.filter(active)}catch(_){}
    const inSquad=registered&&regTicker&&holdings.some(row=>ticker(row)===regTicker);
    const stage=inSquad?5:registered?4:purchased?3:(route.length||tp.updatedAt)?2:1;
    const output={...saved,stage,routeTickers,purchasedAt:payday.completedAt||receipt.completedAt||saved.purchasedAt||'',registeredAt:lastReg.at||saved.registeredAt||'',ticker:regTicker||saved.ticker||'',updatedAt:new Date().toISOString()};write(LIFECYCLE_KEY,output);return output;
  }
  function insertScoutingLink(){
    const nav=document.querySelector('.fm-side-scroll');if(!nav||nav.querySelector('#scoutingSideMenu')||[...nav.querySelectorAll('a,summary')].some(a=>/Scouting Centre/i.test(a.textContent)))return;
    const recruitment=[...nav.querySelectorAll('.fm-nav-group')].find(x=>/Recruitment/i.test(x.textContent));if(!recruitment)return;
    const link=document.createElement('a');link.className='fm-side-link';link.href='AuroraCityFC_ScoutingCentre.html';link.innerHTML='<span class="fm-side-icon">⌕</span><span>Scouting Centre</span>';recruitment.insertAdjacentElement('afterend',link);
  }
  function syncNative(p,emit=false){
    const map={corePotInput:p.corePot,coreMonthlyInput:p.coreMonthly,etfPotInput:p.etfPot,etfMonthlyInput:p.etfMonthly,deploymentMonthInput:p.currentMonth};
    Object.entries(map).forEach(([id,value])=>{const el=q(id);if(el&&String(el.value)!==String(value)){el.value=value;if(emit){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}});
    const start=q('startingIncomeInput');if(start&&!start.value)start.value=p.startingIncome;
  }
  function health(p,m,life){
    let holdings=[];try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))holdings=state.holdings.filter(active)}catch(_){}
    const broken=[...document.images].filter(img=>img.complete&&img.naturalWidth===0).length;
    const names=holdings.map(ticker).filter(Boolean),dupes=[...new Set(names.filter((x,i)=>names.indexOf(x)!==i))];
    const hasScout=[...document.querySelectorAll('.fm-side-scroll a,.fm-side-scroll summary')].some(a=>/Scouting Centre/i.test(a.textContent));
    const lastRefresh=read(REFRESH_KEY,{});
    const checks=[
      {level:holdings.length?'ok':'warn',name:'AuroraMaster holdings',detail:holdings.length?`${holdings.length} active rows`:'waiting for data'},
      {level:hasScout?'ok':'bad',name:'Universal navigation',detail:hasScout?'8 departments linked':'Scouting link missing'},
      {level:broken?'warn':'ok',name:'Player and hero images',detail:broken?`${broken} failed image${broken===1?'':'s'}`:'all loaded'},
      {level:'ok',name:'Investment plan',detail:`${money(p.corePot+p.etfPot)} capital mission`},
      {level:dupes.length?'ok':'ok',name:'Account consolidation',detail:dupes.length?`${dupes.length} multi-account ticker${dupes.length===1?'':'s'} combined`:'no duplicates'},
      {level:lastRefresh.success===false?'warn':'ok',name:'Refresh protection',detail:lastRefresh.at?new Date(lastRefresh.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'ready'}
    ];
    const bad=checks.filter(x=>x.level==='bad').length,warn=checks.filter(x=>x.level==='warn').length;
    return {checks,level:bad?'bad':warn?'warn':'ok',label:bad?'Critical data issue':warn?'Attention required':'All systems operational'};
  }
  function missionMarkup(){return `<section id="auroraM4Mission" aria-label="Aurora M4 integrated mission control">
    <header class="m4-mission-head"><div><span class="m4-mission-kicker">Aurora M4 • integrated investment mission</span><h3>Ten-Month Income-Building Command</h3><p>One shared plan now controls the Transfer Centre, Analysis Room, Manager Dashboard and Boardroom. The £33,000 capital-release mission stays separate from the optional ten £1,500 paydays.</p></div><span class="m4-system-chip" id="m4SystemChip"><i></i><span>Checking systems</span></span></header>
    <div class="m4-mission-grid">
      <article class="m4-stat featured"><small>Capital-release mission</small><strong id="m4BaseCapital">—</strong><span>£25,000 share pot + £8,000 ETF pot</span></article>
      <article class="m4-stat"><small>Full 10-month cashflow</small><strong id="m4FullCapital">—</strong><span>Capital mission plus ten £1,500 paydays</span></article>
      <article class="m4-stat"><small>Base final income</small><strong id="m4BaseFinal">—</strong><span id="m4BaseFinalNote">At the current portfolio yield</span></article>
      <article class="m4-stat"><small>Full final income</small><strong id="m4FullFinal">—</strong><span id="m4FullFinalNote">Including regular paydays</span></article>
      <article class="m4-stat"><small>Progress to £625/month</small><strong id="m4TargetProgress">—</strong><span id="m4TargetNote">Calculating target month</span><div class="m4-target-track"><i id="m4TargetFill"></i></div></article>
    </div>
    <div class="m4-lifecycle"><div class="m4-lifecycle-title"><span>Signing lifecycle</span><span id="m4LifecycleStatus">Checking transfer state</span></div><div class="m4-lifecycle-steps" id="m4LifecycleSteps"></div></div>
    <details class="m4-mission-details"><summary>Plan editor, month-by-month schedule and system health</summary><div class="m4-details-body">
      <div class="m4-plan-editor"><div class="m4-editor-grid">
        <label class="m4-field"><span>Existing share pot</span><b>£</b><input id="m4CorePot" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>Share-pot release</span><b>£</b><input id="m4CoreMonthly" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>ETF-sale pot</span><b>£</b><input id="m4EtfPot" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>ETF monthly release</span><b>£</b><input id="m4EtfMonthly" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>Regular payday</span><b>£</b><input id="m4PaydayMonthly" type="number" min="0" step="50"></label>
        <label class="m4-field"><span>Current plan month</span><b>#</b><input id="m4CurrentMonth" type="number" min="1" max="120" step="1"></label>
      </div><button class="m4-save" id="m4SavePlan" type="button">Save and sync the Aurora plan</button><span class="m4-editor-note">The base mission reports £33,000 invested. The full-cashflow view reports £48,000 when all ten regular paydays are included.</span></div>
      <div class="m4-health-box"><div class="m4-health-list" id="m4HealthList"></div></div>
      <div class="m4-month-table-wrap"><table class="m4-month-table"><thead><tr><th>Month</th><th>Share pot</th><th>ETF release</th><th>Capital mission</th><th>With payday</th><th>Base monthly income</th><th>Full monthly income</th></tr></thead><tbody id="m4MonthRows"></tbody></table></div>
    </div></details><div class="m4-updated" id="m4Updated">M4 plan loading…</div>
  </section>`;}
  function inject(){
    if(q('auroraM4Mission'))return;
    const hero=document.querySelector('.aurora-photo-hero,.hq-hero,.hero');
    if(hero)hero.insertAdjacentHTML('afterend',missionMarkup());
    else{const main=document.querySelector('main,.fm-workspace,.app');if(main)main.insertAdjacentHTML('afterbegin',missionMarkup());}
    q('m4SavePlan')?.addEventListener('click',()=>{
      const p=savePlan({corePot:Math.max(0,num(q('m4CorePot')?.value)||0),coreMonthly:Math.max(0,num(q('m4CoreMonthly')?.value)||0),etfPot:Math.max(0,num(q('m4EtfPot')?.value)||0),etfMonthly:Math.max(0,num(q('m4EtfMonthly')?.value)||0),paydayMonthly:Math.max(0,num(q('m4PaydayMonthly')?.value)||0),currentMonth:Math.max(1,Math.round(num(q('m4CurrentMonth')?.value)||1))});syncNative(p,true);update();
    });
  }
  function renderLifecycle(life){
    const labels=[['Plan approved','Deal sheet configured'],['Funds ready','Monthly release available'],['Purchases completed','Broker fills recorded'],['Registered','AuroraData updated'],['Added to squad','Holding confirmed live']];
    q('m4LifecycleSteps').innerHTML=labels.map((item,index)=>{const n=index+1;return `<div class="m4-step ${life.stage>n?'done':life.stage===n?'current':''}" data-step="${n}"><strong>${item[0]}</strong><span>${n===4&&life.ticker?`${life.ticker} latest registration`:item[1]}</span></div>`}).join('');
    const stageText=['Mission configured','Funds and route ready','Purchase execution complete','Registration confirmed','Signing live in the squad'][Math.max(0,life.stage-1)];q('m4LifecycleStatus').textContent=stageText;
  }
  function renderMediaStory(life){
    const box=q('breakingStories');if(!box||life.stage<3)return;
    const existing=q('m4SigningStory');if(existing)return;
    const tickerText=life.ticker||life.routeTickers?.join(' / ')||'Aurora signing';
    const node=document.createElement('div');node.id='m4SigningStory';node.className='row m4-signing-story';node.innerHTML=`<div class="icon">📝</div><div><strong>${tickerText} — signing lifecycle update</strong><span>${life.stage>=5?'Registration confirmed and the player is now live in the Aurora squad.':life.stage>=4?'Purchase registered with AuroraData; awaiting the refreshed squad confirmation.':'Broker purchases completed; registration is the next action.'}</span></div><div class="score-pill">M4</div>`;box.prepend(node);
  }
  function update(){
    inject();insertScoutingLink();const p=plan();syncNative(p,false);const m=metrics(),proj=projections(p,m),life=lifecycle(),h=health(p,m,life);
    [['m4CorePot',p.corePot],['m4CoreMonthly',p.coreMonthly],['m4EtfPot',p.etfPot],['m4EtfMonthly',p.etfMonthly],['m4PaydayMonthly',p.paydayMonthly],['m4CurrentMonth',p.currentMonth]].forEach(([id,value])=>{const el=q(id);if(el&&document.activeElement!==el)el.value=value});
    q('m4BaseCapital').textContent=money(proj.baseCapital);q('m4FullCapital').textContent=money(proj.fullCapital);q('m4BaseFinal').textContent=`${money(proj.baseFinal)}/yr`;q('m4FullFinal').textContent=`${money(proj.fullFinal)}/yr`;q('m4BaseFinalNote').textContent=`${money(proj.baseFinal/12)}/month at ${(m.yieldRate*100).toFixed(2)}%`;q('m4FullFinalNote').textContent=`${money(proj.fullFinal/12)}/month including paydays`;
    const progress=Math.max(0,Math.min(100,(m.annual/12)/p.monthlyTarget*100));q('m4TargetProgress').textContent=`${progress.toFixed(1)}%`;q('m4TargetFill').style.width=`${progress}%`;q('m4TargetNote').textContent=proj.targetMonth?`Full-cashflow route reaches target around month ${proj.targetMonth}`:`Target remains beyond the 10-month mission`;
    q('m4MonthRows').innerHTML=proj.rows.map(row=>`<tr><td><strong>Month ${row.month}</strong></td><td>${money(row.release.core)}</td><td>${money(row.release.etf)}</td><td class="m4-base">${money(row.base)}</td><td class="m4-full">${money(row.full)}</td><td>${money(row.baseIncome/12)}</td><td>${money(row.fullIncome/12)}</td></tr>`).join('');
    renderLifecycle(life);const chip=q('m4SystemChip');chip.className=`m4-system-chip ${h.level==='ok'?'':h.level}`.trim();chip.querySelector('span').textContent=h.label;q('m4HealthList').innerHTML=h.checks.map(x=>`<div class="m4-health-row ${x.level}"><i></i><strong>${x.name}</strong><span>${x.detail}</span></div>`).join('');q('m4Updated').textContent=`Shared plan synced ${p.updatedAt?new Date(p.updatedAt).toLocaleString('en-GB'):'for Aurora M4'} • Live planning yield ${(m.yieldRate*100).toFixed(2)}%`;
    renderMediaStory(life);
  }
  function bind(){
    document.addEventListener('click',event=>{
      if(event.target.closest('#refreshBtn')){write(REFRESH_KEY,{at:new Date().toISOString(),success:true});setTimeout(update,1800);setTimeout(update,6000);}
      if(event.target.closest('#completePaydayWindow'))setTimeout(()=>{const saved=read(LIFECYCLE_KEY,{});write(LIFECYCLE_KEY,{...saved,purchasedAt:new Date().toISOString(),stage:3});update();},500);
    },true);
    document.addEventListener('submit',event=>{if(event.target.closest?.('[data-registration-form]'))setTimeout(update,2400);},true);
    ['corePotInput','coreMonthlyInput','etfPotInput','etfMonthlyInput','deploymentMonthInput'].forEach(id=>q(id)?.addEventListener('change',()=>{const p=plan();const values={corePot:num(q('corePotInput')?.value),coreMonthly:num(q('coreMonthlyInput')?.value),etfPot:num(q('etfPotInput')?.value),etfMonthly:num(q('etfMonthlyInput')?.value),currentMonth:num(q('deploymentMonthInput')?.value)};savePlan({...p,...Object.fromEntries(Object.entries(values).filter(([,v])=>Number.isFinite(v)))});update();}));
    window.addEventListener('storage',event=>{if([PLAN_KEY,LIFECYCLE_KEY,'aurora_registration_last_v1','aurora_payday_execution_v1'].includes(event.key))update();});
    window.addEventListener('aurora:m4-update',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
  }
  function start(){migrate();inject();bind();syncNative(plan(),true);update();setTimeout(update,1800);setTimeout(update,5500);}
  window.AuroraM4={plan,savePlan,update,metrics,lifecycle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(() => {
  "use strict";
  const menu = document.querySelector('.aurora-page-folder');
  if (!menu) return;
  const links = [...menu.querySelectorAll('.fm-page-submenu a[href^="#"]')];
  const pairs = links.map(link => ({link, target:document.getElementById(link.getAttribute('href').slice(1))})).filter(x => x.target);
  if (!pairs.length) return;

  const mark = id => {
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  };

  const scrollToHash = hash => {
    const target = document.getElementById(String(hash || '').replace(/^#/,''));
    if (!target) return false;
    menu.open = true;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    mark(target.id);
    return true;
  };

  links.forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || !scrollToHash(hash)) return;
    event.preventDefault();
    try { history.replaceState(null,'',hash); } catch (_) {}
  }));

  let ticking = false;
  const syncActive = () => {
    ticking = false;
    const guide = Math.max(110, window.innerHeight * .28);
    let current = pairs[0];
    for (const pair of pairs) {
      if (pair.target.getBoundingClientRect().top <= guide) current = pair;
      else break;
    }
    mark(current.target.id);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncActive);
  }, {passive:true});
  window.addEventListener('resize', syncActive, {passive:true});
  window.addEventListener('hashchange', () => {
    if (location.hash) scrollToHash(location.hash);
    else syncActive();
  });

  if (location.hash && document.getElementById(location.hash.slice(1))) {
    window.setTimeout(() => scrollToHash(location.hash), 80);
  } else {
    syncActive();
  }
})();

(function(){
  'use strict';
  const root=document.documentElement;
  const title=(document.title||'').toLowerCase();
  const page=title.includes('manager dashboard')?'manager':title.includes('squad hub')?'squad':title.includes('analysis')?'analysis':title.includes('training')?'training':title.includes('scouting')?'scouting':title.includes('transfer')?'transfer':title.includes('boardroom')?'boardroom':title.includes('media')?'media':'aurora';
  const MOTION_KEY='aurora_motion_level_v1';
  const levels=['full','subtle','off'];
  root.dataset.auroraPage=page;

  function savedLevel(){
    try{const value=localStorage.getItem(MOTION_KEY);if(levels.includes(value))return value}catch(_){}
    return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'full';
  }
  function label(level){return level==='full'?'Full':level==='subtle'?'Subtle':'Off'}
  function applyLevel(level,announce=false){
    const next=levels.includes(level)?level:'full';root.dataset.auroraMotion=next;
    try{localStorage.setItem(MOTION_KEY,next)}catch(_){}
    const btn=document.getElementById('auroraMotionToggle');
    if(btn){const value=btn.querySelector('[data-motion-value]');if(value)value.textContent=label(next);btn.title=`Aurora animations: ${label(next)}`;btn.setAttribute('aria-label',`Aurora animations ${label(next)}. Tap to change.`)}
    if(announce) flashValue(btn);
  }
  function installToggle(){
    if(document.getElementById('auroraMotionToggle'))return;
    const footer=document.querySelector('.fm-side-footer');if(!footer)return;
    const btn=document.createElement('button');btn.type='button';btn.id='auroraMotionToggle';btn.className='fm-side-action aurora-motion-toggle';btn.innerHTML='<span class="fm-side-icon">✦</span><span>Motion: <b data-motion-value>Full</b></span>';
    const clock=footer.querySelector('.fm-side-clock');footer.insertBefore(btn,clock||null);
    btn.addEventListener('click',()=>{const current=root.dataset.auroraMotion||'full';applyLevel(levels[(levels.indexOf(current)+1)%levels.length],true)});
    applyLevel(root.dataset.auroraMotion||savedLevel());
  }
  function flashValue(el){if(!el)return;el.classList.remove('aurora-value-updated');void el.offsetWidth;el.classList.add('aurora-value-updated');setTimeout(()=>el.classList.remove('aurora-value-updated'),900)}
  function observeValue(selector){
    const el=document.querySelector(selector);if(!el)return;
    let last=el.textContent;
    new MutationObserver(()=>{const now=el.textContent;if(now!==last&&now.trim()&&now.trim()!=='—'){last=now;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true});
  }
  function refreshWave(){
    document.querySelector('.aurora-refresh-wave')?.remove();const wave=document.createElement('div');wave.className='aurora-refresh-wave';wave.setAttribute('aria-hidden','true');document.body.appendChild(wave);setTimeout(()=>wave.remove(),1200);
    if(page==='scouting'){root.classList.add('aurora-scan-boost');setTimeout(()=>root.classList.remove('aurora-scan-boost'),3200)}
  }
  function bindRefresh(){document.addEventListener('click',event=>{if(event.target.closest?.('#refreshBtn,.refresh-btn,[data-refresh]'))refreshWave()},true)}
  function decorateManager(){
    ['#beastCurrentMonthly','#beastTargetPercent','#beastRating','#monthlyIncome','#heroAnnualIncome'].forEach(observeValue);
    const badge=document.getElementById('beastNotificationCount'),button=document.getElementById('beastNotificationButton');
    if(badge&&button){let previous=Number(badge.textContent)||0;const alert=()=>{const current=badge.hidden?0:(Number(badge.textContent)||0);if(current>previous&&current>0){button.classList.remove('aurora-alert-arrival');void button.offsetWidth;button.classList.add('aurora-alert-arrival');setTimeout(()=>button.classList.remove('aurora-alert-arrival'),1400)}previous=current};new MutationObserver(alert).observe(badge,{attributes:true,childList:true,subtree:true,characterData:true});alert()}
    const strip=document.getElementById('beastHoldingStrip');const decorate=()=>{strip?.querySelectorAll('.beast-holding-card').forEach(card=>{card.classList.toggle('aurora-form-review',!!card.querySelector('.beast-status-review'));card.classList.toggle('aurora-form-strong',!!card.querySelector('.beast-status-strong'))})};if(strip){new MutationObserver(decorate).observe(strip,{childList:true,subtree:true});decorate()}
  }
  function decorateScouting(){
    const command=document.querySelector('.command-radar');if(command&&!command.querySelector('.aurora-command-blip')){[['29%','37%','0s'],['67%','29%','.7s'],['73%','68%','1.35s'],['38%','73%','2s']].forEach(([left,top,delay])=>{const dot=document.createElement('i');dot.className='aurora-command-blip';dot.style.left=left;dot.style.top=top;dot.style.setProperty('--delay',delay);command.appendChild(dot)})}
    const field=document.getElementById('radarField');const decorate=()=>{const blips=[...(field?.querySelectorAll('.radar-blip')||[])];blips.forEach((blip,index)=>{blip.style.setProperty('--aurora-blip-delay',`${(index%7)*.22}s`);blip.classList.toggle('aurora-priority-blip',index===0)})};if(field){new MutationObserver(decorate).observe(field,{childList:true,subtree:true});decorate()}
    ['#commandTitle','#kpiScouted','#kpiProspects','#kpiGems','#directorScore'].forEach(observeValue);
  }
  function decorateTransfer(){
    ['#m4TargetProgress','#m4FullCapital','#m4BaseFinal','#m4FullFinal'].forEach(observeValue);
    let lastStage='';const lifecycle=document.getElementById('m4LifecycleSteps');const decorateStages=()=>{const current=lifecycle?.querySelector('.m4-step.current');const stage=current?.dataset.step||'';if(stage&&stage!==lastStage){lastStage=stage;current.classList.add('aurora-stage-change');setTimeout(()=>current.classList.remove('aurora-stage-change'),950)}};if(lifecycle){new MutationObserver(decorateStages).observe(lifecycle,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});decorateStages()}
    const decorateRows=()=>{const rows=[...(document.querySelectorAll('#m4MonthRows tr')||[])];const month=Math.max(1,Number(document.getElementById('m4CurrentMonth')?.value)||1);rows.forEach((row,index)=>row.classList.toggle('aurora-current-plan-row',index===month-1))};const tbody=document.getElementById('m4MonthRows');if(tbody){new MutationObserver(decorateRows).observe(tbody,{childList:true,subtree:true});decorateRows()}document.getElementById('m4CurrentMonth')?.addEventListener('input',decorateRows);
    document.querySelectorAll('.registration-message').forEach(observeRegistrationMessage);
    const registration=document.getElementById('registration-desk');if(registration)new MutationObserver(()=>registration.querySelectorAll('.registration-message').forEach(observeRegistrationMessage)).observe(registration,{childList:true,subtree:true});
  }
  function observeRegistrationMessage(el){if(!el||el.dataset.motionObserved)return;el.dataset.motionObserved='1';let last=el.textContent;new MutationObserver(()=>{if(el.textContent!==last){last=el.textContent;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})}
  function decorateSquad(){
    const income=document.getElementById('annualIncome')?.closest('.squad-card');income?.classList.add('aurora-income-card');['#annualIncome','#monthlyIncome','#squadStrength'].forEach(observeValue);
    const body=document.getElementById('teamSelectionBody');const decorate=()=>{body?.querySelectorAll('.player-row').forEach(row=>{const positive=!!row.querySelector('.positive')||/[▲+]/.test(row.textContent);const negative=!!row.querySelector('.negative')||/▼/.test(row.textContent);row.classList.toggle('aurora-positive-row',positive&&!negative);row.classList.toggle('aurora-negative-row',negative)})};if(body){new MutationObserver(()=>{decorate();body.querySelectorAll('.player-row').forEach(row=>{const cls=row.classList.contains('aurora-negative-row')?'aurora-row-flash-negative':'aurora-row-flash-positive';row.classList.add(cls);setTimeout(()=>row.classList.remove(cls),1250)})}).observe(body,{childList:true,subtree:true});decorate()}
  }
  function decorateAnalysis(){
    document.getElementById('bestPerformer')?.closest('.score-card')?.classList.add('aurora-best-card');['#bestPerformer','#positiveMovers','#negativeMovers','#analysisStatus'].forEach(observeValue);
    const table=document.getElementById('playerTable');const decorate=()=>{table?.querySelectorAll('tr').forEach(row=>{if(row.querySelector('.positive'))row.classList.add('aurora-positive-row');if(row.querySelector('.negative'))row.classList.add('aurora-negative-row')})};if(table){new MutationObserver(()=>{decorate();table.querySelectorAll('tr.aurora-positive-row').forEach(r=>{r.classList.add('aurora-row-flash-positive');setTimeout(()=>r.classList.remove('aurora-row-flash-positive'),1200)});table.querySelectorAll('tr.aurora-negative-row').forEach(r=>{r.classList.add('aurora-row-flash-negative');setTimeout(()=>r.classList.remove('aurora-row-flash-negative'),1200)})}).observe(table,{childList:true,subtree:true});decorate()}
  }
  function decorateTraining(){
    ['#topHeadline','#dividendCount','#rumourCount','#pressMood'].forEach(observeValue);
    const rising=document.getElementById('risingStars'),medical=document.getElementById('medicalRoom');const decorate=()=>medical?.querySelectorAll('.row').forEach(row=>row.classList.toggle('aurora-medical-watch',!!row.querySelector('.score-pill.red')));if(rising)new MutationObserver(()=>{const first=rising.querySelector('.row:first-child');if(first)flashValue(first)}).observe(rising,{childList:true,subtree:true});if(medical){new MutationObserver(decorate).observe(medical,{childList:true,subtree:true});decorate()}
  }
  function decorateBoardroom(){['#boardConfidence','#confidenceGaugeScore','#supporterMood','#jobSecurity','#priorityObjective'].forEach(observeValue)}
  function decorateMedia(){
    ['#topHeadline','#pressMood','#dividendCount','#rumourCount'].forEach(observeValue);
    const breaking=document.getElementById('breakingStories'),divs=document.getElementById('dividendDesk');if(breaking)new MutationObserver(()=>{const first=breaking.querySelector('.row:first-child');if(first)flashValue(first)}).observe(breaking,{childList:true,subtree:true});if(divs)new MutationObserver(()=>{const first=divs.querySelector('.row:first-child');if(first)flashValue(first)}).observe(divs,{childList:true,subtree:true});
  }
  function start(){
    applyLevel(savedLevel());installToggle();bindRefresh();
    ({manager:decorateManager,scouting:decorateScouting,transfer:decorateTransfer,squad:decorateSquad,analysis:decorateAnalysis,training:decorateTraining,boardroom:decorateBoardroom,media:decorateMedia}[page]||(()=>{}))();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

})();

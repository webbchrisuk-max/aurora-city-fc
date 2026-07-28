
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


(()=>{
  'use strict';
  const SETTINGS_KEY='aurora_beast_dashboard_settings_v1';
  const ORDER_KEY='aurora_beast_dashboard_order_v1';
  const READ_KEY='aurora_beast_alerts_read_v1';
  const DECISION_KEY='aurora_beast_decision_state_v1';
  const ACTION_LOG_KEY='aurora_beast_action_log_v1';
  const AUTO_PLAN_KEY='aurora_beast_last_logged_plan_v1';
  const AUTO_STAGE_KEY='aurora_beast_last_logged_stage_v1';
  const V2_SEED_KEY='aurora_beast_v2_seeded';
  const q=id=>document.getElementById(id);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const num=value=>{if(value===null||value===undefined||String(value).trim()==='')return NaN;const n=Number(String(value).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:NaN};
  const cash=value=>Number.isFinite(value)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:value>=1000?0:2}).format(value):'—';
  const percent=value=>Number.isFinite(value)?`${value.toFixed(2)}%`:'—';
  let sortMode='income';
  let tickerIndex=0;
  let tickerTimer=null;
  let latestAlerts=[];
  let lastRenderSignature='';
  let latestAlertSignature='';

  function settings(){
    try{return {...{compact:false,m3:true,radar:true,decisions:true,log:true,media:true,schedule:true,theme:'night',presentation:false},...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch(_){return {compact:false,m3:true,radar:true,decisions:true,log:true,media:true,schedule:true,theme:'night',presentation:false}}
  }
  function saveSettings(next){localStorage.setItem(SETTINGS_KEY,JSON.stringify(next));applySettings(next);}
  function applySettings(s=settings()){
    document.body.classList.toggle('beast-compact',!!s.compact);
    document.body.classList.toggle('beast-hide-m3',!s.m3);
    document.body.classList.toggle('beast-hide-radar',!s.radar);
    document.body.classList.toggle('beast-hide-decisions',!s.decisions);
    document.body.classList.toggle('beast-hide-log',!s.log);
    document.body.classList.toggle('beast-hide-media',!s.media);
    document.body.classList.toggle('beast-hide-schedule',!s.schedule);
    document.body.classList.toggle('beast-presentation',!!s.presentation);
    document.body.dataset.beastTheme=s.theme||'night';
    [['beastCompactToggle',s.compact],['beastM3Toggle',s.m3],['beastRadarToggle',s.radar],['beastDecisionToggle',s.decisions],['beastLogToggle',s.log],['beastMediaToggle',s.media],['beastScheduleToggle',s.schedule]].forEach(([id,val])=>{if(q(id))q(id).checked=!!val});
    q('beastPresentationButton')?.classList.toggle('active',!!s.presentation);
    document.querySelectorAll('[data-beast-theme]').forEach(btn=>btn.classList.toggle('active',btn.dataset.beastTheme===(s.theme||'night')));
  }
  function activeRows(){try{return typeof activeHoldings==='function'?activeHoldings():[]}catch(_){return []}}
  function annual(row){try{return annualIncomeFromRow(row)}catch(_){return 0}}
  function value(row){try{return holdingValue(row)}catch(_){return 0}}
  function rate(row){try{return incomeRate(row)}catch(_){return NaN}}
  function ticker(row){try{return displayTicker(row?.ticker)}catch(_){return String(row?.ticker||'—')}}
  function name(row){try{return displayName(row)}catch(_){return row?.name||ticker(row)}}
  function account(row){return String(row?.account??row?.platform??row?.broker??row?.Account??'Account unconfirmed')}
  function shares(row){return num(row?.shares??row?.quantity??row?.units??row?.Shares)}
  function price(row){return num(row?.live_price_gbp??row?.live_price??row?.current_price??row?.price_gbp??row?.price)}
  function dayMove(row){
    let n=num(row?.day_change_pct??row?.daily_change_pct??row?.change_pct??row?.price_change_pct??row?.day_move_pct);
    if(Number.isFinite(n)&&Math.abs(n)<1&&String(row?.day_change_pct??'').includes('.')===false)n*=100;
    return n;
  }
  function strength(row){try{return buyStrength(row)}catch(_){return NaN}}
  function valuation(row){
    const explicit=String(row?.valuation_status??row?.value_status??row?.valuation??row?.price_status??'').trim();if(explicit)return explicit;
    const live=price(row),target=num(row?.target_price??row?.buy_price??row?.fair_value??row?.entry_price);
    if(Number.isFinite(live)&&Number.isFinite(target)&&target>0){const diff=(live-target)/target;if(diff<=-.04)return 'Below target';if(diff<=.03)return 'Fair value';if(diff>=.08)return 'Above target';return 'Near target'}
    const s=strength(row);return Number.isFinite(s)?s>=75?'Strong value':s>=60?'Fair value':'Under review':'Live holding';
  }
  function rowStatus(row){const s=strength(row),v=valuation(row).toLowerCase();if(/above|review|weak/.test(v)||(Number.isFinite(s)&&s<55))return ['Under review','review'];if(/below|strong/.test(v)||(Number.isFinite(s)&&s>=72))return ['Strong','strong'];return ['Stable','watch']}
  function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value}catch(_){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function logEntries(){const rows=readJson(ACTION_LOG_KEY,[]);return Array.isArray(rows)?rows:[]}
  function addLog(title,detail='',type='system',icon='•',dedupeKey='',dedupeMs=300000){
    const rows=logEntries(),now=Date.now();
    if(dedupeKey&&rows.some(row=>row.dedupeKey===dedupeKey&&now-Number(row.at||0)<dedupeMs))return;
    rows.unshift({id:`${now}-${Math.random().toString(36).slice(2,7)}`,title:String(title||'Manager action'),detail:String(detail||''),type,icon,at:now,dedupeKey});
    writeJson(ACTION_LOG_KEY,rows.slice(0,60));renderActionLog();
  }
  function renderActionLog(){
    const box=q('beastActionLogList'),rows=logEntries();if(!box)return;
    box.innerHTML=rows.length?rows.map(row=>{const d=new Date(Number(row.at)||Date.now());return `<div class="beast-log-row"><span class="beast-log-icon">${esc(row.icon||'•')}</span><span><strong>${esc(row.title)}</strong>${row.detail?`<p>${esc(row.detail)}</p>`:''}</span><time class="beast-log-time" datetime="${d.toISOString()}">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}<br>${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</time></div>`}).join(''):'<div class="beast-empty-state"><strong>No actions recorded yet</strong><p>Complete a decision, open a holding, refresh Aurora or add a manual note.</p></div>';
    if(q('beastActionLogCount'))q('beastActionLogCount').textContent=`${rows.length} recorded action${rows.length===1?'':'s'}`;
  }
  function decisionState(){const value=readJson(DECISION_KEY,{});return value&&typeof value==='object'?value:{}}
  function lifecycleSnapshot(){try{return window.AuroraM4?.lifecycle?.()||{}}catch(_){return {}}}
  function decisionCandidates(){
    const m=journeyMetrics(),items=[];
    if(m.latest){const age=(Date.now()-m.latest.getTime())/36e5;if(age>8)items.push({id:'refresh-data',fingerprint:String(m.latest.getTime()),priority:'high',icon:'↻',title:'Refresh Aurora data',detail:`The newest dated row is ${age.toFixed(1)} hours old. Refresh before making a price-sensitive decision.`,meta:'Data confidence',action:'refresh',actionLabel:'Refresh now'});}
    const life=lifecycleSnapshot(),route=(life.routeTickers||[]).join(' / ');
    if(Number(life.stage||1)===1)items.push({id:'signing-stage-1',fingerprint:'stage-1',priority:'high',icon:'⇄',title:'Build the next deal sheet',detail:'No active transfer route is synced. Finalise the allocation before the next payday window.',meta:'Transfer Centre',href:'AuroraCityFC_TransferCentre.html',actionLabel:'Open Transfer Centre'});
    if(Number(life.stage)===2)items.push({id:'signing-stage-2',fingerprint:`${route}|${life.purchasedAt||''}`,priority:'high',icon:'💷',title:'Execute the payday purchases',detail:`The approved route${route?` is ${route}`:''} is ready for the broker purchase stage.`,meta:'Payday execution',href:'AuroraCityFC_TransferCentre.html#payday-execution',actionLabel:'Open execution'});
    if(Number(life.stage)===3)items.push({id:'signing-stage-3',fingerprint:String(life.purchasedAt||route),priority:'high',icon:'✓',title:'Register the completed purchases',detail:'The broker purchase has been recorded but the signing still needs to pass through registration.',meta:'Registration pending',href:'AuroraCityFC_TransferCentre.html#registration',actionLabel:'Open registration'});
    if(Number(life.stage)===4)items.push({id:'signing-stage-4',fingerprint:`${life.registeredAt||''}|${life.ticker||''}`,priority:'medium',icon:'♟',title:'Confirm the signing in the squad',detail:`${life.ticker||'The registered purchase'} has passed registration. Confirm it appears correctly in Squad Hub after the next data export.`,meta:'Squad confirmation',href:'AuroraCityFC_SquadHub.html',actionLabel:'Open Squad Hub'});
    activeRows().filter(r=>{const s=strength(r);return Number.isFinite(s)&&s<60}).sort((a,b)=>strength(a)-strength(b)).slice(0,2).forEach(row=>items.push({id:`review-${ticker(row)}`,fingerprint:`${Math.round(strength(row))}|${valuation(row)}`,priority:'medium',icon:'⚠',title:`Review ${ticker(row)} before adding funds`,detail:`Buy-strength is ${Math.round(strength(row))}. Current valuation status: ${valuation(row)}.`,meta:'Portfolio review',action:'holding',ticker:ticker(row),actionLabel:'Open profile'}));
    return items.slice(0,6);
  }
  function visibleDecisions(){const closed=decisionState();return decisionCandidates().filter(item=>closed[item.id]?.fingerprint!==item.fingerprint)}
  function decisionPrimaryAction(item){
    if(!item.actionLabel)return '';
    if(item.href){
      return `<button class="beast-decision-btn primary" type="button" data-decision-action="navigate" data-decision-href="${esc(item.href)}" data-decision-id="${esc(item.id)}">${esc(item.actionLabel)} <span aria-hidden="true">→</span></button>`;
    }
    return `<button class="beast-decision-btn primary" type="button" data-decision-action="${esc(item.action||'open')}" data-decision-id="${esc(item.id)}">${esc(item.actionLabel)} <span aria-hidden="true">→</span></button>`;
  }
  function renderDecisions(){
    const box=q('beastDecisionList');if(!box)return;const items=visibleDecisions();
    box.innerHTML=items.length?items.map(item=>`<div class="beast-decision ${item.priority}"><span class="beast-decision-icon">${esc(item.icon)}</span><div class="beast-decision-copy"><div class="beast-decision-top"><strong>${esc(item.title)}</strong><span class="beast-decision-priority">${esc(item.priority)}</span></div><p>${esc(item.detail)}</p><div class="beast-decision-meta"><span>${esc(item.meta)}</span><span>•</span><span>Persists until resolved</span></div><div class="beast-decision-actions">${decisionPrimaryAction(item)}<button class="beast-decision-btn complete" type="button" data-decision-action="complete" data-decision-id="${esc(item.id)}">Complete</button><button class="beast-decision-btn dismiss" type="button" data-decision-action="dismiss" data-decision-id="${esc(item.id)}">Dismiss</button></div></div></div>`).join(''):'<div class="beast-empty-state"><strong>Decision queue clear</strong><p>No unresolved manager decisions are waiting. Aurora will add new items automatically when the data or transfer lifecycle changes.</p></div>';
    const count=items.length;if(q('beastDecisionPanelCount'))q('beastDecisionPanelCount').textContent=`${count} pending`;const badge=q('beastDecisionCount');if(badge){badge.hidden=count===0;badge.textContent=String(count)}
  }
  function findDecision(id){return decisionCandidates().find(item=>item.id===id)}
  function closeDecision(item,outcome){if(!item)return;const state=decisionState();state[item.id]={fingerprint:item.fingerprint,outcome,at:Date.now()};writeJson(DECISION_KEY,state);addLog(`${outcome==='completed'?'Completed':'Dismissed'}: ${item.title}`,item.detail,'decision',outcome==='completed'?'✓':'×',`decision-${outcome}-${item.id}-${item.fingerprint}`,0);renderDecisions()}
  function handleDecision(action,id,source){
    const item=findDecision(id);if(!item)return;
    if(action==='complete'||action==='dismiss'){closeDecision(item,action==='complete'?'completed':'dismissed');return;}
    if(action==='refresh'){closeDecisionQueue();setTimeout(()=>q('refreshBtn')?.click(),80);return;}
    if(action==='holding'&&item.ticker){
      closeDecisionQueue();
      setTimeout(()=>openDrawer(item.ticker),180);
      return;
    }
    const href=source?.dataset?.decisionHref||item.href;
    if(action==='navigate'&&href){
      addLog(`Opened: ${item.title}`,item.meta,'navigation','→',`open-${item.id}`,60000);
      closeDecisionQueue();
      setTimeout(()=>window.location.assign(href),90);
      return;
    }
    if(item.href){
      addLog(`Opened: ${item.title}`,item.meta,'navigation','→',`open-${item.id}`,60000);
      closeDecisionQueue();
      setTimeout(()=>window.location.assign(item.href),90);
    }
  }
  function syncAutomaticLog(){
    if(!localStorage.getItem(V2_SEED_KEY)){localStorage.setItem(V2_SEED_KEY,'1');addLog('BEAST V2 command tools activated','Decision Queue and Manager Action Log are now live.','system','🔥','beast-v2-seed',0);}
    const plan=transferPlan();if(plan?.rows?.length){const sig=JSON.stringify({rows:plan.rows.map(r=>r.displayTicker||r.ticker),income:num(plan.totalIncome),budget:num(plan.totalBudget??plan.budget)}),prev=localStorage.getItem(AUTO_PLAN_KEY);if(prev!==sig){addLog(prev?'Transfer deal sheet updated':'Transfer deal sheet connected',`${plan.rows.map(r=>r.displayTicker||r.ticker).join(' / ')} • ${cash(num(plan.totalIncome))}/year estimated income.`,'transfer','⇄','plan-'+sig,0);localStorage.setItem(AUTO_PLAN_KEY,sig)}}
    const life=lifecycleSnapshot(),stage=Number(life.stage||1),stageSig=`${stage}|${(life.routeTickers||[]).join(',')}|${life.purchasedAt||''}|${life.registeredAt||''}|${life.ticker||''}`,prevStage=localStorage.getItem(AUTO_STAGE_KEY);if(prevStage&&prevStage!==stageSig){const titles={1:'Transfer lifecycle reset to planning',2:'Deal sheet moved to funds-ready',3:'Payday purchase marked complete',4:'Purchase registration completed',5:'New signing confirmed in squad'};addLog(titles[stage]||'Transfer lifecycle updated',stage===2?(life.routeTickers||[]).join(' / '):life.ticker||'Aurora transfer workflow advanced.','transfer',stage>=4?'✓':'⇄','stage-'+stageSig,0)}localStorage.setItem(AUTO_STAGE_KEY,stageSig);
  }
  function historyFor(t){
    const target=String(t||'').replace('.L','').replace('LON:','').toUpperCase();
    const rows=[...(state?.dailyPriceSummary||[]),...(state?.priceLog||[]),...(state?.livePrices||[])];
    const parsed=rows.map((r,i)=>{
      const rt=String(r?.ticker??r?.Ticker??r?.symbol??r?.Symbol??'').replace('.L','').replace('LON:','').toUpperCase();if(rt!==target)return null;
      const change=num(r?.day_change_pct??r?.change_pct??r?.daily_change_pct??r?.pct_change??r?.percent_change);
      const dt=new Date(r?.timestamp??r?.date_time??r?.datetime??r?.date??r?.Date??0).getTime();return Number.isFinite(change)?{change,time:Number.isFinite(dt)?dt:i}:null;
    }).filter(Boolean).sort((a,b)=>b.time-a.time).slice(0,5).reverse();
    if(parsed.length)return parsed.map(x=>x.change>.05?'W':x.change<-.05?'L':'D');
    return ['D','D','D','D','D'];
  }
  function formMarkup(form,tag='i'){return form.map(x=>`<${tag} class="${x.toLowerCase()}">${x}</${tag}>`).join('')}
  function sortedRows(){
    const rows=[...activeRows()];
    if(sortMode==='value')rows.sort((a,b)=>value(b)-value(a));
    else if(sortMode==='yield')rows.sort((a,b)=>(rate(b)||0)-(rate(a)||0));
    else rows.sort((a,b)=>annual(b)-annual(a));
    return rows;
  }
  function renderRadar(){
    const box=q('beastHoldingStrip');if(!box)return;
    const rows=sortedRows();
    box.innerHTML=rows.length?rows.map(row=>{const [status,cls]=rowStatus(row);const y=rate(row);const move=dayMove(row);return `<button class="beast-holding-card" type="button" data-beast-ticker="${ticker(row)}"><div class="beast-holding-top"><div class="beast-holding-id"><span class="beast-holding-badge">${ticker(row).slice(0,5)}</span><span><strong>${ticker(row)}</strong><span>${name(row)}</span></span></div><span class="beast-form">${formMarkup(historyFor(ticker(row)))}</span></div><div class="beast-holding-main"><span><small>Market value</small><strong>${cash(value(row))}</strong></span><span class="beast-holding-income"><small>Annual income</small><strong>${cash(annual(row))}</strong></span></div><div class="beast-holding-footer"><span>${Number.isFinite(y)?percent(y*100)+' yield':'Yield —'}</span><span class="beast-status-${cls}">${status}${Number.isFinite(move)?` • ${move>=0?'+':''}${move.toFixed(2)}%`:''}</span></div></button>`}).join(''):'<div class="loading">No active holdings found.</div>';
  }
  function transferPlan(){try{return typeof readTransferPlanSnapshot==='function'?readTransferPlanSnapshot():null}catch(_){return null}}
  function journeyMetrics(){
    const rows=activeRows(),income=rows.reduce((s,r)=>s+annual(r),0),monthly=income/12,val=rows.reduce((s,r)=>s+value(r),0),yieldRate=val>0?income/val:NaN,plan=transferPlan(),boost=Number.isFinite(num(plan?.totalIncome))?num(plan.totalIncome):0,projected=monthly+boost/12;
    let board=75;try{board=boardScore(monthly,val,yieldRate)}catch(_){}
    const latest=(()=>{try{return latestDataTimestamp()}catch(_){return null}})();const fresh=!latest||((Date.now()-latest.getTime())/36e5)<8;
    const rating=clamp(5.5+(monthly/625)*2.1+(board/100)*1.15+(Number.isFinite(yieldRate)?clamp(yieldRate/.08,0,1)*.7:.35)+(plan?.rows?.length?.45:0)+(fresh?.25:0),5.5,9.9);
    return {income,monthly,val,yieldRate,plan,boost,projected,board,rating,latest};
  }
  function renderJourney(){
    const m=journeyMetrics(),progress=clamp(m.monthly/625*100,0,100),gap=Math.max(0,625-m.monthly);q('beastCurrentMonthly').textContent=cash(m.monthly);q('beastTargetPercent').textContent=`${progress.toFixed(1)}% of £625`;q('beastTargetRing').style.setProperty('--progress',`${progress*3.6}deg`);
    const projectedText=m.boost>0?`The synced deal sheet adds ${cash(m.boost)}/year, lifting the projected run rate to ${cash(m.projected)} per month.`:'The next deal-sheet impact will appear here when the Transfer Centre route is synced.';
    q('beastJourneySummary').textContent=`Current gap: ${cash(gap)} per month. ${projectedText}`;
    const milestones=[350,425,500,625];let currentMarked=false;q('beastMilestones').innerHTML=milestones.map((target,index)=>{const hit=m.monthly>=target;const current=!hit&&!currentMarked?(currentMarked=true,true):false;return `<div class="beast-milestone ${hit?'hit':current?'current':''}"><small>${hit?'Promoted':current?'Next division':'Future division'}</small><strong>${cash(target)}/m</strong><span>${hit?'Milestone achieved':cash(Math.max(0,target-m.monthly))+' remaining'}</span></div>`}).join('');
    q('beastManagerRating').textContent=m.rating.toFixed(1);const title=m.rating>=9.2?'Elite Income Architect':m.rating>=8.5?'Outstanding Rebuild':m.rating>=7.7?'Strong Manager Performance':m.rating>=6.8?'Steady Progress':'Rebuild in Development';q('beastManagerTitle').textContent=title;q('beastManagerNote').textContent=`Board ${m.board}/100 • ${Number.isFinite(m.yieldRate)?percent(m.yieldRate*100):'Yield building'} • ${m.plan?.rows?.length?'Deal sheet synced':'Route awaiting sync'}`;q('beastRatingStars').textContent='★'.repeat(Math.round(m.rating/2))+'☆'.repeat(5-Math.round(m.rating/2));
  }
  function alertData(){
    const m=journeyMetrics(),alerts=[];const now='Now';
    if(m.latest){const age=(Date.now()-m.latest.getTime())/36e5;if(age>8)alerts.push({level:age>26?'bad':'warn',icon:'↻',title:'Aurora data needs a refresh',text:`The newest dated row is ${age.toFixed(1)} hours old.`,time:'Data'});}
    if(m.plan?.rows?.length)alerts.push({level:'ok',icon:'⇄',title:'Payday route is synced',text:`${m.plan.rows.map(r=>r.displayTicker||r.ticker).join(' / ')} • ${cash(num(m.plan.totalIncome))}/year estimated income.`,time:'Transfer'});else alerts.push({level:'warn',icon:'⇄',title:'Transfer deal sheet not synced',text:'Open the Transfer Centre before payday so the dashboard can read the final allocation.',time:'Transfer'});
    try{const d=nextDividendPayment();if(d)alerts.push({level:'ok',icon:'💷',title:`${d.ticker} dividend is next`,text:`Due ${d.date.toLocaleDateString('en-GB',{day:'numeric',month:'long'})}${d.amountKnown?` • ${cash(d.amount)}`:''}.`,time:'Income'})}catch(_){}
    const weak=activeRows().filter(r=>{const s=strength(r);return Number.isFinite(s)&&s<60}).sort((a,b)=>strength(a)-strength(b)).slice(0,2);weak.forEach(r=>alerts.push({level:'warn',icon:'⚠',title:`${ticker(r)} is under review`,text:`Buy-strength score ${Math.round(strength(r))}. Open the player profile before adding more.`,time:'Squad'}));
    activeRows().forEach(r=>{const live=price(r),target=num(r?.target_price??r?.buy_price??r?.fair_value);if(Number.isFinite(live)&&Number.isFinite(target)&&live<=target)alerts.push({level:'ok',icon:'🎯',title:`${ticker(r)} has reached its target zone`,text:`Live ${live.toFixed(2)} versus target ${target.toFixed(2)}.`,time:'Price'})});
    const gap=Math.max(0,625-m.monthly);alerts.push({level:gap<=0?'ok':'info',icon:'🏆',title:gap<=0?'£625 monthly objective achieved':`${cash(gap)} per month to the target`,text:gap<=0?'Aurora has reached the primary income objective.':'The target journey updates automatically after registered purchases.',time:'Objective'});
    return alerts.slice(0,9);
  }
  function renderAlerts(){
    latestAlerts=alertData();const box=q('beastAlertList');if(box)box.innerHTML=latestAlerts.length?latestAlerts.map(a=>`<div class="beast-alert ${a.level==='info'?'':a.level}"><span class="beast-alert-icon">${a.icon}</span><span><strong>${a.title}</strong><p>${a.text}</p></span><span class="beast-alert-time">${a.time}</span></div>`).join(''):'<div class="beast-empty">No manager alerts right now.</div>';
    const signature=JSON.stringify(latestAlerts.map(a=>[a.title,a.text]));latestAlertSignature=signature;const read=localStorage.getItem(READ_KEY);const count=read===signature?0:latestAlerts.length;const badge=q('beastNotificationCount');if(badge){badge.hidden=count===0;badge.textContent=String(count)}
  }
  function tickerMessages(){
    const m=journeyMetrics(),items=[];items.push(`Manager Rating ${m.rating.toFixed(1)} • ${cash(m.monthly)}/month • ${cash(Math.max(0,625-m.monthly))} to the main objective`);
    const rows=sortedRows();if(rows[0])items.push(`Captain of income: ${ticker(rows[0])} • ${cash(annual(rows[0]))}/year • ${Number.isFinite(rate(rows[0]))?percent(rate(rows[0])*100)+' yield':'yield loading'}`);
    const movers=rows.filter(r=>Number.isFinite(dayMove(r))).sort((a,b)=>dayMove(b)-dayMove(a));if(movers[0])items.push(`Man of the match: ${ticker(movers[0])} ${dayMove(movers[0])>=0?'+':''}${dayMove(movers[0]).toFixed(2)}% today`);
    if(m.plan?.rows?.length)items.push(`Transfer route ready: ${m.plan.rows.map(r=>r.displayTicker||r.ticker).join(' / ')} • ${cash(m.boost)}/year expected income`);
    try{const d=nextDividendPayment();if(d)items.push(`Next dividend: ${d.ticker} on ${d.date.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}${d.amountKnown?` • ${cash(d.amount)}`:''}`)}catch(_){}
    items.push(`Aurora system: ${activeRows().length} active holdings • Board confidence ${m.board}/100`);return items;
  }
  function startTicker(){clearInterval(tickerTimer);const tick=()=>{const el=q('tickerText'),items=tickerMessages();if(!el||!items.length)return;el.classList.remove('beast-ticker-change');void el.offsetWidth;el.textContent=items[tickerIndex%items.length];el.classList.add('beast-ticker-change');tickerIndex++};tick();tickerTimer=setInterval(tick,6500)}
  function findRow(t){const wanted=String(t||'').replace('.L','').replace('LON:','').toUpperCase();return activeRows().find(r=>ticker(r).replace('.L','').replace('LON:','').toUpperCase()===wanted)}
  function managerVerdict(row){const [status]=rowStatus(row),y=rate(row),s=strength(row),v=valuation(row);if(status==='Under review')return `${ticker(row)} needs monitoring before further funds are committed. ${Number.isFinite(s)?`Buy-strength is ${Math.round(s)}.`:''}`;if(status==='Strong')return `${ticker(row)} is performing as a strong income-squad member. ${Number.isFinite(y)?`Current portfolio yield contribution is ${percent(y*100)}.`:''}`;return `${ticker(row)} remains a stable member of the income squad. Valuation status: ${v}.`}
  function openDrawer(t){
    const row=findRow(t);if(!row)return;addLog(`Reviewed holding: ${ticker(row)}`,`${name(row)} • ${cash(value(row))} market value • ${cash(annual(row))}/year income.`,'portfolio','♟',`holding-${ticker(row)}`,300000);const [status,cls]=rowStatus(row),y=rate(row),move=dayMove(row),form=historyFor(ticker(row));q('beastDrawerContent').innerHTML=`<div class="beast-drawer-hero"><small>${account(row)}</small><h2>${ticker(row)}</h2><p>${name(row)}</p><span class="beast-drawer-status beast-status-${cls}">${status} • ${valuation(row)}</span></div><div class="beast-drawer-metrics"><div class="beast-drawer-metric"><small>Market value</small><strong>${cash(value(row))}</strong></div><div class="beast-drawer-metric green"><small>Annual income</small><strong>${cash(annual(row))}</strong></div><div class="beast-drawer-metric"><small>Shares / units</small><strong>${Number.isFinite(shares(row))?shares(row).toLocaleString('en-GB',{maximumFractionDigits:4}):'—'}</strong></div><div class="beast-drawer-metric"><small>Live price</small><strong>${Number.isFinite(price(row))?price(row).toLocaleString('en-GB',{maximumFractionDigits:4}):'—'}</strong></div><div class="beast-drawer-metric"><small>Portfolio yield</small><strong>${Number.isFinite(y)?percent(y*100):'—'}</strong></div><div class="beast-drawer-metric ${Number.isFinite(move)&&move>=0?'green':''}"><small>Day move</small><strong>${Number.isFinite(move)?`${move>=0?'+':''}${move.toFixed(2)}%`:'—'}</strong></div></div><div class="beast-drawer-section"><h4>Recent form</h4><p>Five latest usable price sessions. W = positive, D = flat, L = negative.</p><div class="beast-drawer-form">${formMarkup(form,'span')}</div></div><div class="beast-drawer-section"><h4>Manager verdict</h4><p>${managerVerdict(row)}</p></div><div class="beast-drawer-links"><a href="AuroraCityFC_SquadHub.html">Open Squad Hub</a><a href="AuroraCityFC_AnalysisRoom.html">Open Analysis Room</a></div>`;
    q('beastDrawerOverlay').classList.add('open');q('beastHoldingDrawer').classList.add('open');document.body.style.overflow='hidden';
  }
  function closeDrawer(){q('beastDrawerOverlay')?.classList.remove('open');q('beastHoldingDrawer')?.classList.remove('open');document.body.style.overflow=''}
  function togglePanel(id,buttonId){['beastNotificationPanel','beastLayoutPanel'].forEach(pid=>{if(pid!==id)q(pid)?.classList.remove('open')});const panel=q(id);panel?.classList.toggle('open');q(buttonId)?.classList.toggle('active',panel?.classList.contains('open'));}
  function assignPanelKeys(){document.querySelectorAll('.manager-command-grid>.command-panel').forEach((panel,i)=>{if(!panel.dataset.beastKey){const h=panel.querySelector('h3')?.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');panel.dataset.beastKey=h||`panel-${i}`}panel.draggable=panel.id!=='beastDecisionQueue'})}
  function applyOrder(){try{const order=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]'),grid=document.querySelector('.manager-command-grid');if(!grid||!Array.isArray(order))return;order.forEach(key=>{const node=[...grid.children].find(x=>x.dataset?.beastKey===key);if(node)grid.appendChild(node)})}catch(_){}}
  function saveOrder(){const grid=document.querySelector('.manager-command-grid');if(grid)localStorage.setItem(ORDER_KEY,JSON.stringify([...grid.children].map(x=>x.dataset?.beastKey).filter(Boolean)))}
  function bindDrag(){let dragging=null;document.addEventListener('dragstart',e=>{if(e.target.closest('a,button,input,textarea,select,[role="button"],#beastDecisionQueue')){e.preventDefault();return}const panel=e.target.closest('.manager-command-grid>.command-panel');if(!panel||panel.draggable===false)return;dragging=panel;panel.classList.add('beast-dragging');e.dataTransfer.effectAllowed='move'});document.addEventListener('dragend',()=>{dragging?.classList.remove('beast-dragging');document.querySelectorAll('.beast-drag-over').forEach(x=>x.classList.remove('beast-drag-over'));dragging=null;saveOrder()});document.addEventListener('dragover',e=>{const target=e.target.closest('.manager-command-grid>.command-panel');if(!dragging||!target||target===dragging)return;e.preventDefault();target.classList.add('beast-drag-over')});document.addEventListener('dragleave',e=>e.target.closest('.command-panel')?.classList.remove('beast-drag-over'));document.addEventListener('drop',e=>{const target=e.target.closest('.manager-command-grid>.command-panel');if(!dragging||!target||target===dragging)return;e.preventDefault();target.classList.remove('beast-drag-over');const rect=target.getBoundingClientRect();target.parentNode.insertBefore(dragging,e.clientY<rect.top+rect.height/2?target:target.nextSibling);saveOrder()})}
  function refreshBeast(){
    syncAutomaticLog();renderDecisions();renderActionLog();
    if(!Array.isArray(state?.holdings)||!state.holdings.length)return;
    const signature=`${state.holdings.length}|${activeRows().length}|${q('heroAnnualIncome')?.textContent}|${q('lastUpdated')?.textContent}|${localStorage.getItem('aurora_transfer_plan_v2')||''}`;
    if(signature===lastRenderSignature&&q('beastHoldingStrip')?.children.length>1)return;
    renderJourney();renderRadar();renderAlerts();renderDecisions();renderActionLog();startTicker();lastRenderSignature=signature;
  }
  function openDecisionQueue(){
    const s=settings();if(!s.decisions)saveSettings({...s,decisions:true});
    renderDecisions();
    document.body.classList.add('beast-decision-open');
    q('beastDecisionOverlay')?.setAttribute('aria-hidden','false');
    q('beastDecisionButton')?.setAttribute('aria-expanded','true');
    q('beastDecisionQueue')?.setAttribute('role','dialog');
    if(q('beastDecisionQueue'))q('beastDecisionQueue').draggable=false;
    q('beastDecisionQueue')?.setAttribute('aria-modal','true');
    setTimeout(()=>q('beastDecisionClose')?.focus(),40);
  }
  function closeDecisionQueue(){
    document.body.classList.remove('beast-decision-open');
    q('beastDecisionOverlay')?.setAttribute('aria-hidden','true');
    q('beastDecisionButton')?.setAttribute('aria-expanded','false');
    q('beastDecisionQueue')?.removeAttribute('aria-modal');
  }
  function bind(){
    const revealAndScroll=(key,id)=>{const s=settings();if(!s[key])saveSettings({...s,[key]:true});setTimeout(()=>q(id)?.scrollIntoView({behavior:'smooth',block:'start'}),40)};
    q('beastDecisionButton')?.setAttribute('aria-expanded','false');
    q('beastDecisionButton')?.addEventListener('click',openDecisionQueue);
    q('beastDecisionClose')?.addEventListener('click',closeDecisionQueue);
    q('beastDecisionOverlay')?.addEventListener('click',closeDecisionQueue);
    q('beastLogButton')?.addEventListener('click',()=>revealAndScroll('log','beastActionLog'));
    q('beastNotificationButton')?.addEventListener('click',()=>togglePanel('beastNotificationPanel','beastNotificationButton'));q('beastNotificationClose')?.addEventListener('click',()=>{q('beastNotificationPanel')?.classList.remove('open');q('beastNotificationButton')?.classList.remove('active')});
    q('beastLayoutButton')?.addEventListener('click',()=>togglePanel('beastLayoutPanel','beastLayoutButton'));q('beastLayoutClose')?.addEventListener('click',()=>{q('beastLayoutPanel')?.classList.remove('open');q('beastLayoutButton')?.classList.remove('active')});
    q('beastNotificationPanel')?.addEventListener('click',()=>{if(latestAlertSignature){localStorage.setItem(READ_KEY,latestAlertSignature);q('beastNotificationCount').hidden=true}});
    q('beastPresentationButton')?.addEventListener('click',()=>{const s=settings(),next=!s.presentation;saveSettings({...s,presentation:next});addLog(`Presentation mode ${next?'enabled':'disabled'}`,'Dashboard display mode changed.','system','▣','presentation-'+next,30000)});
    [['beastCompactToggle','compact'],['beastM3Toggle','m3'],['beastRadarToggle','radar'],['beastDecisionToggle','decisions'],['beastLogToggle','log'],['beastMediaToggle','media'],['beastScheduleToggle','schedule']].forEach(([id,key])=>q(id)?.addEventListener('change',e=>saveSettings({...settings(),[key]:e.target.checked})));
    document.querySelectorAll('.beast-theme-button').forEach(btn=>btn.addEventListener('click',()=>{saveSettings({...settings(),theme:btn.dataset.beastTheme});addLog('Dashboard theme changed',btn.textContent.trim(),'system','◈','theme-'+btn.dataset.beastTheme,30000)}));
    q('beastResetLayout')?.addEventListener('click',()=>{addLog('Dashboard layout reset','Panels, theme and visibility settings returned to defaults.','system','⚙','layout-reset',0);localStorage.removeItem(SETTINGS_KEY);localStorage.removeItem(ORDER_KEY);location.reload()});
    q('refreshBtn')?.addEventListener('click',()=>addLog('Aurora data refresh requested','The Manager Dashboard requested a new AuroraMaster snapshot.','data','↻','data-refresh-click',45000));
    q('beastActionLogForm')?.addEventListener('submit',event=>{event.preventDefault();const input=q('beastActionLogInput'),value=input?.value?.trim();if(!value)return;addLog(value,'Manual manager note.','manual','✎','',0);input.value='';});
    q('beastActionLogClear')?.addEventListener('click',()=>{if(window.confirm('Clear the saved Manager Action Log?')){writeJson(ACTION_LOG_KEY,[]);renderActionLog();}});
    q('beastDecisionList')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-decision-action]');
      if(!button)return;
      event.preventDefault();
      event.stopPropagation();
      handleDecision(button.dataset.decisionAction,button.dataset.decisionId,button);
    });
    document.addEventListener('click',e=>{const sort=e.target.closest('[data-beast-sort]');if(sort){sortMode=sort.dataset.beastSort;document.querySelectorAll('[data-beast-sort]').forEach(x=>x.classList.toggle('active',x===sort));renderRadar()}const card=e.target.closest('[data-beast-ticker]');if(card)openDrawer(card.dataset.beastTicker);const preview=e.target.closest('.preview-row');if(preview){const t=preview.querySelector('strong')?.textContent;if(t&&findRow(t))openDrawer(t)}});
    q('beastDrawerClose')?.addEventListener('click',closeDrawer);q('beastDrawerOverlay')?.addEventListener('click',closeDrawer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeDecisionQueue();q('beastNotificationPanel')?.classList.remove('open');q('beastLayoutPanel')?.classList.remove('open')}if(e.key.toLowerCase()==='p'&&!/input|textarea|select/i.test(e.target.tagName)){const s=settings(),next=!s.presentation;saveSettings({...s,presentation:next});addLog(`Presentation mode ${next?'enabled':'disabled'}`,'Keyboard shortcut P used.','system','▣','presentation-'+next,30000)}});
    window.addEventListener('storage',e=>{if(['aurora_transfer_plan_v2','aurora_registration_last_v1','aurora_payday_execution_v1','aurora_m4_signing_lifecycle_v1',DECISION_KEY,ACTION_LOG_KEY].includes(e.key))setTimeout(refreshBeast,250)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshBeast()});
  }

  function enhanceBroadcastPanels(){
    const ids=['manager-media-story','manager-transfer-desk','manager-squad-report','manager-board-update','schedule-panel'];
    ids.forEach(id=>{
      const panel=q(id);if(!panel||panel.dataset.broadcastObserved)return;
      panel.dataset.broadcastObserved='1';
      let timer;
      new MutationObserver(()=>{
        clearTimeout(timer);
        panel.classList.remove('beast-panel-updated');
        void panel.offsetWidth;
        panel.classList.add('beast-panel-updated');
        timer=setTimeout(()=>panel.classList.remove('beast-panel-updated'),1100);
        if(id==='manager-board-update')updateBoardMeter();
      }).observe(panel,{childList:true,subtree:true,characterData:true});
    });
    updateBoardMeter();
  }
  function updateBoardMeter(){
    const value=parseFloat(String(q('boardCommandScore')?.textContent||'').replace(/[^0-9.]/g,''));
    const fill=q('beastBoardMeterFill');
    if(fill)fill.style.width=`${Math.max(0,Math.min(100,Number.isFinite(value)?value:0))}%`;
  }

  function start(){applySettings();assignPanelKeys();applyOrder();bindDrag();bind();enhanceBroadcastPanels();refreshBeast();setTimeout(refreshBeast,1600);setTimeout(refreshBeast,5200);setInterval(()=>{if(!document.hidden)refreshBeast()},30000);const observer=new MutationObserver(()=>{clearTimeout(window.__auroraBeastMut);window.__auroraBeastMut=setTimeout(refreshBeast,180)});['heroAnnualIncome','lastUpdated','actionList','topTransferPreview'].forEach(id=>q(id)&&observer.observe(q(id),{childList:true,subtree:true,characterData:true}))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

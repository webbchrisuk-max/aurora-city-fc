
/* ===================== M11 CLEAN SINGLE PAYDAY WORKFLOW ===================== */
(function(){
  const WEALTH_KEY='aurora_wealth_investment_mission_v1';
  const $=id=>document.getElementById(id);
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(value||0));
  const cleanLabel=value=>String(value||'').replace(/\s+/g,' ').trim();

  function liveMission(){
    const mission=read(WEALTH_KEY);
    return mission&&Number(mission.budget)>0?mission:null;
  }
  function authorisedBudget(){
    const mission=liveMission();
    return mission?Math.max(0,Number(mission.budget)||0):Math.max(0,Number($('transferBudgetInput')?.value)||0);
  }
  function forceAuthorisedBudget(){
    const mission=liveMission(); if(!mission) return;
    const value=Math.max(0,Number(mission.budget)||0);
    ['transferBudgetInput','paydayAvailableCash','m3ReleasedCash','m5BuilderBudget'].forEach(id=>{const el=$(id);if(el)el.value=value.toFixed(2)});
    ['heroTransferBudget','m5Budget'].forEach(id=>{const el=$(id);if(el)el.textContent=money(value)});
  }
  function renderMission(){
    const mission=liveMission();
    const budget=$('m11MissionBudget'),desc=$('m11MissionDescription'),account=$('m11MissionAccount'),sources=$('m11FundingSources'),status=$('m11MissionStatus');
    if(!mission){
      if(budget)budget.textContent='—';
      if(desc)desc.textContent='Return to Finance Department, build the complete transfer budget and release it here.';
      if(account)account.textContent='No investment mission loaded';
      if(status)status.textContent='Waiting for Finance Department.';
      return;
    }
    const value=Math.max(0,Number(mission.budget)||0);
    if(budget)budget.textContent=money(value);
    if(desc)desc.textContent=`Payday ${mission.paydayDate||'—'} • this is the only budget used by the Allocation Room, Deal Sheet and Payday Execution.`;
    if(account)account.textContent=mission.preferredAccount||mission.preferredPlatform||'Investment account';
    const rows=Array.isArray(mission.fundingSources)?mission.fundingSources.filter(x=>Number(x.release)>0):[];
    if(sources)sources.innerHTML=(rows.length?rows:[{name:'Authorised Finance Department budget',release:value,available:value,type:'mission'}]).map(source=>`<div class="m11-funding-card"><small>${cleanLabel(source.name||source.id||'Funding source')}</small><strong>${money(source.release||0)}</strong><span>${Number(source.available||0)>0?`${money(source.available)} available before this release`:'Included in this month’s mission'}</span></div>`).join('');
    if(status)status.textContent=`Mission loaded • ${money(value)} authorised • ${rows.length||1} funding source${(rows.length||1)===1?'':'s'} • no money or broker order has been moved.`;
  }
  function currentRoute(){
    try{return typeof routeMode!=='undefined'&&routeMode==='maximum'?'maximum':'balanced'}catch(_){return 'balanced'}
  }
  function syncStrategy(){
    const mode=currentRoute();
    document.querySelectorAll('[data-m11-route]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m11Route===mode));
    const label=$('m7Strategy'); if(label)label.textContent=mode==='maximum'?'Maximum Income':'Balanced Portfolio';
  }
  function setRoute(mode){
    forceAuthorisedBudget();
    try{
      routeMode=mode==='maximum'?'maximum':'balanced';
      if(typeof manualAmounts!=='undefined')manualAmounts.clear();
      if(typeof renderAll==='function')renderAll();
    }catch(error){
      const fallback=$(mode==='maximum'?'applyBestReturn':'applyBalancedRoute');
      if(fallback&&!fallback.disabled)fallback.click();
    }
    syncStrategy();syncBudgetReadout();
  }
  function syncBudgetReadout(){
    forceAuthorisedBudget();
    const budget=authorisedBudget();
    const allocatedText=$('allocatedTransferBudget')?.textContent||money(0);
    const remainingText=$('remainingTransferBudget')?.textContent||money(budget);
    let box=$('m11BudgetReadout');
    const host=document.querySelector('#deal-sheet .deal-budget-panel');
    if(host&&!box){
      box=document.createElement('div');box.id='m11BudgetReadout';box.className='m11-budget-readout';
      const grid=host.querySelector('.deal-budget-grid');host.insertBefore(box,grid||host.firstChild);
    }
    if(box)box.innerHTML=`<div class="authorised"><small>Finance Department authorised</small><strong>${money(budget)}</strong></div><div><small>Allocated</small><strong>${allocatedText}</strong></div><div><small>Still available</small><strong>${remainingText}</strong></div>`;
    const note=$('allocationBudgetNote');if(note)note.textContent=`${allocatedText} of ${money(budget)} allocated from the current Finance Department mission.`;
  }
  function cleanNavigation(){
    document.querySelectorAll('#transferSideMenu .fm-side-submenu a').forEach(a=>{
      if(a.textContent.trim()==='M5 Command Centre')a.remove();
    });
  }
  function arrangeWorkflow(){
    const hero=$('transfer-overview'),mission=$('wealth-mission'),allocation=$('trading-brain-execution'),deal=$('deal-sheet'),execution=$('payday-execution');
    if(hero&&mission&&hero.nextElementSibling!==mission)hero.insertAdjacentElement('afterend',mission);
    if(mission&&allocation)mission.insertAdjacentElement('afterend',allocation);
    if(allocation&&deal)allocation.insertAdjacentElement('afterend',deal);
    if(deal&&execution)deal.insertAdjacentElement('afterend',execution);
    const strip=document.querySelector('.transfer-control-strip')?.closest('section');if(strip)strip.classList.add('m11-legacy-hidden');
    const registration=$('registration-desk');
    if(execution&&registration&&!$('manual-tools')){
      const details=document.createElement('details');details.id='manual-tools';details.className='m11-manual-tools';details.innerHTML='<summary>Manual / One-Off Registration Tools</summary>';
      execution.insertAdjacentElement('afterend',details);details.appendChild(registration);
    }
  }
  function lockDuplicateBudgetInput(){
    const input=$('transferBudgetInput');if(input){input.readOnly=true;input.setAttribute('aria-readonly','true');}
    const reset=$('resetTransferPlan');if(reset){reset.setAttribute('aria-hidden','true');}
  }
  function reloadMission(){
    if(typeof window.AuroraLoadWealthMission==='function')window.AuroraLoadWealthMission({scroll:false});
    forceAuthorisedBudget();
    try{if(typeof renderAll==='function')renderAll()}catch(_){}
    renderMission();syncStrategy();syncBudgetReadout();
  }
  function start(){
    arrangeWorkflow();cleanNavigation();lockDuplicateBudgetInput();renderMission();forceAuthorisedBudget();syncStrategy();syncBudgetReadout();
    $('m11ReloadMission')?.addEventListener('click',reloadMission);
    document.querySelectorAll('[data-m11-route]').forEach(btn=>btn.addEventListener('click',()=>setRoute(btn.dataset.m11Route)));
    const observer=new MutationObserver(()=>{clearTimeout(window.__auroraM11Sync);window.__auroraM11Sync=setTimeout(()=>{forceAuthorisedBudget();renderMission();syncStrategy();syncBudgetReadout();},80)});
    ['allocatedTransferBudget','remainingTransferBudget','m7Strategy','m7Budget','heroTransferBudget'].forEach(id=>{const el=$(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true})});
    window.addEventListener('storage',event=>{if(event.key===WEALTH_KEY)setTimeout(reloadMission,50)});
    window.addEventListener('aurora:wealth-mission',()=>setTimeout(reloadMission,50));
    setTimeout(reloadMission,180);setTimeout(()=>{arrangeWorkflow();syncBudgetReadout()},900);
    document.title='Aurora City FC — Transfer Centre';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

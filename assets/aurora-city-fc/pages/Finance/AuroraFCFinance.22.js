
/* ===================== AURORA SMART WEALTH CENTRE ROUTER ===================== */
(()=>{
  const dock=document.querySelector('.aurora-smart-dock[data-aurora-page]');
  const launcher=document.getElementById('auroraDockLauncher');
  if(!dock)return;
  const page=dock.dataset.auroraPage||'nexus';
  const local=location.protocol==='file:';
  const routes=local?{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    transfer:'AuroraCityFC_TransferCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster_Connected_v3.html'
  }:{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    transfer:'AuroraCityFC_TransferCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster.html'
  };
  const labels={nexus:'NEXUS HQ • SYSTEM OVERVIEW',wealth:'WEALTH HQ • PAYDAY & POTS',brain:'TRADING BRAIN • ANALYTICS',transfer:'TRANSFER CENTRE • EXECUTION',registration:'REGISTRATION DESK • PURCHASES',tesco:'TESCO SAYE • 2029 PLAN'};
  const nextMap={nexus:['wealth','Open Finance Department →'],wealth:['transfer','Next: Transfer Centre →'],brain:['transfer','Open Transfer Centre →'],transfer:['registration','Next: Registration →'],registration:['nexus','Return to Nexus HQ →'],tesco:['nexus','Return to Nexus HQ →']};
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const money=(v)=>Number(v||0).toLocaleString('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0});
  const setStatus=(name,text,tone)=>{const el=dock.querySelector('[data-aurora-status="'+name+'"]');if(!el)return;el.textContent=text;el.className='aurora-smart-status '+(tone||'')};
  dock.querySelectorAll('[data-aurora-route]').forEach(link=>{const name=link.dataset.auroraRoute;link.href=routes[name]||'#';link.classList.toggle('active',name===page);if(name===page)link.setAttribute('aria-current','page')});
  const current=dock.querySelector('[data-aurora-current-label]');if(current)current.textContent=labels[page]||labels.nexus;
  const [nextRoute,nextText]=nextMap[page]||nextMap.nexus;const next=dock.querySelector('[data-aurora-next]');if(next){next.href=routes[nextRoute];next.textContent=nextText}
  dock.querySelector('[data-aurora-back]')?.addEventListener('click',()=>{const ref=document.referrer;if(history.length>1&&(local||(ref&&new URL(ref,location.href).origin===location.origin)))history.back();else location.href=routes.nexus});
  function refresh(){
    const mission=read('aurora_wealth_investment_mission_v1');const decision=read('aurora_trading_brain_decision_v1');const queue=read('aurora_pending_registrations_v1');
    if(mission){const budget=Number(mission.budget||mission.investmentBudget||mission.amount||0);setStatus('wealth',budget>0?money(budget):'MISSION READY',budget>0?'good':'');setStatus('transfer',budget>0?money(budget):'MISSION READY',budget>0?'good':'')}else{setStatus('wealth',page==='wealth'?'OPEN':'NO MISSION',page==='wealth'?'cyan':'watch');setStatus('transfer','NO MISSION','watch')}
    if(decision&&Array.isArray(decision.purchases)&&decision.purchases.length)setStatus('brain',decision.purchases.length+' PLANNED','good');else setStatus('brain',page==='brain'?'OPEN':'PLAN READY','cyan');
    if(Array.isArray(queue)&&queue.length){const pending=queue.filter(x=>String(x.status||'').toLowerCase()!=='completed').length;setStatus('registration',pending?pending+' WAITING':'READY',pending?'good':'cyan')}else setStatus('registration','EMPTY','');
    setStatus('nexus','HOME','cyan');setStatus('tesco','2029 PLAN','cyan');
  }
  refresh();window.addEventListener('storage',refresh);
  launcher?.addEventListener('click',()=>dock.scrollIntoView({behavior:'smooth',block:'end'}));
  let timer=null;
  function updateLauncher(){
    if(!launcher)return;
    const rect=dock.getBoundingClientRect();
    const nearDock=rect.top<window.innerHeight&&rect.bottom>0;
    launcher.classList.toggle('is-near-dock',nearDock);
  }
  window.addEventListener('scroll',()=>{
    if(!launcher)return;
    launcher.classList.add('is-scrolling');
    clearTimeout(timer);
    timer=setTimeout(()=>{launcher.classList.remove('is-scrolling');updateLauncher()},320);
  },{passive:true});
  window.addEventListener('resize',updateLauncher,{passive:true});
  updateLauncher();
})();

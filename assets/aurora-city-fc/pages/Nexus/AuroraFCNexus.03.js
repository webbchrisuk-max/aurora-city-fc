
/* ===================== AURORA SMART WEALTH CENTRE ROUTER ===================== */
(()=>{
  const dock=document.querySelector('.aurora-smart-dock[data-aurora-page]');
  if(!dock)return;
  const page=dock.dataset.auroraPage||'nexus';
  const local=location.protocol==='file:';
  const routes=local?{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster.html'
  }:{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster.html'
  };
  const labels={nexus:'NEXUS HQ • SYSTEM OVERVIEW',wealth:'WEALTH HQ • PAYDAY & POTS',brain:'TRADING BRAIN • DEPLOYMENT',registration:'REGISTRATION DESK • PURCHASES',tesco:'TESCO SAYE • 2029 PLAN'};
  const nextMap={nexus:['wealth','Open Finance Department →'],wealth:['brain','Next: Scouting Centre →'],brain:['registration','Next: Registration →'],registration:['nexus','Return to Nexus HQ →'],tesco:['nexus','Return to Nexus HQ →']};
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const money=(v)=>Number(v||0).toLocaleString('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0});
  const setStatus=(name,text,tone)=>{
    const el=dock.querySelector('[data-aurora-status="'+name+'"]');if(!el)return;
    el.textContent=text;el.className='aurora-smart-status '+(tone||'');
  };
  dock.querySelectorAll('[data-aurora-route]').forEach(link=>{
    const name=link.dataset.auroraRoute;link.href=routes[name]||'#';link.classList.toggle('active',name===page);
    if(name===page)link.setAttribute('aria-current','page');
  });
  const current=dock.querySelector('[data-aurora-current-label]');if(current)current.textContent=labels[page]||labels.nexus;
  const [nextRoute,nextText]=nextMap[page]||nextMap.nexus;const next=dock.querySelector('[data-aurora-next]');if(next){next.href=routes[nextRoute];next.textContent=nextText}
  dock.querySelector('[data-aurora-back]')?.addEventListener('click',()=>{
    const ref=document.referrer;
    if(history.length>1 && (local || (ref && new URL(ref,location.href).origin===location.origin)))history.back();
    else location.href=routes.nexus;
  });
  function refresh(){
    const mission=read('aurora_wealth_investment_mission_v1');
    const decision=read('aurora_trading_brain_decision_v1');
    const queue=read('aurora_pending_registrations_v1');
    if(mission){
      const budget=Number(mission.investmentBudget||mission.amount||0);
      setStatus('wealth',budget>0?money(budget):'MISSION READY',budget>0?'good':'');
    }else setStatus('wealth',page==='wealth'?'OPEN':'NO MISSION',mission?'good':'warn');
    if(decision && Array.isArray(decision.purchases) && decision.purchases.length){
      setStatus('brain',decision.purchases.length+' PLANNED','good');
    }else setStatus('brain',page==='brain'?'OPEN':'PLAN READY','cyan');
    if(Array.isArray(queue) && queue.length){
      const pending=queue.filter(x=>String(x.status||'').toLowerCase()!=='completed').length;
      setStatus('registration',pending?pending+' WAITING':'READY',pending?'good':'cyan');
    }else setStatus('registration','EMPTY','');
    setStatus('nexus',page==='nexus'?'HOME':'HOME','cyan');
    setStatus('tesco','2029 PLAN','cyan');
  }
  refresh();
  window.addEventListener('storage',refresh);

  // auto-hide when scrolling down, show when scrolling up / when scroll ends / near bottom
  let lastY=window.scrollY||0;
  let ticking=false;
  let scrollTimer=null;
  const reveal=()=>dock.classList.remove('is-hidden');
  const conceal=()=>dock.classList.add('is-hidden');
  const onScroll=()=>{
    const y=window.scrollY||0;
    const maxY=Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nearBottom=maxY - y < 56;
    if(nearBottom || y < 12){ reveal(); }
    else if(y > lastY + 6){ conceal(); }
    else if(y < lastY - 6){ reveal(); }
    lastY=y;
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(reveal, 140);
    ticking=false;
  };
  window.addEventListener('scroll',()=>{
    if(!ticking){ window.requestAnimationFrame(onScroll); ticking=true; }
  },{passive:true});
})();

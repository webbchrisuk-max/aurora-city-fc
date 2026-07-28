
(()=>{
  const PAGE='transfer';
  const ROUTES={"nexus":"AuroraCityFC_NexusMaster.html","finance":"AuroraCityFC_FinanceDepartment.html","manager":"AuroraCityFC_ManagerDashboard.html","transfer":"AuroraCityFC_TransferCentre.html","squad":"AuroraCityFC_SquadHub.html","boardroom":"AuroraCityFC_Boardroom.html","analysis":"AuroraCityFC_AnalysisRoom.html","training":"AuroraCityFC_TrainingGround.html","scouting":"AuroraCityFC_ScoutingCentre.html","media":"AuroraCityFC_MediaCentre.html"};
  const FINANCE_KEY='aurora_finance_department_mission_v1';
  const LEGACY_KEY='aurora_wealth_investment_mission_v1';
  const TEST_KEY='aurora_transfer_test_mode_v1';
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
  const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value||0));
  const mission=()=>read(FINANCE_KEY)||read(LEGACY_KEY);
  function mirrorMission(){const canonical=read(FINANCE_KEY),legacy=read(LEGACY_KEY);if(canonical&&!legacy)write(LEGACY_KEY,canonical);else if(legacy&&!canonical)write(FINANCE_KEY,{...legacy,source:legacy.source||'Finance Department'});}
  function patchLinks(){
    const map=[
      [/(?:AuroraCityFC_)?NexusMaster(?:_Connected_v\\d+|\\(\\d+\\))?\\.html/i,ROUTES.nexus],
      [/(?:SpendingPlannerMaster[^?#\"']*|AuroraWealthExecutiveRoom_Connected_v\\d+)\\.html/i,ROUTES.finance],
      [/AuroraCityFC_ManagerDashboard(?:\\(\\d+\\))?\\.html/i,ROUTES.manager],
      [/AuroraCityFC_TransferCentre(?:\\(\\d+\\)[^?#\"']*)?\\.html/i,ROUTES.transfer],
      [/AuroraCityFC_SquadHub(?:\\(\\d+\\))?\\.html/i,ROUTES.squad],
      [/AuroraCityFC_Boardroom(?:\\(\\d+\\))?\\.html/i,ROUTES.boardroom],
      [/AuroraCityFC_AnalysisRoom(?:\\(\\d+\\))?\\.html/i,ROUTES.analysis],
      [/AuroraCityFC_TrainingGround(?:\\(\\d+\\))?\\.html/i,ROUTES.training],
      [/AuroraCityFC_ScoutingCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.scouting],
      [/AuroraCityFC_MediaCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.media],
      [/TradingBrainMaster(?:_Connected_v\\d+)?\\.html/i,ROUTES.scouting],
      [/RegistrationDesk\\.html/i,ROUTES.transfer+'#registration-desk']
    ];
    document.querySelectorAll('a[href]').forEach(a=>{let href=a.getAttribute('href')||'';map.forEach(([rx,to])=>{href=href.replace(rx,to)});a.setAttribute('href',href)});
  }
  function addFinanceSidebarLink(){
    const host=document.querySelector('.fm-side-scroll');if(!host||host.querySelector('[data-aurora-finance-sidebar]'))return;
    const a=document.createElement('a');a.href=ROUTES.finance;a.dataset.auroraFinanceSidebar='1';a.className='fm-side-link'+(PAGE==='finance'?' active':'');a.innerHTML='<span class="fm-side-icon">£</span><span>Finance Department</span>';
    const firstGroup=host.querySelector('.fm-nav-group');if(firstGroup)firstGroup.insertAdjacentElement('afterend',a);else host.prepend(a);
  }
  function addConnectedCard(){
    if(document.getElementById('auroraConnectedFinanceCard'))return;
    const card=document.createElement('section');card.id='auroraConnectedFinanceCard';card.className='aurora-connected-card';
    card.innerHTML='<div class="aurora-connected-card-inner"><div><small>Connected finance pipeline</small><strong data-card-title>Finance Department linked</strong><span data-card-copy>Checking the current payday investment mission…</span></div><div class="aurora-connected-actions"><a href="'+ROUTES.finance+'">Open Finance</a><a class="primary" href="'+ROUTES.transfer+'">Open Transfer Centre</a></div></div>';
    const target=document.querySelector('.transfer-hero,.hq-hero,.hero,.hero-card');
    if(target&&target.parentElement)target.insertAdjacentElement('afterend',card);else document.body.insertAdjacentElement('afterbegin',card);
  }
  function refresh(){
    mirrorMission();const m=mission();const test=read(TEST_KEY);const budget=Number(m?.budget||m?.investmentBudget||m?.amount||0);const account=m?.preferredAccount||m?.preferredPlatform||'Investment account';
    const summary=document.querySelector('[data-aurora-finance-summary]');
    if(summary)summary.textContent=m&&budget>0?`Finance Department linked • ${money(budget)} authorised • ${account}`:'Finance Department linked • no mission released';
    const title=document.querySelector('#auroraConnectedFinanceCard [data-card-title]');const copy=document.querySelector('#auroraConnectedFinanceCard [data-card-copy]');
    if(title)title.textContent=m&&budget>0?`${money(budget)} investment mission authorised`:'Finance Department linked';
    if(copy)copy.textContent=m&&budget>0?`${account} • payday ${m.paydayDate||'not set'} • ${Array.isArray(m.fundingSources)?m.fundingSources.length:1} funding source${Array.isArray(m.fundingSources)&&m.fundingSources.length===1?'':'s'}`:'Build the payday plan in Finance Department, then release the complete budget to the Transfer Centre.';
    document.querySelectorAll('[data-aurora-nav-status]').forEach(el=>{const name=el.dataset.auroraNavStatus;el.className='aurora-system-status';if(name==='finance'){el.textContent=budget>0?money(budget):'NO MISSION';el.classList.add(budget>0?'good':'watch')}else if(name==='transfer'){el.textContent=budget>0?'BUDGET READY':'WAITING';el.classList.add(budget>0?'cyan':'')}else if(name===PAGE){el.textContent='OPEN';el.classList.add('cyan')}else el.textContent='LINKED'});
    document.body.classList.toggle('aurora-transfer-test-active',!!test?.active);
  }
  function init(){
    document.querySelectorAll('.aurora-smart-dock').forEach(el=>el.style.setProperty('display','none','important'));
    patchLinks();addFinanceSidebarLink();addConnectedCard();refresh();
    const dock=document.querySelector('.aurora-system-dock');dock?.querySelector('.aurora-system-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else location.href=ROUTES.nexus});
    let lastY=scrollY||0,ticking=false,timer;const show=()=>dock?.classList.remove('is-hidden'),hide=()=>dock?.classList.add('is-hidden');
    addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY||0,max=Math.max(0,document.documentElement.scrollHeight-innerHeight),nearBottom=max-y<70;if(nearBottom||y<12||y<lastY-6)show();else if(y>lastY+6)hide();lastY=y;clearTimeout(timer);timer=setTimeout(show,180);ticking=false})},{passive:true});
    addEventListener('storage',e=>{if([FINANCE_KEY,LEGACY_KEY,TEST_KEY].includes(e.key))refresh()});addEventListener('aurora:finance-mission',refresh);addEventListener('aurora:wealth-mission',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

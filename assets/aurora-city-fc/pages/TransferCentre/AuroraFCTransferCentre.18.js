
/* ===================== M10 DIRECT WEALTH HQ → TRANSFER CENTRE • AUTHORITATIVE BUDGET ===================== */
(function(){
  const WEALTH_KEY='aurora_wealth_investment_mission_v1';
  const RECEIPT_KEY='aurora_transfer_centre_receipt_v1';
  const $id=id=>document.getElementById(id);
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
  const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(value||0));

  function applyWealthMission(options={}){
    const mission=read(WEALTH_KEY);
    if(!mission || !(Number(mission.budget)>0)) return false;
    const budget=Math.max(0,Number(mission.budget)||0);
    const budgetInput=$id('transferBudgetInput');
    const releasedCash=$id('m3ReleasedCash');
    const availableCash=$id('paydayAvailableCash');
    if(budgetInput) budgetInput.value=budget.toFixed(2);
    if(releasedCash) releasedCash.value=budget.toFixed(2);
    if(availableCash) availableCash.value=budget.toFixed(2);
    try{
      routeMode=mission.tradingMode==='income'?'maximum':'balanced';
      excludedTickers.clear();
      manualAmounts.clear();
      const savedSettings=read('aurora_transfer_settings_v3')||{};
      write('aurora_transfer_settings_v3',{...savedSettings,budget,routeMode,excludedTickers:[],manualAmounts:{},wealthMissionId:mission.id,updatedAt:new Date().toISOString()});
      const decision=read('aurora_trading_brain_decision_v1');
      if(decision&&Array.isArray(decision.targets)){
        decision.previousBudget=Number(decision.budget||0);
        decision.budget=budget;
        decision.holdback=0;
        decision.wealthMissionId=mission.id;
        decision.sourceMissionId=mission.sourceMissionId||null;
        decision.rebasedAt=new Date().toISOString();
        write('aurora_trading_brain_decision_v1',decision);
      }
    }catch(error){console.warn('Aurora mission rebase',error);} 
    try{
      const execution=read('aurora_payday_execution_v1')||{};
      execution.availableCash=budget;
      execution.wealthMissionId=mission.id;
      execution.updatedAt=new Date().toISOString();
      localStorage.setItem('aurora_payday_execution_v1',JSON.stringify(execution));
    }catch(_){ }
    const receipt={
      schemaVersion:1,
      wealthMissionId:mission.id,
      sourceMissionId:mission.sourceMissionId,
      budget,
      paydayDate:mission.paydayDate||'',
      preferredAccount:mission.preferredAccount||'',
      loadedAt:new Date().toISOString(),
      status:'TRANSFER_CENTRE_LOADED',
      fundingSources:Array.isArray(mission.fundingSources)?mission.fundingSources:[]
    };
    write(RECEIPT_KEY,receipt);
    mission.status='TRANSFER_CENTRE_LOADED';
    mission.updatedAt=new Date().toISOString();
    write(WEALTH_KEY,mission);
    if(typeof window.renderAll==='function'){
      try{ window.manualAmounts?.clear?.(); }catch(_){ }
      try{ window.renderAll(); }catch(error){ console.warn('Aurora bridge render',error); }
    }
    const note=$id('dealBudgetContext');
    const sourceText=Array.isArray(mission.fundingSources)&&mission.fundingSources.length
      ? mission.fundingSources.map(source=>`${source.name||source.id} ${money(source.release||0)}`).join(' • ')
      : `${money(budget)} authorised budget`;
    if(note) note.textContent=`Loaded from Finance Department • ${sourceText} • Total ${money(budget)} • ${mission.preferredAccount||'Investment account'}`;
    const hero=$id('heroTransferBudget');
    if(hero) hero.textContent=money(budget);
    if(options.scroll!==false){
      setTimeout(()=>($id('best-return-allocation')||$id('deal-sheet'))?.scrollIntoView({behavior:'smooth',block:'start'}),220);
    }
    return true;
  }

  function addWealthBanner(){
    if($id('m9WealthMissionBanner')) return;
    const mission=read(WEALTH_KEY); if(!mission || !(Number(mission.budget)>0)) return;
    const host=document.querySelector('.transfer-hero')?.parentElement || document.querySelector('.app');
    if(!host) return;
    const banner=document.createElement('section');
    banner.id='m9WealthMissionBanner';
    banner.style.cssText='margin:14px 0;padding:14px;border:1px solid rgba(52,211,153,.30);border-radius:18px;background:linear-gradient(145deg,rgba(52,211,153,.10),rgba(34,211,238,.045));display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center';
    banner.innerHTML=`<div><div style="font-size:9px;font-weight:950;letter-spacing:1px;color:#8cffb8">WEALTH HQ BUDGET RELEASED</div><strong style="display:block;margin-top:5px;font-size:22px">${money(mission.budget)} Transfer Window</strong><span style="display:block;margin-top:4px;color:#93a4bd;font-size:11px">Payday ${mission.paydayDate||'—'} • ${mission.preferredAccount||'Investment account'} • The current Finance Department budget is authoritative; previous transfer budgets are replaced.</span></div><button id="m9ReloadWealthMission" type="button" style="border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.10);color:#9affc3;border-radius:12px;padding:10px 13px;font-weight:950">Reload Mission</button>`;
    const hero=document.querySelector('.transfer-hero');
    if(hero?.parentElement) hero.insertAdjacentElement('afterend',banner); else host.prepend(banner);
    $id('m9ReloadWealthMission')?.addEventListener('click',()=>applyWealthMission({scroll:true}));
  }

  function start(){ addWealthBanner(); applyWealthMission({scroll:new URLSearchParams(location.search).get('from')==='wealth-hq'}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,120),{once:true});
  else setTimeout(start,120);
  window.addEventListener('storage',event=>{if(event.key===WEALTH_KEY){addWealthBanner();applyWealthMission({scroll:false});}});
  window.addEventListener('aurora:wealth-mission',()=>{addWealthBanner();applyWealthMission({scroll:false});});
  window.AuroraLoadWealthMission=applyWealthMission;
})();

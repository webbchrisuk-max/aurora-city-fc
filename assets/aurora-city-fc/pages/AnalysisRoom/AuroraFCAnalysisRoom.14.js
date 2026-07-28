
(() => {
  "use strict";
  const byId=id=>document.getElementById(id);
  const gbp=(n,d=0)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:d,maximumFractionDigits:d}).format(Number.isFinite(n)?n:0);
  const milestones=[6000,12000,18000,24000,30000,36000,40000,50000];
  const fields=["m5Monthly","m5StartPot","m5Tesco","m5Yield","m5Reinvest","m5Isa","m5IsaUsed","m5TescoYear","m5PauseStart","m5ResumeYear","m5TargetInput"];
  const currentAnnual=()=>{try{const n=typeof annualTotal==="function"?annualTotal():NaN;return Number.isFinite(n)&&n>0?n:4220;}catch(_){return 4220;}};
  const currentYield=()=>{try{const n=typeof portfolioYield==="function"?portfolioYield():NaN;return Number.isFinite(n)&&n>0?n:NaN;}catch(_){return NaN;}};
  function val(id){return Number(byId(id)?.value||0)}
  function simulation(baseIncome,monthly,startPot,tesco,yieldRate,reinvest,isaCap,isaUsed,tescoYear,pauseStart,resumeYear,years=10){
    let capital=yieldRate>0?baseIncome/yieldRate:0,queue=startPot,annualIncome=baseIncome;
    const now=new Date().getFullYear(),timeline=[];
    for(let year=now;year<now+years;year++){
      const paused=year>=pauseStart&&year<resumeYear;
      const wages=paused?0:monthly*12;
      queue+=wages;
      if(year===tescoYear)queue+=tesco;

      const newSubscriptionCapacity=year===now?Math.max(0,isaCap-isaUsed):isaCap;
      const newSubscriptions=Math.min(wages,newSubscriptionCapacity);
      const queuedCapitalDeploy=Math.min(queue,isaCap);
      queue-=queuedCapitalDeploy;
      capital+=queuedCapitalDeploy;

      annualIncome=capital*yieldRate;
      const reinvestCash=annualIncome*reinvest;
      capital+=reinvestCash;
      annualIncome=capital*yieldRate;

      timeline.push({
        year,
        income:annualIncome,
        deploy:queuedCapitalDeploy,
        queuedDeploy:queuedCapitalDeploy,
        newSubscriptions,
        isaRemaining:Math.max(0,newSubscriptionCapacity-newSubscriptions),
        queue,
        event:year===tescoYear,
        reinvest:reinvestCash,
        wages,
        paused
      });
    }
    return {timeline,annualIncome,queue};
  }
  function completionYearFor(milestone,baseIncome,timeline){
    if(baseIncome>=milestone)return "Reached";
    const hit=timeline.find(r=>r.income>=milestone);
    return hit?String(hit.year):"10y+";
  }
  function renderDeployment(startPot,monthly,tesco,tescoYear,pauseStart,resumeYear,isaCap,queueEnd){
    const existingCash=Math.min(startPot,10000);
    const etfSale=Math.min(Math.max(0,startPot-existingCash),8000);
    const other=Math.max(0,startPot-existingCash-etfSale);
    const sources=[
      {name:"Existing cash",value:existingCash,note:"Available now",colour:"#34d399"},
      {name:"ETF sale",value:etfSale,note:etfSale?"Deployable capital":"Not included",colour:"#22d3ee"},
      {name:"Monthly contributions",value:monthly,note:`Paused ${pauseStart}–${resumeYear-1}`,colour:"#60a5fa"},
      {name:"Tesco SAYE",value:tesco,note:`Locked until ${tescoYear}`,colour:"#c084fc"}
    ];
    if(other>0)sources.splice(2,0,{name:"Other starting capital",value:other,note:"Included in starting pot",colour:"#fbbf24"});
    const order=[
      {name:"Existing cash",detail:"Deploy first from funds already available",value:existingCash,status:existingCash?"Ready":"None"},
      {name:"ETF sale",detail:"Deploy after the planned ETF disposal",value:etfSale,status:etfSale?"Planned":"None"},
      {name:"Monthly contributions",detail:`${gbp(monthly)}/month except the ${pauseStart}–${resumeYear-1} ISA pause`,value:monthly*12,status:`Pause ${pauseStart}`},
      {name:"Tesco SAYE",detail:`Capital event in ${tescoYear}; eligibility checked at maturity`,value:tesco,status:"Locked",locked:true}
    ];
    byId("m5Queue").innerHTML=`
      <div><div class="m5-deploy-heading"><b>Capital sources</b><span>${gbp(startPot)} available before Tesco</span></div>
      <div class="m5-source-grid">${sources.map(s=>`<div class="m5-source-card" style="--source:${s.colour}"><small>${s.name}</small><strong>${gbp(s.value)}</strong><span>${s.note}</span></div>`).join("")}</div></div>
      <div><div class="m5-deploy-heading"><b>Deployment order</b><span>Annual planning capacity ${gbp(isaCap)}</span></div>
      <div class="m5-deploy-list">${order.map((o,i)=>`<div class="m5-queue-row ${o.locked?'locked':''}"><span class="m5-order-number">${i+1}</span><div><b>${o.name}</b><span>${o.detail}</span></div><strong>${o.status}</strong></div>`).join("")}</div></div>
      <div class="m5-note">Projected general cash backlog after ten years: <b style="color:#e0f2fe">${gbp(queueEnd)}</b>. This does not represent a guaranteed SAYE-to-ISA transfer schedule.</div>`;
  }
  let activeSeasonYear=null;
  function seasonProfile(r,target){
    if(r.event)return {icon:"🏦",title:"Tesco Capital Event",label:"Maturity season",note:"Tesco SAYE is treated as a separate maturity-year decision. New ISA subscriptions remain paused and the model does not assume a guaranteed full transfer."};
    if(r.paused)return {icon:"⏸️",title:"ISA Pause Season",label:"Capital protection",note:"New ISA subscriptions are paused, while dividends already inside the ISA continue to be reinvested according to the selected reinvestment rate."};
    if(r.year===new Date().getFullYear())return {icon:"🏗️",title:"Foundation Season",label:"Current campaign",note:"Build the income base, deploy available capital carefully and establish the first sustainable annual-income milestone."};
    if(r.income>=target)return {icon:"👑",title:"Target Season",label:"Mission accomplished",note:"The selected annual-income mission has been reached in the model. Future decisions can prioritise resilience and diversification."};
    return {icon:r.year<2030?"📈":"🚀",title:r.year<2030?"Expansion Season":"Acceleration Season",label:"Portfolio development",note:"Continue compounding, monitor concentration and deploy within the annual planning capacity without forcing unrealistic yield."};
  }
  function renderSeasonDetail(r,target){
    const el=byId("m5SeasonDetail");if(!el||!r)return;
    const profile=seasonProfile(r,target),progress=Math.min(100,r.income/Math.max(target,1)*100);
    const hit=milestones.filter(m=>r.income>=m).at(-1);
    el.innerHTML=`<div class="m5-season-identity"><div class="m5-season-icon">${profile.icon}</div><small>${r.year} • ${profile.label}</small><h4>${profile.title}</h4><p>${profile.note}</p><div class="m5-season-progress"><i style="width:${progress}%"></i></div><p>${progress.toFixed(0)}% towards ${gbp(target)} annual income</p></div><div class="m5-season-metrics"><div class="m5-season-metric"><small>Annual income</small><strong>${gbp(r.income,0)}</strong><span>${gbp(r.income/12,0)} per month</span></div><div class="m5-season-metric"><small>New cash contributions</small><strong>${gbp(r.wages,0)}</strong><span>${r.paused?'Paused for Tesco planning':'Added during the season'}</span></div><div class="m5-season-metric"><small>Queued capital deployed</small><strong>${gbp(r.queuedDeploy,0)}</strong><span>Previously available cash moved into investments</span></div><div class="m5-season-metric"><small>New ISA subscriptions</small><strong>${gbp(r.newSubscriptions,0)}</strong><span>${r.year===new Date().getFullYear()?gbp(r.isaRemaining,2)+' allowance remains':'Modelled against that year\'s planning capacity'}</span></div><div class="m5-season-metric"><small>Dividends reinvested</small><strong>${gbp(r.reinvest,0)}</strong><span>Compounding inside the portfolio</span></div><div class="m5-season-metric"><small>Cash backlog</small><strong>${gbp(r.queue,0)}</strong><span>Capital awaiting later deployment</span></div><div class="m5-season-metric"><small>Milestone</small><strong>${hit?gbp(hit):'Building'}</strong><span>${hit?'Highest mission reached':'No mission reached yet'}</span></div><div class="m5-season-note">${r.event?'Tesco maturity is highlighted as the centrepiece, but actual ISA eligibility and transfer timing must be checked when the scheme matures.':r.paused?'The pause affects new subscriptions only; dividends already sheltered inside the ISA may continue to compound.':'This season reflects the current simulator assumptions for yield, reinvestment and annual deployment capacity.'}</div></div>`;
  }
  function simulate(){
    const baseIncome=currentAnnual();
    let monthly=val("m5Monthly"),startPot=val("m5StartPot"),tesco=val("m5Tesco"),yieldRate=val("m5Yield")/100,reinvest=val("m5Reinvest")/100,isaCap=val("m5Isa"),isaUsed=Math.min(val("m5IsaUsed"),val("m5Isa")),tescoYear=val("m5TescoYear"),pauseStart=val("m5PauseStart"),resumeYear=val("m5ResumeYear"),target=val("m5TargetInput");
    if(resumeYear<=pauseStart){resumeYear=pauseStart+1;byId("m5ResumeYear").value=resumeYear;}
    byId("m5MonthlyOut").textContent=gbp(monthly);byId("m5StartPotOut").textContent=gbp(startPot);byId("m5TescoOut").textContent=gbp(tesco);byId("m5YieldOut").textContent=`${(yieldRate*100).toFixed(2)}%`;byId("m5ReinvestOut").textContent=`${Math.round(reinvest*100)}%`;byId("m5IsaOut").textContent=gbp(isaCap);byId("m5IsaUsedOut").textContent=gbp(isaUsed,2);byId("m5IsaRemaining").textContent=gbp(Math.max(0,isaCap-isaUsed),2);byId("m5TescoYearOut").textContent=tescoYear;byId("m5PauseStartOut").textContent=pauseStart;byId("m5ResumeYearOut").textContent=resumeYear;byId("m5TargetBadge").textContent=`Target ${gbp(target)}`;
    byId("m5AnnualIncome").textContent=gbp(baseIncome,2);byId("m5MonthlyIncome").textContent=gbp(baseIncome/12,2);byId("m5DailyIncome").textContent=gbp(baseIncome/365,2);byId("m5HourlyIncome").textContent=gbp(baseIncome/8760,2);
    const liveYield=currentYield();byId("m5CurrentYield").textContent=Number.isFinite(liveYield)?`${(liveYield*100).toFixed(2)}%`:`${(yieldRate*100).toFixed(2)}%`;

    const result=simulation(baseIncome,monthly,startPot,tesco,yieldRate,reinvest,isaCap,isaUsed,tescoYear,pauseStart,resumeYear,10);
    const {timeline,annualIncome,queue}=result;
    const targetHit=baseIncome>=target?"Reached":completionYearFor(target,baseIncome,timeline);
    const targetYear=targetHit!=="Reached"&&targetHit!=="10y+"?targetHit:null;

    const roadmap=byId("m5Roadmap");
    roadmap.innerHTML=milestones.map(m=>{const progress=Math.min(100,baseIncome/m*100);const finish=completionYearFor(m,baseIncome,timeline);return `<button type="button" class="m5-milestone ${baseIncome>=m?'reached':''} ${target===m?'active':''}" data-m5-target="${m}"><small>${baseIncome>=m?'Reached':'Mission'}</small><strong>${gbp(m)}</strong><span>${gbp(m/12,0)}/month</span><div class="m5-milestone-progress"><i style="width:${progress}%"></i></div><em>${progress.toFixed(0)}% • ${finish}</em></button>`}).join("");
    roadmap.querySelectorAll("[data-m5-target]").forEach(b=>b.addEventListener("click",()=>{const targetInput=byId("m5TargetInput");if(!targetInput)return;targetInput.value=b.dataset.m5Target;targetInput.dispatchEvent(new Event("input",{bubbles:true}));}));

    byId("m5ProjectedAnnual").textContent=gbp(annualIncome,0);byId("m5ProjectionYears").textContent=`${gbp(annualIncome/12,0)}/month after 10 years`;byId("m5TargetFinish").textContent=targetHit;byId("m5TargetGapText").textContent=baseIncome>=target?"Target already achieved":`${gbp(Math.max(0,target-baseIncome),0)} annual gap today`;byId("m5QueueEnd").textContent=gbp(queue,0);
    renderDeployment(startPot,monthly,tesco,tescoYear,pauseStart,resumeYear,isaCap,queue);

    const timelineEl=byId("m5Timeline");
    if(!activeSeasonYear||!timeline.some(r=>r.year===activeSeasonYear))activeSeasonYear=timeline.find(r=>r.event)?.year||timeline[0]?.year;
    timelineEl.innerHTML=timeline.map(r=>`<button type="button" class="m5-year ${r.event?'event':''} ${r.paused?'paused':''} ${r.year===activeSeasonYear?'active':''}" data-season-year="${r.year}"><small>${r.year}</small><strong>${gbp(r.income,0)}/yr</strong><span>${r.event?'Tesco event':r.paused?'ISA pause':gbp(r.income/12,0)+'/month'}</span></button>`).join("");
    timelineEl.querySelectorAll("[data-season-year]").forEach(btn=>btn.addEventListener("click",()=>{activeSeasonYear=Number(btn.dataset.seasonYear);timelineEl.querySelectorAll(".m5-year").forEach(x=>x.classList.toggle("active",Number(x.dataset.seasonYear)===activeSeasonYear));renderSeasonDetail(timeline.find(r=>r.year===activeSeasonYear),target);}));
    renderSeasonDetail(timeline.find(r=>r.year===activeSeasonYear)||timeline[0],target);

    const strength=`${gbp(monthly)}/month contributions operate outside the ${pauseStart}–${resumeYear-1} pause, while ${Math.round(reinvest*100)}% dividend reinvestment continues inside the ISA.`;
    const watch=queue>isaCap?`Investable cash can exceed the annual planning capacity; ${gbp(queue)} remains after the ten-year model.`:`The projected backlog is controlled, but yield and dividend concentration still need monitoring.`;
    const recommendation=baseIncome>=target?`The ${gbp(target)} target is already secured. Prioritise quality and diversification.`:targetYear?`Stay with the current plan; the model reaches ${gbp(target)} around ${targetYear}. The contribution pause is included, and Tesco remains a separate maturity-year decision rather than a guaranteed multi-year ISA transfer.`:`The target remains beyond ten years. Increase capital gradually or use a nearer milestone without forcing an unrealistic yield.`;
    byId("m5ManagerVerdict").innerHTML=`<h4>Aurora AI Manager Briefing</h4><div class="m5-brief-grid"><div class="m5-brief strength"><b>Strengths</b><span>${strength}</span></div><div class="m5-brief watch"><b>Watch</b><span>${watch}</span></div><div class="m5-brief recommend"><b>Recommendation</b><span>${recommendation}</span></div></div>`;
  }
  const MISSION_STORAGE_KEY="auroraAnalysisMissionControlsV1";
  let saveTimer=0;
  function readMissionControls(){
    try{
      const parsed=JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)||"null");
      return parsed&&typeof parsed==="object"?parsed:{};
    }catch(_){return {};}
  }
  function saveMissionControls(){
    const payload={updatedAt:new Date().toISOString()};
    fields.forEach(id=>{const el=byId(id);if(el)payload[id]=el.value;});
    try{
      localStorage.setItem(MISSION_STORAGE_KEY,JSON.stringify(payload));
      localStorage.setItem("auroraIsaUsedCurrentTaxYear",String(payload.m5IsaUsed??""));
    }catch(_){}
  }
  function queueMissionSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(saveMissionControls,120);
  }
  function restoreMissionControls(){
    const saved=readMissionControls();
    fields.forEach(id=>{
      const el=byId(id); if(!el)return;
      const value=saved[id];
      if(value!==undefined&&value!==null&&value!=="")el.value=String(value);
    });
    /* Backwards compatibility with the earlier ISA-only save. */
    if(saved.m5IsaUsed===undefined){
      try{const legacy=localStorage.getItem("auroraIsaUsedCurrentTaxYear");if(legacy!==null&&byId("m5IsaUsed"))byId("m5IsaUsed").value=legacy;}catch(_){}
    }
  }
  function bind(){
    restoreMissionControls();
    fields.forEach(id=>{
      const el=byId(id); if(!el)return;
      const handle=()=>{simulate();queueMissionSave();};
      el.addEventListener("input",handle);
      el.addEventListener("change",handle);
    });
    window.addEventListener("pagehide",saveMissionControls);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveMissionControls();});
    simulate();
    saveMissionControls();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
  const oldLoad=window.loadData;if(typeof oldLoad==="function")window.loadData=async function(...args){const result=await oldLoad.apply(this,args);simulate();return result;};
})();

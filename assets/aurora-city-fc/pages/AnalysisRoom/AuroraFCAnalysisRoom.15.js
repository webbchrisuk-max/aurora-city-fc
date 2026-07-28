
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const money=(n,d=0)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:d,maximumFractionDigits:d}).format(Number.isFinite(n)?n:0);
  const num=id=>Number($(id)?.value||0);
  const parseMoney=text=>Number(String(text||"").replace(/[^0-9.-]/g,""))||0;
  function project(monthly){
    const base=parseMoney($("m5AnnualIncome")?.textContent)||4220;
    let capital=base/(num("m5Yield")/100||.08), queue=num("m5StartPot"), income=base;
    const y=num("m5Yield")/100||.08, reinvest=num("m5Reinvest")/100, cap=num("m5Isa"), used=Math.min(num("m5IsaUsed"),cap), tesco=num("m5Tesco"), tescoYear=num("m5TescoYear"), pause=num("m5PauseStart"), resume=num("m5ResumeYear"), target=num("m5TargetInput")||24000, now=new Date().getFullYear();
    let finish="10y+";
    if(base>=target)finish="Reached";
    for(let year=now;year<now+10;year++){
      const wages=(year>=pause&&year<resume)?0:monthly*12; queue+=wages; if(year===tescoYear)queue+=tesco;
      const capacity=year===now?Math.max(0,cap-used):cap, deploy=Math.min(queue,cap); queue-=deploy; capital+=deploy;
      income=capital*y; capital+=income*reinvest; income=capital*y;
      if(finish==="10y+"&&income>=target)finish=String(year);
    }
    return {finish,income};
  }
  function update(){
    const current=parseMoney($("m5AnnualIncome")?.textContent), target=num("m5TargetInput")||24000, finish=$("m5TargetFinish")?.textContent?.trim()||"—", now=new Date().getFullYear();
    if(!current)return;
    const pct=Math.min(100,current/Math.max(target,1)*100), gap=Math.max(0,target-current), monthly=current/12;
    $("m8TargetHeadline").textContent=money(target,0); $("m8CurrentVsTarget").textContent=`${money(current,0)} / ${money(target,0)}`; $("m8ProgressPercent").textContent=`${pct.toFixed(1)}%`; $("m8ProgressBar").style.width=`${pct}%`; $("m8RemainingCopy").textContent=gap?`${money(gap,0)} annual income remaining`:`Mission achieved`; $("m8MonthlyProgress").textContent=`${money(monthly,0)} per month`; $("m8FinishYear").textContent=finish;
    const fy=Number(finish), seasons=Number.isFinite(fy)?Math.max(0,fy-now):(finish==="Reached"?0:"10+"); $("m8SeasonsRemaining").textContent=typeof seasons==="number"?`${seasons} season${seasons===1?'':'s'}`:`${seasons} seasons`;
    $("m8TargetGap").textContent=money(gap,0); $("m8CurrentMonthly").textContent=money(monthly,0);
    const levels=[750,1000,1250,1500,2000,2500,3000,4000], next=levels.find(v=>v>monthly)||levels.at(-1); $("m8NextMilestone").textContent=money(next,0)+"/mo"; $("m8MilestoneGap").textContent=monthly>=levels.at(-1)?"Elite dividend club reached":`${money(Math.max(0,next-monthly),0)}/month to unlock`;
    let previous=0; try{previous=Number(localStorage.getItem("auroraM8LastAnnualIncome")||0)}catch(_){} const change=previous?current-previous:0; $("m8Momentum").textContent=previous?(change>=0?"+":"")+money(change,0):"Baseline"; $("m8MomentumDetail").textContent=previous?`${change>=0?'Income increased':'Income moved'} since the previous saved reading`:`First M8 reading saved on this device`; try{localStorage.setItem("auroraM8LastAnnualIncome",String(current))}catch(_){}
    const status=finish==="Reached"?"Mission complete":Number.isFinite(fy)&&fy<=2033?"Ahead of plan":Number.isFinite(fy)&&fy===2034?"On target":"Long-term route"; $("m8PaceStatus").textContent=status;
    $("m8MissionNotice").textContent=finish==="Reached"?`🏆 ${money(target,0)} annual income has been secured.`:Number.isFinite(fy)?`🏆 The current plan crosses ${money(target,0)} during the ${finish} season. ${gap?money(gap,0)+" of annual income remains today.":""}`:`The selected target remains beyond the ten-year simulation window.`;
    const plans=[{label:"Current plan",monthly:num("m5Monthly")},{label:"£1,250 monthly",monthly:1250},{label:"£1,500 monthly",monthly:1500}];
    $("m8Scenarios").innerHTML=plans.map((p,i)=>{const r=project(p.monthly); return `<button class="m8-scenario" type="button" data-m8-monthly="${p.monthly}"><small>${p.label}</small><strong>${r.finish}</strong><span>${i===0?'Active route':r.finish===finish?'Same finish season':`Projected target season`}</span></button>`}).join("");
    $("m8Scenarios").querySelectorAll("[data-m8-monthly]").forEach(b=>b.addEventListener("click",()=>{const input=$("m5Monthly"); if(!input)return; input.value=b.dataset.m8Monthly; input.dispatchEvent(new Event("input",{bubbles:true})); input.scrollIntoView({behavior:"smooth",block:"center"});}));
    const yieldRate=num("m5Yield"), reinvest=num("m5Reinvest"), backlog=parseMoney($("m5QueueEnd")?.textContent); let rating=70+Math.min(12,pct/8)+Math.min(8,reinvest/12.5)+Math.min(6,Math.max(0,10-Math.abs(yieldRate-8)*2))-Math.min(8,backlog/25000); rating=Math.max(50,Math.min(99,Math.round(rating))); $("m8ManagerRating").textContent=`${rating}/100`; $("m8RatingText").textContent=rating>=90?"Elite board confidence":rating>=80?"Very high board confidence":"Strong plan with room to improve";
    $("m8CoachTitle").textContent=status; $("m8CoachText").textContent=Number.isFinite(fy)?`Stay disciplined: the model reaches ${money(target,0)} in ${finish}. The fastest improvement comes from maintaining contributions, reinvesting dividends and avoiding forced high-yield decisions.`:`The target sits outside the current horizon. Raise contributions gradually or select a nearer milestone rather than forcing risk.`;
  }
  function boot(){update(); const watch=["m5AnnualIncome","m5TargetFinish","m5QueueEnd","m5ProjectedAnnual"]; watch.forEach(id=>{const el=$(id);if(el)new MutationObserver(()=>requestAnimationFrame(update)).observe(el,{childList:true,subtree:true,characterData:true});}); ["m5Monthly","m5StartPot","m5Tesco","m5Yield","m5Reinvest","m5Isa","m5IsaUsed","m5TescoYear","m5PauseStart","m5ResumeYear","m5TargetInput"].forEach(id=>$(id)?.addEventListener("input",()=>requestAnimationFrame(update))); setTimeout(update,500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

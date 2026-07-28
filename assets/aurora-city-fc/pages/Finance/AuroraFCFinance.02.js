
/* ===================== M23 RECURRING CASH-FLOW EXPANSION ===================== */
function m23DateValue(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function m23Recurrence(value){
  const recurrence=String(value||"none").toLowerCase();
  return ["weekly","fortnightly","four-weekly","monthly","yearly","none"].includes(recurrence)?recurrence:"none";
}
function m23RecurrenceLabel(value){
  return ({weekly:"Weekly",fortnightly:"Fortnightly","four-weekly":"Every 4 weeks",monthly:"Monthly",yearly:"Yearly",none:"One-off"})[m23Recurrence(value)]||"One-off";
}
function m23AdvanceDate(date,recurrence){
  const next=new Date(date);
  const rule=m23Recurrence(recurrence);
  if(rule==="weekly")next.setDate(next.getDate()+7);
  else if(rule==="fortnightly")next.setDate(next.getDate()+14);
  else if(rule==="four-weekly")next.setDate(next.getDate()+28);
  else if(rule==="yearly")next.setFullYear(next.getFullYear()+1);
  else if(rule==="monthly"){
    const originalDay=next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth()+1);
    const lastDay=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();
    next.setDate(Math.min(originalDay,lastDay));
  }
  return next;
}
function m23CashflowBaseItems(){
  const scheduled=(plannerState?.scheduledBills||[]).filter(item=>item&&item.included!==false);
  const scheduledKeys=new Set(scheduled.map(item=>`${String(item.name||"").trim().toLowerCase()}|${item.due||""}`));
  const yearly=(plannerState?.yearlyRecurringCosts||[])
    .filter(item=>item&&item.included!==false)
    .map(item=>{
      const due=item.paid?(item.nextRenewalDue||""):(item.due||"");
      return {...item,due,paid:false,recurrence:"yearly",_sourceLabel:"Yearly renewal"};
    })
    .filter(item=>item.due&&!scheduledKeys.has(`${String(item.name||"").trim().toLowerCase()}|${item.due||""}`));
  return [...scheduled,...yearly];
}
function m23ExpandBeforePayday(paydayValue){
  const today=new Date();today.setHours(0,0,0,0);
  let payday;
  if(paydayValue instanceof Date)payday=new Date(paydayValue);
  else if(paydayValue)payday=parseLocalDate(paydayValue);
  else payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():new Date(today);
  if(!(payday instanceof Date)||Number.isNaN(payday.getTime()))return [];
  payday.setHours(0,0,0,0);
  const expanded=[];
  m23CashflowBaseItems().forEach(item=>{
    if(!item.due)return;
    const base=parseLocalDate(item.due);
    if(Number.isNaN(base.getTime()))return;
    base.setHours(0,0,0,0);
    const recurrence=item._sourceLabel==="Yearly renewal"?"yearly":m23Recurrence(item.recurrence);
    let occurrence=new Date(base);
    let projectedIndex=0;
    if(item.paid){
      if(recurrence==="none")return;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex=1;
    }
    let guard=0;
    while(occurrence<today&&guard<120){
      if(recurrence==="none")return;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex+=1;
      guard+=1;
    }
    while(occurrence<payday&&guard<120){
      const isOriginal=!item.paid&&occurrence.getTime()===base.getTime();
      const cashAmount=isOriginal&&Number(item.actualPaid||0)>0?Number(item.actualPaid):Number(item.amount||0);
      expanded.push({
        ...item,
        due:m23DateValue(occurrence),
        _d:new Date(occurrence),
        _cashAmount:cashAmount,
        _projectedOccurrence:!isOriginal,
        _recurrenceLabel:m23RecurrenceLabel(recurrence),
        _sourceLabel:item._sourceLabel||(isOriginal?"":`${m23RecurrenceLabel(recurrence)} repeat`)
      });
      if(recurrence==="none")break;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex+=1;
      guard+=1;
    }
  });
  return expanded.sort((a,b)=>a._d-b._d||String(a.name||"").localeCompare(String(b.name||""),"en-GB"));
}
/* ===================== M13 LIVE DASHBOARD BINDING ===================== */
function m13GBP(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m13Num(id){return Number(document.getElementById(id)?.value||0)}
function m13Date(v){if(!v)return null;const d=typeof parseLocalDate==="function"?parseLocalDate(v):new Date(v);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
function m13Set(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function m13Render(){
  if(typeof plannerState==="undefined")return;
  const pay=m13Num("simPayInput")||2100;
  const isa=m13Num("simInvestInput");
  const lifestyle=m13Num("simLifestyleInput");
  const goals=m13Num("simGoalsInput");
  const grow=m13Num("simGrowInput");
  const holding=Number(plannerState.holdingBalance||0);
  const flex=Math.max(0,pay-isa-lifestyle-goals-grow);

  const included=(plannerState.scheduledBills||[]).filter(x=>x&&x.included);
  const unpaidScheduled=included.filter(x=>!x.paid);
  const scheduledKeys=new Set(unpaidScheduled.map(x=>`${String(x.name||"").trim().toLowerCase()}|${x.due||""}`));
  const unpaidYearly=(plannerState.yearlyRecurringCosts||[])
    .filter(x=>x&&x.included&&!x.paid)
    .filter(x=>!scheduledKeys.has(`${String(x.name||"").trim().toLowerCase()}|${x.due||""}`))
    .map(x=>({...x,_sourceLabel:"Yearly renewal"}));
  const unpaid=[...unpaidScheduled,...unpaidYearly];
  const unpaidTotal=unpaid.reduce((s,x)=>s+Number(x.amount||0),0);
  const recurringMonthly=(plannerState.recurringCosts||[]).filter(x=>x&&x.included).reduce((s,x)=>s+Number(x.amount||0),0);
  const protectedMoney=Number(plannerState.minimumBuffer||0)+unpaidTotal+recurringMonthly;
  const trueSurplus=Math.max(0,holding-protectedMoney);
  const safeToMove=trueSurplus;
  const days=typeof getDaysToNextPayday==="function"?getDaysToNextPayday():0;
  const payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():null;
  const today=new Date();today.setHours(0,0,0,0);
  if(payday)payday.setHours(23,59,59,999);
  const before=typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(payday):unpaid.map(x=>({...x,_d:m13Date(x.due),_cashAmount:Number(x.amount||0)})).filter(x=>x._d&&x._d>=today&&(!payday||x._d<payday)).sort((a,b)=>a._d-b._d);
  const beforeTotal=before.reduce((s,x)=>s+Number((x._cashAmount??x.amount)||0),0);
  const projected=holding-beforeTotal;
  const protectionPct=holding>0?Math.min(100,Math.max(0,(protectedMoney/holding)*100)):0;
  const score=Math.max(0,Math.min(100,Math.round(100-(beforeTotal>holding?45:0)-(holding<Number(plannerState.minimumBuffer||0)?30:0)+(trueSurplus>0?8:0))));

  m13Set("m13ExpectedPay",m13GBP(pay));m13Set("m13Isa",m13GBP(isa));m13Set("m13Goals",m13GBP(goals));m13Set("m13Lifestyle",m13GBP(lifestyle));m13Set("m13Flex",m13GBP(flex));m13Set("m13Holding",m13GBP(holding));
  m13Set("m32TopBalance",m13GBP(holding));m13Set("m32TopBefore",m13GBP(beforeTotal));m13Set("m32TopProjected",m13GBP(projected));m13Set("m32TopSafe",m13GBP(safeToMove));
  m13Set("m32TopBalanceNote",beforeTotal>0?`${before.length} payment${before.length===1?"":"s"} due before payday • ${m13GBP(beforeTotal)} protected`:`No included payments are due before payday`);
  m13Set("m13LineIsa",m13GBP(isa).replace(".00",""));m13Set("m13LineGoals",m13GBP(goals).replace(".00",""));m13Set("m13LineLifestyle",m13GBP(lifestyle).replace(".00",""));m13Set("m13LineHolding",m13GBP(Math.max(0,Number(plannerState.minimumBuffer||0))));
  m13Set("m13BufferValue",m13GBP(flex));m13Set("m13RunHolding",m13GBP(holding));m13Set("m13RunProtected",m13GBP(protectedMoney));m13Set("m13RunSurplus",m13GBP(trueSurplus));m13Set("m13RunSafe",m13GBP(safeToMove));m13Set("m13DaysBadge",`${days} DAYS`);
  m13Set("m13RunwayPct",`${Math.round(protectionPct)}%`);document.getElementById("m13Donut")?.style.setProperty("--runway",`${protectionPct}%`);
  m13Set("m13BeforeCurrent",m13GBP(holding));m13Set("m13BeforeOut",m13GBP(beforeTotal));m13Set("m13BeforeCount",String(before.length));m13Set("m13BeforeProjected",m13GBP(projected));m13Set("m13ImpactNow",m13GBP(holding));m13Set("m13ImpactOut",`−${m13GBP(beforeTotal)}`);m13Set("m13ImpactFinal",m13GBP(projected));
  m13Set("m13Score",String(score));document.getElementById("m13ScoreRing")?.style.setProperty("--score",`${score}%`);
  m13Set("m13ScoreLabel",score>=80?"STRONG POSITION":score>=60?"CONTROLLED POSITION":"PROTECT THE POT");
  m13Set("m13SideStatus",`${days} days to payday • ${before.length} payment${before.length===1?"":"s"} before payday`);

  const title=beforeTotal===0?"No scheduled payments are currently due before payday.":projected>=Number(plannerState.minimumBuffer||0)?"Your known payments are covered before payday.":"Protect the Holding Pot — the current projection is tight.";
  const copy=beforeTotal===0?"Aurora has not found any included, unpaid bill with a due date before the next payday.":`Aurora has found ${before.length} unpaid payment${before.length===1?"":"s"} totalling ${m13GBP(beforeTotal)} before payday. Your projected balance afterwards is ${m13GBP(projected)}.`;
  m13Set("m13BriefTitle",title);m13Set("m13BriefCopy",copy);
  document.getElementById("m13Callout").innerHTML=`<strong>Holding Pot instruction:</strong> ${projected>=Number(plannerState.minimumBuffer||0)?"keep the remaining flex buffered and review again at the end of the cycle.":"do not move extra money to shares until the bill position improves."}`;
  m13Set("m13BufferText",`Keep the ${m13GBP(flex)} remaining flex available. At the end of the pay cycle, move only the genuine leftover after actual bills and spending are confirmed.`);
  m13Set("m13Ticker",`Expected pay ${m13GBP(pay)} • IG ISA ${m13GBP(isa)} • Goal pots ${m13GBP(goals)} • Lifestyle ${m13GBP(lifestyle)} • ${m13GBP(beforeTotal)} scheduled before payday • projected balance ${m13GBP(projected)}`);

  const list=document.getElementById("m13CashflowList");
  if(list){
    if(!before.length){
      list.innerHTML=`<div class="m31-cashflow-clear"><span>✓</span><div><strong>Cash flow clear</strong><small>No included payments are due before payday.</small></div><b>${m13GBP(0)}</b></div>`;
    }else{
      const visible=before.slice(0,4);
      const hidden=before.slice(4);
      const rows=visible.map(x=>`<div class="m13-cashflow-item"><div class="m13-cashflow-date">${x._d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">−${m13GBP(x._cashAmount??x.amount)}</div></div>`).join("");
      const more=hidden.length?`<details class="m31-cashflow-more"><summary>View ${hidden.length} more payment${hidden.length===1?'':'s'} <span>${m13GBP(hidden.reduce((s,x)=>s+Number((x._cashAmount ?? x.amount) || 0),0))}</span></summary><div class="m31-cashflow-hidden">${hidden.map(x=>`<div class="m13-cashflow-item"><div class="m13-cashflow-date">${x._d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">−${m13GBP(x._cashAmount??x.amount)}</div></div>`).join('')}</div></details>`:'';
      list.innerHTML=rows+more;
    }
  }

  const upcoming=[...unpaid].filter(x=>m13Date(x.due)).sort((a,b)=>m13Date(a.due)-m13Date(b.due)).slice(0,4);
  const up=document.getElementById("m13UpcomingBills");
  if(up)up.innerHTML=upcoming.length?upcoming.map(x=>{const d=m13Date(x.due);return `<div class="m13-cashflow-item"><div class="m13-cashflow-date">${d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">${m13GBP(x.amount)}</div></div>`}).join(""):`<div class="m13-cashflow-item"><div class="m13-cashflow-date">CLEAR</div><div><div class="m13-cashflow-name">No upcoming dated bills</div><div class="m13-cashflow-meta">Add due dates in Bills & Spending</div></div><div class="m13-cashflow-amount">—</div></div>`;
}
function m13ScrollTo(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
document.querySelectorAll("#m13Nav button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");m13ScrollTo(btn.dataset.target)}));
document.getElementById("m13Refresh")?.addEventListener("click",()=>{if(typeof runPlanner==="function")runPlanner();m13Render()});
document.getElementById("m13Presentation")?.addEventListener("click",()=>document.documentElement.requestFullscreen?.());
document.addEventListener("input",()=>setTimeout(m13Render,0));
document.addEventListener("change",()=>setTimeout(m13Render,0));
window.addEventListener("load",()=>setTimeout(m13Render,80));

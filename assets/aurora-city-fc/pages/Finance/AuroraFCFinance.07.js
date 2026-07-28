
/* ===================== M16 ALL TAB VIEW BUILDER ===================== */
const M16_VIEW_DATA = {
  m13Bills:{
    eyebrow:"CASH-FLOW OPERATIONS",
    title:"Bills & Spending Centre",
    copy:"Manage every outgoing, record actual spending and keep the Holding Pot forecast accurate.",
    status:"BILL CONTROL LIVE",
    note:"Only included and unpaid entries with valid dates affect the before-payday forecast. Marking a bill paid immediately updates the dashboard.",
    kpis:()=>[
      ["Unpaid scheduled",m16Money(m16UnpaidTotal()),"#fb7185"],
      ["Due before payday",m16Money(m16BeforePaydayTotal()),"#fbbf24"],
      ["Payments remaining",String(m16BeforePaydayItems().length),"#22d3ee"],
      ["Projected balance",m16Money(Number(plannerState?.holdingBalance||0)-m16BeforePaydayTotal()),"#34d399"]
    ]
  },
  m13PotHealth:{
    eyebrow:"SAVINGS SQUAD MANAGEMENT",
    title:"Pot Health Centre",
    copy:"See which pots are critical, which are on track and where the next available money should be directed.",
    status:"POT RADAR LIVE",
    note:"Pot priority controls the suggested funding order: P1 Critical first, then P2 Important, followed by P3 Flexible.",
    kpis:()=>{
      const pots=Array.isArray(plannerState?.editablePots)?plannerState.editablePots:[];
      const total=pots.reduce((s,p)=>s+Number(p.balance||0),0);
      const target=pots.reduce((s,p)=>s+Number(p.target||0),0);
      const gap=Math.max(0,target-total);
      const critical=pots.filter(p=>Number(p.priority||2)===1&&Number(p.balance||0)<Number(p.target||0)).length;
      return [
        ["Total pot balances",m16Money(total),"#22d3ee"],
        ["Combined targets",m16Money(target),"#a78bfa"],
        ["Remaining funding gap",m16Money(gap),"#fbbf24"],
        ["Critical pots below target",String(critical),"#fb7185"]
      ]
    }
  },
  m13Funding:{
    eyebrow:"SURPLUS ROUTING ENGINE",
    title:"Funding & Growth Centre",
    copy:"Turn genuine surplus into a controlled route across buffers, pots and long-term investing.",
    status:"ROUTING ENGINE LIVE",
    note:"Aurora should only route money after the Holding Pot, unpaid bills and recurring monthly commitments have been protected.",
    kpis:()=>{
      const holding=Number(plannerState?.holdingBalance||0);
      const protectedValue=m16Protected();
      const surplus=Math.max(0,holding-protectedValue);
      const min=Number(plannerState?.minimumBuffer||0);
      return [
        ["Holding Pot",m16Money(holding),"#22d3ee"],
        ["Protection requirement",m16Money(protectedValue),"#fbbf24"],
        ["True surplus",m16Money(surplus),"#34d399"],
        ["Minimum buffer",m16Money(min),"#a78bfa"]
      ]
    }
  },
  m13History:{
    eyebrow:"FINANCIAL RECORDS",
    title:"History & Breakdown Centre",
    copy:"Review completed spending, compare categories and follow changes in the Holding Pot over time.",
    status:"RECORDS READY",
    note:"The full House Project Ledger now lives only in Pot Health. House payments still feed the history totals and breakdowns automatically.",
    kpis:()=>{
      const hist=Array.isArray(plannerState?.holdingHistory)?plannerState.holdingHistory:[];
      const current=Number(plannerState?.holdingBalance||0);
      const first=hist.length?Number(hist[0]?.balance||hist[0]?.value||0):current;
      const change=current-first;
      const scheduledPaid=(plannerState?.scheduledBills||[]).filter(x=>x?.paid).reduce((s,x)=>s+Number(x.amount||0),0);
      const housePaid=(plannerState?.houseProjectLedger?.entries||[]).filter(x=>x?.status==='paid'||x?.status==='historical').reduce((s,x)=>s+Number(x.amount||0),0);
      const paid=scheduledPaid+housePaid;
      return [
        ["Current Holding Pot",m16Money(current),"#22d3ee"],
        ["Saved snapshots",String(hist.length),"#60a5fa"],
        ["Recorded paid bills",m16Money(paid),"#fbbf24"],
        ["Balance change",`${change>=0?"+":""}${m16Money(change)}`,change>=0?"#34d399":"#fb7185"]
      ]
    }
  }
};
function m16Money(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m16ValidDate(v){if(!v)return null;const d=typeof parseLocalDate==="function"?parseLocalDate(v):new Date(v);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
function m16BeforePaydayItems(){
  const payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():null;
  return typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(payday):[];
}
function m16BeforePaydayTotal(){return m16BeforePaydayItems().reduce((s,x)=>s+Number((x._cashAmount??x.amount)||0),0)}
function m16UnpaidTotal(){return (plannerState?.scheduledBills||[]).filter(x=>x&&x.included&&!x.paid).reduce((s,x)=>s+Number(x.amount||0),0)}
function m16Protected(){
  const unpaid=m16UnpaidTotal();
  const recurring=(plannerState?.recurringCosts||[]).filter(x=>x&&x.included).reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.spentThisCycle||0)),0);
  return Number(plannerState?.minimumBuffer||0)+unpaid+recurring;
}
function m16ApplyGridClasses(target){
  const planner=document.getElementById("m14WorkingPlanner");
  if(!planner)return;
  planner.classList.add("m16-view-grid");
  const visible=[...planner.querySelectorAll(".section.m14-visible")];
  visible.forEach((section,index)=>{
    section.classList.remove("m16-wide","m16-third");
    const heading=(section.querySelector("h2,.m15-hero h3,.m22-hero h3")?.textContent||"").trim();
    if(target==="m13Bills"&&["Bills Control Centre","Editable Future Costs"].includes(heading))section.classList.add("m16-wide");
    if(target==="m13PotHealth"&&heading==="Pot Health Radar")section.classList.add("m16-wide");
    if(target==="m13HouseProject")section.classList.add("m16-wide");
    if(target==="m13Funding"&&["Financial Freedom Flight Path","Funding Engine"].includes(heading))section.classList.add("m16-wide");
    if(target==="m13History")section.classList.add("m16-wide");
    if(visible.length===3&&!section.classList.contains("m16-wide"))section.classList.add("m16-third");
  });
}
function m16RenderOverview(target){
  const config=M16_VIEW_DATA[target];
  const box=document.getElementById("m16ViewOverview");
  if(!box)return;
  if(!config){box.classList.remove("active");return}
  box.classList.add("active");
  document.getElementById("m16Eyebrow").textContent=config.eyebrow;
  document.getElementById("m16OverviewTitle").textContent=config.title;
  document.getElementById("m16OverviewCopy").textContent=config.copy;
  document.getElementById("m16StatusText").textContent=config.status;
  document.getElementById("m16ViewNote").textContent=config.note;
  document.getElementById("m16Kpis").innerHTML=config.kpis().map(([label,value,color])=>
    `<div class="m16-kpi" style="--c:${color}"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
  m16ApplyGridClasses(target);
}
const m16OriginalShowView=window.m14ShowView;
window.m14ShowView=function(target){
  m16OriginalShowView(target);
  setTimeout(()=>m16RenderOverview(target),0);
};
const m16OriginalShowDashboard=window.m14ShowDashboard;
window.m14ShowDashboard=function(){
  document.getElementById("m16ViewOverview")?.classList.remove("active");
  document.getElementById("m14WorkingPlanner")?.classList.remove("m16-view-grid");
  m16OriginalShowDashboard();
};
document.addEventListener("input",()=>setTimeout(()=>{
  const active=[...document.querySelectorAll("#m13Nav button")].find(b=>b.classList.contains("active"))?.dataset.target;
  if(M16_VIEW_DATA[active])m16RenderOverview(active);
},0));
document.addEventListener("change",()=>setTimeout(()=>{
  const active=[...document.querySelectorAll("#m13Nav button")].find(b=>b.classList.contains("active"))?.dataset.target;
  if(M16_VIEW_DATA[active])m16RenderOverview(active);
},0));


/* ===================== M33 PAYDAY SCENARIO LAB ===================== */
const m33ScenarioState={mode:"overtime",initialised:false,userEdited:false};
function m33Num(id){return Math.max(0,Number(document.getElementById(id)?.value||0))}
function m33SetValue(id,value){const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)}
function m33LiveBreakdown(plan){
  const result={holding:Number(plan?.holdingAmount||0),lifestyle:0,goals:0,house:0,emergency:0,shares:0,retained:Number(plan?.buffered||0)};
  (plan?.actions||[]).forEach(action=>{
    if(action.type==="lifestyle")result.lifestyle+=Number(action.amount||0);
    else if(action.type==="investment")result.shares+=Number(action.amount||0);
    else if(action.type==="pot"){
      const name=String(action.name||"").toLowerCase();
      if(name.includes("house")||name.includes("home")||name.includes("renovation"))result.house+=Number(action.amount||0);
      else if(name.includes("emergency")||name.includes("rainy")||name.includes("safety"))result.emergency+=Number(action.amount||0);
      else result.goals+=Number(action.amount||0);
    }
  });
  return result;
}
function m33SeedScenario(mode=m33ScenarioState.mode){
  const plan=m22CurrentPlan();const live=m33LiveBreakdown(plan);const expected=Number(plan.expected||2100);const currentExtra=Math.max(0,Number(plan.actual||0)-expected);
  m33ScenarioState.mode=mode;m33ScenarioState.initialised=true;m33ScenarioState.userEdited=false;
  let pay=Number(plan.actual||expected);
  if(mode==="baseline")pay=expected;
  if(mode==="overtime")pay=expected+(currentExtra>0?currentExtra:800);
  m33SetValue("m33ScenarioPay",pay);m33SetValue("m33ScenarioShares",live.shares||Number(plan.inputs?.coreInvestment||0));m33SetValue("m33ScenarioLifestyle",live.lifestyle||Number(plan.inputs?.lifestyle||0));m33SetValue("m33ScenarioGoals",live.goals||Number(plan.inputs?.goalPots||0));m33SetValue("m33ScenarioHouse",live.house||Number(plan.inputs?.houseBoost||0));m33SetValue("m33ScenarioEmergency",live.emergency||Number(plan.inputs?.emergencyBoost||0));
  document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.m33Mode===mode));
  const note=document.getElementById("m33ModeNote");if(note)note.textContent=mode==="baseline"?"Baseline mirrors the expected wage and current allocation priorities.":mode==="overtime"?`Overtime mode starts with ${m15Money(currentExtra>0?currentExtra:800)} above expected pay.`:"Custom mode keeps every value under your control.";
  m33RenderScenario();
}
function m33ComputeScenario(){
  const plan=m22CurrentPlan();const protection=m22BillProtection(m22EnsureState().paydayDate);const pay=m33Num("m33ScenarioPay");
  const urgent=Math.min(protection.topUp,pay);let left=Math.max(0,pay-urgent);const regularTarget=m24RegularHoldingContribution();const regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
  let lifestyle=m33Num("m33ScenarioLifestyle"),goals=m33Num("m33ScenarioGoals"),house=m33Num("m33ScenarioHouse"),emergency=m33Num("m33ScenarioEmergency"),shares=m33Num("m33ScenarioShares");
  let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-left);
  const trim=(key)=>{const cut=Math.min(key.value,deficit);key.value-=cut;deficit-=cut;return cut};
  const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
  const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
  const allocated=urgent+regular+lifestyle+goals+house+emergency+shares;const retained=Math.max(0,pay-allocated);const unresolved=Math.max(0,protection.topUp-urgent)+Math.max(0,regularTarget-regular);
  let state="healthy",label="HEALTHY";if(unresolved>.009){state="risk";label="UNPROTECTED"}else if(Object.values(cuts).reduce((a,b)=>a+b,0)>.009){state="risk";label="AUTO-REDUCED"}else if(retained<100){state="tight";label="TIGHT"}
  const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/pay*100||0)-(Object.values(cuts).reduce((a,b)=>a+b,0)/(pay||1)*60)-(retained<100?(100-retained)/2:0))));
  return {plan,pay,urgent,regular,protection:urgent+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,cuts,state,label,score};
}
function m33Diff(value){const n=Number(value||0);return `${n>0?"+":n<0?"−":""}${m15Money(Math.abs(n))}`}
function m33RenderScenario(){
  if(!document.getElementById("m33ScenarioPay"))return;
  if(!m33ScenarioState.initialised){m33SeedScenario("overtime");return}
  const scenario=m33ComputeScenario(),live=m33LiveBreakdown(scenario.plan);
  const verdict=document.getElementById("m33ScenarioVerdict");if(verdict)verdict.dataset.state=scenario.state;
  m15Set("m33ScenarioStatus",scenario.label);m15Set("m33ScenarioScore",String(scenario.score));m15Set("m33ScenarioProtection",m15Money(scenario.protection));m15Set("m33ScenarioAllocated",m15Money(scenario.allocated));m15Set("m33ScenarioRetained",m15Money(scenario.retained));
  const categories=[
    ["Holding protection","holding",scenario.protection],
    ["Spending Pot","lifestyle",scenario.lifestyle],
    ["Other goal pots","goals",scenario.goals],
    ["House Pot","house",scenario.house],
    ["Emergency Fund","emergency",scenario.emergency],
    ["Shares","shares",scenario.shares],
    ["Retained","retained",scenario.retained]
  ];
  const stack=document.getElementById("m33AllocationStack");if(stack){const max=Math.max(1,...categories.map(row=>row[2]));stack.innerHTML=categories.filter(row=>row[2]>.009).map(([label,key,value])=>`<div class="m33-stack-row"><span>${m22Escape(label)}</span><div class="m33-stack-track"><div class="m33-stack-fill" style="width:${Math.max(3,value/max*100).toFixed(1)}%"></div></div><strong>${m15Money(value)}</strong></div>`).join("")}
  const body=document.getElementById("m33ComparisonBody");if(body)body.innerHTML=categories.map(([label,key,value])=>{const difference=value-Number(live[key]||0);const cls=difference>0.009?"pos":difference<-.009?"neg":"zero";return `<div class="m33-compare-row"><span>${m22Escape(label)}</span><span>${m15Money(live[key]||0)}</span><span>${m15Money(value)}</span><span class="m33-change ${cls}">${m33Diff(difference)}</span></div>`}).join("");
  const liveRetained=Number(live.retained||0),retainedChange=scenario.retained-liveRetained;m15Set("m33ScenarioDifference",`${m33Diff(retainedChange)} retained`);
  const cutTotal=Object.values(scenario.cuts).reduce((a,b)=>a+b,0);const insight=document.getElementById("m33ScenarioInsight");if(insight){
    if(scenario.unresolved>.009)insight.innerHTML=`<strong>Protection warning:</strong> this wage is ${m15Money(scenario.unresolved)} short of the Holding Pot requirement. Aurora would stop flexible funding before allowing the mission to close.`;
    else if(cutTotal>.009)insight.innerHTML=`<strong>Overallocated:</strong> Aurora automatically removed ${m15Money(cutTotal)} from flexible allocations so the scenario cannot spend more than the wage received.`;
    else if(scenario.retained<100)insight.innerHTML=`<strong>Tight finish:</strong> the plan works, but only ${m15Money(scenario.retained)} remains in the current account. A larger retained cushion would make the cycle safer.`;
    else if(retainedChange>100)insight.innerHTML=`<strong>Stronger buffer:</strong> this scenario keeps ${m15Money(retainedChange)} more in the current account than the live plan while protecting every required move.`;
    else if(scenario.shares>live.shares)insight.innerHTML=`<strong>Investment opportunity:</strong> shares rise by ${m15Money(scenario.shares-live.shares)} and the plan still retains ${m15Money(scenario.retained)}.`;
    else insight.innerHTML=`<strong>Balanced scenario:</strong> every required protection move is covered and ${m15Money(scenario.retained)} remains uncommitted.`;
  }
  const apply=document.getElementById("m33ApplyScenario"),mission=m22EnsureState();if(apply){const locked=Boolean(mission.plan||m22AnyExecuted()||mission.completed);apply.disabled=locked;apply.textContent=locked?"Live Plan Locked":"Apply Scenario to Live Plan"}
}
function m33ShowApply(message,error=false){const box=document.getElementById("m33ApplyStatus");if(!box)return;box.textContent=message;box.className=`m33-apply-status show${error?" error":""}`;clearTimeout(window.m33ApplyTimer);window.m33ApplyTimer=setTimeout(()=>box.classList.remove("show"),4800)}
function m33ApplyScenario(){
  const mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed){m33ShowApply("The live mission is locked because execution has started.",true);return}
  const scenario=m33ComputeScenario();
  m33SetValue("m15ActualPay",scenario.pay);m33SetValue("m22CoreInvestment",scenario.shares);m33SetValue("m22Lifestyle",scenario.lifestyle);m33SetValue("m22GoalPots",scenario.goals);m33SetValue("m33LiveHouseBoost",scenario.house);m33SetValue("m33LiveEmergencyBoost",scenario.emergency);m33SetValue("m15AllocateExtra",0);
  const extra=document.getElementById("m15AllocateExtra");if(extra)extra.dataset.userEdited="1";
  mission.inputs=m22InputSnapshot();mission.plan=null;m22Save();m22Render();m33ShowApply("Scenario applied. The left-hand live mission has been rebuilt and is ready for review.");
}
document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.addEventListener("click",()=>m33SeedScenario(btn.dataset.m33Mode)));
document.querySelectorAll("#m33ScenarioPay,#m33ScenarioShares,#m33ScenarioLifestyle,#m33ScenarioGoals,#m33ScenarioHouse,#m33ScenarioEmergency").forEach(input=>input.addEventListener("input",()=>{m33ScenarioState.mode="custom";m33ScenarioState.userEdited=true;document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.m33Mode==="custom"));const note=document.getElementById("m33ModeNote");if(note)note.textContent="Custom mode keeps every value under your control.";m33RenderScenario()}));
document.getElementById("m33ResetScenario")?.addEventListener("click",()=>m33SeedScenario("overtime"));document.getElementById("m33ApplyScenario")?.addEventListener("click",m33ApplyScenario);
window.addEventListener("load",()=>setTimeout(()=>m33SeedScenario("overtime"),40));

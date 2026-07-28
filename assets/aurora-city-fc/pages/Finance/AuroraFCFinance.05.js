
/* ===================== M24 PAYDAY MISSION CONTROL + REGULAR HOLDING CONTRIBUTION ===================== */
function m15Money(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m15Value(id){return Math.max(0,Number(document.getElementById(id)?.value||0))}
function m15Set(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function m15PotPriority(p){return Math.max(1,Math.min(3,Number(p?.priority||2)))}
function m15PotGap(p){return Math.max(0,Number(p?.target||0)-Number(p?.balance||0))}
function m22IsoDate(date){if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "";return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function m22DefaultPayday(){try{return m22IsoDate(getNextPaydayDate())}catch(error){return m22IsoDate(new Date())}}
function m22FreshMission(paydayDate){return {version:22,id:`payday-${paydayDate||m22DefaultPayday()}-${Date.now()}`,paydayDate:paydayDate||m22DefaultPayday(),inputs:{expected:2100,actual:2100,coreInvestment:1500,lifestyle:250,goalPots:250,houseBoost:0,emergencyBoost:0,extraAllocate:0,strategy:"priority",platform:"ig",extraEdited:false},executed:{},plan:null,completed:false,startedAt:"",completedAt:"",receipt:null}}
function m22EnsureState(){
  if(!Array.isArray(plannerState.paydayHistory))plannerState.paydayHistory=[];
  if(!plannerState.paydayMission||plannerState.paydayMission.version!==22)plannerState.paydayMission=m22FreshMission();
  plannerState.paydayMission.executed=plannerState.paydayMission.executed&&typeof plannerState.paydayMission.executed==="object"?plannerState.paydayMission.executed:{};
  plannerState.paydayMission.inputs={...m22FreshMission(plannerState.paydayMission.paydayDate).inputs,...(plannerState.paydayMission.inputs||{})};
  return plannerState.paydayMission;
}
function m22Save(){if(typeof savePlannerData==="function")savePlannerData();else try{localStorage.setItem("auroraSpendingPlanner",JSON.stringify(plannerState))}catch(error){console.warn(error)}}
function m22Escape(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function m22ShowStatus(message,isError=false){const box=document.getElementById("m22Status");if(!box)return;box.textContent=message;box.classList.toggle("error",Boolean(isError));box.classList.add("show");clearTimeout(window.m22StatusTimer);window.m22StatusTimer=setTimeout(()=>box.classList.remove("show"),5200)}
function m22InputSnapshot(){return {expected:m15Value("m15ExpectedPay"),actual:m15Value("m15ActualPay"),coreInvestment:m15Value("m22CoreInvestment"),lifestyle:m15Value("m22Lifestyle"),goalPots:m15Value("m22GoalPots"),houseBoost:m15Value("m33LiveHouseBoost"),emergencyBoost:m15Value("m33LiveEmergencyBoost"),extraAllocate:m15Value("m15AllocateExtra"),strategy:document.getElementById("m15Strategy")?.value||"priority",platform:document.getElementById("m22InvestmentPlatform")?.value||"ig",extraEdited:Boolean(document.getElementById("m15AllocateExtra")?.dataset.userEdited==="1")}}
function m22SyncHiddenSimulator(inputs){
  const map={simPayInput:inputs.expected,simInvestInput:inputs.coreInvestment,simLifestyleInput:inputs.lifestyle,simGoalsInput:inputs.goalPots};
  Object.entries(map).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)});
}
function m22HydrateInputs(){
  const mission=m22EnsureState(),i=mission.inputs||{};
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??""};
  set("m22PaydayDate",mission.paydayDate||m22DefaultPayday());set("m15ExpectedPay",i.expected);set("m15ActualPay",i.actual);set("m22CoreInvestment",i.coreInvestment);set("m22Lifestyle",i.lifestyle);set("m22GoalPots",i.goalPots);set("m33LiveHouseBoost",i.houseBoost||0);set("m33LiveEmergencyBoost",i.emergencyBoost||0);set("m15AllocateExtra",i.extraAllocate);set("m15Strategy",i.strategy);set("m22InvestmentPlatform",i.platform);
  const extra=document.getElementById("m15AllocateExtra");if(extra)extra.dataset.userEdited=i.extraEdited?"1":"0";
  m22SyncHiddenSimulator(i);
}
function m22BillProtection(paydayDate){
  const items=typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(paydayDate):[];
  const bills=items.reduce((sum,item)=>sum+Number((item._cashAmount??item.amount)||0),0);
  const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false).reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)-Number(item.spentThisCycle||0)),0);
  const minimum=Math.max(0,Number(plannerState.minimumBuffer||0));
  const holding=Math.max(0,Number(plannerState.holdingBalance||0));
  const required=minimum+bills+recurring;
  return {items,bills,recurring,minimum,holding,required,topUp:Math.max(0,required-holding)};
}
function m24RegularHoldingContribution(){
  const scheduled=(plannerState.scheduledBills||[]).filter(item=>item?.included!==false);
  const future=(plannerState.futureCosts||[]).filter(item=>item?.included!==false);
  const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false);
  const yearly=(plannerState.yearlyRecurringCosts||[]).filter(item=>item?.included!==false);
  const includedTotal=scheduled.reduce((sum,item)=>sum+Number(item.amount||0),0)
    + future.reduce((sum,item)=>sum+Number(item.amount||0),0)
    + recurring.reduce((sum,item)=>sum+(Number(item.amount||0)*12),0)
    + yearly.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const plannedPaid=scheduled.filter(item=>item.paid).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const actualPaid=scheduled.filter(item=>item.paid).reduce((sum,item)=>sum+Number(item.actualPaid||0),0);
  const recurringReleased=recurring.reduce((sum,item)=>{
    const original=Number(item.originalAmount??item.amount??0);
    const current=Number(item.amount||0);
    return sum+(current<original?(original-current)*12:0);
  },0);
  const released=Math.max(0,plannedPaid-actualPaid)+Math.max(0,recurringReleased);
  const deficit=Math.max(0,includedTotal-Number(plannerState.holdingBalance||0)-released);
  return Math.max(0,deficit/13);
}
function m22PotCandidates(excludeIds=[]){
  const excluded=new Set(excludeIds.map(String));
  return (Array.isArray(plannerState.editablePots)?plannerState.editablePots:[]).map(p=>({...p,gap:m15PotGap(p),priority:m15PotPriority(p)})).filter(p=>p.gap>0&&!excluded.has(String(p.id||"")));
}
function m22BuildPotActions(amount,strategy,prefix="goal",excludeIds=[]){
  let remaining=Math.max(0,Number(amount||0));const actions=[];const pots=m22PotCandidates(excludeIds);
  const push=(p,value,meta)=>{const actual=Math.max(0,Math.min(remaining,value,p.gap-actions.filter(a=>a.potId===p.id).reduce((s,a)=>s+a.amount,0)));if(actual<=0)return;actions.push({id:`${prefix}:pot:${p.id||p.name}`,name:p.name,amount:actual,type:"pot",potId:p.id||p.name,meta});remaining-=actual};
  if(strategy==="balanced"){
    let active=[...pots].sort((a,b)=>a.priority-b.priority||b.gap-a.gap);
    while(remaining>.009&&active.length){const share=remaining/active.length,next=[];active.forEach(p=>{const used=actions.filter(a=>a.potId===p.id).reduce((s,a)=>s+a.amount,0);const need=Math.max(0,p.gap-used);const value=Math.min(share,need,remaining);if(value>0){actions.push({id:`${prefix}:pot:${p.id||p.name}`,name:p.name,amount:value,type:"pot",potId:p.id||p.name,meta:`P${p.priority} • balanced funding • ${m15Money(p.gap)} gap`});remaining-=value}if(need-value>.009)next.push(p)});if(next.length===active.length&&share<.01)break;active=next}
  }else{
    const maxPriority=strategy==="critical"?1:3;
    pots.filter(p=>p.priority<=maxPriority).sort((a,b)=>a.priority-b.priority||b.gap-a.gap).forEach(p=>push(p,p.gap,`P${p.priority} ${p.priority===1?"Critical":p.priority===2?"Important":"Flexible"} • ${m15Money(p.gap)} target gap`));
  }
  const merged=[];const byId=new Map();actions.forEach(action=>{if(byId.has(action.id)){byId.get(action.id).amount+=action.amount}else{const copy={...action};byId.set(copy.id,copy);merged.push(copy)}});
  return {actions:merged,remaining};
}
function m22InvestmentActions(amount,platform,prefix="core"){
  const total=Math.max(0,Number(amount||0));if(total<=.009)return [];
  if(platform==="split"){const first=Math.round(total*50)/100;return [{id:`${prefix}:investment:ig`,name:"IG ISA",amount:first,type:"investment",meta:"Investment transfer • 50% split"},{id:`${prefix}:investment:t212`,name:"Trading 212 ISA",amount:total-first,type:"investment",meta:"Investment transfer • 50% split"}]}
  const name=platform==="t212"?"Trading 212 ISA":"IG ISA";return [{id:`${prefix}:investment:${platform}`,name,amount:total,type:"investment",meta:prefix==="core"?"Core payday share contribution":"Extra pay routed to investments"}]
}

function m33FindSpecialPot(kind){
  const pots=Array.isArray(plannerState.editablePots)?plannerState.editablePots:[];
  const words=kind==="house"?["house","home","renovation","project"]:["emergency","rainy","safety","reserve"];
  return pots.find(p=>words.some(word=>String(p?.name||"").toLowerCase().includes(word)))||null;
}
function m33BuildSpecialPotAction(amount,kind,prefix="regular"){
  const requested=Math.max(0,Number(amount||0));if(requested<=.009)return {actions:[],unused:0,used:0};
  const pot=m33FindSpecialPot(kind);if(!pot)return {actions:[],unused:requested,used:0};
  const gap=m15PotGap(pot);const used=Math.min(requested,gap);
  if(used<=.009)return {actions:[],unused:requested,used:0};
  const label=kind==="house"?"House Pot":"Emergency Fund";
  return {actions:[{id:`${prefix}:pot:${pot.id||pot.name}`,name:pot.name||label,amount:used,type:"pot",potId:pot.id||pot.name,meta:`Scenario priority boost • ${m15Money(gap)} target gap`}],unused:Math.max(0,requested-used),used};
}

function m22ComputePlan(){
  const mission=m22EnsureState();const inputs=m22InputSnapshot();const protection=m22BillProtection(mission.paydayDate);
  const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);
  let available=actual;const actions=[];
  const urgentHoldingAmount=Math.min(protection.topUp,available);if(urgentHoldingAmount>.009){actions.push({id:"holding:protection",name:"Holding Pot urgent protection",amount:urgentHoldingAmount,type:"holding",holdingKind:"urgent",meta:`Immediate cover for ${m15Money(protection.minimum)} buffer + ${m15Money(protection.bills)} bills + ${m15Money(protection.recurring)} monthly spending`});available-=urgentHoldingAmount}
  const regularHoldingTarget=m24RegularHoldingContribution();
  const regularHoldingAmount=Math.min(regularHoldingTarget,available);if(regularHoldingAmount>.009){actions.push({id:"holding:regular",name:"Holding Pot regular contribution",amount:regularHoldingAmount,type:"holding",holdingKind:"regular",meta:`Long-range planner funding across 13 four-weekly paydays • dashboard move ${m15Money(regularHoldingTarget)}`});available-=regularHoldingAmount}
  let regularBudget=available;
  let lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
  let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
  const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
  const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
  const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
  const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
  const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
  if(lifestyle>.009){actions.push({id:"regular:lifestyle",name:"Spending Pot",amount:lifestyle,type:"lifestyle",potId:"spending_pot",meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:"Four-week lifestyle allocation"});regularBudget-=lifestyle}
  const houseResult=m33BuildSpecialPotAction(houseBoost,"house","regular");actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
  const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,"emergency","regular");actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
  const goalResult=m22BuildPotActions(goals,"priority","regular",["spending_pot",...(houseResult.actions.map(a=>a.potId)),...(emergencyResult.actions.map(a=>a.potId))]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,a)=>sum+a.amount,0);
  const coreActions=m22InvestmentActions(core,inputs.platform,"core");actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,a)=>sum+a.amount,0);
  available=Math.max(0,regularBudget);
  const extraAvailable=Math.min(extra,available);const extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
  if(extraRemaining>.009){
    if(inputs.strategy==="isa"){const invest=m22InvestmentActions(extraRemaining,inputs.platform,"extra");actions.push(...invest);extraRemaining=0}
    else{const extraResult=m22BuildPotActions(extraRemaining,inputs.strategy,"extra",["spending_pot"]);actions.push(...extraResult.actions);extraRemaining=extraResult.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}}
    available-=extraRequested;
  }
  const buffered=Math.max(0,available);if(buffered>.009)actions.push({id:"buffer:retained",name:"Keep buffered",amount:buffered,type:"buffer",meta:"Leave uncommitted in the payday account until the cycle settles"});
  const planned=actions.reduce((sum,a)=>sum+a.amount,0);
  const unresolvedProtection=Math.max(0,protection.topUp-urgentHoldingAmount);
  const unresolvedRegularHolding=Math.max(0,regularHoldingTarget-regularHoldingAmount);
  const holdingAmount=urgentHoldingAmount+regularHoldingAmount;
  return {logicVersion:25,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,expected,actual,extra,shortfall,holdingAmount,urgentHoldingAmount,regularHoldingTarget,regularHoldingAmount,lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,unresolvedProtection,unresolvedRegularHolding,actions,planned,buffered};
}
function m22CurrentPlan(){const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==25&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;return mission.plan||m22ComputePlan()}
function m22AnyExecuted(){return Object.keys(m22EnsureState().executed||{}).length>0}
function m22ActionDone(action){const record=m22EnsureState().executed?.[action.id];return Boolean(record&&Math.abs(Number(record.amount||0)-Number(action.amount||0))<.011)}
function m22ExecutedTotal(plan){return plan.actions.reduce((sum,a)=>sum+(m22ActionDone(a)?a.amount:0),0)}
function m22FindPot(action){const pots=Array.isArray(plannerState.editablePots)?plannerState.editablePots:[];return pots.find(p=>String(p.id||p.name)===String(action.potId||action.name))||pots.find(p=>String(p.name||"").toLowerCase()===String(action.name||"").toLowerCase())}
function m22ExecuteAction(actionId){
  const mission=m22EnsureState();if(mission.completed)return;
  if(!mission.plan)mission.plan=m22ComputePlan();const action=mission.plan.actions.find(a=>a.id===actionId);if(!action||m22ActionDone(action))return;
  if(action.type==="holding")plannerState.holdingBalance=Number(plannerState.holdingBalance||0)+Number(action.amount||0);
  else if(action.type==="lifestyle"||action.type==="pot"){
    let pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);
    if(!pot){m22ShowStatus(`Aurora could not find ${action.name}. Open Pot Health and make sure the pot still exists.`,true);return}
    pot.balance=Number(pot.balance||0)+Number(action.amount||0);
  }
  mission.startedAt=mission.startedAt||new Date().toISOString();mission.executed[action.id]={amount:Number(action.amount||0),name:action.name,type:action.type,at:new Date().toISOString()};
  m22Save();const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);
  if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${m15Money(action.amount)} completed: ${action.name}.`);m22Render();if(typeof m13Render==="function")m13Render();
}
function m22SetInputsLocked(locked){document.querySelectorAll("#m22InputGrid input,#m22InputGrid select").forEach(el=>{el.disabled=locked;el.closest(".m22-field")?.classList.toggle("locked",locked)});document.getElementById("m15UseFullExtra").disabled=locked;document.getElementById("m15UseHalfExtra").disabled=locked;document.getElementById("m22ResetMission").disabled=locked}
function m22Instruction(plan){
  const el=document.getElementById("m15Instruction");if(!el)return;
  if(plan.unresolvedProtection>.009){el.className="m22-callout risk";el.innerHTML=`Actual pay cannot fully cover the urgent Holding Pot requirement. The plan is still short by <strong>${m15Money(plan.unresolvedProtection)}</strong>, so flexible pots and investing have been reduced first.`;return}
  if(plan.unresolvedRegularHolding>.009){el.className="m22-callout risk";el.innerHTML=`Urgent bills are protected, but this wage cannot fully make the regular Holding Pot contribution. <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> remains unfunded after prioritising essential protection.`;return}
  if(plan.shortfall>.009){el.className="m22-callout watch";el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora has still reserved <strong>${m15Money(plan.regularHoldingAmount)}</strong> for the regular Holding Pot contribution, then reduced lifestyle by <strong>${m15Money(plan.lifestyleCut)}</strong>, goal pots by <strong>${m15Money(plan.goalsCut)}</strong> and shares by <strong>${m15Money(plan.coreCut)}</strong>.`;return}
  if(plan.extra>.009){el.className="m22-callout good";el.innerHTML=`You received <strong>${m15Money(plan.extra)} extra</strong>. Aurora has protected the Holding Pot first, followed your chosen live allocations, and left any money not assigned to a transfer safely buffered in the current account.`;return}
  el.className="m22-callout good";el.innerHTML=`Normal payday plan ready. Aurora has included <strong>${m15Money(plan.regularHoldingAmount)}</strong> regular Holding Pot funding before lifestyle, goal pots, shares and the final buffer.`;
}
function m22RenderHistory(){const host=document.getElementById("m22History");if(!host)return;const history=(plannerState.paydayHistory||[]).slice(-6).reverse();host.innerHTML=history.length?history.map(item=>`<div class="m22-history-row"><span>${m22Escape(dateLabel(item.paydayDate))}</span><strong>${m22Escape(item.summary||"Payday completed")}</strong><strong>${m15Money(item.actualPay||0)}</strong></div>`).join(""):'<div class="m22-empty">No completed payday receipts yet.</div>'}
function m22RenderReceipt(){const host=document.getElementById("m22Receipt"),mission=m22EnsureState();if(!host)return;if(!mission.completed||!mission.receipt){host.classList.remove("show");host.innerHTML="";return}const r=mission.receipt;host.innerHTML=`<h3>✅ Payday completed — ${m22Escape(dateLabel(r.paydayDate))}</h3><div class="m22-receipt-grid"><div class="m22-receipt-item"><span>Actual pay</span><strong>${m15Money(r.actualPay)}</strong></div><div class="m22-receipt-item"><span>Urgent Holding top-up</span><strong>${m15Money(r.urgentHolding||0)}</strong></div><div class="m22-receipt-item"><span>Regular Holding funding</span><strong>${m15Money(r.regularHolding||0)}</strong></div><div class="m22-receipt-item"><span>Total added to Holding</span><strong>${m15Money(r.holdingAdded)}</strong></div><div class="m22-receipt-item"><span>Pots funded</span><strong>${m15Money(r.potsFunded)}</strong></div><div class="m22-receipt-item"><span>Shares transferred</span><strong>${m15Money(r.invested)}</strong></div><div class="m22-receipt-item"><span>Kept buffered</span><strong>${m15Money(r.buffered)}</strong></div><div class="m22-receipt-item"><span>Closing Holding Pot</span><strong>${m15Money(r.closingHolding)}</strong></div><div class="m22-receipt-item"><span>Moves completed</span><strong>${r.actionCount}</strong></div><div class="m22-receipt-item"><span>Completed at</span><strong>${m22Escape(new Date(r.completedAt).toLocaleString("en-GB"))}</strong></div></div>`;host.classList.add("show")}
function m22Render(){
  if(typeof plannerState==="undefined")return;const mission=m22EnsureState();const plan=m22CurrentPlan();const locked=Boolean(mission.plan||m22AnyExecuted()||mission.completed);const executed=m22ExecutedTotal(plan),remaining=Math.max(0,plan.planned-executed),doneCount=plan.actions.filter(m22ActionDone).length,totalCount=plan.actions.length,pct=totalCount?Math.round(doneCount/totalCount*100):0;
  mission.inputs=plan.inputs;m22SyncHiddenSimulator(plan.inputs);
  m15Set("m15SumExpected",m15Money(plan.expected));m15Set("m15SumActual",m15Money(plan.actual));m15Set("m15SumExtra",m15Money(plan.extra));m15Set("m22SumShortfall",m15Money(plan.shortfall));m15Set("m15SumHolding",m15Money(plan.holdingAmount));m15Set("m15SumAvailable",m15Money(plan.actual));
  m15Set("m22MinimumBuffer",m15Money(plan.protection.minimum));m15Set("m22BillsReserve",m15Money(plan.protection.bills));m15Set("m22RecurringReserve",m15Money(plan.protection.recurring));m15Set("m22HoldingRequirement",m15Money(plan.protection.required));m15Set("m22HoldingNow",m15Money(plan.protection.holding));m15Set("m22UrgentHolding",m15Money(plan.urgentHoldingAmount));m15Set("m22RegularHolding",m15Money(plan.regularHoldingAmount));
  m15Set("m22WalletTotal",m15Money(plan.planned));m15Set("m22WalletExecuted",m15Money(executed));m15Set("m22WalletRemaining",m15Money(remaining));m15Set("m22WalletBuffered",m15Money(plan.buffered));m15Set("m15AllocationTotal",`${m15Money(plan.planned)} planned`);
  const progress=document.getElementById("m22ProgressFill");if(progress)progress.style.width=`${pct}%`;m15Set("m22ProgressText",`${doneCount} of ${totalCount} moves completed`);m15Set("m22LockText",mission.completed?"Payday completed":locked?"Plan locked during execution":"Plan editable until first move");m15Set("m22MissionBadge",mission.completed?"PAYDAY COMPLETE":locked?"EXECUTION LIVE":"DRAFT PLAN");
  m22Instruction(plan);m22SetInputsLocked(locked);
  const list=document.getElementById("m15AllocationList");
  if(list){
    if(plan.actions.length){
      list.innerHTML=plan.actions.map(action=>{
        const done=m22ActionDone(action);
        const rowClass=done?"done":"";
        const check=done?"✓":"○";
        const disabled=done||mission.completed?"disabled":"";
        const buttonLabel=done?"Completed ✓":"Complete move";
        return `<div class="m22-action-row ${rowClass}"><div class="m22-check">${check}</div><div><div class="m22-action-name">${m22Escape(action.name)}</div><div class="m22-action-meta">${m22Escape(action.meta)}</div></div><div class="m22-action-amount">${m15Money(action.amount)}</div><button class="m22-execute-btn" type="button" data-m22-execute="${m22Escape(action.id)}" ${disabled}>${buttonLabel}</button></div>`;
      }).join("");
    }else{
      list.innerHTML='<div class="m22-empty">No payday moves were created. Check the pay and allocation inputs.</div>';
    }
  }
  const route=document.getElementById("m15Route");if(route)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${m22Escape(a.name)}</div><div class="m22-step-meta">${m22Escape(a.meta)}</div></div><div class="m22-step-amount">${m15Money(a.amount)}</div></div>`).join("");
  const complete=document.getElementById("m22CompletePayday");if(complete)complete.disabled=mission.completed||!totalCount||doneCount!==totalCount;const reset=document.getElementById("m22ResetMission");if(reset)reset.style.display=mission.completed?"none":"";const next=document.getElementById("m22NewMission");if(next)next.style.display=mission.completed?"":"none";
  m15Set("m33PlannedTotal",m15Money(plan.planned));m15Set("m33ExpectedMirror",m15Money(plan.expected));m15Set("m33ActualMirror",m15Money(plan.actual));m15Set("m33ExtraMirror",m15Money(plan.extra));m15Set("m33ShortfallMirror",m15Money(plan.shortfall));m15Set("m33RetainedMirror",m15Money(plan.buffered));m15Set("m33LivePayNote",plan.extra>.009?`${m15Money(plan.extra)} above expected`:plan.shortfall>.009?`${m15Money(plan.shortfall)} below expected`:"Wage matches expectation");
  m22RenderReceipt();m22RenderHistory();m22Save();if(typeof m13Render==="function")m13Render();if(typeof m33RenderScenario==="function")m33RenderScenario();
}
function m15Render(){m22Render()}
function m22InputChanged(event){const mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed)return;if(event?.target?.id==="m15AllocateExtra")event.target.dataset.userEdited="1";if(event?.target?.id==="m15ActualPay"||event?.target?.id==="m15ExpectedPay"){const expected=m15Value("m15ExpectedPay"),actual=m15Value("m15ActualPay"),extra=Math.max(0,actual-expected),field=document.getElementById("m15AllocateExtra");if(field&&field.dataset.userEdited!=="1")field.value=extra.toFixed(2)}mission.paydayDate=document.getElementById("m22PaydayDate")?.value||m22DefaultPayday();mission.inputs=m22InputSnapshot();mission.plan=null;m22Save();m22Render()}
function m22CompletePayday(){const mission=m22EnsureState(),plan=m22CurrentPlan();if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus("Complete every payday move before closing the mission.",true);return}const sumType=type=>plan.actions.filter(a=>a.type===type).reduce((s,a)=>s+a.amount,0);const sumHoldingKind=kind=>plan.actions.filter(a=>a.type==="holding"&&a.holdingKind===kind).reduce((s,a)=>s+a.amount,0);const potsFunded=plan.actions.filter(a=>a.type==="pot"||a.type==="lifestyle").reduce((s,a)=>s+a.amount,0);const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,urgentHolding:sumHoldingKind("urgent"),regularHolding:sumHoldingKind("regular"),holdingAdded:sumType("holding"),potsFunded,invested:sumType("investment"),buffered:sumType("buffer"),closingHolding:Number(plannerState.holdingBalance||0),actionCount:plan.actions.length,completedAt:new Date().toISOString()};mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${m15Money(receipt.invested)} invested • ${m15Money(receipt.holdingAdded)} to Holding • ${m15Money(receipt.potsFunded)} to pots`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus("Payday completed and saved to local history.");m22Render()}
function m22ResetDraft(){const mission=m22EnsureState();if(m22AnyExecuted()||mission.plan){m22ShowStatus("The plan is locked because execution has started. Complete this payday before starting another.",true);return}plannerState.paydayMission=m22FreshMission(mission.paydayDate||m22DefaultPayday());m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Payday draft reset.")}
function m22StartNextMission(){const current=m22EnsureState();let next=parseLocalDate(current.paydayDate||m22DefaultPayday());next.setDate(next.getDate()+28);plannerState.paydayMission=m22FreshMission(m22IsoDate(next));m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Next payday mission created.")}
function m22CopyPlan(){const plan=m22CurrentPlan(),mission=m22EnsureState();const rows=plan.actions.map((a,i)=>`${i+1}. ${a.name}: ${m15Money(a.amount)}${m22ActionDone(a)?" — completed":""}`);const text=`Aurora Payday Mission Control
Payday: ${dateLabel(mission.paydayDate)}
Expected: ${m15Money(plan.expected)}
Actual: ${m15Money(plan.actual)}
Bills protected: ${m15Money(plan.protection.bills)}

${rows.join("\n")}`;navigator.clipboard?.writeText(text).then(()=>{const b=document.getElementById("m15CopyPlan");if(b){b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy Payday Plan",1300)}}).catch(()=>m22ShowStatus("Copy was blocked by the browser.",true))}
document.addEventListener("click",event=>{const execute=event.target.closest("[data-m22-execute]");if(execute){m22ExecuteAction(execute.dataset.m22Execute);return}});
document.querySelectorAll("#m22InputGrid input,#m22InputGrid select").forEach(el=>el.addEventListener(el.tagName==="SELECT"||el.type==="date"?"change":"input",m22InputChanged));
document.getElementById("m15UseFullExtra")?.addEventListener("click",()=>{const extra=Math.max(0,m15Value("m15ActualPay")-m15Value("m15ExpectedPay")),f=document.getElementById("m15AllocateExtra");f.value=extra.toFixed(2);f.dataset.userEdited="1";m22InputChanged({target:f})});
document.getElementById("m15UseHalfExtra")?.addEventListener("click",()=>{const extra=Math.max(0,m15Value("m15ActualPay")-m15Value("m15ExpectedPay")),f=document.getElementById("m15AllocateExtra");f.value=(extra/2).toFixed(2);f.dataset.userEdited="1";m22InputChanged({target:f})});
document.getElementById("m15CopyPlan")?.addEventListener("click",m22CopyPlan);document.getElementById("m22CompletePayday")?.addEventListener("click",m22CompletePayday);document.getElementById("m22ResetMission")?.addEventListener("click",m22ResetDraft);document.getElementById("m22NewMission")?.addEventListener("click",m22StartNextMission);
window.addEventListener("load",()=>{m22HydrateInputs();m22Render()});

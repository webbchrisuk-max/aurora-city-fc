
/* ===================== M25 FINANCIAL CONTROL ENGINE ===================== */
(function(){
  const M25_LOGIC_VERSION=25;
  const m25OriginalExpandBeforePayday=window.m23ExpandBeforePayday;
  const m25OriginalRunPlanner=window.runPlanner;
  const m25OriginalUpdatePlannerTotals=window.updatePlannerTotals;
  const m25OriginalM13Render=window.m13Render;

  function m25Norm(value){return String(value||"").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim()}
  function m25Date(value){if(!value)return null;const d=value instanceof Date?new Date(value):typeof parseLocalDate==="function"?parseLocalDate(value):new Date(value);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
  function m25Round(value){return Math.round((Number(value||0)+Number.EPSILON)*100)/100}
  function m25DateKey(record){return record?.due?`${m25Norm(record.name)}|${record.due}`:""}
  function m25SourcePriority(source){return source==="scheduled"?0:source==="yearly"?1:2}
  function m25SourceLabel(source){return source==="scheduled"?"Scheduled Bills":source==="yearly"?"Yearly Costs":"Future Costs"}
  function m25NextScheduledDue(item){
    if(!item?.due)return "";
    if(!item.paid)return item.due;
    const recurrence=String(item.recurrence||"none");
    if(recurrence==="none")return "";
    let next=typeof m20AddRecurrence==="function"?m20AddRecurrence(item.due,recurrence):null;
    const today=new Date();today.setHours(0,0,0,0);let guard=0;
    while(next&&next<today&&guard<120){next=m20AddRecurrence(m22IsoDate(next),recurrence);guard+=1}
    return next?m22IsoDate(next):"";
  }
  window.m25ActiveCostRecords=function(){
    const rows=[];
    (plannerState?.scheduledBills||[]).forEach((item,index)=>{if(!item||item.included===false)return;const due=m25NextScheduledDue(item);if(!due)return;rows.push({source:"scheduled",index,name:String(item.name||"Unnamed scheduled bill"),due,amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    (plannerState?.yearlyRecurringCosts||[]).forEach((item,index)=>{if(!item||item.included===false)return;const due=item.paid?(item.nextRenewalDue||""):(item.due||"");if(!due)return;rows.push({source:"yearly",index,name:String(item.name||"Unnamed yearly cost"),due,amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    (plannerState?.futureCosts||[]).forEach((item,index)=>{if(!item||item.included===false)return;rows.push({source:"future",index,name:String(item.name||"Unnamed future cost"),due:String(item.due||""),amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    return rows;
  };
  window.m25DuplicateAudit=function(){
    const rows=m25ActiveCostRecords();const exact=[];const potential=[];const exactMap=new Map();
    rows.filter(r=>r.due).forEach(r=>{const key=m25DateKey(r);if(!exactMap.has(key))exactMap.set(key,[]);exactMap.get(key).push(r)});
    exactMap.forEach(group=>{if(group.length>1)exact.push(group.slice().sort((a,b)=>m25SourcePriority(a.source)-m25SourcePriority(b.source)))});
    const exactPairs=new Set(exact.flatMap(group=>group.map(r=>`${r.source}:${r.index}`)));
    const byNameAmount=new Map();rows.forEach(r=>{const key=`${m25Norm(r.name)}|${m25Round(r.amount).toFixed(2)}`;if(!byNameAmount.has(key))byNameAmount.set(key,[]);byNameAmount.get(key).push(r)});
    byNameAmount.forEach(group=>{if(group.length<2)return;const candidates=group.filter(r=>!exactPairs.has(`${r.source}:${r.index}`));if(candidates.length<2)return;let close=false;for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){const a=m25Date(candidates[i].due),b=m25Date(candidates[j].due);if(!a||!b||Math.abs(a-b)<=14*86400000)close=true}if(close)potential.push(candidates)});
    return {rows,exact,potential};
  };
  window.m25CanonicalCostRecords=function(){
    const rows=m25ActiveCostRecords().slice().sort((a,b)=>m25SourcePriority(a.source)-m25SourcePriority(b.source));const seen=new Set();const unique=[];
    rows.forEach(r=>{const key=m25DateKey(r);if(key&&seen.has(key))return;if(key)seen.add(key);unique.push(r)});return unique;
  };
  window.m25BeforePaydayItems=function(paydayValue){
    const base=typeof m25OriginalExpandBeforePayday==="function"?m25OriginalExpandBeforePayday(paydayValue):[];
    const today=new Date();today.setHours(0,0,0,0);const payday=paydayValue instanceof Date?new Date(paydayValue):m25Date(paydayValue);if(!payday)return base;payday.setHours(0,0,0,0);
    const future=(plannerState?.futureCosts||[]).filter(x=>x&&x.included!==false&&x.due).map(x=>({...x,_d:m25Date(x.due),_cashAmount:Number(x.amount||0),_sourceLabel:"Future cost"})).filter(x=>x._d&&x._d>=today&&x._d<payday);
    const combined=[...base,...future].sort((a,b)=>(a._d||m25Date(a.due))-(b._d||m25Date(b.due)));const seen=new Set();
    return combined.filter(item=>{const key=`${m25Norm(item.name)}|${item.due||m22IsoDate(item._d)}`;if(seen.has(key))return false;seen.add(key);return true});
  };
  window.m23ExpandBeforePayday=function(paydayValue){return m25BeforePaydayItems(paydayValue)};

  window.m22BillProtection=function(paydayDate){
    const items=m25BeforePaydayItems(paydayDate);const bills=items.reduce((sum,item)=>sum+Number((item._cashAmount??item.amount)||0),0);
    const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false).reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)-Number(item.spentThisCycle||0)),0);
    const minimum=Math.max(0,Number(plannerState.minimumBuffer||0));const holding=Math.max(0,Number(plannerState.holdingBalance||0));const required=minimum+bills+recurring;
    return {items,bills,recurring,minimum,holding,required,headroom:Math.max(0,holding-required),topUp:Math.max(0,required-holding)};
  };
  function m25PaydaysRemaining(paydayDate,dueDate){
    const start=m25Date(paydayDate),due=m25Date(dueDate);if(!start||!due||due<start)return 0;start.setHours(0,0,0,0);due.setHours(23,59,59,999);let count=0,cursor=new Date(start),guard=0;while(cursor<=due&&guard<80){count+=1;cursor.setDate(cursor.getDate()+28);guard+=1}return count;
  }
  window.m25SinkingFundPlan=function(paydayValue){
    const payday=m25Date(paydayValue)||m25Date(m22DefaultPayday());const nextPayday=new Date(payday);nextPayday.setDate(nextPayday.getDate()+28);nextPayday.setHours(0,0,0,0);
    const protection=m22BillProtection(payday);let headroom=Math.max(0,protection.headroom);const all=m25CanonicalCostRecords();const unplanned=all.filter(r=>!r.due);
    const eligible=all.filter(r=>{const d=m25Date(r.due);return d&&d>=nextPayday&&r.amount>0}).sort((a,b)=>m25Date(a.due)-m25Date(b.due)||m25SourcePriority(a.source)-m25SourcePriority(b.source));
    const details=eligible.map(r=>{const funded=Math.min(headroom,r.amount);headroom-=funded;const remaining=Math.max(0,r.amount-funded);const paydays=Math.max(1,m25PaydaysRemaining(payday,r.due));const contribution=remaining/paydays;return {...r,fundedFromHeadroom:funded,remaining,paydays,contribution}});
    const totalCommitments=details.reduce((s,r)=>s+r.amount,0);const totalRemaining=details.reduce((s,r)=>s+r.remaining,0);const contribution=m25Round(details.reduce((s,r)=>s+r.contribution,0));
    return {paydayDate:m22IsoDate(payday),nextPayday:m22IsoDate(nextPayday),protection,details,unplanned,totalCommitments,totalRemaining,allocatedHeadroom:details.reduce((s,r)=>s+r.fundedFromHeadroom,0),contribution};
  };
  window.m24RegularHoldingContribution=function(){return m25SinkingFundPlan(m22EnsureState().paydayDate||m22DefaultPayday()).contribution};

  window.m22ComputePlan=function(){
    const mission=m22EnsureState(),inputs=m22InputSnapshot(),protection=m22BillProtection(mission.paydayDate),sinking=m25SinkingFundPlan(mission.paydayDate);
    const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);let available=actual;const actions=[];
    const urgentHoldingAmount=Math.min(protection.topUp,available);if(urgentHoldingAmount>.009){actions.push({id:"holding:protection",name:"Holding Pot urgent protection",amount:urgentHoldingAmount,type:"holding",holdingKind:"urgent",meta:`Immediate cover for ${m15Money(protection.minimum)} buffer + ${m15Money(protection.bills)} payments before payday + ${m15Money(protection.recurring)} monthly spending`});available-=urgentHoldingAmount}
    const regularHoldingTarget=sinking.contribution;const regularHoldingAmount=Math.min(regularHoldingTarget,available);if(regularHoldingAmount>.009){actions.push({id:"holding:regular",name:"Holding Pot due-date contribution",amount:regularHoldingAmount,type:"holding",holdingKind:"regular",meta:`Date-aware sinking funds across ${sinking.details.length} future commitment${sinking.details.length===1?"":"s"} • target ${m15Money(regularHoldingTarget)}`});available-=regularHoldingAmount}
    let regularBudget=available,lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
    let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
    const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
    const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
    const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
    const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
    const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
    if(lifestyle>.009){actions.push({id:"regular:lifestyle",name:"Spending Pot",amount:lifestyle,type:"lifestyle",potId:"spending_pot",meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:"Four-week lifestyle allocation"});regularBudget-=lifestyle}
    const houseResult=m33BuildSpecialPotAction(houseBoost,"house","regular");actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
    const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,"emergency","regular");actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
    const specialIds=[...houseResult.actions,...emergencyResult.actions].map(action=>action.potId);
    const goalResult=m22BuildPotActions(goals,"priority","regular",["spending_pot",...specialIds]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,a)=>sum+a.amount,0);
    const coreActions=m22InvestmentActions(core,inputs.platform,"core");actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,a)=>sum+a.amount,0);available=Math.max(0,regularBudget);
    const extraAvailable=Math.min(extra,available),extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
    if(extraRemaining>.009){if(inputs.strategy==="isa"){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}else{const result=m22BuildPotActions(extraRemaining,inputs.strategy,"extra",["spending_pot",...specialIds]);actions.push(...result.actions);extraRemaining=result.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}}available-=extraRequested}
    const buffered=Math.max(0,available);actions.push({id:"buffer:retained",name:"Retain in current account",amount:buffered,type:"buffer",meta:"Money deliberately left in the current account after all planned transfers"});
    const planned=actions.reduce((sum,a)=>sum+a.amount,0);return {logicVersion:M25_LOGIC_VERSION,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,sinking,expected,actual,extra,shortfall,holdingAmount:urgentHoldingAmount+regularHoldingAmount,urgentHoldingAmount,regularHoldingTarget,regularHoldingAmount,lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,unresolvedProtection:Math.max(0,protection.topUp-urgentHoldingAmount),unresolvedRegularHolding:Math.max(0,regularHoldingTarget-regularHoldingAmount),actions,planned,buffered};
  };
  window.m22CurrentPlan=function(){const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==M25_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;return mission.plan||m22ComputePlan()};
  window.m22ActionDone=function(action){return Boolean(m22EnsureState().executed?.[action.id])};
  window.m25ActualForAction=function(action){const r=m22EnsureState().executed?.[action.id];return r?Number(r.actualAmount??r.amount??action.amount):null};
  window.m22ExecutedTotal=function(plan){return plan.actions.reduce((sum,a)=>sum+(m22ActionDone(a)?Number(m25ActualForAction(a)||0):0),0)};
  window.m25Reconciliation=function(plan){
    const outflows=plan.actions.filter(a=>a.type!=="buffer"),buffer=plan.actions.find(a=>a.type==="buffer");
    const completed=outflows.reduce((s,a)=>s+(m22ActionDone(a)?Number(m25ActualForAction(a)||0):0),0);const pending=outflows.reduce((s,a)=>s+(m22ActionDone(a)?0:Number(a.amount||0)),0);
    const retained=buffer?(m22ActionDone(buffer)?Number(m25ActualForAction(buffer)||0):Number(buffer.amount||0)):0;const current=Math.max(0,Number(plan.actual||0)-completed);const difference=Number(plan.actual||0)-completed-pending-retained;
    return {completed,pending,retained,current,difference};
  };
  function m25ActionRow(actionId){return [...document.querySelectorAll("[data-m22-execute]")].find(b=>b.dataset.m22Execute===actionId)?.closest(".m22-action-row")||null}
  window.m22ExecuteAction=function(actionId){
    const mission=m22EnsureState();if(mission.completed)return;if(!mission.plan)mission.plan=m22ComputePlan();const action=mission.plan.actions.find(a=>a.id===actionId);if(!action||m22ActionDone(action))return;
    const row=m25ActionRow(actionId),input=row?.querySelector("[data-m25-actual]");const actual=m25Round(input?Number(input.value):Number(action.amount||0));if(!Number.isFinite(actual)||actual<0){m22ShowStatus("Enter a valid actual amount before completing this move.",true);return}
    const rec=m25Reconciliation(mission.plan);if(action.type!=="buffer"&&actual>rec.current+.011){m22ShowStatus(`Only ${m15Money(rec.current)} remains in the current-account payday balance.`,true);return}
    if(action.type==="holding")plannerState.holdingBalance=Number(plannerState.holdingBalance||0)+actual;else if(action.type==="lifestyle"||action.type==="pot"){const pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);if(!pot){m22ShowStatus(`Aurora could not find ${action.name}. Check the Pot Manager.`,true);return}pot.balance=Number(pot.balance||0)+actual}
    mission.startedAt=mission.startedAt||new Date().toISOString();mission.openingHolding=Number.isFinite(Number(mission.openingHolding))?mission.openingHolding:Number(plannerState.holdingBalance||0)-(action.type==="holding"?actual:0);mission.executed[action.id]={plannedAmount:Number(action.amount||0),actualAmount:actual,amount:actual,name:action.name,type:action.type,at:new Date().toISOString()};
    const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);m22Save();if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${m15Money(actual)} recorded for ${action.name}${Math.abs(actual-action.amount)>.009?` (planned ${m15Money(action.amount)})`:""}.`);m22Render();
  };
  window.m25UndoAction=function(actionId){
    const mission=m22EnsureState(),plan=m22CurrentPlan(),action=plan.actions.find(a=>a.id===actionId),record=mission.executed?.[actionId];if(!action||!record||mission.completed)return;const actual=Number(record.actualAmount??record.amount??0);
    if(action.type==="holding")plannerState.holdingBalance=Math.max(0,Number(plannerState.holdingBalance||0)-actual);else if(action.type==="lifestyle"||action.type==="pot"){const pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);if(pot)pot.balance=Math.max(0,Number(pot.balance||0)-actual)}
    delete mission.executed[actionId];if(!m22AnyExecuted()){mission.plan=null;mission.startedAt="";delete mission.openingHolding}
    const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);m22Save();if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${action.name} was undone. ${m15Money(actual)} has been reversed.`);m22Render();
  };
  window.m22Instruction=function(plan){
    const el=document.getElementById("m15Instruction");if(!el)return;if(plan.unresolvedProtection>.009){el.className="m22-callout risk";el.innerHTML=`Actual pay cannot fully cover the immediate Holding Pot requirement. The mission remains short by <strong>${m15Money(plan.unresolvedProtection)}</strong>.`;return}if(plan.unresolvedRegularHolding>.009){el.className="m22-callout risk";el.innerHTML=`Immediate bills are protected, but <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> of the due-date sinking-fund contribution remains unfunded.`;return}if(plan.shortfall>.009){el.className="m22-callout watch";el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora protected immediate commitments and the date-aware Holding contribution first, then reduced lifestyle by <strong>${m15Money(plan.lifestyleCut)}</strong>, goal pots by <strong>${m15Money(plan.goalsCut)}</strong> and shares by <strong>${m15Money(plan.coreCut)}</strong>.`;return}el.className="m22-callout good";el.innerHTML=`Current-account payday plan ready. <strong>${m15Money(plan.urgentHoldingAmount)}</strong> covers any immediate shortfall and <strong>${m15Money(plan.regularHoldingAmount)}</strong> funds future commitments according to their actual due dates.`;
  };
  window.m25RenderSinking=function(plan){
    const sinking=plan.sinking||m25SinkingFundPlan(plan.paydayDate);m15Set("m25SinkingTotal",`${m15Money(sinking.contribution)} THIS PAYDAY`);m15Set("m25LongTermTarget",m15Money(sinking.totalCommitments));m15Set("m25LongTermGap",m15Money(sinking.totalRemaining));
    const summary=document.getElementById("m25SinkingSummary");if(summary)summary.innerHTML=`<div class="m25-sinking-stat"><span>Future commitments</span><strong>${m15Money(sinking.totalCommitments)}</strong></div><div class="m25-sinking-stat"><span>Already covered by headroom</span><strong>${m15Money(sinking.allocatedHeadroom)}</strong></div><div class="m25-sinking-stat"><span>Remaining funding gap</span><strong>${m15Money(sinking.totalRemaining)}</strong></div>`;
    const host=document.getElementById("m25SinkingList");if(!host)return;host.innerHTML=sinking.details.length?sinking.details.map(r=>`<div class="m25-sinking-row"><div><strong>${m22Escape(r.name)}</strong><small>${m22Escape(m25SourceLabel(r.source))} • due ${m22Escape(dateLabel(r.due))} • ${r.paydays} payday${r.paydays===1?"":"s"} left • ${m15Money(r.remaining)} still to fund</small></div><div class="m25-sinking-amount">${m15Money(r.contribution)}<small>this payday</small></div></div>`).join(""):`<div class="m22-empty">No dated long-term commitments need a sinking-fund contribution.</div>`;
  };
  window.m25RenderAudit=function(){
    const audit=m25DuplicateAudit(),host=document.getElementById("m25AuditList"),badge=document.getElementById("m25AuditBadge");if(!host)return;const count=audit.exact.length+audit.potential.length;if(badge){badge.textContent=count?`${count} REVIEW ITEM${count===1?"":"S"}`:"CLEAR";badge.style.color=count?"#ffe08a":"#8cffb8"}
    const rows=[];audit.exact.forEach(group=>rows.push(`<div class="m25-audit-row exact"><div class="m25-audit-title">Exact duplicate excluded once</div><div class="m25-audit-meta"><strong>${m22Escape(group[0].name)}</strong> • ${m22Escape(dateLabel(group[0].due))} • ${m15Money(group[0].amount)}<br>Aurora uses ${m22Escape(m25SourceLabel(group[0].source))} as the primary record for protection and sinking-fund calculations.</div><div>${group.map(r=>`<span class="m25-audit-source">${m22Escape(m25SourceLabel(r.source))}</span>`).join("")}</div></div>`));
    audit.potential.forEach(group=>rows.push(`<div class="m25-audit-row"><div class="m25-audit-title">Possible duplicate — review dates</div><div class="m25-audit-meta"><strong>${m22Escape(group[0].name)}</strong> appears more than once for ${m15Money(group[0].amount)} on nearby or missing dates. These are not auto-merged unless the name and due date match exactly.</div><div>${group.map(r=>`<span class="m25-audit-source">${m22Escape(m25SourceLabel(r.source))} • ${m22Escape(r.due?dateLabel(r.due):"No date")}</span>`).join("")}</div></div>`));
    host.innerHTML=rows.length?rows.join(""):'<div class="m25-audit-row good"><div class="m25-audit-title">No duplicate commitments detected</div><div class="m25-audit-meta">Scheduled bills, yearly costs and future costs currently reconcile without an exact overlap.</div></div>';
  };
  window.m25RenderReconciliation=function(plan){
    const r=m25Reconciliation(plan);m15Set("m25RecWage",m15Money(plan.actual));m15Set("m25RecCompleted",m15Money(r.completed));m15Set("m25RecPending",m15Money(r.pending));m15Set("m25RecCurrent",m15Money(r.current));m15Set("m25RecRetained",m15Money(r.retained));m15Set("m25RecDifference",`${r.difference<-.009?"−":""}${m15Money(Math.abs(r.difference))}`);
    const card=document.getElementById("m25DifferenceCard"),note=document.getElementById("m25ReconcileNote");if(card){card.classList.toggle("good",Math.abs(r.difference)<.011);card.classList.toggle("risk",Math.abs(r.difference)>=.011)}if(note)note.textContent=Math.abs(r.difference)<.011?"Reconciled: every pound is assigned to a transfer or deliberately retained in the current account.":r.difference>0?`${m15Money(r.difference)} is not assigned. Adjust the retained amount or an actual transfer before completing payday.`:`The recorded moves exceed the wage by ${m15Money(Math.abs(r.difference))}. Undo or correct a transfer before completing payday.`;return r;
  };
  window.m22Render=function(){
    if(typeof plannerState==="undefined")return;const mission=m22EnsureState(),plan=m22CurrentPlan(),locked=Boolean(m22AnyExecuted()||mission.completed),doneCount=plan.actions.filter(m22ActionDone).length,totalCount=plan.actions.length,pct=totalCount?Math.round(doneCount/totalCount*100):0;mission.inputs=plan.inputs;m22SyncHiddenSimulator(plan.inputs);
    m15Set("m15SumExpected",m15Money(plan.expected));m15Set("m15SumActual",m15Money(plan.actual));m15Set("m15SumExtra",m15Money(plan.extra));m15Set("m22SumShortfall",m15Money(plan.shortfall));m15Set("m15SumHolding",m15Money(plan.holdingAmount));m15Set("m15SumAvailable",m15Money(plan.actual));m15Set("m22MinimumBuffer",m15Money(plan.protection.minimum));m15Set("m22BillsReserve",m15Money(plan.protection.bills));m15Set("m22RecurringReserve",m15Money(plan.protection.recurring));m15Set("m22HoldingRequirement",m15Money(plan.protection.required));m15Set("m22HoldingNow",m15Money(plan.protection.holding));m15Set("m22UrgentHolding",m15Money(plan.urgentHoldingAmount));m15Set("m22RegularHolding",m15Money(plan.regularHoldingAmount));
    const rec=m25Reconciliation(plan);m15Set("m22WalletTotal",m15Money(plan.actual));m15Set("m22WalletExecuted",m15Money(rec.completed));m15Set("m22WalletRemaining",m15Money(rec.pending));m15Set("m22WalletBuffered",m15Money(rec.retained));m15Set("m15AllocationTotal",`${m15Money(plan.actual)} reconciled`);
    const progress=document.getElementById("m22ProgressFill");if(progress)progress.style.width=`${pct}%`;m15Set("m22ProgressText",`${doneCount} of ${totalCount} moves completed`);m15Set("m22LockText",mission.completed?"Payday completed":locked?"Plan locked during execution":"Plan editable until first move");m15Set("m22MissionBadge",mission.completed?"PAYDAY COMPLETE":locked?"EXECUTION LIVE":"DRAFT PLAN");m22Instruction(plan);m22SetInputsLocked(locked);
    const list=document.getElementById("m15AllocationList");if(list)list.innerHTML=plan.actions.length?plan.actions.map(action=>{const done=m22ActionDone(action),actual=done?Number(m25ActualForAction(action)||0):Number(action.amount||0),variance=actual-Number(action.amount||0),varianceClass=Math.abs(variance)<.011?"good":variance>0?"watch":"risk",varianceText=Math.abs(variance)<.011?"Matches plan":`${variance>0?"+":"−"}${m15Money(Math.abs(variance))} vs plan`;return `<div class="m22-action-row ${done?"done":""}"><div class="m22-check">${done?"✓":"○"}</div><div><div class="m22-action-name">${m22Escape(action.name)}</div><div class="m22-action-meta">${m22Escape(action.meta)}</div>${done?`<div class="m25-variance ${varianceClass}">${varianceText}</div>`:""}</div><div class="m25-planned">Planned<strong>${m15Money(action.amount)}</strong></div><div class="m25-actual-wrap"><label>Actual ${action.type==="buffer"?"retained":"transferred"}</label><input class="m25-actual-input" data-m25-actual type="number" min="0" step="0.01" value="${actual.toFixed(2)}" ${done||mission.completed?"disabled":""}></div>${done&&!mission.completed?`<button class="m25-undo-btn" type="button" data-m25-undo="${m22Escape(action.id)}">Undo move</button>`:`<button class="m22-execute-btn" type="button" data-m22-execute="${m22Escape(action.id)}" ${done||mission.completed?"disabled":""}>${done?"Completed ✓":action.type==="buffer"?"Confirm retained":"Complete move"}</button>`}</div>`}).join(""):'<div class="m22-empty">No payday moves were created.</div>';
    const route=document.getElementById("m15Route");if(route)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${m22Escape(a.name)}</div><div class="m22-step-meta">${m22Escape(a.meta)}</div></div><div class="m22-step-amount">${m15Money(a.amount)}</div></div>`).join("");
    const reconciliation=m25RenderReconciliation(plan);m25RenderSinking(plan);m25RenderAudit();const complete=document.getElementById("m22CompletePayday");if(complete)complete.disabled=mission.completed||!totalCount||doneCount!==totalCount||Math.abs(reconciliation.difference)>=.011;const reset=document.getElementById("m22ResetMission");if(reset)reset.style.display=mission.completed?"none":"";const next=document.getElementById("m22NewMission");if(next)next.style.display=mission.completed?"":"none";m15Set("m33PlannedTotal",m15Money(plan.planned));m15Set("m33ExpectedMirror",m15Money(plan.expected));m15Set("m33ActualMirror",m15Money(plan.actual));m15Set("m33ExtraMirror",m15Money(plan.extra));m15Set("m33ShortfallMirror",m15Money(plan.shortfall));m15Set("m33RetainedMirror",m15Money(rec.retained));m15Set("m33LivePayNote",plan.extra>.009?`${m15Money(plan.extra)} above expected`:plan.shortfall>.009?`${m15Money(plan.shortfall)} below expected`:"Wage matches expectation");m22RenderReceipt();m22RenderHistory();m22Save();if(typeof m13Render==="function")m13Render();if(typeof m33RenderScenario==="function")m33RenderScenario();
  };
  window.m22CompletePayday=function(){
    const mission=m22EnsureState(),plan=m22CurrentPlan();if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus("Complete every payday move before closing the mission.",true);return}const rec=m25Reconciliation(plan);if(Math.abs(rec.difference)>=.011){m22ShowStatus(`The current account does not reconcile. Correct the ${m15Money(Math.abs(rec.difference))} difference first.`,true);return}
    const actualBy=predicate=>plan.actions.filter(predicate).reduce((s,a)=>s+Number(m25ActualForAction(a)||0),0),holdingAdded=actualBy(a=>a.type==="holding"),urgentHolding=actualBy(a=>a.type==="holding"&&a.holdingKind==="urgent"),regularHolding=actualBy(a=>a.type==="holding"&&a.holdingKind==="regular"),potsFunded=actualBy(a=>a.type==="pot"||a.type==="lifestyle"),invested=actualBy(a=>a.type==="investment"),buffered=actualBy(a=>a.type==="buffer");
    const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,plannedTotal:plan.planned,urgentHolding,regularHolding,holdingAdded,potsFunded,invested,buffered,transfersCompleted:rec.completed,closingHolding:Number(plannerState.holdingBalance||0),openingHolding:Number(mission.openingHolding??(Number(plannerState.holdingBalance||0)-holdingAdded)),difference:rec.difference,actionCount:plan.actions.length,actions:plan.actions.map(a=>({id:a.id,name:a.name,type:a.type,planned:Number(a.amount||0),actual:Number(m25ActualForAction(a)||0)})),completedAt:new Date().toISOString()};mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${m15Money(receipt.invested)} invested • ${m15Money(receipt.holdingAdded)} to Holding • ${m15Money(receipt.potsFunded)} to pots • ${m15Money(receipt.buffered)} retained`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus("Payday completed, reconciled and saved to local history.");m22Render();
  };
  window.m22RenderReceipt=function(){const host=document.getElementById("m22Receipt"),mission=m22EnsureState();if(!host)return;if(!mission.completed||!mission.receipt){host.classList.remove("show");host.innerHTML="";return}const r=mission.receipt;host.innerHTML=`<h3>✅ Payday completed and reconciled — ${m22Escape(dateLabel(r.paydayDate))}</h3><div class="m22-receipt-grid"><div class="m22-receipt-item"><span>Actual wage</span><strong>${m15Money(r.actualPay)}</strong></div><div class="m22-receipt-item"><span>Transfers completed</span><strong>${m15Money(r.transfersCompleted||0)}</strong></div><div class="m22-receipt-item"><span>Urgent Holding top-up</span><strong>${m15Money(r.urgentHolding||0)}</strong></div><div class="m22-receipt-item"><span>Due-date Holding funding</span><strong>${m15Money(r.regularHolding||0)}</strong></div><div class="m22-receipt-item"><span>Pots funded</span><strong>${m15Money(r.potsFunded||0)}</strong></div><div class="m22-receipt-item"><span>Shares transferred</span><strong>${m15Money(r.invested||0)}</strong></div><div class="m22-receipt-item"><span>Retained in current account</span><strong>${m15Money(r.buffered||0)}</strong></div><div class="m22-receipt-item"><span>Closing Holding Pot</span><strong>${m15Money(r.closingHolding||0)}</strong></div><div class="m22-receipt-item"><span>Reconciliation difference</span><strong>${m15Money(Math.abs(r.difference||0))}</strong></div><div class="m22-receipt-item"><span>Completed at</span><strong>${m22Escape(new Date(r.completedAt).toLocaleString("en-GB"))}</strong></div></div>`;host.classList.add("show")};
  window.m22CopyPlan=function(){const plan=m22CurrentPlan(),mission=m22EnsureState(),rec=m25Reconciliation(plan);const rows=plan.actions.map((a,i)=>{const actual=m22ActionDone(a)?Number(m25ActualForAction(a)||0):null;return `${i+1}. ${a.name}: planned ${m15Money(a.amount)}${actual!==null?` • actual ${m15Money(actual)} — completed`:""}`});const text=`Aurora Payday Mission Control\nPayday: ${dateLabel(mission.paydayDate)}\nCurrent-account wage: ${m15Money(plan.actual)}\nImmediate payments protected: ${m15Money(plan.protection.bills)}\nDue-date Holding contribution: ${m15Money(plan.regularHoldingAmount)}\nUnexplained difference: ${m15Money(Math.abs(rec.difference))}\n\n${rows.join("\n")}`;navigator.clipboard?.writeText(text).then(()=>{const b=document.getElementById("m15CopyPlan");if(b){b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy Payday Plan",1300)}}).catch(()=>m22ShowStatus("Copy was blocked by the browser.",true))};
  window.m22ResetDraft=function(){const mission=m22EnsureState();if(m22AnyExecuted()){m22ShowStatus("Undo completed moves before resetting this payday draft.",true);return}plannerState.paydayMission=m22FreshMission(mission.paydayDate||m22DefaultPayday());m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Payday draft reset.")};

  window.m25ApplyPlannerClarity=function(){
    if(typeof plannerState==="undefined")return;
    const missionPayday=typeof m22EnsureState==="function"?m22EnsureState()?.paydayDate:"";
    const payday=m25Date(missionPayday)||(typeof getNextPaydayDate==="function"?getNextPaydayDate():m25Date(m22DefaultPayday()));
    const protection=m22BillProtection(payday);
    const sinking=m25SinkingFundPlan(payday);
    const holding=Number(plannerState.holdingBalance||0);
    const immediateCatchUp=m25Round(Math.max(0,Number(protection.topUp||0)));
    const futureContribution=m25Round(Math.max(0,Number(sinking.contribution||0)));
    const totalHoldingTransfer=m25Round(immediateCatchUp+futureContribution);
    const totalRequirement=protection.required+sinking.totalCommitments;
    const trueSurplus=Math.max(0,holding-totalRequirement);
    const fundingGap=Math.max(0,totalRequirement-holding);
    const protectionParts=[`${m15Money(protection.minimum)} buffer`,`${m15Money(protection.bills)} dated payments`];
    if(Number(protection.recurring||0)>0)protectionParts.push(`${m15Money(protection.recurring)} remaining monthly spending`);
    const protectionSummary=protectionParts.join(" + ");

    setText("protectedMoney",formatMoney(totalRequirement));
    setText("protectedMoneyMeta",`£${formatMoney(protection.required)} required through the following payday + £${formatMoney(sinking.totalCommitments)} later dated commitments • exact duplicates counted once`);
    setText("trueSurplus",formatMoney(trueSurplus));
    setText("trueSurplusMeta",trueSurplus>0?"Genuinely above short-term and dated long-term protection":"No genuine surplus after all dated protection requirements");

    setText("currentPotOffset",formatMoney(immediateCatchUp));
    setText("currentPotOffsetMeta",immediateCatchUp>0?`Catch-up needed to fully protect ${protectionSummary}`:`Current Holding Pot already covers ${protectionSummary}`);
    setText("suggestedContributionNow",formatMoney(futureContribution));
    setText("suggestedContributionMeta",futureContribution>0?`${sinking.details.length} later commitment${sinking.details.length===1?"":"s"} spread across the paydays before each due date`:"No later due-date contribution needed this payday");
    setText("finalAmountToAdd",formatMoney(totalHoldingTransfer));
    setText("finalAmountToAddMeta",totalHoldingTransfer>0?`${m15Money(immediateCatchUp)} immediate catch-up + ${m15Money(futureContribution)} future funding`:"No Holding Pot transfer needed this payday");
    setText("finalPotTopUp",`£${formatMoney(totalHoldingTransfer)}`);
    setText("finalPotTopUpMeta",totalHoldingTransfer>0?`${m15Money(immediateCatchUp)} catch-up + ${m15Money(futureContribution)} due-date contribution`:"Holding Pot is fully covered");
    setText("commandPaydayMove",`£${formatMoney0(totalHoldingTransfer)}`);
    setText("m13RunProtected",m13GBP(totalRequirement));
    setText("m13RunSurplus",m13GBP(trueSurplus));
    setText("m13RunSafe",m13GBP(trueSurplus));
    setText("m13LineHolding",m13GBP(totalHoldingTransfer).replace(".00",""));

    const actionHost=document.getElementById("paydayActionsList");
    if(actionHost){
      const lines=[];
      lines.push(`<div class="m39-funding-line"><strong>Immediate catch-up — ${m15Money(immediateCatchUp)}</strong><span>${immediateCatchUp>0?`Restores full cover for ${protectionSummary}.`:"No short-term catch-up is required."}</span></div>`);
      lines.push(`<div class="m39-funding-line"><strong>Future due-date contribution — ${m15Money(futureContribution)}</strong><span>${futureContribution>0?`Builds funding for ${sinking.details.length} later commitment${sinking.details.length===1?"":"s"}.`:"No later commitment needs funding from this payday."}</span></div>`);
      lines.push(`<div class="m39-funding-total"><strong>Total Holding Pot transfer — ${m15Money(totalHoldingTransfer)}</strong></div>`);
      actionHost.innerHTML=lines.join("");
    }

    const recommendation=document.getElementById("m36RecommendationState");
    if(recommendation)recommendation.textContent=totalHoldingTransfer>0.005?"FUND NEXT":"NO TOP-UP";
    const finalCard=document.getElementById("finalContributionCard");
    if(finalCard)finalCard.dataset.state=totalHoldingTransfer>0.005?"fund":"covered";
    const meta=document.getElementById("currentPotOffsetMeta");
    if(meta&&fundingGap>0&&immediateCatchUp<=0)meta.textContent=`${m15Money(fundingGap)} total protection gap remains`;
  };
  if(typeof m25OriginalUpdatePlannerTotals==="function")window.updatePlannerTotals=function(){const result=m25OriginalUpdatePlannerTotals.apply(this,arguments);m25ApplyPlannerClarity();m25RenderAudit();return result};
  if(typeof m25OriginalRunPlanner==="function")window.runPlanner=function(){const result=m25OriginalRunPlanner.apply(this,arguments);m25ApplyPlannerClarity();m25RenderAudit();return result};
  if(typeof m25OriginalM13Render==="function")window.m13Render=function(){const result=m25OriginalM13Render.apply(this,arguments);m25ApplyPlannerClarity();return result};

  function m25CloneButton(id,handler){const old=document.getElementById(id);if(!old)return;const fresh=old.cloneNode(true);old.parentNode.replaceChild(fresh,old);fresh.addEventListener("click",handler)}
  m25CloneButton("m15CopyPlan",m22CopyPlan);m25CloneButton("m22CompletePayday",m22CompletePayday);m25CloneButton("m22ResetMission",m22ResetDraft);m25CloneButton("m22NewMission",m22StartNextMission);
  document.addEventListener("click",event=>{const undo=event.target.closest("[data-m25-undo]");if(undo){event.preventDefault();m25UndoAction(undo.dataset.m25Undo)}});
  window.addEventListener("load",()=>{m22Render();m25ApplyPlannerClarity();m25RenderAudit()});
})();

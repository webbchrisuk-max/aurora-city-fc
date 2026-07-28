
/* ===================== M40 ONE-PAY-CYCLE FUNDING ENGINE ===================== */
(function(){
  'use strict';
  const M40_LOGIC_VERSION=40;
  const previousRender=window.m22Render;
  const previousReceipt=window.m22RenderReceipt;
  const previousScenarioRender=window.m33RenderScenario;

  function n(value){const number=Number(value||0);return Number.isFinite(number)?number:0}
  function round(value){return Math.round((n(value)+Number.EPSILON)*100)/100}
  function date(value){
    if(!value)return null;
    const d=value instanceof Date?new Date(value):(typeof parseLocalDate==='function'?parseLocalDate(value):new Date(value));
    if(!(d instanceof Date)||Number.isNaN(d.getTime()))return null;
    d.setHours(0,0,0,0);return d;
  }
  function iso(d){return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function amount(item){return Math.max(0,n(item?._cashAmount??item?.amount))}
  function normalise(value){return String(value||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim()}
  function unique(items){
    const seen=new Set();
    return (items||[]).filter(item=>{
      const d=date(item?._d||item?.due);const key=`${normalise(item?.name)}|${iso(d)}|${amount(item).toFixed(2)}`;
      if(seen.has(key))return false;seen.add(key);return true;
    }).sort((a,b)=>date(a?._d||a?.due)-date(b?._d||b?.due));
  }
  function windows(paydayValue){
    const payday=date(paydayValue);if(!payday)return null;
    const next=new Date(payday);next.setDate(next.getDate()+28);next.setHours(0,0,0,0);
    return {payday,next};
  }
  function itemsBefore(cutoff){
    return typeof window.m25BeforePaydayItems==='function'?unique(window.m25BeforePaydayItems(cutoff)||[]):[];
  }
  function cycleItems(paydayValue){
    const range=windows(paydayValue);if(!range)return [];
    return unique(itemsBefore(range.next).filter(item=>{
      const d=date(item?._d||item?.due);return d&&d>=range.payday&&d<range.next;
    }));
  }
  function paydaysRemaining(paydayValue,dueValue){
    const start=date(paydayValue),due=date(dueValue);if(!start||!due||due<start)return 0;
    let count=0,cursor=new Date(start),guard=0;
    while(cursor<=due&&guard<80){count++;cursor.setDate(cursor.getDate()+28);guard++}
    return count;
  }
  function sourceLabel(item){
    if(item?._sourceLabel)return String(item._sourceLabel);
    if(item?.source==='yearly')return 'Yearly Costs';
    if(item?.source==='future')return 'Future Costs';
    return 'Scheduled Bills';
  }

  window.m22BillProtection=function(paydayValue){
    const range=windows(paydayValue);
    const preItems=itemsBefore(range?range.payday:paydayValue);
    const nextItems=cycleItems(paydayValue);
    const preBills=round(preItems.reduce((sum,item)=>sum+amount(item),0));
    const cycleBills=round(nextItems.reduce((sum,item)=>sum+amount(item),0));
    const minimum=Math.max(0,n(plannerState?.minimumBuffer));
    const holding=Math.max(0,n(plannerState?.holdingBalance));
    const currentRequired=round(minimum+preBills);
    const topUpNow=round(Math.max(0,currentRequired-holding));
    const projectedAtPayday=round(Math.max(0,holding-preBills));
    const protectedAtPayday=round(Math.max(0,holding+topUpNow-preBills));
    const cycleRequired=round(minimum+cycleBills);
    const paydayTransfer=round(Math.max(0,cycleRequired-protectedAtPayday));
    const postCycleHeadroom=round(Math.max(0,protectedAtPayday-cycleRequired));
    return {
      items:preItems,
      prePaydayItems:preItems,
      cycleItems:nextItems,
      preBills,
      cycleBills,
      bills:preBills,
      recurring:0,
      minimum,
      holding,
      required:currentRequired,
      currentRequired,
      cycleRequired,
      topUp:topUpNow,
      topUpNow,
      projectedAtPayday,
      protectedAtPayday,
      paydayTransfer,
      postCycleHeadroom,
      headroom:Math.max(0,holding-currentRequired),
      paydayDate:range?iso(range.payday):'',
      nextPayday:range?iso(range.next):''
    };
  };

  window.m25SinkingFundPlan=function(paydayValue){
    const range=windows(paydayValue)||windows(m22DefaultPayday());
    const protection=window.m22BillProtection(range.payday);
    let headroom=Math.max(0,n(protection.postCycleHeadroom));
    const all=typeof window.m25CanonicalCostRecords==='function'?window.m25CanonicalCostRecords():[];
    const unplanned=all.filter(record=>!record.due);
    const eligible=all.filter(record=>{
      const d=date(record.due);return d&&d>=range.next&&n(record.amount)>0;
    }).sort((a,b)=>date(a.due)-date(b.due));
    const details=eligible.map(record=>{
      const full=Math.max(0,n(record.amount));
      const funded=Math.min(headroom,full);headroom-=funded;
      const remaining=Math.max(0,full-funded);
      const paydays=Math.max(1,paydaysRemaining(range.payday,record.due));
      return {...record,fundedFromHeadroom:funded,remaining,paydays,contribution:remaining/paydays};
    });
    const totalCommitments=round(details.reduce((sum,row)=>sum+n(row.amount),0));
    const totalRemaining=round(details.reduce((sum,row)=>sum+n(row.remaining),0));
    const contribution=round(details.reduce((sum,row)=>sum+n(row.contribution),0));
    const cycleDetails=(protection.cycleItems||[]).map(item=>({...item,amount:amount(item),sourceLabel:sourceLabel(item),paydays:1,contribution:amount(item),dueThisCycle:true}));
    return {
      paydayDate:iso(range.payday),nextPayday:iso(range.next),protection,details,unplanned,
      totalCommitments,totalRemaining,allocatedHeadroom:round(details.reduce((sum,row)=>sum+n(row.fundedFromHeadroom),0)),contribution,
      cycleDetails,cycleCommitments:protection.cycleBills,payCycleStart:iso(range.payday),payCycleEnd:iso(range.next)
    };
  };
  window.m24RegularHoldingContribution=function(){return window.m25SinkingFundPlan(m22EnsureState().paydayDate||m22DefaultPayday()).contribution};

  window.m22ComputePlan=function(){
    const mission=m22EnsureState(),inputs=m22InputSnapshot(),protection=window.m22BillProtection(mission.paydayDate),sinking=window.m25SinkingFundPlan(mission.paydayDate);
    const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);
    let available=actual;const actions=[];
    const cycleHoldingTarget=Math.max(0,n(protection.paydayTransfer));
    const cycleHoldingAmount=Math.min(cycleHoldingTarget,available);
    if(cycleHoldingAmount>.009){
      actions.push({id:'holding:cycle',name:'Holding Pot next pay-cycle funding',amount:cycleHoldingAmount,type:'holding',holdingKind:'cycle',meta:`Covers ${m15Money(protection.cycleBills)} of bills from ${dateLabel(protection.paydayDate)} to ${dateLabel(protection.nextPayday)} while preserving the ${m15Money(protection.minimum)} buffer`});
      available-=cycleHoldingAmount;
    }
    const regularHoldingTarget=Math.max(0,n(sinking.contribution));
    const regularHoldingAmount=Math.min(regularHoldingTarget,available);
    if(regularHoldingAmount>.009){
      actions.push({id:'holding:regular',name:'Holding Pot future due-date contribution',amount:regularHoldingAmount,type:'holding',holdingKind:'regular',meta:`Date-aware funding across ${sinking.details.length} later commitment${sinking.details.length===1?'':'s'} • target ${m15Money(regularHoldingTarget)}`});
      available-=regularHoldingAmount;
    }
    let regularBudget=available,lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
    let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
    const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
    const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
    const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
    const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
    const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
    if(lifestyle>.009){actions.push({id:'regular:lifestyle',name:'Spending Pot',amount:lifestyle,type:'lifestyle',potId:'spending_pot',meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:'Four-week lifestyle allocation'});regularBudget-=lifestyle}
    const houseResult=m33BuildSpecialPotAction(houseBoost,'house','regular');actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
    const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,'emergency','regular');actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
    const specialIds=[...houseResult.actions,...emergencyResult.actions].map(action=>action.potId);
    const goalResult=m22BuildPotActions(goals,'priority','regular',['spending_pot',...specialIds]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,action)=>sum+action.amount,0);
    const coreActions=m22InvestmentActions(core,inputs.platform,'core');actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,action)=>sum+action.amount,0);available=Math.max(0,regularBudget);
    const extraAvailable=Math.min(extra,available),extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
    if(extraRemaining>.009){
      if(inputs.strategy==='isa'){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,'extra'));extraRemaining=0}
      else{const result=m22BuildPotActions(extraRemaining,inputs.strategy,'extra',['spending_pot',...specialIds]);actions.push(...result.actions);extraRemaining=result.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,'extra'));extraRemaining=0}}
      available-=extraRequested;
    }
    const buffered=Math.max(0,available);actions.push({id:'buffer:retained',name:'Retain in current account',amount:buffered,type:'buffer',meta:'Money deliberately left in the current account after all planned transfers'});
    const planned=actions.reduce((sum,action)=>sum+action.amount,0);
    return {
      logicVersion:M40_LOGIC_VERSION,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,sinking,expected,actual,extra,shortfall,
      currentTopUpNow:protection.topUpNow,cycleHoldingTarget,cycleHoldingAmount,
      holdingAmount:cycleHoldingAmount+regularHoldingAmount,urgentHoldingAmount:cycleHoldingAmount,regularHoldingTarget,regularHoldingAmount,
      lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,
      unresolvedProtection:Math.max(0,protection.topUpNow)+Math.max(0,cycleHoldingTarget-cycleHoldingAmount),
      unresolvedRegularHolding:Math.max(0,regularHoldingTarget-regularHoldingAmount),actions,planned,buffered
    };
  };
  window.m22CurrentPlan=function(){
    const mission=m22EnsureState();
    if(mission.plan&&mission.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;
    return mission.plan||window.m22ComputePlan();
  };

  window.m22Instruction=function(plan){
    const el=document.getElementById('m15Instruction');if(!el)return;
    if(n(plan.protection?.topUpNow)>.009){el.className='m22-callout risk';el.innerHTML=`Current Holding Pot protection is short by <strong>${m15Money(plan.protection.topUpNow)}</strong> before payday. This is a top-up needed now, not part of the payday wage allocation.`;return}
    if(Math.max(0,n(plan.cycleHoldingTarget)-n(plan.cycleHoldingAmount))>.009){el.className='m22-callout risk';el.innerHTML=`The wage cannot fully fund the next pay cycle. <strong>${m15Money(Math.max(0,n(plan.cycleHoldingTarget)-n(plan.cycleHoldingAmount)))}</strong> remains unfunded after protecting flexible spending first.`;return}
    if(plan.unresolvedRegularHolding>.009){el.className='m22-callout risk';el.innerHTML=`The next pay cycle is protected, but <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> of later due-date funding remains unfunded.`;return}
    if(plan.shortfall>.009){el.className='m22-callout watch';el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora funded the next payday-to-payday cycle first, then reduced flexible allocations.`;return}
    el.className='m22-callout good';el.innerHTML=`Protected now: <strong>${m15Money(plan.protection.preBills)}</strong> of bills are covered until payday, with no immediate top-up needed. On payday, transfer <strong>${m15Money(plan.cycleHoldingAmount)}</strong> for the following four-week cycle and <strong>${m15Money(plan.regularHoldingAmount)}</strong> for later commitments.`;
  };

  function ensureDom(){
    const urgent=document.querySelector('.m36-urgent-move');
    if(urgent){urgent.querySelector('span').textContent='Top-up needed now';urgent.querySelector('small').textContent='Only bills due before the next payday plus the protected buffer';}
    const cycle=document.querySelector('.m36-future-move');
    if(cycle){cycle.classList.add('m40-cycle-move');cycle.querySelector('span').textContent='Next payday cycle funding';cycle.querySelector('small').textContent='Bills due from this payday to the following payday';}
    const final=document.getElementById('finalContributionCard');
    if(final){final.querySelector('span').textContent='Total planned payday transfer';}
    if(cycle&&!document.getElementById('m40FutureDue')){
      const article=document.createElement('article');article.className='m40-future-due-move';article.innerHTML='<span>Future due-date contribution</span><strong>£<b id="m40FutureDue">0.00</b></strong><small id="m40FutureDueMeta">Funding spread across paydays before later commitments</small>';
      cycle.insertAdjacentElement('afterend',article);
    }
    const grid=document.querySelector('.m36-decision-grid');
    if(grid&&!document.getElementById('m40WindowBreakdown')){
      const details=document.createElement('details');details.id='m40WindowBreakdown';details.className='m40-window-breakdown';details.innerHTML='<summary><span>Show exactly what is being protected</span><small id="m40BreakdownHint">Current cycle and next cycle</small></summary><div class="m40-breakdown-body"><div class="m40-window"><div class="m40-window-head"><span>Now → payday</span><strong id="m40CurrentTotal">£0.00</strong></div><div id="m40CurrentRows"></div></div><div class="m40-window"><div class="m40-window-head"><span>Payday → following payday</span><strong id="m40NextTotal">£0.00</strong></div><div id="m40NextRows"></div></div></div>';
      grid.insertAdjacentElement('afterend',details);
    }
    const protect=document.querySelector('.m22-protection');
    if(protect){
      const labels=[...protect.querySelectorAll('.m22-protect-item span')];
      labels.forEach(label=>{
        const t=label.textContent.trim();
        if(t==='Monthly spend remaining')label.textContent='Projected Holding on payday';
        if(t==='Total Holding requirement')label.textContent='Required until payday';
        if(t==='Urgent top-up')label.textContent='Next pay-cycle funding';
        if(t==='Regular contribution')label.textContent='Future due-date funding';
      });
      if(!document.getElementById('m40TopUpNow')){
        const card=document.createElement('div');card.className='m22-protect-item';card.innerHTML='<span>Top-up needed now</span><strong id="m40TopUpNow">£0.00</strong>';
        protect.insertBefore(card,protect.children[5]||null);
      }
    }
  }
  function rowsHtml(items){
    if(!items?.length)return '<div class="m40-empty">No included payments in this window.</div>';
    return items.map(item=>`<div class="m40-bill-row"><div><strong>${m22Escape(item.name||'Unnamed payment')}</strong><small>${m22Escape(dateLabel(item.due||item._d))} • ${m22Escape(sourceLabel(item))}</small></div><b>${m15Money(amount(item))}</b></div>`).join('');
  }
  function renderClarity(){
    ensureDom();
    const payday=m22EnsureState().paydayDate||m22DefaultPayday();
    const protection=window.m22BillProtection(payday),sinking=window.m25SinkingFundPlan(payday);
    const topUpNow=round(protection.topUpNow),cycleTransfer=round(protection.paydayTransfer),future=round(sinking.contribution),paydayTotal=round(cycleTransfer+future);
    setText('currentPotOffset',formatMoney(topUpNow));
    setText('currentPotOffsetMeta',topUpNow>0?`${m15Money(protection.preBills)} due before payday plus ${m15Money(protection.minimum)} buffer exceeds the current Holding Pot.`:`${m15Money(protection.preBills)} due before payday is already covered. Projected Holding on payday: ${m15Money(protection.projectedAtPayday)}.`);
    setText('suggestedContributionNow',formatMoney(cycleTransfer));
    setText('suggestedContributionMeta',`${m15Money(protection.cycleBills)} of bills fall in the next four-week payday cycle. This transfer preserves the ${m15Money(protection.minimum)} buffer.`);
    setText('m40FutureDue',formatMoney(future));
    setText('m40FutureDueMeta',future>0?`${sinking.details.length} later commitment${sinking.details.length===1?'':'s'} spread across the paydays before each due date.`:'No later due-date contribution is needed this payday.');
    setText('finalAmountToAdd',formatMoney(paydayTotal));
    setText('finalAmountToAddMeta',paydayTotal>0?`${m15Money(cycleTransfer)} next-cycle funding + ${m15Money(future)} later due-date funding.`:'No Holding Pot transfer is planned on payday.');
    setText('finalPotTopUp',`£${formatMoney(paydayTotal)}`);
    setText('finalPotTopUpMeta',paydayTotal>0?`${m15Money(cycleTransfer)} next cycle + ${m15Money(future)} future contribution`:'No payday Holding transfer required');
    setText('commandPaydayMove',`£${formatMoney0(paydayTotal)}`);
    setText('m13LineHolding',m13GBP(paydayTotal).replace('.00',''));
    setText('m22RecurringReserve',m15Money(protection.projectedAtPayday));
    setText('m22HoldingRequirement',m15Money(protection.currentRequired));
    setText('m22UrgentHolding',m15Money(protection.paydayTransfer));
    setText('m22RegularHolding',m15Money(future));
    setText('m40TopUpNow',m15Money(topUpNow));
    setText('m40CurrentTotal',m15Money(protection.preBills));
    setText('m40NextTotal',m15Money(protection.cycleBills));
    const currentRows=document.getElementById('m40CurrentRows');if(currentRows)currentRows.innerHTML=rowsHtml(protection.prePaydayItems);
    const nextRows=document.getElementById('m40NextRows');if(nextRows)nextRows.innerHTML=rowsHtml(protection.cycleItems);
    setText('m40BreakdownHint',`${protection.prePaydayItems.length} now • ${protection.cycleItems.length} next cycle`);
    const actionHost=document.getElementById('paydayActionsList');
    if(actionHost){actionHost.innerHTML=[
      `<div class="m39-funding-line"><strong>Top-up needed now — ${m15Money(topUpNow)}</strong><span>${topUpNow>0?'Current Holding Pot is short before payday.':'Current bills are already protected until payday.'}</span></div>`,
      `<div class="m39-funding-line"><strong>Next payday cycle funding — ${m15Money(cycleTransfer)}</strong><span>Covers ${m15Money(protection.cycleBills)} due from payday to the following payday while retaining the buffer.</span></div>`,
      `<div class="m39-funding-line"><strong>Future due-date contribution — ${m15Money(future)}</strong><span>${future>0?`Builds funding for ${sinking.details.length} later commitment${sinking.details.length===1?'':'s'}.`:'No later funding is needed this payday.'}</span></div>`,
      `<div class="m39-funding-total"><strong>Total planned payday transfer — ${m15Money(paydayTotal)}</strong></div>`
    ].join('')}
    const recommendation=document.getElementById('m36RecommendationState');if(recommendation)recommendation.textContent=topUpNow>.005?'TOP UP NOW':paydayTotal>.005?'PLAN PAYDAY':'COVERED';
    const finalCard=document.getElementById('finalContributionCard');if(finalCard)finalCard.dataset.state=paydayTotal>.005?'fund':'covered';
  }

  window.m40RenderClarity=renderClarity;
  const baseUpdatePlannerTotals=typeof window.updatePlannerTotals==='function'?window.updatePlannerTotals:null;
  if(baseUpdatePlannerTotals){
    window.updatePlannerTotals=function(){
      const result=baseUpdatePlannerTotals.apply(this,arguments);
      renderClarity();
      return result;
    };
  }
  window.m22Render=function(){const result=previousRender?previousRender.apply(this,arguments):undefined;renderClarity();return result};
  window.m22RenderReceipt=function(){
    if(previousReceipt)previousReceipt.apply(this,arguments);
    const host=document.getElementById('m22Receipt');if(!host||!host.classList.contains('show'))return;
    host.querySelectorAll('.m22-receipt-item span').forEach(label=>{if(label.textContent.trim()==='Urgent Holding top-up')label.textContent='Next pay-cycle funding'});
  };
  window.m33ComputeScenario=function(){
    const plan=m22CurrentPlan(),protection=window.m22BillProtection(m22EnsureState().paydayDate),pay=n(document.getElementById('m33ScenarioPay')?.value),retainedTarget=n(document.getElementById('m33ScenarioRetain')?.value);
    const cycle=Math.min(protection.paydayTransfer,pay);let left=Math.max(0,pay-cycle);const regularTarget=window.m24RegularHoldingContribution(),regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
    const get=id=>Math.max(0,n(document.getElementById(id)?.value));
    let lifestyle=get('m33ScenarioLifestyle'),goals=get('m33ScenarioGoals'),house=get('m33ScenarioHouse'),emergency=get('m33ScenarioEmergency'),shares=get('m33ScenarioShares');
    const flexibleBudget=Math.max(0,left-retainedTarget);let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-flexibleBudget);
    const trim=holder=>{const cut=Math.min(holder.value,deficit);holder.value-=cut;deficit-=cut;return cut};
    const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
    const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
    const allocated=cycle+regular+lifestyle+goals+house+emergency+shares,retained=Math.max(0,pay-allocated);
    const unresolved=Math.max(0,protection.topUpNow)+Math.max(0,protection.paydayTransfer-cycle)+Math.max(0,regularTarget-regular),retainGap=Math.max(0,retainedTarget-retained),cutTotal=Object.values(cuts).reduce((a,b)=>a+b,0);
    let state='healthy',label='HEALTHY';if(unresolved>.009){state='risk';label='UNPROTECTED'}else if(cutTotal>.009){state='risk';label='AUTO-REDUCED'}else if(retainGap>.009||retained<100){state='tight';label='TIGHT'}
    const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/(pay||1)*100)-(cutTotal/(pay||1)*60)-(retainGap/Math.max(retainedTarget,1)*25)-(retained<100?(100-retained)/2:0))));
    return {plan,pay,expected:n(plan.expected),overtime:Math.max(0,pay-n(plan.expected)),retainedTarget,urgent:cycle,regular,protection:cycle+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,retainGap,cuts,state,label,score};
  };
  if(previousScenarioRender)window.m33RenderScenario=function(){const result=previousScenarioRender.apply(this,arguments);renderClarity();return result};

  function contributionRate(){return Math.max(0,n(document.getElementById('paydayContributionInput')?.value))}
  function contributionStatus(message,tone){
    const el=document.getElementById('m41ContributionStatus');if(!el)return;
    el.textContent=message;el.className='m41-contribution-status '+(tone||'');
  }
  function persistContributionRate(){
    if(typeof plannerState==='undefined')return;
    plannerState.paydayContribution=contributionRate();
    if(typeof savePlannerData==='function')savePlannerData();
    renderClarity();
    contributionStatus('Saved rate: '+m15Money(plannerState.paydayContribution)+' per payday. This has not changed the Holding Pot balance.','good');
  }
  const rateInput=document.getElementById('paydayContributionInput');
  rateInput?.addEventListener('input',persistContributionRate);
  rateInput?.addEventListener('change',persistContributionRate);
  document.getElementById('holdingBalanceInput')?.addEventListener('input',()=>requestAnimationFrame(renderClarity));
  document.getElementById('minimumBufferInput')?.addEventListener('input',()=>requestAnimationFrame(renderClarity));
  document.getElementById('addPaydayBtn')?.addEventListener('click',()=>{
    const moved=contributionRate();
    setTimeout(()=>{
      if(typeof savePlannerData==='function')savePlannerData();
      renderClarity();
      contributionStatus(moved>0?m15Money(moved)+' added to the Holding Pot. New balance: '+m15Money(plannerState?.holdingBalance||0)+'.':'Enter an amount before recording the transfer.',moved>0?'good':'warn');
    },0);
  });
  contributionStatus('Saved rate: '+m15Money(contributionRate())+' per payday. It is not counted as a transfer until you press Add payday contribution.');

  const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;
  ensureDom();
  window.addEventListener('load',()=>{const state=m22EnsureState();if(state.plan&&state.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!state.completed)state.plan=null;if(typeof m22Render==='function')m22Render();renderClarity()});
})();

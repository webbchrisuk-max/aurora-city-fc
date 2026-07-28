
(function(){
  const money=v=>typeof m15Money==='function'?m15Money(Number(v||0)):`£${Number(v||0).toFixed(2)}`;
  const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
  function destinationKey(a){
    if(a.type==='holding')return 'holding';
    if(a.type==='buffer')return 'buffer';
    if(a.type==='investment')return `investment:${String(a.platform||a.name||'shares').toLowerCase()}`;
    if(a.type==='lifestyle'||a.type==='pot')return `pot:${String(a.potId||a.name||'pot').toLowerCase()}`;
    return `${a.type}:${String(a.id||a.name)}`;
  }
  function destinationName(a){
    if(a.type==='holding')return 'Transfer to Holding Pot';
    if(a.type==='buffer')return 'Retain in current account';
    if(a.type==='investment')return `Transfer to ${a.name||a.platform||'Investment account'}`;
    return `Transfer to ${a.name}`;
  }
  function componentLabel(a){
    if(a.type==='holding'&&a.holdingKind==='cycle')return 'Next pay-cycle protection';
    if(a.type==='holding'&&a.holdingKind==='urgent')return 'Immediate bill protection';
    if(a.type==='holding'&&a.holdingKind==='regular')return 'Future due-date funding';
    if(String(a.id||'').includes('priority'))return 'Priority goal funding';
    if(String(a.id||'').includes('regular'))return 'Regular payday allocation';
    if(String(a.id||'').includes('extra'))return 'Extra / overtime allocation';
    if(a.type==='buffer')return 'Deliberately retained cash';
    return a.name||'Allocation';
  }
  function consolidate(actions){
    const groups=new Map();
    (actions||[]).forEach(a=>{
      const key=destinationKey(a);
      if(!groups.has(key))groups.set(key,{...a,id:`bank:${key}`,name:destinationName(a),amount:0,components:[],originalIds:[]});
      const g=groups.get(key);
      g.amount=round(g.amount+Number(a.amount||0));
      g.components.push({id:a.id,label:componentLabel(a),amount:Number(a.amount||0),meta:a.meta||'',holdingKind:a.holdingKind||''});
      g.originalIds.push(a.id);
      if(a.type==='holding'){
        g.holdingKind='combined';
        g.urgentAmount=round(Number(g.urgentAmount||0)+(a.holdingKind==='urgent'?Number(a.amount||0):0));
        g.cycleAmount=round(Number(g.cycleAmount||0)+(a.holdingKind==='cycle'?Number(a.amount||0):0));
        g.regularAmount=round(Number(g.regularAmount||0)+(a.holdingKind==='regular'?Number(a.amount||0):0));
      }
    });
    return [...groups.values()].map(g=>{
      const parts=g.components.map(c=>`${c.label} ${money(c.amount)}`);
      g.meta=parts.join(' • ');
      return g;
    });
  }
  const baseCompute=window.m22ComputePlan;
  if(typeof baseCompute==='function'){
    window.m22ComputePlan=function(){
      const plan=baseCompute.apply(this,arguments);
      plan.actions=consolidate(plan.actions);
      plan.planned=round(plan.actions.reduce((s,a)=>s+Number(a.amount||0),0));
      plan.bankingMissionVersion=41;
      return plan;
    };
  }
  function clearOldDraft(){
    try{
      const mission=typeof m22EnsureState==='function'?m22EnsureState():null;
      if(mission&&!mission.completed&&!Object.keys(mission.executed||{}).length&&mission.plan&&!mission.plan.bankingMissionVersion){mission.plan=null;}
    }catch(e){}
  }
  const baseRender=window.m22Render;
  if(typeof baseRender==='function'){
    window.m22Render=function(){
      clearOldDraft();
      const result=baseRender.apply(this,arguments);
      document.querySelectorAll('#m15AllocationList .m22-action-row').forEach((row,index)=>{
        const plan=typeof m22CurrentPlan==='function'?m22CurrentPlan():null;
        const action=plan?.actions?.[index];
        if(!action)return;
        const name=row.querySelector('.m22-action-name');
        if(name&&!name.querySelector('.m41-transfer-label'))name.insertAdjacentHTML('afterbegin','<span class="m41-transfer-label">Banking action</span>');
        const meta=row.querySelector('.m22-action-meta');
        if(meta&&action.components?.length>1){
          meta.innerHTML=`<div class="m41-breakdown">${action.components.map(c=>`<div class="m41-breakdown-row"><span>${typeof m22Escape==='function'?m22Escape(c.label):c.label}</span><b>${money(c.amount)}</b></div>`).join('')}</div>`;
        }
      });
      const route=document.getElementById('m15Route');
      const plan=typeof m22CurrentPlan==='function'?m22CurrentPlan():null;
      if(route&&plan)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${typeof m22Escape==='function'?m22Escape(a.name):a.name}</div><div class="m22-step-meta">${a.components?.map(c=>`${c.label} ${money(c.amount)}`).join(' • ')||a.meta||''}</div></div><div class="m22-step-amount">${money(a.amount)}</div></div>`).join('');
      return result;
    };
  }
  window.m22CompletePayday=function(){
    const mission=m22EnsureState(),plan=m22CurrentPlan();
    if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus('Complete every banking move before closing the mission.',true);return}
    const rec=m25Reconciliation(plan);if(Math.abs(rec.difference)>=.011){m22ShowStatus(`The current account does not reconcile. Correct the ${money(Math.abs(rec.difference))} difference first.`,true);return}
    const actualFor=a=>Number(m25ActualForAction(a)||0);
    const actualBy=predicate=>plan.actions.filter(predicate).reduce((s,a)=>s+actualFor(a),0);
    const holdingAction=plan.actions.find(a=>a.type==='holding');
    const holdingActual=holdingAction?actualFor(holdingAction):0;
    const holdingPlanned=holdingAction?Number(holdingAction.amount||0):0;
    const scale=holdingPlanned>0?holdingActual/holdingPlanned:0;
    const urgentHolding=round((Number(holdingAction?.urgentAmount||0)+Number(holdingAction?.cycleAmount||0))*scale);
    const regularHolding=round(Number(holdingAction?.regularAmount||0)*scale);
    const holdingAdded=actualBy(a=>a.type==='holding'),potsFunded=actualBy(a=>a.type==='pot'||a.type==='lifestyle'),invested=actualBy(a=>a.type==='investment'),buffered=actualBy(a=>a.type==='buffer');
    const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,plannedTotal:plan.planned,urgentHolding,regularHolding,holdingAdded,potsFunded,invested,buffered,transfersCompleted:rec.completed,closingHolding:Number(plannerState.holdingBalance||0),openingHolding:Number(mission.openingHolding??(Number(plannerState.holdingBalance||0)-holdingAdded)),difference:rec.difference,actionCount:plan.actions.length,actions:plan.actions.map(a=>({id:a.id,name:a.name,type:a.type,planned:Number(a.amount||0),actual:actualFor(a),components:a.components||[]})),completedAt:new Date().toISOString()};
    mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${money(receipt.invested)} invested • ${money(receipt.holdingAdded)} to Holding • ${money(receipt.potsFunded)} to pots • ${money(receipt.buffered)} retained`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus('Payday banking mission completed, reconciled and saved.');m22Render();
  };
  clearOldDraft();
  setTimeout(()=>{try{window.m22Render?.()}catch(e){}},80);
})();

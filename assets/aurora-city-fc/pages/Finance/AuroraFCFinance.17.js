
(function(){
  const GBP=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
  const n=id=>Math.max(0,Number(document.getElementById(id)?.value||0));
  const setValue=(id,value)=>{const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)};
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  function humanDate(value){
    if(!value)return 'No payday selected';
    const parts=String(value).split('-').map(Number);if(parts.length!==3||parts.some(Number.isNaN))return value;
    const d=new Date(parts[0],parts[1]-1,parts[2]);
    return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  }
  function classifyPlan(plan){
    const result={holding:0,lifestyle:0,goals:0,house:0,emergency:0,shares:0,retained:0,potTotal:0,transfers:0,accounted:0};
    (plan?.actions||[]).forEach(action=>{
      const amount=Number(action.amount||0);result.accounted+=amount;
      if(action.type==='holding')result.holding+=amount;
      else if(action.type==='buffer')result.retained+=amount;
      else if(action.type==='lifestyle')result.lifestyle+=amount;
      else if(action.type==='investment')result.shares+=amount;
      else if(action.type==='pot'){
        result.potTotal+=amount;const name=String(action.name||'').toLowerCase();
        if(name.includes('house')||name.includes('home')||name.includes('renovation'))result.house+=amount;
        else if(name.includes('emergency')||name.includes('rainy')||name.includes('safety'))result.emergency+=amount;
        else result.goals+=amount;
      }
    });
    result.transfers=Math.max(0,result.accounted-result.retained);return result;
  }
  window.m33LiveBreakdown=classifyPlan;

  function setModeUI(mode){
    const overtime=mode==='overtime',custom=mode==='custom';
    const field=document.getElementById('m35OvertimeField'),strip=document.getElementById('m35OvertimeStrip'),route=document.getElementById('m35OvertimeRoute'),pay=document.getElementById('m33ScenarioPay');
    if(field)field.hidden=!overtime;if(strip)strip.hidden=!overtime;if(route)route.hidden=!overtime;if(pay)pay.readOnly=!custom;
  }
  window.m33SeedScenario=function(mode=m33ScenarioState.mode){
    const plan=m22CurrentPlan(),live=classifyPlan(plan),expected=Number(plan.expected||2100),currentExtra=Math.max(0,Number(plan.actual||0)-expected),extra=currentExtra>0?currentExtra:800;
    m33ScenarioState.mode=mode;m33ScenarioState.initialised=true;m33ScenarioState.userEdited=false;
    let pay=Number(plan.actual||expected);
    if(mode==='baseline')pay=expected;
    if(mode==='overtime')pay=expected+extra;
    setValue('m35OvertimeExtra',mode==='overtime'?extra:0);setValue('m33ScenarioPay',pay);setValue('m33ScenarioShares',live.shares||Number(plan.inputs?.coreInvestment||0));setValue('m33ScenarioLifestyle',live.lifestyle||Number(plan.inputs?.lifestyle||0));setValue('m33ScenarioGoals',live.goals||Number(plan.inputs?.goalPots||0));setValue('m33ScenarioHouse',live.house||Number(plan.inputs?.houseBoost||0));setValue('m33ScenarioEmergency',live.emergency||Number(plan.inputs?.emergencyBoost||0));setValue('m33ScenarioRetain',Math.max(100,Number(live.retained||0)));
    document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode===mode));
    const note=document.getElementById('m33ModeNote');if(note)note.textContent=mode==='baseline'?'Baseline mirrors the expected wage and current allocation priorities.':mode==='overtime'?`Overtime mode separates the normal ${GBP(expected)} payday from the extra pay.`:'Custom mode keeps every value under your control.';
    setModeUI(mode);m33RenderScenario();
  };

  window.m33ComputeScenario=function(){
    const plan=m22CurrentPlan(),protection=m22BillProtection(m22EnsureState().paydayDate),pay=n('m33ScenarioPay'),retainedTarget=n('m33ScenarioRetain');
    const urgent=Math.min(protection.topUp,pay);let left=Math.max(0,pay-urgent);const regularTarget=m24RegularHoldingContribution(),regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
    let lifestyle=n('m33ScenarioLifestyle'),goals=n('m33ScenarioGoals'),house=n('m33ScenarioHouse'),emergency=n('m33ScenarioEmergency'),shares=n('m33ScenarioShares');
    const flexibleBudget=Math.max(0,left-retainedTarget);let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-flexibleBudget);
    const trim=holder=>{const cut=Math.min(holder.value,deficit);holder.value-=cut;deficit-=cut;return cut};
    const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
    const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
    const allocated=urgent+regular+lifestyle+goals+house+emergency+shares,retained=Math.max(0,pay-allocated),unresolved=Math.max(0,protection.topUp-urgent)+Math.max(0,regularTarget-regular),retainGap=Math.max(0,retainedTarget-retained),cutTotal=Object.values(cuts).reduce((a,b)=>a+b,0);
    let state='healthy',label='HEALTHY';if(unresolved>.009){state='risk';label='UNPROTECTED'}else if(cutTotal>.009){state='risk';label='AUTO-REDUCED'}else if(retainGap>.009||retained<100){state='tight';label='TIGHT'}
    const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/(pay||1)*100)-(cutTotal/(pay||1)*60)-(retainGap/(Math.max(retainedTarget,1))*25)-(retained<100?(100-retained)/2:0))));
    return {plan,pay,expected:Number(plan.expected||0),overtime:Math.max(0,pay-Number(plan.expected||0)),retainedTarget,urgent,regular,protection:urgent+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,retainGap,cuts,state,label,score};
  };

  const originalRenderScenario=window.m33RenderScenario;
  window.m33RenderScenario=function(){
    const result=originalRenderScenario.apply(this,arguments);const scenario=m33ComputeScenario(),live=classifyPlan(scenario.plan),cutTotal=Object.values(scenario.cuts).reduce((a,b)=>a+b,0),transfers=Math.max(0,scenario.allocated);
    setModeUI(m33ScenarioState.mode);setText('m35BasePay',GBP(scenario.expected));setText('m35OvertimeDisplay',GBP(scenario.overtime));setText('m35ScenarioTotal',GBP(scenario.pay));
    const statement=document.getElementById('m35DecisionStatement');if(statement){statement.dataset.state=scenario.state;if(scenario.unresolved>.009)statement.innerHTML=`<strong>This scenario is not safe yet.</strong> Required Holding Pot protection is short by ${GBP(scenario.unresolved)}.`;else if(cutTotal>.009)statement.innerHTML=`<strong>Aurora has corrected an over-allocation.</strong> ${GBP(cutTotal)} was removed from flexible moves so the plan cannot spend more than the wage received.`;else if(scenario.retained<scenario.retainedTarget-.009)statement.innerHTML=`<strong>This scenario is tight.</strong> It protects the required moves but misses your retained-cash floor by ${GBP(scenario.retainedTarget-scenario.retained)}.`;else statement.innerHTML=`<strong>This scenario is safe.</strong> All required protection is covered, ${GBP(transfers)} would be moved and ${GBP(scenario.retained)} would remain in the current account.`}
    const route=document.getElementById('m35OvertimeRoute');if(route&&m33ScenarioState.mode==='overtime'){
      const extra=Math.max(0,scenario.pay-scenario.expected),routes=[];[['shares','shares'],['house','House Pot'],['emergency','Emergency Fund'],['goals','other pots'],['lifestyle','Spending Pot'],['retained','retained cash']].forEach(([key,label])=>{const diff=Number(scenario[key]||0)-Number(live[key]||0);if(diff>.009)routes.push(`${GBP(diff)} to ${label}`)});
      route.innerHTML=extra>.009?`<strong>Extra ${GBP(extra)} route:</strong> ${routes.length?routes.join(' • '):`${GBP(extra)} currently remains unassigned.`}`:'No overtime has been added to this scenario.';
    }
    const confirmCopy=document.getElementById('m35ApplyConfirmCopy');if(confirmCopy)confirmCopy.textContent=`This will rebuild the live mission using ${GBP(scenario.pay)} pay, ${GBP(scenario.allocated)} in planned transfers and ${GBP(scenario.retained)} retained.`;
    return result;
  };

  function renderLiveRefinement(){
    const plan=m22CurrentPlan(),snap=classifyPlan(plan),mission=m22EnsureState();setText('m33PlannedTotal',GBP(snap.accounted));setText('m15AllocationTotal',`${GBP(snap.transfers)} transfers planned`);setText('m35PaydayHuman',humanDate(mission.paydayDate||document.getElementById('m22PaydayDate')?.value));
    const actions=plan.actions||[],pending=actions.filter(a=>!m22ActionDone(a)),done=actions.length-pending.length,preview=document.getElementById('m35ChecklistPreview');
    setText('m35ChecklistSummary',`${done} of ${actions.length} completed`);setText('m35FullChecklistMeta',`${actions.length} move${actions.length===1?'':'s'}`);
    if(preview){
      const icon=a=>a.type==='holding'?'H':a.type==='investment'?'↗':a.type==='buffer'?'£':a.type==='lifestyle'?'S':'P';
      preview.innerHTML=pending.length?pending.slice(0,3).map(a=>`<div class="m35-preview-row"><div class="m35-preview-icon">${icon(a)}</div><div><strong>${m22Escape(a.name)}</strong><small>${m22Escape(a.meta||'Ready to complete')}</small></div><strong class="m35-preview-amount">${GBP(a.amount)}</strong></div>`).join('')+(pending.length>3?`<div class="m35-preview-more">+ ${pending.length-3} more move${pending.length-3===1?'':'s'} in the full checklist</div>`:''):`<div class="m35-preview-row"><div class="m35-preview-icon">✓</div><div><strong>All payday moves completed</strong><small>Review reconciliation, then close the mission.</small></div><strong class="m35-preview-amount">READY</strong></div>`;
    }
  }

  const originalM22Render=window.m22Render;
  window.m22Render=function(){const result=originalM22Render.apply(this,arguments);renderLiveRefinement();return result};

  const originalApply=window.m33ApplyScenario;
  window.m33ApplyScenario=function(){
    const mission=m22EnsureState();m33ScenarioState.undo={inputs:JSON.parse(JSON.stringify(mission.inputs||{})),paydayDate:mission.paydayDate};const result=originalApply.apply(this,arguments);const undo=document.getElementById('m35UndoScenario');if(undo)undo.hidden=false;return result;
  };

  function showConfirm(){const scenario=m33ComputeScenario(),mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed){m33ShowApply('The live mission is locked because execution has started.',true);return}const panel=document.getElementById('m35ApplyConfirm');if(panel)panel.hidden=false;const copy=document.getElementById('m35ApplyConfirmCopy');if(copy)copy.textContent=`This will replace the editable live plan with ${GBP(scenario.pay)} pay, ${GBP(Math.max(0,scenario.allocated))} in transfers and ${GBP(scenario.retained)} retained. Your current plan will be kept as an undo point.`}
  function hideConfirm(){const panel=document.getElementById('m35ApplyConfirm');if(panel)panel.hidden=true}
  function undoApply(){const undo=m33ScenarioState.undo;if(!undo)return;const mission=m22EnsureState();if(m22AnyExecuted()||mission.completed){m33ShowApply('Undo is unavailable after execution has started.',true);return}mission.inputs=JSON.parse(JSON.stringify(undo.inputs));mission.paydayDate=undo.paydayDate;mission.plan=null;m22HydrateInputs();m22Save();m22Render();m33ScenarioState.undo=null;const btn=document.getElementById('m35UndoScenario');if(btn)btn.hidden=true;m33ShowApply('The previous live payday plan has been restored.')}

  function replaceButton(id,handler){const old=document.getElementById(id);if(!old)return;const fresh=old.cloneNode(true);old.parentNode.replaceChild(fresh,old);fresh.addEventListener('click',handler);return fresh}
  replaceButton('m33ApplyScenario',showConfirm);replaceButton('m33ResetScenario',()=>{hideConfirm();m33SeedScenario('overtime')});
  document.getElementById('m35ConfirmApply')?.addEventListener('click',()=>{hideConfirm();m33ApplyScenario()});document.getElementById('m35CancelApply')?.addEventListener('click',hideConfirm);document.getElementById('m35UndoScenario')?.addEventListener('click',undoApply);
  document.getElementById('m35OvertimeExtra')?.addEventListener('input',()=>{m33ScenarioState.mode='overtime';const expected=Number(m22CurrentPlan().expected||0),extra=n('m35OvertimeExtra');setValue('m33ScenarioPay',expected+extra);document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode==='overtime'));setModeUI('overtime');m33RenderScenario()});
  document.getElementById('m33ScenarioRetain')?.addEventListener('input',()=>{m33ScenarioState.mode='custom';document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode==='custom'));setModeUI('custom');const note=document.getElementById('m33ModeNote');if(note)note.textContent='Custom mode keeps every value under your control.';m33RenderScenario()});
  document.getElementById('m22PaydayDate')?.addEventListener('change',()=>setText('m35PaydayHuman',humanDate(document.getElementById('m22PaydayDate')?.value)));
  window.addEventListener('load',()=>setTimeout(()=>{renderLiveRefinement();m33SeedScenario(m33ScenarioState.mode||'overtime')},120));
  if(document.readyState!=='loading')setTimeout(()=>{renderLiveRefinement();m33SeedScenario(m33ScenarioState.mode||'overtime')},120);
})();

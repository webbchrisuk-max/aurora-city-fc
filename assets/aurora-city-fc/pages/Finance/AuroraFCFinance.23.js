
/* ===================== M43 PAYDAY POT GAP DEDUPLICATION FIX ===================== */
(function(){
  let plannedPotLedger = new Map();

  function potKey(p){ return String((p && (p.id || p.name)) || ''); }
  function money(v){ return typeof m15Money === 'function' ? m15Money(v) : `£${Number(v||0).toFixed(2)}`; }

  const originalComputePlan = window.m22ComputePlan;

  window.m22BuildPotActions = m22BuildPotActions = function(amount,strategy,prefix='goal',excludeIds=[]){
    let remaining=Math.max(0,Number(amount||0));
    const actions=[];
    const excluded=new Set((excludeIds||[]).map(String));
    const pots=(Array.isArray(plannerState.editablePots)?plannerState.editablePots:[])
      .map(p=>({
        ...p,
        gap:Math.max(0,m15PotGap(p)-Number(plannedPotLedger.get(potKey(p))||0)),
        priority:m15PotPriority(p)
      }))
      .filter(p=>p.gap>.009&&!excluded.has(potKey(p)));

    const reserve=(p,value,meta)=>{
      const key=potKey(p);
      const alreadyInCall=actions.filter(a=>String(a.potId)===key).reduce((s,a)=>s+Number(a.amount||0),0);
      const availableGap=Math.max(0,p.gap-alreadyInCall);
      const actual=Math.max(0,Math.min(remaining,Number(value||0),availableGap));
      if(actual<=.009)return;
      actions.push({id:`${prefix}:pot:${key}`,name:p.name,amount:actual,type:'pot',potId:key,meta});
      remaining-=actual;
    };

    if(strategy==='balanced'){
      let active=[...pots].sort((a,b)=>a.priority-b.priority||b.gap-a.gap);
      while(remaining>.009&&active.length){
        const share=remaining/active.length;
        const next=[];
        active.forEach(p=>{
          const key=potKey(p);
          const used=actions.filter(a=>String(a.potId)===key).reduce((s,a)=>s+Number(a.amount||0),0);
          const need=Math.max(0,p.gap-used);
          const value=Math.min(share,need,remaining);
          if(value>.009){
            actions.push({id:`${prefix}:pot:${key}`,name:p.name,amount:value,type:'pot',potId:key,meta:`P${p.priority} • balanced funding • ${money(p.gap)} remaining gap`});
            remaining-=value;
          }
          if(need-value>.009)next.push(p);
        });
        if(next.length===active.length&&share<.01)break;
        active=next;
      }
    }else{
      const maxPriority=strategy==='critical'?1:3;
      pots.filter(p=>p.priority<=maxPriority)
        .sort((a,b)=>a.priority-b.priority||b.gap-a.gap)
        .forEach(p=>reserve(p,p.gap,`P${p.priority} ${p.priority===1?'Critical':p.priority===2?'Important':'Flexible'} • ${money(p.gap)} remaining target gap`));
    }

    const merged=[];
    const byId=new Map();
    actions.forEach(action=>{
      if(byId.has(action.id))byId.get(action.id).amount+=action.amount;
      else{const copy={...action};byId.set(copy.id,copy);merged.push(copy);}
    });

    merged.forEach(action=>{
      const key=String(action.potId||'');
      plannedPotLedger.set(key,Number(plannedPotLedger.get(key)||0)+Number(action.amount||0));
    });
    return {actions:merged,remaining};
  };

  if(typeof originalComputePlan==='function'){
    window.m22ComputePlan=function(){
      plannedPotLedger=new Map();
      return originalComputePlan.apply(this,arguments);
    };
  }

  function clearStalePlan(){
    try{
      const mission=typeof m22EnsureState==='function'?m22EnsureState():null;
      if(mission && !mission.completed && !(typeof m22AnyExecuted==='function'&&m22AnyExecuted())){
        mission.plan=null;
        if(typeof m22Save==='function')m22Save();
        if(typeof m22Render==='function')m22Render();
      }
    }catch(err){console.warn('Aurora allocator refresh',err);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clearStalePlan,180));
  else setTimeout(clearStalePlan,180);
})();

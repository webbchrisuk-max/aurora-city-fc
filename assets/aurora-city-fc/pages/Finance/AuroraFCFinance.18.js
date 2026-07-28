
/* ===================== M36 FUNDING ENGINE VISUAL SYNC ===================== */
(function(){
  const id=x=>document.getElementById(x);
  const amountFromText=x=>{const raw=String(id(x)?.textContent||'').replace(/[^0-9.-]/g,'');const n=Number(raw);return Number.isFinite(n)?n:0};
  const inputValue=x=>Math.max(0,Number(id(x)?.value||0));
  const pct=(value,max)=>max>0?Math.max(0,Math.min(100,value/max*100)):0;
  const gbp=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
  function render(){
    if(!id('m36EngineState'))return;
    const weekly=amountFromText('weeklyTarget');
    const annualNeed=weekly*52;
    const annualCurrent=amountFromText('currentRateAnnual');
    const variance=amountFromText('surplusShortfall');
    const coverage=annualNeed>0?annualCurrent/annualNeed*100:100;
    const holding=inputValue('holdingBalanceInput');
    const buffer=inputValue('minimumBufferInput');
    const bufferPct=buffer>0?pct(holding,buffer):100;
    const grow=inputValue('growPotBalanceInput');
    const target=inputValue('growPotTargetInput');
    const growthPct=pct(grow,target);
    const finalAdd=amountFromText('finalAmountToAdd');
    const state=id('m36EngineState');
    const stateText=id('m36EngineStateText');
    let tone='live',label='ON TARGET';
    if(variance < -0.005){tone='risk';label='CATCH-UP REQUIRED'}
    else if(coverage < 99.5){tone='watch';label='BUILDING COVERAGE'}
    state.dataset.state=tone;if(stateText)stateText.textContent=label;
    const coverageFill=id('m36CoverageFill');if(coverageFill)coverageFill.style.width=`${Math.min(100,coverage).toFixed(1)}%`;
    if(id('m36CoverageBadge'))id('m36CoverageBadge').textContent=`${Math.round(coverage)}%`;
    if(id('m36CoverageText'))id('m36CoverageText').textContent=annualNeed>0?`${gbp(annualCurrent)} funded against ${gbp(annualNeed)} annual requirement`:'No active annual requirement';
    const varianceCard=id('m36VarianceCard');if(varianceCard)varianceCard.dataset.state=variance<0?'risk':'good';
    const bufferFill=id('m36BufferFill');if(bufferFill)bufferFill.style.width=`${bufferPct.toFixed(1)}%`;
    if(id('m36BufferPosition'))id('m36BufferPosition').textContent=holding>=buffer?`${gbp(holding-buffer)} above the minimum buffer`:`${gbp(buffer-holding)} below the minimum buffer`;
    if(id('m36HoldingPosition'))id('m36HoldingPosition').textContent=holding>=buffer?'Holding Pot is above the protected floor':'Holding Pot needs rebuilding to the protected floor';
    const growthFill=id('m36GrowthFill');if(growthFill)growthFill.style.width=`${growthPct.toFixed(1)}%`;
    if(id('m36GrowthScore'))id('m36GrowthScore').textContent=`${Math.round(growthPct)}%`;
    if(id('m36GrowthText'))id('m36GrowthText').textContent=target>0?`${gbp(Math.max(0,target-grow))} remaining to reach the ${gbp(target)} safety target`:'Set a target to activate the growth route';
    const recommendation=id('m36RecommendationState');if(recommendation)recommendation.textContent=finalAdd>0.005?'FUND NEXT':'NO TOP-UP';
  }
  const watch=['weeklyTarget','monthlyTarget','currentRateAnnual','surplusShortfall','suggestedContributionNow','currentPotOffset','finalAmountToAdd','finalPotTopUp','growPotMove','weeklyTargetMeta','currentRateMeta','surplusShortfallMeta','suggestedContributionMeta','currentPotOffsetMeta','finalAmountToAddMeta','nextPaydayLabel','nextPaydayMeta','finalPotTopUpMeta','growPotMoveMeta','paydayActionsList'];
  const observer=new MutationObserver(()=>requestAnimationFrame(render));
  watch.forEach(x=>{const el=id(x);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true})});
  ['holdingBalanceInput','minimumBufferInput','growPotBalanceInput','growPotTargetInput','paydayContributionInput','customAddInput','customRemoveInput'].forEach(x=>id(x)?.addEventListener('input',render));
  window.addEventListener('load',()=>setTimeout(render,180));
  if(document.readyState!=='loading')setTimeout(render,80);else document.addEventListener('DOMContentLoaded',()=>setTimeout(render,80));
})();

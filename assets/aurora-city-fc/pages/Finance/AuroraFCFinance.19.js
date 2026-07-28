
/* ===================== M51 CONNECTED MULTI-SOURCE INVESTMENT PIPELINE • CANONICAL TRANSFER LINK ===================== */
(function(){
  const WEALTH_KEY="aurora_wealth_investment_mission_v1";
  const FUNDING_KEY="aurora_wealth_investment_funding_v1";
  const DECISION_KEY="aurora_trading_brain_decision_v1";
  const REGISTRATION_KEY="aurora_pending_registrations_v1";
  const el=id=>document.getElementById(id);
  const gbp=value=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.warn(error);return false}};
  const num=id=>Math.max(0,Number(el(id)?.value||0));
  const round=value=>Math.round((Number(value||0)+Number.EPSILON)*100)/100;
  const accountLabel=value=>value==="t212"?"Trading 212 ISA":value==="split"?"Split IG / Trading 212":"IG ISA";
  function loadFunding(){
    const saved=read(FUNDING_KEY)||{};
    if(el("m50CapitalBalance"))el("m50CapitalBalance").value=Number(saved.capitalBalance??7000).toFixed(2);
    if(el("m50CapitalRelease"))el("m50CapitalRelease").value=Number(saved.capitalRelease??1000).toFixed(2);
    if(el("m50EtfBalance"))el("m50EtfBalance").value=Number(saved.etfBalance??0).toFixed(2);
    if(el("m50EtfRelease"))el("m50EtfRelease").value=Number(saved.etfRelease??1000).toFixed(2);
  }
  function fundingState(paydayBudget=0){
    const capitalBalance=num("m50CapitalBalance"),capitalTarget=num("m50CapitalRelease");
    const etfBalance=num("m50EtfBalance"),etfTarget=num("m50EtfRelease");
    const capitalRelease=Math.min(capitalBalance,capitalTarget);
    const etfRelease=Math.min(etfBalance,etfTarget);
    return {paydayRelease:round(paydayBudget),capitalBalance:round(capitalBalance),capitalTarget:round(capitalTarget),capitalRelease:round(capitalRelease),etfBalance:round(etfBalance),etfTarget:round(etfTarget),etfRelease:round(etfRelease),total:round(paydayBudget+capitalRelease+etfRelease)};
  }
  function saveFunding(show=true){
    const f=fundingState(0);write(FUNDING_KEY,{capitalBalance:f.capitalBalance,capitalRelease:f.capitalTarget,etfBalance:f.etfBalance,etfRelease:f.etfTarget,updatedAt:new Date().toISOString()});
    if(show){const feedback=el("m37HandoffFeedback");if(feedback){feedback.textContent="Investment funding pools saved on this device.";feedback.className="m37-feedback good"}}
  }
  function liveSnapshot(){
    if(typeof window.m22CurrentPlan!=="function"||typeof window.m22EnsureState!=="function")return null;
    const plan=window.m22CurrentPlan(),mission=window.m22EnsureState();
    const investments=(plan?.actions||[]).filter(action=>action?.type==="investment");
    const paydayBudget=investments.reduce((sum,action)=>sum+Number(action.amount||0),0);
    const funding=fundingState(paydayBudget);
    const platform=String(plan?.inputs?.platform||mission?.inputs?.platform||"ig");
    const completed=investments.filter(action=>typeof window.m22ActionDone==="function"&&window.m22ActionDone(action)).length;
    return {plan,mission,investments,paydayBudget,budget:funding.total,funding,platform,completed};
  }
  function linkedStage(snapshot,payload){
    const decision=read(DECISION_KEY),queue=read(REGISTRATION_KEY),transferReceipt=read("aurora_transfer_centre_receipt_v1");
    if(transferReceipt&&payload&&transferReceipt.wealthMissionId===payload.id)return {label:"Transfer Centre accepted mission",state:"approved"};
    if(queue&&payload&&queue.sourceMissionId===payload.id){const items=Array.isArray(queue.items)?queue.items:[];const completed=items.filter(item=>["PURCHASED","REGISTERED","COMPLETE"].includes(String(item.status||"").toUpperCase())).length;return {label:items.length?`${completed}/${items.length} purchases complete`:"Transfer window approved",state:"approved"}}
    if(decision&&payload&&decision.wealthMissionId===payload.id)return {label:"Transfer plan ready",state:"approved"};
    if(payload)return {label:"Released to Transfer Centre",state:"sent"};
    return {label:snapshot?.budget>0?"Ready to release":"No investment move",state:"none"};
  }
  function render(){
    const snapshot=liveSnapshot();if(!snapshot||!el("m37InvestmentHandoff"))return;
    const f=snapshot.funding,payload=read(WEALTH_KEY),stage=linkedStage(snapshot,payload);
    el("m37InvestmentBudget").textContent=gbp(snapshot.budget);el("m50PaydayRelease").textContent=gbp(f.paydayRelease);el("m50CombinedMission").textContent=gbp(f.total);
    el("m50CapitalRunway").textContent=f.capitalBalance>0&&f.capitalRelease>0?`${Math.ceil(f.capitalBalance/f.capitalRelease)} monthly release${Math.ceil(f.capitalBalance/f.capitalRelease)===1?'':'s'} available`:"No existing capital available";
    el("m50EtfRunway").textContent=f.etfBalance>0&&f.etfRelease>0?`${Math.ceil(f.etfBalance/f.etfRelease)} monthly release${Math.ceil(f.etfBalance/f.etfRelease)===1?'':'s'} available`:"Waiting for sale proceeds";
    const parts=[`Payday ${gbp(f.paydayRelease)}`];if(f.capitalRelease>0)parts.push(`Existing capital ${gbp(f.capitalRelease)}`);if(f.etfRelease>0)parts.push(`ETF/share-sale pot ${gbp(f.etfRelease)}`);el("m50MissionBreakdown").textContent=parts.join(" + ");
    el("m37InvestmentAccount").textContent=accountLabel(snapshot.platform);el("m37InvestmentPayday").textContent=snapshot.mission?.paydayDate?new Date(`${snapshot.mission.paydayDate}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
    el("m37PipelineStage").textContent=stage.label;el("m37HandoffStatus").textContent=stage.label.toUpperCase();el("m37HandoffStatus").dataset.state=stage.state;
    el("m37InvestmentRoute").innerHTML=snapshot.budget>0?`<strong>Combined mission ready:</strong> ${parts.join(" • ")} • <strong>${gbp(snapshot.budget)} total</strong> will be sent to the Transfer Centre for portfolio-aware sizing.`:`<strong>No investment mission yet:</strong> Add a payday share contribution or make a capital funding pool available.`;
    const send=el("m37SendToTradingBrain");if(send){send.disabled=snapshot.budget<=0;send.textContent=snapshot.budget>0?`Release ${gbp(snapshot.budget)} to Transfer Centre`:"No Investment Allocation to Release"}
    ["m50CapitalBalance","m50CapitalRelease","m50EtfBalance","m50EtfRelease"].forEach(id=>{const node=el(id)?.closest(".m50-source");if(node)node.classList.toggle("is-empty",num(id)===0)});
  }
  function sendMission(){
    const snapshot=liveSnapshot(),feedback=el("m37HandoffFeedback");if(!snapshot||snapshot.budget<=0){if(feedback){feedback.textContent="There is no investment funding available for this mission.";feedback.className="m37-feedback risk"}return}
    saveFunding(false);const f=snapshot.funding;
    const payload={schemaVersion:2,id:`finance-${snapshot.mission.id}-${Date.now()}`,sourceMissionId:snapshot.mission.id,source:"Finance Department",generatedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),paydayDate:snapshot.mission.paydayDate,budget:Number(snapshot.budget.toFixed(2)),paydayContribution:Number(f.paydayRelease.toFixed(2)),preferredPlatform:snapshot.platform,preferredAccount:accountLabel(snapshot.platform),actualPay:Number(snapshot.plan.actual||0),expectedPay:Number(snapshot.plan.expected||0),status:"READY_FOR_TRANSFER_CENTRE",tradingMode:"income",destination:"Aurora FC Transfer Centre",fundingSources:[{id:"payday",name:"Payday share contribution",available:Number(f.paydayRelease.toFixed(2)),release:Number(f.paydayRelease.toFixed(2)),type:"income"},{id:"existing-capital",name:"Existing capital pot",available:Number(f.capitalBalance.toFixed(2)),release:Number(f.capitalRelease.toFixed(2)),type:"capital"},{id:"etf-sale",name:"ETF/share-sale pot",available:Number(f.etfBalance.toFixed(2)),release:Number(f.etfRelease.toFixed(2)),type:"sale-proceeds"}].filter(source=>source.release>0),investmentActions:snapshot.investments.map(action=>({id:action.id,name:action.name,amount:Number(action.amount||0),meta:action.meta||""}))};
    if(!write(WEALTH_KEY,payload)){if(feedback){feedback.textContent="The browser blocked the handoff save.";feedback.className="m37-feedback risk"}return}
    if(feedback){feedback.textContent=`${gbp(payload.budget)} combined mission sent to the Transfer Centre: ${payload.fundingSources.map(x=>`${x.name} ${gbp(x.release)}`).join(" • ")}.`;feedback.className="m37-feedback good"}
    try{window.dispatchEvent(new CustomEvent("aurora:wealth-mission",{detail:payload}))}catch(_){ }
    render();setTimeout(()=>{window.location.href=`AuroraCityFC_TransferCentre.html?from=finance-department&mission=${encodeURIComponent(payload.id)}&v=${Date.now()}`},180);
  }
  loadFunding();["m50CapitalBalance","m50CapitalRelease","m50EtfBalance","m50EtfRelease"].forEach(id=>el(id)?.addEventListener("input",render));el("m50SaveFunding")?.addEventListener("click",()=>{saveFunding(true);render()});el("m37SendToTradingBrain")?.addEventListener("click",sendMission);el("m37RefreshHandoff")?.addEventListener("click",render);
  window.addEventListener("storage",event=>{if([WEALTH_KEY,FUNDING_KEY,DECISION_KEY,REGISTRATION_KEY].includes(event.key))render()});window.addEventListener("aurora:trading-brain-decision",render);
  const originalRender=window.m22Render;if(typeof originalRender==="function")window.m22Render=function(){const result=originalRender.apply(this,arguments);setTimeout(render,0);return result};
  window.addEventListener("load",()=>setTimeout(render,260));if(document.readyState!=="loading")setTimeout(render,160);
})();

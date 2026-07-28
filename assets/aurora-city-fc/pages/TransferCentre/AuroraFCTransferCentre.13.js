
(() => {
  "use strict";
  document.documentElement.dataset.auroraM3Transfer = "current-file-v1";

  const q = id => document.getElementById(id);
  const num = value => {
    const match=String(value ?? "").replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);
    const parsed=match?Number(match[0]):NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const moneyM3 = value => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(Number(value)||0);
  const STORE = "aurora_m3_dynamic_transfer_budget_v1";
  const RECEIPT_STORE = "aurora_m3_last_transfer_receipt_v1";

  function readStore(){
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); }
    catch(_) { return {}; }
  }
  function writeStore(value){
    try { localStorage.setItem(STORE,JSON.stringify(value)); } catch(_) {}
  }
  function sourceTotal(){
    return ["m3RegularBudget","m3ReleasedCash","m3SaleProceeds","m3DividendCash"]
      .reduce((sum,id)=>sum + num(q(id)?.value),0);
  }
  function updateBudgetTotal(){
    if(q("m3BudgetTotal")) q("m3BudgetTotal").textContent = moneyM3(sourceTotal());
  }
  function applyBudget(){
    const total = sourceTotal();
    const dealInput = q("transferBudgetInput");
    const paydayInput = q("paydayAvailableCash");
    if(dealInput){
      dealInput.value = total.toFixed(2);
      dealInput.dispatchEvent(new Event("input",{bubbles:true}));
      dealInput.dispatchEvent(new Event("change",{bubbles:true}));
    }
    if(paydayInput){
      paydayInput.value = total.toFixed(2);
      paydayInput.dispatchEvent(new Event("change",{bubbles:true}));
    }
    writeStore({
      regular:num(q("m3RegularBudget")?.value),
      released:num(q("m3ReleasedCash")?.value),
      sales:num(q("m3SaleProceeds")?.value),
      dividends:num(q("m3DividendCash")?.value),
      total,
      updatedAt:new Date().toISOString()
    });
    updateDeck();
    q("deal-sheet")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function statusNumber(id){ return num(q(id)?.textContent); }
  function buildReceipt(){
    const budget = sourceTotal();
    const planned = statusNumber("paydayPlannedInvested");
    const actual = statusNumber("paydayActualInvested");
    const income = statusNumber("paydayActualIncome");
    const routeLines = [...document.querySelectorAll(".payday-trade-card")].map(card => {
      const name = card.querySelector("h5")?.textContent?.trim() || "Purchase";
      const result = card.querySelector(".payday-trade-result")?.textContent?.replace(/\s+/g," ").trim() || "";
      return {name,result};
    });
    const receipt = {
      completedAt:new Date().toISOString(),
      budget,planned,actual,income,
      cashRemaining:Math.max(0,budget-actual),
      routeLines
    };
    try { localStorage.setItem(RECEIPT_STORE,JSON.stringify(receipt)); } catch(_) {}
    renderReceipt(receipt);
  }
  function renderReceipt(receipt){
    const box=q("m3TransferReceipt"), meta=q("m3ReceiptMeta"), lines=q("m3ReceiptLines");
    if(!box || !meta || !lines || !receipt) return;
    meta.innerHTML = [
      ["Completed",new Date(receipt.completedAt).toLocaleString("en-GB")],
      ["Budget",moneyM3(receipt.budget)],
      ["Actual invested",moneyM3(receipt.actual)],
      ["Income added",`${moneyM3(receipt.income)}/yr`]
    ].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join("");
    lines.innerHTML = (receipt.routeLines?.length ? receipt.routeLines : [{name:"Window summary",result:`Planned ${moneyM3(receipt.planned)} • Cash left ${moneyM3(receipt.cashRemaining)}`}])
      .map(line=>`<div class="m3-receipt-line"><strong>${line.name}</strong><span>${line.result}</span></div>`).join("");
    box.classList.add("open");
  }

  function updateDeck(){
    updateBudgetTotal();
    const budget=sourceTotal();
    const routeCount=document.querySelectorAll("#finalDealSheet .deal-row, #finalDealSheet .optimiser-slip-row, #finalDealSheet .final-decision-row").length;
    const windowOpen=/open|active|ready|complete/i.test(q("paydayWindowStatus")?.textContent||"");
    const actual=statusNumber("paydayActualInvested");
    const complete=/complete/i.test(q("paydayWindowStatus")?.textContent||"");
    const current=complete?5:actual>0?4:windowOpen?3:routeCount>0?2:1;
    document.querySelectorAll("#m3TransferSteps .m3-step").forEach(step=>{
      const n=Number(step.dataset.m3Step);
      step.classList.toggle("done",n<current || complete);
      step.classList.toggle("active",n===current && !complete);
    });
    if(q("m3TransferProgress")) q("m3TransferProgress").style.width=`${complete?100:(current-1)*25}%`;

    const planned=statusNumber("paydayPlannedInvested");
    const income=statusNumber("paydayActualIncome");
    if(q("m3PlannedInvestment")) q("m3PlannedInvestment").textContent=moneyM3(planned);
    if(q("m3ActualInvestment")) q("m3ActualInvestment").textContent=moneyM3(actual);
    if(q("m3CashRemaining")) q("m3CashRemaining").textContent=moneyM3(Math.max(0,budget-actual));
    if(q("m3IncomeAdded")) q("m3IncomeAdded").textContent=`${moneyM3(income)}/yr`;
  }

  function installPresets(){
    const panel=q("income-simulator");
    if(!panel || q("m3SimulatorPresets")) return;
    const controls=panel.querySelector(".simulator-controls");
    if(!controls) return;
    const wrap=document.createElement("div");
    wrap.className="m3-sim-presets";
    wrap.id="m3SimulatorPresets";
    wrap.innerHTML=`<span class="upgrade-note">Long-range milestones:</span>${[36,60,96,120,180,252].map(month=>`<button type="button" data-m3-months="${month}">${month} months</button>`).join("")}`;
    controls.insertAdjacentElement("afterend",wrap);
    wrap.addEventListener("click",event=>{
      const button=event.target.closest("[data-m3-months]");
      if(!button) return;
      const input=q("simulationMonthsInput");
      if(input){
        input.value=button.dataset.m3Months;
        input.dispatchEvent(new Event("change",{bubbles:true}));
      }
    });
  }

  function loadSaved(){
    const saved=readStore();
    const map={
      m3RegularBudget:saved.regular ?? 1500,
      m3ReleasedCash:saved.released ?? 0,
      m3SaleProceeds:saved.sales ?? 0,
      m3DividendCash:saved.dividends ?? 0
    };
    Object.entries(map).forEach(([id,value])=>{ if(q(id)) q(id).value=value; });
    try {
      const receipt=JSON.parse(localStorage.getItem(RECEIPT_STORE)||"null");
      if(receipt) renderReceipt(receipt);
    } catch(_) {}
  }

  function init(){
    loadSaved();
    installPresets();
    ["m3RegularBudget","m3ReleasedCash","m3SaleProceeds","m3DividendCash"].forEach(id=>q(id)?.addEventListener("input",updateBudgetTotal));
    q("m3ApplyBudget")?.addEventListener("click",applyBudget);
    q("m3SaveBudget")?.addEventListener("click",()=>{
      writeStore({
        regular:num(q("m3RegularBudget")?.value),released:num(q("m3ReleasedCash")?.value),
        sales:num(q("m3SaleProceeds")?.value),dividends:num(q("m3DividendCash")?.value),
        total:sourceTotal(),updatedAt:new Date().toISOString()
      });
      updateDeck();
    });
    document.querySelectorAll("[data-m3-target]").forEach(button=>button.addEventListener("click",()=>{
      q(button.dataset.m3Target)?.scrollIntoView({behavior:"smooth",block:"start"});
    }));
    q("completePaydayWindow")?.addEventListener("click",()=>setTimeout(()=>{
      if(/complete/i.test(q("paydayWindowStatus")?.textContent||"")) buildReceipt();
      updateDeck();
    },150));
    const observer=new MutationObserver(updateDeck);
    ["paydayWindowStatus","paydayPlannedInvested","paydayActualInvested","paydayActualIncome","finalDealSheet"].forEach(id=>{
      const el=q(id); if(el) observer.observe(el,{childList:true,subtree:true,characterData:true});
    });
    updateDeck();
    window.setInterval(()=>{if(!document.hidden)updateDeck();},10000);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

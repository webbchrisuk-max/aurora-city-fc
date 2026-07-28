
/* ===================== M19 RECURRING SPEND PAYMENTS ===================== */
function m19Show(message, error=false){
  const box=document.getElementById("m19SpendStatus");
  if(!box)return;
  box.textContent=message;
  box.style.borderColor=error?"rgba(251,113,133,.30)":"rgba(52,211,153,.25)";
  box.style.background=error?"rgba(251,113,133,.07)":"rgba(52,211,153,.06)";
  box.style.color=error?"#ffc2cc":"#c7ffda";
  box.classList.add("show");
  clearTimeout(window.m19StatusTimer);
  window.m19StatusTimer=setTimeout(()=>box.classList.remove("show"),5000);
}
function m19Save(){
  if(typeof savePlannerData==="function")savePlannerData();
}
function m19PayRecurring(index){
  const cost=plannerState.recurringCosts?.[index];
  if(!cost)return;
  const amount=Math.max(0,Number(cost.payAmount||0));
  if(amount<=0){m19Show("Enter the amount actually spent before pressing Pay from Holding Pot.",true);return}
  const holding=Number(plannerState.holdingBalance||0);
  if(amount>holding){m19Show(`The Holding Pot only contains £${formatMoney(holding)}. This payment cannot be recorded yet.`,true);return}

  plannerState.holdingBalance=holding-amount;
  cost.spentThisCycle=Number(cost.spentThisCycle||0)+amount;
  cost.lastPaidDate=new Date().toISOString();
  plannerState.recurringSpendHistory=Array.isArray(plannerState.recurringSpendHistory)?plannerState.recurringSpendHistory:[];
  plannerState.recurringSpendHistory.unshift({
    id:`spend_${Date.now()}`,
    recurringId:cost.id||"",
    name:cost.name,
    category:cost.category||"Other",
    amount,
    date:cost.lastPaidDate
  });

  const holdingInput=document.getElementById("holdingBalanceInput");
  if(holdingInput)holdingInput.value=plannerState.holdingBalance.toFixed(2);
  m19Save();
  if(typeof runPlanner==="function")runPlanner();
  m19Show(`£${formatMoney(amount)} for ${cost.name} has been taken from the Holding Pot. New Holding Pot balance: £${formatMoney(plannerState.holdingBalance)}.`);
}
function m19ResetCycle(index){
  const cost=plannerState.recurringCosts?.[index];
  if(!cost)return;
  cost.spentThisCycle=0;
  cost.payAmount=Number(cost.amount||0);
  m19Save();
  if(typeof runPlanner==="function")runPlanner();
  m19Show(`${cost.name} has been reset for the new monthly/payday cycle.`);
}
document.addEventListener("click",event=>{
  const pay=event.target.closest("[data-m19-pay]");
  if(pay){m19PayRecurring(Number(pay.dataset.m19Pay));return}
  const reset=event.target.closest("[data-m19-reset]");
  if(reset)m19ResetCycle(Number(reset.dataset.m19Reset));
});

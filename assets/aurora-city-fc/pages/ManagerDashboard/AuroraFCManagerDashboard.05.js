
(() => {
  "use strict";
  document.documentElement.dataset.auroraM3Manager = "current-file-v1";
  const el=id=>document.getElementById(id);
  const parse=value=>{
    const n=Number(String(value??"").replace(/[£,%]/g,"").replace(/,/g,"").trim());
    return Number.isFinite(n)?n:NaN;
  };
  const cash=value=>Number.isFinite(value)?new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(value):"—";
  const signedPct=value=>Number.isFinite(value)?`${value>=0?"+":""}${value.toFixed(2)}%`:"—";
  const tkr=value=>String(value||"").trim().toUpperCase().replace("LON:","").replace(".L","");
  const field=(row,keys)=>{
    for(const key of keys){ if(row && row[key]!==undefined && row[key]!==null && String(row[key]).trim()!=="") return row[key]; }
    return "";
  };
  function rowTime(row){
    const raw=field(row,["date","Date","timestamp","Timestamp","updated_at","last_updated","time"]);
    if(!raw) return NaN;
    const text=String(raw).trim();
    const uk=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    const d=uk?new Date(Number(uk[3]),Number(uk[2])-1,Number(uk[1]),Number(uk[4]||12),Number(uk[5]||0)):new Date(text);
    return Number.isNaN(d.getTime())?NaN:d.getTime();
  }
  function latestRows(rows){
    if(!Array.isArray(rows)||!rows.length) return {rows:[],time:NaN};
    const times=rows.map(rowTime).filter(Number.isFinite);
    if(!times.length) return {rows,time:NaN};
    const latest=Math.max(...times);
    const day=new Date(latest).toDateString();
    return {rows:rows.filter(r=>{const tm=rowTime(r);return Number.isFinite(tm)&&new Date(tm).toDateString()===day;}),time:latest};
  }
  function holdingMap(){
    const map=new Map();
    const rows=typeof activeHoldings==="function"?activeHoldings():(state?.holdings||[]);
    rows.forEach(row=>{
      const ticker=tkr(row.ticker??row.Ticker);
      if(!ticker)return;
      const shares=parse(field(row,["shares","Shares","quantity","units"]));
      const value=typeof holdingValue==="function"?holdingValue(row):parse(field(row,["current_value","market_value","value"]));
      const income=typeof annualIncomeFromRow==="function"?annualIncomeFromRow(row):parse(field(row,["annual_dps_total","annual_income"]));
      const current=map.get(ticker)||{ticker,shares:0,value:0,income:0};
      current.shares+=Number.isFinite(shares)?shares:0;
      current.value+=Number.isFinite(value)?value:0;
      current.income+=Number.isFinite(income)?income:0;
      map.set(ticker,current);
    });
    return map;
  }
  function movementFor(row,holding){
    let pct=parse(field(row,["change_pct","Change %","change_percent","daily_change_pct","day_change_pct","price_change_pct","percent_change"]));
    const current=parse(field(row,["live_price","current_price","close","price","Current Price","Live Price"]));
    const previous=parse(field(row,["previous_close","prev_close","prior_close","Previous Close","yesterday_close"]));
    const priceChange=parse(field(row,["price_change","change","Change","day_change","absolute_change"]));
    if(!Number.isFinite(pct) && Number.isFinite(current) && Number.isFinite(previous) && previous!==0) pct=(current-previous)/previous*100;
    let pounds=parse(field(row,["value_change","portfolio_change","gain_loss","pnl","change_value","Change £","day_pnl"]));
    if(!Number.isFinite(pounds) && Number.isFinite(priceChange) && holding?.shares>0) pounds=priceChange*holding.shares;
    if(!Number.isFinite(pounds) && Number.isFinite(pct) && holding?.value>0){
      pounds=holding.value*(pct/100)/(1+(pct/100));
    }
    return {pct,pounds};
  }
  function update(){
    if(typeof state==="undefined" || !Array.isArray(state.holdings) || !state.holdings.length) return;
    const holdings=holdingMap();
    const daily=latestRows(state.dailyPriceSummary||[]);
    const moves=daily.rows.map(row=>{
      const ticker=tkr(row.ticker??row.Ticker??row.symbol);
      const holding=holdings.get(ticker);
      if(!ticker||!holding)return null;
      return {ticker,...movementFor(row,holding)};
    }).filter(Boolean).filter(x=>Number.isFinite(x.pct)||Number.isFinite(x.pounds));
    const totalPounds=moves.reduce((sum,x)=>sum+(Number.isFinite(x.pounds)?x.pounds:0),0);
    const totalValue=[...holdings.values()].reduce((sum,x)=>sum+x.value,0);
    const previous=totalValue-totalPounds;
    const totalPct=previous>0?totalPounds/previous*100:NaN;
    const ranked=[...moves].filter(x=>Number.isFinite(x.pct)).sort((a,b)=>b.pct-a.pct);
    const winner=ranked[0], loser=ranked[ranked.length-1];
    const annual=typeof portfolioAnnualIncome==="function"?portfolioAnnualIncome():[...holdings.values()].reduce((s,x)=>s+x.income,0);
    const monthly=annual/12;
    const targets=[500,625,1000,1500,2000];
    const next=targets.find(x=>monthly<x)||Math.ceil((monthly+1)/500)*500;
    const plan=typeof readTransferPlanSnapshot==="function"?readTransferPlanSnapshot():null;
    const routeCount=plan?.rows?.length||0;
    const dataAge=Number.isFinite(daily.time)?(Date.now()-daily.time)/36e5:NaN;
    const dailyLevel=!daily.rows.length?"bad":dataAge>30?"bad":dataAge>8?"warn":"ok";
    const routeLevel=routeCount>=4?"ok":routeCount?"warn":"bad";

    if(el("m3TodayMove")){
      el("m3TodayMove").textContent=Number.isFinite(totalPounds)?`${totalPounds>=0?"+":""}${cash(totalPounds)}`:"—";
      el("m3TodayMove").closest(".m3-daily-card")?.classList.toggle("red",Number.isFinite(totalPounds)&&totalPounds<0);
      el("m3TodayMove").closest(".m3-daily-card")?.classList.toggle("green",Number.isFinite(totalPounds)&&totalPounds>=0);
    }
    if(el("m3TodayMovePct")) el("m3TodayMovePct").textContent=Number.isFinite(totalPct)?`${signedPct(totalPct)} weighted session move`:"Daily price comparison unavailable";
    if(el("m3Winner")) el("m3Winner").textContent=winner?.ticker||"—";
    if(el("m3WinnerMove")) el("m3WinnerMove").textContent=winner?`${signedPct(winner.pct)} today`:"Awaiting movement";
    if(el("m3Loser")) el("m3Loser").textContent=loser?.ticker||"—";
    if(el("m3LoserMove")) el("m3LoserMove").textContent=loser?`${signedPct(loser.pct)} today`:"Awaiting movement";
    if(el("m3MonthlyIncome")) el("m3MonthlyIncome").textContent=cash(monthly);
    if(el("m3AnnualIncome")) el("m3AnnualIncome").textContent=`${cash(annual)} annual run-rate`;
    if(el("m3NextMilestone")) el("m3NextMilestone").textContent=`${cash(next)}/m`;
    if(el("m3MilestoneGap")) el("m3MilestoneGap").textContent=`${cash(Math.max(0,next-monthly))} still required`;
    if(el("m3PaydayReady")) el("m3PaydayReady").textContent=routeCount>=4?`${routeCount} deals ready`:routeCount?`${routeCount} deals building`:"Route not ready";
    if(el("m3PaydayNote")) el("m3PaydayNote").textContent=plan?.updatedAt?`Deal sheet synced ${new Date(plan.updatedAt).toLocaleString("en-GB")}`:"Open Transfer Centre to publish the final route";
    if(el("m3IncomeTargets")) el("m3IncomeTargets").innerHTML=targets.map(target=>`<span class="m3-target-chip ${monthly>=target?"hit":""}">${cash(target)}/m ${monthly>=target?"✓":""}</span>`).join("");
    if(el("m3DataLights")) el("m3DataLights").innerHTML=[
      ["ok",`Holdings ${holdings.size} active`],
      [dailyLevel,`Daily summary ${daily.rows.length?new Date(daily.time).toLocaleDateString("en-GB"):"missing"}`],
      [state.livePrices?.length?"ok":"warn",`Live prices ${state.livePrices?.length||0} rows`],
      [routeLevel,`Transfer route ${routeCount} approved`],
      [annual>0?"ok":"bad",`Dividend engine ${annual>0?"online":"waiting"}`]
    ].map(([level,text])=>`<span class="m3-data-light ${level}"><i></i>${text}</span>`).join("");

    let decisionTitle="Hold — no action required";
    let decisionText="The income plan is intact. Keep the next contribution ready and avoid reacting to a single market session.";
    if(dailyLevel==="bad"){
      decisionTitle="Refresh AuroraData before acting";
      decisionText="The daily comparison is missing or stale, so do not make a price-led decision until the sheet and GitHub export refresh.";
    }else if(routeCount>=4){
      decisionTitle="Prepare the four-share payday route";
      decisionText="The Transfer Centre has a full approved route. Confirm the real budget, execute each broker purchase, record the fills once and complete the window.";
    }else if(Number.isFinite(totalPounds)&&totalPounds<0){
      decisionTitle="Stay disciplined after a red session";
      decisionText="Today is negative, but the dividend objective has not changed. Review only if a dividend, balance sheet or investment thesis has materially changed.";
    }
    if(el("m3DecisionTitle")) el("m3DecisionTitle").textContent=decisionTitle;
    if(el("m3DecisionText")) el("m3DecisionText").textContent=decisionText;
  }
  function init(){
    update();
    const observer=new MutationObserver(update);
    const root=el("lastUpdated")||document.body;
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    window.setInterval(()=>{if(!document.hidden)update();},10000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

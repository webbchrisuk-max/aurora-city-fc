

const AURORA_MASTER_URL = "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";
let AURORA_MASTER_CACHE = null;
let state = {};

const TABS = [
  "Holdings","Watchlist","Global Watchlist","AuroraScout","Dividends","IncomeLog","AuroraTimes",
  "MoraleLog","ManagerInbox","TrainingLog","BoardConfidence","AuroraFixtures","AuroraRules","DailySummary","PriceLog","DailyPriceSummary","LivePrices"
];
const MONTHLY_TARGET = 625;
const TRANSFER_PLAN_KEY = 'aurora_transfer_plan_v2';
let syncedTransferPlan = null;
const PLATFORM_RULES = window.AURORA_PLATFORM_RULES || {TRIG:'Trade 212',FSFL:'Trade 212',UKW:'IG ISA',ARCC:'IG ISA',RGL:'Trade 212',GCP:'Trade 212',PHP:'IG ISA / Trade 212',FGEN:'IG ISA',SEQI:'Trade 212',TW:'IG ISA',OSB:'IG ISA'};

const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(n) : "—";
const money0 = n => Number.isFinite(n) ? new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n) : "—";
const pct = n => Number.isFinite(n) ? `${(n*100).toFixed(2)}%` : "—";
function parseNum(v){
  if(v === null || v === undefined) return NaN;
  if(typeof v === "number") return v;
  const s = String(v).replace(/£|,|%/g,"").trim();
  if(!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function cleanTicker(t){ return String(t || "").trim().toUpperCase(); }
function shortTicker(t){ return cleanTicker(t).replace("LON:","").replace(".L",""); }
function displayTicker(t){ return cleanTicker(t).replace("LON:","").replace(".L",""); }
function displayName(row){
  return row?.name || row?.company_name || row?.company || row?.Company || row?.Name || row?.security_name || row?.stock_name || row?.["Company Name"] || displayTicker(row?.ticker) || "—";
}
function statusText(row){ return String(row?.status || row?.Status || row?.trial_verdict || row?.Trial_Verdict || "").toLowerCase(); }
function isActiveHolding(row){
  const status = statusText(row);
  if(/sold|exit|exited|closed|removed/.test(status)) return false;
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const value = parseNum(row.current_value ?? row.market_value ?? row.value ?? row.Value);
  return (Number.isFinite(shares) && shares > 0) || (Number.isFinite(value) && value > 0);
}
function activeHoldings(){ return (state.holdings || []).filter(isActiveHolding); }
function incomePortfolioHoldings(){
  return activeHoldings().filter(row=>{
    const account = String(row.account ?? row.platform ?? row.broker ?? row.Account ?? "").trim().toUpperCase();
    return account === "IG ISA" || account === "TRADE 212" || account === "TRADING 212" || account === "TRADING 212 ISA" || account === "TRADE212 ISA";
  });
}
function annualIncomeFromRow(row){
  const directTotal = parseNum(row.annual_dps_total ?? row.Annual_DPS_Total ?? row["Annual DPS Total"]);
  if(Number.isFinite(directTotal)) return directTotal;
  const direct = parseNum(row.annual_income ?? row.income_annual ?? row.dividend_income ?? row.AnnualIncome ?? row["Annual Income"]);
  if(Number.isFinite(direct)) return direct;
  const value = parseNum(row.current_value ?? row.market_value ?? row.value ?? row.Value);
  const y = incomeRate(row);
  if(Number.isFinite(value) && Number.isFinite(y)) return value * y;
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const dps = parseNum(row.annual_dps ?? row.dps ?? row.dividend_per_share);
  if(Number.isFinite(shares) && Number.isFinite(dps)) return shares * dps;
  return 0;
}
function holdingValue(row){
  const v = parseNum(row.current_value ?? row.market_value ?? row.value ?? row.Value);
  if(Number.isFinite(v)) return v;
  const shares = parseNum(row.shares);
  const price = parseNum(row.live_price);
  return Number.isFinite(shares) && Number.isFinite(price) ? shares * price : 0;
}
function incomeRate(row){
  const total = parseNum(row.annual_dps_total);
  const value = holdingValue(row);
  if(Number.isFinite(total) && total > 0 && Number.isFinite(value) && value > 0) return total / value;
  const direct = row.yield_pct ?? row.Yield ?? row.yield ?? row.dividend_yield ?? row["Dividend Yield"];
  if(String(direct).includes("%")) return parseNum(direct) / 100;
  const directNum = parseNum(direct);
  if(Number.isFinite(directNum) && directNum > 0 && directNum < 1) return directNum;
  if(Number.isFinite(directNum) && directNum >= 1) return directNum / 100;
  const dps = parseNum(row.annual_dps ?? row.dps ?? row.dividend_per_share);
  const price = parseNum(row.live_price ?? row.price);
  if(Number.isFinite(dps) && Number.isFinite(price) && price > 0) return dps / price;
  const income500 = parseNum(row.income_from_500 ?? row["Income from £500"] ?? row.income_500);
  if(Number.isFinite(income500) && income500 > 0) return income500 / 500;
  return NaN;
}
function impact(row){ return parseNum(row.promotion_impact_score ?? row.impact ?? row.Impact); }
function buyStrength(row){ return parseNum(row.buy_strength ?? row.buy_strength_score ?? row.score ?? row.buy_score); }
function portfolioAnnualIncome(){ return activeHoldings().reduce((s,r)=>s+annualIncomeFromRow(r),0); }
function portfolioValue(){ return activeHoldings().reduce((s,r)=>s+holdingValue(r),0); }
function uniqueByTicker(rows){
  const map = new Map();
  rows.forEach(row=>{
    const t = cleanTicker(row?.ticker);
    if(!t) return;
    const current = map.get(t);
    const score = (incomeRate(row) || 0) * 1000 + (impact(row) || 0) + (buyStrength(row) || 0);
    const currentScore = current ? ((incomeRate(current) || 0) * 1000 + (impact(current) || 0) + (buyStrength(current) || 0)) : -1;
    if(!current || score > currentScore) map.set(t,row);
  });
  return [...map.values()];
}
function isCandidateOkay(row){
  const text = `${statusText(row)} ${row.trial_status || ""} ${row.trial_verdict || ""} ${row.manager_note || ""} ${row.chemistry_risk || ""}`.toLowerCase();
  if(/sold|exit|no buy|do not sign|dividend check|blocked|avoid/.test(text)) return false;
  const y = incomeRate(row);
  if(!Number.isFinite(y) || y <= 0 || y > 0.14) return false;
  return /buy|accumulate|watch|monitor|candidate|trial|hold/.test(text) || (buyStrength(row) || 0) >= 60 || (impact(row) || 0) >= 60;
}
function candidatePool(){
  return uniqueByTicker([...(state.watchlist||[]), ...(state.globalWatchlist||[]), ...(state.scout||[]), ...activeHoldings()])
    .filter(isCandidateOkay)
    .sort((a,b)=>{
      const ya = incomeRate(a), yb = incomeRate(b);
      const ia = Number.isFinite(ya) ? ya : 0;
      const ib = Number.isFinite(yb) ? yb : 0;
      return (ib*1000 + (impact(b)||0)*0.2 + (buyStrength(b)||0)*0.2) - (ia*1000 + (impact(a)||0)*0.2 + (buyStrength(a)||0)*0.2);
    });
}
function normaliseTransferPlan(raw){
  if(!raw || typeof raw !== 'object' || !Array.isArray(raw.rows)) return null;
  const rows = raw.rows.map(item=>({
    ticker:cleanTicker(item.ticker),
    displayTicker:item.displayTicker || displayTicker(item.ticker),
    name:item.name || displayTicker(item.ticker),
    account:item.account || '',
    amount:parseNum(item.amount),
    income:parseNum(item.income),
    incomeRate:parseNum(item.incomeRate),
    gateStatus:item.gateStatus || 'pass',
    gateReason:item.gateReason || ''
  })).filter(item=>item.ticker && Number.isFinite(item.amount) && item.amount > 0);
  return {
    ...raw,
    rows,
    budget:parseNum(raw.budget),
    allocated:parseNum(raw.allocated),
    holdback:parseNum(raw.holdback),
    totalIncome:parseNum(raw.totalIncome),
    updatedAt:raw.updatedAt || ''
  };
}
function readTransferPlanSnapshot(){
  if(syncedTransferPlan) return syncedTransferPlan;
  try{
    const plan = normaliseTransferPlan(JSON.parse(localStorage.getItem(TRANSFER_PLAN_KEY) || 'null'));
    if(plan) syncedTransferPlan = plan;
    return plan;
  }catch(_){ return null; }
}
function transferRouteFromPlan(plan){
  return (plan?.rows || []).map(item=>({
    row:{ticker:item.ticker,name:item.name,account:item.account},
    amount:item.amount,
    income:Number.isFinite(item.income) ? item.income : 0,
    y:Number.isFinite(item.incomeRate) ? item.incomeRate : NaN,
    gateStatus:item.gateStatus,
    gateReason:item.gateReason
  }));
}
function requestTransferPlanSync(){
  if(document.getElementById('auroraTransferSyncFrame')) return;
  const frame=document.createElement('iframe');
  frame.id='auroraTransferSyncFrame';
  frame.title='Transfer Centre deal-sheet sync';
  frame.setAttribute('aria-hidden','true');
  frame.tabIndex=-1;
  frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px;top:-9999px';
  frame.src=`AuroraCityFC_TransferCentre.html?sync=1&ts=${Date.now()}`;
  document.body.appendChild(frame);
}
window.addEventListener('message',event=>{
  if(event.origin && location.origin !== 'null' && event.origin !== location.origin) return;
  if(event.data?.type !== 'AURORA_TRANSFER_PLAN') return;
  const plan=normaliseTransferPlan(event.data.plan);
  if(!plan) return;
  syncedTransferPlan=plan;
  if(Array.isArray(state.holdings)) renderAll();
});
window.addEventListener('storage',event=>{
  if(event.key !== TRANSFER_PLAN_KEY || !event.newValue) return;
  try{
    const plan=normaliseTransferPlan(JSON.parse(event.newValue));
    if(!plan) return;
    syncedTransferPlan=plan;
    if(Array.isArray(state.holdings)) renderAll();
  }catch(_){}
});
function currentDivision(monthly){
  const ladder = [
    [5000,"Club World Champion"],[3000,"World Class Club"],[2000,"European Giant"],
    [1000,"Premier League Club"],[500,"Championship Club"],[250,"National Club"],[100,"Regional Club"],[0,"Local Club"]
  ];
  return ladder.find(([m])=>monthly>=m)?.[1] || "Local Club";
}
function divisionProgress(monthly){
  const ladder = [
    [0,"Local Club"],[100,"Regional Club"],[250,"National Club"],[500,"Championship Club"],
    [1000,"Premier League Club"],[2000,"European Giant"],[3000,"World Class Club"],[5000,"Club World Champion"]
  ];
  let current = ladder[0], next = null;
  for(let i=0;i<ladder.length;i++){
    if(monthly >= ladder[i][0]) current = ladder[i];
    if(monthly < ladder[i][0]){ next = ladder[i]; break; }
  }
  return { current, next, gap: next ? Math.max(0,next[0]-monthly) : 0 };
}
function firstFinite(row, keys){
  for(const key of keys){
    const n = parseNum(row?.[key]);
    if(Number.isFinite(n)) return n;
  }
  return NaN;
}
function rowDate(row){
  const raw = row?.date ?? row?.Date ?? row?.timestamp ?? row?.Timestamp ?? row?.created_at ?? row?.updated_at ?? row?.time;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
function dividendDateValue(raw){
  if(raw === null || raw === undefined || raw === "") return null;
  if(raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if(typeof raw === "number" && Number.isFinite(raw)){
    const d = new Date(Date.UTC(1899,11,30) + Math.round(raw) * 86400000);
    return Number.isNaN(d.getTime()) ? null : new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12);
  }
  const s = String(raw).trim();
  const uk = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(uk){
    const d = new Date(Number(uk[3]),Number(uk[2])-1,Number(uk[1]),12);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dividendAmount(row){
  return firstFinite(row,["dividend_due","estimated_payment","payment_amount","amount_due","amount","Dividend Due","Dividend Amount"]);
}
function nextDividendPayment(){
  const activeTickers = new Set(activeHoldings().map(row=>shortTicker(row.ticker)));
  const today = new Date();
  today.setHours(0,0,0,0);
  const grouped = new Map();
  (state.dividends || []).forEach(row=>{
    const ticker = shortTicker(row.ticker ?? row.Ticker ?? row.symbol ?? row.Symbol);
    if(!ticker || !activeTickers.has(ticker)) return;
    const status = String(row.status ?? row.Status ?? row.payment_stage ?? row.PaymentStage ?? "").toLowerCase();
    if(/paid|missed|cancelled|canceled|not due/.test(status)) return;
    const date = dividendDateValue(row.pay_date ?? row.payment_date ?? row.payDate ?? row["Pay Date"] ?? row.date);
    if(!date) return;
    const day = new Date(date.getFullYear(),date.getMonth(),date.getDate());
    if(day < today) return;
    const key = `${ticker}|${day.getTime()}`;
    const amount = dividendAmount(row);
    const current = grouped.get(key) || {ticker,date:day,amount:0,amountKnown:false,accounts:new Set(),status:""};
    if(Number.isFinite(amount)){ current.amount += amount; current.amountKnown = true; }
    const account = String(row.account ?? row.Account ?? "").trim();
    if(account) current.accounts.add(account);
    if(!current.status) current.status = String(row.status ?? row.payment_stage ?? "").trim();
    grouped.set(key,current);
  });
  return [...grouped.values()].sort((a,b)=>a.date-b.date || b.amount-a.amount)[0] || null;
}
function latestIncomeEvent(){
  const rows = (state.incomeLog || []).map((row,index)=>({row,index,date:rowDate(row)}));
  rows.sort((a,b)=>(b.date?.getTime()||b.index)-(a.date?.getTime()||a.index));
  for(const item of rows){
    const row=item.row;
    const change = firstFinite(row,["annual_income_change","income_change","annual_change","change","delta","income_added","added_income","Annual Income Change"]);
    if(Number.isFinite(change) && change !== 0){
      const ticker = displayTicker(row.ticker ?? row.Ticker ?? row.symbol ?? row.Symbol);
      return {change,ticker:ticker||"Latest activity",date:item.date};
    }
  }
  return null;
}
function managerSnapshotHistory(){
  try{ const rows=JSON.parse(localStorage.getItem('aurora_manager_snapshots')||'[]'); return Array.isArray(rows)?rows:[]; }catch(_){ return []; }
}
function saveManagerSnapshot(value,income){
  if(!Number.isFinite(value)||!Number.isFinite(income)) return;
  const rows=managerSnapshotHistory();
  const latest=rows[rows.length-1];
  if(!latest || Math.abs(latest.value-value)>.005 || Math.abs(latest.income-income)>.005 || Date.now()-latest.time>21600000){
    rows.push({time:Date.now(),value,income});
    localStorage.setItem('aurora_manager_snapshots',JSON.stringify(rows.slice(-40)));
  }
}
function previousClubValue(current){
  const sourceRows=[...(state.dailySummary||[]),...(state.dailyPriceSummary||[]),...(state.priceLog||[]),...(state.incomeLog||[])];
  const values=sourceRows.map((row,index)=>({
    value:firstFinite(row,["club_value","portfolio_value","total_value","market_value","closing_value","Club Value","Portfolio Value","Total Value"]),
    date:rowDate(row),index
  })).filter(x=>Number.isFinite(x.value)).sort((a,b)=>(b.date?.getTime()||b.index)-(a.date?.getTime()||a.index));
  const historical=values.find(x=>Math.abs(x.value-current)>.005);
  if(historical) return historical.value;
  const local=managerSnapshotHistory().slice().reverse().find(x=>Number.isFinite(x.value)&&Math.abs(x.value-current)>.005);
  return local?.value ?? NaN;
}
function latestDataTimestamp(){
  const rows=[...(state.dailySummary||[]),...(state.dailyPriceSummary||[]),...(state.priceLog||[]),...(state.incomeLog||[]),...(state.livePrices||[])];
  return rows.map(rowDate).filter(Boolean).sort((a,b)=>b-a)[0]||null;
}
function boardScore(monthly, value, yieldRate){
  const incomeScore = Math.min(100, Math.max(60, (monthly / MONTHLY_TARGET) * 100));
  const valueScore = value >= 100000 ? 96 : value >= 50000 ? 88 : value >= 25000 ? 80 : 72;
  const yieldScore = Number.isFinite(yieldRate) ? Math.min(96, Math.max(65, yieldRate * 1000)) : 75;
  return Math.round(incomeScore*0.45 + valueScore*0.25 + yieldScore*0.30);
}
function renderPreviewRows(rows, target, valueFn){
  const el = $(target);
  if(!el) return;
  el.innerHTML = rows.length ? rows.map((row,i)=>`
    <div class="preview-row">
      <div class="rank">${i+1}</div>
      <div><strong>${displayTicker(row.ticker)}</strong><span>${displayName(row)}</span></div>
      <div class="preview-value">${valueFn(row,i)}</div>
    </div>`).join("") : `<div class="loading">No live rows found yet.</div>`;
}
async function fetchMaster(){
  if(!AURORA_MASTER_CACHE){
    const res = await fetch(AURORA_MASTER_URL, { cache:"no-store" });
    if(!res.ok) throw new Error(`AuroraMaster failed: ${res.status}`);
    AURORA_MASTER_CACHE = await res.json();
  }
  return AURORA_MASTER_CACHE;
}
function norm(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
function readTab(master, tab){
  const wanted = norm(tab);
  function pick(obj){
    if(!obj || typeof obj !== "object") return [];
    if(Array.isArray(obj[tab])) return obj[tab];
    const k = Object.keys(obj).find(key=>norm(key)===wanted);
    return k && Array.isArray(obj[k]) ? obj[k] : [];
  }
  let rows = pick(master);
  if(rows.length) return rows;
  for(const key of ["data","tabs","sheets","feeds"]){
    rows = pick(master?.[key]);
    if(rows.length) return rows;
  }
  return [];
}
async function loadData(){
  const btn = $("refreshBtn");
  const btnLabel = btn?.querySelector("span:last-child");
  if(btn){
    btn.disabled = true;
    if(btnLabel) btnLabel.textContent = "Loading…";
    else btn.textContent = "Loading…";
  }
  try{
    const master = await fetchMaster();
    const tabs = {};
    TABS.forEach(tab => tabs[tab] = readTab(master, tab));
    state = {
      holdings:tabs.Holdings || [],
      watchlist:tabs.Watchlist || [],
      globalWatchlist:tabs["Global Watchlist"] || [],
      scout:tabs.AuroraScout || [],
      news:tabs.AuroraTimes || [],
      dividends:tabs.Dividends || [],
      incomeLog:tabs.IncomeLog || [],
      boardConfidence:tabs.BoardConfidence || [],
      moraleLog:tabs.MoraleLog || [],
      managerInbox:tabs.ManagerInbox || [],
      trainingLog:tabs.TrainingLog || [],
      dailySummary:tabs.DailySummary || [],
      priceLog:tabs.PriceLog || [],
      dailyPriceSummary:tabs.DailyPriceSummary || [],
      livePrices:tabs.LivePrices || []
    };
    renderAll();
  }catch(err){
    console.error(err);
    $("actionList").innerHTML = `<div class="loading error">${err.message || "Unable to load AuroraData."}</div>`;
  }finally{
    if(btn){
      btn.disabled = false;
      if(btnLabel) btnLabel.textContent = "Refresh Data";
      else btn.textContent = "Refresh Data";
    }
  }
}

function mediaValue(row,...keys){
  for(const key of keys){
    const value=row?.[key];
    if(value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}
function mediaYes(value){ return /^(yes|true|1|active|live)$/i.test(String(value || "").trim()); }
function mediaDateValue(row){
  const date=mediaValue(row,"Date","date");
  const time=mediaValue(row,"Time","time");
  if(!date) return 0;
  const joined=new Date(`${date} ${time || "00:00"}`);
  if(!Number.isNaN(joined.getTime())) return joined.getTime();
  const fallback=new Date(date);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}
function auroraMediaStories(){
  return (state.news || [])
    .filter(row=>{ const status=mediaValue(row,"Status","status"); return String(status).trim()==="" || mediaYes(status); })
    .filter(row=>{ const display=mediaValue(row,"Display_In_Media","display_in_media","Display In Media"); return String(display).trim()==="" || mediaYes(display); })
    .slice().sort((a,b)=>mediaDateValue(b)-mediaDateValue(a));
}

function renderAll(){
  const income = portfolioAnnualIncome();
  const monthly = income / 12;
  const value = portfolioValue();
  const yieldHoldings = incomePortfolioHoldings();
  const yieldIncome = yieldHoldings.reduce((s,r)=>s+annualIncomeFromRow(r),0);
  const yieldValue = yieldHoldings.reduce((s,r)=>s+holdingValue(r),0);
  const yieldRate = yieldValue > 0 ? yieldIncome / yieldValue : NaN;
  const gap = Math.max(0, MONTHLY_TARGET - monthly);
  const board = boardScore(monthly,value,yieldRate);
  const active = activeHoldings();
  const weakPlayers = active.filter(r=>Number.isFinite(buyStrength(r)) && buyStrength(r)<60).sort((a,b)=>buyStrength(a)-buyStrength(b));
  const mediaStories = auroraMediaStories();
  const latestMedia = mediaStories[0] || null;
  const transferPlan = readTransferPlanSnapshot();
  const route = transferRouteFromPlan(transferPlan);
  const routeIncome = Number.isFinite(transferPlan?.totalIncome) ? transferPlan.totalIncome : route.reduce((s,x)=>s+x.income,0);
  const top = route[0]?.row;
  const transferSynced = !!transferPlan;
  const newsCount = (state.news || []).length;
  const nextDividend = nextDividendPayment();

  const dataStamp=latestDataTimestamp();
  if(window.AuroraFC) AuroraFC.setFreshness('lastUpdated',AURORA_MASTER_CACHE,{prefix:'Aurora generated'});
  else $("lastUpdated").textContent = dataStamp ? `Aurora data: ${dataStamp.toLocaleString("en-GB")}` : 'Aurora generated: unavailable';
  $("tickerTime").textContent = new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  const nextDividendTickerText = nextDividend ? ` • Next dividend: ${nextDividend.ticker}${nextDividend.amountKnown ? ` ${money(nextDividend.amount)}` : ""} on ${nextDividend.date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}` : "";
  $("tickerText").textContent = route.length
    ? `Club News • Transfer Centre route ready: ${route.map(x=>displayTicker(x.row.ticker)).join(" / ")} • Estimated payday income ${money(routeIncome)}/yr${nextDividendTickerText} • Gap to £625/m: ${money(gap)}`
    : `Club News • Transfer Centre final deal sheet syncing • ${active.length} active squad players loaded${nextDividendTickerText} • Gap to £625/m: ${money(gap)}`;

  $("heroSub").textContent = `Income rebuild at ${money(monthly)} per month. Gap to the £625/month target is ${money(gap)}. ${route.length ? "Transfer Centre final deal sheet is synced." : "Transfer Centre deal sheet is syncing."}`;
  const division = divisionProgress(monthly);
  $("currentDivision").textContent = division.current[1];
  $("divisionProgress").textContent = division.next
    ? `Next: ${division.next[1]} • ${money(division.gap)}/month required`
    : "Top division reached";

  $("heroClubValue").textContent = money(value);
  const previousValue = previousClubValue(value);
  const valueChange = Number.isFinite(previousValue) ? value - previousValue : NaN;
  const valueChangePct = Number.isFinite(previousValue) && previousValue !== 0 ? valueChange / previousValue : NaN;
  const clubTrend = $("clubValueTrend");
  if(Number.isFinite(valueChange)){
    clubTrend.className = `hero-detail ${valueChange > 0 ? "positive" : valueChange < 0 ? "negative" : "neutral"}`;
    clubTrend.textContent = `${valueChange > 0 ? "▲" : valueChange < 0 ? "▼" : "•"} ${money(Math.abs(valueChange))}${Number.isFinite(valueChangePct) ? ` (${Math.abs(valueChangePct*100).toFixed(2)}%)` : ""} since previous snapshot`;
  }else{
    clubTrend.className = "hero-detail neutral";
    clubTrend.textContent = "Previous club-value snapshot not available yet";
  }

  $("heroAnnualIncome").textContent = money(income);
  const latestIncome = latestIncomeEvent();
  const incomeTrend = $("annualIncomeTrend");
  if(latestIncome){
    incomeTrend.className = `hero-detail ${latestIncome.change > 0 ? "positive" : "negative"}`;
    incomeTrend.textContent = `${latestIncome.change > 0 ? "▲" : "▼"} ${money(Math.abs(latestIncome.change))}/yr • ${latestIncome.ticker}${latestIncome.date ? ` • ${latestIncome.date.toLocaleDateString("en-GB")}` : ""}`;
  }else{
    incomeTrend.className = "hero-detail neutral";
    incomeTrend.textContent = "Latest purchase increase not recorded in IncomeLog";
  }

  if($("heroMonthlyIncome")) $("heroMonthlyIncome").textContent = money(monthly);
  $("heroTargetGap").textContent = gap > 0 ? money(gap) : "Target hit";
  const targetPct = Math.max(0,Math.min(100,(monthly / MONTHLY_TARGET) * 100));
  $("targetProgressText").textContent = gap > 0
    ? `${targetPct.toFixed(1)}% complete • ${money(gap * 12)}/year still required`
    : "100% complete • promotion target achieved";
  $("targetProgressFill").style.width = `${targetPct}%`;

  $("monthlyIncome").textContent = money(monthly);
  $("portfolioYield").textContent = Number.isFinite(yieldRate) ? `${(yieldRate*100).toFixed(2)}%` : "—";
  $("activeSquadCount").textContent = active.length;
  $("portfolioStrength").textContent = `${board}/100`;
  $("paydayBoost").textContent = route.length ? `${money(routeIncome)}/yr` : "—";
  $("paydayBoostNote").textContent = route.length ? `${route.length} signings • Transfer Centre final sheet` : "Syncing Transfer Centre deal sheet";
  if(nextDividend){
    const days = Math.max(0,Math.ceil((nextDividend.date - new Date(new Date().setHours(0,0,0,0))) / 86400000));
    $("nextDividendTicker").textContent = `${nextDividend.ticker}${nextDividend.amountKnown ? ` • ${money(nextDividend.amount)}` : ""}`;
    $("nextDividendNote").textContent = `${nextDividend.date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} • ${days === 0 ? "Due today" : `${days} day${days===1?"":"s"} away`}${nextDividend.accounts.size > 1 ? ` • ${nextDividend.accounts.size} accounts combined` : ""}`;
  }else{
    $("nextDividendTicker").textContent = "No payment loaded";
    $("nextDividendNote").textContent = "Add future pay dates to the Dividends sheet";
  }

  $("briefingStatus").textContent = board >= 88 ? "Strong" : board >= 78 ? "Stable" : "Building";
  $("briefBoard").textContent = board >= 88 ? "Strong" : board >= 78 ? "Stable" : "Watch";
  $("briefHealth").textContent = Number.isFinite(yieldRate) && yieldRate > 0.07 ? "Income-led" : "Stable";
  $("briefMorale").textContent = route.length >= 4 ? "Good" : "Monitor";
  $("briefingTitle").textContent = board >= 88 ? "Income rebuild progressing well." : "Income rebuild needs another push.";
  $("briefingText").textContent = route.length
    ? `${route.length} current Transfer Centre signings. The final deal sheet adds ${money(routeIncome)} per year. Board confidence is ${board}/100 and the next target remains £625/month.`
    : `Portfolio data is loaded, but the transfer route needs attention. Open the Transfer Centre to sync the final deal sheet before payday.`;

  const boardLabel = board >= 88 ? "Strong" : board >= 78 ? "Stable" : "Watch";
  const latestHeadline = latestMedia
    ? String(mediaValue(latestMedia,"Headline","headline"))
    : top ? `${displayTicker(top.ticker)} leads the transfer headlines` : "No major media story loaded";

  $("actionList").innerHTML = `
    <a class="action-row" href="AuroraCityFC_TransferCentre.html"><div class="action-icon">⇄</div><div><strong>Transfer Centre</strong><span>${route.length ? `${route.length} approved signings • ${route.map(x=>displayTicker(x.row.ticker)).join(" / ")}` : "Final deal sheet is still syncing"}</span></div><div class="action-value">${route.length ? `${money(routeIncome)}/yr` : "Syncing"}</div><div class="action-link-arrow">›</div></a>
    <a class="action-row" href="#schedule-panel"><div class="action-icon">💷</div><div><strong>Next Dividend</strong><span>${nextDividend ? `${nextDividend.ticker} • ${nextDividend.date.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}` : "No future payment loaded"}</span></div><div class="action-value">${nextDividend?.amountKnown ? money(nextDividend.amount) : "—"}</div><div class="action-link-arrow">›</div></a>
    <a class="action-row" href="AuroraCityFC_SquadHub.html"><div class="action-icon">♟</div><div><strong>Squad Hub</strong><span>${weakPlayers.length ? `${weakPlayers.length} player${weakPlayers.length===1?"":"s"} require development attention` : "No immediate development warning"}</span></div><div class="action-value">${weakPlayers[0] ? displayTicker(weakPlayers[0].ticker) : "All clear"}</div><div class="action-link-arrow">›</div></a>
    <a class="action-row" href="AuroraCityFC_Boardroom.html"><div class="action-icon">♜</div><div><strong>Boardroom</strong><span>Confidence and club-health review</span></div><div class="action-value">${boardLabel}</div><div class="action-link-arrow">›</div></a>
    <a class="action-row" href="AuroraCityFC_MediaCentre.html"><div class="action-icon">●</div><div><strong>Media Centre</strong><span>${latestHeadline}</span></div><div class="action-value">${mediaStories.length || newsCount}</div><div class="action-link-arrow">›</div></a>
  `;

  $("deptTransfers").textContent = route.length ? route.length : "—";
  $("deptTopTarget").textContent = top ? displayTicker(top.ticker) : "—";
  $("deptBoard").textContent = board >= 88 ? "Strong" : board >= 78 ? "Stable" : "Watch";
  $("deptRisk").textContent = Number.isFinite(yieldRate) && yieldRate > 0.08 ? "yield watch" : "normal";
  $("deptSquad").textContent = `${active.length} active`;
  $("deptCaptain").textContent = weakPlayers[0] ? displayTicker(weakPlayers[0].ticker) : "All clear";
  if($("deptTraining")) $("deptTraining").textContent = weakPlayers.length ? `${weakPlayers.length} focus` : "Clear";
  $("deptMedia").textContent = newsCount ? "Live" : "Quiet";
  $("deptNewsCount").textContent = newsCount || "0";
  $("topTransferBadge").textContent = top ? `${displayTicker(top.ticker)} leads` : "No target";
  $("squadBadge").textContent = `${active.length} active`;


  const latestHeadlineText = latestMedia
    ? String(mediaValue(latestMedia,"Headline","headline"))
    : top ? `${displayTicker(top.ticker)} leads Aurora’s transfer shortlist` : "Aurora Times is waiting for the next club story";
  const latestSummaryText = latestMedia
    ? String(mediaValue(latestMedia,"Summary","summary") || "Open the Media Centre for the full club update.")
    : top ? `${displayName(top)} currently leads the recruitment conversation.` : "The newsroom will update when a new Aurora Times item is available.";
  const latestCategory = latestMedia ? String(mediaValue(latestMedia,"Category","category") || "Club News") : "Club News";
  const latestImportance = latestMedia ? String(mediaValue(latestMedia,"Importance","importance") || "News") : "News";
  const latestDateRaw = latestMedia ? mediaValue(latestMedia,"Date","date") : "";

  $("latestMediaHeadline").textContent = latestHeadlineText;
  $("latestMediaSummary").textContent = latestSummaryText;
  $("latestMediaMeta").textContent = [latestCategory,latestDateRaw].filter(Boolean).join(" • ") || "Aurora Times";
  $("latestMediaBadge").textContent = latestImportance;
  $("latestMediaBadge").className = `badge ${/breaking/i.test(latestImportance) ? "amber" : "blue"}`;

  $("boardCommandScore").textContent = `${board}/100`;
  $("boardCommandVerdict").textContent = board >= 88 ? "The board views the income rebuild as firmly on track." : board >= 78 ? "The board remains supportive but expects steady progress." : "The board wants a stronger next phase of the rebuild.";
  $("boardFinancialHealth").textContent = Number.isFinite(yieldRate) && yieldRate > 0.07 ? "Income-led" : "Stable";
  $("boardMorale").textContent = route.length >= 4 ? "Good" : "Monitor";

  $("scheduleTransferStatus").textContent = route.length ? `${route.length} deals ready` : "Deal sheet syncing";
  $("scheduleTransferNote").textContent = route.length ? `${money(routeIncome)}/year expected from the current route.` : "Open the Transfer Centre to confirm the final route.";
  $("scheduleTargetStatus").textContent = gap > 0 ? `${money(gap)}/month required` : "Target achieved";
  $("scheduleTargetNote").textContent = gap > 0 ? `${targetPct.toFixed(1)}% of the £625/month objective completed.` : "The current monthly income objective has been reached.";
  $("scheduleDataStatus").textContent = dataStamp ? "Aurora data live" : "Timestamp unavailable";
  $("scheduleDataNote").textContent = dataStamp ? dataStamp.toLocaleString("en-GB") : "The page loaded, but no dated feed row was found.";

  $("sideSquadBadge").textContent = active.length;
  $("sideTrainingBadge").textContent = weakPlayers.length ? `${weakPlayers.length} focus` : "Clear";
  $("sideTransferBadge").textContent = transferSynced ? "Ready" : "Sync";
  $("sideTransferBadge").className = `fm-side-status ${transferSynced ? "live" : ""}`.trim();
  $("sideBoardBadge").textContent = board >= 88 ? "Strong" : board >= 78 ? "Stable" : "Watch";
  $("sideMediaBadge").textContent = mediaStories.length || newsCount || 0;

  renderPreviewRows(route.map(x=>x.row), "topTransferPreview", (row,i)=>`${money(route[i].income)}/yr`);
  const squadRows = active.slice().sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a)).slice(0,4);
  renderPreviewRows(squadRows, "squadPreview", row=>`${money(annualIncomeFromRow(row))}/yr`);
  saveManagerSnapshot(value,income);
  window.AURORA_PAGE_CHECKS=()=>[
    {level:transferSynced?'ok':'warn',title:transferSynced?'Transfer Centre final sheet synced':'Transfer Centre sync pending',detail:transferSynced?`${route.length} signings • ${money(routeIncome)}/year from the exact final deal sheet.`:'The hidden Transfer Centre sync is still loading; no fallback estimate is being shown.'},
    {level:yieldHoldings.length?'ok':'bad',title:`${yieldHoldings.length} income-portfolio rows`,detail:'Portfolio yield is restricted to IG ISA and Trade 212 holdings.'},
    {level:Number.isFinite(previousValue)?'ok':'warn',title:Number.isFinite(previousValue)?'Club-value trend source found':'Club-value trend is building',detail:Number.isFinite(previousValue)?'Historical or locally stored snapshot is available.':'A second distinct snapshot will activate the rise/fall indicator.'},
    {level:nextDividend?'ok':'warn',title:nextDividend?`Next dividend: ${nextDividend.ticker}`:'No future dividend found',detail:nextDividend?`${nextDividend.date.toLocaleDateString("en-GB")} • ${nextDividend.amountKnown?money(nextDividend.amount):"amount pending"}`:'The dashboard only shows future payments for active holdings.'}
  ];
}
$("refreshBtn")?.addEventListener("click", ()=>{ AURORA_MASTER_CACHE = null; loadData(); });
requestTransferPlanSync();
loadData();
setInterval(()=>{ if(!document.hidden&&$("tickerTime")) $("tickerTime").textContent = new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); }, 30000);

if(window.AuroraFC) AuroraFC.registerServiceWorker();

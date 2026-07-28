
/* ===================== SECTION: DATA SOURCE ===================== */
const SHEET_ID="10MdgQKc4tParno7pNkz40eBGz308wxHu1u3gvJe_WsE";
const AURORA_MASTER_URL="https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";
const HOLDINGS_URL=AURORA_MASTER_URL;
const DIVIDENDS_URL=AURORA_MASTER_URL;
const WATCHLIST_URL=AURORA_MASTER_URL;
const DAILY_PRICE_SUMMARY_URL=AURORA_MASTER_URL;
const MASTER_MONTHLY_GOAL=2000, PER_HOLDING_ANNUAL_TARGET=3000, DEFAULT_BUY_AMOUNT=500;
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TICKER_NAMES={LGEN:"LEGAL & GENERAL","LGEN.L":"LEGAL & GENERAL",MNG:"M&G PLC","MNG.L":"M&G PLC",SDLF:"STANDARD LIFE HOLDINGS","SDLF.L":"STANDARD LIFE HOLDINGS",SUPR:"SUPERMARKET INCOME REIT","SUPR.L":"SUPERMARKET INCOME REIT",FGEN:"FORESIGHT ENVIRONMENTAL INFRASTRUCTURE","FGEN.L":"FORESIGHT ENVIRONMENTAL INFRASTRUCTURE",FJGN:"FORESIGHT ENVIRONMENTAL INFRASTRUCTURE",FSFL:"FORESIGHT SOLAR FUND","FSFL.L":"FORESIGHT SOLAR FUND",PHP:"PRIMARY HEALTH PROPERTIES","PHP.L":"PRIMARY HEALTH PROPERTIES",TSCO:"TESCO PLC","TSCO.L":"TESCO PLC",VWRA:"VANGUARD FTSE ALL-WORLD","VWRA.L":"VANGUARD FTSE ALL-WORLD",IITU:"ISHARES S&P 500","IITU.L":"ISHARES S&P 500",AV:"AVIVA","AV.L":"AVIVA",NG:"NATIONAL GRID","NG.L":"NATIONAL GRID",UKW:"GREENCOAT UK WIND",TW:"TAYLOR WIMPEY",RGL:"REGIONAL REIT",TRIG:"RENEWABLES INFRASTRUCTURE GROUP"};

/* ===================== SECTION: HELPERS ===================== */
function setText(id,v){const el=document.getElementById(id);if(el)el.innerText=v}
function parseNum(v){const n=parseFloat(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:0}
function money(v,d=0){return Number(v||0).toLocaleString("en-GB",{minimumFractionDigits:d,maximumFractionDigits:d})}
function cleanTicker(t){return String(t||"").toUpperCase().replace("LON:","").replace(".L","").replace(".GB","").trim()}
function normaliseHoldingIdentity(v){
  return String(v||"")
    .toUpperCase()
    .replace(/^LON:/,"")
    .replace(/\.(L|GB)$/,"")
    .replace(/&/g,"AND")
    .replace(/\b(PLC|LTD|LIMITED|HOLDINGS?|GROUP|ORDINARY|SHARES?)\b/g," ")
    .replace(/[^A-Z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function filterDividendsToActiveHoldings(dividends,holdingsParsed){
  const activeTickers=new Set();
  const activeNames=new Set();

  (holdingsParsed||[]).forEach(h=>{
    const ticker=cleanTicker(h?.ticker);
    const name=normaliseHoldingIdentity(h?.name);
    if(ticker)activeTickers.add(ticker);
    if(name)activeNames.add(name);
  });

  return (dividends||[]).filter(row=>{
    const rawTicker=getCell(row,["ticker","Ticker","epic","EPIC","symbol","Symbol"]);
    const rawName=getCell(row,["name","Name","company","Company","holding","Holding"]);
    const ticker=cleanTicker(rawTicker);
    const name=normaliseHoldingIdentity(rawName || rawTicker);

    if(ticker && activeTickers.has(ticker))return true;
    if(name && activeNames.has(name))return true;

    // Some dividend rows use a company name in the ticker field.
    for(const activeName of activeNames){
      if(name && (name===activeName || name.includes(activeName) || activeName.includes(name)))return true;
    }
    return false;
  });
}

function getCell(row,names){const keys=Object.keys(row||{});for(const name of names){const found=keys.find(k=>k.trim().toLowerCase()===name.trim().toLowerCase());if(found)return row[found]}return ""}
function tickerName(t){const raw=String(t||"").toUpperCase().trim();const stripped=cleanTicker(raw);return TICKER_NAMES[raw]||TICKER_NAMES[stripped]||stripped||"Unknown"}
function normalisePriceForTicker(ticker,v){const n=parseNum(v);if(!Number.isFinite(n)||n<=0)return 0;const t=cleanTicker(ticker);const pence=new Set(["LGEN","MNG","SUPR","PHP","FSFL","FGEN","FJGN","TSCO","AV","NG","PHNX","SDLF","UKW","RGL","TRIG","TW"]);if(n>1000)return n/100;if(n>20&&pence.has(t))return n/100;return n}
function normaliseDpsForTicker(ticker,v){const n=parseNum(v);if(!Number.isFinite(n)||n<0)return 0;const t=cleanTicker(ticker);const pence=new Set(["LGEN","MNG","SUPR","PHP","FSFL","FGEN","FJGN","TSCO","AV","NG","PHNX","SDLF","UKW","RGL","TRIG","TW"]);if(n>2&&pence.has(t))return n/100;return n}
function formatSharePriceDisplay(ticker,price){const p=Number(price||0);if(!p||p<=0)return"--";const t=cleanTicker(ticker);const pence=new Set(["LGEN","MNG","SUPR","PHP","FSFL","FGEN","FJGN","TSCO","AV","NG","PHNX","SDLF","UKW","RGL","TRIG","TW"]);if(p<1.5||pence.has(t))return`${(p*100).toFixed(2)}p`;return`£${money(p,3)}`}
function formatSharePriceChangeDisplay(ticker,change,price){const c=Number(change||0);if(!Number.isFinite(c)||c===0)return"£0.00";const sign=c>0?"+":"";const t=cleanTicker(ticker);const pence=new Set(["LGEN","MNG","SUPR","PHP","FSFL","FGEN","FJGN","TSCO","AV","NG","PHNX","SDLF","UKW","RGL","TRIG","TW"]);if(Math.abs(Number(price||0))<1.5||pence.has(t))return`${sign}${(c*100).toFixed(2)}p`;return`${sign}£${money(c,3)}`}
function discountToFair(price,fair){return fair>0?((fair-price)/fair)*100:0}
function statusClass(v){const s=String(v||"").toUpperCase();if(s.includes("BUY"))return"buy";if(s.includes("HOLD")||s.includes("ACCUM"))return"hold";return"wait"}
function updateClock(){setText("clockBadge",new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))}setInterval(updateClock,30000);updateClock();
const AURORA_FEED_HEALTH={};
function getOfflineSnapshot(label){
  try{
    const el=document.getElementById("auroraOfflineData");
    if(!el)return null;
    const data=JSON.parse(el.textContent||"{}");
    return Array.isArray(data[label])?data[label]:null;
  }catch(e){return null}
}
async function fetchSheetJson(url,label,fallback=[]){
  try{
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok)throw new Error(`${label} ${res.status}`);
    const data=await res.json();
    const rows=Array.isArray(data)?data:(Array.isArray(data?.[label])?data[label]:[]);
    const ok=Array.isArray(rows);
    AURORA_FEED_HEALTH[label]={ok,count:ok?rows.length:0,error:ok?"Apps Script feed":"Invalid feed shape"};
    if(ok&&rows.length)return rows;
  }catch(err){
    console.warn("Aurora feed warning",label,err);
    AURORA_FEED_HEALTH[label]={ok:false,count:0,error:err?.message||String(err)};
  }
  const offline=getOfflineSnapshot(label);
  if(offline){
    AURORA_FEED_HEALTH[label]={ok:true,count:offline.length,error:"Offline snapshot fallback"};
    return offline;
  }
  return fallback;
}

function setHealthTile(id,status,meta,state="good"){
  setText(id,status);
  const metaEl=document.getElementById(`${id}Meta`);
  if(metaEl)metaEl.innerText=meta;
  const tile=document.getElementById(`${id}Tile`);
  if(tile){tile.classList.remove("good","watch","risk");tile.classList.add(state);}
}
function updateDataHealthPanel(rawHoldings,parsedHoldings,dividends,watchlist,dailyPriceSummary,auroraMaster){
  const h=AURORA_FEED_HEALTH||{};
  const feedState=(label,ids,cleanName)=>{
    const item=h[label]||{ok:false,count:0,error:"Not checked"};
    setHealthTile(ids,item.ok?"LIVE":"ERROR",item.ok?`${item.count} rows loaded from ${cleanName}`:item.error,""+(item.ok?"good":"risk"));
    return item.ok;
  };
  const okHoldings=feedState("Holdings","healthHoldings","Holdings");
  const okDividends=feedState("Dividends","healthDividends","Dividends");
  const okWatchlist=feedState("Watchlist","healthWatchlist","Watchlist");
  const okDaily=feedState("DailyPriceSummary","healthDaily","DailyPriceSummary");

  const missingPrices=(parsedHoldings||[]).filter(x=>!Number(x.price||0)).length;
  setText("healthMissingPrices",missingPrices);
  const missTile=document.getElementById("healthMissingPricesTile");
  if(missTile){missTile.classList.remove("good","watch","risk");missTile.classList.add(missingPrices===0?"good":missingPrices<=2?"watch":"risk");}

  const missingDividendDates=(dividends||[]).filter(row=>{
    const ticker=getCell(row,["ticker","Ticker","name","Name"]);
    if(!ticker)return false;
    const pay=getCell(row,["pay_date","pay date","payment_date","payment date","date","Date"]);
    const ex=getCell(row,["ex_dividend_date","ex dividend date","ex_date","ex date","ex-dividend date","ex dividend","Ex Dividend Date","Ex-Date"]);
    return !pay && !ex;
  }).length;
  setText("healthDividendDates",missingDividendDates);
  const divTile=document.getElementById("healthDividendDatesTile");
  if(divTile){divTile.classList.remove("good","watch","risk");divTile.classList.add(missingDividendDates===0?"good":missingDividendDates<=3?"watch":"risk");}

  setText("healthMaster",auroraMaster?"LIVE":"CHECK");
  const masterTile=document.getElementById("healthMaster")?.closest(".health-tile");
  if(masterTile){masterTile.classList.remove("good","watch","risk");masterTile.classList.add(auroraMaster?"good":"watch");}

  setText("healthLastSync",new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}));

  const allGood=okHoldings&&okDividends&&okWatchlist&&okDaily&&missingPrices===0;
  const badge=document.getElementById("dataHealthBadge");
  if(badge){
    badge.className=`badge ${allGood?"good":(okHoldings&&okDividends?"watch":"risk")}`;
    badge.innerText=allGood?"ALL CLEAR":(okHoldings&&okDividends?"CHECK WARNINGS":"FEED ISSUE");
  }
}

function parseDate(v){
  if(v===null||v===undefined||v==="")return null;
  const raw=String(v).trim();
  if(!raw)return null;

  // Google Sheets / OpenSheet can export real date cells as serial numbers.
  // Serial 1 = 1899-12-31 in the Sheets/Excel-style date system used here.
  // Without this, serial dates become ancient JavaScript dates and the runway only counts a few months.
  const serial=Number(raw.replace(/,/g,""));
  if(Number.isFinite(serial)&&serial>20000&&serial<80000){
    const base=new Date(Date.UTC(1899,11,30));
    const d=new Date(base.getTime()+serial*86400000);
    return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
  }

  const dmy=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if(dmy){
    const y=dmy[3].length===2?Number(`20${dmy[3]}`):Number(dmy[3]);
    const d=new Date(y,Number(dmy[2])-1,Number(dmy[1]));
    return isNaN(d)?null:d;
  }

  const ymd=raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if(ymd){
    const d=new Date(Number(ymd[1]),Number(ymd[2])-1,Number(ymd[3]));
    return isNaN(d)?null:d;
  }

  const d=new Date(raw);
  return isNaN(d)?null:d;
}
function daysAway(date){const today=new Date();today.setHours(0,0,0,0);const d=parseDate(date);if(!d||isNaN(d))return null;d.setHours(0,0,0,0);return Math.ceil((d-today)/(1000*60*60*24))}

/* ===================== SECTION: DAILY PRICE SUMMARY ===================== */
function summaryDateValue(row){const d=parseDate(getCell(row,["date","Date","summary_date","summary date","logged_date","logged date"]));return d?d.getTime():0}
function buildDailyPriceSummaryMap(rows){const map={};(rows||[]).forEach(row=>{const ticker=cleanTicker(getCell(row,["ticker","Ticker","symbol","Symbol"]));if(!ticker)return;const dateVal=summaryDateValue(row);const old=map[ticker]?summaryDateValue(map[ticker]):-1;if(!map[ticker]||dateVal>=old)map[ticker]=row});return map}
function priceSummaryForTicker(map,ticker){const clean=cleanTicker(ticker);return map[clean]||map[`${clean}.L`]||map[`${clean}.GB`]||null}
function parseDailyPriceSummary(ticker,row,shares){if(!row)return{openPrice:0,closePrice:0,changePerShare:0,changeGbp:0,changePct:0,hasSummary:false};const openPrice=normalisePriceForTicker(ticker,getCell(row,["open_price","open price","open","Open"]));const closePrice=normalisePriceForTicker(ticker,getCell(row,["close_price","close price","close","Close","price","Price","latest_price","latest price"]));let changePerShare=normalisePriceForTicker(ticker,getCell(row,["change_per_share","change per share","price_change","price change","change_price","change price"]));if(!changePerShare&&openPrice>0&&closePrice>0)changePerShare=closePrice-openPrice;const suppliedHoldingChange=parseNum(getCell(row,["holding_change_gbp","holding change gbp","value_change_gbp","value change gbp","holding_change","holding change","position_change","position change"]));const suppliedChange=parseNum(getCell(row,["change_gbp","change gbp","change £","change"]));const changeGbp=suppliedHoldingChange||(shares>0&&changePerShare?changePerShare*shares:suppliedChange);const rawPct=getCell(row,["change_pct","change pct","change percentage","change_%","change %","Change %"]);let changePct=parseNum(rawPct);if(rawPct&&!String(rawPct).includes("%")&&Math.abs(changePct)<=1)changePct*=100;if(!changePct&&openPrice>0&&closePrice>0)changePct=((closePrice-openPrice)/openPrice)*100;return{openPrice,closePrice,changePerShare,changeGbp,changePct,hasSummary:true}}

/* ===================== SECTION: SCORE ENGINES ===================== */
function scoreWatch(row){const ticker=getCell(row,["ticker","Ticker"])||"";const name=getCell(row,["name","Name"])||tickerName(ticker);const livePrice=normalisePriceForTicker(ticker,getCell(row,["live_price","live price","price"]));const annualDps=normaliseDpsForTicker(ticker,getCell(row,["annual_dps","annual dps","dps","annual dividend per share"]));const low52=normalisePriceForTicker(ticker,getCell(row,["low_52w","low 52w","low52"]));const high52=normalisePriceForTicker(ticker,getCell(row,["high_52w","high 52w","high52"]));const sheetFairValue=normalisePriceForTicker(ticker,getCell(row,["fair_value","fair value"]));const fairValue=sheetFairValue||(low52>0&&high52>low52?low52+(high52-low52)*.5:0);const sheetScore=parseNum(getCell(row,["buy_strength","buy strength","score","Score"]));const sheetStatus=getCell(row,["status","Status"]);let score=0;if(sheetScore>0){score=Math.round(Math.max(0,Math.min(100,sheetScore)))}else{if(livePrice>0&&annualDps>0){const y=(annualDps/livePrice)*100;score+=Math.min(40,y*4)}if(low52>0&&high52>low52){const pos=((livePrice-low52)/(high52-low52))*100;score+=Math.max(0,30-pos*.3)}if(fairValue>0){const discount=((fairValue-livePrice)/fairValue)*100;score+=Math.max(0,discount)}score=Math.round(Math.max(0,Math.min(100,score)))}const income500=livePrice>0?(DEFAULT_BUY_AMOUNT/livePrice)*annualDps:0;const yieldPct=livePrice>0?(annualDps/livePrice)*100:0;const discount=fairValue>0?((fairValue-livePrice)/fairValue)*100:0;return{ticker:cleanTicker(ticker),name,livePrice,annualDps,score,income500,yieldPct,fairValue,discount,status:sheetStatus||"REVIEW"}}
function isGrowthHolding(x){const t=cleanTicker(x.ticker);const role=String(x.role||"").toUpperCase();const sector=String(x.sector||"").toUpperCase();return["VWRA","VWRP","VWRL","IITU"].includes(t)||role.includes("GROWTH")||sector.includes("ETF")}
function premierStatusBoost(status){return 0}
function premierHoldingScore(x){
  /* ===================== SECTION: PREMIER LEAGUE SCORE LOCK =====================
     Locked rule: Premier League score must mirror the Holdings sheet buy_strength exactly.
     No HTML-side boosts from status, fair-value discount, yield, income, or role. */
  const sheetScore=Number(x.buyStrength||0);
  if(sheetScore>0)return Math.round(Math.max(0,Math.min(100,sheetScore)));
  return 50;
}
function annualTargetFor(x){const t=Number(x?.annualTarget||0);return t>0?t:(isGrowthHolding(x)?0:PER_HOLDING_ANNUAL_TARGET)}
function incomeProgressPct(x){const t=annualTargetFor(x);return t>0?Math.max(0,Math.min(100,(Number(x?.annual||0)/t)*100)):0}
function targetGapFor(x){const t=annualTargetFor(x);return t>0?Math.max(0,t-Number(x?.annual||0)):0}
function isBuyStatus(x){const s=String(x?.status||"").toUpperCase();return s.includes("BUY")||s.includes("ACCUM")}
function firstSheetOpportunity(rows){const active=(rows||[]).filter(x=>!isGrowthHolding(x)&&x.price>0&&x.dps>0);return active.find(x=>isBuyStatus(x)&&targetGapFor(x)>0)||active.find(x=>isBuyStatus(x))||active.find(x=>targetGapFor(x)>0)||active[0]||null}

/* ===================== SECTION: COMBINE HOLDINGS ===================== */
function combineHoldingsByTicker(rows){const map={};(rows||[]).forEach(x=>{const ticker=cleanTicker(x.ticker);if(!ticker)return;if(!map[ticker]){map[ticker]={...x,ticker,accountsSet:new Set(),sourceRows:0};}const e=map[ticker];e.accountsSet.add(String(x.account||"Account n/a").trim());e.sourceRows+=1;if(e!==x){e.shares=Number(e.shares||0)+Number(x.shares||0);e.value=Number(e.value||0)+Number(x.value||0);e.annual=Number(e.annual||0)+Number(x.annual||0);e.changeGbp=Number(e.changeGbp||0)+Number(x.changeGbp||0);e.price=e.shares>0?e.value/e.shares:(Number(e.price||0)||Number(x.price||0));e.dps=e.shares>0?e.annual/e.shares:Math.max(Number(e.dps||0),Number(x.dps||0));e.y=e.value>0?(e.annual/e.value)*100:Math.max(Number(e.y||0),Number(x.y||0));e.buyStrength=Math.max(Number(e.buyStrength||0),Number(x.buyStrength||0));e.discount=Math.max(Number(e.discount||-999),Number(x.discount||-999));e.fairValue=Number(e.fairValue||0)||Number(x.fairValue||0);e.annualTarget=Math.max(Number(e.annualTarget||0),Number(x.annualTarget||0));if(statusRank(x.status)>statusRank(e.status))e.status=x.status;e.account=[...e.accountsSet].filter(Boolean).join(" + ");e.name=e.name||x.name||tickerName(ticker)}});return Object.values(map).map(x=>({...x,combinedRows:Number(x.sourceRows||1),combinedAccounts:[...(x.accountsSet||new Set())]}))}
function statusRank(s){const u=String(s||"").toUpperCase();if(u.includes("BUY"))return 5;if(u.includes("ACCUM"))return 4;if(u.includes("HOLD"))return 3;if(u.includes("WAIT"))return 2;if(u.includes("AVOID")||u.includes("EXPENS"))return 1;return 0}

/* ===================== SECTION: RENDERERS ===================== */
function renderLeagueRows(rows,offset=0,relegation=false){const head=`<div class="league-row head"><div>#</div><div>Holding</div><div class="num">Score</div><div class="num">Income</div><div class="num">Yield</div></div>`;if(!rows.length)return`<div class="subv">No holdings available.</div>`;return head+rows.map((x,i)=>{const score=x.premierScore;const cls=relegation?"drop":score>=85?"elite":score>=70?"ready":"";const accountMeta=Number(x.combinedRows||1)>1?` • ${Number(x.combinedRows||1)} accounts combined`:"";return`<div class="league-row ${cls}"><div class="league-pos">#${offset+i+1}</div><div><div class="league-name" title="${x.name}">${x.name}</div><div class="league-meta">${x.ticker} • ${x.status||"HOLD"}${accountMeta}</div></div><div class="num">${score}</div><div class="num">£${money(x.annual,0)}</div><div class="num">${Number(x.y||0).toFixed(2)}%</div></div>`}).join("")}
function renderPromotionRows(rows,offset=0){
  const head=`<div class="league-row head"><div>#</div><div>Challenger</div><div class="num">Score</div><div class="num">Yield Score</div><div class="num">Yield</div></div>`;
  if(!rows.length)return`<div class="subv">No watchlist challengers available.</div>`;
  return head+rows.slice(0,5).map((w,i)=>{
    const score=Number(w.premierScore??w.score??0);
    const yieldScore=Number(w.yieldScore??w.income500??0);
    const y=Number(w.y??w.yieldPct??0);
    const cls=score>=80?"elite":score>=70?"ready":"";
    return`<div class="league-row ${cls}"><div class="league-pos">#${offset+i+1}</div><div><div class="league-name" title="${w.name}">${w.name}</div><div class="league-meta">${w.ticker} • WATCHLIST PROMOTION</div></div><div class="num">${score}</div><div class="num">${Math.round(yieldScore)}</div><div class="num">${y.toFixed(2)}%</div></div>`
  }).join("")
}
function renderMixedLeagueRows(rows,offset=0){
  const head=`<div class="league-row head"><div>#</div><div>Stock</div><div class="num">Score</div><div class="num">Income / Yield Score</div><div class="num">Yield</div></div>`;
  if(!rows.length)return`<div class="subv">No mid-table stocks available.</div>`;
  return head+rows.map((x,i)=>{
    const score=Number(x.premierScore??x.score??0);
    const isWatch=String(x.leagueSource||"").toUpperCase()==="WATCHLIST";
    const cls=score>=85?"elite":score>=70?"ready":"";
    const accountMeta=!isWatch&&Number(x.combinedRows||1)>1?` • ${Number(x.combinedRows||1)} accounts combined`:"";
    const middle=isWatch?`${Math.round(Number(x.yieldScore??x.income500??0))}`:`£${money(Number(x.annual||0),0)}`;
    const meta=isWatch?`${x.ticker} • WATCHLIST`:`${x.ticker} • ${x.status||"HOLD"}${accountMeta}`;
    const y=Number(x.y??x.yieldPct??0);
    return`<div class="league-row ${cls}"><div class="league-pos">#${offset+i+1}</div><div><div class="league-name" title="${x.name}">${x.name}</div><div class="league-meta">${meta}</div></div><div class="num">${score}</div><div class="num">${middle}</div><div class="num">${y.toFixed(2)}%</div></div>`
  }).join("")
}
function updatePremierLeague(holdings,watchRows){
  /* ===================== SECTION: PREMIER LEAGUE LOCKED LOGIC =====================
     1-4   Champions League       = Top 4 HOLDINGS by buy_strength
     5-9   Promotion Challengers  = Top 5 WATCHLIST rows only
     10-14 Mid-table              = Best 5 remaining mixed Holdings + Watchlist
     15-17 Relegation Watch       = Bottom 3 HOLDINGS by buy_strength
     Dividend runway/date logic is not touched here. */
  const league=combineHoldingsByTicker(holdings)
    .filter(x=>x.ticker&&(x.shares>0||x.value>0||x.annual>0))
    .map(x=>({...x,premierScore:premierHoldingScore(x),leagueSource:"HOLDING",leagueKey:cleanTicker(x.ticker)}))
    .sort((a,b)=>b.premierScore-a.premierScore||b.annual-a.annual||b.value-a.value);

  const watchLeague=(watchRows||[])
    .filter(x=>x&&x.ticker)
    .map(x=>({
      ticker:cleanTicker(x.ticker),
      name:x.name||tickerName(x.ticker),
      status:"WATCHLIST",
      premierScore:Number(x.score||0),
      yieldScore:Number(x.income500||0),
      annual:0,
      y:Number(x.yieldPct||0),
      value:0,
      combinedRows:0,
      leagueSource:"WATCHLIST",
      leagueKey:cleanTicker(x.ticker)
    }))
    .sort((a,b)=>b.premierScore-a.premierScore||b.yieldScore-a.yieldScore);

  const topFour=league.slice(0,4);
  const promotionRows=watchLeague.slice(0,5);
  const bottomThree=league.length>3?[...league].sort((a,b)=>a.premierScore-b.premierScore||a.annual-b.annual).slice(0,3):[];

  const usedHoldings=new Set([...topFour,...bottomThree].map(x=>cleanTicker(x.ticker)));
  const usedWatch=new Set(promotionRows.map(x=>cleanTicker(x.ticker)));

  const remainingHoldings=league.filter(x=>!usedHoldings.has(cleanTicker(x.ticker)));
  const remainingWatch=watchLeague.filter(x=>!usedWatch.has(cleanTicker(x.ticker)));
  const midTable=[...remainingHoldings,...remainingWatch]
    .sort((a,b)=>b.premierScore-a.premierScore||b.annual-a.annual||b.value-a.value)
    .slice(0,5);

  document.getElementById("premierTopFour").innerHTML=renderLeagueRows(topFour,0,false);
  document.getElementById("premierPromotion").innerHTML=renderPromotionRows(promotionRows,4);
  document.getElementById("premierMidTable").innerHTML=renderMixedLeagueRows(midTable,9);
  document.getElementById("premierRelegation").innerHTML=renderLeagueRows(bottomThree,14,true);

  const strongest=promotionRows[0]||watchLeague[0];
  const weakest=bottomThree[0]||league[league.length-1];
  const box=document.getElementById("premierTransferPressure");
  if(strongest&&weakest){
    const gap=Number(strongest.premierScore||0)-Number(weakest.premierScore||0);
    box.innerHTML=`<span class="cyan">Transfer Pressure:</span> ${strongest.name} is the top watchlist promotion challenger (${strongest.premierScore}) and is ${gap>=0?"+":""}${gap} pts vs ${weakest.name} (${weakest.premierScore}). Promotion is watchlist-only; relegation is holdings-only.`;
  }else box.innerHTML="Transfer Pressure: Waiting for holdings and watchlist data.";
  setText("premierLeagueBadge",`${topFour.length+promotionRows.length+midTable.length+bottomThree.length}/17 SLOTS`);
}

function renderDiscounts(rows){
  const combined=combineHoldingsByTicker(rows||[]).map(x=>{
    const discount=discountToFair(Number(x.price||0),Number(x.fairValue||0));
    return {...x,discount};
  });
  const list=combined.filter(x=>Number.isFinite(x.discount)&&x.discount>0&&x.fairValue>0).sort((a,b)=>b.discount-a.discount).slice(0,8);
  const max=Math.max(1,...list.map(x=>x.discount));
  document.getElementById("discountList").innerHTML=list.length?list.map(x=>`<div class="discount-row"><div><div class="discount-name" title="${x.name}">${x.name}</div><div class="subv">${x.ticker}${x.combinedRows>1?` • ${x.combinedRows} accounts combined`:""} • fair ${formatSharePriceDisplay(x.ticker,x.fairValue)}</div></div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,(x.discount/max)*100)}%"></div></div><div class="bar-num">+${x.discount.toFixed(1)}%</div></div>`).join(""):`<div class="subv">No positive fair-value discounts found.</div>`
}
function groupHolding(x){const ticker=String(x.ticker||"").toUpperCase();const name=String(x.name||"").toUpperCase();const account=String(x.account||"").toUpperCase();const role=String(x.role||"").toUpperCase();if(ticker.includes("TSCO")||name.includes("TESCO")||account.includes("TESCO"))return"Tesco Share Account";if(ticker.includes("VWRA")||ticker.includes("VWR")||ticker.includes("IITU")||name.includes("VANGUARD")||name.includes("ISHARES")||role.includes("GROWTH"))return"ETF Growth Engine";if(account.includes("TRADE")||account.includes("T212")||account.includes("212"))return"Trade212 Holdings";if(account.includes("IG"))return"IG ISA Income Pillars";return"Other Holdings"}
function renderHoldingsTable(rows){const groupOrder=["IG ISA Income Pillars","Trade212 Holdings","ETF Growth Engine","Tesco Share Account","Other Holdings"];const grouped=Object.fromEntries(groupOrder.map(g=>[g,[]]));rows.forEach(x=>{const g=groupHolding(x);if(!grouped[g])grouped[g]=[];grouped[g].push(x)});const header=`<div class="holding-row head"><div>Holding</div><div class="holding-value">Live Price</div><div class="holding-value">Price Chg</div><div class="holding-value">Value</div><div class="holding-value">Value Chg</div><div class="holding-value">Income</div><div class="holding-value">Yield</div><div class="holding-value">Fair Value</div><div class="holding-value">Status</div><div class="holding-value">Strength</div></div>`;document.getElementById("holdingsTable").innerHTML=groupOrder.map(groupName=>{const items=(grouped[groupName]||[]).sort((a,b)=>b.value-a.value);if(!items.length)return"";const groupValue=items.reduce((s,x)=>s+x.value,0);const groupIncome=items.reduce((s,x)=>s+x.annual,0);return`<div class="holding-group"><div class="holding-group-title">${groupName}</div><div class="holding-group-meta">${items.length} holdings • £${money(groupValue,0)} value • £${money(groupIncome,0)}/yr income</div></div>${header}${items.map(renderHoldingRow).join("")}`}).join("")}
function renderHoldingRow(x){const valueCls=x.changeGbp>0?"good":x.changeGbp<0?"risk":"subv";const priceCls=x.priceSummary.changePerShare>0?"good":x.priceSummary.changePerShare<0?"risk":"subv";const rowCls=x.changeGbp>0?"positive-row":x.changeGbp<0?"negative-row":"";const sign=x.changeGbp>0?"+":"";const pctSign=x.changePct>0?"+":"";const fair=x.fairValue>0?`${formatSharePriceDisplay(x.ticker,x.fairValue)}<div class="holding-meta ${x.discount>=0?'good':'risk'}">${x.discount>=0?'+':''}${x.discount.toFixed(1)}%</div>`:`<span class="subv">N/A</span>`;const pill=statusClass(x.status);return`<div class="holding-row ${rowCls}"><div><div class="holding-name" title="${x.name}">${x.name}</div><div class="holding-meta">${x.ticker} • ${x.account||"Account n/a"} • ${x.role||"Role n/a"}</div></div><div class="holding-value">${formatSharePriceDisplay(x.ticker,x.price)}<div class="holding-meta">Live price</div></div><div class="holding-value ${priceCls}">${formatSharePriceChangeDisplay(x.ticker,x.priceSummary.changePerShare,x.price)}<div class="holding-meta ${priceCls}">${x.priceSummary.hasSummary?`${pctSign}${x.changePct.toFixed(2)}%`:"No daily log"}</div></div><div class="holding-value">£${money(x.value,0)}<div class="holding-meta">${x.shares.toFixed(4)} sh</div></div><div class="holding-value ${valueCls}">${sign}£${money(x.changeGbp,2)}<div class="holding-meta ${valueCls}">Value change</div></div><div class="holding-value">£${money(x.annual,0)}<div class="holding-meta">${x.annualTarget>0?`Target £${money(x.annualTarget,0)}`:x.role||"—"}</div></div><div class="holding-value">${x.y.toFixed(2)}%<div class="holding-meta">DPS ${formatSharePriceDisplay(x.ticker,x.dps)}</div></div><div class="holding-value">${fair}</div><div class="holding-value"><span class="pill ${pill}">${x.status||"HOLD"}</span><div class="holding-meta">${x.sector||"Sector n/a"}</div></div><div class="holding-value"><span class="pill ${Number(x.buyStrength)>=70?'buy':'wait'}">${money(x.buyStrength,0)}</span><div class="holding-meta">/100</div></div></div>`}
function renderRoadmap(currentMonthly){const targets=[{year:2026,min:250,target:"£250–£350/month"},{year:2027,min:350,target:"£350–£500/month"},{year:2028,min:500,target:"£500–£700/month"},{year:2029,min:800,target:"£800–£1,100/month"},{year:2030,min:1150,target:"£1,150–£1,400/month"},{year:2031,min:1400,target:"£1,400–£1,600/month"},{year:2032,min:1600,target:"£1,600–£1,800/month"},{year:2033,min:2000,target:"£2,000/month"}];document.getElementById("roadmapRows").innerHTML=targets.map(t=>{const pct=Math.min(100,(currentMonthly/t.min)*100);let status="Needs Build",cls="risk";if(currentMonthly>=t.min){status="Ahead / Achieved";cls="good"}else if(currentMonthly>=t.min*.75){status="On Track";cls="watch"}const gap=Math.max(0,t.min-currentMonthly);return`<div class="roadmap-row"><div><div class="roadmap-year">${t.year}</div><div class="subv">${t.target}</div></div><div class="road-track"><div class="road-fill" style="width:${pct}%"></div></div><div class="road-status ${cls}">${status}</div><div class="road-extra">${gap>0?`£${money(gap,0)}/m gap`:"Target hit"}</div></div>`}).join("")}
function updateNextDividendPanel(dividends){const today=new Date();today.setHours(0,0,0,0);const rows=(dividends||[]).map(row=>{const payDate=getCell(row,["pay_date","pay date","payment_date","payment date","date","Date"]);const amount=parseNum(getCell(row,["dividend_due","dividend due"]))||parseNum(getCell(row,["dividend_received","dividend received"]))||parseNum(getCell(row,["total_dividend","total dividend","amount","Amount"]));const ticker=getCell(row,["ticker","Ticker"])||getCell(row,["name","Name"])||"--";const status=getCell(row,["status","Status"])||"Scheduled";const d=parseDate(payDate);return{payDate,amount,ticker,status,d,days:daysAway(payDate)}}).filter(x=>x.d&&!isNaN(x.d)&&x.d>=today&&x.amount>0).sort((a,b)=>a.d-b.d);const next=rows[0];if(!next){setText("nextDividendHolding","No upcoming dividend");setText("nextDividendDate","No future pay_date found");setText("nextDividendAmount","--");setText("nextDividendStatus","--");setText("nextDividendDays","--");setText("nextDividendBadge","NONE FOUND");setText("actionNextDividend","None found");setText("actionNextDividendMeta","Check Dividends tab");setText("nextCashMini","--");return}setText("nextDividendHolding",tickerName(next.ticker));setText("nextDividendDate",next.d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}));setText("nextDividendAmount",`£${money(next.amount,2)}`);setText("nextDividendStatus",next.status);setText("nextDividendDays",next.days===0?"Today":`${next.days} days`);setText("nextDividendBadge","NEXT CASH");setText("actionNextDividend",tickerName(next.ticker));setText("actionNextDividendMeta",`£${money(next.amount,2)} • ${next.days===0?"Today":`${next.days} days`}`);setText("nextCashMini",`£${money(next.amount,2)}`)}
function nextExDividendFromRows(dividends){
  const today=new Date();
  today.setHours(0,0,0,0);
  return (dividends||[])
    .map(row=>{
      const exDate=getCell(row,["ex_dividend_date","ex dividend date","ex_date","ex date","ex-dividend date","ex dividend","Ex Dividend Date","Ex-Date"]);
      const amount=parseNum(getCell(row,["dividend_due","dividend due"]))||parseNum(getCell(row,["dividend_received","dividend received"]))||parseNum(getCell(row,["total_dividend","total dividend","amount","Amount"]));
      const ticker=getCell(row,["ticker","Ticker"])||getCell(row,["name","Name"])||"--";
      const d=parseDate(exDate);
      return {d,amount,ticker};
    })
    .filter(x=>x.d&&!isNaN(x.d)&&x.d>=today)
    .sort((a,b)=>a.d-b.d)[0] || null;
}
function renderRunway(dividends){const now=new Date();const year=now.getFullYear();const byMonth=Array.from({length:12},()=>({amount:0,count:0,next:null}));(dividends||[]).forEach(row=>{const pay=getCell(row,["pay_date","pay date","payment_date","payment date","date","Date"]);const amount=parseNum(getCell(row,["dividend_due","dividend due"]))||parseNum(getCell(row,["dividend_received","dividend received"]))||parseNum(getCell(row,["total_dividend","total dividend","amount","Amount"]));if(!pay||amount<=0)return;const d=parseDate(pay);if(!d||isNaN(d)||d.getFullYear()!==year)return;const m=byMonth[d.getMonth()];m.amount+=amount;m.count++;if(!m.next||d<m.next.d)m.next={d,ticker:getCell(row,["ticker","Ticker"])||"--",amount}});const max=Math.max(...byMonth.map(m=>m.amount),1);document.getElementById("dividendRunway").innerHTML=byMonth.map((m,i)=>{const cls=m.amount<=0?"":m.amount<max*.35?"weak":"covered";return `<div class="month-tile ${cls}"><div class="month-name">${MONTHS[i]}</div><div class="month-cash">£${money(m.amount,0)}</div><div class="month-count">${m.count?`${m.count} payment${m.count>1?"s":""}`:"No cash scheduled"}</div></div>`}).join("");const covered=byMonth.filter(m=>m.amount>0).length;setText("coveredMonths",`${covered}/12`);setText("incomeMonths",`${covered}/12`);setText("gapCount",`${12-covered}`);setText("gapMeta",`${12-covered} income gaps`);setText("runwayBadge",`${covered}/12 COVERED`);const best=byMonth.map((m,i)=>({...m,i})).sort((a,b)=>b.amount-a.amount)[0];const weakest=byMonth.map((m,i)=>({...m,i})).sort((a,b)=>a.amount-b.amount)[0];setText("bestMonth",MONTHS[best.i]);setText("bestMonthMeta",`£${money(best.amount,2)} expected`);setText("weakestMonth",MONTHS[weakest.i]);setText("weakestMonthMeta",weakest.amount>0?`£${money(weakest.amount,2)} expected`:"No scheduled cash");const nextEx=nextExDividendFromRows(dividends);if(nextEx){const days=daysAway(nextEx.d);setText("nextDividend",tickerName(nextEx.ticker));setText("nextDividendMeta",`Ex-div ${nextEx.d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}${days===0?" • Today":days>0?` • ${days} days`:""}`)}else{setText("nextDividend","None");setText("nextDividendMeta","No future ex-div date found")}}

/* ===================== SECTION: MAIN ENGINE ===================== */
async function runNexus(){try{setText("syncBadge","SYNCING");const[holdings,dividends,watchlist,dailyPriceSummary,auroraMaster]=await Promise.all([fetchSheetJson(HOLDINGS_URL,"Holdings"),fetchSheetJson(DIVIDENDS_URL,"Dividends"),fetchSheetJson(WATCHLIST_URL,"Watchlist"),fetchSheetJson(DAILY_PRICE_SUMMARY_URL,"DailyPriceSummary"),fetch(AURORA_MASTER_URL,{cache:"no-store"}).then(r=>r.json()).catch(()=>({offline_snapshot:true}))]);const map=buildDailyPriceSummaryMap(dailyPriceSummary);const holdingsParsed=holdings.map(row=>{const ticker=getCell(row,["ticker","Ticker"]);const name=getCell(row,["name","Name"])||tickerName(ticker);const shares=parseNum(getCell(row,["shares","Shares"]));const ps=parseDailyPriceSummary(ticker,priceSummaryForTicker(map,ticker),shares);const sheetPrice=normalisePriceForTicker(ticker,getCell(row,["live_price","live price","price"]));const price=sheetPrice||ps.closePrice;const dps=normaliseDpsForTicker(ticker,getCell(row,["annual dividend per share","annual_dividend_per_share","annual_dps","dps"]));const annualSheet=parseNum(getCell(row,["annual_dps_total","annual dps total","annual_dividend_total","annual dividend total"]));const role=getCell(row,["role","Role"]);const sector=getCell(row,["sector","Sector"]);const account=getCell(row,["account","Account"]);const fairValue=normalisePriceForTicker(ticker,getCell(row,["fair_value","fair value"]));const status=getCell(row,["status","Status"]);const buyStrength=parseNum(getCell(row,["buy_strength","buy strength"]));const annualTarget=parseNum(getCell(row,["annual_target","annual target","annual_income_target","annual income target"]));const value=shares*price;const annual=annualSheet>0?annualSheet:shares*dps;const y=price>0?(dps/price)*100:0;const discount=discountToFair(price,fairValue);return{ticker:cleanTicker(ticker),name,shares,price,dps,value,annual,y,changeGbp:ps.changeGbp,changePct:ps.changePct,role,sector,account,fairValue,status,buyStrength,annualTarget,discount,priceSummary:ps}}).filter(x=>x.ticker&&(x.shares>0||x.value>0||x.annual>0));const activeDividends=filterDividendsToActiveHoldings(dividends,holdingsParsed);updateDataHealthPanel(holdings,holdingsParsed,activeDividends,watchlist,dailyPriceSummary,auroraMaster);const portfolioValue=holdingsParsed.reduce((s,x)=>s+x.value,0);const annualIncome=holdingsParsed.reduce((s,x)=>s+x.annual,0);const monthlyIncome=annualIncome/12;const missionPct=Math.min(100,(monthlyIncome/MASTER_MONTHLY_GOAL)*100);setText("portfolioValue",money(portfolioValue,0));setText("annualIncome",money(annualIncome,0));setText("monthlyIncome",money(monthlyIncome,0));setText("missionPct",`${missionPct.toFixed(1)}%`);setText("holdingCount",`${holdingsParsed.length} HOLDINGS`);const watchRows=watchlist.map(scoreWatch).filter(x=>x.ticker&&x.livePrice>0).sort((a,b)=>b.score-a.score);const bestWatch=watchRows[0];const withIncome=holdingsParsed.map(x=>({...x,income500:x.price>0?(DEFAULT_BUY_AMOUNT/x.price)*x.dps:0}));const bestCore=withIncome.filter(x=>!isGrowthHolding(x)&&x.income500>0).sort((a,b)=>b.income500-a.income500||(b.buyStrength||0)-(a.buyStrength||0))[0]||firstSheetOpportunity(withIncome);if(bestWatch){setText("topWatchScore",`${bestWatch.score}/100`);setText("topWatchName",bestWatch.name);setText("bestWatch",bestWatch.name);setText("bestWatchMeta",`Score ${bestWatch.score} • £${bestWatch.income500.toFixed(2)}/yr from £500`)}if(bestCore){setText("bestCore",bestCore.name);setText("bestCoreMeta",`${bestCore.status||"HOLD"} • income route • £${bestCore.income500.toFixed(2)}/yr from £${DEFAULT_BUY_AMOUNT} • ${incomeProgressPct(bestCore).toFixed(1)}% target`)}const useWatch=bestWatch&&bestCore&&bestWatch.income500>bestCore.income500;const winner=useWatch?bestWatch:bestCore;const winnerIncome=useWatch?bestWatch.income500:(bestCore?.income500||0);setText("winnerName",winner?.name||"--");setText("winnerMeta",useWatch?`Watchlist creates stronger income from £${DEFAULT_BUY_AMOUNT}`:`Core creates stronger income from £${DEFAULT_BUY_AMOUNT}`);setText("nextBuy",winner?.name||"--");setText("nextBuyIncome",`£${winnerIncome.toFixed(2)}`);setText("watchPressure",bestWatch?`${bestWatch.score}/100`:"--");setText("commandDecision",useWatch?"Review Watchlist":"Core Route");setText("commandReason",useWatch?`${bestWatch.name} is pressuring the core with £${bestWatch.income500.toFixed(2)}/yr from £${DEFAULT_BUY_AMOUNT}.`:`${bestCore?.name||"Core"} is the stronger active holding income route and would add £${(bestCore?.income500||0).toFixed(2)}/yr from £${DEFAULT_BUY_AMOUNT}.`);setText("commandRoute",useWatch?"WATCHLIST EDGE":"CORE EDGE");setText("tradeSignal",useWatch?"WATCHLIST":"CORE");document.getElementById("tradeConfidence").style.width=`${Math.max(8,Math.min(100,useWatch?bestWatch.score:65))}%`;setText("tradeComment",useWatch?"Promotion candidate spotted. Review role, risk and persistence before buying.":"Core income route is stronger than the watchlist candidate right now; watchlist remains a promotion league, not the income winner.");updateTodayActionDeck(holdingsParsed,bestWatch,bestCore,monthlyIncome);updatePremierLeague(holdingsParsed,watchRows);renderDiscounts(holdingsParsed);renderHoldingsTable(holdingsParsed);updateNextDividendPanel(activeDividends);renderRunway(activeDividends);renderRoadmap(monthlyIncome);setText("syncBadge","LIVE")}catch(err){console.error(err);setText("syncBadge","ERROR");setText("dataHealthBadge","SCRIPT ERROR");const dh=document.getElementById("dataHealthBadge");if(dh)dh.className="badge risk";setText("commandDecision","Check Logic");setText("commandReason",`Aurora hit a script issue: ${err?.message||err}.`)}}
function updateTodayActionDeck(holdingsParsed,bestWatch,bestCore,monthlyIncome){const active=(holdingsParsed||[]).filter(x=>x.shares>0||x.value>0||x.annual>0).map(x=>({...x,income500:x.price>0&&x.dps>0?(DEFAULT_BUY_AMOUNT/x.price)*x.dps:0}));const combinedActive=combineHoldingsByTicker(active).map(x=>{const discount=discountToFair(Number(x.price||0),Number(x.fairValue||0));return {...x,discount,income500:x.price>0&&x.dps>0?(DEFAULT_BUY_AMOUNT/x.price)*x.dps:0}});const incomeCandidates=active.filter(x=>!isGrowthHolding(x)&&x.dps>0&&x.income500>0).sort((a,b)=>b.income500-a.income500||(b.buyStrength||0)-(a.buyStrength||0));const sheetOrderBuy=firstSheetOpportunity(active);const growthCandidates=active.filter(isGrowthHolding).sort((a,b)=>(b.buyStrength||0)-(a.buyStrength||0)||b.discount-a.discount);const undervalued=combinedActive.filter(x=>x.fairValue>0).sort((a,b)=>b.discount-a.discount)[0];const bestIncome=incomeCandidates[0]||sheetOrderBuy;const bestGrowth=growthCandidates[0];if(bestIncome){setText("bestIncomeBuy",bestIncome.name);setText("bestIncomeMeta",`${bestIncome.status||"HOLD"} • income winner • +£${bestIncome.income500.toFixed(2)}/yr from £${DEFAULT_BUY_AMOUNT} • ${incomeProgressPct(bestIncome).toFixed(1)}% target`)}if(bestGrowth){setText("bestGrowthBuy",bestGrowth.name);setText("bestGrowthMeta",`${money(bestGrowth.buyStrength,0)}/100 • ${bestGrowth.status||"HOLD"} • ${bestGrowth.discount>=0?"+":""}${bestGrowth.discount.toFixed(1)}% FV`)}if(undervalued){setText("mostUndervalued",undervalued.name);setText("mostUndervaluedMeta",`${undervalued.discount>=0?"+":""}${undervalued.discount.toFixed(1)}% to fair value${undervalued.combinedRows>1?` • ${undervalued.combinedRows} accounts combined`:""}`)}let main="Hold Discipline",badge="HOLD FIRE",note="Most income pillars are not screaming buy. Keep the ISA engine disciplined and avoid chasing green candles.";if(sheetOrderBuy&&sheetOrderBuy.buyStrength>=85){main=sheetOrderBuy.name;badge="VALUE SIGNAL";note=`${sheetOrderBuy.name} has the strongest buy-strength/value signal at ${money(sheetOrderBuy.buyStrength,0)}/100. Income winner remains ${bestIncome?.name||"--"} at +£${(bestIncome?.income500||0).toFixed(2)}/year from £${DEFAULT_BUY_AMOUNT}.`}else if(bestIncome&&(bestIncome.buyStrength>=75||String(bestIncome.status||"").toUpperCase().includes("ACCUM"))){main=bestIncome.name;badge="INCOME MOVE";note=`${bestIncome.name} is the cleanest income candidate today: ${bestIncome.status}, yield ${bestIncome.y.toFixed(2)}%, +£${bestIncome.income500.toFixed(2)}/year from £${DEFAULT_BUY_AMOUNT}.`}setText("todayActionMain",main);setText("todayActionBadge",badge);setText("todayActionNote",note)}

/* ===================== SECTION: LOGIN + STARTUP ===================== */
const AURORA_ACCESS_CODE=atob("V0UwOUJCWTE5ODI=").trim().toUpperCase();const AURORA_SESSION_KEY="aurora_hq_unlocked";let failedAuroraAttempts=0;function safeGetSession(){try{return localStorage.getItem(AURORA_SESSION_KEY)==="yes"}catch(e){return false}}function safeSetSession(){try{localStorage.setItem(AURORA_SESSION_KEY,"yes")}catch(e){}}function safeClearSession(){try{localStorage.removeItem(AURORA_SESSION_KEY)}catch(e){}}function normaliseAccessCode(v){return String(v||"").trim().replace(/\s+/g,"").toUpperCase()}function unlockAuroraHQ(){document.body.classList.remove("locked");const gate=document.getElementById("auroraBootGate");if(gate)gate.classList.add("hidden");safeSetSession()}function lockAuroraHQ(){safeClearSession();document.body.classList.add("locked");const gate=document.getElementById("auroraBootGate"),input=document.getElementById("auroraAccessInput"),err=document.getElementById("bootError"),btn=document.getElementById("auroraAccessBtn");if(gate)gate.classList.remove("hidden");if(btn)btn.disabled=false;if(input){input.disabled=false;input.value="";setTimeout(()=>input.focus(),120)}if(err)err.innerText=""}function runBootSequence(){const terminal=document.getElementById("bootTerminal"),bar=document.getElementById("bootProgressBar"),badge=document.getElementById("bootStatusBadge");if(!terminal||!bar)return;const lines=["Initialising Aurora Core...","Checking Holdings Sheet... PASSED","Checking Dividend Engine... PASSED","Checking Scouting Centre Link... PASSED","Checking Premier League Table... PASSED","Mission Target: £2,000/month loaded","Awaiting access code..."];terminal.innerHTML="";lines.forEach((line,i)=>{setTimeout(()=>{terminal.innerHTML+=`<div class="boot-line">${line}</div>`;terminal.scrollTop=terminal.scrollHeight;bar.style.width=`${Math.min(100,Math.round(((i+1)/lines.length)*100))}%`;if(i===lines.length-1&&badge)badge.innerText="LOCKED"},i*220)})}function initAuroraLogin(){const btn=document.getElementById("auroraAccessBtn"),input=document.getElementById("auroraAccessInput"),err=document.getElementById("bootError"),lockBtn=document.getElementById("lockHqBtn");if(safeGetSession())unlockAuroraHQ();else{runBootSequence();setTimeout(()=>input&&input.focus(),1600)}function check(){const val=normaliseAccessCode(input?.value);if(val===AURORA_ACCESS_CODE){failedAuroraAttempts=0;if(err)err.innerText="ACCESS GRANTED — LAUNCHING AURORA HQ";const badge=document.getElementById("bootStatusBadge"),bar=document.getElementById("bootProgressBar");if(badge)badge.innerText="ACCESS GRANTED";if(bar)bar.style.width="100%";setTimeout(unlockAuroraHQ,250);return}failedAuroraAttempts+=1;if(input){input.value="";input.focus()}if(failedAuroraAttempts>=3){if(err)err.innerText="AURORA SECURITY LOCK — too many failed attempts.";if(btn)btn.disabled=true;if(input)input.disabled=true;setTimeout(()=>{failedAuroraAttempts=0;if(btn)btn.disabled=false;if(input){input.disabled=false;input.focus()}if(err)err.innerText="ACCESS REQUIRED — try again."},4000)}else if(err)err.innerText=`ACCESS DENIED — ${3-failedAuroraAttempts} attempt${3-failedAuroraAttempts===1?"":"s"} before security lock.`}if(btn)btn.addEventListener("click",check);if(input)input.addEventListener("keydown",e=>{if(e.key==="Enter")check()});if(lockBtn)lockBtn.addEventListener("click",lockAuroraHQ)}
document.addEventListener("DOMContentLoaded",()=>{document.body.classList.remove("locked");runNexus();setInterval(runNexus,300000)});

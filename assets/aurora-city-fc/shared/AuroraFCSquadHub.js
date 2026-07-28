/* Aurora City FC Squad Hub — extracted page logic */
(function(){
'use strict';

const AURORA_MASTER_URL = "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";
let AURORA_MASTER_CACHE = null;
let state = { holdings:[], watchlist:[], scout:[], news:[], livePrices:[], dailyPriceSummary:[], priceLog:[] };

const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n) : '—';
const num = n => Number.isFinite(n) ? `${Math.round(n)}` : '—';

function parseNum(v){
  if(v === null || v === undefined) return NaN;
  const s = String(v).replace(/£|,|%/g,'').trim();
  if(!s) return NaN;
  return Number(s);
}
function cleanTicker(t){ return String(t || '').trim().toUpperCase(); }
function displayTicker(t){ return String(t || '').replace('LON:',''); }
function displayName(row){
  return row.name || row.company_name || row.company || row.Company || row.Name || row.security_name || row.stock_name || row["Company Name"] || row["Security Name"] || displayTicker(row.ticker) || '—';
}
function parseYield(row){
  const direct = row.yield_pct ?? row.Yield ?? row.yield ?? '';
  if(String(direct).includes('%')) return parseNum(direct) / 100;
  const directNum = parseNum(direct);
  if(Number.isFinite(directNum) && directNum > 0 && directNum < 1) return directNum;
  if(Number.isFinite(directNum) && directNum >= 1) return directNum / 100;
  const dps = parseNum(row.annual_dps);
  const price = parseNum(row.live_price);
  if(Number.isFinite(dps) && Number.isFinite(price) && price > 0) return dps / price;
  return NaN;
}
function impact(row){ return parseNum(row.promotion_impact_score); }
function buyStrength(row){ return parseNum(row.buy_strength ?? row.buy_strength_score ?? row.BuyStrength ?? row.score ?? row.buy_score); }
function isActiveHolding(row){
  if(!row || typeof row !== 'object') return false;
  const status = String(val(row,'status','Status','holding_status','Holding Status','position_status','Position Status')).trim().toLowerCase();
  if(/sold|closed|exited|disposed|inactive|former|archived/.test(status)) return false;

  const qty = parseNum(val(row,'shares','Shares','quantity','Quantity','units','Units','holding_units','Holding Units'));
  const value = parseNum(val(row,'current_value','Current Value','market_value','Market Value','holding_value','Holding Value','value','Value'));
  const book = parseNum(val(row,'book_cost','Book Cost','cost','Cost','invested','Invested'));
  const income = annualIncomeFromRow(row);

  // A live position must still have units, market value, book cost or dividend income.
  // This removes historic zeroed-out rows such as sold MNG, LGEN and SDLF positions.
  return (Number.isFinite(qty) && qty > 0) ||
         (Number.isFinite(value) && value > 0.01) ||
         (Number.isFinite(book) && book > 0.01) ||
         (Number.isFinite(income) && income > 0.01);
}
function uniqueByTicker(rows){
  const map = new Map();
  (rows || []).filter(isActiveHolding).forEach(r=>{
    const t = cleanTicker(r.ticker);
    if(!t) return;
    const existing = map.get(t);
    if(!existing || squadScore(r) > squadScore(existing)) map.set(t,r);
  });
  return [...map.values()];
}
function annualIncomeFromRow(row){
  // AuroraData's annual_dps_total is the authoritative annual cash-income field.
  // Use it before estimating income from market value × yield.
  const direct = parseNum(
    row.annual_dps_total ?? row["annual_dps_total"] ?? row["Annual DPS Total"] ??
    row.annual_income ?? row.income_annual ?? row.dividend_income ??
    row.AnnualIncome ?? row["Annual Income"]
  );
  if(Number.isFinite(direct)) return direct;
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const dps = parseNum(row.annual_dps ?? row.dps ?? row.dividend_per_share);
  if(Number.isFinite(shares) && Number.isFinite(dps)) return shares * dps;
  const value = parseNum(row.value ?? row.market_value ?? row.current_value ?? row.holding_value ?? row.Value ?? row["Market Value"]);
  const y = parseYield(row);
  if(Number.isFinite(value) && Number.isFinite(y)) return value * y;
  return 0;
}
function portfolioAnnualIncome(){
  // Sum every active account row so holdings owned in both IG and Trading 212
  // are not accidentally reduced to a single account.
  return (state.holdings || []).filter(isActiveHolding).reduce((sum,row)=>sum + annualIncomeFromRow(row),0);
}
function squadScore(row){
  const bs = buyStrength(row);
  const imp = impact(row);
  if(Number.isFinite(bs) && Number.isFinite(imp)) return (bs * .65) + (imp * .35);
  if(Number.isFinite(bs)) return bs;
  if(Number.isFinite(imp)) return imp;
  return 50;
}
function scoreLabel(score){
  if(score >= 85) return 'Elite';
  if(score >= 75) return 'Strong';
  if(score >= 65) return 'Stable';
  return 'Needs work';
}
function currentDivision(annualIncome){
  if(annualIncome >= 24000) return ['Champions League royalty','£2,000/month mission complete'];
  if(annualIncome >= 12000) return ['Premier League','£1,000/month income club'];
  if(annualIncome >= 6000) return ['Championship','£500/month promotion target reached'];
  if(annualIncome >= 3000) return ['League One','£250/month income base'];
  if(annualIncome >= 1000) return ['League Two','first trophy banked'];
  return ['National League project','academy stage'];
}
async function fetchTab(tab){
  if(!AURORA_MASTER_CACHE){
    const res = await fetch(AURORA_MASTER_URL, { cache:'no-store' });
    if(!res.ok) throw new Error(`AuroraData failed: ${res.status}`);
    AURORA_MASTER_CACHE = await res.json();
  }

  const normalise = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const wanted = normalise(tab);

  function findTab(obj){
    if(!obj || typeof obj !== 'object') return [];
    if(Array.isArray(obj[tab])) return obj[tab];

    const key = Object.keys(obj).find(k => normalise(k) === wanted);
    if(key && Array.isArray(obj[key])) return obj[key];

    return [];
  }

  let rows = findTab(AURORA_MASTER_CACHE);
  if(rows.length) return rows;

  for(const wrapper of ['data','tabs','sheets','feeds']){
    rows = findTab(AURORA_MASTER_CACHE?.[wrapper]);
    if(rows.length) return rows;
  }

  return [];
}
async function loadData(){
  const btn = $('refreshBtn');
  if(btn){ btn.textContent = 'Loading…'; btn.disabled = true; }
  try{
    const [holdings, watchlist, scout, newsA, newsB, livePrices, dailyPriceSummary, priceLog] = await Promise.all([
      fetchTab('Holdings'),
      fetchTab('Watchlist'),
      fetchTab('AuroraScout').catch(()=>[]),
      fetchTab('AuroraTimes').catch(()=>[]),
      fetchTab('Aurora Times').catch(()=>[]),
      fetchTab('LivePrices').catch(()=>[]),
      fetchTab('DailyPriceSummary').catch(()=>[]),
      fetchTab('PriceLog').catch(()=>[])
    ]);
    const news = newsA.length ? newsA : newsB;
    state = { holdings, watchlist, scout, news, livePrices, dailyPriceSummary, priceLog };
    renderAll();
  }catch(err){
    console.error(err);
    const fail = `<div class="loading error">${err.message || 'Unable to load AuroraData'}</div>`;
    if(!(state.holdings||[]).length) ['firstTeamPitch','benchList','relegationWatch','legendGrid','trophyGrid'].forEach(id=>{ if($(id)) $(id).innerHTML = fail; });
  }finally{
    if(btn){ btn.textContent = 'Refresh'; btn.disabled = false; }
  }
}
function renderRows(rows, target, mode){
  const el = $(target);
  if(!el) return;
  el.innerHTML = rows.length ? rows.map((r,i)=>{
    const score = squadScore(r);
    const cls = score < 55 ? 'red' : score < 68 ? 'amber' : '';
    return `<div class="squad-row">
      <div class="squad-rank">${i+1}</div>
      <div><strong>${displayTicker(r.ticker)}</strong><span>${displayName(r)} • income ${money(annualIncomeFromRow(r))}</span></div>
      <div class="squad-pill ${cls}">${num(score)}</div>
    </div>`;
  }).join('') : '<div class="loading">No players found.</div>';
}


function squadStars(score){
  if(!Number.isFinite(score)) return '';
  const full = score >= 85 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 45 ? 2 : 1;
  return '★★★★★'.slice(0, full);
}

function tickerMatch(a,b){
  return cleanTicker(a).replace('LON:','').replace('.L','') === cleanTicker(b).replace('LON:','').replace('.L','');
}
function rowTickerValue(row){
  return val(row,'ticker','Ticker','symbol','Symbol');
}

function rowsForTicker(rows,row){
  const ticker = row?.ticker;
  return (rows||[]).filter(r=>tickerMatch(rowTickerValue(r),ticker));
}

function normalisedDateValue(value){
  const raw = String(value ?? '').trim();
  if(!raw) return '';

  // ISO dates sort naturally.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // UK dates used elsewhere in AuroraData.
  const uk = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(uk){
    return `${uk[3]}-${String(uk[2]).padStart(2,'0')}-${String(uk[1]).padStart(2,'0')}`;
  }

  const parsed = new Date(raw);
  if(Number.isFinite(parsed.getTime())){
    return parsed.toISOString().slice(0,10);
  }

  return '';
}

function feedDate(row){
  return normalisedDateValue(
    val(row,'date','Date','trading_date','Trading Date','timestamp','Timestamp','last_updated','Last Updated')
  );
}

function latestRowByDate(rows){
  return (rows||[]).reduce((latest,current)=>{
    if(!latest) return current;

    const latestDate = feedDate(latest);
    const currentDate = feedDate(current);

    if(currentDate && (!latestDate || currentDate > latestDate)) return current;
    if(currentDate === latestDate) return current; // later row wins on the same day
    return latest;
  }, null) || {};
}

function liveFeedRowFor(row){
  const matches = rowsForTicker(state.livePrices,row);
  return matches.length ? matches[matches.length-1] : {};
}

function summaryRowFor(row){
  return latestRowByDate(rowsForTicker(state.dailyPriceSummary,row));
}

function priceLogRowFor(row){
  return latestRowByDate(rowsForTicker(state.priceLog,row));
}

function holdingValue(row){
  return parseNum(val(row,'current_value','Current Value','market_value','Market Value','holding_value','Holding Value','value','Value')) || 0;
}

function priceFromFeed(feed){
  return parseNum(
    val(
      feed,
      'live_price','Live Price',
      'price','Price',
      'last_price','Last Price',
      'close','Close',
      'close_price','Close Price'
    )
  );
}

function latestPrice(row){
  const live = priceFromFeed(liveFeedRowFor(row));
  if(Number.isFinite(live)) return live;

  const summary = priceFromFeed(summaryRowFor(row));
  if(Number.isFinite(summary)) return summary;

  const logPrice = priceFromFeed(priceLogRowFor(row));
  if(Number.isFinite(logPrice)) return logPrice;

  const holdingPrice = parseNum(
    val(row,'live_price','Live Price','price','Price','last_price','Last Price')
  );
  return Number.isFinite(holdingPrice) ? holdingPrice : NaN;
}

function percentageFromFeed(feed){
  return parseNum(
    val(
      feed,
      'change_pct','Change %',
      'change_percent','Change Percent',
      'daily_change_pct','Daily Change %',
      'percent_change','Percent Change'
    )
  );
}

function closePriceFromSummary(feed){
  return parseNum(
    val(feed,'close_price','Close Price','close','Close','price','Price')
  );
}

function dailyMove(row){
  const liveFeed = liveFeedRowFor(row);
  const summary = summaryRowFor(row);
  const logRow = priceLogRowFor(row);
  const today = new Date().toISOString().slice(0,10);

  // Use today's completed/intraday summary when AuroraData has produced it.
  const summaryPct = percentageFromFeed(summary);
  if(feedDate(summary) === today && Number.isFinite(summaryPct)){
    return summaryPct;
  }

  // Some live feeds provide an explicit session percentage.
  const livePct = percentageFromFeed(liveFeed);
  if(Number.isFinite(livePct)) return livePct;

  // Main intraday fallback:
  // current live price versus the latest completed session close.
  const livePrice = priceFromFeed(liveFeed);
  const previousClose = closePriceFromSummary(summary);

  if(
    Number.isFinite(livePrice) &&
    Number.isFinite(previousClose) &&
    previousClose !== 0 &&
    feedDate(summary) !== today
  ){
    return ((livePrice - previousClose) / previousClose) * 100;
  }

  // If no separate live feed exists, compare the newest PriceLog price with
  // the latest completed DailyPriceSummary close.
  const logPrice = priceFromFeed(logRow);
  if(
    Number.isFinite(logPrice) &&
    Number.isFinite(previousClose) &&
    previousClose !== 0 &&
    feedDate(logRow) > feedDate(summary)
  ){
    return ((logPrice - previousClose) / previousClose) * 100;
  }

  // Use the newest available session result rather than the oldest row.
  if(Number.isFinite(summaryPct)) return summaryPct;

  const rowPct = percentageFromFeed(row);
  if(Number.isFinite(rowPct)) return rowPct;

  return 0;
}
function valuationSourceFor(row){
  const ticker = row?.ticker;
  const sources = [row, ...(state.watchlist||[]), ...(state.scout||[])];
  return sources.find(r=>tickerMatch(val(r,'ticker','Ticker','symbol','Symbol'), ticker)) || row || {};
}
function fairValueData(row){
  const source = valuationSourceFor(row);
  const fair = parseNum(val(source,'fair_value','Fair Value','fairValue','FairValue','target_price','Target Price'));
  const statusRaw = String(val(source,'valuation_status','Valuation Status','valuation','Valuation','fair_value_status','Fair Value Status')).trim();
  const price = latestPrice(row);
  const gapPct = Number.isFinite(fair) && Number.isFinite(price) && fair !== 0 ? ((fair-price)/fair)*100 : NaN;
  let status = statusRaw;
  if(!status && Number.isFinite(gapPct)){
    status = gapPct >= 10 ? 'Undervalued' : gapPct <= -10 ? 'Overvalued' : 'Near Fair Value';
  }
  return { fair, status: status || 'Not available', gapPct };
}
function fairValuePct(row){
  return fairValueData(row).gapPct;
}
function transferValuationData(row){
  const holding = holdingValue(row);
  const valuation = fairValueData(row);
  const price = latestPrice(row);
  const currentMillions = Number.isFinite(holding) ? holding / 1000 : NaN;
  const estimatedMillions = Number.isFinite(currentMillions) && Number.isFinite(valuation.fair) && Number.isFinite(price) && price > 0
    ? currentMillions * (valuation.fair / price)
    : currentMillions;
  const upsideMillions = Number.isFinite(estimatedMillions) && Number.isFinite(currentMillions)
    ? estimatedMillions - currentMillions
    : NaN;
  const releaseClauseMillions = Number.isFinite(estimatedMillions) ? estimatedMillions * 1.10 : NaN;
  return { ...valuation, currentMillions, estimatedMillions, upsideMillions, releaseClauseMillions };
}
function transferMoney(millions){
  if(!Number.isFinite(millions)) return '—';
  if(Math.abs(millions) < 0.01) return '£0.00m';
  return `${millions < 0 ? '-' : ''}£${Math.abs(millions).toFixed(2)}m`;
}
const FORMATION_433=Object.freeze({
  GK:{top:89,left:50},LB:{top:72,left:17},LCB:{top:72,left:38},RCB:{top:72,left:62},RB:{top:72,left:83},
  LCM:{top:47,left:32},RCM:{top:47,left:68},CAM:{top:34,left:50},LW:{top:20,left:18},ST:{top:13,left:50},RW:{top:20,left:82}
});
function positionPlan(rows){
  const pool=[...rows].filter(isActiveHolding);
  const used=new Set();
  const normalTicker=t=>cleanTicker(t).replace('LON:','').replace('.L','');
  const fixed=ticker=>{
    const row=pool.find(r=>normalTicker(r.ticker)===normalTicker(ticker) && !used.has(normalTicker(r.ticker))) || null;
    if(row) used.add(normalTicker(row.ticker));
    return row;
  };
  const take=(sorter)=>{
    const candidate=pool.filter(r=>!used.has(normalTicker(r.ticker))).sort(sorter)[0]||null;
    if(candidate) used.add(normalTicker(candidate.ticker));
    return candidate;
  };
  const reliability=r=>squadScore(r)+(holdingValue(r)>0?Math.min(12,Math.log10(holdingValue(r)+1)*2):0)-Math.abs(Math.min(10,dailyMove(r)))*.25;

  // Locked Aurora City 4-2-1-3 shape:
  // UKW — SUPR — FSFL
  //        ARCC
  // PHP          TSCO
  // IITU — FGEN — TW — VWRA
  //        RGL
  const plans=[
    {number:1,pos:'GK',...FORMATION_433.GK,row:fixed('RGL')||take((a,b)=>reliability(b)-reliability(a)),role:'Safe Hands'},

    {number:5,pos:'LB',...FORMATION_433.LB,row:fixed('IITU')||take((a,b)=>reliability(b)-reliability(a)),role:'Left Back'},
    {number:3,pos:'CB',...FORMATION_433.LCB,row:fixed('FGEN')||take((a,b)=>reliability(b)-reliability(a)),role:'Centre Back'},
    {number:4,pos:'CB',...FORMATION_433.RCB,row:fixed('TW')||take((a,b)=>reliability(b)-reliability(a)),role:'Centre Back'},
    {number:2,pos:'RB',...FORMATION_433.RB,row:fixed('VWRA')||take((a,b)=>reliability(b)-reliability(a)),role:'Right Back'},

    {number:8,pos:'CM',...FORMATION_433.LCM,row:fixed('PHP')||take((a,b)=>squadScore(b)-squadScore(a)),role:'Vice-Captain'},
    {number:6,pos:'CM',...FORMATION_433.RCM,row:fixed('TSCO')||take((a,b)=>(reliability(b)+holdingValue(b)/1000)-(reliability(a)+holdingValue(a)/1000)),role:'Captain'},
    {number:10,pos:'CAM',...FORMATION_433.CAM,row:fixed('ARCC')||take((a,b)=>squadScore(b)-squadScore(a)),role:'Playmaker'},

    {number:11,pos:'LW',...FORMATION_433.LW,row:fixed('UKW')||take((a,b)=>(dailyMove(b)+squadScore(b)*.2)-(dailyMove(a)+squadScore(a)*.2)),role:'Left Wing'},
    {number:9,pos:'ST',...FORMATION_433.ST,row:fixed('SUPR')||take((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a)),role:'Top Scorer'},
    {number:7,pos:'RW',...FORMATION_433.RW,row:fixed('FSFL')||take((a,b)=>(dailyMove(b)+squadScore(b)*.2)-(dailyMove(a)+squadScore(a)*.2)),role:'Right Wing'}
  ];
  return plans;
}
let currentTeamPlan=[];
function roleClass(role){ return role==='Captain'?'captain':role==='Vice-Captain'?'vice':''; }
function formatPrice(row){ const p=latestPrice(row); return Number.isFinite(p)?money(p):'—'; }
function movementHtml(row){ const m=dailyMove(row); const cls=m>0?'move-up':m<0?'move-down':'move-flat'; const icon=m>0?'▲':m<0?'▼':'•'; return `<span class="${cls}">${icon} ${m>0?'+':''}${m.toFixed(2)}%</span>`; }

function metricToneFromNumber(value,positiveIsGreen=true){
  if(!Number.isFinite(value)||Math.abs(value)<0.0001) return 'metric-amber';
  const positive=value>0;
  return positive===positiveIsGreen?'metric-green':'metric-red';
}
function valuationTone(status){
  const text=String(status||'').toLowerCase();
  if(/undervalued|discount|cheap|below fair/.test(text)) return 'metric-green';
  if(/overvalued|premium|expensive|above fair/.test(text)) return 'metric-red';
  if(/neutral|fair|review|near/.test(text)) return 'metric-amber';
  return 'metric-neutral';
}
function recommendationTone(recommendation){
  const text=String(recommendation||'').toLowerCase();
  if(/\b(buy|accumulate|add|strong sign|sign)\b/.test(text)) return 'report-green';
  if(/\b(sell|exit|reduce|trim|take profit)\b/.test(text)) return 'report-red';
  if(/\b(hold|review|monitor|wait)\b/.test(text)) return 'report-amber';
  return 'report-blue';
}
function ratingTone(score){
  if(!Number.isFinite(score)) return 'rating-amber';
  if(score>=75) return 'rating-green';
  if(score>=55) return 'rating-amber';
  return 'rating-red';
}
function releaseClauseDecision(row,valuation,recommendation){
  const recommendationText=String(recommendation||'').toLowerCase();
  const statusText=String(valuation?.status||'').toLowerCase();
  const gap=valuation?.gapPct;

  const explicitSell=/\b(sell|exit|reduce|trim|take profit)\b/.test(recommendationText);
  const clearlyOvervalued=/overvalued|premium|expensive|above fair/.test(statusText);

  if(explicitSell||clearlyOvervalued||(Number.isFinite(gap)&&gap<=-2)){
    return {
      tone:'metric-green',
      badge:'green',
      label:'Available to sell',
      note:'Release clause active — offers can be considered'
    };
  }

  if(
    /neutral|fair|review|near/.test(statusText)||
    (Number.isFinite(gap)&&gap>-2&&gap<=3)
  ){
    return {
      tone:'metric-amber',
      badge:'amber',
      label:'Review offers',
      note:'Close to fair value — manager decision required'
    };
  }

  return {
    tone:'metric-red',
    badge:'red',
    label:'Not for sale',
    note:'Below fair value — keep the player in the squad'
  };
}
function profileBadge(label,tone){
  return `<span class="profile-decision-badge ${tone}">${label}</span>`;
}

function squadImageForTicker(ticker){
  const t=cleanTicker(ticker).replace('LON:','').replace('.L','');
  // Squad images are currently uploaded beside the HTML in the GitHub repo.
  // The version query prevents an older failed image request being held in cache.
  const version='?v=20260718-5';
  const map={
    RGL:'rgl_squad.png',
    VWRA:'vwra_squad.png',
    FGEN:'fgen_squad.png',
    TW:'tw_squad.png',
    IITU:'iitu_squad.png',
    TSCO:'tsco_squad.png',
    FSFL:'fsfl_squad.png',
    PHP:'php_squad.png',
    SUPR:'supr_squad.png',
    ARCC:'arcc_squad.png',
    UKW:'ukw_squad.png'
  };
  return map[t] ? map[t] + version : '';
}
function squadImageFallbackForTicker(ticker){
  const t=cleanTicker(ticker).replace('LON:','').replace('.L','');
  const version='?v=20260718-5';
  const map={
    RGL:'assets/aurora-city-fc/players/rgl_squad.png',
    VWRA:'assets/aurora-city-fc/players/vwra_squad.png',
    FGEN:'assets/aurora-city-fc/players/fgen_squad.png',
    TW:'assets/aurora-city-fc/players/tw_squad.png',
    IITU:'assets/aurora-city-fc/players/iitu_squad.png',
    TSCO:'assets/aurora-city-fc/players/tsco_squad.png',
    FSFL:'assets/aurora-city-fc/players/fsfl_squad.png',
    PHP:'assets/aurora-city-fc/players/php_squad.png',
    SUPR:'assets/aurora-city-fc/players/supr_squad.png',
    ARCC:'assets/aurora-city-fc/players/arcc_squad.png',
    UKW:'assets/aurora-city-fc/players/ukw_squad.png'
  };
  return map[t] ? map[t] + version : '';
}
function playerProfileImageForTicker(ticker){
  return squadImageForTicker(ticker)||legendImageForTicker(ticker);
}
function renderFormation(rows, target){
  const el=$(target); if(!el) return;
  currentTeamPlan=positionPlan(rows);
  const players=currentTeamPlan.map(slot=>{
    const row=slot.row;
    if(!row) return `<div class="pitch-player empty" style="top:${slot.top}%;left:${slot.left}%"><div class="pitch-player-core"><div class="pitch-pos">${slot.pos}</div><div class="pitch-score">--</div><div class="pitch-shirt"><div class="pitch-shirt-code">OPEN</div></div></div><span class="pitch-name">Scout slot</span></div>`;
    const score=Math.round(squadScore(row));
    const badge=slot.role==='Captain'?' C':slot.role==='Vice-Captain'?' VC':'';
    const squadImg=squadImageForTicker(row.ticker);
    const fallbackImg=squadImageFallbackForTicker(row.ticker);
    const visual=squadImg?`<div class="pitch-squad-photo"><img src="${squadImg}" data-fallback-src="${fallbackImg}" alt="${displayTicker(row.ticker)} squad portrait" onerror="if(this.dataset.fallbackSrc&&!this.dataset.retried){this.dataset.retried='1';this.src=this.dataset.fallbackSrc;}else{this.closest('.pitch-squad-photo').style.display='none';this.closest('.pitch-player-core').querySelector('.pitch-shirt').style.display='flex';}"></div><div class="pitch-shirt" style="display:none"><div class="pitch-shirt-badge"></div><div class="pitch-shirt-code">${displayTicker(row.ticker)}</div><div class="pitch-shirt-number">${slot.number}</div></div>`:`<div class="pitch-shirt"><div class="pitch-shirt-badge"></div><div class="pitch-shirt-code">${displayTicker(row.ticker)}</div><div class="pitch-shirt-number">${slot.number}</div></div>`;
    return `<div class="pitch-player ${slot.role==='Captain'?'star-player':''} ${squadImg?'has-squad-photo':''}" data-player-ticker="${cleanTicker(row.ticker)}" data-slot-pos="${slot.pos}" style="top:${slot.top}%;left:${slot.left}%" tabindex="0" role="button" aria-label="Open ${displayName(row)} profile"><div class="pitch-player-core"><div class="pitch-pos">${slot.pos}${badge}</div><div class="pitch-score">${score}</div>${visual}</div><span class="pitch-name">${displayName(row)}</span><small class="pitch-stars">${squadStars(score)}</small></div>`;
  }).join('');
  el.innerHTML=['<div class="pitch-mark pitch-outline"></div>','<div class="pitch-mark pitch-half"></div>','<div class="pitch-mark pitch-centre-circle"></div>','<div class="pitch-mark pitch-centre-dot"></div>','<div class="pitch-mark pitch-box-top"></div>','<div class="pitch-mark pitch-box-bottom"></div>','<div class="pitch-mark pitch-six-top"></div>','<div class="pitch-mark pitch-six-bottom"></div>',players].join('');
  renderTeamSelection(currentTeamPlan);
}
function accountRowsForTicker(ticker){ return (state.holdings||[]).filter(r=>isActiveHolding(r)&&tickerMatch(r.ticker,ticker)); }
function holdingValueForTicker(ticker){
  return accountRowsForTicker(ticker).reduce((sum,row)=>sum+holdingValue(row),0);
}
function annualIncomeForTicker(ticker){
  return accountRowsForTicker(ticker).reduce((sum,row)=>sum+annualIncomeFromRow(row),0);
}
function renderTeamSelection(plan){
  const body=$('teamSelectionBody'), summary=$('teamSelectionSummary');
  if(!body || !summary) return;

  const ordered=[...plan].sort((a,b)=>a.number-b.number);
  const rows=ordered.filter(x=>x.row);

  const totalValue=rows.reduce((s,x)=>s+holdingValueForTicker(x.row.ticker),0);
  const annual=rows.reduce((s,x)=>s+annualIncomeForTicker(x.row.ticker),0);
  const avg=rows.length ? rows.reduce((s,x)=>s+squadScore(x.row),0)/rows.length : 0;
  const rising=rows.filter(x=>dailyMove(x.row)>0).length;

  summary.innerHTML=`
    <div class="team-selection-stat"><small>XI Value</small><strong>${money(totalValue)}</strong></div>
    <div class="team-selection-stat"><small>Annual Div.</small><strong>${money(annual)}</strong></div>
    <div class="team-selection-stat"><small>Monthly Div.</small><strong>${money(annual/12)}</strong></div>
    <div class="team-selection-stat"><small>Average</small><strong>${Math.round(avg)}/100</strong></div>
    <div class="team-selection-stat"><small>Rising</small><strong>${rising} / ${rows.length}</strong></div>
  `;

  body.innerHTML=ordered.map(slot=>{
    const r=slot.row;

    if(!r){
      return `<tr>
        <td><div class="squad-no">${slot.number}</div></td>
        <td><span class="position-chip">${slot.pos}</span></td>
        <td colspan="6">Open squad place</td>
      </tr>`;
    }

    const annualIncome=annualIncomeForTicker(r.ticker);
    const combinedValue=holdingValueForTicker(r.ticker);
    const image=squadImageForTicker(r.ticker);
    const fallback=squadImageFallbackForTicker(r.ticker);
    const ticker=displayTicker(r.ticker);

    const portrait=`
      <span class="fm-player-photo">
        <span>${ticker.slice(0,3)}</span>
        ${image ? `<img
          src="${image}"
          data-fallback-src="${fallback}"
          alt="${ticker} portrait"
          onerror="if(this.dataset.fallbackSrc&&!this.dataset.retried){this.dataset.retried='1';this.src=this.dataset.fallbackSrc;}else{this.remove();}"
        >` : ''}
      </span>
    `;

    return `<tr class="player-row" data-player-ticker="${cleanTicker(r.ticker)}">
      <td><div class="squad-no">${slot.number}</div></td>
      <td><span class="position-chip">${slot.pos}</span></td>
      <td>
        <div class="fm-player-identity">
          ${portrait}
          <div class="fm-player-copy">
            <strong>${ticker} — ${displayName(r)}</strong>
            <small><span>${slot.role}</span>${movementHtml(r)}</small>
          </div>
        </div>
      </td>
      <td class="num">${formatPrice(r)}</td>
      <td class="num">${money(combinedValue)}</td>
      <td class="num">${money(annualIncome)}</td>
      <td class="num">${money(annualIncome/12)}</td>
      <td>
        <div class="fm-rating-role">
          <span class="fm-rating">${Math.round(squadScore(r))}</span>
          <span class="role-chip ${roleClass(slot.role)}">${slot.role}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function totalBookCost(ticker){ return accountRowsForTicker(ticker).reduce((s,r)=>{const n=parseNum(val(r,'book_cost','Book Cost','cost','Cost','invested','Invested'));return s+(Number.isFinite(n)?n:0);},0); }
function accountSummary(ticker){
  const rows=accountRowsForTicker(ticker); if(!rows.length) return 'Account not labelled';
  return rows.map(r=>`${String(val(r,'account','Account','platform','Platform','broker','Broker')||'Unlabelled')}: ${money(holdingValue(r))}`).join(' • ');
}
function ratingBreakdown(row){
  const income=Math.max(0,Math.min(100,Number.isFinite(parseYield(row))?parseYield(row)*1000:50));
  const valuation=fairValuePct(row); const valueScore=Number.isFinite(valuation)?Math.max(0,Math.min(100,55+valuation*1.5)):50;
  const form=Math.max(0,Math.min(100,50+dailyMove(row)*4));
  const quality=Number.isFinite(buyStrength(row))?buyStrength(row):50;
  return {income,value:valueScore,form,quality};
}
function renderPositionalDepth(plan,allRows){
  const box=$('positionalDepth'); if(!box) return;
  const bench=allRows.filter(r=>!plan.some(slot=>slot.row&&tickerMatch(slot.row.ticker,r.ticker))).sort((a,b)=>squadScore(b)-squadScore(a));
  const groups=[
    {label:'Goalkeeper',slots:['GK']},{label:'Defence',slots:['LB','CB','RB']},{label:'Central midfield',slots:['CM']},{label:'Attacking midfield',slots:['CAM']},{label:'Front three',slots:['LW','ST','RW']}
  ];
  box.innerHTML=groups.map(group=>{
    const starters=plan.filter(s=>group.slots.includes(s.pos)&&s.row); const backups=bench.filter(r=>{
      const name=`${displayTicker(r.ticker)} ${displayName(r)}`.toLowerCase();
      if(group.label==='Goalkeeper') return /reit|rgl|keeper/.test(name);
      if(group.label==='Defence') return /infrastructure|taylor|world|iitu|fgen|tw|vwra/.test(name);
      if(group.label==='Front three') return /wind|solar|supermarket|ukw|fsfl|supr/.test(name);
      return true;
    }).slice(0,2);
    const status=backups.length>=2?'Covered':backups.length===1?'Thin':'Critical'; const cls=status==='Covered'?'':status==='Thin'?'warn':'bad';
    return `<div class="depth-card"><small>${group.label}</small><strong>${starters.map(s=>displayTicker(s.row.ticker)).join(' / ')||'Open place'}</strong><span>Backup: ${backups.map(r=>displayTicker(r.ticker)).join(' / ')||'None'}</span><span class="depth-status ${cls}">${status}</span></div>`;
  }).join('');
}
function openPlayerDrawer(ticker){
  const drawer=$('playerDrawer'), backdrop=$('playerDrawerBackdrop'), content=$('playerDrawerContent');
  if(!drawer||!backdrop||!content) return;
  const wanted=cleanTicker(ticker);
  let slot=currentTeamPlan.find(x=>x.row&&tickerMatch(x.row.ticker,wanted));
  if(!slot){
    const squadRow=uniqueByTicker(state.holdings).find(r=>tickerMatch(r.ticker,wanted));
    if(squadRow) slot={number:'—',pos:'SUB',role:'Squad Player',row:squadRow};
  }
  if(!slot||!slot.row){
    content.innerHTML='<div class="player-profile-section"><h3>Player profile unavailable</h3><p style="color:var(--muted);margin:0">Aurora could not match this player to a current active holding. Refresh the Squad Hub and try again.</p></div>';
  }else{
    try{
      const r=slot.row;
      const annual=annualIncomeFromRow(r);
      const score=Math.round(squadScore(r));
      const y=parseYield(r);
      const valuation=transferValuationData(r);
      const recommendation=String(val(r,'recommendation','Recommendation','action','Action','status','Status')||'Hold / Review');
      const upsideLabel=Number.isFinite(valuation.upsideMillions)
        ? `${valuation.upsideMillions>=0?'+':''}${transferMoney(valuation.upsideMillions)}`
        : '—';
      const movement=dailyMove(r);
      const movementTone=movement>0?'metric-green':movement<0?'metric-red':'metric-amber';
      const releaseDecision=releaseClauseDecision(r,valuation,recommendation);
      const valuationCardTone=valuationTone(valuation.status);
      const upsideTone=metricToneFromNumber(valuation.upsideMillions,true);
      const unrealised=holdingValue(r)-totalBookCost(r.ticker);
      const unrealisedTone=unrealised>0?'report-green':unrealised<0?'report-red':'report-amber';
      const recommendationClass=recommendationTone(recommendation);
      const overallRatingTone=score>=75?'report-green':score>=55?'report-amber':'report-red';
      const yieldText=Number.isFinite(y)?(y*100).toFixed(2)+'%':'—';

      content.innerHTML=`
        <div class="player-profile-head">
          <div class="player-profile-shirt">
            <img
              src="${playerProfileImageForTicker(r.ticker)}"
              data-fallback-src="${squadImageFallbackForTicker(r.ticker)}"
              alt="${displayTicker(r.ticker)} player portrait"
              onerror="if(this.dataset.fallbackSrc&&!this.dataset.retried){this.dataset.retried='1';this.src=this.dataset.fallbackSrc;}else{this.remove();this.parentElement.textContent='${displayTicker(r.ticker)}';}"
            >
          </div>
          <div>
            <h2>${displayName(r)}</h2>
            <p>No. ${slot.number} • ${slot.pos} • ${slot.role}</p>
            <div class="player-profile-badges">
              <span class="role-chip ${roleClass(slot.role)}">${slot.role}</span>
              <span class="position-chip">Rating ${score}</span>
            </div>
          </div>
        </div>

        <div class="player-profile-grid">
          <div class="player-profile-metric metric-blue">
            <small>Last Share Price</small>
            <strong>${formatPrice(r)}</strong>
            <span>Latest Aurora market feed</span>
          </div>

          <div class="player-profile-metric ${movementTone}">
            <small>Today's Movement</small>
            <strong>${movementHtml(r)}</strong>
            <span>Live price versus latest completed session close</span>
          </div>

          <div class="player-profile-metric metric-blue">
            <small>Current Market Value</small>
            <strong>${transferMoney(valuation.currentMillions)}</strong>
            <span>£1,000 holding value = £1m football value</span>
          </div>

          <div class="player-profile-metric metric-purple">
            <small>Estimated Transfer Value</small>
            <strong>${transferMoney(valuation.estimatedMillions)}</strong>
            <span>Adjusted using Aurora fair value</span>
          </div>

          <div class="player-profile-metric ${upsideTone}">
            <small>Transfer Upside</small>
            <strong>${upsideLabel}</strong>
            <span>${
              Number.isFinite(valuation.gapPct)
                ? (valuation.gapPct>=0?'+':'')+
                  valuation.gapPct.toFixed(1)+'% versus fair value'
                : 'Awaiting valuation data'
            }</span>
          </div>

          <div class="player-profile-metric ${releaseDecision.tone}">
            <small>Release Clause</small>
            <strong>${transferMoney(valuation.releaseClauseMillions)}</strong>
            ${profileBadge(releaseDecision.label,releaseDecision.badge)}
            <span>${releaseDecision.note}</span>
          </div>

          <div class="player-profile-metric ${valuationCardTone}">
            <small>Valuation Status</small>
            <strong>${valuation.status}</strong>
            ${profileBadge(
              valuationCardTone==='metric-green'
                ? 'Value opportunity'
                : valuationCardTone==='metric-red'
                  ? 'Valuation warning'
                  : valuationCardTone==='metric-amber'
                    ? 'Fair-value zone'
                    : 'Awaiting data',
              valuationCardTone==='metric-green'
                ? 'green'
                : valuationCardTone==='metric-red'
                  ? 'red'
                  : valuationCardTone==='metric-amber'
                    ? 'amber'
                    : 'neutral'
            )}
            <span>Aurora transfer-market indicator</span>
          </div>

          <div class="player-profile-metric metric-cyan">
            <small>Annual Dividend</small>
            <strong>${money(annual)}</strong>
            <span>${money(annual/12)} per month</span>
          </div>

          <div class="player-profile-metric metric-cyan">
            <small>Dividend Yield</small>
            <strong>${yieldText}</strong>
            <span>Current income yield</span>
          </div>
        </div>

        <div class="player-profile-section">
          <h3>Manager's Player Report</h3>

          <div class="player-profile-line">
            <span>Squad position</span>
            <strong>No. ${slot.number} ${slot.pos}</strong>
          </div>

          <div class="player-profile-line ${overallRatingTone}">
            <span>Aurora rating</span>
            <strong>${score}/100 • ${scoreLabel(score)}</strong>
          </div>

          <div class="player-profile-line">
            <span>Current role</span>
            <strong>${slot.role}</strong>
          </div>

          <div class="player-profile-line ${recommendationClass}">
            <span>Recommendation</span>
            <strong>${recommendation}</strong>
          </div>

          <div class="player-profile-line">
            <span>Company / player</span>
            <strong>${displayName(r)}</strong>
          </div>

          <div class="player-profile-line">
            <span>Accounts</span>
            <strong>${accountSummary(r.ticker)}</strong>
          </div>

          <div class="player-profile-line">
            <span>Book cost</span>
            <strong>${money(totalBookCost(r.ticker))}</strong>
          </div>

          <div class="player-profile-line ${unrealisedTone}">
            <span>Unrealised gain / loss</span>
            <strong>${unrealised>0?'+':''}${money(unrealised)}</strong>
          </div>

          <div class="rating-breakdown">
            ${Object.entries(ratingBreakdown(r)).map(([label,value])=>`
              <div class="rating-part ${ratingTone(value)}">
                <small>${label}</small>
                <strong>${Math.round(value)}/100</strong>
              </div>
            `).join('')}
          </div>
        </div>`;
    }catch(err){
      console.error('Player profile render failed:',err);
      content.innerHTML='<div class="player-profile-section"><h3>Player profile could not load</h3><p style="color:var(--muted);margin:0">The squad remains available, but one of this player’s data fields could not be read. Refresh to retry.</p></div>';
    }
  }
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('player-drawer-open');
  drawer.scrollTop=0;
}
function closePlayerDrawer(){
  $('playerDrawer')?.classList.remove('open');
  $('playerDrawerBackdrop')?.classList.remove('open');
  $('playerDrawer')?.setAttribute('aria-hidden','true');
  $('playerDrawerBackdrop')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('player-drawer-open');
}

function renderBench(rows, target){
  const el = $(target);
  if(!el) return;
  const bench = [...rows].filter(isActiveHolding).sort((a,b)=>squadScore(b)-squadScore(a)).slice(11,16);
  el.innerHTML = bench.length ? bench.map(r=>`<div class="bench-card" data-player-ticker="${cleanTicker(r.ticker)}" tabindex="0" role="button" aria-label="Open ${displayName(r)} profile">
    <div class="bench-shirt-mini"><span>${displayTicker(r.ticker)}</span></div>
    <div class="bench-meta"><strong>${displayName(r)}</strong><small>${money(annualIncomeFromRow(r))} annual income</small></div>
    <div class="bench-score">${num(squadScore(r))}</div>
  </div>`).join('') : '<div class="loading">No bench players yet — once the XI is full, the next strongest active holdings appear here.</div>';
}

function legendImageForTicker(ticker){
  // Use the same live squad portrait everywhere for visual consistency.
  return squadImageForTicker(ticker) || squadImageFallbackForTicker(ticker);
}
function chooseLegends(rows){
  const active = [...rows].filter(isActiveHolding);
  const captain = currentTeamPlan.find(x=>x.role==='Captain')?.row || null;
  const vice = currentTeamPlan.find(x=>x.role==='Vice-Captain')?.row || null;
  const scorer = [...active].sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a))[0] || null;
  const star = [...active].sort((a,b)=>squadScore(b)-squadScore(a))[0] || null;
  const ordered = [captain, vice, scorer, star, ...active].filter(Boolean);
  const picked=[];
  ordered.forEach(row=>{
    if(picked.length>=4) return;
    if(!picked.some(p=>tickerMatch(p.ticker,row.ticker))) picked.push(row);
  });
  return picked;
}
function legendRoleForRow(row, index){
  const captain = currentTeamPlan.find(x=>x.role==='Captain')?.row;
  const vice = currentTeamPlan.find(x=>x.role==='Vice-Captain')?.row;
  const scorer = [...uniqueByTicker(state.holdings)].sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a))[0];
  if(captain && tickerMatch(row.ticker,captain.ticker)) return 'Club Captain';
  if(vice && tickerMatch(row.ticker,vice.ticker)) return 'Vice-Captain';
  if(scorer && tickerMatch(row.ticker,scorer.ticker)) return 'Income Legend';
  return index===3 ? 'Fan Favourite' : 'Club Legend';
}
function renderLegends(rows){
  const legends = chooseLegends(rows);
  $('legendGrid').innerHTML = legends.length ? legends.map((r,i)=>{
    const ticker = displayTicker(r.ticker);
    const name = displayName(r);
    const img = legendImageForTicker(r.ticker);
    const role = legendRoleForRow(r,i);
    return `<div class="legend-tile" data-player-ticker="${cleanTicker(r.ticker)}" tabindex="0" role="button" aria-label="Open ${name} profile">
      <div class="legend-player-img">
        <img src="${img}" data-fallback-src="${squadImageFallbackForTicker(r.ticker)}" alt="${ticker} legend portrait" onerror="if(this.dataset.fallbackSrc&&!this.dataset.retried){this.dataset.retried='1';this.src=this.dataset.fallbackSrc;}else{this.style.display='none';}">
      </div>
      <div class="legend-player-body">
        <div class="legend-role">${role}</div>
        <strong>${ticker}</strong>
        <span>${name}</span>
        <span class="legend-income">Annual income ${money(annualIncomeFromRow(r))}</span>
      </div>
    </div>`;
  }).join('') : '<div class="loading">No current holdings available for the Hall of Fame.</div>';
}
function buildTrophies(annualIncome){
  const base = "https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/cups/";
  return [
    {
      icon:'🏆',
      title:'League One Promotion',
      target:3000,
      monthlyTarget:250,
      image:base + 'league1.png',
      detail:'First proper breakthrough. The club is officially moving.'
    },
    {
      icon:'🏆',
      title:'Championship Promotion',
      target:6000,
      monthlyTarget:500,
      image:base + 'championship.png',
      detail:'Serious progress. Aurora City becomes a proper force.'
    },
    {
      icon:'👑',
      title:'Premier League Champions',
      target:12000,
      monthlyTarget:1000,
      image:base + 'premier_league.png',
      detail:'Elite domestic level. The club has arrived.'
    },
    {
      icon:'🏆',
      title:'European Champions',
      target:18000,
      monthlyTarget:1500,
      image:base + 'european.png',
      detail:'Big club energy. European nights unlocked.'
    },
    {
      icon:'🏆',
      title:'Champions League Winners',
      target:24000,
      monthlyTarget:2000,
      image:base + 'champions_league.png',
      detail:'Final boss. The long-term Aurora dynasty mission.'
    }
  ];
}
function trophyStatus(progress, done){
  if(done) return ['Unlocked','unlocked'];
  if(progress >= 75) return ['In Reach','in-reach'];
  if(progress >= 40) return ['Building','locked'];
  return ['Locked Target','locked'];
}
function renderTrophies(annualIncome){
  const trophies = buildTrophies(annualIncome);
  const monthlyIncome = annualIncome / 12;
  const unlocked = trophies.filter(t=>annualIncome >= t.target).length;
  const next = trophies.find(t=>annualIncome < t.target);
  const trophyCount = $('trophyCount');
  const grid = $('trophyGrid');

  if(trophyCount) trophyCount.textContent = `${unlocked}/${trophies.length} unlocked`;
  if($('honoursMonthlyIncome')) $('honoursMonthlyIncome').textContent = money(monthlyIncome);
  if($('honoursNextUnlock')) $('honoursNextUnlock').textContent = next ? next.title : 'Dynasty complete';
  if($('honoursAmountLeft')) $('honoursAmountLeft').textContent = next ? `${money(Math.max(0,next.target-annualIncome))} annual` : 'All honours secured';

  if(!grid) return;

  grid.innerHTML = trophies.map(t=>{
    const done = annualIncome >= t.target;
    const progress = Math.min(100, Math.max(0, (annualIncome / t.target) * 100));
    const gap = Math.max(0,t.target-annualIncome);
    const [statusText,statusClass] = trophyStatus(progress, done);
    const cardClass = done ? 'unlocked' : progress >= 75 ? 'in-reach' : 'locked';

    return `<div class="honours-trophy ${cardClass}">
      <div>
        <div class="trophy-image-stage">
          <img src="${t.image}" alt="${t.title} trophy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
          <div class="trophy-placeholder">${done ? t.icon : '🔒'}</div>
        </div>
        <div class="honours-trophy-body">
          <strong>${t.title}</strong>
          <span>${t.detail}</span>
          <div class="honours-target-row"><span>Target</span><b>${money(t.monthlyTarget)}/month</b></div>
          <div class="honours-target-row"><span>Progress</span><b>${Math.round(progress)}%</b></div>
          <div class="honours-progress"><span style="width:${progress}%"></span></div>
          <span class="honours-status ${statusClass}">${statusText}</span>
          <span>${done ? 'Honour secured.' : money(gap) + ' annual income to unlock.'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderSelectionIntel(rows, backups){
  const el = $('selectionIntel');
  const advice = $('selectionAdvice');
  if(!el) return;

  const sorted = [...rows].sort((a,b)=>squadScore(b)-squadScore(a));
  const starters = sorted.slice(0,11);
  const bench = sorted.slice(11,16);
  const weakestStarter = [...starters].sort((a,b)=>squadScore(a)-squadScore(b))[0];
  const bestBackup = backups[0] || bench[0] || sorted[11] || null;
  const benchIncome = [...bench, ...backups].filter(Boolean).sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a))[0] || null;
  const pressure = bestBackup && weakestStarter ? Math.round(squadScore(bestBackup) - squadScore(weakestStarter)) : 0;
  const depthAvg = backups.length ? backups.reduce((s,r)=>s+squadScore(r),0)/backups.length : 0;

  el.innerHTML = `
    <div class="selection-intel-card">
      <small>Next to Start</small>
      <strong>${bestBackup ? displayTicker(bestBackup.ticker) : '—'}</strong>
      <span>${bestBackup ? `${displayName(bestBackup)} is closest to breaking into the matchday group.` : 'No backup pressure yet.'}</span>
    </div>
    <div class="selection-intel-card">
      <small>Best Bench Income</small>
      <strong>${benchIncome ? displayTicker(benchIncome.ticker) : '—'}</strong>
      <span>${benchIncome ? `${money(annualIncomeFromRow(benchIncome))} annual income contribution from the wider squad.` : 'Income depth still building.'}</span>
    </div>
    <div class="selection-intel-card">
      <small>Promotion Watch</small>
      <strong>${bestBackup ? `${Math.round(squadScore(bestBackup))}/100` : '—'}</strong>
      <span>${pressure > 0 ? 'Backup pressure is strong — review the weakest starter.' : 'Bench is applying pressure but not forcing a change yet.'}</span>
    </div>
    <div class="selection-intel-card">
      <small>At Risk Starter</small>
      <strong>${weakestStarter ? displayTicker(weakestStarter.ticker) : '—'}</strong>
      <span>${weakestStarter ? `${displayName(weakestStarter)} is the lowest-rated starter today.` : 'Starting XI is stable.'}</span>
    </div>`;

  if(advice){
    const depthText = depthAvg >= 70 ? 'Backup depth is strong. You can rotate without weakening the squad.' :
      depthAvg >= 55 ? 'Backup depth is useful, but the First XI still carries the main quality.' :
      'Backup depth is thin. Build the bench before making aggressive changes.';
    advice.innerHTML = `<strong>Assistant Manager Advice</strong><span>${depthText} ${pressure > 0 ? 'One backup is pushing hard for promotion.' : 'No urgent selection chaos today.'}</span>`;
  }
}

function renderBackupTeam(rows, target){
  const el = $(target);
  if(!el) return;
  const backups = [...rows].sort((a,b)=>squadScore(b)-squadScore(a)).slice(16,21);
  if(!backups.length){
    el.innerHTML = '<div class="loading">No backup team yet — current squad depth is already being used by the XI and bench.</div>';
    renderSelectionIntel(rows, backups);
    return;
  }
  renderRows(backups.slice(0,5), target, 'top');
  renderSelectionIntel(rows, backups);
}

function renderChemistry(rows){
  const avg = rows.length ? rows.reduce((s,r)=>s+squadScore(r),0)/rows.length : 0;
  const low = rows.filter(r=>squadScore(r)<60).length;
  const sorted = [...rows].sort((a,b)=>squadScore(b)-squadScore(a));
  const starters = sorted.slice(0,11);
  const bench = sorted.slice(11,16);
  const concentration = rows.filter(r=>String(`${r.chemistry_risk||''} ${r.sector||''} ${r.role||''}`).toLowerCase().includes('concentration')).length;
  const leadership = starters.length ? starters.reduce((s,r)=>s+squadScore(r),0)/starters.length : avg;
  const incomeTotal = rows.reduce((s,r)=>s+annualIncomeFromRow(r),0);
  const incomeBalance = incomeTotal >= 6000 ? 'Strong' : incomeTotal >= 3000 ? 'Building' : 'Early Stage';
  const sectors = {};
  rows.forEach(r=>{
    const key = String(r.sector || r.category || r.role || 'Mixed').trim() || 'Mixed';
    sectors[key] = (sectors[key] || 0) + 1;
  });
  const largestSector = Object.entries(sectors).sort((a,b)=>b[1]-a[1])[0];
  const sectorStatus = largestSector && largestSector[1] > Math.max(3, rows.length * .35) ? 'Watch' : 'Balanced';
  const benchAvg = bench.length ? bench.reduce((s,r)=>s+squadScore(r),0)/bench.length : 0;
  const benchPressure = benchAvg >= 72 ? 'High' : benchAvg >= 60 ? 'Medium' : 'Low';
  const risk = low >= 4 ? 'High' : low >= 2 || concentration ? 'Medium' : 'Low';

  const board = $('chemistryBoard');
  if(board){
    board.innerHTML = `
      <div class="chemistry-card ${avg>=70?'good':'watch'}">
        <small>Chemistry Score</small>
        <strong>${Math.round(avg)}/100 • ${scoreLabel(avg)}</strong>
        <span>${avg >= 75 ? 'The squad balance is strong. Keep improving quality without chasing chaos.' : 'Stable shape, but a few upgrades would improve the dressing room.'}</span>
      </div>
      <div class="chemistry-card ${leadership>=72?'good':'watch'}">
        <small>Leadership Core</small>
        <strong>${Math.round(leadership)}/100</strong>
        <span>Starting XI leadership quality based on the strongest holdings.</span>
      </div>
      <div class="chemistry-card ${incomeTotal>=6000?'good':'watch'}">
        <small>Income Balance</small>
        <strong>${incomeBalance}</strong>
        <span>${money(incomeTotal)} annual squad income across the wider group.</span>
      </div>
      <div class="chemistry-card ${sectorStatus==='Balanced'?'good':'watch'}">
        <small>Sector Balance</small>
        <strong>${sectorStatus}</strong>
        <span>${largestSector ? `${largestSector[0]} is the biggest group with ${largestSector[1]} holding(s).` : 'No sector data found.'}</span>
      </div>
      <div class="chemistry-card ${benchPressure==='High'?'good':'watch'}">
        <small>Bench Pressure</small>
        <strong>${benchPressure}</strong>
        <span>The bench average is ${Math.round(benchAvg || 0)}/100. ${benchPressure==='High'?'Selection pressure is healthy.':'First XI still controls the shirt.'}</span>
      </div>
      <div class="chemistry-card ${risk==='Low'?'good':risk==='Medium'?'watch':'risk'}">
        <small>Dressing Room Risk</small>
        <strong>${risk}</strong>
        <span>${low ? `${low} holding(s) need review.` : 'No major form concerns.'} ${concentration ? `${concentration} concentration flag(s).` : 'No major concentration flags.'}</span>
      </div>`;
  }

  if($('chemistryScore')) $('chemistryScore').textContent = `${Math.round(avg)}/100 • ${scoreLabel(avg)}`;
  if($('chemistryNote')) $('chemistryNote').textContent = avg >= 75
    ? 'The squad balance is strong. Keep improving quality without chasing chaos.'
    : 'The squad is stable, but a few stronger signings would improve the team shape.';
  if($('concentrationStatus')) $('concentrationStatus').textContent = concentration ? `${concentration} watch flags` : 'No major flags';
  if($('concentrationNote')) $('concentrationNote').textContent = low
    ? `${low} holding(s) need review. Check weak scores before adding fresh risk.`
    : 'No major dressing-room issues. Squad is balanced enough to keep building.';
}

function nextTrophyInfo(annualIncome){
  const targets = [
    { title:'League One Promotion', annual:3000, monthly:250 },
    { title:'Championship Promotion', annual:6000, monthly:500 },
    { title:'Premier League Champions', annual:12000, monthly:1000 },
    { title:'European Champions', annual:18000, monthly:1500 },
    { title:'Champions League Winners', annual:24000, monthly:2000 }
  ];
  return targets.find(t=>annualIncome < t.annual) || { title:'Dynasty complete', annual:annualIncome, monthly:annualIncome/12 };
}
function strongestRow(rows){
  return [...rows].sort((a,b)=>squadScore(b)-squadScore(a))[0] || null;
}
function weakestRow(rows){
  return [...rows].sort((a,b)=>squadScore(a)-squadScore(b))[0] || null;
}
function bestIncomeRow(rows){
  return [...rows].sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a))[0] || null;
}
function moraleRating(avg, annualIncome, lowCount){
  let score = Math.round(Math.max(35, Math.min(99, (avg || 50) + Math.min(12, annualIncome / 2200) - (lowCount * 3))));
  let label = score >= 82 ? 'Excellent' : score >= 72 ? 'High' : score >= 62 ? 'Stable' : 'Needs Lift';
  return { score, label };
}
function val(row,...keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return '';
}
function isPublishedNews(row){
  const status = String(val(row,'Status','status')).trim().toLowerCase();
  return !status || status === 'published';
}
function mediaMoraleImpact(){
  return (state.news || []).filter(isPublishedNews).reduce((sum,row)=>{
    const n = parseNum(val(row,'Morale_Impact','Morale Impact','morale_impact','Squad_Morale_Impact','Squad Morale Impact'));
    return sum + (Number.isFinite(n) ? n : 0);
  },0);
}
function mediaImpactLabel(n){
  if(n > 0) return `<strong class="morale-impact morale-impact-up">+${n} media boost</strong>`;
  if(n < 0) return `<strong class="morale-impact morale-impact-down">${n} media pressure</strong>`;
  return `<strong class="morale-impact morale-impact-flat">0 media effect</strong>`;
}
function renderTrainingReport(rows, annualIncome){
  const el = $('trainingReportGrid');
  if(!el) return;
  if(!rows.length){
    el.innerHTML = '<div class="loading">No squad data available for training report.</div>';
    return;
  }
  const topTrainer = strongestRow(rows);
  const incomeLeader = bestIncomeRow(rows);
  const needsWork = weakestRow(rows);
  const next = nextTrophyInfo(annualIncome);
  const topScore = topTrainer ? Math.round(squadScore(topTrainer)) : 0;
  const weakScore = needsWork ? Math.round(squadScore(needsWork)) : 0;

  el.innerHTML = `
    <div class="training-tile">
      <small>Top Trainer</small>
      <strong>${topTrainer ? displayTicker(topTrainer.ticker) : '—'}</strong>
      <span>${topTrainer ? `${displayName(topTrainer)} is sharp in training with a ${topScore}/100 squad rating.` : 'No standout yet.'}</span>
    </div>
    <div class="training-tile">
      <small>Income Leader</small>
      <strong>${incomeLeader ? displayTicker(incomeLeader.ticker) : '—'}</strong>
      <span>${incomeLeader ? `${money(annualIncomeFromRow(incomeLeader))} annual income. Reliable senior-pro cashflow.` : 'No income leader found.'}</span>
    </div>
    <div class="training-tile">
      <small>Needs Extra Work</small>
      <strong>${needsWork ? displayTicker(needsWork.ticker) : '—'}</strong>
      <span>${needsWork ? `${displayName(needsWork)} is at ${weakScore}/100. Keep on review, not panic mode.` : 'No weak point found.'}</span>
    </div>
    <div class="training-tile">
      <small>Coach Verdict</small>
      <strong>${next.title}</strong>
      <span>Training focus is closing the gap to ${money(next.monthly)}/month. Keep the starting XI disciplined.</span>
    </div>`;
}
function renderMoraleCentre(rows, annualIncome){
  const avg = rows.length ? rows.reduce((s,r)=>s+squadScore(r),0)/rows.length : 0;
  const low = rows.filter(r=>squadScore(r)<60).length;
  const baseMorale = moraleRating(avg, annualIncome, low);
  const mediaImpact = Math.round(mediaMoraleImpact());
  const finalScore = Math.max(0, Math.min(100, baseMorale.score + mediaImpact));
  const label = finalScore >= 82 ? 'Excellent' : finalScore >= 72 ? 'High' : finalScore >= 62 ? 'Stable' : 'Needs Lift';
  if($('moraleScore')) $('moraleScore').textContent = `${finalScore}`;
  if($('moraleBadge')) $('moraleBadge').textContent = label;
  const pressure = low >= 4 ? 'High' : low >= 2 ? 'Medium' : 'Controlled';
  const mood = finalScore >= 82 ? 'Buzzing' : finalScore >= 72 ? 'Confident' : finalScore >= 62 ? 'Calm' : 'Flat';
  const leader = strongestRow(rows);
  if($('moraleLines')){
    $('moraleLines').innerHTML = `
      <div class="morale-line"><span>Dressing room mood</span><strong>${mood}</strong></div>
      <div class="morale-line"><span>Media effect</span>${mediaImpactLabel(mediaImpact)}</div>
      <div class="morale-line"><span>Base morale</span><strong>${baseMorale.score}</strong></div>
      <div class="morale-line"><span>Pressure level</span><strong>${pressure}</strong></div>
      <div class="morale-line"><span>Squad leader</span><strong>${leader ? displayTicker(leader.ticker) : '—'}</strong></div>`;
  }
}
function renderCaptainMessage(rows, annualIncome){
  const captain = bestIncomeRow(rows) || strongestRow(rows);
  const next = nextTrophyInfo(annualIncome);
  const monthlyIncome = annualIncome / 12;
  if(!$('captainMessage')) return;
  $('captainMessage').innerHTML = `
    <strong>${captain ? displayTicker(captain.ticker) : 'Captain'} speaks</strong>
    <p>“We’re sitting at ${money(monthlyIncome)} a month. The next job is ${next.title}. Keep standards high, no passengers, and keep building toward ${money(next.monthly)}/month.”</p>`;
}
function renderMonthlyFocus(annualIncome){
  const next = nextTrophyInfo(annualIncome);
  const progress = next.annual ? Math.min(100, Math.max(0, (annualIncome / next.annual) * 100)) : 100;
  if(!$('monthlyFocus')) return;
  $('monthlyFocus').innerHTML = `
    <strong>${next.title}</strong>
    <p>This month’s focus is to improve recurring income and move closer to the ${money(next.monthly)}/month unlock.</p>
    <div class="focus-progress"><span style="width:${progress}%"></span></div>
    <p>${Math.round(progress)}% complete • ${money(Math.max(0,next.annual-annualIncome))} annual income still needed.</p>`;
}
function renderTacticalIdentity(rows, annualIncome){
  const avg = rows.length ? rows.reduce((s,r)=>s+squadScore(r),0)/rows.length : 0;
  const monthly = annualIncome / 12;
  const tactic = monthly >= 1000 ? 'European Income Press' : monthly >= 500 ? 'Promotion Push 4-3-3' : 'Dividend Press 4-3-3';
  const style = avg >= 75 ? 'Controlled possession, strong senior core, income-first discipline.' : 'Balanced build-up, cautious risk, improve weak positions first.';
  const weakness = rows.filter(r=>squadScore(r)<60).length ? 'A few players need form recovery.' : 'No major weak point screaming today.';
  if(!$('tacticalIdentity')) return;
  $('tacticalIdentity').innerHTML = `
    <div class="tactic-box">
      <small>Current tactic</small>
      <strong>${tactic}</strong>
      <span>${style}</span>
    </div>
    <div class="tactic-box">
      <small>Team weakness</small>
      <strong>${weakness.includes('few') ? 'Depth Watch' : 'Stable Shape'}</strong>
      <span>${weakness}</span>
    </div>
    <div class="tactic-box">
      <small>Attacking plan</small>
      <strong>Grow Monthly Income</strong>
      <span>Use new contributions to push the next honours unlock without wrecking the team balance.</span>
    </div>
    <div class="tactic-box">
      <small>Defensive plan</small>
      <strong>No Panic Transfers</strong>
      <span>Review underperformers, but protect the long-term compounding structure.</span>
    </div>`;
}
function renderFatigueWatch(rows){
  const el = $('fatigueWatch');
  if(!el) return;
  const watch = [...rows].sort((a,b)=>squadScore(a)-squadScore(b)).slice(0,4);
  if(!watch.length){
    el.innerHTML = '<div class="loading">No fatigue watch today.</div>';
    return;
  }
  el.innerHTML = watch.map(r=>{
    const score = Math.round(squadScore(r));
    const status = score < 55 ? 'Medical Review' : score < 65 ? 'Needs Rest' : 'Monitor';
    const cls = score < 55 ? 'red' : score < 65 ? 'amber' : 'blue';
    return `<div class="fatigue-row">
      <div class="fatigue-icon" aria-label="medical red cross"></div>
      <div><strong>${displayTicker(r.ticker)}</strong><span>${displayName(r)} • rating ${score}/100</span></div>
      <span class="badge ${cls}">${status}</span>
    </div>`;
  }).join('');
}
function renderSquadDevelopment(rows, annualIncome){
  renderTrainingReport(rows, annualIncome);
  renderMoraleCentre(rows, annualIncome);
  renderCaptainMessage(rows, annualIncome);
  renderMonthlyFocus(annualIncome);
  renderTacticalIdentity(rows, annualIncome);
  renderFatigueWatch(rows);
}

function renderAll(){
  if($('lastUpdated')) { if(window.AuroraFC) AuroraFC.setFreshness('lastUpdated',AURORA_MASTER_CACHE,{prefix:'Aurora generated'}); else $('lastUpdated').textContent='Aurora generated: unavailable'; }

  const rows = uniqueByTicker(state.holdings).sort((a,b)=>squadScore(b)-squadScore(a));
  const annualIncome = portfolioAnnualIncome();
  const monthly = annualIncome / 12;
  const avg = rows.length ? rows.reduce((s,r)=>s+squadScore(r),0)/rows.length : 0;
  const [division, divisionNote] = currentDivision(annualIncome);

  $('squadSize').textContent = rows.length;
  $('squadStrength').textContent = `${Math.round(avg)}/100`;
  $('squadStrengthLabel').textContent = scoreLabel(avg);
  $('annualIncome').textContent = money(annualIncome);
  $('monthlyIncome').textContent = `${money(monthly)} monthly`;
  $('currentDivision').textContent = division;
  $('divisionNote').textContent = divisionNote;

  renderFormation(rows,'firstTeamPitch');
  renderBench(rows,'benchList');
  renderBackupTeam(rows,'relegationWatch');
  renderChemistry(rows);
  renderSquadDevelopment(rows, annualIncome);
  renderLegends(rows);
  renderPositionalDepth(currentTeamPlan,rows);
  window.AURORA_PAGE_CHECKS=()=>[
    {level:currentTeamPlan.filter(x=>x.row).length===11?'ok':'bad',title:`${currentTeamPlan.filter(x=>x.row).length}/11 starting places filled`,detail:'The formation engine is using one central 4-3-3 coordinate map.'},
    {level:rows.every(r=>squadImageForTicker(r.ticker))?'ok':'warn',title:rows.every(r=>squadImageForTicker(r.ticker))?'Every active player has an image mapping':'One or more player image mappings are missing',detail:'System Check tests mappings; the browser fallback still protects the pitch.'}
  ];
}
document.addEventListener('click',e=>{ const player=e.target.closest('[data-player-ticker]'); if(player) openPlayerDrawer(player.dataset.playerTicker); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closePlayerDrawer(); const player=e.target.closest?.('[data-player-ticker]'); if(player&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPlayerDrawer(player.dataset.playerTicker);} });
$('playerDrawerClose')?.addEventListener('click',closePlayerDrawer);
$('playerDrawerBackdrop')?.addEventListener('click',closePlayerDrawer);
$('refreshBtn')?.addEventListener('click', ()=>{ AURORA_MASTER_CACHE=null; loadData(); });
loadData();

if(window.AuroraFC) AuroraFC.registerServiceWorker();

(function(){
  const button=document.getElementById('auroraSystemButton');
  const panel=document.getElementById('auroraSystemPanel');
  const close=document.getElementById('auroraSystemClose');
  const list=document.getElementById('auroraSystemList');
  if(!button||!panel||!list) return;
  const parseDate=row=>{
    const raw=row?.date??row?.Date??row?.timestamp??row?.Timestamp??row?.updated_at??row?.Updated??row?.time;
    const d=raw?new Date(raw):null; return d&&!Number.isNaN(d.getTime())?d:null;
  };
  const ticker=row=>String(row?.ticker??row?.Ticker??'').trim().toUpperCase().replace('LON:','').replace('.L','');
  const value=row=>{
    const raw=row?.current_value??row?.market_value??row?.holding_value??row?.value??row?.Value;
    const n=Number(String(raw??'').replace(/[£,%]/g,'')); return Number.isFinite(n)?n:0;
  };
  const qty=row=>{const n=Number(String(row?.shares??row?.quantity??row?.units??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  function build(){
    const s=(typeof state!=='undefined'&&state)||{};
    const holdings=Array.isArray(s.holdings)?s.holdings:[];
    const active=holdings.filter(r=>qty(r)>0||value(r)>0);
    const counts=new Map(); active.forEach(r=>{const t=ticker(r);if(t)counts.set(t,(counts.get(t)||0)+1);});
    const duplicates=[...counts].filter(([,n])=>n>1);
    const missingAccount=active.filter(r=>!String(r.account??r.Account??r.platform??r.broker??'').trim()).length;
    const valuationRows=[...(s.watchlist||[]),...(s.scout||[]),...(s.globalWatchlist||[])];
    const missingFair=valuationRows.filter(r=>ticker(r)&&!(r.fair_value??r['Fair Value']??r.target_price??r['Target Price'])).length;
    const allRows=Object.values(s).flatMap(v=>Array.isArray(v)?v:[]);
    const latest=allRows.map(parseDate).filter(Boolean).sort((a,b)=>b-a)[0];
    const ageHours=latest?(Date.now()-latest.getTime())/36e5:NaN;
    const extra=(typeof window.AURORA_PAGE_CHECKS==='function'?window.AURORA_PAGE_CHECKS():[])||[];
    const checks=[
      {level:active.length?'ok':'bad',title:`${active.length} active holding rows`,detail:active.length?'Holdings are available to the page.':'No active holdings were detected.'},
      {level:missingAccount?'warn':'ok',title:missingAccount?`${missingAccount} holding rows missing an account`:'Account labels complete',detail:missingAccount?'Add IG ISA, Trade 212 or the correct platform to prevent scope errors.':'Account-scoped calculations can be applied safely.'},
      {level:duplicates.length?'warn':'ok',title:duplicates.length?`${duplicates.length} tickers appear in multiple accounts`:'No unexpected duplicate tickers',detail:duplicates.length?duplicates.slice(0,6).map(([t,n])=>`${t} ×${n}`).join(' • '):'Unique-ticker and account totals can be separated deliberately.'},
      {level:missingFair?'warn':'ok',title:missingFair?`${missingFair} valuation rows missing fair value`:'Fair-value fields available',detail:missingFair?'Those rows will show a neutral valuation until the sheet is completed.':'Transfer valuation indicators have source data.'},
      {level:Number.isFinite(ageHours)&&ageHours>26?'bad':Number.isFinite(ageHours)&&ageHours>8?'warn':'ok',title:latest?`Latest dated row: ${latest.toLocaleString('en-GB')}`:'No dated data row found',detail:Number.isFinite(ageHours)?`${ageHours.toFixed(1)} hours old.`:'The page can still run, but true data freshness cannot be confirmed.'},
      ...extra
    ];
    list.innerHTML=checks.map(c=>`<div class="aurora-system-row ${c.level==='ok'?'':c.level}"><i class="aurora-system-dot"></i><div><strong>${c.title}</strong><span>${c.detail}</span></div></div>`).join('');
  }
  function toggle(open){panel.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));if(open)build();}
  button.addEventListener('click',()=>toggle(!panel.classList.contains('open'))); close?.addEventListener('click',()=>toggle(false));
})();

document.documentElement.dataset.squadMovementBuild = "latest-session-v22";

document.documentElement.dataset.squadSidebarBuild = "department-colours-v23";

document.documentElement.dataset.colourSidebarBuild = "universal-v24";
document.documentElement.dataset.colourSidebarPage = "AuroraCityFC_SquadHub.html";

document.documentElement.dataset.playerProfileBuild = "colour-signals-v25";

(() => {
  "use strict";
  document.documentElement.dataset.auroraM3Squad = "current-file-v1";
  let tacticMode=localStorage.getItem("aurora_m3_squad_tactic")||"default";
  const id=value=>document.getElementById(value);
  const clean=value=>String(value||"").trim().toUpperCase().replace("LON:","").replace(".L","");
  const parse=value=>{
    const n=Number(String(value??"").replace(/[£,%]/g,"").replace(/,/g,"").trim());
    return Number.isFinite(n)?n:0;
  };
  const cash=value=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(Number(value)||0);

  const originalUnique=uniqueByTicker;
  uniqueByTicker=function(rows){
    const groups=new Map();
    (rows||[]).filter(isActiveHolding).forEach(row=>{
      const ticker=clean(row.ticker);
      if(!ticker)return;
      const list=groups.get(ticker)||[];
      list.push(row);groups.set(ticker,list);
    });
    return [...groups.entries()].map(([ticker,list])=>{
      if(list.length===1){list[0]._m3Accounts=list;return list[0];}
      const representative=[...list].sort((a,b)=>squadScore(b)-squadScore(a))[0];
      const combined={...representative};
      const shares=list.reduce((s,row)=>s+parse(row.shares??row.quantity??row.units??row.Shares),0);
      const value=list.reduce((s,row)=>s+holdingValue(row),0);
      const income=list.reduce((s,row)=>s+annualIncomeFromRow(row),0);
      const book=list.reduce((s,row)=>s+parse(row.book_cost??row["Book Cost"]??row.cost??row.invested),0);
      combined.ticker=representative.ticker;
      combined.shares=shares;combined.quantity=shares;combined.units=shares;
      combined.current_value=value;combined.market_value=value;combined.value=value;
      combined.annual_dps_total=income;combined.annual_income=income;
      combined.book_cost=book;combined.account="Combined accounts";
      combined._m3Accounts=list;
      return combined;
    });
  };

  const originalPositionPlan=positionPlan;
  positionPlan=function(rows){
    if(tacticMode==="default") return originalPositionPlan(rows);
    const pool=[...uniqueByTicker(rows)].filter(isActiveHolding);
    const scoreFor=row=>{
      const income=annualIncomeFromRow(row),value=holdingValue(row),rating=squadScore(row),move=Math.abs(dailyMove(row));
      const y=value>0?income/value:0;
      if(tacticMode==="income") return income*5+y*1000+rating;
      if(tacticMode==="defensive") return value/250+rating*1.2-move*2;
      if(tacticMode==="growth") return (buyStrength(row)||50)*1.4+(impact(row)||50)*1.2+dailyMove(row)*2;
      return rating*1.4+income/10+value/1000-move;
    };
    const picked=pool.sort((a,b)=>scoreFor(b)-scoreFor(a)).slice(0,11);
    const slots=[
      {number:1,pos:"GK",...FORMATION_433.GK,role:"Safe Hands"},
      {number:5,pos:"LB",...FORMATION_433.LB,role:"Left Back"},
      {number:3,pos:"CB",...FORMATION_433.LCB,role:"Centre Back"},
      {number:4,pos:"CB",...FORMATION_433.RCB,role:"Centre Back"},
      {number:2,pos:"RB",...FORMATION_433.RB,role:"Right Back"},
      {number:8,pos:"CM",...FORMATION_433.LCM,role:"Vice-Captain"},
      {number:6,pos:"CM",...FORMATION_433.RCM,role:"Captain"},
      {number:10,pos:"CAM",...FORMATION_433.CAM,role:"Playmaker"},
      {number:11,pos:"LW",...FORMATION_433.LW,role:"Left Wing"},
      {number:9,pos:"ST",...FORMATION_433.ST,role:"Top Scorer"},
      {number:7,pos:"RW",...FORMATION_433.RW,role:"Right Wing"}
    ];
    return slots.map((slot,index)=>({...slot,row:picked[index]||null}));
  };

  function recommendation(row){
    const watch=(state.watchlist||[]).find(item=>clean(item.ticker)===clean(row.ticker))||
      (state.scout||[]).find(item=>clean(item.ticker)===clean(row.ticker))||row;
    const text=String(watch.recommendation??watch.status??watch.trial_verdict??watch.watchlist_status??"").toLowerCase();
    const value=holdingValue(row),income=annualIncomeFromRow(row),yieldRate=value>0?income/value:0;
    if(/\b(sell|exit|reduce|trim)\b/.test(text))return {label:"Sell target",cls:"sell"};
    if(/\b(buy|add|accumulate|green)\b/.test(text))return {label:"Add",cls:"add"};
    if(/\b(watch|review|monitor|amber)\b/.test(text))return {label:"Watch",cls:"watch"};
    if(yieldRate>0.09)return {label:"Income hold",cls:"add"};
    return {label:"Hold",cls:""};
  }

  const originalRenderFormation=renderFormation;
  renderFormation=function(rows,target){
    originalRenderFormation(rows,target);
    document.querySelectorAll(`#${target} [data-player-ticker]`).forEach(player=>{
      const row=uniqueByTicker(state.holdings).find(item=>clean(item.ticker)===clean(player.dataset.playerTicker));
      if(!row)return;
      const status=recommendation(row);
      const badge=document.createElement("span");
      badge.className=`m3-player-status ${status.cls}`;
      badge.textContent=status.label;
      player.appendChild(badge);
    });
    renderToolbarLeaders();
  };

  function renderToolbarLeaders(){
    const rows=uniqueByTicker(state.holdings).sort((a,b)=>annualIncomeFromRow(b)-annualIncomeFromRow(a));
    const plan=currentTeamPlan.filter(x=>x.row);
    const captain=plan.find(x=>x.role==="Captain")?.row||rows[0];
    const vice=plan.find(x=>x.role==="Vice-Captain")?.row||rows[1];
    const scorer=rows[0];
    if(id("m3SquadLeaders")) id("m3SquadLeaders").innerHTML=[
      ["Captain",captain?displayTicker(captain.ticker):"—"],
      ["Vice-captain",vice?displayTicker(vice.ticker):"—"],
      ["Top income scorer",scorer?`${displayTicker(scorer.ticker)} • ${cash(annualIncomeFromRow(scorer))}/yr`:"—"]
    ].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  }

  function installToolbar(){
    const wrap=document.querySelector(".squad-formation-card .formation-wrap");
    if(!wrap||id("m3SquadToolbar"))return;
    const toolbar=document.createElement("div");
    toolbar.className="m3-squad-toolbar";toolbar.id="m3SquadToolbar";
    toolbar.innerHTML=`<div class="m3-squad-toolbar-head"><div><h4>Formation strategy</h4><p>Change the XI without changing the current page design. Active holdings are combined across IG and Trade 212 before selection.</p></div><span class="m3-squad-build">M3 current-file upgrade</span></div><div class="m3-tactic-buttons">${[
      ["default","Manager XI"],["income","Maximum Income"],["balanced","Balanced"],["defensive","Defensive Income"],["growth","Growth + Income"]
    ].map(([mode,label])=>`<button type="button" data-m3-tactic="${mode}" class="${tacticMode===mode?"active":""}">${label}</button>`).join("")}</div><div class="m3-squad-leaders" id="m3SquadLeaders"></div>`;
    wrap.insertAdjacentElement("beforebegin",toolbar);
    toolbar.addEventListener("click",event=>{
      const button=event.target.closest("[data-m3-tactic]");if(!button)return;
      tacticMode=button.dataset.m3Tactic;
      localStorage.setItem("aurora_m3_squad_tactic",tacticMode);
      toolbar.querySelectorAll("button").forEach(btn=>btn.classList.toggle("active",btn===button));
      renderAll();
    });
  }

  function appendAccountBreakdown(ticker){
    const content=id("playerDrawerContent");if(!content)return;
    content.querySelector(".m3-account-breakdown")?.remove();
    const rows=accountRowsForTicker(ticker);
    if(!rows.length)return;
    const box=document.createElement("div");box.className="m3-account-breakdown";
    box.innerHTML=`<h3>Combined account breakdown</h3>${rows.map(row=>{
      const account=String(row.account??row.Account??row.platform??row.broker??"Account not set");
      const shares=parse(row.shares??row.quantity??row.units??row.Shares);
      return `<div class="m3-account-row"><span>${account}</span><strong>${shares.toLocaleString("en-GB",{maximumFractionDigits:4})} shares • ${cash(holdingValue(row))} • ${cash(annualIncomeFromRow(row))}/yr</strong></div>`;
    }).join("")}`;
    content.appendChild(box);
  }

  function renderFormer(){
    const list=id("m3FormerPlayerList");if(!list||typeof state==="undefined")return;
    const former=[...new Set((state.holdings||[]).filter(row=>!isActiveHolding(row)).map(row=>clean(row.ticker)).filter(Boolean))];
    const html=former.length?former.map(ticker=>`<span>${ticker}</span>`).join(""):"<span>No sold holdings are currently recorded</span>";
    // Do not rewrite identical markup: doing so retriggers the page-wide MutationObserver
    // and can starve Aurora's fetch/render promises on iPad Safari.
    if(list.innerHTML!==html) list.innerHTML=html;
  }

  function init(){
    installToolbar();
    renderFormer();
    document.addEventListener("click",event=>{
      const player=event.target.closest("[data-player-ticker]");
      if(player)setTimeout(()=>appendAccountBreakdown(player.dataset.playerTicker),50);
    });
    // The observer is only needed to install the toolbar after the native squad markup appears.
    // Former-player content is refreshed separately without creating a mutation loop.
    const observer=new MutationObserver(()=>installToolbar());
    observer.observe(document.body,{childList:true,subtree:true});
    window.setInterval(()=>{if(!document.hidden){renderFormer();renderToolbarLeaders();}},10000);
    if(Array.isArray(state?.holdings)&&state.holdings.length)renderAll();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

(()=>{
  'use strict';
  const PLAN_KEY='aurora_m4_plan_v1';
  const DEPLOYMENT_KEY='aurora_monthly_deployment_v1';
  const LIFECYCLE_KEY='aurora_m4_signing_lifecycle_v1';
  const METRICS_KEY='aurora_m4_last_metrics_v1';
  const REFRESH_KEY='aurora_m4_last_refresh_v1';
  const defaults={corePot:25000,coreMonthly:2500,etfPot:8000,etfMonthly:1000,paydayMonthly:1500,months:10,currentMonth:1,monthlyTarget:625,startingIncome:4220,version:4};
  const q=id=>document.getElementById(id);
  const num=value=>{const n=Number(String(value??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:NaN};
  const money=value=>Number.isFinite(value)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(value):'—';
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(_){return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}};
  function plan(){return {...defaults,...read(PLAN_KEY,{})};}
  function savePlan(next){const clean={...defaults,...next,updatedAt:new Date().toISOString(),version:4};write(PLAN_KEY,clean);write(DEPLOYMENT_KEY,{corePot:clean.corePot,coreMonthly:clean.coreMonthly,etfPot:clean.etfPot,etfMonthly:clean.etfMonthly,currentMonth:clean.currentMonth,updatedAt:clean.updatedAt,m4:true});return clean;}
  function migrate(){
    const existing=read(PLAN_KEY,null);
    if(!existing){
      const old=read(DEPLOYMENT_KEY,{});
      savePlan({...defaults,currentMonth:Number.isFinite(num(old.currentMonth))?Math.max(1,num(old.currentMonth)):1});
    }
  }
  function active(row){const status=String(row?.status??row?.holding_status??row?.active??'').toLowerCase();const shares=num(row?.shares??row?.quantity??row?.units);return !/(sold|closed|inactive|former|exited)/.test(status)&&(!Number.isFinite(shares)||shares>0);}
  function ticker(row){return String(row?.ticker??row?.symbol??row?.Ticker??'').toUpperCase().replace(/^LON:/,'').trim();}
  function rowValue(row){for(const key of ['market_value','current_value','holding_value','value','Market Value','Current Value']){const n=num(row?.[key]);if(Number.isFinite(n)&&n>=0)return n}const shares=num(row?.shares??row?.quantity??row?.units),price=num(row?.live_price_gbp??row?.live_price??row?.price_gbp??row?.price);return Number.isFinite(shares)&&Number.isFinite(price)?shares*price:0;}
  function rowIncome(row){for(const key of ['annual_dps_total','annual_income','income_annual','dividend_income','Annual Income']){const n=num(row?.[key]);if(Number.isFinite(n)&&n>=0)return n}const value=rowValue(row);let y=num(row?.yield_pct??row?.yield??row?.Yield??row?.dividend_yield);if(Number.isFinite(y)){if(y>1)y/=100;return value*y}return 0;}
  function metrics(){
    let rows=[];
    try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))rows=state.holdings}catch(_){}
    const holdings=rows.filter(active);
    let annual=holdings.reduce((sum,row)=>sum+rowIncome(row),0);
    let value=holdings.reduce((sum,row)=>sum+rowValue(row),0);
    const saved=read(METRICS_KEY,{});
    if(!(annual>0))annual=Number.isFinite(num(saved.annual))?num(saved.annual):plan().startingIncome;
    let yieldRate=value>0?annual/value:num(saved.yieldRate);
    if(!(yieldRate>0&&yieldRate<.5))yieldRate=.0627033333;
    const output={annual,value,yieldRate,holdings:holdings.length,at:new Date().toISOString()};
    if(rows.length)write(METRICS_KEY,output);
    return output;
  }
  function releaseAt(p,month){const m=Math.max(1,month);const core=Math.max(0,Math.min(p.coreMonthly,p.corePot-(m-1)*p.coreMonthly));const etf=Math.max(0,Math.min(p.etfMonthly,p.etfPot-(m-1)*p.etfMonthly));return {core,etf,total:core+etf};}
  function projections(p,m){
    const baseCapital=p.corePot+p.etfPot;
    const paydayCapital=p.paydayMonthly*p.months;
    const fullCapital=baseCapital+paydayCapital;
    const baseFinal=m.annual+baseCapital*m.yieldRate;
    const fullFinal=m.annual+fullCapital*m.yieldRate;
    let annual=m.annual,targetMonth=null,totalBase=0,totalFull=0;
    const rows=[];
    for(let month=1;month<=Math.max(120,p.months);month++){
      const release=month<=p.months?releaseAt(p,month):{core:0,etf:0,total:0};
      const payday=p.paydayMonthly;
      totalBase+=release.total;
      totalFull+=release.total+payday;
      annual+=((release.total+payday)*m.yieldRate);
      if(month<=p.months)rows.push({month,release,payday,base:release.total,full:release.total+payday,baseIncome:m.annual+totalBase*m.yieldRate,fullIncome:m.annual+totalFull*m.yieldRate});
      if(targetMonth===null&&annual/12>=p.monthlyTarget)targetMonth=month;
    }
    return {baseCapital,paydayCapital,fullCapital,baseFinal,fullFinal,targetMonth,rows};
  }
  function transferPlan(){const x=read('aurora_transfer_plan_v2',{});return x;}
  function lifecycle(){
    const p=plan(),tp=transferPlan(),payday=read('aurora_payday_execution_v1',{}),receipt=read('aurora_m3_last_transfer_receipt_v1',{}),lastReg=read('aurora_registration_last_v1',{}),saved=read(LIFECYCLE_KEY,{});
    const route=Array.isArray(tp.rows)?tp.rows:Array.isArray(tp.route)?tp.route:[];
    const routeTickers=route.map(x=>ticker(x.row||x)).filter(Boolean);
    const purchased=Boolean(payday.completedAt||receipt.completedAt||saved.purchasedAt);
    const registered=Boolean(lastReg.at||saved.registeredAt);
    const regTicker=ticker(lastReg)||ticker({ticker:lastReg.ticker})||saved.ticker||'';
    let holdings=[];try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))holdings=state.holdings.filter(active)}catch(_){}
    const inSquad=registered&&regTicker&&holdings.some(row=>ticker(row)===regTicker);
    const stage=inSquad?5:registered?4:purchased?3:(route.length||tp.updatedAt)?2:1;
    const output={...saved,stage,routeTickers,purchasedAt:payday.completedAt||receipt.completedAt||saved.purchasedAt||'',registeredAt:lastReg.at||saved.registeredAt||'',ticker:regTicker||saved.ticker||'',updatedAt:new Date().toISOString()};write(LIFECYCLE_KEY,output);return output;
  }
  function insertScoutingLink(){
    const nav=document.querySelector('.fm-side-scroll');if(!nav||nav.querySelector('#scoutingSideMenu')||[...nav.querySelectorAll('a,summary')].some(a=>/Scouting Centre/i.test(a.textContent)))return;
    const recruitment=[...nav.querySelectorAll('.fm-nav-group')].find(x=>/Recruitment/i.test(x.textContent));if(!recruitment)return;
    const link=document.createElement('a');link.className='fm-side-link';link.href='AuroraCityFC_ScoutingCentre.html';link.innerHTML='<span class="fm-side-icon">⌕</span><span>Scouting Centre</span>';recruitment.insertAdjacentElement('afterend',link);
  }
  function syncNative(p,emit=false){
    const map={corePotInput:p.corePot,coreMonthlyInput:p.coreMonthly,etfPotInput:p.etfPot,etfMonthlyInput:p.etfMonthly,deploymentMonthInput:p.currentMonth};
    Object.entries(map).forEach(([id,value])=>{const el=q(id);if(el&&String(el.value)!==String(value)){el.value=value;if(emit){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}});
    const start=q('startingIncomeInput');if(start&&!start.value)start.value=p.startingIncome;
  }
  function health(p,m,life){
    let holdings=[];try{if(typeof state!=='undefined'&&Array.isArray(state?.holdings))holdings=state.holdings.filter(active)}catch(_){}
    const broken=[...document.images].filter(img=>img.complete&&img.naturalWidth===0).length;
    const names=holdings.map(ticker).filter(Boolean),dupes=[...new Set(names.filter((x,i)=>names.indexOf(x)!==i))];
    const hasScout=[...document.querySelectorAll('.fm-side-scroll a,.fm-side-scroll summary')].some(a=>/Scouting Centre/i.test(a.textContent));
    const lastRefresh=read(REFRESH_KEY,{});
    const checks=[
      {level:holdings.length?'ok':'warn',name:'AuroraMaster holdings',detail:holdings.length?`${holdings.length} active rows`:'waiting for data'},
      {level:hasScout?'ok':'bad',name:'Universal navigation',detail:hasScout?'8 departments linked':'Scouting link missing'},
      {level:broken?'warn':'ok',name:'Player and hero images',detail:broken?`${broken} failed image${broken===1?'':'s'}`:'all loaded'},
      {level:'ok',name:'Investment plan',detail:`${money(p.corePot+p.etfPot)} capital mission`},
      {level:dupes.length?'ok':'ok',name:'Account consolidation',detail:dupes.length?`${dupes.length} multi-account ticker${dupes.length===1?'':'s'} combined`:'no duplicates'},
      {level:lastRefresh.success===false?'warn':'ok',name:'Refresh protection',detail:lastRefresh.at?new Date(lastRefresh.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'ready'}
    ];
    const bad=checks.filter(x=>x.level==='bad').length,warn=checks.filter(x=>x.level==='warn').length;
    return {checks,level:bad?'bad':warn?'warn':'ok',label:bad?'Critical data issue':warn?'Attention required':'All systems operational'};
  }
  function missionMarkup(){return `<section id="auroraM4Mission" aria-label="Aurora M4 integrated mission control">
    <header class="m4-mission-head"><div><span class="m4-mission-kicker">Aurora M4 • integrated investment mission</span><h3>Ten-Month Income-Building Command</h3><p>One shared plan now controls the Transfer Centre, Analysis Room, Manager Dashboard and Boardroom. The £33,000 capital-release mission stays separate from the optional ten £1,500 paydays.</p></div><span class="m4-system-chip" id="m4SystemChip"><i></i><span>Checking systems</span></span></header>
    <div class="m4-mission-grid">
      <article class="m4-stat featured"><small>Capital-release mission</small><strong id="m4BaseCapital">—</strong><span>£25,000 share pot + £8,000 ETF pot</span></article>
      <article class="m4-stat"><small>Full 10-month cashflow</small><strong id="m4FullCapital">—</strong><span>Capital mission plus ten £1,500 paydays</span></article>
      <article class="m4-stat"><small>Base final income</small><strong id="m4BaseFinal">—</strong><span id="m4BaseFinalNote">At the current portfolio yield</span></article>
      <article class="m4-stat"><small>Full final income</small><strong id="m4FullFinal">—</strong><span id="m4FullFinalNote">Including regular paydays</span></article>
      <article class="m4-stat"><small>Progress to £625/month</small><strong id="m4TargetProgress">—</strong><span id="m4TargetNote">Calculating target month</span><div class="m4-target-track"><i id="m4TargetFill"></i></div></article>
    </div>
    <div class="m4-lifecycle"><div class="m4-lifecycle-title"><span>Signing lifecycle</span><span id="m4LifecycleStatus">Checking transfer state</span></div><div class="m4-lifecycle-steps" id="m4LifecycleSteps"></div></div>
    <details class="m4-mission-details"><summary>Plan editor, month-by-month schedule and system health</summary><div class="m4-details-body">
      <div class="m4-plan-editor"><div class="m4-editor-grid">
        <label class="m4-field"><span>Existing share pot</span><b>£</b><input id="m4CorePot" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>Share-pot release</span><b>£</b><input id="m4CoreMonthly" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>ETF-sale pot</span><b>£</b><input id="m4EtfPot" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>ETF monthly release</span><b>£</b><input id="m4EtfMonthly" type="number" min="0" step="100"></label>
        <label class="m4-field"><span>Regular payday</span><b>£</b><input id="m4PaydayMonthly" type="number" min="0" step="50"></label>
        <label class="m4-field"><span>Current plan month</span><b>#</b><input id="m4CurrentMonth" type="number" min="1" max="120" step="1"></label>
      </div><button class="m4-save" id="m4SavePlan" type="button">Save and sync the Aurora plan</button><span class="m4-editor-note">The base mission reports £33,000 invested. The full-cashflow view reports £48,000 when all ten regular paydays are included.</span></div>
      <div class="m4-health-box"><div class="m4-health-list" id="m4HealthList"></div></div>
      <div class="m4-month-table-wrap"><table class="m4-month-table"><thead><tr><th>Month</th><th>Share pot</th><th>ETF release</th><th>Capital mission</th><th>With payday</th><th>Base monthly income</th><th>Full monthly income</th></tr></thead><tbody id="m4MonthRows"></tbody></table></div>
    </div></details><div class="m4-updated" id="m4Updated">M4 plan loading…</div>
  </section>`;}
  function inject(){
    if(q('auroraM4Mission'))return;
    const hero=document.querySelector('.aurora-photo-hero,.hq-hero,.hero');
    if(hero)hero.insertAdjacentHTML('afterend',missionMarkup());
    else{const main=document.querySelector('main,.fm-workspace,.app');if(main)main.insertAdjacentHTML('afterbegin',missionMarkup());}
    q('m4SavePlan')?.addEventListener('click',()=>{
      const p=savePlan({corePot:Math.max(0,num(q('m4CorePot')?.value)||0),coreMonthly:Math.max(0,num(q('m4CoreMonthly')?.value)||0),etfPot:Math.max(0,num(q('m4EtfPot')?.value)||0),etfMonthly:Math.max(0,num(q('m4EtfMonthly')?.value)||0),paydayMonthly:Math.max(0,num(q('m4PaydayMonthly')?.value)||0),currentMonth:Math.max(1,Math.round(num(q('m4CurrentMonth')?.value)||1))});syncNative(p,true);update();
    });
  }
  function renderLifecycle(life){
    const labels=[['Plan approved','Deal sheet configured'],['Funds ready','Monthly release available'],['Purchases completed','Broker fills recorded'],['Registered','AuroraData updated'],['Added to squad','Holding confirmed live']];
    q('m4LifecycleSteps').innerHTML=labels.map((item,index)=>{const n=index+1;return `<div class="m4-step ${life.stage>n?'done':life.stage===n?'current':''}" data-step="${n}"><strong>${item[0]}</strong><span>${n===4&&life.ticker?`${life.ticker} latest registration`:item[1]}</span></div>`}).join('');
    const stageText=['Mission configured','Funds and route ready','Purchase execution complete','Registration confirmed','Signing live in the squad'][Math.max(0,life.stage-1)];q('m4LifecycleStatus').textContent=stageText;
  }
  function renderMediaStory(life){
    const box=q('breakingStories');if(!box||life.stage<3)return;
    const existing=q('m4SigningStory');if(existing)return;
    const tickerText=life.ticker||life.routeTickers?.join(' / ')||'Aurora signing';
    const node=document.createElement('div');node.id='m4SigningStory';node.className='row m4-signing-story';node.innerHTML=`<div class="icon">📝</div><div><strong>${tickerText} — signing lifecycle update</strong><span>${life.stage>=5?'Registration confirmed and the player is now live in the Aurora squad.':life.stage>=4?'Purchase registered with AuroraData; awaiting the refreshed squad confirmation.':'Broker purchases completed; registration is the next action.'}</span></div><div class="score-pill">M4</div>`;box.prepend(node);
  }
  function update(){
    inject();insertScoutingLink();const p=plan();syncNative(p,false);const m=metrics(),proj=projections(p,m),life=lifecycle(),h=health(p,m,life);
    [['m4CorePot',p.corePot],['m4CoreMonthly',p.coreMonthly],['m4EtfPot',p.etfPot],['m4EtfMonthly',p.etfMonthly],['m4PaydayMonthly',p.paydayMonthly],['m4CurrentMonth',p.currentMonth]].forEach(([id,value])=>{const el=q(id);if(el&&document.activeElement!==el)el.value=value});
    q('m4BaseCapital').textContent=money(proj.baseCapital);q('m4FullCapital').textContent=money(proj.fullCapital);q('m4BaseFinal').textContent=`${money(proj.baseFinal)}/yr`;q('m4FullFinal').textContent=`${money(proj.fullFinal)}/yr`;q('m4BaseFinalNote').textContent=`${money(proj.baseFinal/12)}/month at ${(m.yieldRate*100).toFixed(2)}%`;q('m4FullFinalNote').textContent=`${money(proj.fullFinal/12)}/month including paydays`;
    const progress=Math.max(0,Math.min(100,(m.annual/12)/p.monthlyTarget*100));q('m4TargetProgress').textContent=`${progress.toFixed(1)}%`;q('m4TargetFill').style.width=`${progress}%`;q('m4TargetNote').textContent=proj.targetMonth?`Full-cashflow route reaches target around month ${proj.targetMonth}`:`Target remains beyond the 10-month mission`;
    q('m4MonthRows').innerHTML=proj.rows.map(row=>`<tr><td><strong>Month ${row.month}</strong></td><td>${money(row.release.core)}</td><td>${money(row.release.etf)}</td><td class="m4-base">${money(row.base)}</td><td class="m4-full">${money(row.full)}</td><td>${money(row.baseIncome/12)}</td><td>${money(row.fullIncome/12)}</td></tr>`).join('');
    renderLifecycle(life);const chip=q('m4SystemChip');chip.className=`m4-system-chip ${h.level==='ok'?'':h.level}`.trim();chip.querySelector('span').textContent=h.label;q('m4HealthList').innerHTML=h.checks.map(x=>`<div class="m4-health-row ${x.level}"><i></i><strong>${x.name}</strong><span>${x.detail}</span></div>`).join('');q('m4Updated').textContent=`Shared plan synced ${p.updatedAt?new Date(p.updatedAt).toLocaleString('en-GB'):'for Aurora M4'} • Live planning yield ${(m.yieldRate*100).toFixed(2)}%`;
    renderMediaStory(life);
  }
  function bind(){
    document.addEventListener('click',event=>{
      if(event.target.closest('#refreshBtn')){write(REFRESH_KEY,{at:new Date().toISOString(),success:true});setTimeout(update,1800);setTimeout(update,6000);}
      if(event.target.closest('#completePaydayWindow'))setTimeout(()=>{const saved=read(LIFECYCLE_KEY,{});write(LIFECYCLE_KEY,{...saved,purchasedAt:new Date().toISOString(),stage:3});update();},500);
    },true);
    document.addEventListener('submit',event=>{if(event.target.closest?.('[data-registration-form]'))setTimeout(update,2400);},true);
    ['corePotInput','coreMonthlyInput','etfPotInput','etfMonthlyInput','deploymentMonthInput'].forEach(id=>q(id)?.addEventListener('change',()=>{const p=plan();const values={corePot:num(q('corePotInput')?.value),coreMonthly:num(q('coreMonthlyInput')?.value),etfPot:num(q('etfPotInput')?.value),etfMonthly:num(q('etfMonthlyInput')?.value),currentMonth:num(q('deploymentMonthInput')?.value)};savePlan({...p,...Object.fromEntries(Object.entries(values).filter(([,v])=>Number.isFinite(v)))});update();}));
    window.addEventListener('storage',event=>{if([PLAN_KEY,LIFECYCLE_KEY,'aurora_registration_last_v1','aurora_payday_execution_v1'].includes(event.key))update();});
    window.addEventListener('aurora:m4-update',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
  }
  function start(){migrate();inject();bind();syncNative(plan(),true);update();setTimeout(update,1800);setTimeout(update,5500);}
  window.AuroraM4={plan,savePlan,update,metrics,lifecycle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(function(){
  'use strict';
  const root=document.documentElement;
  const title=(document.title||'').toLowerCase();
  const page=title.includes('manager dashboard')?'manager':title.includes('squad hub')?'squad':title.includes('analysis')?'analysis':title.includes('training')?'training':title.includes('scouting')?'scouting':title.includes('transfer')?'transfer':title.includes('boardroom')?'boardroom':title.includes('media')?'media':'aurora';
  const MOTION_KEY='aurora_motion_level_v1';
  const levels=['full','subtle','off'];
  root.dataset.auroraPage=page;

  function savedLevel(){
    try{const value=localStorage.getItem(MOTION_KEY);if(levels.includes(value))return value}catch(_){}
    return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'full';
  }
  function label(level){return level==='full'?'Full':level==='subtle'?'Subtle':'Off'}
  function applyLevel(level,announce=false){
    const next=levels.includes(level)?level:'full';root.dataset.auroraMotion=next;
    try{localStorage.setItem(MOTION_KEY,next)}catch(_){}
    const btn=document.getElementById('auroraMotionToggle');
    if(btn){const value=btn.querySelector('[data-motion-value]');if(value)value.textContent=label(next);btn.title=`Aurora animations: ${label(next)}`;btn.setAttribute('aria-label',`Aurora animations ${label(next)}. Tap to change.`)}
    if(announce) flashValue(btn);
  }
  function installToggle(){
    if(document.getElementById('auroraMotionToggle'))return;
    const footer=document.querySelector('.fm-side-footer');if(!footer)return;
    const btn=document.createElement('button');btn.type='button';btn.id='auroraMotionToggle';btn.className='fm-side-action aurora-motion-toggle';btn.innerHTML='<span class="fm-side-icon">✦</span><span>Motion: <b data-motion-value>Full</b></span>';
    const clock=footer.querySelector('.fm-side-clock');footer.insertBefore(btn,clock||null);
    btn.addEventListener('click',()=>{const current=root.dataset.auroraMotion||'full';applyLevel(levels[(levels.indexOf(current)+1)%levels.length],true)});
    applyLevel(root.dataset.auroraMotion||savedLevel());
  }
  function flashValue(el){if(!el)return;el.classList.remove('aurora-value-updated');void el.offsetWidth;el.classList.add('aurora-value-updated');setTimeout(()=>el.classList.remove('aurora-value-updated'),900)}
  function observeValue(selector){
    const el=document.querySelector(selector);if(!el)return;
    let last=el.textContent;
    new MutationObserver(()=>{const now=el.textContent;if(now!==last&&now.trim()&&now.trim()!=='—'){last=now;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true});
  }
  function refreshWave(){
    document.querySelector('.aurora-refresh-wave')?.remove();const wave=document.createElement('div');wave.className='aurora-refresh-wave';wave.setAttribute('aria-hidden','true');document.body.appendChild(wave);setTimeout(()=>wave.remove(),1200);
    if(page==='scouting'){root.classList.add('aurora-scan-boost');setTimeout(()=>root.classList.remove('aurora-scan-boost'),3200)}
  }
  function bindRefresh(){document.addEventListener('click',event=>{if(event.target.closest?.('#refreshBtn,.refresh-btn,[data-refresh]'))refreshWave()},true)}
  function decorateManager(){
    ['#beastCurrentMonthly','#beastTargetPercent','#beastRating','#monthlyIncome','#heroAnnualIncome'].forEach(observeValue);
    const badge=document.getElementById('beastNotificationCount'),button=document.getElementById('beastNotificationButton');
    if(badge&&button){let previous=Number(badge.textContent)||0;const alert=()=>{const current=badge.hidden?0:(Number(badge.textContent)||0);if(current>previous&&current>0){button.classList.remove('aurora-alert-arrival');void button.offsetWidth;button.classList.add('aurora-alert-arrival');setTimeout(()=>button.classList.remove('aurora-alert-arrival'),1400)}previous=current};new MutationObserver(alert).observe(badge,{attributes:true,childList:true,subtree:true,characterData:true});alert()}
    const strip=document.getElementById('beastHoldingStrip');const decorate=()=>{strip?.querySelectorAll('.beast-holding-card').forEach(card=>{card.classList.toggle('aurora-form-review',!!card.querySelector('.beast-status-review'));card.classList.toggle('aurora-form-strong',!!card.querySelector('.beast-status-strong'))})};if(strip){new MutationObserver(decorate).observe(strip,{childList:true,subtree:true});decorate()}
  }
  function decorateScouting(){
    const command=document.querySelector('.command-radar');if(command&&!command.querySelector('.aurora-command-blip')){[['29%','37%','0s'],['67%','29%','.7s'],['73%','68%','1.35s'],['38%','73%','2s']].forEach(([left,top,delay])=>{const dot=document.createElement('i');dot.className='aurora-command-blip';dot.style.left=left;dot.style.top=top;dot.style.setProperty('--delay',delay);command.appendChild(dot)})}
    const field=document.getElementById('radarField');const decorate=()=>{const blips=[...(field?.querySelectorAll('.radar-blip')||[])];blips.forEach((blip,index)=>{blip.style.setProperty('--aurora-blip-delay',`${(index%7)*.22}s`);blip.classList.toggle('aurora-priority-blip',index===0)})};if(field){new MutationObserver(decorate).observe(field,{childList:true,subtree:true});decorate()}
    ['#commandTitle','#kpiScouted','#kpiProspects','#kpiGems','#directorScore'].forEach(observeValue);
  }
  function decorateTransfer(){
    ['#m4TargetProgress','#m4FullCapital','#m4BaseFinal','#m4FullFinal'].forEach(observeValue);
    let lastStage='';const lifecycle=document.getElementById('m4LifecycleSteps');const decorateStages=()=>{const current=lifecycle?.querySelector('.m4-step.current');const stage=current?.dataset.step||'';if(stage&&stage!==lastStage){lastStage=stage;current.classList.add('aurora-stage-change');setTimeout(()=>current.classList.remove('aurora-stage-change'),950)}};if(lifecycle){new MutationObserver(decorateStages).observe(lifecycle,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});decorateStages()}
    const decorateRows=()=>{const rows=[...(document.querySelectorAll('#m4MonthRows tr')||[])];const month=Math.max(1,Number(document.getElementById('m4CurrentMonth')?.value)||1);rows.forEach((row,index)=>row.classList.toggle('aurora-current-plan-row',index===month-1))};const tbody=document.getElementById('m4MonthRows');if(tbody){new MutationObserver(decorateRows).observe(tbody,{childList:true,subtree:true});decorateRows()}document.getElementById('m4CurrentMonth')?.addEventListener('input',decorateRows);
    document.querySelectorAll('.registration-message').forEach(observeRegistrationMessage);
    const registration=document.getElementById('registration-desk');if(registration)new MutationObserver(()=>registration.querySelectorAll('.registration-message').forEach(observeRegistrationMessage)).observe(registration,{childList:true,subtree:true});
  }
  function observeRegistrationMessage(el){if(!el||el.dataset.motionObserved)return;el.dataset.motionObserved='1';let last=el.textContent;new MutationObserver(()=>{if(el.textContent!==last){last=el.textContent;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})}
  function decorateSquad(){
    const income=document.getElementById('annualIncome')?.closest('.squad-card');income?.classList.add('aurora-income-card');['#annualIncome','#monthlyIncome','#squadStrength'].forEach(observeValue);
    const body=document.getElementById('teamSelectionBody');const decorate=()=>{body?.querySelectorAll('.player-row').forEach(row=>{const positive=!!row.querySelector('.positive')||/[▲+]/.test(row.textContent);const negative=!!row.querySelector('.negative')||/▼/.test(row.textContent);row.classList.toggle('aurora-positive-row',positive&&!negative);row.classList.toggle('aurora-negative-row',negative)})};if(body){new MutationObserver(()=>{decorate();body.querySelectorAll('.player-row').forEach(row=>{const cls=row.classList.contains('aurora-negative-row')?'aurora-row-flash-negative':'aurora-row-flash-positive';row.classList.add(cls);setTimeout(()=>row.classList.remove(cls),1250)})}).observe(body,{childList:true,subtree:true});decorate()}
  }
  function decorateAnalysis(){
    document.getElementById('bestPerformer')?.closest('.score-card')?.classList.add('aurora-best-card');['#bestPerformer','#positiveMovers','#negativeMovers','#analysisStatus'].forEach(observeValue);
    const table=document.getElementById('playerTable');const decorate=()=>{table?.querySelectorAll('tr').forEach(row=>{if(row.querySelector('.positive'))row.classList.add('aurora-positive-row');if(row.querySelector('.negative'))row.classList.add('aurora-negative-row')})};if(table){new MutationObserver(()=>{decorate();table.querySelectorAll('tr.aurora-positive-row').forEach(r=>{r.classList.add('aurora-row-flash-positive');setTimeout(()=>r.classList.remove('aurora-row-flash-positive'),1200)});table.querySelectorAll('tr.aurora-negative-row').forEach(r=>{r.classList.add('aurora-row-flash-negative');setTimeout(()=>r.classList.remove('aurora-row-flash-negative'),1200)})}).observe(table,{childList:true,subtree:true});decorate()}
  }
  function decorateTraining(){
    ['#topHeadline','#dividendCount','#rumourCount','#pressMood'].forEach(observeValue);
    const rising=document.getElementById('risingStars'),medical=document.getElementById('medicalRoom');const decorate=()=>medical?.querySelectorAll('.row').forEach(row=>row.classList.toggle('aurora-medical-watch',!!row.querySelector('.score-pill.red')));if(rising)new MutationObserver(()=>{const first=rising.querySelector('.row:first-child');if(first)flashValue(first)}).observe(rising,{childList:true,subtree:true});if(medical){new MutationObserver(decorate).observe(medical,{childList:true,subtree:true});decorate()}
  }
  function decorateBoardroom(){['#boardConfidence','#confidenceGaugeScore','#supporterMood','#jobSecurity','#priorityObjective'].forEach(observeValue)}
  function decorateMedia(){
    ['#topHeadline','#pressMood','#dividendCount','#rumourCount'].forEach(observeValue);
    const breaking=document.getElementById('breakingStories'),divs=document.getElementById('dividendDesk');if(breaking)new MutationObserver(()=>{const first=breaking.querySelector('.row:first-child');if(first)flashValue(first)}).observe(breaking,{childList:true,subtree:true});if(divs)new MutationObserver(()=>{const first=divs.querySelector('.row:first-child');if(first)flashValue(first)}).observe(divs,{childList:true,subtree:true});
  }
  function start(){
    applyLevel(savedLevel());installToggle();bindRefresh();
    ({manager:decorateManager,scouting:decorateScouting,transfer:decorateTransfer,squad:decorateSquad,analysis:decorateAnalysis,training:decorateTraining,boardroom:decorateBoardroom,media:decorateMedia}[page]||(()=>{}))();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(()=>{
  const PAGE='squad';
  const ROUTES={"nexus":"AuroraCityFC_NexusMaster.html","finance":"AuroraCityFC_FinanceDepartment.html","manager":"AuroraCityFC_ManagerDashboard.html","transfer":"AuroraCityFC_TransferCentre.html","squad":"AuroraCityFC_SquadHub.html","boardroom":"AuroraCityFC_Boardroom.html","analysis":"AuroraCityFC_AnalysisRoom.html","training":"AuroraCityFC_TrainingGround.html","scouting":"AuroraCityFC_ScoutingCentre.html","media":"AuroraCityFC_MediaCentre.html"};
  const FINANCE_KEY='aurora_finance_department_mission_v1';
  const LEGACY_KEY='aurora_wealth_investment_mission_v1';
  const TEST_KEY='aurora_transfer_test_mode_v1';
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
  const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value||0));
  const mission=()=>read(FINANCE_KEY)||read(LEGACY_KEY);
  function mirrorMission(){const canonical=read(FINANCE_KEY),legacy=read(LEGACY_KEY);if(canonical&&!legacy)write(LEGACY_KEY,canonical);else if(legacy&&!canonical)write(FINANCE_KEY,{...legacy,source:legacy.source||'Finance Department'});}
  function patchLinks(){
    const map=[
      [/(?:AuroraCityFC_)?NexusMaster(?:_Connected_v\\d+|\\(\\d+\\))?\\.html/i,ROUTES.nexus],
      [/(?:SpendingPlannerMaster[^?#\"']*|AuroraWealthExecutiveRoom_Connected_v\\d+)\\.html/i,ROUTES.finance],
      [/AuroraCityFC_ManagerDashboard(?:\\(\\d+\\))?\\.html/i,ROUTES.manager],
      [/AuroraCityFC_TransferCentre(?:\\(\\d+\\)[^?#\"']*)?\\.html/i,ROUTES.transfer],
      [/AuroraCityFC_SquadHub(?:\\(\\d+\\))?\\.html/i,ROUTES.squad],
      [/AuroraCityFC_Boardroom(?:\\(\\d+\\))?\\.html/i,ROUTES.boardroom],
      [/AuroraCityFC_AnalysisRoom(?:\\(\\d+\\))?\\.html/i,ROUTES.analysis],
      [/AuroraCityFC_TrainingGround(?:\\(\\d+\\))?\\.html/i,ROUTES.training],
      [/AuroraCityFC_ScoutingCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.scouting],
      [/AuroraCityFC_MediaCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.media],
      [/TradingBrainMaster(?:_Connected_v\\d+)?\\.html/i,ROUTES.scouting],
      [/RegistrationDesk\\.html/i,ROUTES.transfer+'#registration-desk']
    ];
    document.querySelectorAll('a[href]').forEach(a=>{let href=a.getAttribute('href')||'';map.forEach(([rx,to])=>{href=href.replace(rx,to)});a.setAttribute('href',href)});
  }
  function addConnectedCard(){
    if(document.getElementById('auroraConnectedFinanceCard'))return;
    const card=document.createElement('section');card.id='auroraConnectedFinanceCard';card.className='aurora-connected-card';
    card.innerHTML='<div class="aurora-connected-card-inner"><div><small>Connected finance pipeline</small><strong data-card-title>Finance Department linked</strong><span data-card-copy>Checking the current payday investment mission…</span></div><div class="aurora-connected-actions"><a href="'+ROUTES.finance+'">Open Finance</a><a class="primary" href="'+ROUTES.transfer+'">Open Transfer Centre</a></div></div>';
    const target=document.querySelector('.transfer-hero,.hq-hero,.hero,.hero-card');
    if(target&&target.parentElement)target.insertAdjacentElement('afterend',card);else document.body.insertAdjacentElement('afterbegin',card);
  }
  function refresh(){
    mirrorMission();const m=mission();const test=read(TEST_KEY);const budget=Number(m?.budget||m?.investmentBudget||m?.amount||0);const account=m?.preferredAccount||m?.preferredPlatform||'Investment account';
    const summary=document.querySelector('[data-aurora-finance-summary]');
    if(summary)summary.textContent=m&&budget>0?`Finance Department linked • ${money(budget)} authorised • ${account}`:'Finance Department linked • no mission released';
    const title=document.querySelector('#auroraConnectedFinanceCard [data-card-title]');const copy=document.querySelector('#auroraConnectedFinanceCard [data-card-copy]');
    if(title)title.textContent=m&&budget>0?`${money(budget)} investment mission authorised`:'Finance Department linked';
    if(copy)copy.textContent=m&&budget>0?`${account} • payday ${m.paydayDate||'not set'} • ${Array.isArray(m.fundingSources)?m.fundingSources.length:1} funding source${Array.isArray(m.fundingSources)&&m.fundingSources.length===1?'':'s'}`:'Build the payday plan in Finance Department, then release the complete budget to the Transfer Centre.';
    document.querySelectorAll('[data-aurora-nav-status]').forEach(el=>{const name=el.dataset.auroraNavStatus;el.className='aurora-system-status';if(name==='finance'){el.textContent=budget>0?money(budget):'NO MISSION';el.classList.add(budget>0?'good':'watch')}else if(name==='transfer'){el.textContent=budget>0?'BUDGET READY':'WAITING';el.classList.add(budget>0?'cyan':'')}else if(name===PAGE){el.textContent='OPEN';el.classList.add('cyan')}else el.textContent='LINKED'});
    document.body.classList.toggle('aurora-transfer-test-active',!!test?.active);
  }
  function init(){
    document.querySelectorAll('.aurora-smart-dock').forEach(el=>el.style.setProperty('display','none','important'));
    patchLinks();addConnectedCard();refresh();
    const dock=document.querySelector('.aurora-system-dock');dock?.querySelector('.aurora-system-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else location.href=ROUTES.nexus});
    let lastY=scrollY||0,ticking=false,timer;const show=()=>dock?.classList.remove('is-hidden'),hide=()=>dock?.classList.add('is-hidden');
    addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY||0,max=Math.max(0,document.documentElement.scrollHeight-innerHeight),nearBottom=max-y<70;if(nearBottom||y<12||y<lastY-6)show();else if(y>lastY+6)hide();lastY=y;clearTimeout(timer);timer=setTimeout(show,180);ticking=false})},{passive:true});
    addEventListener('storage',e=>{if([FINANCE_KEY,LEGACY_KEY,TEST_KEY].includes(e.key))refresh()});addEventListener('aurora:finance-mission',refresh);addEventListener('aurora:wealth-mission',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

})();

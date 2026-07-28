/* Aurora City FC Boardroom — extracted page logic */
(function(){
'use strict';
const AURORA_MASTER_URL = "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";
let AURORA_MASTER_CACHE = null;
const MASTER_TABS = [
  'Holdings',
  'Dividends',
  'Watchlist',
  'Global Watchlist',
  'AuroraScout',
  'DailyPriceSummary',
  'LivePrices',
  'PriceLog',
  'IncomeLog',
  'FXRates',
  'PreSeasonReport',
  'AuroraTimes',
  'MoraleLog',
  'ManagerInbox',
  'TrainingLog',
  'BoardConfidence',
  'Awards',
  'AuroraFixtures',
  'Milestones',
  'AuroraRules'
];
let state = {
  holdings:[],
  dividends:[],
  watchlist:[],
  globalWatchlist:[],
  scout:[],
  dailyPriceSummary:[],
  livePrices:[],
  priceLog:[],
  income:[],
  fxRates:[],
  preSeasonReport:[],
  news:[],
  moraleLog:[],
  managerInbox:[],
  trainingLog:[],
  boardConfidence:[],
  awards:[],
  fixtures:[],
  milestones:[],
  rules:[],
  tabs:{}
};

const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n) : '—';

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
function uniqueByTicker(rows){
  const map = new Map();
  rows.forEach(r=>{
    const t = cleanTicker(r.ticker);
    if(!t) return;
    const existing = map.get(t);
    if(!existing || (buyStrength(r)||impact(r)||0) > (buyStrength(existing)||impact(existing)||0)) map.set(t,r);
  });
  return [...map.values()];
}
function holdingStatus(row){
  return String(row?.status ?? row?.Status ?? row?.holding_status ?? row?.HoldingStatus ?? '').trim().toLowerCase();
}
function holdingQuantity(row){
  return parseNum(row?.shares ?? row?.quantity ?? row?.units ?? row?.Shares ?? row?.Quantity ?? row?.Units);
}
function holdingMarketValue(row){
  return parseNum(row?.current_value ?? row?.market_value ?? row?.holding_value ?? row?.value ?? row?.Value ?? row?.['Market Value']);
}
function isActiveHolding(row){
  const status = holdingStatus(row);
  if(/sold|exit|exited|closed|removed|inactive/.test(status)) return false;
  const quantity = holdingQuantity(row);
  const value = holdingMarketValue(row);
  return (Number.isFinite(quantity) && quantity > 0) || (Number.isFinite(value) && value > 0);
}
function activeHoldings(){
  return (Array.isArray(state.holdings) ? state.holdings : []).filter(isActiveHolding);
}
function annualIncomeFromRow(row){
  const total = parseNum(row.annual_dps_total ?? row.Annual_DPS_Total ?? row["Annual DPS Total"]);
  if(Number.isFinite(total)) return total;
  const direct = parseNum(row.annual_income ?? row.income_annual ?? row.dividend_income ?? row.AnnualIncome ?? row["Annual Income"]);
  if(Number.isFinite(direct)) return direct;
  const value = parseNum(row.current_value ?? row.market_value ?? row.value ?? row.Value);
  const y = parseYield(row);
  if(Number.isFinite(value) && Number.isFinite(y)) return value * y;
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const dps = parseNum(row.annual_dps ?? row.dps ?? row.dividend_per_share);
  if(Number.isFinite(shares) && Number.isFinite(dps)) return shares * dps;
  return 0;
}
function portfolioAnnualIncome(){
  return activeHoldings().reduce((sum,row)=>sum + annualIncomeFromRow(row),0);
}
function portfolioValue(){
  return activeHoldings().reduce((sum,row)=>{
    const v = holdingMarketValue(row);
    return sum + (Number.isFinite(v) ? v : 0);
  },0);
}
function avgBuyStrength(){
  const rows = uniqueByTicker(activeHoldings());
  const vals = rows.map(buyStrength).filter(Number.isFinite);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 70;
}
function targetRows(){
  return uniqueByTicker([...(state.watchlist||[]), ...(state.globalWatchlist||[]), ...(state.scout||[])])
    .filter(r => Number.isFinite(impact(r)) || Number.isFinite(buyStrength(r)))
    .sort((a,b)=>(impact(b)||buyStrength(b)||0)-(impact(a)||buyStrength(a)||0));
}
function val(row,...keys){
  for(const k of keys){
    if(row && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return '';
}
function yes(v){
  return ['yes','y','true','1','published','show'].includes(String(v||'').trim().toLowerCase());
}
function clampScore(n){
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
}
function isPublishedNews(row){
  const status = String(val(row,'Status','status')).trim().toLowerCase();
  return !status || status === 'published';
}
function newsDate(row){
  const d = val(row,'Date','date');
  const t = val(row,'Time','time') || '00:00';
  const parsed = new Date(`${d} ${t}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
function boardroomNewsRows(){
  return (state.news || [])
    .filter(isPublishedNews)
    .filter(row => {
      const media = val(row,'Display_In_Media','display_in_media','Display In Media');
      const home = val(row,'Display_On_Home','display_on_home','Display On Home');
      return !media && !home ? true : yes(media) || yes(home);
    })
    .sort((a,b)=>newsDate(b)-newsDate(a));
}
function summedNewsImpact(...keys){
  return boardroomNewsRows().reduce((sum,row)=>{
    const raw = val(row,...keys);
    const n = parseNum(raw);
    return sum + (Number.isFinite(n) ? n : 0);
  },0);
}
function latestBoardMetric(...keys){
  const rows = Array.isArray(state.boardConfidence) ? state.boardConfidence : [];
  for(const row of rows.slice().reverse()){
    const n = parseNum(val(row,...keys));
    if(Number.isFinite(n)) return n;
  }
  return NaN;
}
function newsIcon(row){
  const cat = String(val(row,'Category','category')).toLowerCase();
  if(cat.includes('buyback')) return '🔁';
  if(cat.includes('dividend')) return '💷';
  if(cat.includes('inflation') || cat.includes('economy')) return '📊';
  if(cat.includes('rate')) return '🏦';
  if(cat.includes('scout')) return '🔎';
  if(cat.includes('board')) return '👔';
  return '📰';
}
function currentReputation(annualIncome){
  const monthly = annualIncome / 12;
  const ladder = [
    {label:'Local Club', monthly:0},
    {label:'Regional Club', monthly:100},
    {label:'National Club', monthly:250},
    {label:'Championship Club', monthly:500},
    {label:'Premier League Club', monthly:1000},
    {label:'European Giant', monthly:2000},
    {label:'World Class Club', monthly:3000},
    {label:'Club World Champion', monthly:5000}
  ];
  let current = ladder[0];
  for(const step of ladder){ if(monthly >= step.monthly) current = step; }
  const next = ladder.find(step=>monthly < step.monthly);
  return { current, next, monthly };
}
async function fetchTab(tab){
  if(!AURORA_MASTER_CACHE){
    const res = await fetch(AURORA_MASTER_URL, { cache:'no-store' });
    if(!res.ok) throw new Error(`AuroraData failed: ${res.status}`);
    AURORA_MASTER_CACHE = await res.json();
  }
  return Array.isArray(AURORA_MASTER_CACHE?.[tab]) ? AURORA_MASTER_CACHE[tab] : [];
}
async function loadData(){
  const btn = $('refreshBtn');
  if(btn){ btn.textContent = 'Loading…'; btn.disabled = true; }
  try{
    const tabPairs = await Promise.all(
      MASTER_TABS.map(async tab => [tab, await fetchTab(tab).catch(()=>[])])
    );
    const tabs = Object.fromEntries(tabPairs);
    state = {
      holdings: tabs['Holdings'] || [],
      dividends: tabs['Dividends'] || [],
      watchlist: tabs['Watchlist'] || [],
      globalWatchlist: tabs['Global Watchlist'] || [],
      scout: tabs['AuroraScout'] || [],
      dailyPriceSummary: tabs['DailyPriceSummary'] || [],
      livePrices: tabs['LivePrices'] || [],
      priceLog: tabs['PriceLog'] || [],
      income: tabs['IncomeLog'] || [],
      fxRates: tabs['FXRates'] || [],
      preSeasonReport: tabs['PreSeasonReport'] || [],
      news: tabs['AuroraTimes'] || [],
      moraleLog: tabs['MoraleLog'] || [],
      managerInbox: tabs['ManagerInbox'] || [],
      trainingLog: tabs['TrainingLog'] || [],
      boardConfidence: tabs['BoardConfidence'] || [],
      awards: tabs['Awards'] || [],
      fixtures: tabs['AuroraFixtures'] || [],
      milestones: tabs['Milestones'] || [],
      rules: tabs['AuroraRules'] || [],
      tabs
    };
    renderAll();
  }catch(err){
    console.error(err);
    const fail = `<div class="loading error">${err.message || 'Unable to load AuroraData'}</div>`;
    if(!(state.holdings||[]).length) ['objectiveList','financeOversight','clubHealth','boardNews'].forEach(id=>{ if($(id)) $(id).innerHTML = fail; });
  }finally{
    if(btn){ btn.textContent = 'Refresh'; btn.disabled = false; }
  }
}
function boardScoreCalc(annualIncome, value, avgStrength){
  const monthly = annualIncome / 12;
  const incomeScore = Math.min(100, Math.max(55, (monthly / 625) * 100));
  const strengthScore = Math.min(100, Math.max(55, avgStrength));
  const disciplineScore = 94;
  const growthPlanScore = monthly >= 400 ? 92 : monthly >= 250 ? 86 : 78;
  return Math.round((incomeScore * .30) + (strengthScore * .25) + (disciplineScore * .25) + (growthPlanScore * .20));
}
function supporterScoreCalc(avgStrength, targets){
  const targetScore = targets[0] ? Math.min(100, impact(targets[0]) || buyStrength(targets[0]) || 75) : 75;
  return Math.round((avgStrength * .55) + (targetScore * .45));
}

function signedImpact(n){
  const value = Number(n) || 0;
  if(!value) return '';
  return value > 0 ? ` • News +${value}` : ` • News ${value}`;
}
function supporterMoodText(score){
  return score >= 88 ? 'Fans are buzzing' : score >= 78 ? 'Fans are behind the plan' : 'Fans want progress';
}

function scoreLabel(score){
  if(score >= 90) return 'Excellent';
  if(score >= 82) return 'Strong';
  if(score >= 74) return 'Stable';
  return 'Building';
}
function renderBoardRows(id, rows){
  $(id).innerHTML = rows.map((r,i)=>`
    <div class="board-row">
      <div class="board-icon">${r.icon}</div>
      <div><strong>${r.title}</strong><span>${r.note}</span></div>
      <div class="board-pill">${r.value}</div>
    </div>`).join('');
}
function renderObjectives(monthly){
  const objectives = [
    {title:'Reach £625/month income', note:'Current season promotion target', target:625, value:monthly},
    {title:'Reach £1,000/month income', note:'Premier League club status', target:1000, value:monthly},
    {title:'Reach £2,000/month income', note:'Long-term passive income mission', target:2000, value:monthly},
    {title:'Protect the transfer discipline', note:'No panic buying, no goblin punts', target:100, value:94}
  ];
  $('objectiveList').innerHTML = objectives.map(o=>{
    const pct = Math.min(100, Math.max(0, (o.value / o.target) * 100));
    return `<div class="objective-card">
      <strong>${o.title}</strong>
      <span>${o.note} • ${Math.round(pct)}% complete</span>
      <div class="progress-wrap"><div class="progress-fill" style="--pct:${pct}%"></div></div>
    </div>`;
  }).join('');
}

let boardMinutesItems = [];

function riskLevelClass(level){
  return String(level || '').toLowerCase().replace(/\s+/g,'-');
}
function createBoardItem(id, icon, title, note, status, from, category, body, actions){
  return {id, icon, title, note, status, from, category, body, actions};
}
function renderExecutiveControl(boardScore, supporterScore, monthly, annualIncome, rep, avgStrength, targets){
  const nextGap = rep.next ? Math.max(0, (rep.next.monthly * 12) - annualIncome) : 0;
  const nextDecision = boardScore >= 82
    ? 'Approve disciplined strategy'
    : 'Demand clearer income progress';
  const decisionText = boardScore >= 82
    ? 'The board should continue backing the current income plan, with payday transfers reviewed only when the numbers justify it.'
    : 'The board wants stronger evidence of progress before approving aggressive transfer activity.';

  if($('chairmanVerdictTitle')) $('chairmanVerdictTitle').textContent = boardScore >= 90 ? 'Chairman delighted with club direction' : boardScore >= 82 ? 'Chairman backs the gaffer' : 'Chairman wants a cleaner plan';
  if($('chairmanVerdictText')) $('chairmanVerdictText').textContent = boardScore >= 90
    ? 'The club is moving like a promotion machine. Income growth, supporter mood and transfer discipline are all aligned.'
    : boardScore >= 82
      ? 'The board is supportive. Keep income growing, avoid panic buying and continue building toward the next reputation step.'
      : 'The board is stable, but wants clearer progress toward the next monthly income milestone before the next review.';
  if($('chairmanConfidence')) $('chairmanConfidence').textContent = `${boardScore}%`;
  if($('chairmanSupporters')) $('chairmanSupporters').textContent = `${supporterScore}%`;
  if($('chairmanNextTarget')) $('chairmanNextTarget').textContent = rep.next ? `${money(rep.next.monthly)}/m` : 'Dynasty';
  if($('nextBoardDecisionTitle')) $('nextBoardDecisionTitle').textContent = nextDecision;
  if($('nextBoardDecisionText')) $('nextBoardDecisionText').textContent = decisionText;

  const agenda = [
    createBoardItem(
      'agenda-income',
      '📈',
      'Income growth review',
      `Current income is ${money(monthly)}/month. ${rep.next ? money(nextGap) + ' annual gap to ' + rep.next.label + '.' : 'Elite ladder status active.'}`,
      rep.next ? 'Active' : 'Complete',
      'Finance Director',
      'Agenda',
      `<p><strong>Agenda item:</strong> The board reviewed the current income run-rate of <strong>${money(monthly)}/month</strong>.</p><p>${rep.next ? `The next reputation step is <strong>${rep.next.label}</strong>, with an annual gap of around <strong>${money(nextGap)}</strong>.` : 'The club is in elite territory, so the discussion now shifts to maintaining standards.'}</p>`,
      [['Monthly income', money(monthly)], ['Annual income', money(annualIncome)], ['Next target', rep.next ? rep.next.label : 'Elite']]
    ),
    createBoardItem(
      'agenda-transfer',
      '💼',
      'Transfer discipline',
      'Board policy remains: no panic buys, no goblin punts, only justified upgrades.',
      'Controlled',
      'Recruitment Committee',
      'Agenda',
      '<p><strong>Agenda item:</strong> The board reviewed transfer discipline and confirmed that payday activity should only proceed when income impact, valuation and squad chemistry all support the decision.</p><p>The official board line remains: no panic buying.</p>',
      [['Policy', 'No panic buys'], ['Risk', 'Controlled'], ['Decision', 'Review only']]
    ),
    createBoardItem(
      'agenda-supporters',
      '📣',
      'Supporter trust',
      `Supporter confidence is ${supporterScore}%.`,
      supporterScore >= 85 ? 'Strong' : 'Watch',
      'Supporter Liaison',
      'Agenda',
      `<p><strong>Agenda item:</strong> Supporter confidence is currently <strong>${supporterScore}%</strong>.</p><p>The fans are backing the plan while the club shows progress and avoids chaotic transfer behaviour.</p>`,
      [['Supporters', `${supporterScore}%`], ['Mood', supporterScore >= 85 ? 'Positive' : 'Mixed'], ['Theme', 'Back the plan']]
    ),
    createBoardItem(
      'agenda-reputation',
      '🏆',
      'Club reputation pathway',
      `Current status: ${rep.current.label}.`,
      rep.next ? 'Progressing' : 'Elite',
      'League Office',
      'Agenda',
      `<p><strong>Agenda item:</strong> Aurora City is currently recognised as <strong>${rep.current.label}</strong>.</p><p>${rep.next ? `The next target is <strong>${rep.next.label}</strong> at <strong>${money(rep.next.monthly)}/month</strong>.` : 'No further ladder target remains. The board expects elite standards to be maintained.'}</p>`,
      [['Current', rep.current.label], ['Next', rep.next ? rep.next.label : 'Elite'], ['Income', money(monthly) + '/m']]
    )
  ];

  const risks = [
    {
      id:'risk-income',
      icon:'£',
      title:'Income target risk',
      note:rep.next ? `Gap to next target: ${money(nextGap)}/year.` : 'Target ladder completed.',
      level: rep.next && nextGap > 3000 ? 'High' : rep.next && nextGap > 1200 ? 'Medium' : 'Low',
      body:`<p><strong>Risk:</strong> Income progress could slow before the next reputation step.</p><p>${rep.next ? `Current gap to ${rep.next.label}: <strong>${money(nextGap)}/year</strong>.` : 'The club has reached the top ladder status, so risk shifts to maintaining standards.'}</p>`
    },
    {
      id:'risk-transfer',
      icon:'💼',
      title:'Transfer window risk',
      note:'Risk of over-buying or chasing weak scores.',
      level: boardScore >= 82 ? 'Low' : 'Medium',
      body:'<p><strong>Risk:</strong> Transfer-window noise can push the club into weak decisions.</p><p>The control measure is simple: only buy if score, income impact and squad fit all justify the move.</p>'
    },
    {
      id:'risk-supporters',
      icon:'📣',
      title:'Supporter pressure',
      note:`Supporter confidence currently ${supporterScore}%.`,
      level: supporterScore >= 82 ? 'Low' : supporterScore >= 72 ? 'Medium' : 'High',
      body:`<p><strong>Risk:</strong> Supporter pressure rises if progress stalls.</p><p>Current supporter confidence is <strong>${supporterScore}%</strong>. Keep the story clear and the fanbase will stay with the gaffer.</p>`
    },
    {
      id:'risk-squad',
      icon:'🛡️',
      title:'Squad quality risk',
      note:`Average squad strength ${Math.round(avgStrength)}/100.`,
      level: avgStrength >= 82 ? 'Low' : avgStrength >= 72 ? 'Medium' : 'High',
      body:`<p><strong>Risk:</strong> Current holdings need enough quality to support the income plan.</p><p>Average squad strength is <strong>${Math.round(avgStrength)}/100</strong>. The board wants quality without sacrificing discipline.</p>`
    }
  ];

  boardMinutesItems = [
    createBoardItem(
      'decision',
      '🧾',
      nextDecision,
      decisionText,
      'Decision',
      'Aurora City FC Board',
      'Board Decision',
      `<p><strong>Decision required:</strong> ${nextDecision}.</p><p>${decisionText}</p>`,
      [['Board confidence', `${boardScore}%`], ['Supporters', `${supporterScore}%`], ['Monthly income', money(monthly)]]
    ),
    createBoardItem(
      'chairman',
      '👔',
      'Chairman notes',
      'Executive summary from the chairman.',
      'Notes',
      'Club Chairman',
      'Chairman',
      `<p>${$('chairmanVerdictText') ? $('chairmanVerdictText').textContent : 'The board is reviewing club progress.'}</p>`,
      [['Confidence', `${boardScore}%`], ['Job security', boardScore >= 90 ? 'Untouchable' : boardScore >= 82 ? 'Secure' : 'Stable'], ['Policy', 'Stay disciplined']]
    ),
    createBoardItem(
      'risk-summary',
      '⚠️',
      'Risk summary',
      'Executive review of current club risks.',
      'Risk',
      'Governance Office',
      'Risk Register',
      `<p>The board reviewed the major current risks: income target delivery, transfer-window discipline, supporter pressure and squad quality.</p><p>Current overall view: <strong>${boardScore >= 82 ? 'controlled' : 'needs attention'}</strong>.</p>`,
      [['Overall risk', boardScore >= 82 ? 'Controlled' : 'Watch'], ['Risk items', '4'], ['Action', 'Monitor']]
    ),
    ...agenda,
    ...risks.map(r => createBoardItem(r.id, r.icon, r.title, r.note, r.level, 'Risk Committee', 'Risk Register', r.body, [['Risk level', r.level], ['Status', r.note], ['Action', r.level === 'High' ? 'Escalate' : 'Monitor']]))
  ];

  if($('boardAgendaList')){
    $('boardAgendaList').innerHTML = agenda.map(item=>`
      <button class="board-agenda-item" type="button" data-board-id="${item.id}">
        <div class="agenda-icon">${item.icon}</div>
        <div><strong>${item.title}</strong><span>${item.note}</span></div>
        <div class="agenda-status">${item.status}</div>
      </button>
    `).join('');
  }

  if($('riskRegister')){
    $('riskRegister').innerHTML = risks.map(r=>`
      <button class="risk-row" type="button" data-board-id="${r.id}">
        <div class="agenda-icon">${r.icon}</div>
        <div><strong>${r.title}</strong><span>${r.note}</span></div>
        <div><div class="risk-level ${riskLevelClass(r.level)}">${r.level}</div><span style="display:block;color:var(--muted);font-size:10px;margin-top:5px">Owner: ${r.id.includes('transfer')?'Transfer Centre':r.id.includes('squad')?'Coaching':'Board'} • Review: monthly</span></div>
      </button>
    `).join('');
  }
}

function openBoardMinutes(id){
  const item = boardMinutesItems.find(x=>x.id === id);
  if(!item) return;
  if($('boardMinutesAvatar')) $('boardMinutesAvatar').textContent = item.icon;
  if($('boardMinutesSubject')) $('boardMinutesSubject').textContent = item.title;
  if($('boardMinutesFrom')) $('boardMinutesFrom').textContent = `From: ${item.from}`;
  if($('boardMinutesCategory')) $('boardMinutesCategory').textContent = item.category;
  if($('boardMinutesHeadline')) $('boardMinutesHeadline').textContent = item.title;
  if($('boardMinutesCopy')) $('boardMinutesCopy').innerHTML = item.body;
  if($('boardMinutesActions')) $('boardMinutesActions').innerHTML = item.actions.map(a=>`
    <div class="board-minutes-action"><small>${a[0]}</small><strong>${a[1]}</strong></div>
  `).join('');
  const modal = $('boardMinutesModal');
  if(modal){
    modal.classList.add('active');
    modal.setAttribute('aria-hidden','false');
  }
}
function closeBoardMinutes(){
  const modal = $('boardMinutesModal');
  if(modal){
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden','true');
  }
}
document.addEventListener('click', e=>{
  const boardBtn = e.target.closest('[data-board-id]');
  if(boardBtn){
    openBoardMinutes(boardBtn.dataset.boardId);
    return;
  }
  if(e.target.closest('#boardMinutesClose') || e.target.closest('#boardMinutesDone') || e.target.id === 'boardMinutesModal'){
    closeBoardMinutes();
  }
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape') closeBoardMinutes();
});

function renderNews(boardScore, supporterScore, monthly, rep){
  const sheetNews = boardroomNewsRows();
  const news = sheetNews.length ? sheetNews.slice(0,6).map(row => {
    const ticker = val(row,'Ticker','ticker');
    const headline = val(row,'Headline','headline') || val(row,'Category','category') || 'Aurora update';
    const summary = val(row,'Summary','summary','Notes','notes') || 'Boardroom update from AuroraTimes.';
    const sourceDate = val(row,'Date','date');
    return [newsIcon(row), `${ticker ? String(ticker).toUpperCase() + ' — ' : ''}${headline}`, `${sourceDate ? sourceDate + ' • ' : ''}${summary}`];
  }) : [
    ['👔','BOARD CONFIDENCE UPDATED',`Board confidence is ${boardScore}% — ${scoreLabel(boardScore).toLowerCase()} progress toward the income mission.`],
    ['📣','SUPPORTERS BACK THE GAFFER',`Supporter mood is ${supporterScore}%. The fanbase likes the disciplined transfer strategy.`],
    ['📈','INCOME PATHWAY REMAINS ACTIVE',`Aurora City FC is tracking ${money(monthly)} per month in passive income.`],
    ['🏟️','REPUTATION REPORT',`Current club reputation: ${rep.current.label}. Next step: ${rep.next ? rep.next.label : 'dynasty status'}.`]
  ];
  $('boardNews').innerHTML = news.map(n=>`
    <div class="news-board-item">
      <div class="board-icon">${n[0]}</div>
      <div><b>${n[1]}</b><span>${n[2]}</span></div>
    </div>`).join('');
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
    const [statusTextRaw,statusClassRaw] = trophyStatus(progress, done);
    const statusText = done ? statusTextRaw : 'Locked Target';
    const statusClass = done ? statusClassRaw : 'locked';
    const cardClass = done ? 'unlocked' : 'locked';
    const trophyMedia = done
      ? `<img src="${t.image}" alt="${t.title} trophy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"><div class="trophy-placeholder">${t.icon}</div>`
      : `<div class="trophy-placeholder">🔒</div>`;

    return `<div class="honours-trophy ${cardClass}">
      <div>
        <div class="trophy-image-stage ${done ? 'is-unlocked' : 'is-locked'}">
          ${trophyMedia}
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

function boardHistory(){try{const x=JSON.parse(localStorage.getItem('aurora_board_history')||'[]');return Array.isArray(x)?x:[];}catch(_){return [];}}
function saveBoardHistory(board,supporters,monthly,value){
  const rows=boardHistory(),last=rows[rows.length-1];
  if(!last||Date.now()-last.time>21600000||last.board!==board||Math.abs(last.monthly-monthly)>.005){rows.push({time:Date.now(),board,supporters,monthly,value});localStorage.setItem('aurora_board_history',JSON.stringify(rows.slice(-90)));}
}
function renderDecisionLog(boardScore,supporterScore,monthly,rep,avgStrength,targets,value){
  const log=$('boardDecisionLog'),trend=$('boardTrendGrid'); if(!log||!trend)return;
  const decisions=[
    {title:'Approve next £1,500 transfer window',status:targets.length?'Approved':'Watch',owner:'Manager',review:'Next payday'},
    {title:'Protect dividend sustainability',status:value>0&&portfolioAnnualIncome()/value<.12?'Controlled':'Watch',owner:'Finance',review:'Monthly'},
    {title:`Reach ${rep.next?rep.next.label:'elite maintenance'}`,status:rep.next?'In progress':'Achieved',owner:'Board',review:'Monthly'},
    {title:'Improve lowest-rated squad positions',status:avgStrength>=70?'Controlled':'Watch',owner:'Coaching',review:'Next review'}
  ];
  log.innerHTML='<div class="decision-log-row header"><span>Decision</span><span>Status</span><span>Owner</span><span>Review</span></div>'+decisions.map(d=>`<div class="decision-log-row"><strong>${d.title}</strong><span class="decision-status ${d.status==='Watch'||d.status==='In progress'?'watch':''}">${d.status}</span><span>${d.owner}</span><span>${d.review}</span></div>`).join('');
  const hist=boardHistory(),prev=hist.slice().reverse().find(x=>x.board!==boardScore||Math.abs(x.monthly-monthly)>.005);
  const delta=(now,old)=>prev&&Number.isFinite(old)?now-old:NaN;
  const cards=[['Board confidence',`${boardScore}%`,delta(boardScore,prev?.board)],['Supporter mood',`${supporterScore}%`,delta(supporterScore,prev?.supporters)],['Monthly income',money(monthly),delta(monthly,prev?.monthly)],['Club value',money(value),delta(value,prev?.value)]];
  trend.innerHTML=cards.map(([label,val,d])=>`<div class="board-trend-card"><small>${label}</small><strong>${val}</strong><span>${Number.isFinite(d)?`${d>=0?'▲':'▼'} ${label.includes('income')||label.includes('value')?money(Math.abs(d)):Math.abs(d).toFixed(0)}`:'Building history'}</span></div>`).join('');
  saveBoardHistory(boardScore,supporterScore,monthly,value);
}
function renderAll(){
  if($('lastUpdated')) { if(window.AuroraFC) AuroraFC.setFreshness('lastUpdated',AURORA_MASTER_CACHE,{prefix:'Aurora generated'}); else $('lastUpdated').textContent='Aurora generated: unavailable'; }

  const annualIncome = portfolioAnnualIncome();
  renderTrophies(annualIncome);
  const monthly = annualIncome / 12;
  const value = portfolioValue();
  const avgStrength = avgBuyStrength();
  const targets = targetRows();
  const rep = currentReputation(annualIncome);

  const boardOverride = latestBoardMetric('Board_Confidence','BoardConfidence','Confidence','Score','board_confidence');
  const supporterOverride = latestBoardMetric('Supporter_Mood','SupporterMood','Supporters','supporter_mood');
  const boardBase = Number.isFinite(boardOverride) ? boardOverride : boardScoreCalc(annualIncome, value, avgStrength);
  const supporterBase = Number.isFinite(supporterOverride) ? supporterOverride : supporterScoreCalc(avgStrength, targets);
  const boardNewsImpact = summedNewsImpact('Board_Impact','Board Impact','board_impact');
  const supporterNewsImpact = summedNewsImpact('Supporter_Impact','Supporter Impact','supporter_impact');
  const boardScore = clampScore(boardBase + boardNewsImpact);
  const supporterScore = clampScore(supporterBase + supporterNewsImpact);

  if($('prioritySustainability')) { const incomeYield=value>0?annualIncome/value:NaN; $('prioritySustainability').textContent = Number.isFinite(incomeYield)&&incomeYield<.12?'Controlled':'Review'; }
  if($('priorityHealth')) $('priorityHealth').textContent = monthly >= 625 ? 'Promotion level' : monthly >= 250 ? 'Healthy build' : 'Foundation stage';
  if($('priorityObjective')) $('priorityObjective').textContent = rep.next ? `${money(rep.next.monthly)}/month` : 'Maintain elite level';
  if($('priorityRisk')) $('priorityRisk').textContent = avgStrength < 65 ? 'Squad quality' : targets.length < 3 ? 'Thin transfer pipeline' : 'Concentration watch';


  $('boardConfidence').textContent = `${boardScore}%`;
  $('boardConfidenceLabel').textContent = `${scoreLabel(boardScore)}${signedImpact(boardNewsImpact)}`;
  $('supporterMood').textContent = `${supporterScore}%`;
  $('supporterMoodLabel').textContent = `${supporterMoodText(supporterScore)}${signedImpact(supporterNewsImpact)}`;
  $('jobSecurity').textContent = boardScore >= 90 ? 'Untouchable' : boardScore >= 82 ? 'Secure' : 'Stable';
  $('clubReputation').textContent = rep.current.label;
  $('clubReputationLabel').textContent = `${money(monthly)} monthly income`;

  $('confidenceGauge').style.setProperty('--score', boardScore);
  $('confidenceGaugeScore').textContent = `${boardScore}%`;
  $('confidenceGaugeText').textContent = scoreLabel(boardScore);
  const boardNewsNote = (boardNewsImpact || supporterNewsImpact)
    ? ` Aurora Times impact applied: board ${boardNewsImpact >= 0 ? '+' : ''}${boardNewsImpact}, supporters ${supporterNewsImpact >= 0 ? '+' : ''}${supporterNewsImpact}.`
    : '';
  $('boardVerdict').textContent = (boardScore >= 90
    ? 'The board are delighted. The gaffer has the spreadsheet goblins under control and the club is moving like a proper promotion machine.'
    : boardScore >= 82
      ? 'The board are strongly supportive. Keep income growing and avoid silly transfer-window chaos.'
      : 'The board are stable, but want clearer progress toward the next monthly income milestone.') + boardNewsNote;

  renderExecutiveControl(boardScore, supporterScore, monthly, annualIncome, rep, avgStrength, targets);

  renderObjectives(monthly);

  renderBoardRows('financeOversight', [
    {icon:'£', title:'Annual income', note:'Current tracked dividend/passive income', value:money(annualIncome)},
    {icon:'📆', title:'Monthly income', note:'Board’s main promotion metric', value:money(monthly)},
    {icon:'🏦', title:'Club value', note:'Tracked portfolio value where available', value:value ? money(value) : 'Live data'},
    {icon:'🧠', title:'Transfer discipline', note:'No forced buys unless the score justifies it', value:'Strong'}
  ]);

  renderBoardRows('clubHealth', [
    {icon:'🛡️', title:'Squad strength', note:'Average buy-strength of current holdings', value:`${Math.round(avgStrength)}/100`},
    {icon:'🎯', title:'Top target quality', note:targets[0] ? `${displayTicker(targets[0].ticker)} leads recruitment` : 'No target found', value:targets[0] ? `${Math.round(impact(targets[0]) || buyStrength(targets[0]) || 0)}/100` : '—'},
    {icon:'📣', title:'Supporter confidence', note:'Blend of squad strength and target quality', value:`${supporterScore}%`},
    {icon:'🏆', title:'Season outlook', note:rep.next ? `Next reputation step: ${rep.next.label}` : 'Dynasty mode active', value:rep.next ? money(rep.next.monthly) + '/m' : 'Elite'}
  ]);

  renderNews(boardScore, supporterScore, monthly, rep);
  renderDecisionLog(boardScore,supporterScore,monthly,rep,avgStrength,targets,value);
  window.AURORA_PAGE_CHECKS=()=>[
    {level:boardScore>=82?'ok':'warn',title:`Board confidence ${boardScore}%`,detail:boardScore>=82?'The board currently backs the strategy.':'The executive plan needs clearer progress.'},
    {level:targets.length>=3?'ok':'warn',title:`${targets.length} viable recruitment targets`,detail:targets.length>=3?'Transfer pipeline has reasonable depth.':'The board should review shortlist depth.'}
  ];
}
$('refreshBtn')?.addEventListener('click', ()=>{ AURORA_MASTER_CACHE=null; loadData(); });
loadData();

/* ===================== SECTION: EXECUTIVE CONTROL FALLBACK GUARD ===================== */
setTimeout(()=>{
  if($('chairmanVerdictTitle') && $('chairmanVerdictTitle').textContent.includes('Loading')){
    const annualIncome = portfolioAnnualIncome();
    const monthly = annualIncome / 12;
    const value = portfolioValue();
    const avgStrength = avgBuyStrength();
    const targets = targetRows();
    const rep = currentReputation(annualIncome);
    const boardBase = boardScoreCalc(annualIncome, value, avgStrength);
    const supporterBase = supporterScoreCalc(avgStrength, targets);
    const boardScore = clampScore(boardBase + summedNewsImpact('Board_Impact','Board Impact','board_impact'));
    const supporterScore = clampScore(supporterBase + summedNewsImpact('Supporter_Impact','Supporter Impact','supporter_impact'));
    if(typeof renderExecutiveControl === 'function'){
      renderExecutiveControl(boardScore, supporterScore, monthly, annualIncome, rep, avgStrength, targets);
    }
  }
}, 900);

if(window.AuroraFC) AuroraFC.registerServiceWorker();

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
  const PAGE='boardroom';
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
  function addFinanceSidebarLink(){
    const host=document.querySelector('.fm-side-scroll');if(!host||host.querySelector('[data-aurora-finance-sidebar]'))return;
    const a=document.createElement('a');a.href=ROUTES.finance;a.dataset.auroraFinanceSidebar='1';a.className='fm-side-link'+(PAGE==='finance'?' active':'');a.innerHTML='<span class="fm-side-icon">£</span><span>Finance Department</span>';
    const firstGroup=host.querySelector('.fm-nav-group');if(firstGroup)firstGroup.insertAdjacentElement('afterend',a);else host.prepend(a);
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
    patchLinks();addFinanceSidebarLink();addConnectedCard();refresh();
    const dock=document.querySelector('.aurora-system-dock');dock?.querySelector('.aurora-system-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else location.href=ROUTES.nexus});
    let lastY=scrollY||0,ticking=false,timer;const show=()=>dock?.classList.remove('is-hidden'),hide=()=>dock?.classList.add('is-hidden');
    addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY||0,max=Math.max(0,document.documentElement.scrollHeight-innerHeight),nearBottom=max-y<70;if(nearBottom||y<12||y<lastY-6)show();else if(y>lastY+6)hide();lastY=y;clearTimeout(timer);timer=setTimeout(show,180);ticking=false})},{passive:true});
    addEventListener('storage',e=>{if([FINANCE_KEY,LEGACY_KEY,TEST_KEY].includes(e.key))refresh()});addEventListener('aurora:finance-mission',refresh);addEventListener('aurora:wealth-mission',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
})();

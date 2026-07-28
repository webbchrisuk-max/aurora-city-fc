
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


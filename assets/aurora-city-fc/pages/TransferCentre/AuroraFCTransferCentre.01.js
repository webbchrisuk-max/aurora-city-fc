
const AURORA_MASTER_URL = 'https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json';
let AURORA_MASTER_CACHE = null;

let PLATFORM_RULES = {...(window.AURORA_PLATFORM_RULES || {TRIG:'IG ISA',FSFL:'Trade 212',UKW:'IG ISA',ARCC:'IG ISA',RGL:'Trade 212',GCP:'Trade 212',PHP:'IG ISA / Trade 212',FGEN:'IG ISA',SEQI:'Trade 212',TW:'IG ISA',OSB:'IG ISA'})};
let PLATFORM_RULE_DETAILS = {};
let PLATFORM_RULES_LOADED_AT = '';

const PLAYER_BASE = 'https://webbchrisuk-max.github.io/aurora-city-fc/assets/aurora-city-fc/players/';
const PLAYER_PORTRAITS = {
  RGL: PLAYER_BASE + 'rgl_player.png',
  RKT: PLAYER_BASE + 'rkt_player.png',
  ULVR: PLAYER_BASE + 'ulvr_player.png',
  TRIG: PLAYER_BASE + 'trig_player.png',
  GCP: PLAYER_BASE + 'gcp_player.png',
  SBRY: PLAYER_BASE + 'sbry_player.png',
  OMP: PLAYER_BASE + 'omp_player.png',
  LMP: PLAYER_BASE + 'lmp_player.png',
  IMB: PLAYER_BASE + 'imb_player.png',
  FSFL: PLAYER_BASE + 'fsfl_player.png',
  UKW: PLAYER_BASE + 'ukw_player.png',
  ARCC: PLAYER_BASE + 'arcc_player.png',
  OSB: PLAYER_BASE + 'osb_player.png',
  BTRW: PLAYER_BASE + 'btrw_player.png'
};
const PLAYER_PORTRAIT_POSITIONS = {
  TRIG: '50% 10%',
  GCP: '50% 10%',
  LMP: '50% 8%',
  OSB: '50% 8%',
  ARCC: '50% 12%',
  OMP: '50% 12%',
  BTRW: '50% 10%'
};
const PLAYER_PORTRAIT_SCALES = {
  TRIG: 1.08,
  GCP: 1.08,
  LMP: 1,
  OSB: 1,
  ARCC: 0.94,
  OMP: 0.94,
  BTRW: 0.94
};
const PLAYER_PORTRAIT_FITS = {
  TRIG: 'cover',
  GCP: 'cover'
};
const DIVIDEND_DPS_OVERRIDES = {
  RKT: 2.122,
  ULVR: 1.6902,
  BTRW: 0.01
};

const SECTOR_LIMITS = {
  reit_property: 0.30,
  infrastructure_renewable: 0.30,
  financials: 0.35,
  credit_income: 0.15,
  high_yield_forward: 0.10,
  single_holding: 0.25
};

let state = { holdings:[], watchlist:[], scout:[], auroraTimes:[], fxRates:[] };
const excludedTickers = new Set();
const manualAmounts = new Map();
const TRANSFER_SETTINGS_KEY = 'aurora_transfer_settings_v3';
const DEPLOYMENT_PLAN_KEY = 'aurora_monthly_deployment_v1';
const EXIT_FUNDING_KEY = 'aurora_exit_funding_v1';
const DIVIDEND_CALENDAR_KEY = 'aurora_dividend_calendar_v1';
const INCOME_SIMULATOR_KEY = 'aurora_income_simulator_v1';
const SMART_EXIT_KEY = 'aurora_smart_exit_v1';
const PAYDAY_EXECUTION_KEY = 'aurora_payday_execution_v1';
let lastLiveRefreshAt = '';
let routeMode = 'balanced';
let deploymentPlan = {corePot:25000,coreMonthly:2500,etfPot:8000,etfMonthly:1000,currentMonth:1};
const TRANSFER_PLAN_KEY = 'aurora_transfer_plan_v2';
const REGISTRATION_CONNECTION_KEY = 'aurora_registration_connection_v1';
const REGISTRATION_LAST_KEY = 'aurora_registration_last_v1';
let registrationConnection = {endpoint:'', token:''};
let registrationOpenKey = '';
let registrationBusy = false;


const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n) : '—';
const oneDecimal = n => Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
const whole = n => Number.isFinite(n) ? `${Math.round(n)}` : '—';

function parseNum(v){
  if(v === null || v === undefined) return NaN;
  const s = String(v).replace(/£|,|%/g,'').trim();
  if(!s) return NaN;
  return Number(s);
}
function cleanTicker(t){ return String(t || '').trim().toUpperCase().replace(/^LON:/,'').replace(/\.L$/,'').replace(/\.GB$/,'').replace(/ GB$/,'').replace(/\s+/g,' '); }
function registrationShortTicker(t){ return shortTicker(cleanTicker(t)); }
function normalizeRegistrationAccount(account){
  return window.AuroraFC ? AuroraFC.normalizeAccount(account) : String(account||'').trim().toUpperCase().replace(/\s+/g,' ');
}
function restoreRegistrationConnection(){
  try{
    const saved=JSON.parse(localStorage.getItem(REGISTRATION_CONNECTION_KEY)||'{}');
    registrationConnection={endpoint:String(saved.endpoint||'').trim(),token:String(saved.token||'').trim()};
  }catch(_){registrationConnection={endpoint:'',token:''};}
  if($('registrationEndpoint')) $('registrationEndpoint').value=registrationConnection.endpoint;
  if($('registrationToken')) $('registrationToken').value=registrationConnection.token;
  updateRegistrationConnectionStatus();
}
function persistRegistrationConnection(){
  registrationConnection={
    endpoint:String($('registrationEndpoint')?.value||'').trim(),
    token:String($('registrationToken')?.value||'').trim()
  };
  localStorage.setItem(REGISTRATION_CONNECTION_KEY,JSON.stringify(registrationConnection));
  updateRegistrationConnectionStatus();
}
function updateRegistrationConnectionStatus(){
  const ready=Boolean(registrationConnection.endpoint&&registrationConnection.token);
  const chip=$('registrationConnectionStatus');
  if(chip){chip.textContent=ready?'Ready':'Not connected';chip.classList.toggle('ready',ready);}
}
function registrationMessage(text,type=''){
  const box=$('registrationConnectionMessage');
  if(!box) return;
  box.textContent=text;
  box.className=`registration-message ${type}`.trim();
}
function currentHoldingForRegistration(ticker,account){
  const t=registrationShortTicker(ticker); const a=normalizeRegistrationAccount(account);
  return (state.holdings||[]).find(row=>registrationShortTicker(row.ticker)===t&&normalizeRegistrationAccount(row.account||row.platform||row.broker)===a)||null;
}
function platformRuleDetailsFor(ticker){
  return PLATFORM_RULE_DETAILS[registrationShortTicker(ticker)] || null;
}
function registrationAccountOptions(ticker){
  // Both live accounts remain selectable, while PlatformRules decides whether the selection can pass.
  const detail=platformRuleDetailsFor(ticker);
  const rule=detail?.preferredAccount||platformFor(ticker);
  const found=[];
  const add=account=>{
    const a=normalizeRegistrationAccount(account);
    if(a&&!a.includes('CHECK')&&!found.includes(a)) found.push(a);
  };
  add(rule);
  (detail?.allowedAccounts||[]).forEach(add);
  add('IG ISA');
  add('TRADE 212');
  (state.holdings||[]).filter(row=>registrationShortTicker(row.ticker)===registrationShortTicker(ticker)).forEach(row=>add(row.account||row.platform||row.broker));
  return found;
}
function registrationCurrency(row){
  const detail=platformRuleDetailsFor(row?.ticker);
  if(detail?.currency) return detail.currency;
  const t=registrationShortTicker(row?.ticker);
  const raw=String(row?.currency||row?.Currency||'').trim().toUpperCase();
  if(raw) return raw;
  return t==='ARCC'?'USD':'GBP';
}
function registrationUnitFor(row){
  const detail=platformRuleDetailsFor(row?.ticker);
  if(detail?.priceUnit) return detail.priceUnit;
  return registrationCurrency(row)==='USD'?'USD':(String(row?.ticker||'').toUpperCase().includes('LON:')?'PENCE':'GBP');
}
function registrationDateValue(){
  const d=new Date(); const local=new Date(d.getTime()-d.getTimezoneOffset()*60000); return local.toISOString().slice(0,10);
}
function registrationId(){
  return `AUR-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}
function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch]));}
function registrationNativePrice(price,unit){
  const p=parseNum(price); if(!Number.isFinite(p)) return NaN;
  return String(unit).toUpperCase()==='PENCE'?p/100:p;
}
function registrationPreviewFromForm(form){
  const ticker=form.dataset.ticker; const account=form.querySelector('[name="account"]')?.value||'';
  const shares=parseNum(form.querySelector('[name="shares"]')?.value);
  const priceInput=parseNum(form.querySelector('[name="price"]')?.value);
  const unit=form.querySelector('[name="priceUnit"]')?.value||'GBP';
  const fees=parseNum(form.querySelector('[name="fees"]')?.value)||0;
  const nativePrice=registrationNativePrice(priceInput,unit);
  const gross=Number.isFinite(shares)&&Number.isFinite(nativePrice)?shares*nativePrice:NaN;
  const total=Number.isFinite(gross)?gross+fees:NaN;
  const holding=currentHoldingForRegistration(ticker,account);
  const oldShares=parseNum(holding?.shares)||0;
  const oldBook=parseNum(holding?.book_cost)||0;
  const currency=form.querySelector('[name="currency"]')?.value||'GBP';
  const fx=currency==='GBP'?1:(parseNum(form.querySelector('[name="fxRate"]')?.value)||NaN);
  const totalGbp=Number.isFinite(total)&&Number.isFinite(fx)?total*fx:NaN;
  const newShares=Number.isFinite(shares)?oldShares+shares:NaN;
  const newBook=Number.isFinite(totalGbp)?oldBook+totalGbp:NaN;
  const avg=Number.isFinite(newBook)&&Number.isFinite(newShares)&&newShares>0?newBook/newShares:NaN;
  const dps=parseNum(holding?.annual_dps)||parseNum(form.dataset.annualDps)||0;
  const added=Number.isFinite(shares)?shares*dps:NaN;
  return {gross,total,totalGbp,newShares,avg,added,holding,currency,fx};
}
function registrationSafety(form,p){
  const warnings=[]; const blocking=[];
  const ticker=form.dataset.ticker;
  const account=form.querySelector('[name="account"]')?.value||'';
  const priceInput=parseNum(form.querySelector('[name="price"]')?.value);
  const unit=form.querySelector('[name="priceUnit"]')?.value||'GBP';
  const currency=form.querySelector('[name="currency"]')?.value||'GBP';
  const livePrice=parseNum(form.dataset.livePriceGbp);
  const allocation=parseNum(form.dataset.dealAllocation);
  const fees=parseNum(form.querySelector('[name="fees"]')?.value)||0;
  const tickerKey=registrationShortTicker(ticker);
  const normalizedAccount=normalizeRegistrationAccount(account);
  const detail=platformRuleDetailsFor(ticker);
  const allowedAccounts=detail?.allowedAccounts?.length
    ? detail.allowedAccounts
    : ((window.AuroraFC&&typeof AuroraFC.allowedAccounts==='function')
      ? AuroraFC.allowedAccounts(ticker)
      : (['TRIG','GCP'].includes(tickerKey)?['TRADE 212']:['IG ISA','TRADE 212']));
  const accountAllowed=allowedAccounts.includes(normalizedAccount);
  if(!accountAllowed) blocking.push(`${tickerKey} is not available in ${account}. Select ${allowedAccounts.join(' or ')}.`);
  if(currency==='USD'&&unit!=='USD') blocking.push('USD purchases must use USD per share.');
  if(currency==='GBP'&&unit==='USD') blocking.push('GBP purchases cannot use USD per share.');
  const enteredGbp=currency==='GBP'?registrationNativePrice(priceInput,unit):(Number.isFinite(p.fx)?registrationNativePrice(priceInput,unit)*p.fx:NaN);
  if(Number.isFinite(livePrice)&&livePrice>0&&Number.isFinite(enteredGbp)&&enteredGbp>0){
    const ratio=enteredGbp/livePrice;
    if(ratio>5||ratio<0.2) blocking.push(`Possible price-unit error: the entered price is far from Aurora's ${money(livePrice)} reference price.${unit==='GBP'&&currency==='GBP'?' Did you mean pence per share?':''}`);
  }
  if(Number.isFinite(allocation)&&allocation>0&&Number.isFinite(p.totalGbp)&&p.totalGbp>allocation*1.15) warnings.push(`Trade cost ${money(p.totalGbp)} is more than 15% above the ${money(allocation)} deal-sheet allocation.`);
  if(Number.isFinite(p.gross)&&p.gross>0&&fees>p.gross*0.1) warnings.push('Fees are more than 10% of the gross trade cost. Check the fees entry.');
  return {warnings,blocking};
}
function updateRegistrationPreview(form){
  const p=registrationPreviewFromForm(form);
  const set=(key,value)=>{const el=form.querySelector(`[data-preview="${key}"]`);if(el)el.textContent=value;};
  const nativeSymbol=p.currency==='USD'?'$':'£';
  set('cost',Number.isFinite(p.total)?`${nativeSymbol}${p.total.toFixed(2)}`:'—');
  set('shares',Number.isFinite(p.newShares)?p.newShares.toLocaleString('en-GB',{maximumFractionDigits:8}):'—');
  set('average',Number.isFinite(p.avg)?`${money(p.avg)} / share`:'—');
  set('income',Number.isFinite(p.added)?`${money(p.added)}/yr`:'—');
  const fxField=form.querySelector('[data-fx-field]'); if(fxField) fxField.hidden=p.currency==='GBP';
  const safety=registrationSafety(form,p); form.dataset.safetyBlocked=safety.blocking.length?'true':'false';
  const safetyBox=form.querySelector('[data-safety-message]');
  if(safetyBox){
    if(safety.blocking.length){safetyBox.textContent=`STOP: ${safety.blocking.join(' ')}`;safetyBox.className='registration-message error registration-safety';}
    else if(safety.warnings.length){safetyBox.textContent=`Check: ${safety.warnings.join(' ')}`;safetyBox.className='registration-message pending registration-safety';}
    else{safetyBox.textContent='Safety check passed: account, currency, price unit and allocation look consistent.';safetyBox.className='registration-message success registration-safety';}
  }
  const accountMessage=form.querySelector('[data-form-message]');
  if(accountMessage&&!p.holding){accountMessage.textContent='New signing: Aurora will create a fresh Holdings row and LivePrices entry in the selected account when you confirm.';accountMessage.className='registration-message pending';}
  else if(accountMessage&&p.holding){accountMessage.textContent='Existing squad player: this purchase will top up the selected account row.';accountMessage.className='registration-message';}
  const submit=form.querySelector('button[type="submit"]');
  if(submit&&!registrationBusy){submit.textContent=p.holding?'Confirm top-up':'Confirm new signing';submit.disabled=safety.blocking.length>0;}
}
async function postRegistration(payload){
  if(!registrationConnection.endpoint||!registrationConnection.token) throw new Error('Connect the Registration Desk to the Apps Script web app first.');
  const body=new URLSearchParams(); body.set('token',registrationConnection.token); body.set('payload',JSON.stringify(payload));
  try{
    const response=await fetch(registrationConnection.endpoint,{method:'POST',body,redirect:'follow'});
    const raw=await response.text();
    let json=null; try{json=JSON.parse(raw);}catch(_){json=null;}
    if(!response.ok) throw new Error(json?.message||`Registration service returned ${response.status}`);
    if(!json) throw new Error('The registration service returned an unreadable response.');
    if(json.ok===false) throw new Error(json.message||'Registration failed.');
    return json;
  }catch(err){
    if(String(err?.message||'').toLowerCase().includes('failed to fetch')||err instanceof TypeError){
      await fetch(registrationConnection.endpoint,{method:'POST',mode:'no-cors',body,redirect:'follow'});
      return {ok:true,queued:true,transactionId:payload.transactionId,message:'Request submitted. Browser security prevented the confirmation response; check AuroraData or refresh after the export runs.'};
    }
    throw err;
  }
}

function applyPlatformRules(result){
  const rows=Array.isArray(result?.platformRules)?result.platformRules:[];
  const details={};
  rows.forEach(row=>{
    const ticker=registrationShortTicker(row.ticker);
    if(!ticker||row.active===false) return;
    const allowed=(Array.isArray(row.allowedAccounts)?row.allowedAccounts:String(row.allowedAccounts||'').split(/[,;\/]+/))
      .map(normalizeRegistrationAccount).filter(Boolean);
    details[ticker]={
      preferredAccount:normalizeRegistrationAccount(row.preferredAccount||''),
      allowedAccounts:[...new Set(allowed)],
      currency:String(row.currency||'').toUpperCase(),
      priceUnit:String(row.priceUnit||'').toUpperCase(),
      note:String(row.note||''),
      updatedAt:String(row.updatedAt||'')
    };
    if(details[ticker].preferredAccount) PLATFORM_RULES[ticker]=details[ticker].preferredAccount.replace('TRADE 212','Trade 212');
  });
  PLATFORM_RULE_DETAILS=details;
  PLATFORM_RULES_LOADED_AT=String(result?.updatedAt||result?.timestamp||'');
  window.AURORA_PLATFORM_RULE_DETAILS=details;
}
async function loadPlatformRules(){
  const rulesChip=$('platformRulesStatus');
  if(!registrationConnection.endpoint||!registrationConnection.token){
    if(rulesChip){rulesChip.textContent='Rules: connect AuroraData';rulesChip.className='status-chip caution';}
    if($('deskNote')) $('deskNote').textContent='Connect AuroraData to load the live PlatformRules table.';
    return false;
  }
  if(rulesChip){rulesChip.textContent='Rules: loading…';rulesChip.className='status-chip caution';}
  try{
    const result=await postRegistration({action:'getPlatformRules',transactionId:registrationId(),source:'Aurora City FC Transfer Centre'});
    if(result.queued) return false;
    applyPlatformRules(result);
    const ruleCount=result.count||Object.keys(PLATFORM_RULE_DETAILS).length;
    if(rulesChip){rulesChip.textContent=`Rules: ${ruleCount} loaded`;rulesChip.className='status-chip pass';rulesChip.title=`${ruleCount} live platform rules loaded from AuroraData`; }
    if($('deskNote')) $('deskNote').textContent=`Platform rules loaded from AuroraData: ${ruleCount} tickers.`;
    if(state.holdings?.length||state.watchlist?.length||state.scout?.length) renderAll();
    return true;
  }catch(err){
    console.warn('PlatformRules could not be loaded; using embedded emergency rules.',err);
    if(rulesChip){rulesChip.textContent='Rules: unavailable';rulesChip.className='status-chip block';rulesChip.title='AuroraData PlatformRules could not be loaded; emergency embedded rules are active';}
    if($('deskNote')) $('deskNote').textContent='PlatformRules unavailable — embedded emergency rules are active.';
    return false;
  }
}
function applyRegistrationResult(result,payload){
  if(!result||result.queued) return;
  let holding=currentHoldingForRegistration(payload.ticker,payload.account);
  if(!holding&&result.createdNewHolding){
    holding={
      ticker:result.tickerFull||payload.ticker,
      name:result.name||payload.name,
      account:payload.account,
      sector:payload.sector||'OTHER',
      role:payload.role||payload.squadRole||'NEW SIGNING',
      shares:result.newShares,
      book_cost:result.newBookCostGbp,
      average_price:result.newAverageGbp,
      annual_dps:result.annualDpsGbp||payload.annualDps||0,
      annual_dps_total:(result.newShares||0)*(result.annualDpsGbp||payload.annualDps||0)
    };
    state.holdings.push(holding);
  }else if(holding){
    holding.shares=result.newShares;
    holding.book_cost=result.newBookCostGbp;
    holding.average_price=result.newAverageGbp;
    const dps=parseNum(holding.annual_dps)||0;
    holding.annual_dps_total=result.newShares*dps;
  }
}
function lastRegistration(){try{return JSON.parse(localStorage.getItem(REGISTRATION_LAST_KEY)||'null');}catch(_){return null;}}

function registrationPriceLabel(row){const unit=String(row.priceUnit||'').toUpperCase();const currency=String(row.currency||'GBP').toUpperCase();return unit==='PENCE'?`${Number(row.priceInput||0).toLocaleString('en-GB',{maximumFractionDigits:4})}p`:`${currency==='USD'?'$':'£'}${Number(row.priceInput||0).toLocaleString('en-GB',{maximumFractionDigits:6})}`;}
function renderRegistrationHistory(rows){
  const box=$('registrationHistory'); if(!box) return;
  box.innerHTML=rows?.length?rows.map(row=>{
    const status=String(row.status||'').toUpperCase(); const cls=status==='UNDONE'?'undone':status==='UNDO'?'undo':'';
    const submitted=row.submittedAt?new Date(row.submittedAt):null; const when=submitted&&!Number.isNaN(submitted.getTime())?submitted.toLocaleString('en-GB'):'Time unavailable';
    const undo=row.canUndo?`<button class="registration-btn danger" type="button" data-undo-registration="${escapeHtml(row.transactionId)}" data-undo-label="${escapeHtml(`${row.ticker} • ${row.account} • ${row.shares} shares • ${money(row.totalCostGbp)}`)}">Undo</button>`:'';
    return `<div class="registration-history-row"><div><strong>${escapeHtml(row.ticker)} — ${escapeHtml(row.name||'Purchase registration')}</strong><span>${escapeHtml(row.account)} • ${Number(row.shares||0).toLocaleString('en-GB',{maximumFractionDigits:8})} shares at ${escapeHtml(registrationPriceLabel(row))} • ${money(Number(row.totalCostGbp)||0)} • ${when}</span></div><div class="registration-history-actions"><span class="registration-history-status ${cls}">${escapeHtml(status.replace('_',' '))}</span>${undo}</div></div>`;
  }).join(''):'<div class="loading">No PurchaseLog activity yet.</div>';
}
async function loadRegistrationHistory(){
  const box=$('registrationHistory'); if(!box) return;
  if(!registrationConnection.endpoint||!registrationConnection.token){box.innerHTML='<div class="loading">Save the AuroraData connection to load PurchaseLog activity.</div>';return;}
  box.innerHTML='<div class="loading">Loading recent PurchaseLog activity…</div>';
  try{const result=await postRegistration({action:'listRecentRegistrations',limit:12,transactionId:registrationId(),source:'Aurora City FC Transfer Centre'});if(result.queued) throw new Error('Browser security prevented the activity response.');renderRegistrationHistory(result.registrations||[]);}catch(err){box.innerHTML=`<div class="loading error">${escapeHtml(err.message||'Unable to load recent activity.')}</div>`;}
}


function displayTicker(t){ return String(t || '').replace('LON:',''); }
function shortTicker(t){ return displayTicker(t).replace('.GB','').replace('.L','').toUpperCase(); }
function displayName(row){
  return row.name || row.company_name || row.company || row.Company || row.Name || row.security_name || row.stock_name || row["Company Name"] || row["Security Name"] || displayTicker(row.ticker) || '—';
}
function deploymentReleaseForMonth(month,plan=deploymentPlan){
  const m=Math.max(1,Math.floor(parseNum(month)||1));
  const core=Math.max(0,Math.min(plan.coreMonthly,plan.corePot-((m-1)*plan.coreMonthly)));
  const etf=Math.max(0,Math.min(plan.etfMonthly,plan.etfPot-((m-1)*plan.etfMonthly)));
  return {month:m,core,etf,total:core+etf};
}
function deploymentProgrammeMonths(plan=deploymentPlan){
  const coreMonths=plan.coreMonthly>0?Math.ceil(plan.corePot/plan.coreMonthly):0;
  const etfMonths=plan.etfMonthly>0?Math.ceil(plan.etfPot/plan.etfMonthly):0;
  return Math.max(1,coreMonths,etfMonths);
}
function readDeploymentInputs(){
  deploymentPlan={
    corePot:Math.max(0,parseNum($('corePotInput')?.value)||0),
    coreMonthly:Math.max(0,parseNum($('coreMonthlyInput')?.value)||0),
    etfPot:Math.max(0,parseNum($('etfPotInput')?.value)||0),
    etfMonthly:Math.max(0,parseNum($('etfMonthlyInput')?.value)||0),
    currentMonth:Math.max(1,Math.floor(parseNum($('deploymentMonthInput')?.value)||1))
  };
  return deploymentPlan;
}
function restoreDeploymentPlan(){
  try{
    const saved=JSON.parse(localStorage.getItem(DEPLOYMENT_PLAN_KEY)||'{}');
    deploymentPlan={
      corePot:Number.isFinite(parseNum(saved.corePot))?Math.max(0,parseNum(saved.corePot)):25000,
      coreMonthly:Number.isFinite(parseNum(saved.coreMonthly))?Math.max(0,parseNum(saved.coreMonthly)):2500,
      etfPot:Number.isFinite(parseNum(saved.etfPot))?Math.max(0,parseNum(saved.etfPot)):8000,
      etfMonthly:Number.isFinite(parseNum(saved.etfMonthly))?Math.max(0,parseNum(saved.etfMonthly)):1000,
      currentMonth:Number.isFinite(parseNum(saved.currentMonth))?Math.max(1,Math.floor(parseNum(saved.currentMonth))):1
    };
  }catch(err){console.warn('Monthly deployment plan could not be restored',err);}
  const map={corePotInput:'corePot',coreMonthlyInput:'coreMonthly',etfPotInput:'etfPot',etfMonthlyInput:'etfMonthly',deploymentMonthInput:'currentMonth'};
  Object.entries(map).forEach(([id,key])=>{if($(id)) $(id).value=deploymentPlan[key];});
}
function persistDeploymentPlan(){
  try{localStorage.setItem(DEPLOYMENT_PLAN_KEY,JSON.stringify({...deploymentPlan,updatedAt:new Date().toISOString()}));}
  catch(err){console.warn('Monthly deployment plan could not be saved',err);}
}
function restoreTransferSettings(){
  try{
    const saved = JSON.parse(localStorage.getItem(TRANSFER_SETTINGS_KEY) || '{}');
    routeMode=saved.routeMode==='maximum'?'maximum':'balanced';
    const release=deploymentReleaseForMonth(deploymentPlan.currentMonth);
    const budget = parseNum(saved.budget);
    const budgetInput = $('transferBudgetInput');
    if(budgetInput) budgetInput.value = Number.isFinite(budget) && budget >= 0 ? budget : release.total;
    excludedTickers.clear();
    (Array.isArray(saved.excludedTickers) ? saved.excludedTickers : []).forEach(ticker => excludedTickers.add(cleanTicker(ticker)));
    manualAmounts.clear();
    const manual = saved.manualAmounts && typeof saved.manualAmounts === 'object' ? saved.manualAmounts : {};
    Object.entries(manual).forEach(([ticker,amount])=>{
      const value = parseNum(amount);
      if(Number.isFinite(value) && value >= 0) manualAmounts.set(cleanTicker(ticker),value);
    });
  }catch(err){ console.warn('Transfer settings could not be restored',err); }
}
function persistTransferSettings(){
  try{
    const budget = Math.max(0,parseNum($('transferBudgetInput')?.value)||0);
    localStorage.setItem(TRANSFER_SETTINGS_KEY,JSON.stringify({
      budget,routeMode,
      excludedTickers:[...excludedTickers],
      manualAmounts:Object.fromEntries(manualAmounts),
      updatedAt:new Date().toISOString()
    }));
  }catch(err){ console.warn('Transfer settings could not be saved',err); }
}
function serialiseTransferPlan(deal){
  return {
    version:3,
    source:'Transfer Centre monthly portfolio logic',
    routeMode:deal?.mode||routeMode,
    deploymentPlan:{...deploymentPlan},
    budget:Number(deal?.budget)||0,
    allocated:(deal?.rows||[]).reduce((sum,item)=>sum+(Number(item.amount)||0),0),
    holdback:Number(deal?.holdback)||0,
    totalIncome:Number(deal?.totalIncome)||0,
    route:deal?.route||'Hold cash',
    status:deal?.status||'No buy',
    statusClass:deal?.statusClass||'bad',
    reason:deal?.reason||'',
    rows:(deal?.rows||[]).map(item=>({
      ticker:cleanTicker(item.row?.ticker),
      displayTicker:displayTicker(item.row?.ticker),
      name:displayName(item.row),
      account:platformFor(item.row?.ticker),
      amount:Number(item.amount)||0,
      income:Number(item.income)||0,
      incomeRate:Number(incomeRate(item.row))||0,
      gateStatus:item.gate?.status||'pass',
      gateReason:item.gate?.reasons?.[0]||'',
      dataConfidence:item.gate?.data?.score||0,
      dataStatus:item.gate?.data?.status||'review'
    })),
    updatedAt:new Date().toISOString()
  };
}
function publishTransferPlan(deal){
  const plan = serialiseTransferPlan(deal);
  try{ localStorage.setItem(TRANSFER_PLAN_KEY,JSON.stringify(plan)); }catch(err){ console.warn('Transfer plan could not be saved',err); }
  try{
    if(window.parent && window.parent !== window){
      window.parent.postMessage({type:'AURORA_TRANSFER_PLAN',plan},location.origin && location.origin !== 'null' ? location.origin : '*');
    }
  }catch(err){ console.warn('Transfer plan could not be published',err); }
  window.AURORA_CURRENT_TRANSFER_PLAN = plan;
  return plan;
}
function isActiveHolding(row){
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const value = holdingValue(row);
  const status = String(row.status ?? row.Status ?? '').toLowerCase();
  const role = String(row.role ?? row.Role ?? '').toLowerCase();
  const exited = status.includes('sold') || status.includes('exited') || role.includes('exited');
  return !exited && ((Number.isFinite(shares) && shares > 0) || value > 0);
}
function activeHoldings(){
  return (state.holdings || []).filter(isActiveHolding);
}
function holdingValue(row){
  const direct = parseNum(row.current_value ?? row.value ?? row.market_value ?? row.holding_value ?? row.Value ?? row["Market Value"]);
  if(Number.isFinite(direct) && direct > 0) return direct;
  const shares = parseNum(row.shares ?? row.quantity ?? row.units ?? row.Shares);
  const price = parseNum(row.live_price ?? row.price ?? row.Price);
  return Number.isFinite(shares) && Number.isFinite(price) ? shares * price : 0;
}


function exitHolding(ticker){
  const target=shortTicker(ticker);
  return activeHoldings().find(row=>shortTicker(row.ticker)===target)||null;
}
function exitHoldingBookCost(row){
  const value=parseNum(row?.book_cost ?? row?.cost_basis ?? row?.bookValue ?? row?.['Book Cost']);
  return Number.isFinite(value)?value:0;
}
function exitHoldingLivePrice(row){
  const value=parseNum(row?.live_price ?? row?.price ?? row?.Price);
  return Number.isFinite(value)?value:NaN;
}
function exitPaydaySettings(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(EXIT_FUNDING_KEY)||'{}')||{};}catch(_){saved={};}
  const input=$('nextPaydayInput');
  if(input&&!input.value&&saved.paydayDate) input.value=saved.paydayDate;
  return {paydayDate:String(input?.value||saved.paydayDate||'')};
}
function persistExitFundingSettings(){
  try{localStorage.setItem(EXIT_FUNDING_KEY,JSON.stringify({paydayDate:String($('nextPaydayInput')?.value||''),updatedAt:new Date().toISOString()}));}catch(_){/* local storage unavailable */}
}
function paydayCountdownLabel(value){
  if(!value) return {headline:'Wait for payday',note:'Set the next payday date to activate the countdown.',days:NaN,reached:false};
  const target=new Date(`${value}T00:00:00`);
  if(Number.isNaN(target.getTime())) return {headline:'Wait for payday',note:'The saved payday date is invalid.',days:NaN,reached:false};
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const days=Math.ceil((target-today)/86400000);
  if(days<=0) return {headline:'Payday review due',note:'Refresh prices, rerun the route and review the IITU sale.',days,reached:true};
  return {headline:`${days} day${days===1?'':'s'} to payday`,note:'Hold position until the scheduled review unless the plan changes.',days,reached:false};
}
function currentVwraOffer(){
  return [...(incomingOffers||[])]
    .filter(offer=>registrationShortTicker(offer?.ticker)==='VWRA'&&['OPEN','COUNTERED'].includes(String(offer?.status||'').toUpperCase()))
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]||null;
}
function renderExitFundingRoom(){
  const grid=$('exitFundingGrid');if(!grid)return;
  const settings=exitPaydaySettings();
  const countdown=paydayCountdownLabel(settings.paydayDate);
  const iitu=exitHolding('IITU');
  const vwra=exitHolding('VWRA');
  const iituValue=iitu?holdingValue(iitu):0;
  const iituBook=iitu?exitHoldingBookCost(iitu):0;
  const iituProfit=iituValue-iituBook;
  const iituPrice=iitu?exitHoldingLivePrice(iitu):NaN;
  const vwraValue=vwra?holdingValue(vwra):0;
  const vwraBook=vwra?exitHoldingBookCost(vwra):0;
  const vwraProfit=vwraValue-vwraBook;
  const vwraPrice=vwra?exitHoldingLivePrice(vwra):NaN;
  const offer=currentVwraOffer();
  const clause=offer?incomingOfferClauseData(offer):null;
  const etfRelease=Math.max(0,deploymentPlan.etfMonthly||1000);
  const iituFullMonths=etfRelease>0?Math.floor(iituValue/etfRelease):0;
  const iituRemainder=etfRelease>0?iituValue-(iituFullMonths*etfRelease):iituValue;
  const combinedExitValue=iituValue+vwraValue;
  const coverage=deploymentPlan.etfPot>0?Math.min(100,(combinedExitValue/deploymentPlan.etfPot)*100):0;
  const targetPrice=clause?.releasePrice;
  const targetGap=(clause&&Number.isFinite(clause.currentLivePrice)&&Number.isFinite(targetPrice))?targetPrice-clause.currentLivePrice:NaN;
  const targetGapPct=(clause&&Number.isFinite(clause.currentLivePrice)&&clause.currentLivePrice>0&&Number.isFinite(targetPrice))?((targetPrice/clause.currentLivePrice)-1)*100:NaN;
  const targetValue=offer?Number(offer.offerValueGbp||0):0;

  if($('exitNextAction')) $('exitNextAction').textContent=countdown.headline;
  if($('exitNextActionNote')) $('exitNextActionNote').textContent=countdown.note;
  if($('iituFundingValue')) $('iituFundingValue').textContent=iitu?money(iituValue):'Not held';
  if($('iituFundingRunway')) $('iituFundingRunway').textContent=iitu?`${iituFullMonths} full £${etfRelease.toLocaleString('en-GB')} tranche${iituFullMonths===1?'':'s'}${iituRemainder>0?` + ${money(iituRemainder)} remaining`:''}`:'No active IITU holding found.';
  if($('vwraTargetStatus')) $('vwraTargetStatus').textContent=clause?(clause.met?'Target reached':'Target locked'):'No open target';
  if($('vwraTargetGap')) $('vwraTargetGap').textContent=clause?(clause.met?'Ready for review':`${Number.isFinite(targetGap)?money(Math.max(0,targetGap)):'—'} per share gap • ${Number.isFinite(targetGapPct)?targetGapPct.toFixed(2)+'%':'—'}`):'Open-offer data not loaded.';
  if($('etfPotCoverage')) $('etfPotCoverage').textContent=`${coverage.toFixed(1)}% funded`;
  if($('etfPotCoverageNote')) $('etfPotCoverageNote').textContent=`Current IITU + VWRA value: ${money(combinedExitValue)} against the ${money(deploymentPlan.etfPot)} ETF-sale pot.`;

  const iituStatus=countdown.reached?'ready':'plan';
  const vwraStatus=clause?.met?'ready':'wait';
  const vwraProgress=clause&&Number.isFinite(clause.progressPct)?clause.progressPct:0;
  const targetLabel=offer&&Number.isFinite(targetPrice)?offerPriceLabel(targetPrice,offer.priceUnit,offer.currency):'—';
  const currentVwraLabel=Number.isFinite(vwraPrice)?money(vwraPrice):'—';

  grid.innerHTML=`
    <article class="exit-player-card">
      <div class="exit-player-top"><div><small>Planned first departure</small><h4>IITU — iShares S&amp;P 500 IT</h4></div><span class="exit-status ${iituStatus}">${countdown.reached?'Review sale':'Sell on payday'}</span></div>
      <div class="exit-player-metrics">
        <div class="exit-player-metric"><small>Current value</small><strong>${iitu?money(iituValue):'—'}</strong></div>
        <div class="exit-player-metric"><small>Current price</small><strong>${Number.isFinite(iituPrice)?money(iituPrice):'—'}</strong></div>
        <div class="exit-player-metric"><small>Book cost</small><strong>${iitu?money(iituBook):'—'}</strong></div>
        <div class="exit-player-metric"><small>Profit</small><strong class="${iituProfit>=0?'good':'warn'}">${iitu?`${iituProfit>=0?'+':''}${money(iituProfit)}`:'—'}</strong></div>
      </div>
      <p class="exit-player-note">At the current value, IITU funds ${iituFullMonths} complete £${etfRelease.toLocaleString('en-GB')} monthly release${iituFullMonths===1?'':'s'}${iituRemainder>0?` and leaves ${money(iituRemainder)} toward the following month`:''}. Final execution remains a payday review, not an automatic order.</p>
    </article>
    <article class="exit-player-card">
      <div class="exit-player-top"><div><small>Offer-room target watch</small><h4>VWRA — Vanguard All-World</h4></div><span class="exit-status ${vwraStatus}">${clause?.met?'Target met':'Wait for target'}</span></div>
      <div class="exit-player-metrics">
        <div class="exit-player-metric"><small>Current value</small><strong>${vwra?money(vwraValue):'—'}</strong></div>
        <div class="exit-player-metric"><small>Current live</small><strong>${clause&&Number.isFinite(clause.currentLivePrice)?offerPriceLabel(clause.currentLivePrice,offer.priceUnit,offer.currency):currentVwraLabel}</strong></div>
        <div class="exit-player-metric"><small>Fixed target</small><strong>${targetLabel}</strong></div>
        <div class="exit-player-metric"><small>Target proceeds</small><strong>${targetValue>0?money(targetValue):'—'}</strong></div>
      </div>
      <div class="exit-target-track"><i style="width:${Math.max(2,Math.min(100,vwraProgress)).toFixed(2)}%"></i></div>
      <p class="exit-player-note">${clause?(clause.met?'The fixed offer-room target has been reached. Review the exit and replacement route.':`${Number.isFinite(targetGap)?money(Math.max(0,targetGap)):'—'} per share remains, equal to ${Number.isFinite(targetGapPct)?targetGapPct.toFixed(2)+'%':'—'}. The plan can begin with IITU proceeds while this target remains locked.`):'No live VWRA offer-room target is currently available. Refresh the offer room connection.'}</p>
    </article>
    <article class="exit-player-card wide">
      <div class="exit-player-top"><div><small>Execution sequence</small><h4>Monthly funding playbook</h4></div><span class="exit-status plan">Controlled release</span></div>
      <div class="exit-action-list">
        <div class="exit-action-row"><b>1</b><div><strong>Before payday</strong><span>Leave IITU and VWRA untouched; monitor live data and the VWRA target.</span></div></div>
        <div class="exit-action-row"><b>2</b><div><strong>On payday</strong><span>Refresh Aurora, rerun both routes and review the IITU sale first.</span></div></div>
        <div class="exit-action-row"><b>3</b><div><strong>Fund the first transfer window</strong><span>Combine £2,500 from the core pot with £1,000 from realised ETF-sale cash.</span></div></div>
        <div class="exit-action-row"><b>4</b><div><strong>VWRA remains optional</strong><span>Sell only after its target/review condition is satisfied; do not let it delay the opening IITU-funded months.</span></div></div>
      </div>
      <p class="exit-player-note" style="margin-top:10px">At current values, both ETF exits represent ${money(combinedExitValue)} versus the planned ${money(deploymentPlan.etfPot)} pot. Current combined unrealised profit is ${money(iituProfit+vwraProfit)}.</p>
    </article>`;
}

function parseYield(row){
  const overrideDps = DIVIDEND_DPS_OVERRIDES[shortTicker(row.ticker)];
  const overridePrice = parseNum(row.live_price ?? row.price ?? row.Price);
  if(Number.isFinite(overrideDps) && Number.isFinite(overridePrice) && overridePrice > 0) return overrideDps / overridePrice;
  const direct = row.dividend_yield ?? row.div_yield ?? row.yield_pct ?? row.Yield ?? row.yield ?? '';
  if(String(direct).includes('%')) return parseNum(direct) / 100;
  const directNum = parseNum(direct);
  if(Number.isFinite(directNum) && directNum > 0 && directNum < 1) return directNum;
  if(Number.isFinite(directNum) && directNum >= 1 && directNum <= 25) return directNum / 100;

  const annualTotal = parseNum(row.annual_dps_total ?? row.Annual_DPS_Total ?? row["Annual DPS Total"]);
  const value = holdingValue(row);
  if(Number.isFinite(annualTotal) && value > 0) return annualTotal / value;

  const dps = parseNum(row.annual_dps ?? row.Annual_DPS);
  const price = parseNum(row.live_price ?? row.price ?? row.Price);
  if(Number.isFinite(dps) && Number.isFinite(price) && price > 0) return dps / price;

  const from500 = incomeFrom500(row);
  if(Number.isFinite(from500)) return from500 / 500;
  return NaN;
}
function incomeFrom500(row){
  const keys = [
    'return_from_500','income_from_500','annual_return_from_500','annual_income_from_500',
    'return_500','income_500','income_on_500','return_on_500',
    '£500_return','£500_income','500_return','500_income',
    'Return From £500','Income From £500','Annual Return From £500','Annual Income From £500',
    'Return from £500','Income from £500','Projected Income From £500','Projected Return From £500'
  ];
  for(const key of keys){
    if(row[key] !== undefined){
      const v = parseNum(row[key]);
      if(Number.isFinite(v) && v >= 0 && v < 200) return v;
    }
  }
  for(const key of Object.keys(row || {})){
    const k = key.toLowerCase();
    if(k.includes('500') && (k.includes('income') || k.includes('return') || k.includes('dividend')) && !k.includes('yield') && !k.includes('score')){
      const v = parseNum(row[key]);
      if(Number.isFinite(v) && v >= 0 && v < 200) return v;
    }
  }
  return NaN;
}
function incomeRate(row){
  const y = parseYield(row);
  return Number.isFinite(y) ? y : NaN;
}
function annualIncomeForAmount(row, amount){
  const y = incomeRate(row);
  return Number.isFinite(y) ? amount * y : 0;
}
function impact(row){ return parseNum(row.promotion_impact_score ?? row.impact ?? row.Impact); }
function buyStrength(row){ return parseNum(row.buy_strength ?? row.buy_strength_score ?? row.BuyStrength ?? row.score ?? row.buy_score); }
function valuationBonus(row){
  const v = String(row.valuation_status ?? row.valuation ?? row.Valuation ?? '').toLowerCase();
  if(v.includes('undervalued') || v.includes('discount')) return 10;
  if(v.includes('fair')) return 4;
  if(v.includes('overvalued')) return -12;
  return 0;
}
function platformFor(ticker){
  const detail=PLATFORM_RULE_DETAILS[shortTicker(ticker)];
  return detail?.preferredAccount || PLATFORM_RULES[shortTicker(ticker)] || 'Check platform';
}
function portraitFor(ticker){
  const s = shortTicker(ticker);
  return PLAYER_PORTRAITS[s] || (PLAYER_BASE + s.toLowerCase() + '_player.png');
}
function portraitPositionFor(ticker){
  return PLAYER_PORTRAIT_POSITIONS[shortTicker(ticker)] || '50% 24%';
}
function portraitScaleFor(ticker){
  return PLAYER_PORTRAIT_SCALES[shortTicker(ticker)] || 1;
}
function portraitFitFor(ticker){
  return PLAYER_PORTRAIT_FITS[shortTicker(ticker)] || 'cover';
}
function uniqueByTicker(rows){
  const map = new Map();
  rows.forEach(row => {
    const t = cleanTicker(row.ticker);
    if(!t) return;
    const score = candidateScore(row);
    const old = map.get(t);
    if(!old || score > candidateScore(old)) map.set(t,row);
  });
  return [...map.values()];
}
function findSecurity(ticker){
  const t = cleanTicker(ticker);
  return activeHoldings().find(r=>cleanTicker(r.ticker)===t)
    || (state.watchlist || []).find(r=>cleanTicker(r.ticker)===t)
    || (state.scout || []).find(r=>cleanTicker(r.ticker)===t)
    || null;
}
function sectorText(row){
  return [row.sector,row.role,row.chemistry_role,row.chemistry_risk,row.squad_role,row.payout_risk,row.name,row.ticker]
    .filter(Boolean).join(' ').toLowerCase();
}
function sectorBucket(row){
  const t = shortTicker(row.ticker);
  const s = sectorText(row);
  if(['RGL','SUPR','PHP','LMP'].includes(t) || s.includes('reit') || s.includes('property')) return 'reit_property';
  if(['FSFL','UKW','FGEN','TRIG','GCP','SEQI'].includes(t) || s.includes('renewable') || s.includes('infrastructure') || s.includes('wind') || s.includes('solar')) return 'infrastructure_renewable';
  if(['LGEN','MNG','SDLF','PHNX'].includes(t) || s.includes('financial')) return 'financials';
  if(['TSCO','ULVR','RKT','SBRY'].includes(t) || s.includes('consumer') || s.includes('defensive')) return 'defensive_quality';
  if(['ARCC'].includes(t) || s.includes('bdc') || s.includes('credit')) return 'credit_income';
  if(['VWRA','IITU'].includes(t) || s.includes('growth') || s.includes('etf')) return 'growth_academy';
  return 'general';
}
function bucketLabel(bucket){
  return ({
    reit_property:'REIT/property',
    infrastructure_renewable:'renewables/infrastructure',
    financials:'financials',
    defensive_quality:'defensive quality',
    credit_income:'credit income',
    growth_academy:'growth academy',
    high_yield_forward:'high-yield',
    general:'general'
  })[bucket] || bucket;
}
function isHighYield(row){
  const y = incomeRate(row);
  return ['RGL','ARCC'].includes(shortTicker(row.ticker)) || (Number.isFinite(y) && y >= 0.10) || sectorText(row).includes('high-yield');
}
function marketFitScore(row){
  const t = shortTicker(row.ticker);
  const s = sectorText(row);
  let score = 70;
  if(['TSCO','ULVR','RKT','SUPR','PHP'].includes(t) || s.includes('defensive')) score += 12;
  if(['FSFL','UKW','FGEN','TRIG'].includes(t) || s.includes('renewable') || s.includes('infrastructure')) score += 8;
  if(['RGL','ARCC'].includes(t)) score -= 4;
  if(String(row.payout_risk || '').toLowerCase().includes('very high')) score -= 18;
  if(String(row.payout_risk || '').toLowerCase().includes('check')) score -= 6;
  if(Number.isFinite(incomeRate(row)) && incomeRate(row) >= 0.10) score += 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}
function parseCheckedDate(value){
  if(!value) return NaN;
  if(value instanceof Date) return value.getTime();
  const s=String(value).trim();
  const uk=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(uk) return new Date(Number(uk[3]),Number(uk[2])-1,Number(uk[1])).getTime();
  const t=Date.parse(s); return Number.isFinite(t)?t:NaN;
}
function dataConfidence(row){
  let score=100;
  const reasons=[];
  const blocking=[];
  const price=parseNum(row.live_price??row.price??row.Price);
  const yieldRate=incomeRate(row);
  const dps=parseNum(row.annual_dps??row.Annual_DPS);
  const low=parseNum(row.low_52w??row.low52w??row['52w_low']);
  const high=parseNum(row.high_52w??row.high52w??row['52w_high']);
  const currency=String(row.currency??row.Currency??'GBP').toUpperCase();
  const notes=String(row.notes??row.manager_note??'');
  if(!(price>0)){score-=70;blocking.push('Live price missing or invalid.');}
  if(!(yieldRate>0)){score-=70;blocking.push('Recurring income rate missing.');}
  else if(yieldRate>0.20){score-=65;blocking.push('Income rate above 20% needs a manual audit.');}
  else if(yieldRate>0.12){score-=18;reasons.push('Very high yield needs extra verification.');}
  if(Number.isFinite(dps)&&dps>0&&price>0&&currency==='GBP'){
    const calculated=dps/price;
    const difference=Math.abs(calculated-yieldRate)/Math.max(yieldRate,.001);
    if(difference>.60){score-=55;blocking.push('Dividend and displayed yield do not reconcile.');}
    else if(difference>.25){score-=22;reasons.push('Dividend/yield reconciliation needs review.');}
  }
  if(low>0&&high>0){
    if(low>high){score-=50;blocking.push('52-week low is above the high.');}
    else if(price>0&&(price<low*.40||price>high*1.60)){score-=45;blocking.push('Live price is inconsistent with the 52-week range.');}
  }
  const checked=parseCheckedDate(row.date_checked??row.last_updated??row.updated_at);
  if(Number.isFinite(checked)){
    const ageDays=(Date.now()-checked)/86400000;
    if(ageDays>180){score-=45;blocking.push('Data is more than six months old.');}
    else if(ageDays>60){score-=18;reasons.push('Data is older than 60 days.');}
  }else{score-=8;reasons.push('No verified data date.');}
  if(/special dividend|one[- ]off/i.test(notes)&&!/excluded from recurring|regular/i.test(notes)){score-=18;reasons.push('Possible special dividend in the income figure.');}
  if(/audited|corrected/i.test(notes)) score=Math.min(100,score+5);
  const status=blocking.length?'block':score>=80?'verified':score>=60?'review':'block';
  if(!blocking.length&&status==='review'&&!reasons.length) reasons.push('One or more data points need review.');
  if(status==='verified'&&!reasons.length) reasons.push('Price, income and range checks verified.');
  return {score:Math.max(0,Math.min(100,Math.round(score))),status,reasons:[...blocking,...reasons]};
}
function valuationQualityScore(row){
  const v=String(row.valuation_status??row.valuation??'').toLowerCase();
  if(v.includes('undervalued')||v.includes('discount')) return 100;
  if(v.includes('neutral')||v.includes('fair')) return 70;
  if(v.includes('overvalued')) return 25;
  return 50;
}
function dividendSafetyScore(row){
  const risk=String(row.payout_risk??'').toLowerCase();
  if(risk.includes('very high')) return 5;
  if(risk.includes('high')) return 25;
  if(risk.includes('check')||risk.includes('review')) return 45;
  if(risk.includes('medium')) return 65;
  if(risk.includes('low')) return 90;
  return 58;
}
function qualityScore(row){
  const values=[buyStrength(row),impact(row),marketFitScore(row)].filter(Number.isFinite);
  return values.length?Math.max(0,Math.min(100,values.reduce((a,b)=>a+b,0)/values.length)):50;
}
function diversificationScore(row,snapshot=exposureSnapshot(),amount=0){
  const bucket=sectorBucket(row);
  const limit=SECTOR_LIMITS[bucket];
  const total=snapshot.totalAfter+amount;
  const share=total>0?((snapshot.buckets[bucket]||0)+amount)/total:0;
  let score=75;
  if(limit){
    const ratio=share/limit;
    score=ratio>=1?5:ratio>=.90?25:ratio>=.75?52:ratio>=.55?72:92;
  }
  const ticker=cleanTicker(row.ticker);
  const tickerShare=total>0?((snapshot.tickers[ticker]||0)+amount)/total:0;
  if(tickerShare>.20) score-=35; else if(tickerShare>.15) score-=18;
  return Math.max(0,Math.min(100,score));
}
function balancedPriorityScore(row,snapshot=exposureSnapshot(),amount=0){
  const y=incomeRate(row);
  const incomeScore=Number.isFinite(y)?Math.max(0,Math.min(100,(y/.10)*100)):0;
  const data=dataConfidence(row);
  const raw=(incomeScore*.30)+(valuationQualityScore(row)*.25)+(dividendSafetyScore(row)*.20)+(diversificationScore(row,snapshot,amount)*.15)+(qualityScore(row)*.10);
  return raw*(data.score/100);
}
function candidateScore(row){return balancedPriorityScore(row,exposureSnapshot(),0);}
function incomePriorityScore(row){
  const y = incomeRate(row);
  if(!Number.isFinite(y) || y <= 0) return -9999;
  const data=dataConfidence(row);
  const incomePart = Math.min(y,0.145) * 1000;
  const marketPart = marketFitScore(row) * 0.18;
  const strengthPart = (buyStrength(row) || 0) * 0.12;
  const impactPart = (impact(row) || 0) * 0.08;
  const valuePart = valuationBonus(row) * 0.30;
  const riskPenalty = (100-dividendSafetyScore(row))*.22;
  return (incomePart + marketPart + strengthPart + impactPart + valuePart - riskPenalty)*(data.score/100);
}
function exposureSnapshot(extra = []){
  const current = activeHoldings();
  const totalBefore = current.reduce((s,r)=>s + holdingValue(r),0);
  const extraTotal = extra.reduce((s,a)=>s + (a.amount || 0),0);
  const totalAfter = totalBefore + extraTotal;
  const buckets = {};
  const tickers = {};
  current.forEach(r=>{
    const v = holdingValue(r);
    const b = sectorBucket(r);
    buckets[b] = (buckets[b] || 0) + v;
    const t = cleanTicker(r.ticker);
    tickers[t] = (tickers[t] || 0) + v;
    if(isHighYield(r)) buckets.high_yield_forward = (buckets.high_yield_forward || 0) + v;
  });
  extra.forEach(a=>{
    const r = a.row;
    const v = a.amount || 0;
    const b = sectorBucket(r);
    buckets[b] = (buckets[b] || 0) + v;
    const t = cleanTicker(r.ticker);
    tickers[t] = (tickers[t] || 0) + v;
    if(isHighYield(r)) buckets.high_yield_forward = (buckets.high_yield_forward || 0) + v;
  });
  return {totalBefore,totalAfter,buckets,tickers};
}
function gateCandidate(row, amount = 0, snapshot = exposureSnapshot()) {
  const reasons = [];
  let status = 'pass';
  const bucket = sectorBucket(row);
  const ticker = cleanTicker(row.ticker);
  const y = incomeRate(row);
  const payoutRisk = String(row.payout_risk ?? '').toLowerCase();
  const valuation = String(row.valuation_status ?? row.valuation ?? '').toLowerCase();
  const data=dataConfidence(row);

  function caution(msg){ if(status !== 'block') status = 'caution'; reasons.push(msg); }
  function block(msg){ status = 'block'; reasons.push(msg); }

  if(data.status==='block') block(data.reasons[0]||'Data confidence failed.');
  else if(data.status==='review') caution(data.reasons[0]||'Data needs review.');
  else reasons.push(`Verified data ${data.score}% confidence.`);

  if(payoutRisk.includes('very high')) block('Payout risk flagged very high.');
  else if(payoutRisk.includes('high')) caution('Payout risk is high.');
  else if(payoutRisk.includes('check')||payoutRisk.includes('review')) caution('Payout/cashflow needs a check.');

  if(valuation.includes('overvalued')) caution('Valuation is above Aurora fair value.');
  if(Number.isFinite(y) && y >= 0.12) caution('Very high income rate; controlled sizing only.');
  else if(Number.isFinite(y) && y >= 0.10) caution('Double-digit yield; controlled sizing only.');

  const afterTotal = snapshot.totalAfter + amount;
  const bucketAfter = (snapshot.buckets[bucket] || 0) + amount;
  const tickerAfter = (snapshot.tickers[ticker] || 0) + amount;
  const bucketShare = afterTotal > 0 ? bucketAfter / afterTotal : NaN;
  const tickerShare = afterTotal > 0 ? tickerAfter / afterTotal : NaN;
  const highYieldAfter = (snapshot.buckets.high_yield_forward || 0) + (isHighYield(row) ? amount : 0);
  const highYieldShare = afterTotal > 0 ? highYieldAfter / afterTotal : NaN;

  const bucketLimit = SECTOR_LIMITS[bucket];
  if(bucketLimit && Number.isFinite(bucketShare)){
    if(bucketShare > bucketLimit) block(`${bucketLabel(bucket)} would exceed the ${(bucketLimit*100).toFixed(0)}% post-buy limit.`);
    else if(bucketShare > bucketLimit*.90) caution(`${bucketLabel(bucket)} would be within 10% of its limit.`);
  }
  if(Number.isFinite(tickerShare)){
    if(tickerShare > SECTOR_LIMITS.single_holding) block('This holding would exceed the 25% single-position limit.');
    else if(tickerShare > SECTOR_LIMITS.single_holding*.90) caution('This holding would be close to the single-position limit.');
  }
  if(isHighYield(row) && Number.isFinite(highYieldShare)){
    if(highYieldShare > SECTOR_LIMITS.high_yield_forward) block('The high-yield bucket would exceed the 10% control limit.');
    else if(highYieldShare > SECTOR_LIMITS.high_yield_forward*.90) caution('High-yield exposure would be close to its limit.');
  }

  if(!Number.isFinite(y) || y <= 0) block('Recurring income rate missing.');
  if(platformFor(row.ticker).toLowerCase().includes('check')) caution('Platform availability still needs confirmation.');
  if(!reasons.length) reasons.push('Passes verified-data and post-purchase portfolio checks.');

  return {status,reasons,bucket,bucketShare,tickerShare,data};
}
function candidatePool(){
  const rows = uniqueByTicker([...(state.watchlist || []), ...(state.scout || []), ...activeHoldings()]);
  return rows
    .filter(row => cleanTicker(row.ticker))
    .filter(row => Number.isFinite(incomeRate(row)) || Number.isFinite(impact(row)) || Number.isFinite(buyStrength(row)))
    .sort((a,b)=>candidateScore(b)-candidateScore(a));
}
function roundTo25(n){
  return Math.max(0, Math.round(n / 25) * 25);
}
function meaningfulMinimum(budget){
  if(budget>=3000) return 250;
  if(budget>=1500) return 150;
  if(budget>=750) return 100;
  return budget>=200?50:25;
}
function analyseTransferCandidates(budget){
  const snapshot=exposureSnapshot();
  const pool=candidatePool();
  const minimum=meaningfulMinimum(budget);
  const gated=pool.map(row=>{
    const gate=gateCandidate(row,Math.min(minimum,budget),snapshot);
    return {row,gate,score:balancedPriorityScore(row,snapshot,Math.min(minimum,budget)),incomeScore:incomePriorityScore(row)};
  });
  const minimumIncomeRate=budget>=1000?0.035:0.03;
  const available=gated
    .filter(item=>item.gate.status!=='block')
    .filter(item=>!excludedTickers.has(cleanTicker(item.row.ticker)))
    .filter(item=>Number.isFinite(incomeRate(item.row))&&incomeRate(item.row)>=minimumIncomeRate)
    .filter(item=>item.gate.data?.score>=60);
  return {snapshot,gated,available,minimum,minimumIncomeRate};
}
function selectRouteCandidates(mode,available,budget,snapshot,minimum){
  const selected=[];
  const remaining=[...available];
  while(selected.length<4&&remaining.length){
    let bestIndex=-1,bestScore=-Infinity;
    for(let i=0;i<remaining.length;i++){
      const item=remaining[i];
      const bucketCount=selected.filter(x=>x.gate.bucket===item.gate.bucket).length;
      if(bucketCount>=2) continue;
      const provisional=selected.map(x=>({row:x.row,amount:minimum}));
      const gate=gateCandidate(item.row,minimum,exposureSnapshot(provisional));
      if(gate.status==='block') continue;
      let score=mode==='maximum'?incomePriorityScore(item.row):balancedPriorityScore(item.row,exposureSnapshot(provisional),minimum);
      if(mode==='balanced') score-=bucketCount*18;
      if(gate.status==='caution') score-=12;
      if(score>bestScore){bestScore=score;bestIndex=i;}
    }
    if(bestIndex<0) break;
    selected.push(remaining.splice(bestIndex,1)[0]);
  }
  while(selected.length&&selected.length*minimum>budget) selected.pop();
  return selected;
}
function sanitiseManualAmounts(selected,budget,mode){
  const amounts=new Map();
  selected.forEach(item=>{
    const requested=manualAmounts.get(cleanTicker(item.row.ticker));
    if(Number.isFinite(requested)) amounts.set(cleanTicker(item.row.ticker),roundTo25(Math.max(0,requested)));
  });
  let spent=[...amounts.values()].reduce((a,b)=>a+b,0);
  if(spent>budget){
    const ranked=[...selected].sort((a,b)=>(mode==='maximum'?incomePriorityScore(a.row):a.score)-(mode==='maximum'?incomePriorityScore(b.row):b.score));
    let over=spent-budget;
    for(const item of ranked){
      const ticker=cleanTicker(item.row.ticker);
      while(over>0&&(amounts.get(ticker)||0)>=25){amounts.set(ticker,(amounts.get(ticker)||0)-25);over-=25;}
    }
  }
  return amounts;
}
function allocateRoute(mode,budget,available,snapshot,options={}){
  const minimum=meaningfulMinimum(budget);
  const selected=selectRouteCandidates(mode,available,budget,snapshot,minimum);
  if(!selected.length) return {selected:[],rows:[],spent:0,holdback:budget,totalIncome:0,minimumEach:minimum,balanceScore:0};
  const maxStockShare=mode==='maximum'?.40:.35;
  const maxSectorShare=mode==='maximum'?.50:.45;
  const fixedTickers=new Set();
  const amounts=new Map();

  if(!options.ignoreManual){
    selected.forEach(item=>{
      const ticker=cleanTicker(item.row.ticker);
      const requested=manualAmounts.get(ticker);
      if(!Number.isFinite(requested)) return;
      const stockCap=roundTo25(budget*(item.gate.status==='caution'?.20:maxStockShare));
      amounts.set(ticker,Math.min(stockCap,roundTo25(Math.max(0,requested))));
      fixedTickers.add(ticker);
    });
  }

  let spent=[...amounts.values()].reduce((a,b)=>a+b,0);
  if(spent>budget){
    let over=spent-budget;
    const fixedByLowestPriority=[...selected].filter(item=>fixedTickers.has(cleanTicker(item.row.ticker))).sort((a,b)=>(mode==='maximum'?incomePriorityScore(a.row):a.score)-(mode==='maximum'?incomePriorityScore(b.row):b.score));
    for(const item of fixedByLowestPriority){
      const ticker=cleanTicker(item.row.ticker);
      while(over>0&&(amounts.get(ticker)||0)>=25){amounts.set(ticker,(amounts.get(ticker)||0)-25);over-=25;}
    }
    spent=[...amounts.values()].reduce((a,b)=>a+b,0);
  }

  for(const item of selected){
    const ticker=cleanTicker(item.row.ticker);
    if(fixedTickers.has(ticker)) continue;
    const other=selected.filter(x=>cleanTicker(x.row.ticker)!==ticker).map(x=>({row:x.row,amount:amounts.get(cleanTicker(x.row.ticker))||0}));
    const sectorAllocated=selected.filter(x=>x.gate.bucket===item.gate.bucket).reduce((sum,x)=>sum+(amounts.get(cleanTicker(x.row.ticker))||0),0);
    const gate=gateCandidate(item.row,minimum,exposureSnapshot(other));
    if(gate.status!=='block'&&spent+minimum<=budget&&sectorAllocated+minimum<=roundTo25(budget*maxSectorShare)){
      amounts.set(ticker,minimum);spent+=minimum;
    }
  }

  let remaining=Math.max(0,budget-spent);
  while(remaining>=25){
    let best=null;
    for(const item of selected){
      const ticker=cleanTicker(item.row.ticker);
      if(fixedTickers.has(ticker)) continue;
      const current=amounts.get(ticker)||0;
      const stockCap=roundTo25(budget*(item.gate.status==='caution'?.20:maxStockShare));
      if(current+25>stockCap) continue;
      const bucket=item.gate.bucket;
      const sectorAllocated=selected.filter(x=>x.gate.bucket===bucket).reduce((sum,x)=>sum+(amounts.get(cleanTicker(x.row.ticker))||0),0);
      if(sectorAllocated+25>roundTo25(budget*maxSectorShare)) continue;
      const other=selected.filter(x=>cleanTicker(x.row.ticker)!==ticker).map(x=>({row:x.row,amount:amounts.get(cleanTicker(x.row.ticker))||0}));
      const proposedGate=gateCandidate(item.row,current+25,exposureSnapshot(other));
      if(proposedGate.status==='block') continue;
      let score=mode==='maximum'?incomePriorityScore(item.row):balancedPriorityScore(item.row,exposureSnapshot(other),current+25);
      if(proposedGate.status==='caution') score-=14;
      if(!best||score>best.score) best={item,ticker,score,gate:proposedGate};
    }
    if(!best) break;
    amounts.set(best.ticker,(amounts.get(best.ticker)||0)+25);
    remaining-=25;
  }

  const rows=selected.map(item=>{
    const ticker=cleanTicker(item.row.ticker);
    let amount=amounts.get(ticker)||0;
    const other=selected.filter(x=>cleanTicker(x.row.ticker)!==ticker).map(x=>({row:x.row,amount:amounts.get(cleanTicker(x.row.ticker))||0}));
    let gate=gateCandidate(item.row,amount,exposureSnapshot(other));
    while(amount>0&&gate.status==='block'){
      amount=Math.max(0,amount-25);
      amounts.set(ticker,amount);
      gate=gateCandidate(item.row,amount,exposureSnapshot(other));
    }
    return {...item,gate,amount,income:annualIncomeForAmount(item.row,amount)};
  }).filter(item=>item.amount>=minimum||fixedTickers.has(cleanTicker(item.row.ticker))&&item.amount>0);

  spent=rows.reduce((sum,item)=>sum+item.amount,0);
  const balanceScore=rows.length?rows.reduce((sum,item)=>sum+balancedPriorityScore(item.row,exposureSnapshot(rows.filter(x=>x!==item).map(x=>({row:x.row,amount:x.amount}))),item.amount),0)/rows.length:0;
  return {selected:rows.map(({row,gate,score,incomeScore})=>({row,gate,score,incomeScore})),rows,spent,holdback:Math.max(0,budget-spent),totalIncome:rows.reduce((sum,item)=>sum+item.income,0),minimumEach:minimum,balanceScore};
}
function buildDealSheet(){
  const budget=Math.max(0,parseNum($('transferBudgetInput')?.value)||0);
  const analysis=analyseTransferCandidates(budget);
  const mode=routeMode==='maximum'?'maximum':'balanced';
  const plan=allocateRoute(mode,budget,analysis.available,analysis.snapshot);
  if(!plan.rows.length){
    return {budget,chosen:[],rows:[],holdback:budget,requestedSpent:0,autoReduced:0,status:'No buy',statusClass:'bad',route:'Hold cash',reason:'No verified candidate clears the post-purchase portfolio gates today.',bench:analysis.gated.filter(x=>x.gate.status!=='block').slice(0,5),watch:analysis.gated.filter(x=>x.gate.status==='block').slice(0,5),eligibleCandidates:analysis.available,mode,totalIncome:0,balanceScore:0};
  }
  const cautionCount=plan.rows.filter(item=>item.gate.status==='caution').length;
  const status=cautionCount?`${mode==='maximum'?'Maximum income':'Balanced'} route controlled`:`${mode==='maximum'?'Maximum income':'Balanced'} route ready`;
  const statusClass=cautionCount?'warn':'good';
  const route=mode==='maximum'?'Maximum Income Route':'Balanced Monthly Route';
  const reason=mode==='maximum'
    ?'Maximum-income route selected. Aurora is maximising verified recurring income while still enforcing hard post-purchase sector, high-yield and single-holding limits.'
    :'Balanced route selected. Aurora weights income 30%, valuation 25%, dividend safety 20%, diversification 15% and business quality 10%, with cash holdback allowed.';
  const selected=new Set(plan.rows.map(item=>cleanTicker(item.row.ticker)));
  const bench=analysis.gated.filter(item=>!selected.has(cleanTicker(item.row.ticker))&&item.gate.status!=='block').sort((a,b)=>b.score-a.score).slice(0,5);
  const watch=analysis.gated.filter(item=>item.gate.status==='block'||(!selected.has(cleanTicker(item.row.ticker))&&item.gate.status==='caution')).slice(0,5);
  return {budget,chosen:plan.selected,rows:plan.rows,holdback:plan.holdback,requestedSpent:plan.spent,autoReduced:0,status,statusClass,route,reason,totalIncome:plan.totalIncome,bench,watch,eligibleCandidates:analysis.available,mode,balanceScore:plan.balanceScore,minimumEach:plan.minimumEach};
}
function buildBestReturnAllocation(deal){
  const budget=roundTo25(Math.max(0,deal.budget||0));
  const analysis=analyseTransferCandidates(budget);
  return allocateRoute('maximum',budget,analysis.available,analysis.snapshot,{ignoreManual:true});
}
function buildBalancedComparison(deal){
  const budget=roundTo25(Math.max(0,deal.budget||0));
  const analysis=analyseTransferCandidates(budget);
  return allocateRoute('balanced',budget,analysis.available,analysis.snapshot,{ignoreManual:true});
}
function renderDeploymentPlan(){
  readDeploymentInputs();
  persistDeploymentPlan();
  const months=deploymentProgrammeMonths();
  deploymentPlan.currentMonth=Math.min(Math.max(1,deploymentPlan.currentMonth),Math.max(months,1));
  if($('deploymentMonthInput')) $('deploymentMonthInput').value=deploymentPlan.currentMonth;
  const release=deploymentReleaseForMonth(deploymentPlan.currentMonth);
  const coreUsed=Math.min(deploymentPlan.corePot,deploymentPlan.currentMonth*deploymentPlan.coreMonthly);
  const etfUsed=Math.min(deploymentPlan.etfPot,deploymentPlan.currentMonth*deploymentPlan.etfMonthly);
  const coreRemaining=Math.max(0,deploymentPlan.corePot-coreUsed);
  const etfRemaining=Math.max(0,deploymentPlan.etfPot-etfUsed);
  if($('monthlyPlanBadge')) $('monthlyPlanBadge').textContent=`Month ${deploymentPlan.currentMonth} of ${months}`;
  if($('monthlyReleaseTotal')) $('monthlyReleaseTotal').textContent=money(release.total);
  if($('monthlyReleaseSplit')) $('monthlyReleaseSplit').textContent=`${money(release.core)} core + ${money(release.etf)} ETF pot`;
  if($('monthlyRemainingTotal')) $('monthlyRemainingTotal').textContent=money(coreRemaining+etfRemaining);
  if($('monthlyRemainingSplit')) $('monthlyRemainingSplit').textContent=`${money(coreRemaining)} core + ${money(etfRemaining)} ETF pot`;
  const monthsRemaining=Math.max(0,months-deploymentPlan.currentMonth);
  if($('monthlyMonthsRemaining')) $('monthlyMonthsRemaining').textContent=`${monthsRemaining} month${monthsRemaining===1?'':'s'}`;
  if($('monthlyEndNote')) $('monthlyEndNote').textContent=monthsRemaining?`Temporary pots finish after month ${months}`:'Temporary pots fully deployed after this month';
  const grid=$('monthlyScheduleGrid');
  if(grid) grid.innerHTML=Array.from({length:months},(_,index)=>{
    const month=index+1;const item=deploymentReleaseForMonth(month);const cls=month===deploymentPlan.currentMonth?'active':month<deploymentPlan.currentMonth?'done':'';
    return `<article class="month-card ${cls}"><i></i><small>Month ${month}</small><strong>${money(item.total)}</strong><span>${money(item.core)} core<br>${money(item.etf)} ETF pot</span></article>`;
  }).join('');
}
function renderBestReturnAllocation(deal){
  const maxPlan=buildBestReturnAllocation(deal);
  const balancedPlan=buildBalancedComparison(deal);
  window.AURORA_BEST_RETURN_PLAN=maxPlan;
  window.AURORA_BALANCED_ROUTE_PLAN=balancedPlan;
  const maxButton=$('applyBestReturn');if(maxButton) maxButton.disabled=!maxPlan.rows.length;
  const balancedButton=$('applyBalancedRoute');if(balancedButton) balancedButton.disabled=!balancedPlan.rows.length;
  if($('routeModeBadge')) $('routeModeBadge').textContent=routeMode==='maximum'?'Maximum-income route active':'Balanced route active';
  $('balancedRouteCard')?.classList.toggle('active',routeMode!=='maximum');
  $('maximumRouteCard')?.classList.toggle('active',routeMode==='maximum');
  if($('balancedRouteIncome')) $('balancedRouteIncome').textContent=balancedPlan.rows.length?`${money(balancedPlan.totalIncome)}/yr`:'—';
  if($('balancedRouteMonthly')) $('balancedRouteMonthly').textContent=balancedPlan.rows.length?`${money(balancedPlan.totalIncome/12)}/mo`:'—';
  if($('balancedRouteScore')) $('balancedRouteScore').textContent=balancedPlan.rows.length?`${Math.round(balancedPlan.balanceScore)}/100`:'—';
  if($('balancedRouteWarnings')) $('balancedRouteWarnings').textContent=balancedPlan.rows.length
    ?`${balancedPlan.rows.length} meaningful signings • ${money(balancedPlan.spent)} allocated${balancedPlan.holdback?` • ${money(balancedPlan.holdback)} held back`:''}.`
    :'No balanced route currently clears the verified-data and concentration gates.';
  if($('bestReturnIncome')) $('bestReturnIncome').textContent=maxPlan.rows.length?`${money(maxPlan.totalIncome)}/yr`:'—';
  if($('bestReturnMonthly')) $('bestReturnMonthly').textContent=maxPlan.rows.length?`${money(maxPlan.totalIncome/12)}/mo`:'—';
  const uplift=maxPlan.totalIncome-balancedPlan.totalIncome;
  if($('bestReturnUplift')){$('bestReturnUplift').textContent=maxPlan.rows.length?`${uplift>=0?'+':''}${money(uplift)}/yr`:'—';$('bestReturnUplift').style.color=uplift>0?'#fde68a':'#cbd5e1';}
  if($('bestReturnSpend')) $('bestReturnSpend').textContent=maxPlan.rows.length?`${money(maxPlan.spent)} allocated${maxPlan.holdback?` • ${money(maxPlan.holdback)} held back`:''}`:'No permitted maximum-income route.';
  const grid=$('bestReturnGrid');
  if(grid) grid.innerHTML=maxPlan.rows.length?maxPlan.rows.map((item,index)=>{
    const rate=incomeRate(item.row);const data=item.gate.data||dataConfidence(item.row);
    return `<div class="best-return-card"><div class="best-return-card-top"><strong>#${index+1} ${displayTicker(item.row.ticker)}</strong><b>${money(item.amount)}</b></div><span>${displayName(item.row)} • ${Number.isFinite(rate)?(rate*100).toFixed(2)+'% income rate':'income check'}</span><span>Projected income: <strong style="display:inline;color:#86efac">${money(item.income)}/yr</strong> <em class="data-confidence ${data.status}"><i></i>${data.score}% verified</em></span></div>`;
  }).join(''):'<div class="loading">No verified maximum-income route is available.</div>';
  if($('bestReturnNote')) $('bestReturnNote').textContent=maxPlan.rows.length
    ?`Maximum income uses portfolio-aware company and sector sizing, while the hard post-buy limits remain decisive. The minimum meaningful allocation is ${money(maxPlan.minimumEach)} and cash is held only when no safe £25 block remains.`
    :'The maximum-income comparison will appear when at least one verified candidate clears every hard gate.';
}

function visualThemeFor(row){
  const t = cleanTicker(row.ticker);
  const n = `${t} ${displayName(row)}`.toLowerCase();
  if(['TRIG','FSFL','UKW','FGEN','GCP'].includes(t) || /wind|solar|renew|infrastructure/.test(n)) return 'renewables';
  if(['ULVR','TSCO','SBRY','IMB'].includes(t) || /unilever|consumer|tesco|supermarket/.test(n)) return 'consumer';
  if(['ARCC','OSB','LGEN','MNG','IUKD','IITU','VWRA'].includes(t) || /capital|bank|financial|ares/.test(n)) return 'finance';
  if(['RGL','SUPR','PHP','BBOX','LAND'].includes(t) || /reit|property|regional|health/.test(n)) return 'property';
  return 'quality';
}
function themePalette(theme){
  const map = {
    renewables:{a:'#082f49',b:'#065f46',c:'#34d399',d:'#22d3ee',accent:'#bbf7d0'},
    consumer:{a:'#1e293b',b:'#4c1d95',c:'#fbbf24',d:'#60a5fa',accent:'#fde68a'},
    finance:{a:'#0f172a',b:'#172554',c:'#60a5fa',d:'#a78bfa',accent:'#bfdbfe'},
    property:{a:'#111827',b:'#3f3f46',c:'#fb7185',d:'#fbbf24',accent:'#fecdd3'},
    quality:{a:'#0f172a',b:'#0b1730',c:'#22d3ee',d:'#60a5fa',accent:'#dbeafe'}
  };
  return map[theme] || map.quality;
}
function visualStrapFor(row){
  const theme = visualThemeFor(row);
  if(theme === 'renewables') return 'Renewable income target';
  if(theme === 'consumer') return 'Quality balance target';
  if(theme === 'finance') return 'Income engine target';
  if(theme === 'property') return 'Property income target';
  return 'Approved squad option';
}
function visualStoryFor(item){
  const y = incomeRate(item.row);
  const reasons = item.gate?.reasons || [];
  if(item.selected) return `Approved for the final deal sheet with ${Number.isFinite(y) ? (y*100).toFixed(2)+'% estimated income rate' : 'a live income rate'} and ${money(item.income)} a year from the planned buy.`;
  return reasons[0] || 'High on the shortlist, but just outside the final deal sheet for this budget.';
}
function silhouettePhotoDataUri(row){
  const ticker = displayTicker(row.ticker);
  const theme = visualThemeFor(row);
  const p = themePalette(theme);
  const strap = visualStrapFor(row).toUpperCase();
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 440">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.a}"/>
        <stop offset="100%" stop-color="${p.b}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="18%" r="70%">
        <stop offset="0%" stop-color="${p.d}" stop-opacity="0.50"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="jersey" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.c}"/>
        <stop offset="100%" stop-color="${p.d}"/>
      </linearGradient>
    </defs>
    <rect width="360" height="440" rx="26" fill="url(#bg)"/>
    <rect width="360" height="440" rx="26" fill="url(#glow)"/>
    <circle cx="72" cy="78" r="42" fill="rgba(255,255,255,0.08)"/>
    <circle cx="300" cy="62" r="58" fill="rgba(255,255,255,0.06)"/>
    <path d="M0 338 Q90 304 180 338 T360 338 L360 440 L0 440 Z" fill="rgba(255,255,255,0.08)"/>
    <ellipse cx="180" cy="418" rx="136" ry="88" fill="rgba(2,6,23,0.40)"/>
    <path d="M108 410 Q130 296 180 284 Q230 296 252 410 Z" fill="url(#jersey)"/>
    <path d="M136 410 Q150 325 180 318 Q210 325 224 410 Z" fill="rgba(255,255,255,0.13)"/>
    <rect x="126" y="328" width="108" height="26" rx="13" fill="rgba(255,255,255,0.18)"/>
    <text x="180" y="346" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#ffffff">${ticker}</text>
    <rect x="138" y="226" width="84" height="44" rx="22" fill="#d6a27b"/>
    <circle cx="180" cy="172" r="68" fill="#e7b58c"/>
    <path d="M118 164 Q122 92 180 92 Q238 92 242 164 L242 176 Q214 160 180 160 Q146 160 118 176 Z" fill="#0f172a"/>
    <path d="M132 150 Q146 118 180 116 Q214 118 228 150 Q205 138 180 138 Q155 138 132 150 Z" fill="#111827"/>
    <circle cx="154" cy="176" r="5" fill="#1f2937"/>
    <circle cx="206" cy="176" r="5" fill="#1f2937"/>
    <path d="M156 214 Q180 228 204 214" fill="none" stroke="#9a3412" stroke-width="5" stroke-linecap="round"/>
    <path d="M104 408 Q132 340 148 324" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="8" stroke-linecap="round"/>
    <path d="M256 408 Q228 340 212 324" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="8" stroke-linecap="round"/>
    <text x="24" y="34" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="${p.accent}">${strap}</text>
  </svg>`;
  return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}")`;
}
function silhouettePhotoSrc(row){
  return silhouettePhotoDataUri(row).replace(/^url\("?/, '').replace(/"?\)$/, '');
}
function playerPhotoSrc(row){
  return portraitFor(row.ticker) || silhouettePhotoSrc(row);
}
function playerPhotoDataUri(row){
  const portrait = portraitFor(row.ticker);
  return portrait ? `url("${portrait}"), ${silhouettePhotoDataUri(row)}` : silhouettePhotoDataUri(row);
}
function buildTopTransferVisuals(deal){
  const visual = [];
  const seen = new Set();
  for(const row of (deal.rows || [])){
    const t = cleanTicker(row.row.ticker);
    if(seen.has(t)) continue;
    seen.add(t);
    visual.push({row:row.row, amount:row.amount, income:row.income, gate:row.gate, score:row.score, selected:true});
  }
  for(const item of (deal.bench || [])){
    const t = cleanTicker(item.row.ticker);
    if(seen.has(t)) continue;
    seen.add(t);
    visual.push({row:item.row, amount:NaN, income:NaN, gate:item.gate, score:item.score, selected:false});
    if(visual.length >= 4) break;
  }
  return visual.slice(0,4);
}
function renderDeadlineBar(deal){
  const box = $('deadlineDayBar');
  if(!box) return;
  const items = buildTopTransferVisuals(deal);
  if(!items.length){
    box.innerHTML = '<div class="loading error">Deadline day board unavailable.</div>';
    return;
  }
  const strip = items.map((item,idx)=>{
    const t = displayTicker(item.row.ticker);
    const buy = Number.isFinite(item.amount) ? money(item.amount) : 'Watch';
    const income = Number.isFinite(item.income) ? money(item.income)+'/yr' : 'Shortlist';
    return `<span class="deadline-item"><span class="deadline-rank">#${idx+1}</span><strong>${t}</strong><b>${buy}</b><em>${income}</em></span>`;
  }).join('');
  box.innerHTML = `<div class="deadline-day-inner"><div class="deadline-day-tag"><span class="pulse"></span>Deadline Day</div><div class="deadline-day-strip">${strip}</div></div>`;
}

function renderTopTransferBoard(deal){
  const box = $('topTransferBoard');
  if(!box) return;
  const items = buildTopTransferVisuals(deal);
  if(!items.length){
    box.innerHTML = '<div class="loading error">No visual shortlist available from the current Aurora data.</div>';
    return;
  }
  box.innerHTML = items.map((item, idx) => {
    const row = item.row;
    const ticker = displayTicker(row.ticker);
    const rate = incomeRate(row);
    const approvalClass = item.gate?.status === 'pass' ? 'green' : 'amber';
    const approvalText = item.selected ? 'Final sheet' : (item.gate?.status === 'pass' ? 'Approved' : 'Watch');
    const buyText = Number.isFinite(item.amount) ? money(item.amount) : 'Watch';
    const incomeText = Number.isFinite(item.income) ? money(item.income) : '—';
    const scoreText = Number.isFinite(item.score) ? Math.round(item.score) : '—';
    const cardState = item.selected ? 'selected' : 'watch';
    const ribbonClass = item.selected ? 'final' : (item.gate?.status === 'pass' ? 'approved' : 'watch');
    const ribbonText = item.selected ? 'Done Deal' : (item.gate?.status === 'pass' ? 'Approved Target' : 'Watch List');
    return `<article class="top-transfer-card ${idx === 0 ? 'lead' : ''} ${cardState}">
      <div class="player-photo-frame">
        <div class="transfer-rank-chip">#${idx+1}</div>
        <div class="transfer-approval-chip ${approvalClass}">${approvalText}</div>
        <div class="deal-ribbon ${ribbonClass}">${ribbonText}</div>
        <div class="player-photo" style="background-image:${playerPhotoDataUri(row)};">
          <img class="player-img" src="${playerPhotoSrc(row)}" alt="${ticker} player photo" style="object-fit:${portraitFitFor(row.ticker)};object-position:${portraitPositionFor(row.ticker)};transform:scale(${portraitScaleFor(row.ticker)});transform-origin:center top;" onerror="this.onerror=null;this.src='${silhouettePhotoSrc(row)}';">
          <div class="player-photo-overlay"><strong>${ticker}</strong><span>${visualStrapFor(row)}</span></div>
        </div>
      </div>
      <div class="transfer-card-body">
        <h4>${displayName(row)}</h4>
        <p>${platformFor(row.ticker)} • ${item.selected ? 'On the final transfer slip' : 'On the live shortlist'}</p>
        <div class="transfer-card-metrics">
          <div class="transfer-card-metric"><small>Planned buy</small><strong>${buyText}</strong></div>
          <div class="transfer-card-metric"><small>Est. yearly</small><strong>${Number.isFinite(item.income) ? incomeText+'/yr' : 'Watch'}</strong></div>
          <div class="transfer-card-metric"><small>${item.selected ? 'Income rate' : 'Desk score'}</small><strong>${item.selected && Number.isFinite(rate) ? (rate*100).toFixed(2)+'%' : scoreText}</strong></div>
        </div>
        <div class="transfer-storyline">${visualStoryFor(item)}</div>
      </div>
    </article>`;
  }).join('');
}

function renderTransferTicker(deal){
  const ticker = $('transferTicker');
  if(!ticker) return;
  const lead = deal.rows?.[0];
  const leadText = lead ? `${displayTicker(lead.row.ticker)} ${money(lead.amount)}` : 'No signing cleared yet';
  const income = Number.isFinite(deal.totalIncome) ? money(deal.totalIncome) : '—';
  const names = (deal.rows || []).slice(1,4).map(r => `<span class="transfer-ticker-item"><span class="transfer-ticker-dot"></span>Next: <b>${displayTicker(r.row.ticker)}</b> <strong>${money(r.amount)}</strong></span>`).join('');
  const content = `
    <div class="transfer-ticker-content">
      <span class="transfer-ticker-item"><span class="transfer-ticker-tag">Transfer Wire</span></span>
      <span class="transfer-ticker-item"><span class="transfer-ticker-dot"></span>Lead signing: <b>${leadText}</b></span>
      <span class="transfer-ticker-item"><span class="transfer-ticker-dot"></span>Route: <strong>${deal.route}</strong></span>
      <span class="transfer-ticker-item"><span class="transfer-ticker-dot"></span>Yearly income added: <strong>${income}</strong></span>
      <span class="transfer-ticker-item"><span class="transfer-ticker-dot"></span>Holdback: <strong>${money(deal.holdback || 0)}</strong></span>
      ${names}
    </div>`;
  ticker.innerHTML = content + content.replace('<div class="transfer-ticker-content">','<div class="transfer-ticker-content" aria-hidden="true">');
}
function renderKpis(deal){
  const totalIncome = deal.rows.reduce((s,r)=>s+r.income,0);
  const allocated = Math.max(0,(deal.budget||0)-(deal.holdback||0));
  const lead = deal.rows?.[0];
  const routeTickers = deal.rows?.map(r=>displayTicker(r.row.ticker)).join(' • ') || 'Hold cash';
  const greenCount = deal.rows?.filter(r=>r.gate.status === 'pass').length || 0;
  const cautionCount = deal.rows?.filter(r=>r.gate.status === 'caution').length || 0;
  const platformChecks = deal.rows?.filter(r=>platformFor(r.row.ticker).toLowerCase().includes('check')).length || 0;
  const blendedRate = allocated > 0 ? totalIncome / allocated : NaN;
  const incomePerThousand = allocated > 0 ? (totalIncome / allocated) * 1000 : NaN;
  const remaining = Math.max(0,deal.holdback||0);

  if($('heroTransferBudget')) $('heroTransferBudget').textContent = money(deal.budget || 0);
  if($('heroApprovedSignings')) $('heroApprovedSignings').textContent = String(deal.rows?.length || 0);
  if($('heroApprovedSigningsNote')) $('heroApprovedSigningsNote').textContent = deal.rows?.length
    ? `${greenCount} green light • ${cautionCount} controlled`
    : 'No targets currently clear the transfer gates';
  if($('heroCashRemaining')) $('heroCashRemaining').textContent = money(remaining);
  if($('heroCashRemainingNote')) $('heroCashRemainingNote').textContent = (deal.autoReduced||0)>0
    ? `${money(deal.autoReduced)} automatically adjusted`
    : remaining > 0 ? 'Still available to allocate' : 'Full transfer budget assigned';

  if($('headlineLead')) $('headlineLead').textContent = lead ? displayTicker(lead.row.ticker) : 'No signing';
  if($('headlineLeadNote')) $('headlineLeadNote').innerHTML = lead
    ? `<span class="kpi-line">${money(lead.amount)} allocation • ${platformFor(lead.row.ticker)}</span><span class="kpi-line good">${money(lead.income)}/yr • ${Number.isFinite(incomeRate(lead.row)) ? (incomeRate(lead.row)*100).toFixed(2)+'% income rate' : 'income check'}</span>`
    : '<span class="kpi-line bad">No candidate has cleared the desk.</span>';

  if($('headlineRoute')) $('headlineRoute').textContent = routeTickers;
  if($('headlineRouteNote')) $('headlineRouteNote').innerHTML = deal.rows.length
    ? `<span class="kpi-line">${deal.rows.length} signing${deal.rows.length === 1 ? '' : 's'} • ${money(allocated)} allocated</span><span class="kpi-line ${deal.holdback>0?'warn':'good'}">${deal.holdback>0 ? money(deal.holdback)+' cash remaining' : 'Full route funded'}</span>`
    : '<span class="kpi-line bad">No automatic route available.</span>';

  if($('headlineIncome')) $('headlineIncome').textContent = `${money(totalIncome)}/yr`;
  if($('headlineMonthly')) $('headlineMonthly').innerHTML = `<span class="kpi-line good">${money(totalIncome / 12)}/month added</span><span class="kpi-line">${Number.isFinite(blendedRate)?(blendedRate*100).toFixed(2)+'% blended income rate':'—'} • ${Number.isFinite(incomePerThousand)?money(incomePerThousand)+'/yr per £1,000':'—'}</span>`;

  const headlineStatusText = deal.statusClass === 'bad' ? 'Hold fire' : deal.statusClass === 'warn' ? 'Controlled route' : 'Ready to place';
  if($('headlineStatus')) $('headlineStatus').textContent = headlineStatusText;
  if($('headlineStatusNote')) $('headlineStatusNote').innerHTML = `<span class="kpi-line ${deal.statusClass==='bad'?'bad':deal.statusClass==='warn'?'warn':'good'}">${greenCount} green light • ${cautionCount} controlled</span><span class="kpi-line">${platformChecks} platform check${platformChecks===1?'':'s'} • ${deal.holdback>0?money(deal.holdback)+' unallocated':'budget fully assigned'}</span>`;

  if($('dealBudgetContext')) $('dealBudgetContext').textContent = deal.rows.length
    ? `${deal.rows.length} deals • Average allocation ${money(allocated/deal.rows.length)} • Projected ${money(totalIncome)}/year added`
    : 'No approved deals currently using the budget.';
  if($('allocatedTransferBudget')) $('allocatedTransferBudget').textContent = money(allocated);
  if($('remainingTransferBudget')) $('remainingTransferBudget').textContent = money(remaining);
  const remainingCard=$('remainingTransferBudgetCard');
  if(remainingCard){
    remainingCard.classList.toggle('over',(deal.autoReduced||0)>0);
    remainingCard.classList.toggle('remaining',!((deal.autoReduced||0)>0));
    const label=remainingCard.querySelector('small');
    if(label) label.textContent=(deal.autoReduced||0)>0?'Auto Adjusted':'Still Available';
    if((deal.autoReduced||0)>0 && $('remainingTransferBudget')) $('remainingTransferBudget').textContent=money(deal.autoReduced);
  }
  const usedPct=deal.budget>0?Math.min(100,(allocated/deal.budget)*100):0;
  if($('allocationBudgetProgress')) $('allocationBudgetProgress').style.width=`${usedPct}%`;
  if($('allocationBudgetNote')){
    const note=$('allocationBudgetNote');
    note.classList.toggle('warn',(deal.autoReduced||0)>0);
    note.textContent=(deal.autoReduced||0)>0
      ? `Your requested allocations were ${money(deal.autoReduced)} over budget, so Aurora reduced lower-priority allocations automatically.`
      : `${money(allocated)} of ${money(deal.budget||0)} allocated • ${money(remaining)} left to assign.`;
  }
  const statusCard = $('headlineStatus')?.closest('.window-kpi');
  if(statusCard){
    statusCard.classList.remove('good','warn','bad');
    statusCard.classList.add(deal.statusClass || 'good');
  }
}
function incomePortfolioHoldings(){
  return activeHoldings().filter(row=>{
    const account=String(row.account??row.Account??row.platform??row.broker??'').trim().toUpperCase();
    return account==='IG ISA'||account==='TRADE 212'||account==='TRADING 212'||account==='TRADING 212 ISA'||account==='TRADE212 ISA';
  });
}
function currentAnnualIncome(rows=activeHoldings()){
  return rows.reduce((sum,row)=>{
    const direct=parseNum(row.annual_dps_total??row['Annual DPS Total']??row.annual_income??row['Annual Income']);
    if(Number.isFinite(direct)) return sum+direct;
    const y=parseYield(row); return sum+(Number.isFinite(y)?holdingValue(row)*y:0);
  },0);
}
function divisionLabel(monthly){
  const ladder=[[5000,'Club World Champion'],[3000,'World Class Club'],[2000,'European Giant'],[1000,'Premier League Club'],[500,'Championship Club'],[250,'National Club'],[100,'Regional Club'],[0,'Local Club']];
  return ladder.find(([m])=>monthly>=m)?.[1]||'Local Club';
}
function unitPriceGbp(row){
  const ticker=shortTicker(row.ticker); const raw=parseNum(row.live_price??row.price??row.Price);
  const currency=String(row.currency??row.Currency??'').toUpperCase();
  if(!Number.isFinite(raw)||raw<=0||currency.includes('USD')||ticker==='ARCC') return NaN;
  return raw>20?raw/100:raw;
}
function executionDetail(item,deal){
  const px=unitPriceGbp(item.row); const units=Number.isFinite(px)?Math.floor(item.amount/px):NaN;
  const snapshot=exposureSnapshot(); const t=cleanTicker(item.row.ticker); const spent=deal.rows.reduce((s,r)=>s+r.amount,0);
  const exposure=(snapshot.tickers[t]||0)+item.amount; const afterTotal=snapshot.totalAfter+spent;
  const share=afterTotal>0?exposure/afterTotal:NaN;
  return `${Number.isFinite(units)?`Approx. ${units.toLocaleString('en-GB')} units`:'Check platform quote / FX'} • ${Number.isFinite(share)?(share*100).toFixed(1)+'% of portfolio after deal':'exposure check'}`;
}
function renderPostTransferImpact(deal){
  const box=$('postTransferImpact'); if(!box) return;
  const currentIncome=currentAnnualIncome(); const afterIncome=currentIncome+(deal.totalIncome||0);
  const currentMonthly=currentIncome/12, afterMonthly=afterIncome/12;
  const incomeRows=incomePortfolioHoldings(); const currentYieldIncome=currentAnnualIncome(incomeRows); const currentYieldValue=incomeRows.reduce((s,r)=>s+holdingValue(r),0);
  const spent=deal.rows.reduce((s,r)=>s+r.amount,0); const currentYield=currentYieldValue>0?currentYieldIncome/currentYieldValue:NaN; const afterYield=(currentYieldValue+spent)>0?(currentYieldIncome+(deal.totalIncome||0))/(currentYieldValue+spent):NaN;
  const target=500; const beforeGap=Math.max(0,target-currentMonthly), afterGap=Math.max(0,target-afterMonthly); const afterPct=Math.min(100,(afterMonthly/target)*100);
  box.innerHTML=`
    <div class="post-impact-card"><small>Annual income</small><strong>${money(currentIncome)} → ${money(afterIncome)}</strong><span>+${money(deal.totalIncome||0)}/year</span></div>
    <div class="post-impact-card"><small>Monthly income</small><strong>${money(currentMonthly)} → ${money(afterMonthly)}</strong><span>+${money((deal.totalIncome||0)/12)}/month</span></div>
    <div class="post-impact-card"><small>Target gap</small><strong>${money(beforeGap)} → ${money(afterGap)}</strong><span>${afterPct.toFixed(1)}% toward £500/month</span><div class="post-impact-progress"><i style="width:${afterPct}%"></i></div></div>
    <div class="post-impact-card"><small>Income portfolio yield</small><strong>${Number.isFinite(currentYield)?(currentYield*100).toFixed(2)+'%':'—'} → ${Number.isFinite(afterYield)?(afterYield*100).toFixed(2)+'%':'—'}</strong><span>IG ISA + Trade 212 scope</span></div>
    <div class="post-impact-card"><small>Club status</small><strong>${divisionLabel(currentMonthly)}</strong><span>After deals: ${divisionLabel(afterMonthly)}</span></div>`;
}
function renderDealSheet(deal){
  const badge = $('dealSheetBadge');
  if(badge){
    badge.className = `badge ${deal.statusClass === 'bad' ? 'red' : deal.statusClass === 'warn' ? 'amber' : 'green'}`;
    badge.textContent = deal.status;
  }
  if($('subnavDealStatus')) $('subnavDealStatus').textContent = deal.rows.length ? 'Ready' : 'Hold';
  if($('gafferCall')) $('gafferCall').textContent = deal.rows.length ? deal.route : 'Hold fire';
  if($('gafferCallText')) $('gafferCallText').textContent = deal.reason;

  const box = $('finalDealSheet');
  if(!box) return;
  if(!deal.rows.length){
    box.innerHTML = `<div class="loading error">No final transfer slip approved from the current data.</div>`;
  }else{
    box.innerHTML = deal.rows.map((item,i)=>{
      const y = incomeRate(item.row);
      const ticker = displayTicker(item.row.ticker);
      const gateClass = item.gate.status === 'pass' ? 'pass' : 'caution';
      const gateText = item.gate.status === 'pass' ? 'Green light' : 'Controlled';
      return `<div class="deal-row">
        <div class="deal-rank">${i+1}</div>
        <div class="deal-main">
          <strong>${ticker} — ${displayName(item.row)}</strong>
          <span><span class="status-chip ${gateClass}">${gateText}</span> &nbsp; ${platformFor(item.row.ticker)} • ${Number.isFinite(y) ? (y*100).toFixed(2)+'% income rate' : 'income check'} • ${item.gate.reasons[0] || 'Passes desk checks'} <em class="data-confidence ${item.gate.data?.status||'verified'}"><i></i>${item.gate.data?.score||dataConfidence(item.row).score}% data</em></span>
        </div>
        <div class="deal-money"><small>Buy allocation</small><input class="allocation-input" data-allocation-ticker="${cleanTicker(item.row.ticker)}" type="number" min="0" step="25" value="${item.amount}" aria-label="Allocation for ${ticker}"><div class="deal-control-line"><button class="deal-exclude-btn" data-exclude-ticker="${cleanTicker(item.row.ticker)}" type="button">Exclude</button></div></div>
        <div class="deal-income"><small>Est. income</small><strong>${money(item.income)}/yr</strong><div class="deal-execution-note">${executionDetail(item,deal)}</div></div>
      </div>`;
    }).join('');
  }
  if($('holdbackNote')) {
    $('holdbackNote').textContent = deal.holdback > 0
      ? `Transfer holdback: ${money(deal.holdback)} stays in cash. The desk does not force spare budget into one name just because it is available.`
      : 'No holdback. The selected route has assigned the full monthly release without breaching a hard portfolio gate.';
  }
}
function renderRegistrationDesk(deal){
  const box = $('registrationDesk');
  if(!box) return;
  const last=lastRegistration();
  box.innerHTML = deal.rows.length ? deal.rows.map((item,i)=>{
    const ticker=cleanTicker(item.row.ticker); const short=displayTicker(ticker); const key=registrationShortTicker(ticker);
    const accounts=registrationAccountOptions(ticker); const currency=registrationCurrency(item.row); const unit=registrationUnitFor(item.row);
    const holding=currentHoldingForRegistration(ticker,accounts[0]);
    const live=parseNum(item.row.live_price); const suggestedPrice=unit==='PENCE'&&Number.isFinite(live)?(live*100).toFixed(3):'';
    const open=registrationOpenKey===key;
    const accountOptions=accounts.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    const lastMatch=last&&registrationShortTicker(last.ticker)===key;
    return `<div class="registration-card" data-registration-card="${escapeHtml(key)}">
      <div class="registration-card-head">
        <div class="short-wire-icon">${i+1}</div>
        <div class="registration-card-main"><strong>${escapeHtml(short)} — ${escapeHtml(displayName(item.row))}</strong><span>Recommended: ${escapeHtml(accounts[0])} • Account can be changed in the form • Deal-sheet allocation ${money(item.amount)} • ${item.gate.status==='pass'?'Green light':'Controlled registration'}</span></div>
        <button class="registration-btn registration-open-btn ${open?'primary':''}" data-open-registration="${escapeHtml(key)}" type="button">${open?'Close form':'Register purchase'}</button>
      </div>
      <form class="registration-panel ${open?'open':''}" data-registration-form
        data-ticker="${escapeHtml(ticker)}"
        data-name="${escapeHtml(displayName(item.row))}"
        data-deal-allocation="${escapeHtml(item.amount)}"
        data-live-price-gbp="${escapeHtml(live)}"
        data-recommended-account="${escapeHtml(accounts[0])}"
        data-annual-dps="${escapeHtml(item.row.annual_dps??'')}"
        data-sector="${escapeHtml(item.row.sector??item.row.Sector??'')}"
        data-role="${escapeHtml(item.row.role??item.row.squad_role??'')}"
        data-buy-strength="${escapeHtml(item.row.buy_strength??'')}"
        data-low-52w="${escapeHtml(item.row.low_52w??'')}"
        data-high-52w="${escapeHtml(item.row.high_52w??'')}"
        data-payout-ratio="${escapeHtml(item.row.payout_ratio??'')}"
        data-payout-risk="${escapeHtml(item.row.payout_risk??'')}"
        data-dividend-growth-5y="${escapeHtml(item.row.dividend_growth_5y??'')}"
        data-squad-role="${escapeHtml(item.row.squad_role??'')}"
        data-promotion-impact-score="${escapeHtml(item.row.promotion_impact_score??'')}"
        data-trial-status="${escapeHtml(item.row.trial_status??'')}"
        data-trial-rank="${escapeHtml(item.row.trial_rank??'')}"
        data-trial-verdict="${escapeHtml(item.row.trial_verdict??'')}"
        data-manager-note="${escapeHtml(item.row.manager_note??item.row.notes??'')}"
        data-chemistry-role="${escapeHtml(item.row.chemistry_role??'')}"
        data-chemistry-risk="${escapeHtml(item.row.chemistry_risk??'')}"
        data-squad-balance-note="${escapeHtml(item.row.squad_balance_note??'')}">
        <div class="registration-form-grid">
          <label class="registration-field"><span>Account — choose where you bought it</span><select name="account">${accountOptions}</select></label>
          <label class="registration-field"><span>Trade date</span><input name="tradeDate" type="date" value="${registrationDateValue()}" required></label>
          <label class="registration-field"><span>Shares bought</span><input name="shares" type="number" min="0.00000001" step="0.00000001" inputmode="decimal" placeholder="e.g. 797" required></label>
          <label class="registration-field"><span>Executed price</span><input name="price" type="number" min="0" step="0.0001" inputmode="decimal" value="${escapeHtml(suggestedPrice)}" placeholder="Completed fill price" required></label>
          <label class="registration-field"><span>Price entered as</span><select name="priceUnit"><option value="PENCE" ${unit==='PENCE'?'selected':''}>Pence per share</option><option value="GBP" ${unit==='GBP'?'selected':''}>GBP per share</option><option value="USD" ${unit==='USD'?'selected':''}>USD per share</option></select></label>
          <label class="registration-field"><span>Currency</span><select name="currency"><option value="GBP" ${currency==='GBP'?'selected':''}>GBP</option><option value="USD" ${currency==='USD'?'selected':''}>USD</option></select></label>
          <label class="registration-field"><span>Fees / stamp duty</span><input name="fees" type="number" min="0" step="0.01" inputmode="decimal" value="0"></label>
          <label class="registration-field" data-fx-field ${currency==='GBP'?'hidden':''}><span>USD → GBP rate</span><input name="fxRate" type="number" min="0" step="0.000001" inputmode="decimal" placeholder="Leave blank to use FXRates"></label>
          <label class="registration-field wide"><span>Registration note</span><textarea name="note" placeholder="Optional — order reference, platform note or correction"></textarea></label>
        </div>
        <div class="registration-preview">
          <div class="registration-stat"><small>Total trade cost</small><strong data-preview="cost">—</strong></div>
          <div class="registration-stat"><small>New share total</small><strong data-preview="shares">${holding?Number(parseNum(holding.shares)||0).toLocaleString('en-GB',{maximumFractionDigits:8}):'—'}</strong></div>
          <div class="registration-stat"><small>New average</small><strong data-preview="average">—</strong></div>
          <div class="registration-stat"><small>Income added</small><strong data-preview="income">—</strong></div>
        </div>
        <div class="registration-message success registration-safety" data-safety-message>Safety check ready.</div>
        <div class="registration-message ${holding?'':'pending'}" data-form-message>${holding?'Existing squad player: this purchase will top up the current account row.':'New signing: confirming this trade will create the Holdings row and LivePrices entry automatically.'}</div>
        <div class="registration-form-actions"><button class="registration-btn primary" type="submit">${holding?'Confirm top-up':'Confirm new signing'}</button><button class="registration-btn" type="reset">Clear form</button></div>
        ${lastMatch?`<div class="registration-last"><span>Last registered here: ${escapeHtml(last.transactionId||'')} • ${escapeHtml(last.message||'Completed')}</span></div>`:''}
      </form>
    </div>`;
  }).join('') : '<div class="loading">No registrations approved yet.</div>';
  box.querySelectorAll('[data-registration-form]').forEach(updateRegistrationPreview);
  if($('deskNote')) $('deskNote').textContent = deal.rows.some(r=>platformFor(r.row.ticker).includes('Check'))
    ? 'One or more signings need a platform check before placing the order.'
    : 'Enter the completed platform fill here. Existing players are topped up; brand-new signings automatically receive a Holdings row and LivePrices entry.';
}
function renderBench(deal){
  const box = $('benchList');
  if(!box) return;
  box.innerHTML = deal.bench.length ? deal.bench.map(item=>{
    const y = incomeRate(item.row);
    return `<div class="mini-table-row">
      <div><strong>${displayTicker(item.row.ticker)} — ${displayName(item.row)}</strong><span>${platformFor(item.row.ticker)} • ${Number.isFinite(y) ? (y*100).toFixed(2)+'% income' : 'income check'} • score ${whole(item.score)}</span></div>
      <b>Bench</b>
    </div>`;
  }).join('') : '<div class="loading">No bench options available.</div>';
}
function renderWatch(deal){
  const box = $('watchList');
  if(!box) return;
  box.innerHTML = deal.watch.length ? deal.watch.map(item=>`
    <div class="mini-table-row">
      <div><strong>${displayTicker(item.row.ticker)} — ${displayName(item.row)}</strong><span>${item.gate.reasons[0] || 'Not selected by the desk.'}</span></div>
      <span class="status-chip ${item.gate.status === 'block' ? 'block' : 'caution'}">${item.gate.status === 'block' ? 'No buy' : 'Watch'}</span>
    </div>`).join('') : '<div class="loading">No major red flags from the current shortlist.</div>';
}


/* ===================== TRANSFER CENTRE FIVE-UPGRADES SUITE ===================== */
function safeJsonRead(key,fallback={}){
  try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed&&typeof parsed==='object'?parsed:fallback;}catch(_){return fallback;}
}
function safeJsonWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(_){/* local storage unavailable */}}
function clampNumber(value,min,max,fallback){const n=parseNum(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function normaliseDateValue(value){
  if(value===null||value===undefined||value==='') return '';
  if(typeof value==='number'&&value>20000){const d=new Date(Date.UTC(1899,11,30)+value*86400000);return d.toISOString().slice(0,10);}
  const raw=String(value).trim();
  const uk=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(uk)return `${uk[3]}-${String(uk[2]).padStart(2,'0')}-${String(uk[1]).padStart(2,'0')}`;
  const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(iso)return `${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`;
  const d=new Date(raw);return Number.isNaN(d.getTime())?'':new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function dateLabel(value){const iso=normaliseDateValue(value);if(!iso)return 'Not supplied';const d=new Date(`${iso}T12:00:00`);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function daysBetweenDates(fromValue,toValue){const a=normaliseDateValue(fromValue),b=normaliseDateValue(toValue);if(!a||!b)return NaN;return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);}
function dayBeforeDate(value){const iso=normaliseDateValue(value);if(!iso)return '';const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);}
function rowFirstValue(row,keys){for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null&&String(row[key]).trim()!=='')return row[key];}return '';}
function dividendFrequencyFor(row,override){
  const raw=override||rowFirstValue(row,['dividend_frequency','distribution_frequency','payment_frequency','frequency','Dividend Frequency']);
  const n=parseNum(raw);if(Number.isFinite(n)&&n>=1&&n<=12)return Math.round(n);
  const s=String(raw||'').toLowerCase();if(s.includes('month'))return 12;if(s.includes('quarter'))return 4;if(s.includes('semi')||s.includes('half'))return 2;if(s.includes('annual')||s.includes('year'))return 1;return 4;
}
function dividendCalendarStore(){const saved=safeJsonRead(DIVIDEND_CALENDAR_KEY,{settings:{},tickers:{}});saved.settings=saved.settings||{};saved.tickers=saved.tickers||{};return saved;}
function dividendMetaFor(row){
  const ticker=shortTicker(row?.ticker);const saved=dividendCalendarStore();const override=saved.tickers[ticker]||{};
  const exRaw=rowFirstValue(row,['ex_dividend_date','ex_div_date','next_ex_dividend_date','next_ex_date','ex_date','exDividendDate','Ex Dividend Date','Ex-Date']);
  const payRaw=rowFirstValue(row,['payment_date','dividend_payment_date','next_payment_date','pay_date','paymentDate','Payment Date']);
  const exDate=normaliseDateValue(override.exDate||exRaw);const paymentDate=normaliseDateValue(override.paymentDate||payRaw);
  return {ticker,exDate,paymentDate,frequency:dividendFrequencyFor(row,override.frequency),source:override.exDate||override.paymentDate?'Manager entry':(exRaw||payRaw?'AuroraData':'Date required')};
}
function saveDividendField(input){
  const ticker=shortTicker(input.dataset.dividendTicker);if(!ticker)return;const field=input.dataset.dividendField;const saved=dividendCalendarStore();saved.tickers[ticker]=saved.tickers[ticker]||{};saved.tickers[ticker][field]=field==='frequency'?clampNumber(input.value,1,12,4):normaliseDateValue(input.value);saved.updatedAt=new Date().toISOString();safeJsonWrite(DIVIDEND_CALENDAR_KEY,saved);
}
function renderDividendCalendar(deal){
  const grid=$('dividendCalendarGrid');if(!grid)return;const saved=dividendCalendarStore();const purchaseInput=$('dividendPurchaseDate');
  const fallbackPurchase=normaliseDateValue(saved.settings.purchaseDate||$('nextPaydayInput')?.value||registrationDateValue());if(purchaseInput&&!purchaseInput.value)purchaseInput.value=fallbackPurchase;
  const purchaseDate=normaliseDateValue(purchaseInput?.value||fallbackPurchase);saved.settings.purchaseDate=purchaseDate;safeJsonWrite(DIVIDEND_CALENDAR_KEY,saved);
  const rows=deal?.rows||[];let known=0,captured=0,expected=0;
  const cards=rows.map(item=>{
    const meta=dividendMetaFor(item.row);const knownDate=Boolean(meta.exDate);if(knownDate)known++;
    const capture=knownDate&&purchaseDate?purchaseDate<meta.exDate:null;if(capture){captured++;expected+=item.income/meta.frequency;}
    const cls=capture===true?'capture':capture===false?'miss':'unknown';const status=capture===true?'Payment captured':capture===false?'Payment missed':'Date required';
    const days=knownDate&&purchaseDate?daysBetweenDates(purchaseDate,meta.exDate):NaN;const latest=dayBeforeDate(meta.exDate);const firstPayment=item.income/meta.frequency;
    return `<article class="dividend-fixture-card ${cls}">
      <div class="dividend-fixture-top"><div><small>${escapeHtml(platformFor(item.row.ticker))}</small><h4>${escapeHtml(displayTicker(item.row.ticker))} — ${escapeHtml(displayName(item.row))}</h4></div><span class="fixture-status">${status}</span></div>
      <div class="fixture-metrics"><div><small>Latest qualifying buy</small><strong>${latest?dateLabel(latest):'Enter ex-date'}</strong></div><div><small>Estimated first payment</small><strong>${money(firstPayment)}</strong></div><div><small>Days to ex-date</small><strong>${Number.isFinite(days)?`${days} day${Math.abs(days)===1?'':'s'}`:'—'}</strong></div><div><small>Annual income added</small><strong>${money(item.income)}</strong></div></div>
      <div class="fixture-edit-grid"><label><span>Ex-dividend</span><input type="date" value="${escapeHtml(meta.exDate)}" data-dividend-ticker="${escapeHtml(meta.ticker)}" data-dividend-field="exDate"></label><label><span>Payment date</span><input type="date" value="${escapeHtml(meta.paymentDate)}" data-dividend-ticker="${escapeHtml(meta.ticker)}" data-dividend-field="paymentDate"></label><label><span>Payments/yr</span><select data-dividend-ticker="${escapeHtml(meta.ticker)}" data-dividend-field="frequency">${[1,2,4,12].map(n=>`<option value="${n}" ${meta.frequency===n?'selected':''}>${n}</option>`).join('')}</select></label></div>
      <span class="fixture-source">${escapeHtml(meta.source)} • ${capture===true?'Buy date is before ex-date':capture===false?'Buy date is on/after ex-date':'Add the next declared ex-date'}</span>
    </article>`;
  });
  grid.innerHTML=cards.length?cards.join(''):'<div class="loading">No approved signing route is available for the calendar.</div>';
  if($('calendarCapturedCount'))$('calendarCapturedCount').textContent=`${captured} of ${known}`;
  if($('calendarExpectedPayment'))$('calendarExpectedPayment').textContent=money(expected);
  if($('calendarVerifiedDates'))$('calendarVerifiedDates').textContent=`${known} of ${rows.length}`;
  const verdict=!rows.length?'No route':known===0?'Dates needed':captured===known?'All captured':captured>0?'Mixed calendar':'Payments missed';
  if($('calendarVerdict'))$('calendarVerdict').textContent=verdict;
  if($('calendarVerdictNote'))$('calendarVerdictNote').textContent=!rows.length?'Choose a route first.':known<rows.length?`${rows.length-known} signing${rows.length-known===1?' needs':'s need'} an ex-date.`:`Planned purchase: ${dateLabel(purchaseDate)}`;
}
function incomeSimulatorSettings(){const saved=safeJsonRead(INCOME_SIMULATOR_KEY,{});return {months:Math.round(clampNumber(saved.months,1,252,10)),startingIncome:clampNumber(saved.startingIncome,0,1000000,4220),mode:saved.mode==='repeat-budget'?'repeat-budget':'release-plan',ongoingMonthly:clampNumber(saved.ongoingMonthly,0,1000000,0)};}
function persistIncomeSimulatorFromInputs(){const settings={months:Math.round(clampNumber($('simulationMonthsInput')?.value,1,252,10)),startingIncome:clampNumber($('startingIncomeInput')?.value,0,1000000,4220),mode:$('simulatorModeSelect')?.value==='repeat-budget'?'repeat-budget':'release-plan',ongoingMonthly:clampNumber($('ongoingMonthlyInput')?.value,0,1000000,0),updatedAt:new Date().toISOString()};safeJsonWrite(INCOME_SIMULATOR_KEY,settings);return settings;}
function renderIncomeSimulator(deal){
  const body=$('incomeSimulatorRows');if(!body)return;const settings=incomeSimulatorSettings();
  if($('simulationMonthsInput'))$('simulationMonthsInput').value=settings.months;if($('startingIncomeInput'))$('startingIncomeInput').value=settings.startingIncome;if($('simulatorModeSelect'))$('simulatorModeSelect').value=settings.mode;if($('ongoingMonthlyInput'))$('ongoingMonthlyInput').value=settings.ongoingMonthly;
  const routeYield=deal?.budget>0?(deal.totalIncome/deal.budget):0;let totalInvested=0,addedRunRate=0,cashReceived=0;const rows=[];
  for(let index=0;index<settings.months;index++){
    const planMonth=deploymentPlan.currentMonth+index;const release=settings.mode==='repeat-budget'?Math.max(0,deal?.budget||0):deploymentReleaseForMonth(planMonth).total;const investment=Math.max(0,release+(settings.mode==='release-plan'?settings.ongoingMonthly:0));const incomeAdded=investment*routeYield;totalInvested+=investment;addedRunRate+=incomeAdded;cashReceived+=incomeAdded*((settings.months-index)/12);const totalRunRate=settings.startingIncome+addedRunRate;
    rows.push(`<tr><td><strong>Month ${index+1}</strong></td><td>${money(investment)}</td><td>${money(incomeAdded)}/yr</td><td>${money(totalRunRate)}/yr</td><td>${money(totalRunRate/12)}</td><td>${money(cashReceived)}</td></tr>`);
  }
  body.innerHTML=rows.join('');const finalIncome=settings.startingIncome+addedRunRate;
  if($('simulatorTotalInvested'))$('simulatorTotalInvested').textContent=money(totalInvested);if($('simulatorAddedIncome'))$('simulatorAddedIncome').textContent=`${money(addedRunRate)}/yr`;if($('simulatorFinalIncome'))$('simulatorFinalIncome').textContent=`${money(finalIncome)}/yr`;if($('simulatorMonthlyIncome'))$('simulatorMonthlyIncome').textContent=money(finalIncome/12);if($('simulatorCashReceived'))$('simulatorCashReceived').textContent=money(cashReceived);
  if($('incomeSimulatorRouteBadge'))$('incomeSimulatorRouteBadge').textContent=`${deal?.mode==='maximum'?'Maximum income':'Balanced'} • ${(routeYield*100).toFixed(2)}%`;
  if($('incomeSimulatorNote'))$('incomeSimulatorNote').textContent=settings.mode==='release-plan'?`Uses the current two-pot release programme from plan month ${deploymentPlan.currentMonth}. Months after the pots finish only include the extra monthly top-up.`:`Comparison mode repeats the current ${money(deal?.budget||0)} transfer budget for every simulated month.`;
}
function currentHoldingAnnualIncome(row){const direct=parseNum(row?.annual_dps_total??row?.annual_income??row?.annual_dividend_total??row?.annual_target);if(Number.isFinite(direct)&&direct>=0)return direct;const rate=incomeRate(row);return Number.isFinite(rate)?holdingValue(row)*rate:0;}
function platformValueMap(dealRows=[]){const map={};activeHoldings().forEach(row=>{const account=normalizeRegistrationAccount(row.account||row.platform||row.broker)||'OTHER';map[account]=(map[account]||0)+holdingValue(row);});dealRows.forEach(item=>{const account=normalizeRegistrationAccount(platformFor(item.row.ticker))||'OTHER';map[account]=(map[account]||0)+(item.amount||0);});return map;}
function renderPortfolioControlRoom(deal){
  const grid=$('portfolioExposureGrid'),warningsBox=$('portfolioWarningList'),summary=$('portfolioControlSummary');if(!grid||!warningsBox||!summary)return;
  const extra=(deal?.rows||[]).map(item=>({row:item.row,amount:item.amount}));const before=exposureSnapshot([]),after=exposureSnapshot(extra);const controls=[];const warnings=[];
  const addControl=(label,beforePct,afterPct,limit)=>{const ratio=limit>0?afterPct/limit:0;const status=afterPct>limit?'block':afterPct>limit*.9?'warn':'safe';controls.push({label,beforePct,afterPct,limit,status});if(status==='block')warnings.push({level:'block',title:`${label} above limit`,detail:`Would move from ${(beforePct*100).toFixed(1)}% to ${(afterPct*100).toFixed(1)}%, above the ${(limit*100).toFixed(0)}% control.`});else if(status==='warn')warnings.push({level:'warn',title:`${label} close to limit`,detail:`Would finish at ${(afterPct*100).toFixed(1)}% against a ${(limit*100).toFixed(0)}% control.`});};
  ['reit_property','infrastructure_renewable','financials','credit_income','high_yield_forward'].forEach(bucket=>{const limit=SECTOR_LIMITS[bucket];addControl(bucketLabel(bucket),(before.buckets[bucket]||0)/Math.max(before.totalBefore,1),(after.buckets[bucket]||0)/Math.max(after.totalAfter,1),limit);});
  const largestBefore=Object.entries(before.tickers).sort((a,b)=>b[1]-a[1])[0]||['—',0];const largestAfter=Object.entries(after.tickers).sort((a,b)=>b[1]-a[1])[0]||['—',0];addControl('largest holding',largestBefore[1]/Math.max(before.totalBefore,1),largestAfter[1]/Math.max(after.totalAfter,1),SECTOR_LIMITS.single_holding);
  const incomes=activeHoldings().map(row=>({ticker:shortTicker(row.ticker),income:currentHoldingAnnualIncome(row)}));(deal?.rows||[]).forEach(item=>{const ticker=shortTicker(item.row.ticker);const found=incomes.find(x=>x.ticker===ticker);if(found)found.income+=item.income;else incomes.push({ticker,income:item.income});});const totalIncome=incomes.reduce((s,x)=>s+x.income,0);const topIncome=incomes.sort((a,b)=>b.income-a.income)[0]||{ticker:'—',income:0};const incomeShare=topIncome.income/Math.max(totalIncome,1);if(incomeShare>.25)warnings.push({level:'warn',title:'Dividend dependency elevated',detail:`${topIncome.ticker} supplies ${(incomeShare*100).toFixed(1)}% of estimated portfolio income. A full cut would remove ${money(topIncome.income)} per year.`});
  const platforms=platformValueMap(deal?.rows||[]);const platformTop=Object.entries(platforms).sort((a,b)=>b[1]-a[1])[0]||['—',0];const platformShare=platformTop[1]/Math.max(after.totalAfter,1);if(platformShare>.75)warnings.push({level:'warn',title:'Platform concentration',detail:`${platformTop[0]} would hold ${(platformShare*100).toFixed(1)}% of portfolio value.`});
  if(!warnings.length)warnings.push({level:'safe',title:'All post-transfer controls pass',detail:'No hard concentration limit is breached by the current deal sheet.'});
  grid.innerHTML=controls.map(item=>`<article class="exposure-control-card ${item.status}"><small>${escapeHtml(item.label)}</small><strong>${(item.beforePct*100).toFixed(1)}% → ${(item.afterPct*100).toFixed(1)}%</strong><span>Control ${(item.limit*100).toFixed(0)}%</span><div class="exposure-track"><i style="width:${Math.min(100,(item.afterPct/item.limit)*100)}%"></i></div></article>`).join('');
  warningsBox.innerHTML=warnings.map(item=>`<div class="portfolio-warning-item ${item.level}"><i></i><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div></div>`).join('');
  summary.innerHTML=`<div class="portfolio-summary-row"><span>Portfolio value</span><strong>${money(before.totalBefore)} → ${money(after.totalAfter)}</strong></div><div class="portfolio-summary-row"><span>Largest holding</span><strong>${escapeHtml(largestAfter[0])} ${(largestAfter[1]/Math.max(after.totalAfter,1)*100).toFixed(1)}%</strong></div><div class="portfolio-summary-row"><span>Largest income source</span><strong>${escapeHtml(topIncome.ticker)} ${money(topIncome.income)}/yr</strong></div><div class="portfolio-summary-row"><span>Top platform</span><strong>${escapeHtml(platformTop[0])} ${(platformShare*100).toFixed(1)}%</strong></div><div class="portfolio-summary-row"><span>Route holdback</span><strong>${money(deal?.holdback||0)}</strong></div>`;
  const blocking=warnings.filter(x=>x.level==='block').length,caution=warnings.filter(x=>x.level==='warn').length;const badge=$('portfolioControlBadge');if(badge){badge.textContent=blocking?`${blocking} hard warning${blocking===1?'':'s'}`:caution?`${caution} caution${caution===1?'':'s'}`:'All controls pass';badge.style.borderColor=blocking?'rgba(251,113,133,.4)':caution?'rgba(251,191,36,.35)':'rgba(52,211,153,.35)';}
}
function smartExitStore(){const saved=safeJsonRead(SMART_EXIT_KEY,{decisions:{}});saved.decisions=saved.decisions||{};return saved;}
function setSmartExitDecision(ticker,decision){const saved=smartExitStore();saved.decisions[shortTicker(ticker)]=decision;saved.updatedAt=new Date().toISOString();safeJsonWrite(SMART_EXIT_KEY,saved);}
function smartExitFundingValue(row,decision){const value=row?holdingValue(row):0;if(decision==='partial1000')return Math.min(1000,value);if(decision==='half')return value*.5;if(decision==='full')return value;return 0;}
function renderSmartExitDesk(){
  const box=$('smartExitDesk');if(!box)return;const saved=smartExitStore();const iitu=exitHolding('IITU'),vwra=exitHolding('VWRA'),offer=currentVwraOffer(),clause=offer?incomingOfferClauseData(offer):null;
  const card=(ticker,row,kind)=>{if(!row)return `<article class="smart-exit-card"><div class="smart-exit-verdict"><div><small>${ticker}</small><h4>Holding not found</h4></div><b>No action</b></div></article>`;const price=exitHoldingLivePrice(row),value=holdingValue(row),book=exitHoldingBookCost(row),profit=value-book,profitPct=book>0?profit/book*100:0;const decision=saved.decisions[ticker]||(ticker==='IITU'?'full':'hold');let verdict='Hold',status='hold',note='Keep under review.';let levels=[];
    if(ticker==='IITU'){verdict=decision==='hold'?'Hold temporarily':decision==='partial1000'?'Release one tranche':'Sell on payday';status=decision==='hold'?'hold':'ready';const high=parseNum(row.high_52w);levels=[['Current',price],['+3%',price*1.03],['52w high',high]];note=`Selected decision unlocks ${money(smartExitFundingValue(row,decision))}. Current profit is ${money(profit)} (${profitPct.toFixed(1)}%).`;}
    else{const gapPct=clause&&Number.isFinite(clause.currentLivePrice)&&clause.currentLivePrice>0?((clause.releasePrice/clause.currentLivePrice)-1)*100:NaN;verdict=clause?.met?'Target reached':Number.isFinite(gapPct)&&gapPct<=2?'Target close':'Hold for target';status=clause?.met?'ready':'hold';const middle=clause?(price+clause.releasePrice)/2:price*1.02;levels=[['Current',price],['Midpoint',middle],['Target',clause?.releasePrice]];note=clause?`${Number.isFinite(gapPct)?gapPct.toFixed(2)+'%':'—'} to target • offer expiry ${offerDateLabel(offer?.expiresAt)}. Selected decision unlocks ${money(smartExitFundingValue(row,decision))}.`:'No active offer target is loaded.';}
    return `<article class="smart-exit-card ${status}"><div class="smart-exit-verdict"><div><small>${ticker==='IITU'?'Planned first departure':'Offer-room departure'}</small><h4>${ticker} — ${escapeHtml(displayName(row))}</h4></div><b>${escapeHtml(verdict)}</b></div><div class="smart-exit-metrics"><div><span>Value</span><strong>${money(value)}</strong></div><div><span>Profit</span><strong>${money(profit)}</strong></div><div><span>Price</span><strong>${money(price)}</strong></div></div><div class="exit-levels">${levels.map(([label,level])=>`<div><small>${label}</small><strong>${Number.isFinite(level)?money(level):'—'}</strong></div>`).join('')}</div><div class="exit-decision-buttons"><button type="button" class="${decision==='full'?'active':''}" data-exit-decision-ticker="${ticker}" data-exit-decision="full">Full sale</button><button type="button" class="${decision==='partial1000'||decision==='half'?'active':''}" data-exit-decision-ticker="${ticker}" data-exit-decision="${ticker==='IITU'?'partial1000':'half'}">${ticker==='IITU'?'£1,000 partial':'Half sale'}</button><button type="button" class="${decision==='hold'?'active':''}" data-exit-decision-ticker="${ticker}" data-exit-decision="hold">Hold</button></div><span class="exit-decision-note">${escapeHtml(note)} No broker order is placed.</span></article>`;};
  box.innerHTML=card('IITU',iitu,'payday')+card('VWRA',vwra,'target');
}
function paydayExecutionStore(){const saved=safeJsonRead(PAYDAY_EXECUTION_KEY,{open:false,availableCash:0,checks:{},trades:{},completedAt:''});saved.checks=saved.checks||{};saved.trades=saved.trades||{};return saved;}
function savePaydayExecution(saved){saved.updatedAt=new Date().toISOString();safeJsonWrite(PAYDAY_EXECUTION_KEY,saved);}
function paydayTradeTotals(deal,saved){let invested=0,income=0,recorded=0;const details={};(deal?.rows||[]).forEach(item=>{const ticker=shortTicker(item.row.ticker);const trade=saved.trades[ticker]||{};const shares=parseNum(trade.shares)||0,price=parseNum(trade.price)||0,fees=parseNum(trade.fees)||0;const cost=shares>0&&price>0?shares*price+fees:0;const added=cost*incomeRate(item.row);if(cost>0)recorded++;invested+=cost;income+=Number.isFinite(added)?added:0;details[ticker]={shares,price,fees,cost,income:Number.isFinite(added)?added:0};});return {invested,income,recorded,details};}
function renderPaydayExecution(deal){
  const panel=$('paydayExecutionPanel'),checklist=$('paydayChecklist'),tradeGrid=$('paydayTradeGrid');if(!panel||!checklist||!tradeGrid)return;const saved=paydayExecutionStore();panel.classList.toggle('open',Boolean(saved.open));panel.classList.toggle('completed',Boolean(saved.completedAt));
  if($('openPaydayWindow'))$('openPaydayWindow').textContent=saved.open?'Close Payday Window':'Open Payday Window';if($('paydayAvailableCash'))$('paydayAvailableCash').value=saved.availableCash||0;
  const refreshAge=lastLiveRefreshAt?(Date.now()-new Date(lastLiveRefreshAt).getTime())/3600000:Infinity;const pricesFresh=refreshAge<=6;const cashReady=(saved.availableCash||0)>=(deal?.budget||0)&&deal?.budget>0;const routeReady=(deal?.rows||[]).length>0;const totals=paydayTradeTotals(deal,saved);const purchasesRecorded=routeReady&&totals.recorded===(deal.rows||[]).length;
  const checks=[
    {key:'prices',label:'Refresh live prices',detail:pricesFresh?`Updated ${new Date(lastLiveRefreshAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`:'Use Refresh Data before execution.',done:pricesFresh,manual:false},
    {key:'etfReviewed',label:'Review ETF exits',detail:'Confirm IITU/VWRA funding decision.',done:Boolean(saved.checks.etfReviewed),manual:true},
    {key:'cash',label:'Confirm available cash',detail:cashReady?`${money(saved.availableCash)} covers the route.`:`Need at least ${money(deal?.budget||0)}.`,done:cashReady,manual:false},
    {key:'exDivChecked',label:'Check ex-dividend dates',detail:'Use the fixture calendar before buying.',done:Boolean(saved.checks.exDivChecked),manual:true},
    {key:'route',label:'Choose route',detail:routeReady?`${deal.route} selected.`:'No approved route available.',done:routeReady,manual:false},
    {key:'allocationsConfirmed',label:'Confirm allocations',detail:'Approve the final amount for each signing.',done:Boolean(saved.checks.allocationsConfirmed),manual:true},
    {key:'purchases',label:'Record completed fills',detail:purchasesRecorded?`${totals.recorded} of ${deal.rows.length} recorded.`:`${totals.recorded} of ${(deal?.rows||[]).length} recorded.`,done:purchasesRecorded,manual:false},
    {key:'registrationReviewed',label:'Review registration desk',detail:'Confirm new holdings/top-ups are ready to register.',done:Boolean(saved.checks.registrationReviewed),manual:true}
  ];
  checklist.innerHTML=checks.map(item=>`<label class="payday-check ${item.done?'done':''}">${item.manual?`<input type="checkbox" data-payday-check="${item.key}" ${item.done?'checked':''}>`:`<i></i>`}<div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></div></label>`).join('');
  tradeGrid.innerHTML=routeReady?deal.rows.map(item=>{const ticker=shortTicker(item.row.ticker),trade=saved.trades[ticker]||{},detail=totals.details[ticker]||{};return `<article class="payday-trade-card"><div class="payday-trade-top"><div><h5>${escapeHtml(displayTicker(item.row.ticker))} — ${escapeHtml(displayName(item.row))}</h5><span>${escapeHtml(platformFor(item.row.ticker))}</span></div><span>Planned ${money(item.amount)}</span></div><div class="payday-trade-inputs"><label><span>Shares bought</span><input type="number" min="0" step="any" value="${escapeHtml(trade.shares||'')}" data-payday-trade-ticker="${ticker}" data-payday-trade-field="shares"></label><label><span>Actual £/share</span><input type="number" min="0" step="any" value="${escapeHtml(trade.price||'')}" data-payday-trade-ticker="${ticker}" data-payday-trade-field="price"></label><label><span>Fees £</span><input type="number" min="0" step="any" value="${escapeHtml(trade.fees||'')}" data-payday-trade-ticker="${ticker}" data-payday-trade-field="fees"></label></div><div class="payday-trade-result"><span>Actual cost <b>${money(detail.cost||0)}</b></span><span>Income added <b>${money(detail.income||0)}/yr</b></span></div></article>`;}).join(''):'<div class="loading">Choose an approved route before recording completed purchases.</div>';
  const allReady=checks.every(item=>item.done);if($('completePaydayWindow'))$('completePaydayWindow').disabled=!allReady;if($('paydayTradeCount'))$('paydayTradeCount').textContent=`${totals.recorded} recorded`;
  const plannedInvested=(deal?.rows||[]).reduce((s,x)=>s+x.amount,0),plannedIncome=deal?.totalIncome||0,starting=incomeSimulatorSettings().startingIncome;
  if($('paydayPlannedInvested'))$('paydayPlannedInvested').textContent=money(plannedInvested);if($('paydayPlannedIncome'))$('paydayPlannedIncome').textContent=`${money(plannedIncome)}/yr annual income`;if($('paydayActualInvested'))$('paydayActualInvested').textContent=money(totals.invested);if($('paydayActualIncome'))$('paydayActualIncome').textContent=`${money(totals.income)}/yr annual income`;if($('paydayInvestmentVariance'))$('paydayInvestmentVariance').textContent=`${totals.invested-plannedInvested>=0?'+':''}${money(totals.invested-plannedInvested)}`;if($('paydayNewClubIncome'))$('paydayNewClubIncome').textContent=`${money(starting+totals.income)}/yr`;
  const status=saved.completedAt?'Transfer window complete':saved.open?(allReady?'Ready to complete':'Execution checks active'):'Window closed';if($('paydayWindowStatus'))$('paydayWindowStatus').textContent=status;if($('paydayWindowStatusNote'))$('paydayWindowStatusNote').textContent=saved.completedAt?`Completed ${new Date(saved.completedAt).toLocaleString('en-GB')}.`:saved.open?`${checks.filter(x=>x.done).length} of ${checks.length} controls complete.`:'Open the window when payday arrives.';if($('paydayCompletionMessage'))$('paydayCompletionMessage').textContent=saved.completedAt?`${money(totals.invested)} invested • ${money(totals.income)}/yr added.`:allReady?'Every control has passed. The window can now be completed.':'Complete every control before closing the window.';
}


/* ===================== SECTION: M7 UNIFIED TRADING BRAIN BRIDGE ===================== */
const AURORA_TRADING_BRAIN_KEY='aurora_trading_brain_decision_v1';
function m7Reason(item){
  const rate=incomeRate(item.row), gate=item.gate||{};
  if(gate.status==='caution') return gate.reasons?.[0]||'Controlled position sizing required.';
  if(Number.isFinite(rate)) return `${(rate*100).toFixed(2)}% recurring income rate, verified data and post-buy concentration checks passed.`;
  return 'Highest ranked verified candidate under the active Trading Brain strategy.';
}
function readTradingBrainDecision(){
  try{
    const payload=JSON.parse(localStorage.getItem(AURORA_TRADING_BRAIN_KEY)||'null');
    if(!payload||!Array.isArray(payload.targets)) return null;
    const age=Date.now()-new Date(payload.generatedAt||0).getTime();
    return {...payload,isStale:!Number.isFinite(age)||age>24*60*60*1000,ageMs:age};
  }catch(_){return null;}
}

function activeWealthMission(){
  try{
    const mission=JSON.parse(localStorage.getItem('aurora_wealth_investment_mission_v1')||'null');
    return mission&&Number(mission.budget)>0?mission:null;
  }catch(_){return null;}
}
function normalisedTargetYield(target){
  const raw=Number(target?.yield);
  if(Number.isFinite(raw)&&raw>0) return raw>1?raw/100:raw;
  const allocation=Number(target?.allocation||0),income=Number(target?.income||0);
  return allocation>0&&income>0?income/allocation:NaN;
}
function livePriceFeedFor(ticker){
  const key=cleanTicker(ticker);
  const row=(state.livePrices||[]).find(item=>cleanTicker(item.Symbol??item.symbol??item.ticker)===key);
  const price=parseNum(row?.Price??row?.price??row?.live_price);
  return Number.isFinite(price)&&price>0?price:NaN;
}
function hydrateSecurityFromTarget(base,target,payload){
  const row={...(base||{})};
  const ticker=cleanTicker(target?.ticker||row.ticker);
  const rowPrice=parseNum(row.live_price??row.price??row.Price);
  const targetPrice=parseNum(target?.livePrice);
  const feedPrice=livePriceFeedFor(ticker);
  const price=rowPrice>0?rowPrice:(targetPrice>0?targetPrice:feedPrice);
  const rowYield=parseYield(row);
  const targetYield=normalisedTargetYield(target);
  const rate=Number.isFinite(rowYield)&&rowYield>0?rowYield:targetYield;
  const rowDps=parseNum(row.annual_dps??row.Annual_DPS);
  const dps=rowDps>0?rowDps:(price>0&&Number.isFinite(rate)&&rate>0?price*rate:NaN);
  const fair=parseNum(row.fair_value??row.fairValue);
  const targetFair=parseNum(target?.fairValue);
  row.ticker=ticker;
  row.name=row.name||target?.name||ticker;
  if(price>0){row.live_price=price;row.price=price;row.Price=price;}
  if(Number.isFinite(rate)&&rate>0){row.dividend_yield=rate;row.yield=rate;row.yield_pct=rate;}
  if(dps>0){row.annual_dps=dps;row.Annual_DPS=dps;}
  if(!(fair>0)&&targetFair>0) row.fair_value=targetFair;
  row.account=target?.account||row.account||row.platform||'Account review';
  row.platform=target?.account||row.platform||row.account||'Account review';
  if(!row.date_checked&&!row.last_updated&&!row.updated_at) row.last_updated=payload?.generatedAt||new Date().toISOString();
  row.notes=[row.notes,'Trading Brain live snapshot merged into Transfer Centre.'].filter(Boolean).join(' ');
  return row;
}
function hydrateStateFromDecision(payload){
  if(!payload||!Array.isArray(payload.targets)) return;
  const targetMap=new Map(payload.targets.map(target=>[cleanTicker(target.ticker),target]));
  ['holdings','watchlist','scout'].forEach(collection=>{
    state[collection]=(state[collection]||[]).map(row=>{
      const target=targetMap.get(cleanTicker(row.ticker));
      if(!target){
        const feed=livePriceFeedFor(row.ticker),current=parseNum(row.live_price??row.price??row.Price);
        if(!(current>0)&&feed>0) return {...row,live_price:feed,price:feed,Price:feed};
        return row;
      }
      targetMap.delete(cleanTicker(row.ticker));
      return hydrateSecurityFromTarget(row,target,payload);
    });
  });
  for(const target of targetMap.values()) state.watchlist.push(hydrateSecurityFromTarget(null,target,payload));
}
function portfolioWeightTradingBrainTargets(targetRows,budget,payload){
  // Finance Department's released figure is already the investable transfer budget.
  // Do not inherit an old Trading Brain reserve from a previous £3,000 mission.
  const spendBudget=roundTo25(Math.max(0,budget));
  if(!targetRows.length||spendBudget<=0) return {rows:[],spent:0,holdback:budget};
  const minimum=Math.min(meaningfulMinimum(spendBudget),roundTo25(spendBudget/targetRows.length));
  const amounts=new Map();
  let spent=0;

  for(const item of targetRows){
    const ticker=cleanTicker(item.row.ticker);
    const start=Math.max(25,minimum);
    if(spent+start<=spendBudget){amounts.set(ticker,start);spent+=start;}
  }

  while(spent+25<=spendBudget){
    let best=null;
    for(const item of targetRows){
      const ticker=cleanTicker(item.row.ticker);
      const current=amounts.get(ticker)||0;
      const others=targetRows.filter(x=>cleanTicker(x.row.ticker)!==ticker).map(x=>({row:x.row,amount:amounts.get(cleanTicker(x.row.ticker))||0}));
      const snap=exposureSnapshot(others);
      const proposedGate=gateCandidate(item.row,current+25,snap);
      if(proposedGate.status==='block') continue;
      const stockCap=roundTo25(spendBudget*(proposedGate.status==='caution'?.35:.48));
      if(current+25>stockCap) continue;
      const bucket=proposedGate.bucket||item.gate?.bucket||sectorBucket(item.row);
      const sectorAllocated=targetRows.filter(x=>(x.gate?.bucket||sectorBucket(x.row))===bucket).reduce((sum,x)=>sum+(amounts.get(cleanTicker(x.row.ticker))||0),0);
      const monthlySectorCap=routeMode==='maximum'?.80:.65;
      if(sectorAllocated+25>roundTo25(spendBudget*monthlySectorCap)) continue;

      const existingValue=holdingValue(item.row);
      const totalBefore=Math.max(1,exposureSnapshot().totalBefore||exposureSnapshot().totalAfter||1);
      const existingShare=existingValue/totalBefore;
      const underweightBoost=Math.max(-18,Math.min(25,(0.12-existingShare)*125));
      const rate=incomeRate(item.row);
      const incomeBoost=Number.isFinite(rate)?Math.min(routeMode==='maximum'?42:28,rate*(routeMode==='maximum'?260:180)):0;
      const brainBoost=Math.max(0,16-(Number(item.brainRank||4)-1)*3);
      const qualityBoost=Math.max(0,Number(item.score||0)-70)*.35;
      let score=(routeMode==='maximum'?incomePriorityScore(item.row):balancedPriorityScore(item.row,snap,current+25))+underweightBoost+incomeBoost+brainBoost+qualityBoost;
      if(proposedGate.status==='caution') score-=routeMode==='maximum'?8:16;
      if(!best||score>best.score) best={item,ticker,score,gate:proposedGate};
    }
    if(!best) break;
    amounts.set(best.ticker,(amounts.get(best.ticker)||0)+25);
    spent+=25;
  }

  const rows=targetRows.map(item=>{
    const amount=amounts.get(cleanTicker(item.row.ticker))||0;
    const gate=gateCandidate(item.row,amount,exposureSnapshot(targetRows.filter(x=>x!==item).map(x=>({row:x.row,amount:amounts.get(cleanTicker(x.row.ticker))||0}))));
    return {...item,amount,gate:{...item.gate,...gate,status:gate.status==='block'?'caution':gate.status},income:annualIncomeForAmount(item.row,amount)};
  }).filter(item=>item.amount>0);
  return {rows,spent:rows.reduce((s,x)=>s+x.amount,0),holdback:Math.max(0,budget-rows.reduce((s,x)=>s+x.amount,0))};
}

function dealFromTradingBrain(payload,fallbackDeal){
  if(!payload||payload.isStale) return fallbackDeal;

  const mission=activeWealthMission();
  const inputBudget=Math.max(0,parseNum($('transferBudgetInput')?.value)||0);
  const budget=Math.max(0,Number(mission?.budget||inputBudget||fallbackDeal?.budget||payload.budget||0));
  const snapshot=exposureSnapshot();
  const seen=new Set();
  const approved=(payload.targets||[]).map((target,index)=>{
    const ticker=cleanTicker(target.ticker);
    if(!ticker||seen.has(ticker)) return null;
    seen.add(ticker);
    const liveRow=findSecurity(ticker);
    const row=hydrateSecurityFromTarget(liveRow,target,payload);
    const sourceAllocation=Math.max(0,Number(target.allocation||0));
    const liveGate=gateCandidate(row,sourceAllocation,snapshot);
    const gate={...liveGate,status:liveGate.status==='block'?'caution':(liveGate.status||'pass'),reasons:Array.isArray(liveGate.reasons)&&liveGate.reasons.length?liveGate.reasons:['Approved by Aurora Trading Brain.'],data:liveGate.data||dataConfidence(row)};
    return {row,gate,score:Number(target.score||0),incomeScore:Number(target.score||0),amount:sourceAllocation,income:Number.isFinite(Number(target.income))?Number(target.income):annualIncomeForAmount(row,sourceAllocation),selected:true,brainRank:Number(target.rank||index+1)};
  }).filter(Boolean).sort((a,b)=>(a.brainRank||999)-(b.brainRank||999));

  if(!approved.length) return fallbackDeal;
  const weighted=portfolioWeightTradingBrainTargets(approved,budget,payload);
  const rows=weighted.rows;
  if(!rows.length) return fallbackDeal;
  const spent=weighted.spent;
  const totalIncome=rows.reduce((sum,item)=>sum+item.income,0);
  const holdback=weighted.holdback;
  const selected=new Set(rows.map(item=>cleanTicker(item.row.ticker)));
  const fallbackBench=(fallbackDeal?.bench||[]).filter(item=>!selected.has(cleanTicker(item.row?.ticker)));
  const fallbackWatch=(fallbackDeal?.watch||[]).filter(item=>!selected.has(cleanTicker(item.row?.ticker)));
  const missionRebased=mission&&payload.wealthMissionId!==mission.id;

  return {
    ...fallbackDeal,budget,rows,chosen:rows,holdback,requestedSpent:spent,totalIncome,
    bench:fallbackBench,watch:fallbackWatch,mode:routeMode==='maximum'?'maximum':'balanced',
    route:`Trading Brain shortlist • ${routeMode==='maximum'?'Maximum-income':'Balanced'} portfolio sizing`,
    reason:`${missionRebased?'The previous Trading Brain shortlist has been rebased to the current Finance Department mission. ':'Trading Brain supplied the approved shortlist. '}The Transfer Centre is sizing the live ${money(budget)} budget using current portfolio weight, sector concentration, income rate, valuation and concentration limits.`,
    status:holdback>0?`${routeMode==='maximum'?'Maximum income':'Balanced'} route controlled`:`${routeMode==='maximum'?'Maximum income':'Balanced'} route ready`,statusClass:holdback>0?'warn':'good',brainLinked:true,portfolioWeighted:true,missionRebased
  };
}
function renderM7TradingBrain(deal,payloadOverride){
  const payload=payloadOverride||readTradingBrainDecision();
  window.AURORA_TRADING_BRAIN_DECISION=payload;
  const rows=deal?.rows||[];
  if(!payload){if($('m7Confidence'))$('m7Confidence').textContent='LOCAL';if($('m7DecisionText'))$('m7DecisionText').textContent='No saved Trading Brain shortlist is available, so the Transfer Centre is using its verified local candidate engine.';if($('m7TargetGrid'))$('m7TargetGrid').innerHTML='<div class="loading">Local Transfer Centre route active.</div>';return;}
  const averageData=rows.length?Math.round(rows.reduce((sum,item)=>sum+Number(item.gate?.data?.score||dataConfidence(item.row).score||0),0)/rows.length):0;
  if($('m7Confidence')) $('m7Confidence').textContent=payload.isStale?'STALE':(rows.length?`${averageData}%`:'HOLD');
  if($('m7Strategy')) $('m7Strategy').textContent=routeMode==='maximum'?'Maximum Income':'Balanced';
  if($('m7Budget')) $('m7Budget').textContent=money(deal?.budget||0);
  if($('m7Income')) $('m7Income').textContent=`${money(deal?.totalIncome||0)}/yr`;
  if($('m7Holdback')) $('m7Holdback').textContent=money(deal?.holdback||0);
  if($('m7TargetCount')) $('m7TargetCount').textContent=`${rows.length} TARGET${rows.length===1?'':'S'}`;
  if($('m7DecisionText')) $('m7DecisionText').textContent=payload.isStale?'The saved shortlist is over 24 hours old. Refresh Trading Brain before execution.':(rows.length?`${rows[0].row.ticker} leads the approved shortlist. The displayed allocations are the Transfer Centre's live portfolio-weighted sizes for the current Finance Department budget.`:'Aurora recommends holding cash.');
  const grid=$('m7TargetGrid');
  if(grid) grid.innerHTML=rows.length?rows.map((item,index)=>{const account=platformFor(item.row.ticker);return `<article class="m7-target"><div class="m7-target-top"><div class="m7-rank">${index+1}</div><div style="flex:1"><h3>${escapeHtml(displayTicker(item.row.ticker))}</h3><div class="m7-target-name">${escapeHtml(displayName(item.row))}</div></div><span class="platform-tag ${String(account).toLowerCase().includes('212')?'t212':String(account).toLowerCase().includes('ig')?'ig':'check'}">${escapeHtml(account)}</span></div><div class="m7-target-stats"><div class="m7-target-stat"><small>Data</small><strong>${item.gate?.data?.score||dataConfidence(item.row).score}%</strong></div><div class="m7-target-stat"><small>Allocation</small><strong>${money(item.amount)}</strong></div><div class="m7-target-stat"><small>Income</small><strong>${money(item.income)}/yr</strong></div></div><div class="m7-reason">${escapeHtml(item.gate?.reasons?.[0]||m7Reason(item))}</div></article>`}).join(''):'<div class="loading">No buy today. Cash remains protected.</div>';
}
$('m7ApprovePlan')?.addEventListener('click',()=>{try{localStorage.setItem('aurora_m7_manager_approval',new Date().toISOString())}catch(e){};if($('m7FlowApproval')){$('m7FlowApproval').classList.remove('active');$('m7FlowApproval').classList.add('done');$('m7FlowApproval').textContent='2 • Plan approved';}document.getElementById('deal-sheet')?.scrollIntoView({behavior:'smooth',block:'start'});});
$('m7EditPlan')?.addEventListener('click',()=>document.getElementById('deal-sheet')?.scrollIntoView({behavior:'smooth',block:'start'}));
$('m7HoldCash')?.addEventListener('click',()=>{if($('m7DecisionText'))$('m7DecisionText').textContent='Manager decision: hold cash and make no purchase until the next live review.';if($('m7FlowApproval')){$('m7FlowApproval').classList.remove('active');$('m7FlowApproval').textContent='2 • Cash hold selected';}});

function renderAll(){
  if($('lastUpdated')) { if(window.AuroraFC) AuroraFC.setFreshness('lastUpdated',AURORA_MASTER_CACHE,{prefix:'Aurora generated'}); else $('lastUpdated').textContent='Aurora generated: unavailable'; }
  renderDeploymentPlan();
  renderExitFundingRoom();
  const brainDecision = readTradingBrainDecision();
  hydrateStateFromDecision(brainDecision);
  const localDeal = buildDealSheet();
  const deal = dealFromTradingBrain(brainDecision,localDeal);
  persistTransferSettings();
  publishTransferPlan(deal);
  renderM7TradingBrain(deal,brainDecision);
  renderTransferTicker(deal);
  renderKpis(deal);
  renderDeadlineBar(deal);
  renderTopTransferBoard(deal);
  renderDealSheet(deal);
  renderRegistrationDesk(deal);
  renderBench(deal);
  renderWatch(deal);
  renderPostTransferImpact(deal);
  renderBestReturnAllocation(deal);
  renderIncomeSimulator(deal);
  renderDividendCalendar(deal);
  renderPortfolioControlRoom(deal);
  renderSmartExitDesk();
  renderPaydayExecution(deal);
  window.AURORA_PAGE_CHECKS=()=>[
    {level:deal.rows.length?'ok':'warn',title:`${deal.rows.length} approved signings`,detail:deal.rows.length?`${money(deal.totalIncome||0)}/year estimated income added.`:'No target currently clears the transfer gates.'},
    {level:excludedTickers.size?'warn':'ok',title:excludedTickers.size?`${excludedTickers.size} manually excluded`:'No manual exclusions',detail:excludedTickers.size?[...excludedTickers].join(' • '):'Automatic route is using the full eligible pool.'},
    {level:deal.mode==='maximum'?'warn':'ok',title:deal.mode==='maximum'?'Maximum-income mode':'Balanced route mode',detail:deal.mode==='maximum'?'Higher income selected; hard concentration gates remain active.':'Income, valuation, safety and diversification are all weighted.'}
  ];
}
async function fetchTab(tab){
  if(!AURORA_MASTER_CACHE){
    const res = await fetch(AURORA_MASTER_URL, {cache:'no-store'});
    if(!res.ok) throw new Error(`AuroraData failed: ${res.status}`);
    AURORA_MASTER_CACHE = await res.json();
  }
  return Array.isArray(AURORA_MASTER_CACHE?.[tab]) ? AURORA_MASTER_CACHE[tab] : [];
}
async function loadData(){
  const btn = $('refreshBtn');
  if(btn){ btn.textContent = 'Loading…'; btn.disabled = true; }
  try{
    const [holdings, watchlist, scout, auroraTimes, fxRates, livePrices] = await Promise.all([
      fetchTab('Holdings'),
      fetchTab('Watchlist'),
      fetchTab('AuroraScout').catch(()=>[]),
      fetchTab('AuroraTimes').catch(()=>[]),
      fetchTab('FXRates').catch(()=>[]),
      fetchTab('LivePrices').catch(()=>[])
    ]);
    state = { holdings, watchlist, scout, auroraTimes, fxRates, livePrices };
    lastLiveRefreshAt = new Date().toISOString();
    renderAll();
    renderSellDeskHoldings();

    // Incoming offers are loaded separately from the Registration Desk.
    // Re-render them after live holdings arrive so the fixed target can be
    // checked against the current market price.
    if(incomingOffers.length) renderIncomingOffers();
    renderExitFundingRoom();
  }catch(err){
    console.error(err);
    const fail = `<div class="loading error">${err.message || 'Unable to load AuroraData'}</div>`;
    ['finalDealSheet','registrationDesk','benchList','watchList'].forEach(id => { if($(id)) $(id).innerHTML = fail; });
    if($('headlineStatus')) $('headlineStatus').textContent = 'Data error';
  }finally{
    if(btn){ btn.textContent = 'Refresh'; btn.disabled = false; }
  }
}
$('refreshBtn')?.addEventListener('click', () => {
  AURORA_MASTER_CACHE = null;
  loadData();
});
$('transferBudgetInput')?.addEventListener('input',()=>{manualAmounts.clear();renderAll();});
['corePotInput','coreMonthlyInput','etfPotInput','etfMonthlyInput','deploymentMonthInput'].forEach(id=>$(id)?.addEventListener('input',renderDeploymentPlan));
$('nextPaydayInput')?.addEventListener('change',()=>{persistExitFundingSettings();renderExitFundingRoom();});
$('refreshExitFunding')?.addEventListener('click',()=>{persistExitFundingSettings();AURORA_MASTER_CACHE=null;loadData();loadIncomingOffers(false);});
$('applyMonthlyBudget')?.addEventListener('click',()=>{readDeploymentInputs();const release=deploymentReleaseForMonth(deploymentPlan.currentMonth);if($('transferBudgetInput'))$('transferBudgetInput').value=release.total;routeMode='balanced';manualAmounts.clear();excludedTickers.clear();persistDeploymentPlan();renderAll();document.getElementById('best-return-allocation')?.scrollIntoView({behavior:'smooth',block:'start'});});
document.addEventListener('change',event=>{
  const input=event.target.closest?.('[data-allocation-ticker]'); if(!input) return;
  manualAmounts.set(cleanTicker(input.dataset.allocationTicker),Math.max(0,parseNum(input.value)||0)); renderAll();
});
document.addEventListener('click',event=>{
  const exclude=event.target.closest?.('[data-exclude-ticker]'); if(exclude){excludedTickers.add(cleanTicker(exclude.dataset.excludeTicker));manualAmounts.delete(cleanTicker(exclude.dataset.excludeTicker));renderAll();}
});
document.addEventListener('click',event=>{
  const open=event.target.closest?.('[data-open-registration]');
  if(open){registrationOpenKey=registrationOpenKey===open.dataset.openRegistration?'':open.dataset.openRegistration;renderRegistrationDesk(buildDealSheet());return;}
});
document.addEventListener('input',event=>{
  const form=event.target.closest?.('[data-registration-form]'); if(form) updateRegistrationPreview(form);
});
document.addEventListener('change',event=>{
  const form=event.target.closest?.('[data-registration-form]'); if(form) updateRegistrationPreview(form);
});
document.addEventListener('reset',event=>{
  const form=event.target.closest?.('[data-registration-form]'); if(form) setTimeout(()=>updateRegistrationPreview(form),0);
});
document.addEventListener('submit',async event=>{
  const form=event.target.closest?.('[data-registration-form]'); if(!form) return;
  event.preventDefault();
  if(registrationBusy) return;
  const account=form.querySelector('[name="account"]')?.value||'';
  const holding=currentHoldingForRegistration(form.dataset.ticker,account);
  const msg=form.querySelector('[data-form-message]');
  const shares=parseNum(form.querySelector('[name="shares"]')?.value);
  const price=parseNum(form.querySelector('[name="price"]')?.value);
  if(!(shares>0)||!(price>0)){msg.textContent='Enter both the completed share quantity and executed price.';msg.className='registration-message error';return;}
  updateRegistrationPreview(form);
  if(form.dataset.safetyBlocked==='true'){const safetyBox=form.querySelector('[data-safety-message]');safetyBox?.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(!registrationConnection.endpoint||!registrationConnection.token){
    $('registrationConnection')?.setAttribute('open','');
    msg.textContent='Save the Apps Script URL and private token above before registering the purchase.';msg.className='registration-message error';
    $('registrationConnection')?.scrollIntoView({behavior:'smooth',block:'center'}); return;
  }
  const payload={
    action:'registerPurchase',transactionId:registrationId(),createIfMissing:true,
    ticker:form.dataset.ticker,name:form.dataset.name,account,
    shares,priceInput:price,priceUnit:form.querySelector('[name="priceUnit"]')?.value||'GBP',currency:form.querySelector('[name="currency"]')?.value||'GBP',
    fees:parseNum(form.querySelector('[name="fees"]')?.value)||0,fxRateToGbp:parseNum(form.querySelector('[name="fxRate"]')?.value),
    tradeDate:form.querySelector('[name="tradeDate"]')?.value||registrationDateValue(),note:form.querySelector('[name="note"]')?.value||'',
    annualDps:parseNum(form.dataset.annualDps),sector:form.dataset.sector||'',role:form.dataset.role||'',
    buyStrength:parseNum(form.dataset.buyStrength),low52w:parseNum(form.dataset.low52w),high52w:parseNum(form.dataset.high52w),
    payoutRatio:form.dataset.payoutRatio||'',payoutRisk:form.dataset.payoutRisk||'',dividendGrowth5y:form.dataset.dividendGrowth5y||'',
    squadRole:form.dataset.squadRole||'',promotionImpactScore:parseNum(form.dataset.promotionImpactScore),
    trialStatus:form.dataset.trialStatus||'',trialRank:parseNum(form.dataset.trialRank),trialVerdict:form.dataset.trialVerdict||'',
    managerNote:form.dataset.managerNote||'',chemistryRole:form.dataset.chemistryRole||'',chemistryRisk:form.dataset.chemistryRisk||'',
    squadBalanceNote:form.dataset.squadBalanceNote||'',
    dealAllocationGbp:parseNum(form.dataset.dealAllocation),referencePriceGbp:parseNum(form.dataset.livePriceGbp),
    source:'Aurora City FC Transfer Centre',userAgent:navigator.userAgent
  };
  registrationBusy=true;
  const submit=form.querySelector('button[type="submit"]'); if(submit){submit.disabled=true;submit.textContent='Registering…';}
  msg.textContent=holding?'Sending the completed top-up to AuroraData…':'Creating the new squad holding and registering the completed trade…';msg.className='registration-message pending';
  try{
    const result=await postRegistration(payload);
    applyRegistrationResult(result,payload);
    const message=result.queued?result.message:`${result.createdNewHolding?'New signing created and registered':'Top-up registered'}. ${displayTicker(payload.ticker)} now has ${Number(result.newShares).toLocaleString('en-GB',{maximumFractionDigits:8})} shares at an estimated ${money(result.newAverageGbp)} weighted average. Annual income added: ${money(result.annualIncomeAddedGbp)}.`;
    msg.textContent=message;msg.className=`registration-message ${result.queued?'pending':'success'}`;
    localStorage.setItem(REGISTRATION_LAST_KEY,JSON.stringify({transactionId:payload.transactionId,ticker:payload.ticker,account:payload.account,message,at:new Date().toISOString()}));
    window.dispatchEvent(new Event('aurora:m4-update'));
    if(!result.queued){setTimeout(()=>{renderAll();loadRegistrationHistory();},900);}
  }catch(err){
    console.error(err);msg.textContent=err.message||'Registration failed. AuroraData was not changed.';msg.className='registration-message error';
  }finally{
    registrationBusy=false;if(submit){submit.disabled=false;submit.textContent=currentHoldingForRegistration(form.dataset.ticker,account)?'Confirm top-up':'Confirm new signing';}
  }
});
$('saveRegistrationConnection')?.addEventListener('click',async()=>{persistRegistrationConnection();registrationMessage(registrationConnection.endpoint&&registrationConnection.token?'Connection saved in this browser. Loading PlatformRules…':'Enter both the web-app URL and private token.');if(registrationConnection.endpoint&&registrationConnection.token)await loadPlatformRules();loadRegistrationHistory();loadSellTickets();});
$('clearRegistrationConnection')?.addEventListener('click',()=>{localStorage.removeItem(REGISTRATION_CONNECTION_KEY);registrationConnection={endpoint:'',token:''};if($('registrationEndpoint'))$('registrationEndpoint').value='';if($('registrationToken'))$('registrationToken').value='';updateRegistrationConnectionStatus();const rulesChip=$('platformRulesStatus');if(rulesChip){rulesChip.textContent='Rules: connect AuroraData';rulesChip.className='status-chip caution';}registrationMessage('Connection removed from this browser.');if($('deskNote'))$('deskNote').textContent='Connect AuroraData to load the live PlatformRules table.';});
$('testRegistrationConnection')?.addEventListener('click',async()=>{
  persistRegistrationConnection();
  if(!registrationConnection.endpoint||!registrationConnection.token){registrationMessage('Enter both the web-app URL and token first.','error');return;}
  registrationMessage('Testing the AuroraData registration service…','pending');
  try{
    const result=await postRegistration({action:'test',transactionId:registrationId(),source:'Aurora City FC Transfer Centre'});
    registrationMessage(result.queued?'Test request submitted, but the browser could not read the cross-site confirmation. The connection may still be working.':(result.message||'Registration service is ready.'),result.queued?'pending':'success');
    if(!result.queued){await loadPlatformRules();loadRegistrationHistory();loadSellTickets();}
  }catch(err){registrationMessage(err.message||'Connection test failed.','error');}
});

$('refreshRegistrationHistory')?.addEventListener('click',loadRegistrationHistory);
document.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-undo-registration]'); if(!button) return;
  const transactionId=button.dataset.undoRegistration; const label=button.dataset.undoLabel||transactionId;
  if(!window.confirm(`Undo this registration?\n\n${label}\n\nAurora will restore the previous Holdings data and log the reversal.`)) return;
  button.disabled=true;button.textContent='Undoing…';
  try{const result=await postRegistration({action:'undoRegistration',transactionId,newTransactionId:`UNDO-${Date.now()}`,source:'Aurora City FC Transfer Centre',userAgent:navigator.userAgent});registrationMessage(result.message||'Registration was undone.','success');AURORA_MASTER_CACHE=null;await loadData();await loadRegistrationHistory();}
  catch(err){registrationMessage(err.message||'Undo failed.','error');button.disabled=false;button.textContent='Undo';}
});
$('resetTransferPlan')?.addEventListener('click',()=>{excludedTickers.clear();manualAmounts.clear();routeMode='balanced';const release=deploymentReleaseForMonth(deploymentPlan.currentMonth);if($('transferBudgetInput'))$('transferBudgetInput').value=release.total;renderAll();});
$('applyBalancedRoute')?.addEventListener('click',()=>{
  routeMode='balanced';manualAmounts.clear();renderAll();
  document.getElementById('deal-sheet')?.scrollIntoView({behavior:'smooth',block:'start'});
});
$('applyBestReturn')?.addEventListener('click',()=>{
  routeMode='maximum';manualAmounts.clear();renderAll();
  document.getElementById('deal-sheet')?.scrollIntoView({behavior:'smooth',block:'start'});
});


/* ===================== AURORA SELL DESK UI ===================== */
let sellTickets=[];
let sellDeskBusy=false;
function sellDeskActiveHoldings(){
  return activeHoldings().filter(row=>{
    const account=normalizeRegistrationAccount(row.account||row.platform||row.broker);
    const ticker=registrationShortTicker(row.ticker);
    const shares=parseNum(row.shares);
    return shares>0&&['IG ISA','TRADE 212'].includes(account)&&ticker!=='TSCO';
  }).sort((a,b)=>String(a.name||a.ticker).localeCompare(String(b.name||b.ticker)));
}
function sellDeskHoldingKey(row){return `${registrationShortTicker(row.ticker)}|${normalizeRegistrationAccount(row.account||row.platform||row.broker)}`;}
function selectedSellHolding(){
  const key=$('sellHoldingSelect')?.value||'';
  return sellDeskActiveHoldings().find(row=>sellDeskHoldingKey(row)===key)||null;
}
function renderSellDeskHoldings(){
  const select=$('sellHoldingSelect'); if(!select) return;
  const current=select.value; const rows=sellDeskActiveHoldings();
  select.innerHTML='<option value="">Select an active holding…</option>'+rows.map(row=>{
    const account=normalizeRegistrationAccount(row.account||row.platform||row.broker);
    return `<option value="${escapeHtml(sellDeskHoldingKey(row))}">${escapeHtml(displayTicker(row.ticker))} — ${escapeHtml(row.name||'')} (${escapeHtml(account)})</option>`;
  }).join('');
  if(rows.some(row=>sellDeskHoldingKey(row)===current)) select.value=current;
  updateSellTicketPreview();
}
function updateSellTicketPreview(){
  const form=$('sellTicketForm'); if(!form) return;
  const row=selectedSellHolding(); const sharesInput=$('sellProposedShares'); const action=$('sellProposedAction')?.value||'TRIM';
  if(!row){
    if($('sellCurrentShares'))$('sellCurrentShares').textContent='—';
    if($('sellEstimatedProceeds'))$('sellEstimatedProceeds').textContent='—';
    if($('sellIncomeLost'))$('sellIncomeLost').textContent='—';
    return;
  }
  const currentShares=parseNum(row.shares)||0;
  if(sharesInput){sharesInput.max=String(currentShares);if(!parseNum(sharesInput.value)){sharesInput.value=action==='TRIM'?String(Math.max(0.00000001,currentShares*.25)):String(currentShares);}}
  const proposed=Math.max(0,Math.min(currentShares,parseNum(sharesInput?.value)||0));
  const value=holdingValue(row); const estimated=currentShares>0?value*(proposed/currentShares):0;
  const dps=parseNum(row.annual_dps)||0; const lost=proposed*dps;
  if($('sellCurrentShares'))$('sellCurrentShares').textContent=currentShares.toLocaleString('en-GB',{maximumFractionDigits:8});
  if($('sellEstimatedProceeds'))$('sellEstimatedProceeds').textContent=money(estimated);
  if($('sellIncomeLost'))$('sellIncomeLost').textContent=`${money(lost)}/yr`;
}
function sellTicketStatusClass(status){return String(status||'').toLowerCase().replace(/\s+/g,'-');}
function executionFormHtml(ticket){
  const defaultPrice=ticket.currency==='USD'?'':ticket.livePrice||'';
  const fxField=ticket.currency==='USD'?`<label class="registration-field"><span>USD → GBP rate</span><input name="fxRate" type="number" step="any" min="0" placeholder="e.g. 0.74" required></label>`:'';
  return `<form class="sell-execution-form" data-sell-execution="${escapeHtml(ticket.ticketId)}">
    <label class="registration-field"><span>Shares actually sold</span><input name="shares" type="number" step="any" min="0" max="${ticket.proposedShares}" value="${ticket.proposedShares}" required></label>
    <label class="registration-field"><span>Executed price (${escapeHtml(ticket.priceUnit)})</span><input name="price" type="number" step="any" min="0" value="${escapeHtml(defaultPrice)}" required></label>
    <label class="registration-field"><span>Fees (${escapeHtml(ticket.currency)})</span><input name="fees" type="number" step="any" min="0" value="0"></label>
    ${fxField}
    <label class="registration-field"><span>Trade date</span><input name="tradeDate" type="date" value="${registrationDateValue()}" required></label>
    <label class="registration-field wide"><span>Execution note</span><input name="note" type="text" placeholder="Broker fill reference or reason for a partial fill."></label>
    <div class="registration-message wide" data-sale-message>Only use this after the broker confirms the sale. Aurora will update Holdings and PurchaseLog.</div>
    <div class="registration-form-actions wide"><button class="registration-btn danger" type="submit">Record completed sale</button><button class="registration-btn" type="button" data-sell-status="CANCELLED" data-ticket-id="${escapeHtml(ticket.ticketId)}">Cancel ticket</button></div>
  </form>`;
}
function renderSellTicketList(){
  const list=$('sellTicketList'); if(!list) return;
  const active=sellTickets.filter(t=>!['REJECTED','EXECUTED','CANCELLED'].includes(String(t.approvalStatus||'').toUpperCase()));
  if($('sellTicketCount'))$('sellTicketCount').textContent=`${active.length} active`;
  if($('subnavSellCount')) $('subnavSellCount').textContent=active.length;
  if(!sellTickets.length){list.innerHTML='<div class="sell-desk-empty">No sell-review tickets. That is a good thing — nothing is being pushed toward the exit door.</div>';return;}
  list.innerHTML=sellTickets.map(ticket=>{
    const status=String(ticket.approvalStatus||'PROPOSED').toUpperCase();
    const actions=status==='PROPOSED'?`<div class="sell-ticket-actions"><button class="registration-btn primary" type="button" data-sell-status="APPROVED" data-ticket-id="${escapeHtml(ticket.ticketId)}">Approve review</button><button class="registration-btn danger" type="button" data-sell-status="REJECTED" data-ticket-id="${escapeHtml(ticket.ticketId)}">Reject</button></div>`:'';
    const execution=status==='APPROVED'?executionFormHtml(ticket):'';
    return `<article class="sell-ticket">
      <div class="sell-ticket-head"><div><strong>${escapeHtml(ticket.ticker)} — ${escapeHtml(ticket.name)}</strong><span>${escapeHtml(ticket.account)} • ${escapeHtml(ticket.triggerType)} • ${escapeHtml(ticket.proposedAction)}</span></div><span class="sell-ticket-status ${sellTicketStatusClass(status)}">${escapeHtml(status)}</span></div>
      <div class="sell-ticket-grid"><div><small>Proposed shares</small><b>${Number(ticket.proposedShares||0).toLocaleString('en-GB',{maximumFractionDigits:8})}</b></div><div><small>Estimated proceeds</small><b>${money(Number(ticket.estimatedProceedsGbp||0))}</b></div><div><small>Income removed</small><b>${money(Number(ticket.annualIncomeLostGbp||0))}/yr</b></div><div><small>Severity</small><b>${escapeHtml(ticket.severity||'—')}</b></div></div>
      <div class="sell-ticket-reason"><b>Reason:</b> ${escapeHtml(ticket.reason||'No reason recorded.')}${ticket.evidence?`<br><b>Evidence:</b> ${escapeHtml(ticket.evidence)}`:''}</div>
      ${actions}${execution}
    </article>`;
  }).join('');
}
async function loadSellTickets(){
  if(!$('sellTicketList')) return;
  if(!registrationConnection.endpoint||!registrationConnection.token){sellTickets=[];renderSellTicketList();return;}
  $('sellTicketList').innerHTML='<div class="loading">Loading Sell Desk tickets…</div>';
  try{
    const result=await postRegistration({action:'listSellTickets',limit:50,includeClosed:true,source:'Aurora City FC Sell Desk'});
    if(result.queued){$('sellTicketList').innerHTML='<div class="sell-desk-empty">The request was sent, but this browser could not read the response. Refresh after the Apps Script deployment is updated.</div>';return;}
    sellTickets=Array.isArray(result.tickets)?result.tickets:[];renderSellTicketList();
  }catch(err){$('sellTicketList').innerHTML=`<div class="sell-desk-empty">${escapeHtml(err.message||'Unable to load Sell Desk. Deploy the updated Apps Script first.')}</div>`;}
}
async function updateSellTicketStatus(ticketId,status,button){
  if(sellDeskBusy)return;
  const verb=status==='APPROVED'?'approve this internal review ticket':'mark this ticket '+status.toLowerCase();
  if(!window.confirm(`Are you sure you want to ${verb}?\n\nThis does not place a broker order.`))return;
  sellDeskBusy=true;if(button){button.disabled=true;button.textContent='Updating…';}
  try{const result=await postRegistration({action:'updateSellTicket',ticketId,status,approvedBy:'Manager',source:'Aurora City FC Sell Desk',userAgent:navigator.userAgent});registrationMessage(result.message||'Sell Desk ticket updated.','success');await loadSellTickets();}
  catch(err){registrationMessage(err.message||'Sell Desk update failed.','error');if(button)button.disabled=false;}
  finally{sellDeskBusy=false;}
}


$('sellHoldingSelect')?.addEventListener('change',()=>{const input=$('sellProposedShares');if(input)input.value='';updateSellTicketPreview();});
$('sellProposedAction')?.addEventListener('change',()=>{const row=selectedSellHolding();const input=$('sellProposedShares');if(row&&input){const current=parseNum(row.shares)||0;input.value=$('sellProposedAction').value==='TRIM'?String(Math.max(.00000001,current*.25)):String(current);}updateSellTicketPreview();});
$('sellProposedShares')?.addEventListener('input',updateSellTicketPreview);
$('refreshSellTickets')?.addEventListener('click',loadSellTickets);
$('sellTicketForm')?.addEventListener('submit',async event=>{
  event.preventDefault();if(sellDeskBusy)return;
  const form=event.currentTarget;const row=selectedSellHolding();const msg=$('sellTicketMessage');
  if(!row){msg.textContent='Choose an active IG ISA or Trade 212 holding first.';msg.className='registration-message error';return;}
  if(!registrationConnection.endpoint||!registrationConnection.token){$('registrationConnection')?.setAttribute('open','');msg.textContent='Connect the Registration Desk before creating a sell-review ticket.';msg.className='registration-message error';return;}
  const currentShares=parseNum(row.shares)||0;const proposed=parseNum(form.proposedShares.value)||0;
  if(!(proposed>0)||proposed>currentShares){msg.textContent='The proposed quantity must be above zero and no greater than the holding.';msg.className='registration-message error';return;}
  const reason=String(form.reason.value||'').trim();if(reason.length<8){msg.textContent='Add a clear reason for the review.';msg.className='registration-message error';return;}
  const detail=platformRuleDetailsFor(row.ticker);const currency=detail?.currency||registrationCurrency(row);const priceUnit=detail?.priceUnit||registrationUnitFor(row);
  const currentValue=holdingValue(row);const estimated=currentShares>0?currentValue*(proposed/currentShares):0;
  const liveGbp=parseNum(row.live_price)||0;const livePrice=priceUnit==='PENCE'?liveGbp*100:liveGbp;
  const payload={action:'createSellTicket',ticketId:`SELL-${Date.now()}`,ticker:row.ticker,name:row.name,account:row.account,triggerType:form.triggerType.value,severity:form.severity.value,proposedAction:form.proposedAction.value,proposedShares:proposed,livePrice,estimatedProceedsGbp:estimated,currency,priceUnit,reason,evidence:form.evidence.value||'',source:'Aurora City FC Sell Desk',userAgent:navigator.userAgent};
  sellDeskBusy=true;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Creating…';msg.textContent='Creating internal review ticket…';msg.className='registration-message pending';
  try{const result=await postRegistration(payload);msg.textContent=result.message||'Sell-review ticket created. No broker order was placed.';msg.className=`registration-message ${result.queued?'pending':'success'}`;if(!result.queued){form.reason.value='';form.evidence.value='';await loadSellTickets();}}
  catch(err){msg.textContent=err.message||'Sell-review ticket was not created.';msg.className='registration-message error';}
  finally{sellDeskBusy=false;submit.disabled=false;submit.textContent='Create sell-review ticket';}
});
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-sell-status]');if(!button)return;updateSellTicketStatus(button.dataset.ticketId,button.dataset.sellStatus,button);});
document.addEventListener('submit',async event=>{
  const form=event.target.closest?.('[data-sell-execution]');if(!form)return;event.preventDefault();if(sellDeskBusy)return;
  const ticket=sellTickets.find(t=>t.ticketId===form.dataset.sellExecution);if(!ticket)return;
  const msg=form.querySelector('[data-sale-message]');const shares=parseNum(form.shares.value);const price=parseNum(form.price.value);
  if(!(shares>0)||!(price>0)){msg.textContent='Enter the broker-confirmed shares and execution price.';msg.className='registration-message error wide';return;}
  if(!window.confirm(`Record this completed broker sale in AuroraData?\n\n${ticket.ticker} • ${shares} shares\n\nThis does not send an order to the broker.`))return;
  const payload={action:'registerSale',transactionId:`SALE-${Date.now()}`,ticketId:ticket.ticketId,shares,priceInput:price,priceUnit:ticket.priceUnit,currency:ticket.currency,fees:parseNum(form.fees.value)||0,fxRateToGbp:parseNum(form.fxRate?.value),tradeDate:form.tradeDate.value||registrationDateValue(),note:form.note.value||'',source:'Aurora City FC Sell Desk',userAgent:navigator.userAgent};
  sellDeskBusy=true;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Recording…';msg.textContent='Recording the broker-confirmed sale in AuroraData…';msg.className='registration-message pending wide';
  try{const result=await postRegistration(payload);msg.textContent=`${result.message} Net proceeds: ${money(result.netProceedsGbp)}. Annual income removed: ${money(result.annualIncomeLostGbp)}.`;msg.className=`registration-message ${result.queued?'pending':'success'} wide`;if(!result.queued){const local=state.holdings.find(r=>registrationShortTicker(r.ticker)===ticket.ticker&&normalizeRegistrationAccount(r.account)===normalizeRegistrationAccount(ticket.account));if(local)local.shares=result.newShares;await loadSellTickets();await loadRegistrationHistory();renderSellDeskHoldings();}}
  catch(err){msg.textContent=err.message||'The sale record failed. Holdings were not changed.';msg.className='registration-message error wide';submit.disabled=false;submit.textContent='Record completed sale';}
  finally{sellDeskBusy=false;}
});


/* ===================== INCOMING OFFERS ===================== */
let incomingOffers=[];
let incomingOfferBusy=false;

function offerPriceLabel(value,unit,currency){
  const number=Number(value||0);
  if(String(unit||'').toUpperCase()==='PENCE') return `${number.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}p`;
  if(String(currency||'').toUpperCase()==='USD'||String(unit||'').toUpperCase()==='USD') return `$${number.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return `£${number.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function incomingOfferHolding(offer){
  const target=registrationShortTicker(offer?.ticker);
  return (state.holdings||[]).find(row=>
    registrationShortTicker(row?.ticker)===target &&
    !['SOLD','EXITED'].includes(String(row?.status||'').toUpperCase())
  ) || (state.holdings||[]).find(row=>
    registrationShortTicker(row?.ticker)===target
  ) || null;
}

function fxRateToGbp(currency){
  const code=String(currency||'GBP').trim().toUpperCase();
  if(code==='GBP') return 1;

  const row=(state.fxRates||[]).find(item=>
    String(item?.Currency??item?.currency??'').trim().toUpperCase()===code
  );
  const rate=parseNum(row?.Rate_to_GBP??row?.rate_to_gbp??row?.rate);
  return Number.isFinite(rate)&&rate>0?rate:NaN;
}

function currentOfferLivePrice(offer){
  const holding=incomingOfferHolding(offer);
  if(!holding) return NaN;

  const raw=parseNum(
    holding.live_price ??
    holding['Live Price'] ??
    holding.price ??
    holding.Price
  );
  if(!Number.isFinite(raw)||raw<=0) return NaN;

  const unit=String(offer?.priceUnit||'').toUpperCase();
  const currency=String(offer?.currency||'GBP').toUpperCase();

  // Aurora Holdings stores portfolio live prices in GBP.
  if(unit==='PENCE') return raw*100;

  if(unit==='USD'||currency==='USD'){
    const rate=fxRateToGbp('USD');
    return Number.isFinite(rate)&&rate>0?raw/rate:NaN;
  }

  if(currency&&currency!=='GBP'){
    const rate=fxRateToGbp(currency);
    return Number.isFinite(rate)&&rate>0?raw/rate:NaN;
  }

  return raw;
}

function incomingOfferClauseData(offer){
  const premiumRate=Number(offer?.premiumPct);
  const offerPrice=Number(offer?.offerPrice);
  const offerValue=Number(offer?.offerValueGbp);
  const requestedShares=Number(offer?.requestedShares);
  const currentLivePrice=currentOfferLivePrice(offer);

  if(
    !Number.isFinite(premiumRate) ||
    premiumRate<=-1 ||
    !Number.isFinite(offerPrice) ||
    offerPrice<=0
  ){
    return {
      known:false,
      met:false,
      referencePrice:NaN,
      releasePrice:NaN,
      currentLivePrice,
      currentLiveValue:NaN,
      releaseValue:NaN,
      differencePrice:NaN,
      differenceGbp:NaN,
      progressPct:NaN,
      premiumRate:Number.isFinite(premiumRate)?premiumRate:NaN
    };
  }

  // The snapshot and its +6% target stay fixed for the life of this bid.
  // The target does not move when the current live price changes.
  const referencePrice=offerPrice/(1+premiumRate);
  const releasePrice=referencePrice*1.06;

  const referenceValue=Number.isFinite(offerValue)&&offerValue>0
    ? offerValue/(1+premiumRate)
    : NaN;
  const releaseValue=Number.isFinite(referenceValue)
    ? referenceValue*1.06
    : NaN;

  const currentLiveValue=(
    Number.isFinite(currentLivePrice) &&
    Number.isFinite(requestedShares) &&
    requestedShares>0
  )
    ? (
        String(offer?.priceUnit||'').toUpperCase()==='PENCE'
          ? currentLivePrice/100
          : currentLivePrice
      ) * requestedShares *
      (
        String(offer?.currency||'GBP').toUpperCase()==='GBP'
          ? 1
          : (fxRateToGbp(offer?.currency)||1)
      )
    : NaN;

  const differencePrice=Number.isFinite(currentLivePrice)
    ? currentLivePrice-releasePrice
    : NaN;

  const differenceGbp=(
    Number.isFinite(currentLiveValue) &&
    Number.isFinite(releaseValue)
  )
    ? currentLiveValue-releaseValue
    : NaN;

  const tolerance=Math.max(0.00005,releasePrice*0.000005);
  const met=Number.isFinite(currentLivePrice)
    ? currentLivePrice>=(releasePrice-tolerance)
    : false;

  const progressPct=(
    Number.isFinite(currentLivePrice) &&
    Number.isFinite(releasePrice) &&
    releasePrice>0
  )
    ? Math.max(0,Math.min(100,(currentLivePrice/releasePrice)*100))
    : NaN;

  return {
    known:Number.isFinite(currentLivePrice),
    met,
    referencePrice,
    releasePrice,
    currentLivePrice,
    currentLiveValue,
    releaseValue,
    differencePrice,
    differenceGbp,
    progressPct,
    premiumRate
  };
}

function incomingOfferClauseHtml(offer,clause){
  if(!clause.known){
    return `<div class="offer-live-target unknown">
      <div class="offer-live-target-head">
        <div>
          <small>Live 6% target check</small>
          <strong>Waiting for live market data</strong>
          <p>The fixed target is stored, but Aurora has not yet loaded a current price for this holding.</p>
        </div>
        <span class="offer-live-target-pill">Checking</span>
      </div>
      <div class="offer-target-track"><span class="offer-target-fill" style="width:3%"></span></div>
    </div>`;
  }

  const current=offerPriceLabel(
    clause.currentLivePrice,
    offer.priceUnit,
    offer.currency
  );
  const target=offerPriceLabel(
    clause.releasePrice,
    offer.priceUnit,
    offer.currency
  );
  const priceGap=Math.abs(clause.differencePrice);
  const gapLabel=offerPriceLabel(priceGap,offer.priceUnit,offer.currency);
  const remainingPct=(
    Number.isFinite(clause.currentLivePrice) &&
    clause.currentLivePrice>0
  )
    ? Math.max(0,((clause.releasePrice/clause.currentLivePrice)-1)*100)
    : NaN;

  const detail=clause.met
    ? (
        Math.abs(clause.differencePrice)<0.005
          ? 'The actual live price has matched the fixed target.'
          : `The actual live price is ${gapLabel} above the fixed target.`
      )
    : `${gapLabel} still required${
        Number.isFinite(remainingPct)
          ? ` (${remainingPct.toFixed(2)}%)`
          : ''
      }.`;

  return `<div class="offer-live-target ${clause.met?'met':'waiting'}">
    <div class="offer-live-target-head">
      <div>
        <small>Live 6% target check</small>
        <strong>${clause.met?'Offer activated':'Offer waiting — target not reached'}</strong>
        <p>${detail} This target remains tied to the original market snapshot.</p>
      </div>
      <span class="offer-live-target-pill">${clause.met?'Live target met':'Offer locked'}</span>
    </div>
    <div class="offer-target-track">
      <span class="offer-target-fill" style="width:${Number.isFinite(clause.progressPct)?clause.progressPct.toFixed(2):3}%"></span>
    </div>
    <div class="offer-target-numbers">
      <span>Current live: <b>${current}</b></span>
      <span>Fixed target: <b>${target}</b></span>
    </div>
  </div>`;
}

function offerDateLabel(value){
  if(!value)return 'No expiry recorded';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
  return date.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function offerStatusRank(status){
  const value=String(status||'').toUpperCase();
  return ({OPEN:0,COUNTERED:1,'ACCEPTED FOR REVIEW':2,REJECTED:3,EXPIRED:4,WITHDRAWN:5})[value]??9;
}
function dedupeIncomingOffers(list){
  const ranked=[...(Array.isArray(list)?list:[])].sort((a,b)=>{
    const statusDiff=offerStatusRank(a.status)-offerStatusRank(b.status);
    if(statusDiff) return statusDiff;
    return new Date(b.createdAt||b.updatedAt||0)-new Date(a.createdAt||a.updatedAt||0);
  });
  const byTicker=new Map();
  for(const offer of ranked){
    const ticker=registrationShortTicker(offer?.ticker);
    if(!ticker) continue;
    // One visible negotiation per holding. Prefer an open/countered bid, then newest.
    if(!byTicker.has(ticker)) byTicker.set(ticker,offer);
  }
  return [...byTicker.values()];
}
function renderIncomingOffers(){
  const grid=$('incomingOfferGrid');if(!grid)return;
  incomingOffers=dedupeIncomingOffers(incomingOffers);
  const ordered=[...incomingOffers].sort((a,b)=>offerStatusRank(a.status)-offerStatusRank(b.status)||new Date(b.createdAt||0)-new Date(a.createdAt||0));
  const storedOpen=ordered.filter(o=>['OPEN','COUNTERED'].includes(String(o.status||'').toUpperCase()));
  const activeOffers=storedOpen.filter(o=>incomingOfferClauseData(o).met);
  const waitingOffers=storedOpen.filter(o=>!incomingOfferClauseData(o).met);

  if($('incomingOfferCount')){
    $('incomingOfferCount').innerHTML=
      `${activeOffers.length} active offer${activeOffers.length===1?'':'s'}`+
      `<span class="offer-market-count"> • ${waitingOffers.length} waiting for target</span>`;
  }
  if($('subnavIncomingCount')) $('subnavIncomingCount').textContent=activeOffers.length;
  if(!ordered.length){
    grid.innerHTML='<div class="offer-empty">No offers are on the chairman’s desk. Open a new market round to generate football-style bids from the live portfolio.</div>';
    return;
  }
  grid.innerHTML=ordered.slice(0,12).map(offer=>{
    const authenticity=String(offer.authenticity||'AURORA SCENARIO').toUpperCase();
    const verified=authenticity==='VERIFIED OFFER';
    const status=String(offer.status||'OPEN').toUpperCase();
    const storedOpen=['OPEN','COUNTERED'].includes(status);
    const premium=Number(offer.premiumPct||0)*100;
    const gain=Number(offer.estimatedGainLossGbp||0);
    const clause=incomingOfferClauseData(offer);
    const active=storedOpen&&clause.met;
    const waiting=storedOpen&&!clause.met;
    const source=verified&&offer.sourceUrl?`<a href="${escapeHtml(offer.sourceUrl)}" target="_blank" rel="noopener">Open official source</a>`:escapeHtml(offer.source||'Aurora Incoming Offers Engine');
    return `<article class="offer-card ${verified?'verified':''} ${storedOpen?'':'closed'} ${waiting?'target-locked':''}" data-offer-card="${escapeHtml(offer.offerId)}">
      <div class="offer-letterhead">
        <div class="offer-club-crest">${escapeHtml(offer.bidderBadge||'AFC')}</div>
        <div><small>${verified?'Official corporate approach':'Rival club approach'}</small><strong>${escapeHtml(offer.bidderName||'Aurora Market')}</strong></div>
        <span class="offer-authenticity ${verified?'verified':''}">${escapeHtml(authenticity)}</span>
      </div>
      <div class="offer-player-block">
        <span>has submitted an offer for</span>
        <h3>${escapeHtml(offer.ticker)} — ${escapeHtml(offer.name||'')}</h3>
        <p>${escapeHtml(offer.scenarioType||'INCOMING TRANSFER OFFER')} • ${escapeHtml(offer.account||'')}</p>
      </div>
      <div class="offer-metrics">
        <div class="offer-metric"><small>Shares requested</small><strong>${Number(offer.requestedShares||0).toLocaleString('en-GB',{maximumFractionDigits:8})}</strong></div>
        <div class="offer-metric"><small>Offer activation price</small><strong class="good">${offerPriceLabel(offer.offerPrice,offer.priceUnit,offer.currency)}</strong></div>
        <div class="offer-metric"><small>Fixed target uplift</small><strong class="${premium>=6?'good':'warn'}">${premium>=0?'+':''}${premium.toFixed(1)}%</strong></div>
        <div class="offer-metric clause-target"><small>Fixed 6% live target</small><strong class="${clause.met?'good':'warn'}">${clause.known?offerPriceLabel(clause.releasePrice,offer.priceUnit,offer.currency):'—'}</strong></div>
        <div class="offer-metric"><small>Current live price</small><strong class="${clause.met?'good':'warn'}">${Number.isFinite(clause.currentLivePrice)?offerPriceLabel(clause.currentLivePrice,offer.priceUnit,offer.currency):'—'}</strong></div>
        <div class="offer-metric"><small>Value when activated</small><strong>${money(Number(offer.offerValueGbp||0))}</strong></div>
        <div class="offer-metric"><small>Gain / loss at target</small><strong class="${gain>=0?'good':'warn'}">${gain>=0?'+':''}${money(gain)}</strong></div>
        <div class="offer-metric"><small>Income surrendered</small><strong class="warn">${money(Number(offer.annualIncomeLostGbp||0))}/yr</strong></div>
      </div>
      ${incomingOfferClauseHtml(offer,clause)}
      <div class="offer-reason">${escapeHtml(offer.reason||'No offer explanation recorded.')}</div>
      <div class="offer-verdict"><b>Director of Football verdict</b>${escapeHtml(offer.directorVerdict||'Review the fee, income impact and replacement options.')}</div>
      <div class="offer-expiry"><span>Expires: <b>${offerDateLabel(offer.expiresAt)}</b></span><span>${verified?source:`Source: ${source}`}</span></div>
      ${active?`<div class="offer-card-actions">
        <button class="offer-action accept" type="button" data-offer-response="ACCEPT" data-offer-id="${escapeHtml(offer.offerId)}">Accept in principle</button>
        <button class="offer-action counter" type="button" data-offer-counter-toggle="${escapeHtml(offer.offerId)}">Counter-offer</button>
        <button class="offer-action reject" type="button" data-offer-response="REJECT" data-offer-id="${escapeHtml(offer.offerId)}">Reject</button>
      </div>
      <form class="offer-counter-form" data-offer-counter-form="${escapeHtml(offer.offerId)}">
        <label>Counter price<input name="counterPrice" type="number" min="0" step="any" value="${Number(offer.offerPrice||0).toFixed(4)}" required></label>
        <label>Shares offered<input name="counterShares" type="number" min="0" step="any" value="${Number(offer.requestedShares||0)}" required></label>
        <button class="offer-action counter" type="submit">Submit counter</button>
      </form>`:waiting?`
        <div class="offer-action-lock">
          🔒 Offer actions unlock only when the actual live price reaches the fixed 6% target.
        </div>
      `:`<div class="offer-status-line">Offer status: ${escapeHtml(status)}${offer.linkedSellTicket?` • Sell Desk ticket ${escapeHtml(offer.linkedSellTicket)}`:''}</div>`}
    </article>`;
  }).join('');
}

async function loadIncomingOffers(autoGenerate=false){
  const grid=$('incomingOfferGrid');if(!grid)return;
  if(!registrationConnection.endpoint||!registrationConnection.token){
    incomingOffers=[];renderIncomingOffers();
    if($('incomingOfferMessage')){$('incomingOfferMessage').textContent='Connect the Registration Desk to load the offer room.';$('incomingOfferMessage').className='registration-message';}
    return;
  }
  grid.innerHTML='<div class="offer-empty">Opening the chairman’s offer room…</div>';
  try{
    const result=await postRegistration({action:'listIncomingOffers',limit:30,includeClosed:true,source:'Aurora City FC Incoming Offers'});
    if(result.queued){grid.innerHTML='<div class="offer-empty">The offer request was sent, but this browser could not read the response. Deploy the updated Apps Script and refresh.</div>';return;}
    incomingOffers=dedupeIncomingOffers(Array.isArray(result.offers)?result.offers:[]);
    renderIncomingOffers();
    renderExitFundingRoom();
    renderSmartExitDesk();
    const open=incomingOffers.filter(o=>['OPEN','COUNTERED'].includes(String(o.status||'').toUpperCase()));
    if(autoGenerate&&!open.length) await generateOfferRound(false);
  }catch(err){
    grid.innerHTML=`<div class="offer-empty">${escapeHtml(err.message||'Unable to load Incoming Offers. Deploy the updated Apps Script first.')}</div>`;
  }
}

async function generateOfferRound(force=true){
  if(incomingOfferBusy)return;
  const button=$('generateIncomingOffers');const msg=$('incomingOfferMessage');
  if(!registrationConnection.endpoint||!registrationConnection.token){$('registrationConnection')?.setAttribute('open','');if(msg){msg.textContent='Connect the Registration Desk before opening a market round.';msg.className='registration-message error';}return;}
  incomingOfferBusy=true;if(button){button.disabled=true;button.textContent='Calling clubs…';}
  if(msg){msg.textContent='Aurora is contacting rival clubs and pricing realistic transfer scenarios…';msg.className='registration-message pending';}
  try{
    const result=await postRegistration({action:'generateIncomingOffers',force,maxOffers:3,source:'Aurora City FC Incoming Offers',userAgent:navigator.userAgent});
    if(msg){msg.textContent=result.message||'Offer round completed.';msg.className=`registration-message ${result.queued?'pending':'success'}`;}
    if(!result.queued) await loadIncomingOffers(false);
  }catch(err){if(msg){msg.textContent=err.message||'The market round failed.';msg.className='registration-message error';}}
  finally{incomingOfferBusy=false;if(button){button.disabled=false;button.textContent='Open new market round';}}
}

async function respondToIncomingOffer(offerId,response,button,extra={}){
  if(incomingOfferBusy)return;
  const offer=incomingOffers.find(o=>o.offerId===offerId);if(!offer)return;
  const msg=$('incomingOfferMessage');
  if(response==='ACCEPT'&&!window.confirm(`Accept ${offer.bidderName}'s offer for ${offer.ticker} in principle?\n\nThis only creates a Sell Desk review ticket. It does not place a broker order.`))return;
  if(response==='REJECT'&&!window.confirm(`Reject the offer for ${offer.ticker}?`))return;
  incomingOfferBusy=true;if(button){button.disabled=true;button.textContent='Updating…';}
  try{
    const result=await postRegistration({action:'respondIncomingOffer',offerId,response,...extra,source:'Aurora City FC Incoming Offers',userAgent:navigator.userAgent});
    if(msg){msg.textContent=result.message||'Offer updated.';msg.className=`registration-message ${result.queued?'pending':'success'}`;}
    if(!result.queued){await loadIncomingOffers(false);if(response==='ACCEPT')await loadSellTickets();}
  }catch(err){if(msg){msg.textContent=err.message||'Offer response failed.';msg.className='registration-message error';}if(button)button.disabled=false;}
  finally{incomingOfferBusy=false;}
}


let incomingOfferLiveTimer=null;
function startIncomingOfferLiveChecks(){
  if(incomingOfferLiveTimer) clearInterval(incomingOfferLiveTimer);
  incomingOfferLiveTimer=setInterval(()=>{
    if(incomingOffers.length){
      AURORA_MASTER_CACHE=null;
      loadData();
    }
  },300000);
}
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&incomingOffers.length){
    AURORA_MASTER_CACHE=null;
    loadData();
  }
});
startIncomingOfferLiveChecks();

$('refreshIncomingOffers')?.addEventListener('click',()=>loadIncomingOffers(false));
$('generateIncomingOffers')?.addEventListener('click',()=>generateOfferRound(true));
document.addEventListener('click',event=>{
  const responseButton=event.target.closest?.('[data-offer-response]');
  if(responseButton){respondToIncomingOffer(responseButton.dataset.offerId,responseButton.dataset.offerResponse,responseButton);return;}
  const toggle=event.target.closest?.('[data-offer-counter-toggle]');
  if(toggle){document.querySelector(`[data-offer-counter-form="${CSS.escape(toggle.dataset.offerCounterToggle)}"]`)?.classList.toggle('open');}
});
document.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-offer-counter-form]');if(!form)return;
  event.preventDefault();
  const offerId=form.dataset.offerCounterForm;
  const counterPrice=parseNum(form.counterPrice.value);
  const counterShares=parseNum(form.counterShares.value);
  if(!(counterPrice>0)||!(counterShares>0)){const msg=$('incomingOfferMessage');if(msg){msg.textContent='Enter a valid counter price and share quantity.';msg.className='registration-message error';}return;}
  respondToIncomingOffer(offerId,'COUNTER',form.querySelector('button[type="submit"]'),{counterPrice,counterShares});
});




/* ===================== FIVE-UPGRADES INTERACTIONS ===================== */
['simulationMonthsInput','startingIncomeInput','simulatorModeSelect','ongoingMonthlyInput'].forEach(id=>$(id)?.addEventListener('change',()=>{persistIncomeSimulatorFromInputs();renderIncomeSimulator(buildDealSheet());renderPaydayExecution(buildDealSheet());}));
$('dividendPurchaseDate')?.addEventListener('change',event=>{const saved=dividendCalendarStore();saved.settings.purchaseDate=normaliseDateValue(event.target.value);safeJsonWrite(DIVIDEND_CALENDAR_KEY,saved);renderDividendCalendar(buildDealSheet());});
document.addEventListener('change',event=>{
  const dividendField=event.target.closest?.('[data-dividend-field]');if(dividendField){saveDividendField(dividendField);renderDividendCalendar(buildDealSheet());return;}
  const paydayCheck=event.target.closest?.('[data-payday-check]');if(paydayCheck){const saved=paydayExecutionStore();saved.checks[paydayCheck.dataset.paydayCheck]=Boolean(paydayCheck.checked);savePaydayExecution(saved);renderPaydayExecution(buildDealSheet());}
});
document.addEventListener('change',event=>{
  const trade=event.target.closest?.('[data-payday-trade-field]');if(trade){const saved=paydayExecutionStore();const ticker=shortTicker(trade.dataset.paydayTradeTicker);saved.trades[ticker]=saved.trades[ticker]||{};saved.trades[ticker][trade.dataset.paydayTradeField]=trade.value;savePaydayExecution(saved);renderPaydayExecution(buildDealSheet());return;}
});
$('paydayAvailableCash')?.addEventListener('change',event=>{const saved=paydayExecutionStore();saved.availableCash=Math.max(0,parseNum(event.target.value)||0);savePaydayExecution(saved);renderPaydayExecution(buildDealSheet());});
document.addEventListener('click',event=>{
  const exitDecision=event.target.closest?.('[data-exit-decision]');if(exitDecision){setSmartExitDecision(exitDecision.dataset.exitDecisionTicker,exitDecision.dataset.exitDecision);renderSmartExitDesk();return;}
});
$('openPaydayWindow')?.addEventListener('click',()=>{const saved=paydayExecutionStore();saved.open=!saved.open;savePaydayExecution(saved);renderPaydayExecution(buildDealSheet());});
$('completePaydayWindow')?.addEventListener('click',()=>{const deal=buildDealSheet();const saved=paydayExecutionStore();const totals=paydayTradeTotals(deal,saved);if(!deal.rows.length||totals.recorded!==deal.rows.length)return;saved.completedAt=new Date().toISOString();saved.open=true;savePaydayExecution(saved);renderPaydayExecution(deal);});
$('resetPaydayWindow')?.addEventListener('click',()=>{if(!window.confirm('Reset the current payday execution record?'))return;safeJsonWrite(PAYDAY_EXECUTION_KEY,{open:true,availableCash:0,checks:{},trades:{},completedAt:'',updatedAt:new Date().toISOString()});renderPaydayExecution(buildDealSheet());});

function forcePostTransferImpactPlacement(){
  const impact=document.getElementById('post-transfer-impact');
  const finalSheet=document.getElementById('finalDealSheet');
  if(!impact||!finalSheet||!finalSheet.parentNode) return;
  if(impact.nextElementSibling!==finalSheet){
    finalSheet.parentNode.insertBefore(impact,finalSheet);
  }
}

/* Keep the impact panel locked directly above the Final Deal Sheet, even if an older cached layout or later render tries to move it. */
forcePostTransferImpactPlacement();
document.addEventListener('DOMContentLoaded',forcePostTransferImpactPlacement,{once:true});
window.addEventListener('load',forcePostTransferImpactPlacement,{once:true});
setTimeout(forcePostTransferImpactPlacement,250);
setTimeout(forcePostTransferImpactPlacement,1500);

restoreDeploymentPlan();
restoreTransferSettings();
restoreRegistrationConnection();
loadPlatformRules();
loadData();
loadRegistrationHistory();
loadSellTickets();
loadIncomingOffers(true);
if(window.AuroraFC) AuroraFC.registerServiceWorker();


const AURORA_MASTER_URLS = [
  `./AuroraMaster.json?v=${Date.now()}`,
  `AuroraMaster.json?v=${Date.now()}`,
  `https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json?v=${Date.now()}`
];
const MONTHLY_TARGET = 625;
const TABS = ["Holdings","IncomeLog","TradeReviewLog","PriceLog","DailyPriceSummary","LivePrices","Dividends","SectorLimits","MarketRegime"];
let AURORA_MASTER_CACHE = null;
let state = {};
const charts = {};
const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(n) : "—";
const money0 = n => Number.isFinite(n) ? new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n) : "—";
const number1 = n => Number.isFinite(n) ? n.toFixed(1) : "—";
const pct = n => Number.isFinite(n) ? `${(n*100).toFixed(2)}%` : "—";
function parseNum(v){
  if(v===null||v===undefined||v==="") return NaN;
  if(typeof v==="number") return v;
  const s=String(v).replace(/[£$,]/g,"").trim();
  if(!s) return NaN;
  if(s.endsWith("%")){const n=Number(s.slice(0,-1));return Number.isFinite(n)?n/100:NaN;}
  const n=Number(s);return Number.isFinite(n)?n:NaN;
}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function cleanTicker(t){return String(t||"").trim().toUpperCase();}
function shortTicker(t){return cleanTicker(t).replace("LON:","").replace(".L","");}
function rowTicker(r){return shortTicker(r?.ticker??r?.Ticker??r?.symbol??r?.Symbol);}
function rowName(r){return r?.name??r?.Name??r?.company??r?.Company??r?.security_name??rowTicker(r)??"—";}
function rowDate(r){return r?.date??r?.Date??r?.timestamp??r?.Timestamp??r?.created_at??r?.CreatedAt??r?.checked_at;}
function toDate(v){
  if(v instanceof Date&&!isNaN(v)) return v;
  if(typeof v==="number"&&v>25000&&v<80000) return new Date(Math.round((v-25569)*86400*1000));
  if(!v) return null;
  const d=new Date(v);return isNaN(d)?null:d;
}
function dateLabel(d){return d?d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"—";}
function statusText(r){return String(r?.status??r?.Status??r?.trial_status??"").toLowerCase();}
function isActiveHolding(r){
  if(/sold|exit|exited|closed|removed|inactive/.test(statusText(r))) return false;
  const q=parseNum(r?.shares??r?.quantity??r?.units??r?.Shares);
  const v=parseNum(r?.current_value??r?.market_value??r?.value??r?.Value);
  return (Number.isFinite(q)&&q>0)||(Number.isFinite(v)&&v>0);
}
function accountText(r){return String(r?.account??r?.platform??r?.broker??r?.Account??"").trim().toUpperCase();}
function isIncomeAccount(r){const a=accountText(r);return a==="IG ISA"||a==="TRADE 212"||a==="TRADING 212"||a==="TRADING 212 ISA"||a==="TRADE212 ISA";}
function holdingValue(r){
  const v=parseNum(r?.current_value??r?.market_value??r?.holding_value??r?.value??r?.Value);if(Number.isFinite(v))return v;
  const q=parseNum(r?.shares??r?.quantity??r?.units);const p=parseNum(r?.live_price??r?.price);return Number.isFinite(q)&&Number.isFinite(p)?q*p:0;
}
function annualIncome(r){
  const direct=parseNum(r?.annual_dps_total??r?.Annual_DPS_Total??r?.annual_income??r?.income_annual??r?.dividend_income??r?.["Annual Income"]);if(Number.isFinite(direct))return direct;
  const q=parseNum(r?.shares??r?.quantity??r?.units);const dps=parseNum(r?.annual_dps??r?.dps??r?.dividend_per_share);if(Number.isFinite(q)&&Number.isFinite(dps))return q*dps;
  const y=incomeRate(r),v=holdingValue(r);return Number.isFinite(y)&&Number.isFinite(v)?y*v:0;
}
function incomeRate(r){
  const inc=parseNum(r?.annual_dps_total??r?.annual_income),v=holdingValue(r);if(Number.isFinite(inc)&&inc>0&&v>0)return inc/v;
  const raw=r?.yield_pct??r?.Yield??r?.yield??r?.dividend_yield;const y=parseNum(raw);if(Number.isFinite(y))return y>1?y/100:y;
  const dps=parseNum(r?.annual_dps??r?.dps);const price=parseNum(r?.live_price??r?.price);return Number.isFinite(dps)&&Number.isFinite(price)&&price>0?dps/price:NaN;
}
function profitLoss(r){
  const p=parseNum(r?.profit_loss??r?.Profit_Loss??r?.pl??r?.gain_loss);if(Number.isFinite(p))return p;
  const v=holdingValue(r),b=parseNum(r?.book_cost??r?.cost_basis);return Number.isFinite(v)&&Number.isFinite(b)?v-b:0;
}
function buyStrength(r){const n=parseNum(r?.buy_strength??r?.Buy_Strength??r?.score??r?.Score);return Number.isFinite(n)?n:0;}
function readTab(master,tab){
  const wanted=norm(tab);
  function pick(obj){if(!obj||typeof obj!=="object")return[];if(Array.isArray(obj[tab]))return obj[tab];const k=Object.keys(obj).find(key=>norm(key)===wanted);return k&&Array.isArray(obj[k])?obj[k]:[];}
  let rows=pick(master);if(rows.length)return rows;
  for(const key of ["data","tabs","sheets","feeds"]){rows=pick(master?.[key]);if(rows.length)return rows;}
  return [];
}
function activeHoldings(){return (state.holdings||[]).filter(isActiveHolding);}
function combinedHoldings(){
  const map=new Map();
  activeHoldings().forEach(r=>{
    const t=rowTicker(r);if(!t)return;
    if(!map.has(t))map.set(t,{ticker:t,name:rowName(r),sector:r?.sector??r?.Sector??"Unclassified",role:r?.role??r?.squad_role??r?.Squad_Role??"Squad Player",accounts:new Set(),shares:0,value:0,book:0,profit:0,income:0,buyStrength:0,rows:[]});
    const x=map.get(t);x.accounts.add(accountText(r));x.shares+=Math.max(0,parseNum(r?.shares??r?.quantity??r?.units)||0);x.value+=holdingValue(r);x.book+=Math.max(0,parseNum(r?.book_cost??r?.cost_basis)||0);x.profit+=profitLoss(r);x.income+=annualIncome(r);x.buyStrength=Math.max(x.buyStrength,buyStrength(r));x.rows.push(r);
  });
  return [...map.values()].map(x=>({...x,accounts:[...x.accounts],yield:x.value>0?x.income/x.value:0,incomeShare:0}));
}

function latestRowForTicker(rows,ticker){
  const target=shortTicker(ticker);
  const matches=(rows||[]).filter(row=>rowTicker(row)===target);
  return matches.sort((a,b)=>{
    const da=toDate(rowDate(a))?.getTime()||0;
    const db=toDate(rowDate(b))?.getTime()||0;
    return db-da;
  })[0]||null;
}
function movementPercentFromRow(row){
  if(!row) return NaN;
  const value=parseNum(
    row?.change_pct ??
    row?.change_percent ??
    row?.percentage_change ??
    row?.daily_change_pct ??
    row?.['Change %'] ??
    row?.['Daily Change %']
  );
  if(!Number.isFinite(value)) return NaN;
  return Math.abs(value)<=1 ? value*100 : value;
}
function currentMovement(ticker){
  const live=latestRowForTicker(state.livePrices,ticker);
  const liveMove=movementPercentFromRow(live);
  if(Number.isFinite(liveMove)) return liveMove;

  const summary=latestRowForTicker(state.dailyPriceSummary,ticker);
  const summaryMove=movementPercentFromRow(summary);
  if(Number.isFinite(summaryMove)) return summaryMove;

  return 0;
}

function annualTotal(){return activeHoldings().reduce((s,r)=>s+annualIncome(r),0);}
function clubValue(){return activeHoldings().reduce((s,r)=>s+holdingValue(r),0);}
function incomePortfolio(){return activeHoldings().filter(isIncomeAccount);}
function portfolioYield(){const rows=incomePortfolio(),inc=rows.reduce((s,r)=>s+annualIncome(r),0),v=rows.reduce((s,r)=>s+holdingValue(r),0);return v>0?inc/v:NaN;}
function latestTimestamp(){
  const all=[...(state.priceLog||[]),...(state.dailyPriceSummary||[]),...(state.incomeLog||[]),...(state.tradeReviewLog||[])];
  const dates=all.map(r=>toDate(rowDate(r))).filter(Boolean).sort((a,b)=>b-a);return dates[0]||null;
}
function combinedSectorData(){
  const map=new Map();incomePortfolio().forEach(r=>{const s=String(r?.sector??r?.Sector??"Unclassified").trim()||"Unclassified";map.set(s,(map.get(s)||0)+holdingValue(r));});
  return [...map.entries()].map(([sector,value])=>({sector,value})).sort((a,b)=>b.value-a.value);
}
function incomeEvents(){
  const events=[];const seen=new Set();
  function add(rows,kind){
    (rows||[]).forEach(r=>{
      const d=toDate(rowDate(r));if(!d)return;
      let amount=parseNum(r?.income_added??r?.Annual_Income_Added??r?.annual_income_added??r?.income_change??r?.Income_Added);
      if(!Number.isFinite(amount))return;
      const t=rowTicker(r)||String(r?.into??r?.source??kind??"Event");
      const key=`${d.toISOString().slice(0,10)}|${t}|${amount.toFixed(2)}`;if(seen.has(key))return;seen.add(key);events.push({date:d,amount,ticker:t});
    });
  }
  add(state.incomeLog,"IncomeLog");add(state.tradeReviewLog,"TradeReviewLog");
  return events.sort((a,b)=>a.date-b.date);
}
function incomeProgression(){
  const current=annualTotal(),events=incomeEvents();if(!events.length)return[];
  const totalChanges=events.reduce((s,e)=>s+e.amount,0);let running=current-totalChanges;
  const byDay=new Map();events.forEach(e=>{const k=e.date.toISOString().slice(0,10);byDay.set(k,(byDay.get(k)||0)+e.amount);});
  const pts=[];for(const [k,amt] of [...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){running+=amt;pts.push({date:new Date(`${k}T12:00:00`),value:running});}
  if(pts.length&&Math.abs(pts[pts.length-1].value-current)>.01)pts.push({date:new Date(),value:current});
  return pts.slice(-24);
}

const MONTHLY_INVESTMENT_PLAN=1500;
const M4_CAPITAL_RELEASE=Object.freeze({corePot:25000,coreMonthly:2500,etfPot:8000,etfMonthly:1000,months:10});
function m4ReleaseForForecastMonth(monthIndex){const month=monthIndex+1;const core=Math.max(0,Math.min(M4_CAPITAL_RELEASE.coreMonthly,M4_CAPITAL_RELEASE.corePot-(month-1)*M4_CAPITAL_RELEASE.coreMonthly));const etf=Math.max(0,Math.min(M4_CAPITAL_RELEASE.etfMonthly,M4_CAPITAL_RELEASE.etfPot-(month-1)*M4_CAPITAL_RELEASE.etfMonthly));return core+etf;}
function m4ForecastCapital(months){let total=0;for(let month=0;month<months;month++)total+=MONTHLY_INVESTMENT_PLAN+m4ReleaseForForecastMonth(month);return total;}
const TESCO_SAYE_PLAN=Object.freeze({
  shares:14363,
  optionPrice:2.20,
  totalOptionCost:31598.60,
  maturityDate:"2029-03-01",
  keepCore:15000,
  maxIsaWaves:60000,
  waveCap:20000,
  fallbackPrice:4.764
});
const FORECAST_CHECKPOINTS=[
  {months:6,label:"6 months"},
  {months:12,label:"12 months"},
  {months:24,label:"2 years"},
  {months:60,label:"5 years"}
];

function tescoSayeHolding(){
  return activeHoldings().find(row=>rowTicker(row)==="TSCO")||null;
}

function tescoSayePrice(){
  const holding=tescoSayeHolding();
  const price=parseNum(
    holding?.live_price ??
    holding?.price ??
    holding?.current_price ??
    holding?.["Live Price"]
  );
  return Number.isFinite(price)&&price>0
    ? price
    : TESCO_SAYE_PLAN.fallbackPrice;
}

function tescoSayeValue(){
  return TESCO_SAYE_PLAN.shares*tescoSayePrice();
}

function monthsUntilTescoMaturity(){
  const now=new Date();
  const maturity=new Date(`${TESCO_SAYE_PLAN.maturityDate}T00:00:00`);
  if(now>=maturity) return 0;
  return Math.max(
    0,
    Math.ceil(
      (maturity.getTime()-now.getTime())/
      (1000*60*60*24*30.4375)
    )
  );
}

function tescoSayeDeployment(){
  const totalValue=tescoSayeValue();
  const available=Math.max(0,totalValue-TESCO_SAYE_PLAN.keepCore);
  const deployable=Math.min(TESCO_SAYE_PLAN.maxIsaWaves,available);

  const waveOne=Math.min(TESCO_SAYE_PLAN.waveCap,deployable);
  const waveTwo=Math.min(
    TESCO_SAYE_PLAN.waveCap,
    Math.max(0,deployable-waveOne)
  );
  const waveThree=Math.min(
    TESCO_SAYE_PLAN.waveCap,
    Math.max(0,deployable-waveOne-waveTwo)
  );

  const maturityMonth=monthsUntilTescoMaturity();

  return {
    totalValue,
    available,
    deployable,
    waveOne,
    waveTwo,
    waveThree,
    maturityMonth,
    waves:[
      {month:maturityMonth,amount:waveOne,label:"Mar 2029"},
      {month:maturityMonth+1,amount:waveTwo,label:"Apr 2029"},
      {month:maturityMonth+13,amount:waveThree,label:"Apr 2030"}
    ].filter(wave=>wave.amount>0)
  };
}

function incomeForecastPoint(
  months,
  reinvestDividends=true,
  includeTesco=false
){
  const currentIncome=annualTotal();
  const currentYield=portfolioYield();

  if(
    !Number.isFinite(currentIncome) ||
    currentIncome<0 ||
    !Number.isFinite(currentYield) ||
    currentYield<=0
  ){
    return {
      months,
      annualIncome:NaN,
      monthlyIncome:NaN,
      addedIncome:NaN,
      contributions:m4ForecastCapital(months),
      tescoCapitalAdded:0
    };
  }

  // Rebuild an income-producing capital base from today's live income.
  // Tesco SAYE currently has no income in Holdings, so it is not already
  // included in this base and will not be double-counted.
  let capital=currentIncome/currentYield;
  const monthlyYield=currentYield/12;
  const tesco=includeTesco?tescoSayeDeployment():null;
  let tescoCapitalAdded=0;

  for(let month=0;month<months;month++){
    capital+=MONTHLY_INVESTMENT_PLAN+m4ReleaseForForecastMonth(month);

    if(tesco){
      tesco.waves.forEach(wave=>{
        if(wave.month===month){
          capital+=wave.amount;
          tescoCapitalAdded+=wave.amount;
        }
      });
    }

    if(reinvestDividends){
      capital+=capital*monthlyYield;
    }
  }

  const annualIncome=capital*currentYield;

  return {
    months,
    annualIncome,
    monthlyIncome:annualIncome/12,
    addedIncome:annualIncome-currentIncome,
    contributions:m4ForecastCapital(months),
    tescoCapitalAdded
  };
}

function incomeForecastSeries(
  reinvestDividends=true,
  includeTesco=false,
  points=[0,6,12,24,36,48,60]
){
  return points.map(months=>{
    if(months===0){
      const currentIncome=annualTotal();
      return {
        months,
        annualIncome:currentIncome,
        monthlyIncome:currentIncome/12,
        addedIncome:0,
        contributions:0,
        tescoCapitalAdded:0
      };
    }
    return incomeForecastPoint(
      months,
      reinvestDividends,
      includeTesco
    );
  });
}

function renderIncomeForecastCards(){
  const currentYield=portfolioYield();

  FORECAST_CHECKPOINTS.forEach(point=>{
    const forecast=incomeForecastPoint(point.months,true,false);
    const annual=$(`forecast${point.months}Annual`);
    const monthly=$(`forecast${point.months}Monthly`);
    const added=$(`forecast${point.months}Added`);

    if(annual){
      annual.textContent=Number.isFinite(forecast.annualIncome)
        ? money(forecast.annualIncome)
        : "—";
    }
    if(monthly){
      monthly.textContent=Number.isFinite(forecast.monthlyIncome)
        ? `${money(forecast.monthlyIncome)} per month`
        : "Forecast unavailable";
    }
    if(added){
      added.textContent=Number.isFinite(forecast.addedIncome)
        ? `+${money(forecast.addedIncome)}/yr from ${money0(forecast.contributions)} contributed`
        : "Waiting for current yield";
    }
  });

  const assumptions=$("forecastAssumptions");
  if(assumptions){
    assumptions.innerHTML=Number.isFinite(currentYield)&&currentYield>0
      ? `<b>Forecast assumptions:</b> the £33,000 M4 capital-release mission is deployed over ten months, with £1,500 regular paydays continuing at the current portfolio yield of ${(currentYield*100).toFixed(2)}%. The green forecast reinvests dividends monthly; the blue forecast shows contributions only; the purple forecast adds the Tesco SAYE deployment from March 2029. It excludes share-price growth, dividend increases or cuts, fees and tax.`
      : `<b>Forecast assumptions:</b> Waiting for a valid portfolio yield before projecting the M4 ten-month mission.`;
  }

  renderTescoForecastImpact();
  return {currentYield};
}

function renderTescoForecastImpact(){
  const tesco=tescoSayeDeployment();
  const price=tescoSayePrice();
  const baselineFiveYear=incomeForecastPoint(60,true,false);
  const tescoFiveYear=incomeForecastPoint(60,true,true);
  const boost=tescoFiveYear.annualIncome-baselineFiveYear.annualIncome;

  if($("tescoForecastValue")){
    $("tescoForecastValue").textContent=money0(tesco.totalValue);
  }
  if($("tescoForecastPrice")){
    $("tescoForecastPrice").textContent=
      `14,363 options × ${money(price)} live price`;
  }
  if($("tescoForecastDeployable")){
    $("tescoForecastDeployable").textContent=money0(tesco.deployable);
  }

  if($("tescoWaveOne")) $("tescoWaveOne").textContent=money0(tesco.waveOne);
  if($("tescoWaveTwo")) $("tescoWaveTwo").textContent=money0(tesco.waveTwo);
  if($("tescoWaveThree")) $("tescoWaveThree").textContent=money0(tesco.waveThree);

  if($("tescoFiveYearBoost")){
    $("tescoFiveYearBoost").textContent=Number.isFinite(boost)
      ? `+${money(boost)}/yr`
      : "—";
  }
  if($("tescoFiveYearBoostMonthly")){
    $("tescoFiveYearBoostMonthly").textContent=Number.isFinite(boost)
      ? `Approximately +${money(boost/12)} per month by year five`
      : "Income effect unavailable";
  }
  if($("tescoFiveYearCombined")){
    $("tescoFiveYearCombined").textContent=
      Number.isFinite(tescoFiveYear.annualIncome)
        ? `Combined projection: ${money(tescoFiveYear.annualIncome)}/yr (${money(tescoFiveYear.monthlyIncome)}/month)`
        : "Combined projection unavailable";
  }

  const note=$("tescoImpactNote");
  if(note){
    note.textContent=
      `The maturity value uses the current Tesco price of ${money(price)}. `+
      `Aurora keeps £15,000 as the Tesco core and models ${money0(tesco.deployable)} `+
      `through the planned ISA waves. The retained Tesco core dividend is excluded `+
      `until a live post-maturity Tesco DPS is available, so this remains a conservative planning estimate.`;
  }
}

function incomeForecastTimeline(){
  const tesco=tescoSayeDeployment();
  const months=[
    0,6,12,24,
    tesco.maturityMonth,
    tesco.maturityMonth+1,
    36,
    tesco.maturityMonth+13,
    48,60
  ];
  return [...new Set(months)]
    .filter(month=>month>=0&&month<=60)
    .sort((a,b)=>a-b);
}

function forecastMonthLabel(month){
  if(month===0) return "Today";
  if(month===6) return "6m";
  if(month===12) return "12m";
  if(month===24) return "2y";
  if(month===36) return "3y";
  if(month===48) return "4y";
  if(month===60) return "5y";

  const tesco=tescoSayeDeployment();
  if(month===tesco.maturityMonth) return "Mar 2029 SAYE";
  if(month===tesco.maturityMonth+1) return "Apr 2029 wave";
  if(month===tesco.maturityMonth+13) return "Apr 2030 wave";
  return `${month}m`;
}

function incomeForecastChart(){
  destroyChart("incomeProgressChart");
  const canvas=$("incomeProgressChart");
  if(!canvas)return false;

  const timeline=incomeForecastTimeline();
  const reinvested=incomeForecastSeries(true,false,timeline);
  const withTesco=incomeForecastSeries(true,true,timeline);
  const contributionsOnly=incomeForecastSeries(false,false,timeline);

  if(
    reinvested.some(point=>!Number.isFinite(point.annualIncome)) ||
    withTesco.some(point=>!Number.isFinite(point.annualIncome)) ||
    contributionsOnly.some(point=>!Number.isFinite(point.annualIncome))
  ){
    return false;
  }

  const labels=timeline.map(forecastMonthLabel);
  const currentIncome=annualTotal();

  charts.incomeProgressChart=new Chart(canvas,{
    type:"line",
    data:{
      labels,
      datasets:[
        {
          label:"£33k release + £1,500/month + reinvestment",
          data:reinvested.map(point=>point.annualIncome),
          borderColor:"#34d399",
          backgroundColor:"rgba(52,211,153,.10)",
          fill:true,
          tension:.30,
          pointRadius:4,
          pointHoverRadius:6,
          borderWidth:3
        },
        {
          label:"M4 mission + Tesco SAYE 2029",
          data:withTesco.map(point=>point.annualIncome),
          borderColor:"#c084fc",
          backgroundColor:"rgba(192,132,252,0)",
          fill:false,
          tension:.20,
          stepped:"before",
          pointRadius:4,
          pointHoverRadius:6,
          borderWidth:3
        },
        {
          label:"M4 mission without reinvestment",
          data:contributionsOnly.map(point=>point.annualIncome),
          borderColor:"#60a5fa",
          backgroundColor:"rgba(96,165,250,0)",
          fill:false,
          tension:.30,
          pointRadius:3,
          pointHoverRadius:5,
          borderWidth:2.5,
          borderDash:[7,5]
        },
        {
          label:"Current annual income",
          data:labels.map(()=>currentIncome),
          borderColor:"#fbbf24",
          backgroundColor:"rgba(251,191,36,0)",
          fill:false,
          tension:0,
          pointRadius:0,
          borderWidth:1.5,
          borderDash:[3,5]
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:context=>
              `${context.dataset.label}: ${money(context.parsed.y)}/yr (${money(context.parsed.y/12)}/month)`
          }
        }
      },
      scales:{
        x:{
          grid:{display:false},
          ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10}
        },
        y:{
          beginAtZero:false,
          ticks:{callback:value=>money0(value)}
        }
      }
    }
  });

  return true;
}

function valueProgression(){
  const combined=combinedHoldings();const shares=new Map(combined.map(x=>[x.ticker,x.shares]));
  const rows=(state.priceLog||[]).map(r=>({date:toDate(rowDate(r)),ticker:rowTicker(r),price:parseNum(r?.price??r?.close_price??r?.Price??r?.Close_Price)})).filter(x=>x.date&&x.ticker&&Number.isFinite(x.price));
  if(!rows.length)return[];
  const dates=[...new Set(rows.map(x=>x.date.toISOString().slice(0,10)))].sort();const byDate=new Map();rows.forEach(x=>{const k=x.date.toISOString().slice(0,10);if(!byDate.has(k))byDate.set(k,new Map());byDate.get(k).set(x.ticker,x.price);});
  const lastPrice=new Map();const pts=[];
  dates.forEach(k=>{for(const [t,p] of byDate.get(k))lastPrice.set(t,p);let total=0,covered=0;for(const [t,q] of shares){const p=lastPrice.get(t);if(Number.isFinite(p)){total+=p*q;covered++;}}if(covered>=Math.max(3,Math.ceil(shares.size*.5)))pts.push({date:new Date(`${k}T12:00:00`),value:total,coverage:covered});});
  return pts.slice(-30);
}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}
function chartBase(){
  Chart.defaults.color="#aebed2";Chart.defaults.borderColor="rgba(148,163,184,.12)";Chart.defaults.font.family='Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
}
function lineChart(id,labels,data,label,opts={}){
  destroyChart(id);const ctx=$(id);if(!ctx)return;
  charts[id]=new Chart(ctx,{type:"line",data:{labels,datasets:[{label,data,borderColor:opts.borderColor||"#22d3ee",backgroundColor:opts.backgroundColor||"rgba(34,211,238,.13)",fill:true,tension:.32,pointRadius:3,pointHoverRadius:5,borderWidth:2.5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${label}: ${money(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{beginAtZero:false,ticks:{callback:v=>money0(v)}}}}});
}
function barChart(id,labels,data,label){
  destroyChart(id);const ctx=$(id);if(!ctx)return;
  charts[id]=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label,data,backgroundColor:"rgba(52,211,153,.72)",borderColor:"rgba(134,239,172,.9)",borderWidth:1,borderRadius:8}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${label}: ${money(c.parsed.x)}`}}},scales:{x:{ticks:{callback:v=>money0(v)}},y:{grid:{display:false}}}}});
}
function doughnutChart(id,labels,data){
  destroyChart(id);const ctx=$(id);if(!ctx)return;
  const fills=[
    "rgba(34,211,238,.88)",
    "rgba(96,165,250,.86)",
    "rgba(168,85,247,.84)",
    "rgba(52,211,153,.84)",
    "rgba(251,191,36,.84)",
    "rgba(244,114,182,.82)",
    "rgba(248,113,113,.82)",
    "rgba(45,212,191,.82)"
  ];
  const strokes=[
    "rgba(103,232,249,.98)",
    "rgba(147,197,253,.98)",
    "rgba(196,181,253,.98)",
    "rgba(134,239,172,.98)",
    "rgba(253,224,71,.98)",
    "rgba(251,207,232,.98)",
    "rgba(254,202,202,.98)",
    "rgba(153,246,228,.98)"
  ];
  const backgroundColor=labels.map((_,i)=>fills[i%fills.length]);
  const borderColor=labels.map((_,i)=>strokes[i%strokes.length]);
  charts[id]=new Chart(ctx,{
    type:"doughnut",
    data:{
      labels,
      datasets:[{
        data,
        backgroundColor,
        borderColor,
        borderWidth:3,
        hoverOffset:8,
        spacing:2
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:"63%",
      plugins:{
        legend:{
          position:"bottom",
          labels:{
            boxWidth:11,
            padding:14,
            usePointStyle:true,
            pointStyle:"circle",
            color:"#cdd7e5"
          }
        },
        tooltip:{
          callbacks:{label:c=>`${c.label}: ${money(c.parsed)}`}
        }
      }
    }
  });
}
function targetChart(current){
  destroyChart("targetChart");const remaining=Math.max(0,MONTHLY_TARGET-current);charts.targetChart=new Chart($("targetChart"),{type:"doughnut",data:{labels:["Current monthly income","Gap remaining"],datasets:[{data:[Math.min(current,MONTHLY_TARGET),remaining],backgroundColor:["rgba(52,211,153,.82)","rgba(251,191,36,.28)"],borderColor:["rgba(134,239,172,.95)","rgba(251,191,36,.45)"],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{position:"bottom",labels:{boxWidth:11,padding:14,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.parsed)}/month`}}}}});
}
function scatterChart(rows){
  destroyChart("yieldStrengthChart");const data=rows.filter(x=>x.yield>0&&x.buyStrength>0).map(x=>({x:x.yield*100,y:x.buyStrength,ticker:x.ticker,value:x.value}));
  if(data.length<2){showEmpty("yieldStrengthChart","yieldStrengthEmpty");return;}
  charts.yieldStrengthChart=new Chart($("yieldStrengthChart"),{type:"scatter",data:{datasets:[{label:"Holdings",data,backgroundColor:"rgba(96,165,250,.72)",borderColor:"rgba(147,197,253,.95)",pointRadius:data.map(x=>Math.max(5,Math.min(13,Math.sqrt(x.value)/8))),pointHoverRadius:data.map(x=>Math.max(7,Math.min(15,Math.sqrt(x.value)/7)))}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.ticker}: ${c.raw.x.toFixed(2)}% yield • strength ${c.raw.y}`}}},scales:{x:{title:{display:true,text:"Dividend yield"},ticks:{callback:v=>`${v}%`}},y:{title:{display:true,text:"Buy strength"},min:0,max:100}}}});
}
function showEmpty(canvasId,emptyId){const c=$(canvasId),e=$(emptyId);if(c)c.style.display="none";if(e)e.style.display="grid";}
function showCanvas(canvasId,emptyId){const c=$(canvasId),e=$(emptyId);if(c)c.style.display="block";if(e)e.style.display="none";}
function renderCharts(){
  if(typeof Chart==="undefined"){
    ["incomeProgressChart","targetChart","incomeContributionChart","sectorChart","valueProgressChart","yieldStrengthChart"].forEach(id=>{const empty=id.replace("Chart","Empty");showEmpty(id,empty);});
    $("analysisStatus").textContent="Chart library unavailable";$("analysisStatus").className="badge red";return;
  }
  chartBase();const combined=combinedHoldings();const currentIncome=annualTotal(),monthly=currentIncome/12;
  const forecastState=renderIncomeForecastCards();
  const forecastReady=incomeForecastChart();
  if(forecastReady){
    showCanvas("incomeProgressChart","incomeProgressEmpty");
    const fiveYear=incomeForecastPoint(60,true,true);
    $("incomeTrendBadge").textContent=
      `5Y + Tesco: ${money(fiveYear.annualIncome)}/yr`;
    $("incomeTrendBadge").className="badge green";
  }else{
    showEmpty("incomeProgressChart","incomeProgressEmpty");
    $("incomeTrendBadge").textContent="Forecast unavailable";
    $("incomeTrendBadge").className="badge amber";
  }
  showCanvas("targetChart","targetEmpty");targetChart(monthly);
  const incomeRows=combined.filter(x=>x.income>0).sort((a,b)=>b.income-a.income).slice(0,10);if(incomeRows.length){showCanvas("incomeContributionChart","incomeContributionEmpty");barChart("incomeContributionChart",incomeRows.map(x=>x.ticker),incomeRows.map(x=>x.income),"Annual income");$("topIncomeBadge").textContent=`Top scorer: ${incomeRows[0].ticker}`;}else showEmpty("incomeContributionChart","incomeContributionEmpty");
  const sectors=combinedSectorData();if(sectors.length){showCanvas("sectorChart","sectorEmpty");doughnutChart("sectorChart",sectors.map(x=>x.sector),sectors.map(x=>x.value));const total=sectors.reduce((s,x)=>s+x.value,0),top=sectors[0];$("sectorBadge").textContent=`${top.sector}: ${total?((top.value/total)*100).toFixed(1):0}%`;$("sectorBadge").className=`badge ${(top.value/total)>.35?"amber":"blue"}`;}else showEmpty("sectorChart","sectorEmpty");
  const valPts=valueProgression();if(valPts.length>1){showCanvas("valueProgressChart","valueProgressEmpty");lineChart("valueProgressChart",valPts.map(x=>dateLabel(x.date)),valPts.map(x=>x.value),"Indicative club value",{borderColor:"#60a5fa",backgroundColor:"rgba(96,165,250,.12)"});const change=valPts.at(-1).value-valPts[0].value;$("valueTrendBadge").textContent=`${change>=0?"▲":"▼"} ${money(Math.abs(change))}`;$("valueTrendBadge").className=`badge ${change>=0?"green":"red"}`;}else showEmpty("valueProgressChart","valueProgressEmpty");
  showCanvas("yieldStrengthChart","yieldStrengthEmpty");scatterChart(combined);
}
function renderKpis(){
  const combined=combinedHoldings();
  const movements=combined.map(row=>({
    ...row,
    movement:currentMovement(row.ticker)
  }));
  const positive=movements.filter(row=>row.movement>0);
  const negative=movements.filter(row=>row.movement<0);
  const flat=movements.length-positive.length-negative.length;
  const best=[...movements].sort((a,b)=>b.movement-a.movement)[0]||null;

  const sectors=combinedSectorData();
  const sectorTotal=sectors.reduce((sum,row)=>sum+row.value,0);
  const topSector=sectors[0]||null;
  const concentration=topSector&&sectorTotal?topSector.value/sectorTotal:NaN;

  const strengthRows=combined.filter(row=>Number.isFinite(row.buyStrength)&&row.buyStrength>0);
  const averageStrength=strengthRows.length
    ? strengthRows.reduce((sum,row)=>sum+row.buyStrength,0)/strengthRows.length
    : NaN;

  $("positiveMovers").textContent=positive.length;
  $("positiveMoversNote").textContent=
    `${flat} flat • ${movements.length} players checked`;

  $("negativeMovers").textContent=negative.length;
  $("negativeMoversNote").textContent=
    negative.length?"Players requiring a form check":"No players currently falling";

  $("bestPerformer").textContent=best?best.ticker:"—";
  $("bestPerformerNote").textContent=best
    ? `${best.movement>=0?"+":""}${best.movement.toFixed(2)}% today`
    : "Waiting for movement data";

  $("sectorConcentration").textContent=Number.isFinite(concentration)
    ? `${(concentration*100).toFixed(1)}%`
    : "—";
  $("sectorConcentrationNote").textContent=topSector
    ? `${topSector.sector} is the largest sector`
    : "Sector data unavailable";

  $("averageBuyStrength").textContent=Number.isFinite(averageStrength)
    ? `${Math.round(averageStrength)}/100`
    : "—";
  $("averageBuyStrengthNote").textContent=Number.isFinite(averageStrength)
    ? averageStrength>=75?"Strong opportunity quality"
      :averageStrength>=55?"Balanced opportunity quality"
      :"Opportunity quality needs work"
    :"Buy-strength data unavailable";

  const y=portfolioYield();
  const valPts=valueProgression();
  const form=valPts.length>1?valPts.at(-1).value-valPts[0].value:NaN;

  $("boardCoverage").textContent=`${combined.length} players`;
  $("boardForm").textContent=Number.isFinite(form)
    ? `${form>=0?"▲":"▼"} ${money0(Math.abs(form))}`
    : "Building";
  $("boardShape").textContent=topSector&&sectorTotal
    ? `${(concentration*100).toFixed(0)}% ${topSector.sector}`
    : "Loading";
  $("boardYield").textContent=pct(y);
  $("boardQuality").textContent=Number.isFinite(averageStrength)
    ? `${Math.round(averageStrength)}/100`
    : "Building";

  $("heroCopy").textContent=
    `${positive.length} players are rising, ${negative.length} are falling and ${
      topSector&&Number.isFinite(concentration)
        ? `${topSector.sector} carries ${(concentration*100).toFixed(1)}% of the portfolio`
        : "sector shape is still loading"
    }.`;

  const stamp=latestTimestamp();
  if(window.AuroraFC){
    AuroraFC.setFreshness("dataFreshness",AURORA_MASTER_CACHE,{prefix:"Aurora generated"});
  }else{
    $("dataFreshness").textContent=stamp
      ? `Aurora data: ${stamp.toLocaleString("en-GB")}`
      : "Aurora generated: unavailable";
  }
}
function renderVerdict(){
  const combined=combinedHoldings().sort((a,b)=>b.income-a.income),income=annualTotal(),monthly=income/12,gap=Math.max(0,MONTHLY_TARGET-monthly),y=portfolioYield(),sectors=combinedSectorData(),sectorTotal=sectors.reduce((s,x)=>s+x.value,0),topSector=sectors[0],topIncome=combined.find(x=>x.income>0),topProfit=[...combined].sort((a,b)=>b.profit-a.profit)[0];
  const progress=monthly/MONTHLY_TARGET;let title,text,status="Analysis ready",statusClass="green";
  if(progress>=1){title="Promotion secured — protect the lead.";text="The £625 monthly income target has been reached. The next tactical job is protecting dividend quality and reducing avoidable concentration.";}
  else if(progress>=.8){title="Strong promotion push — final third reached.";text=`The squad is producing ${money(monthly)} per month and needs another ${money(gap)} to reach the £625 target. Income momentum is strong, but allocation discipline still matters.`;}
  else{title="Rebuild progressing — keep the shape disciplined.";text=`Current annual income is ${money(income)}. The route to £625 per month remains open, but the next transfers should improve income without making one sector carry the entire team.`;status="Work in progress";statusClass="amber";}
  $("verdictTitle").textContent=title;$("verdictText").textContent=text;$("verdictStatus").textContent=status;$("verdictStatus").className=`badge ${statusClass}`;
  const rows=[
    {label:"Top income scorer",detail:topIncome?`${topIncome.name} contributes the most annual income.`:"No income scorer found.",value:topIncome?`${topIncome.ticker} • ${money(topIncome.income)}`:"—"},
    {label:"Best current profit",detail:topProfit?`${topProfit.name} has the largest current gain.`:"No profit data found.",value:topProfit?`${topProfit.ticker} • ${money(topProfit.profit)}`:"—"},
    {label:"Promotion gap",detail:"Extra average monthly income needed to hit £625.",value:money(gap)},
    {label:"Income portfolio yield",detail:"IG ISA and Trade 212 income divided by their live value.",value:pct(y)}
  ];
  $("verdictList").innerHTML=rows.map(r=>`<div class="verdict-row"><span class="verdict-dot"></span><div><strong>${r.label}</strong><span>${r.detail}</span></div><div class="verdict-value">${r.value}</div></div>`).join("");
  const shapeRows=sectors.slice(0,5).map(s=>{const share=sectorTotal?s.value/sectorTotal:0;return {label:s.sector,detail:`${pct(share)} of the investing portfolio`,value:money(s.value),warn:share>.3};});
  if(topSector&&sectorTotal&&topSector.value/sectorTotal>.3)shapeRows.unshift({label:"Concentration watch",detail:`${topSector.sector} is above 30% of the investing portfolio.`,value:`${((topSector.value/sectorTotal)*100).toFixed(1)}%`,warn:true});
  $("shapeList").innerHTML=shapeRows.map(r=>`<div class="verdict-row"><span class="verdict-dot" style="background:${r.warn?"var(--amber)":"var(--cyan)"}"></span><div><strong>${r.label}</strong><span>${r.detail}</span></div><div class="verdict-value ${r.warn?"negative":""}">${r.value}</div></div>`).join("");
  $("analysisStatus").textContent=progress>=.8?"Strong form":"Rebuild analysis";$("analysisStatus").className=`badge ${progress>=.8?"green":"amber"}`;
}
function renderTable(){
  const rows=combinedHoldings().sort((a,b)=>b.value-a.value),totalIncome=rows.reduce((s,x)=>s+x.income,0);rows.forEach(x=>x.incomeShare=totalIncome>0?x.income/totalIncome:0);$("playerCountBadge").textContent=`${rows.length} players`;
  $("playerTable").innerHTML=rows.length?rows.map(x=>`<tr><td><span class="ticker">${x.ticker}</span><br><span style="color:#8295af">${x.name}</span></td><td>${x.role}<br><span style="color:#8295af">${x.sector}</span></td><td>${money(x.value)}</td><td class="${x.income>0?"positive":"neutral"}">${money(x.income)}</td><td>${pct(x.yield)}</td><td class="${x.profit>0?"positive":x.profit<0?"negative":"neutral"}">${money(x.profit)}</td><td>${x.buyStrength||"—"}</td><td><div style="display:flex;align-items:center;gap:9px"><div class="mini-bar"><i style="width:${Math.min(100,x.incomeShare*100)}%"></i></div><span>${(x.incomeShare*100).toFixed(1)}%</span></div></td></tr>`).join(""):`<tr><td colspan="8" class="loading">No active holdings found.</td></tr>`;
}
async function fetchMaster(){
  if(AURORA_MASTER_CACHE) return AURORA_MASTER_CACHE;
  let lastError=null;
  for(const url of AURORA_MASTER_URLS){
    try{
      const res=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      if(!data || typeof data!=="object") throw new Error("Invalid JSON payload");
      if(!Array.isArray(data.Holdings)) throw new Error("Holdings tab missing");
      AURORA_MASTER_CACHE=data;
      window.__AURORA_DATA_SOURCE__=url;
      return data;
    }catch(error){
      lastError=error;
      console.warn("Aurora data source failed:",url,error);
    }
  }
  throw new Error(`AuroraMaster could not be loaded${lastError?`: ${lastError.message}`:""}`);
}
async function loadData(force=false){
  const btn=$("refreshBtn");if(btn){btn.disabled=true;btn.textContent="Loading…";}if(force)AURORA_MASTER_CACHE=null;
  try{
    const master=await fetchMaster(),tabs={};
    TABS.forEach(t=>tabs[t]=readTab(master,t));
    state={
      holdings:tabs.Holdings||[],
      incomeLog:tabs.IncomeLog||[],
      tradeReviewLog:tabs.TradeReviewLog||[],
      priceLog:tabs.PriceLog||[],
      dailyPriceSummary:tabs.DailyPriceSummary||[],
      livePrices:tabs.LivePrices||[],
      dividends:tabs.Dividends||[],
      sectorLimits:tabs.SectorLimits||[],
      marketRegime:tabs.MarketRegime||[]
    };
    window.state=state;
    const modules=[
      ["KPIs",renderKpis],
      ["Charts",renderCharts],
      ["Verdict",renderVerdict],
      ["Table",renderTable]
    ];
    const moduleErrors=[];
    modules.forEach(([name,fn])=>{
      try{ fn(); }
      catch(error){ moduleErrors.push(`${name}: ${error.message||error}`); console.error(`Analysis ${name} render failed`,error); }
    });
    const status=$("analysisStatus");
    if(status){
      status.textContent=moduleErrors.length?"Loaded with warning":"Live data";
      status.className=moduleErrors.length?"badge amber":"badge green";
      status.title=moduleErrors.join("\n");
    }
    document.dispatchEvent(new CustomEvent("aurora:data-ready",{detail:state}));
  }
  catch(err){console.error(err);$("analysisStatus").textContent="Data error";$("analysisStatus").className="badge red";$("heroCopy").textContent=`Unable to load AuroraMaster.json: ${err.message||"Unknown error"}`;$("playerTable").innerHTML=`<tr><td colspan="8" class="loading error">${err.message||"Unable to load Aurora data."}</td></tr>`;}
  finally{if(btn){btn.disabled=false;btn.textContent="Refresh";}}
}
$("refreshBtn").addEventListener("click",()=>loadData(true));
loadData();
if(window.AuroraFC) AuroraFC.registerServiceWorker();

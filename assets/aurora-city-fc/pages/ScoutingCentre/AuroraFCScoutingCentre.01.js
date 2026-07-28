
const DATA_URLS=[
  `AuroraMaster.json?v=${Date.now()}`,
  `https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json?v=${Date.now()}`
];
const SHORTLIST_KEY="auroraScoutingRecruitmentMeeting";
const FALLBACK_SCOUTS=[
  {ticker:"RAT",company_name:"Rathbones Group",buy_strength:"70",league:"FTSE 250",sector:"Financial services",role:"Financial Scout",live_price:"£16.80",dividend_yield:"5.89%",annual_dps:"£0.99",fair_value:"£20.40",valuation_status:"Undervalued",payout_risk:"MEDIUM",income_from_500:"£29.46",income_from_2000:"£117.86",scout_rating:"★★★",promotion_impact_score:"60",trial_status:"Scout Candidate",trial_verdict:"Keep Scouting",manager_note:"Solid scout. Needs more evidence.",squad_balance_note:"No major chemistry issue.",last_updated:"23/07/2026"},
  {ticker:"WIX",company_name:"Wickes Group",buy_strength:"69",league:"FTSE 250",sector:"Retailers",role:"Quality Defensive Scout",live_price:"£1.92",dividend_yield:"5.67%",annual_dps:"£0.11",fair_value:"£2.12",valuation_status:"Undervalued",payout_risk:"MEDIUM",income_from_500:"£28.36",income_from_2000:"£113.42",scout_rating:"★★★",promotion_impact_score:"59",trial_status:"Development Watch",trial_verdict:"Development Watch",manager_note:"Development watch only.",squad_balance_note:"Could improve balance if promoted.",last_updated:"23/07/2026"},
  {ticker:"PSN",company_name:"Persimmon",buy_strength:"68",league:"FTSE 100",sector:"Household goods & home construction",role:"Cyclical Scout",live_price:"£10.94",dividend_yield:"5.49%",annual_dps:"£0.60",fair_value:"£12.50",valuation_status:"Undervalued",payout_risk:"MEDIUM",income_from_500:"£27.43",income_from_2000:"£109.74",scout_rating:"★★★",promotion_impact_score:"58",trial_status:"Development Watch",trial_verdict:"Development Watch",manager_note:"Development watch only.",squad_balance_note:"No major chemistry issue.",last_updated:"23/07/2026"},
  {ticker:"CNA",company_name:"Centrica",buy_strength:"67",league:"FTSE 100",sector:"Multiline utilities",role:"Commodity / Utility Scout",live_price:"£1.75",dividend_yield:"4.86%",annual_dps:"£0.09",fair_value:"£1.87",valuation_status:"Undervalued",payout_risk:"MEDIUM",income_from_500:"£24.32",income_from_2000:"£97.28",scout_rating:"★★★",promotion_impact_score:"57",trial_status:"Development Watch",trial_verdict:"Development Watch",manager_note:"Development watch only.",squad_balance_note:"No major chemistry issue.",last_updated:"23/07/2026"},
  {ticker:"OSB",company_name:"OSB Group",buy_strength:"61",league:"FTSE 250",sector:"Banks",role:"Financial Scout",live_price:"£5.60",dividend_yield:"6.31%",annual_dps:"£0.35",fair_value:"£5.63",valuation_status:"Neutral",payout_risk:"MEDIUM",income_from_500:"£31.54",income_from_2000:"£126.15",scout_rating:"★★★",promotion_impact_score:"50",trial_status:"Development Watch",trial_verdict:"Development Watch",manager_note:"Development watch only.",squad_balance_note:"No major chemistry issue.",last_updated:"23/07/2026"},
  {ticker:"BME",company_name:"B&M European Value Retail",buy_strength:"63",league:"FTSE 250",sector:"Retailers",role:"Value Retail Scout",live_price:"£2.14",dividend_yield:"4.49%",annual_dps:"£0.10",fair_value:"£2.05",valuation_status:"Neutral",payout_risk:"LOW",income_from_500:"£22.47",income_from_2000:"£89.89",scout_rating:"★★★",promotion_impact_score:"52",trial_status:"Development Watch",trial_verdict:"Development Watch",manager_note:"Development watch only.",squad_balance_note:"Could improve balance if promoted.",last_updated:"23/07/2026"}
];

let state={
  scouts:[],
  meta:{},
  source:"Fallback preview",
  shortlist:new Set(loadShortlist()),
  selected:null
};

const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
const text=value=>String(value??"").trim();
const num=value=>{
  if(typeof value==="number") return Number.isFinite(value)?value:0;
  const cleaned=String(value??"").replace(/,/g,"").replace(/[^\d.-]/g,"");
  const parsed=parseFloat(cleaned);
  return Number.isFinite(parsed)?parsed:0;
};
const pct=value=>num(value);
const money=value=>{
  const n=num(value);
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
};
const money0=value=>{
  const n=num(value);
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n);
};
const unique=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));

function loadShortlist(){
  try{
    const raw=JSON.parse(localStorage.getItem(SHORTLIST_KEY)||"[]");
    return Array.isArray(raw)?raw:[];
  }catch(error){
    return [];
  }
}
function saveShortlist(){
  localStorage.setItem(SHORTLIST_KEY,JSON.stringify([...state.shortlist]));
  $("kpiMeeting").textContent=state.shortlist.size;
}
function toast(message){
  const node=$("toast");
  node.textContent=message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>node.classList.remove("show"),1800);
}
function normaliseScout(row){
  const live=num(row.live_price);
  const fair=num(row.fair_value);
  const upside=fair>0?((fair-live)/fair)*100:0;
  const strength=num(row.buy_strength);
  const impact=num(row.promotion_impact_score);
  const yieldPct=pct(row.dividend_yield);
  const risk=text(row.payout_risk||"Unknown").toUpperCase();
  const valuation=text(row.valuation_status||"Unknown");
  let ranking=strength*.56+impact*.24+Math.min(yieldPct*2.2,16);
  if(valuation.toLowerCase().includes("undervalued")) ranking+=8;
  if(risk==="LOW") ranking+=5;
  if(risk.includes("HIGH")||risk.includes("DIVIDEND")) ranking-=10;
  return {...row,live,fair,upside,strength,impact,yieldPct,risk,valuation,ranking};
}
async function fetchAurora(){
  let lastError=null;
  for(const url of DATA_URLS){
    try{
      const response=await fetch(url,{cache:"no-store"});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const rows=Array.isArray(data.AuroraScout)?data.AuroraScout:[];
      const validRows=rows.filter(row=>{
        const ticker=text(row?.ticker).trim();
        const company=text(row?.company_name).trim();
        const strength=num(row?.buy_strength);
        return ticker && company && Number.isFinite(strength) && strength>0 && ticker!=="Returned Watchlist";
      });
      if(!validRows.length) throw new Error("AuroraScout contains no valid scout rows");
      state.scouts=validRows.map(normaliseScout);
      state.meta=data.meta||{};
      state.source=url.startsWith("http")?"GitHub AuroraMaster":"Local AuroraMaster";
      return;
    }catch(error){
      lastError=error;
    }
  }
  state.scouts=FALLBACK_SCOUTS.map(normaliseScout);
  state.meta={generated_at:new Date().toISOString()};
  state.source="Embedded preview";
  console.warn("Scouting Centre fallback used:",lastError);
}
function riskClass(value){
  const key=text(value).toLowerCase();
  if(key.includes("low")) return "low";
  if(key.includes("high")) return "high";
  if(key.includes("dividend")) return "dividend-check";
  return "medium";
}
function valuationClass(value){
  const key=text(value).toLowerCase();
  if(key.includes("under")) return "undervalued";
  if(key.includes("over")) return "overvalued";
  return "neutral";
}
function scoutGroup(row){
  const role=text(row.role||row.squad_role||"General Scout");
  if(/income|reit|property|dividend/i.test(role)) return "Income & Property";
  if(/financial|bank/i.test(role)) return "Financials";
  if(/quality|defensive|retail/i.test(role)) return "Quality & Defensive";
  if(/cyclical|commodity|utility|construction/i.test(role)) return "Cyclical & Utilities";
  return "General Recruitment";
}
function groupIcon(group){
  return ({
    "Income & Property":"£",
    "Financials":"▦",
    "Quality & Defensive":"◆",
    "Cyclical & Utilities":"↻",
    "General Recruitment":"⌕"
  })[group]||"⌕";
}
function hiddenGem(row){
  return row.strength>=65&&row.valuation.toLowerCase().includes("under")&&!row.risk.includes("HIGH")&&!row.risk.includes("DIVIDEND");
}
function topSorted(){
  return [...state.scouts].sort((a,b)=>b.ranking-a.ranking);
}
const SCOUTING_DIVISIONS=[
  {
    name:"Premier League",
    key:"premier",
    icon:"♛",
    note:"Elite reports and immediate recruitment-meeting contenders."
  },
  {
    name:"Championship",
    key:"championship",
    icon:"◆",
    note:"Strong promotion candidates with credible Aurora potential."
  },
  {
    name:"League One",
    key:"league-one",
    icon:"▲",
    note:"Development reports that still require supporting evidence."
  },
  {
    name:"League Two",
    key:"league-two",
    icon:"●",
    note:"Early-stage, lower-conviction or higher-risk candidates."
  }
];

function scoutingDivision(row){
  const ranked=topSorted();
  const position=ranked.findIndex(item=>item.ticker===row.ticker);
  if(position<0) return SCOUTING_DIVISIONS[3];
  const band=Math.max(1,Math.ceil(ranked.length/4));
  return SCOUTING_DIVISIONS[Math.min(3,Math.floor(position/band))];
}

function divisionPosition(row){
  const division=scoutingDivision(row);
  return topSorted()
    .filter(item=>scoutingDivisionKey(item)===division.key)
    .findIndex(item=>item.ticker===row.ticker)+1;
}

function scoutingDivisionKey(row){
  const ranked=topSorted();
  const position=ranked.findIndex(item=>item.ticker===row.ticker);
  if(position<0) return "league-two";
  const band=Math.max(1,Math.ceil(ranked.length/4));
  return SCOUTING_DIVISIONS[Math.min(3,Math.floor(position/band))].key;
}
function populateFilters(){
  const roles=unique(state.scouts.map(scoutGroup));
  const risks=unique(state.scouts.map(row=>text(row.risk)));
  $("leagueFilter").innerHTML=
    `<option value="">All divisions</option>`+
    SCOUTING_DIVISIONS.map(item=>`<option value="${item.key}">${esc(item.name)}</option>`).join("");
  $("roleFilter").innerHTML=
    `<option value="">All assignments</option>`+
    roles.map(value=>`<option>${esc(value)}</option>`).join("");
  $("riskFilter").innerHTML=
    `<option value="">All risk levels</option>`+
    risks.map(value=>`<option>${esc(value)}</option>`).join("");
}
function renderHeader(){
  const generated=state.meta.generated_at?new Date(state.meta.generated_at):null;
  $("sourceLabel").textContent=state.source;
  $("updatedLabel").textContent=generated&&!Number.isNaN(generated.getTime())
    ?generated.toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})
    :"Updated now";
  $("livePill").textContent=state.source==="Embedded preview"?"PREVIEW":"LIVE DATA";
  $("commandTitle").textContent=`${state.scouts.length} candidates under observation`;
}
function renderKpis(){
  const rows=state.scouts;
  const prospects=rows.filter(row=>row.strength>=65);
  const gems=rows.filter(hiddenGem);
  const lowRisk=rows.filter(row=>row.risk==="LOW");
  const bestIncome=[...rows].sort((a,b)=>b.yieldPct-a.yieldPct)[0];
  $("kpiScouted").textContent=rows.length;
  $("kpiProspects").textContent=prospects.length;
  $("kpiGems").textContent=gems.length;
  $("kpiLowRisk").textContent=lowRisk.length;
  $("kpiIncome").textContent=bestIncome?bestIncome.ticker:"—";
  $("kpiIncomeSub").textContent=bestIncome?`${bestIncome.yieldPct.toFixed(2)}% forecast yield`:"Highest forecast yield";
  $("kpiMeeting").textContent=state.shortlist.size;
}
function renderRadar(){
  const field=$("radarField");
  field.querySelectorAll(".radar-blip").forEach(node=>node.remove());
  const rows=topSorted().slice(0,12);
  $("radarCount").textContent=`Top ${rows.length} reports`;
  rows.forEach(row=>{
    const x=10+Math.max(0,Math.min(100,row.strength))*0.80;
    const y=84-Math.max(-20,Math.min(35,row.upside))*1.45;
    const button=document.createElement("button");
    button.type="button";
    button.className=`radar-blip ${row.strength<55?"low":row.strength<65?"medium":""}`;
    button.style.left=`${Math.max(7,Math.min(93,x))}%`;
    button.style.top=`${Math.max(8,Math.min(92,y))}%`;
    button.textContent=row.ticker;
    button.title=`${row.company_name} • strength ${row.strength} • upside ${row.upside.toFixed(1)}%`;
    button.addEventListener("click",()=>openDetail(row.ticker));
    field.appendChild(button);
  });
}
function renderRecommendations(){
  const rows=topSorted().slice(0,6);
  $("recommendList").innerHTML=rows.map((row,index)=>`
    <button class="recommend-card" type="button" data-open="${esc(row.ticker)}">
      <span class="rank">${index+1}</span>
      <span class="recommend-main">
        <strong>${esc(row.ticker)} • ${esc(row.company_name)}</strong>
        <span>${esc(row.valuation)} • ${row.yieldPct.toFixed(2)}% yield • ${esc(scoutGroup(row))}</span>
      </span>
      <span class="recommend-score"><strong>${Math.round(row.ranking)}</strong><span>Scout rank</span></span>
    </button>
  `).join("");
}
function renderAssignments(){
  const groups={};
  state.scouts.forEach(row=>{
    const group=scoutGroup(row);
    (groups[group]??=[]).push(row);
  });
  const entries=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
  $("assignmentCount").textContent=`${entries.length} assignments`;
  $("assignmentGrid").innerHTML=entries.map(([group,rows])=>{
    const best=[...rows].sort((a,b)=>b.ranking-a.ranking)[0];
    return `
      <article class="assignment">
        <div class="assignment-top">
          <span class="assignment-icon">${groupIcon(group)}</span>
          <small>${rows.length} report${rows.length===1?"":"s"}</small>
        </div>
        <h4>${esc(group)}</h4>
        <p>${assignmentDescription(group)}</p>
        <div class="assignment-best">
          <strong>Lead report: ${esc(best.ticker)}</strong>
          <span>${esc(best.company_name)} • score ${Math.round(best.ranking)}</span>
        </div>
      </article>
    `;
  }).join("");
}
function assignmentDescription(group){
  return ({
    "Income & Property":"Search for sustainable distributions, REIT value and dependable cash generation.",
    "Financials":"Assess banks, asset managers and financial businesses for income and balance-sheet strength.",
    "Quality & Defensive":"Identify resilient companies that can improve squad stability and sector balance.",
    "Cyclical & Utilities":"Track recovery candidates, utilities and economically sensitive opportunities.",
    "General Recruitment":"Cover candidates that need broader investigation before specialist assignment."
  })[group]||"General candidate assessment.";
}
function pipelineBucket(row){
  const value=`${row.trial_status||""} ${row.trial_verdict||""}`.toLowerCase();
  if(state.shortlist.has(row.ticker)) return "Recruitment Meeting";
  if(value.includes("do not")||value.includes("reject")) return "Rejected / Hold";
  if(value.includes("deep")) return "Deep Scout";
  if(value.includes("development")) return "Development Watch";
  if(value.includes("candidate")||value.includes("keep scouting")) return "Full Report";
  return "New Discovery";
}
function renderPipeline(){
  const stages=["New Discovery","Development Watch","Deep Scout","Full Report","Recruitment Meeting"];
  const counts=Object.fromEntries(stages.map(stage=>[stage,0]));
  state.scouts.forEach(row=>{
    const bucket=pipelineBucket(row);
    if(bucket in counts) counts[bucket]+=1;
  });
  $("pipelineGrid").innerHTML=stages.map((stage,index)=>`
    <article class="pipeline-stage">
      <small>Stage ${index+1}</small>
      <strong>${counts[stage]}</strong>
      <span>${esc(stage)}</span>
    </article>
  `).join("");
}
function filteredRows(){
  const query=$("searchInput").value.trim().toLowerCase();
  const division=$("leagueFilter").value;
  const role=$("roleFilter").value;
  const risk=$("riskFilter").value;
  const sort=$("sortFilter").value;

  let rows=state.scouts.filter(row=>{
    const haystack=[
      row.ticker,row.company_name,row.sector,row.role,row.squad_role,
      row.league,row.country,row.valuation,row.trial_status,row.trial_verdict
    ].join(" ").toLowerCase();

    return (!query||haystack.includes(query))
      &&(!division||scoutingDivisionKey(row)===division)
      &&(!role||scoutGroup(row)===role)
      &&(!risk||text(row.risk)===risk);
  });

  const sorters={
    rank:(a,b)=>b.ranking-a.ranking,
    strength:(a,b)=>b.strength-a.strength,
    yield:(a,b)=>b.yieldPct-a.yieldPct,
    upside:(a,b)=>b.upside-a.upside,
    impact:(a,b)=>b.impact-a.impact
  };

  return rows.sort(sorters[sort]||sorters.rank);
}
function renderReports(){
  const rows=filteredRows();
  const selectedDivision=$("leagueFilter").value;
  const divisions=selectedDivision
    ?SCOUTING_DIVISIONS.filter(item=>item.key===selectedDivision)
    :SCOUTING_DIVISIONS;

  $("resultCount").textContent=
    `${rows.length} report${rows.length===1?"":"s"} across ${divisions.length} division${divisions.length===1?"":"s"}`;

  const markup=divisions.map(division=>{
    const divisionRows=rows.filter(row=>scoutingDivisionKey(row)===division.key);
    return scoutingLeagueTable(division,divisionRows);
  }).join("");

  $("reportGrid").innerHTML=markup||`<div class="empty">No scout reports match those filters.</div>`;
}

function scoutingLeagueTable(division,rows){
  const body=rows.length
    ?rows.map(row=>scoutingLeagueRow(row,division)).join("")
    :`<tr><td colspan="11"><div class="league-empty">No matching reports in ${esc(division.name)}.</div></td></tr>`;

  return `
    <article class="scout-league ${division.key}">
      <header class="league-head">
        <div class="league-title">
          <span class="league-crest">${division.icon}</span>
          <div>
            <h4>${esc(division.name)}</h4>
            <p>${esc(division.note)}</p>
          </div>
        </div>
        <span class="league-count">${rows.length} club${rows.length===1?"":"s"}</span>
      </header>
      <div class="league-table-wrap">
        <table class="league-table">
          <thead>
            <tr>
              <th class="col-pos">Pos</th>
              <th class="col-club">Club</th>
              <th class="col-desk">Scout desk</th>
              <th class="col-form">Form</th>
              <th class="col-score">Scout</th>
              <th class="col-conf">Confidence</th>
              <th class="col-yield">Yield</th>
              <th class="col-value">Valuation</th>
              <th class="col-risk">Risk</th>
              <th class="col-verdict">Verdict</th>
              <th class="col-action">Report</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </article>
  `;
}

function scoutingLeagueRow(row,division){
  const shortlisted=state.shortlist.has(row.ticker);
  const verdict=text(row.trial_verdict||row.manager_note||"Continue monitoring");
  const confidence=confidenceFor(row);
  const shortName=shortCompanyName(row.company_name)||row.company_name;

  return `
    <tr>
      <td class="col-pos"><span class="position-number">${divisionPosition(row)}</span></td>
      <td class="col-club">
        <div class="club-cell">
          <img class="club-photo" src="${portraitDataUri(row,divisionPosition(row))}" alt="${esc(row.company_name)} player portrait" />
          <span class="club-copy">
            <strong>${esc(row.ticker)}</strong>
            <span>${esc(shortName)} • ${esc(row.sector||row.league||"Scout report")}</span>
          </span>
        </div>
      </td>
      <td class="col-desk"><span class="desk-pill">${esc(scoutGroup(row))}</span></td>
      <td class="col-form">
        ${formStripMarkup(formFor(row.ticker))}
        <span class="form-caption">Last 5</span>
      </td>
      <td class="col-score"><div class="score-stack"><strong>${Math.round(row.ranking)}</strong><span>Rating</span></div></td>
      <td class="col-conf"><div class="confidence-cell"><div class="confidence-row"><strong>${confidence}%</strong><span>${esc(row.role||row.squad_role||"Scout")}</span></div><span class="mini-score-track"><i class="mini-score-fill" style="width:${confidence}%"></i></span></div></td>
      <td class="col-yield"><strong>${row.yieldPct.toFixed(2)}%</strong></td>
      <td class="col-value"><span class="value-chip ${valuationClass(row.valuation)}">${esc(row.valuation)}</span></td>
      <td class="col-risk"><span class="risk-chip ${riskClass(row.risk)}">${esc(row.risk)}</span></td>
      <td class="col-verdict"><div class="verdict-stack"><strong>${esc(verdict)}</strong><span>${Math.round(row.impact)} impact • ${money(row.live)} live</span></div></td>
      <td class="col-action"><div class="table-actions"><button class="table-btn" type="button" data-open="${esc(row.ticker)}">Open</button><button class="table-btn shortlist ${shortlisted?"active":""}" type="button" data-shortlist="${esc(row.ticker)}">${shortlisted?"In XI":"Shortlist"}</button></div></td>
    </tr>
  `;
}
function renderMeeting(){
  const rows=[...state.shortlist].map(ticker=>state.scouts.find(row=>row.ticker===ticker)).filter(Boolean);
  $("meetingGrid").innerHTML=rows.length?rows.map(row=>`
    <article class="meeting-card">
      <div class="meeting-card-head">
        <div><h4>${esc(row.ticker)}</h4><p>${esc(row.company_name)}</p></div>
        <span class="status-chip">${Math.round(row.ranking)}</span>
      </div>
      <div class="meeting-verdict">${esc(row.manager_note||row.trial_verdict||"Continue investigation.")}</div>
      <button class="btn" type="button" data-remove="${esc(row.ticker)}">Remove from meeting</button>
    </article>
  `).join(""):`<div class="empty">No candidates shortlisted yet. Add the strongest reports to prepare your recruitment meeting.</div>`;
}
function toggleShortlist(ticker){
  if(state.shortlist.has(ticker)){
    state.shortlist.delete(ticker);
    toast(`${ticker} removed from recruitment meeting`);
  }else{
    state.shortlist.add(ticker);
    toast(`${ticker} added to recruitment meeting`);
  }
  saveShortlist();
  renderReports();
  renderMeeting();
  renderPipeline();
  if(state.selected===ticker) openDetail(ticker,true);
}
function openDetail(ticker,refreshOnly=false){
  const row=state.scouts.find(item=>item.ticker===ticker);
  if(!row) return;
  state.selected=ticker;
  const shortlisted=state.shortlist.has(ticker);
  $("detailContent").innerHTML=`
    <div class="detail-hero" data-ticker="${esc(row.ticker)}">
      <button class="detail-close" id="detailCloseBtn" type="button" aria-label="Close report">×</button>
      <small>${esc(row.league||"Aurora Scout")} • ${esc(row.country||"UK")}</small>
      <h3>${esc(row.ticker)} — ${esc(row.company_name)}</h3>
      <p>${esc(row.sector||"Sector unavailable")} • ${esc(scoutGroup(row))}</p>
      <span class="detail-score">Chief scout score ${Math.round(row.ranking)}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-stat"><small>Live price</small><strong>${money(row.live)}</strong></div>
      <div class="detail-stat"><small>Fair value</small><strong>${money(row.fair)}</strong></div>
      <div class="detail-stat"><small>Valuation upside</small><strong>${row.upside>=0?"+":""}${row.upside.toFixed(1)}%</strong></div>
      <div class="detail-stat"><small>Dividend yield</small><strong>${row.yieldPct.toFixed(2)}%</strong></div>
      <div class="detail-stat"><small>Income from £500</small><strong>${money(row.income_from_500)}</strong></div>
      <div class="detail-stat"><small>Income from £2,000</small><strong>${money(row.income_from_2000)}</strong></div>
      <div class="detail-stat"><small>Buy strength</small><strong>${Math.round(row.strength)}/100</strong></div>
      <div class="detail-stat"><small>Promotion impact</small><strong>${Math.round(row.impact)}/100</strong></div>
    </div>
    <div class="detail-section">
      <h4>Scout verdict</h4>
      <p>${esc(row.trial_verdict||"Continue monitoring")}</p>
    </div>
    <div class="detail-section">
      <h4>Manager note</h4>
      <p>${esc(row.manager_note||row.notes||"No manager note supplied.")}</p>
    </div>
    <div class="detail-section">
      <h4>Squad-balance assessment</h4>
      <p>${esc(row.squad_balance_note||"No squad-balance note supplied.")}</p>
    </div>
    <div class="detail-section">
      <h4>Risk and chemistry</h4>
      <p>${esc(row.payout_risk||"Unknown")} payout risk • ${esc(row.chemistry_risk||"Normal")} chemistry status • ${esc(row.chemistry_role||row.role||"General scout role")}</p>
    </div>
    <div class="detail-actions">
      <button class="btn flex ${shortlisted?"active":"primary"}" id="detailShortlistBtn" type="button">${shortlisted?"Remove from meeting":"Add to recruitment meeting"}</button>
      <a class="btn flex" href="AuroraCityFC_TransferCentre.html">Open Transfer Centre</a>
    </div>
  `;
  $("detailCloseBtn").addEventListener("click",closeDetail);
  $("detailShortlistBtn").addEventListener("click",()=>toggleShortlist(ticker));
  if(!refreshOnly) document.body.classList.add("detail-open");
}
function closeDetail(){
  document.body.classList.remove("detail-open");
  state.selected=null;
}
function bindEvents(){
  ["searchInput","leagueFilter","roleFilter","riskFilter","sortFilter"].forEach(id=>{
    $(id).addEventListener(id==="searchInput"?"input":"change",renderReports);
  });
  document.addEventListener("click",event=>{
    const open=event.target.closest("[data-open]");
    if(open) openDetail(open.dataset.open);
    const shortlist=event.target.closest("[data-shortlist]");
    if(shortlist) toggleShortlist(shortlist.dataset.shortlist);
    const remove=event.target.closest("[data-remove]");
    if(remove) toggleShortlist(remove.dataset.remove);
  });
  $("clearMeetingBtn").addEventListener("click",()=>{
    state.shortlist.clear();
    saveShortlist();
    renderReports();
    renderMeeting();
    renderPipeline();
    toast("Recruitment meeting cleared");
  });
  $("detailOverlay").addEventListener("click",closeDetail);
  $("refreshBtn").addEventListener("click",init);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
      document.body.classList.remove("drawer-open");
      closeDetail();
    }
  });
}

function formFor(ticker){
  let h=0; for(const c of String(ticker)) h=(h*31+c.charCodeAt(0))>>>0;
  const a=[]; for(let i=0;i<5;i++){const n=(h>>(i*3))%10;a.push(n<5?'W':n<8?'D':'L')} return a;
}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function confidenceFor(row){
  let score=48 + row.strength*.34 + row.impact*.18 + Math.min(row.yieldPct*1.8,12);
  if(String(row.valuation||'').toLowerCase().includes('under')) score+=7;
  if(String(row.risk||'').toLowerCase().includes('low')) score+=6;
  if(String(row.risk||'').toLowerCase().includes('high') || String(row.risk||'').toLowerCase().includes('dividend')) score-=8;
  return Math.round(clamp(score,42,98));
}
function hashTicker(value){
  let h=0;
  for(const c of String(value||'')) h=(h*33 + c.charCodeAt(0))>>>0;
  return h;
}
function portraitDataUri(row,seedOffset=0){
  const seed=(hashTicker(row.ticker)+seedOffset*131)>>>0;
  const skins=['#f3d1b0','#e5bc8f','#d9a073','#b97e58','#8e5c42'];
  const hairs=['#1f2937','#5b4636','#8b5e3c','#d4a373','#4b5563','#111827'];
  const jerseys=[['#1d4ed8','#38bdf8'],['#059669','#34d399'],['#7c3aed','#a78bfa'],['#dc2626','#fb7185'],['#f59e0b','#fcd34d']];
  const skin=skins[seed % skins.length];
  const hair=hairs[(seed>>3) % hairs.length];
  const jersey=jerseys[(seed>>5) % jerseys.length];
  const bg1=['#e0f2fe','#dbeafe','#ecfeff','#eff6ff','#e0e7ff'][(seed>>7)%5];
  const bg2=['#93c5fd','#60a5fa','#67e8f9','#a78bfa','#34d399'][(seed>>9)%5];
  const mouth=(seed>>11)%3;
  const eyebrowTilt=((seed>>13)%7)-3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${jersey[0]}"/><stop offset="100%" stop-color="${jersey[1]}"/></linearGradient>
  </defs>
  <rect width="120" height="140" rx="18" fill="url(#bg)"/>
  <rect x="12" y="12" width="96" height="116" rx="16" fill="rgba(255,255,255,.12)"/>
  <ellipse cx="60" cy="132" rx="34" ry="10" fill="rgba(15,23,42,.20)"/>
  <path d="M28 120c4-22 20-34 32-34s28 12 32 34v8H28z" fill="url(#shirt)"/>
  <path d="M47 89h26l-4 12H51z" fill="#f8fafc" opacity=".9"/>
  <circle cx="60" cy="58" r="26" fill="${skin}"/>
  <path d="M34 56c0-18 10-31 26-31 15 0 28 10 28 28-5-5-11-10-21-10-13 0-20 7-33 13z" fill="${hair}"/>
  <path d="M44 56l10-2" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" transform="rotate(${eyebrowTilt} 44 56)"/>
  <path d="M66 54l10 2" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" transform="rotate(${-eyebrowTilt} 76 56)"/>
  <ellipse cx="50" cy="61" rx="3" ry="4" fill="#0f172a"/>
  <ellipse cx="70" cy="61" rx="3" ry="4" fill="#0f172a"/>
  <path d="M60 64v10" stroke="#9a6b52" stroke-width="2" stroke-linecap="round"/>
  ${mouth===0?'<path d="M51 77c3 4 15 4 18 0" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>': mouth===1?'<path d="M52 79c3-2 13-2 16 0" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>':'<path d="M52 77h16" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>'}
  <circle cx="94" cy="24" r="12" fill="rgba(15,23,42,.82)"/>
  <text x="94" y="28" font-family="Arial, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="#f8fafc">${String(row.ticker||'').slice(0,3)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function formStripMarkup(values){
  return `<span class="form-strip">${values.map(value=>`<i class="form-pill ${value.toLowerCase()}">${value}</i>`).join('')}</span>`;
}
function xiPositions(){
  return [
    {left:50,top:88,role:'GK'},
    {left:17,top:68,role:'LB'},
    {left:39,top:69,role:'CB'},
    {left:61,top:69,role:'CB'},
    {left:83,top:68,role:'RB'},
    {left:24,top:46,role:'CM'},
    {left:50,top:47,role:'CM'},
    {left:76,top:46,role:'CM'},
    {left:22,top:21,role:'LW'},
    {left:50,top:18,role:'ST'},
    {left:78,top:21,role:'RW'}
  ];
}
function shortCompanyName(name){
  return String(name||'').replace(/(plc|corp|corporation|group|limited|ltd|company|holdings?)/ig,'').replace(/\s+/g,' ').trim();
}
function renderFlagship(){
  const ranked=[...state.scouts].sort((a,b)=>b.ranking-a.ranking);
  const top=ranked[0];
  if(top){
    $('directorTicker').textContent=top.ticker;
    $('directorName').textContent=`${top.company_name} is today's leading target`;
    $('directorReason').textContent=top.manager_note||`${top.valuation} valuation, ${top.yieldPct.toFixed(2)}% yield and ${Math.round(top.impact)} promotion impact.`;
    $('directorScore').textContent=confidenceFor(top)+'%';
    $('directorMetrics').innerHTML=`<span class="metric-pill">Yield ${top.yieldPct.toFixed(2)}%</span><span class="metric-pill">${esc(top.valuation)}</span><span class="metric-pill">Impact ${Math.round(top.impact)}</span><span class="metric-pill">Risk ${esc(top.risk)}</span>`;
    $('directorOpen').onclick=()=>openDetail(top.ticker);
  }
  const rumours=ranked.slice(0,5).map((r,i)=>`${i===0?'Director recommends':'Scout update'}: ${r.ticker} — ${r.trial_verdict||r.valuation}`).join('   •   ');
  $('rumourText').textContent=rumours||'Aurora scouting network connected.';
  const positions=xiPositions();
  $('bestXiPitch').innerHTML='<i class="pitch-circle"></i>'+ranked.slice(0,11).map((r,i)=>{
    const spot=positions[i]||{left:50,top:50,role:'SC'};
    const name=shortCompanyName(r.company_name)||r.company_name;
    return `<button class="xi-player" data-open="${esc(r.ticker)}" style="left:${spot.left}%;top:${spot.top}%;background:none;border:0;color:inherit;cursor:pointer" aria-label="Open scout report for ${esc(r.company_name)}"><span class="xi-photo-wrap"><img class="xi-photo" src="${portraitDataUri(r,i)}" alt="${esc(r.company_name)} player portrait" /><span class="xi-role">${spot.role}</span></span><span class="xi-label">${esc(r.ticker)}</span><span class="xi-name">${esc(name)}</span><span class="xi-score"><b>${Math.round(r.ranking)}</b> scout</span></button>`;
  }).join('');
  const bench=ranked.slice(11,16);
  $('bestXiBench').innerHTML=bench.length?bench.map((r,i)=>`<button class="bench-card" type="button" data-open="${esc(r.ticker)}" aria-label="Open bench report for ${esc(r.company_name)}"><img src="${portraitDataUri(r,50+i)}" alt="${esc(r.company_name)} bench portrait" /><span><strong>${esc(r.ticker)}</strong><span>${Math.round(r.ranking)} scout rating • ${confidenceFor(r)}% confidence</span></span></button>`).join(''):'<div class="bench-empty">No bench players available yet.</div>';
  const former=state.scouts.filter(r=>/RE-SCOUT|FORMER PLAYER/i.test(`${r.scout_status||''} ${r.league||''} ${r.role||''}`));
  $('formerCount').textContent=`${former.length} player${former.length===1?'':'s'}`;
  $('formerList').innerHTML=former.length?former.map((r,idx)=>`<article class="former-row"><img class="club-photo" src="${portraitDataUri(r,200+idx)}" alt="${esc(r.company_name)} former player portrait" /><div><h4>${esc(r.company_name)}</h4><p>${esc(r.notes||r.manager_note||'Former holding under review.')}</p><div class="form-dots">${formFor(r.ticker).map(x=>`<i class="form-dot ${x.toLowerCase()}">${x}</i>`).join('')}</div></div><div class="former-verdict"><strong>${esc(r.trial_verdict||'Re-scout')}</strong><span>${esc(r.valuation||'Review')}</span></div></article>`).join(''):'<div class="empty">No former players are currently waiting for re-scouting.</div>';
}

function renderAll(){
  renderHeader();
  renderKpis();
  populateFilters();
  renderRadar();
  renderRecommendations();
  renderAssignments();
  renderPipeline();
  renderReports();
  renderMeeting();
  renderFlagship();
}
async function init(){
  const refreshButton=$("refreshBtn");
  if(refreshButton){refreshButton.disabled=true;refreshButton.textContent="Loading…";}
  try{
    await fetchAurora();
    const renderers=[
      ["Header",renderHeader],
      ["KPIs",renderKpis],
      ["Filters",populateFilters],
      ["Radar",renderRadar],
      ["Recommendations",renderRecommendations],
      ["Assignments",renderAssignments],
      ["Pipeline",renderPipeline],
      ["Reports",renderReports],
      ["Meeting",renderMeeting],
      ["Flagship",renderFlagship]
    ];
    const failures=[];
    renderers.forEach(([name,fn])=>{
      try{fn();}catch(error){failures.push(`${name}: ${error.message||error}`);console.error(`Scouting ${name} render failed`,error);}
    });
    const commandFooter=document.querySelector(".command-footer");
    if(commandFooter && failures.length){
      commandFooter.innerHTML=`<span>Data loaded with ${failures.length} display warning${failures.length===1?"":"s"}</span><span title="${failures.join(" | ").replace(/"/g,"&quot;")}">Tap Refresh Data</span>`;
    }
  }catch(error){
    console.error("Scouting Centre initialisation failed",error);
    const status=document.querySelector(".command-footer");
    if(status) status.innerHTML=`<span style="color:#fda4af">Data error</span><span>${String(error.message||error)}</span>`;
    const recommendation=document.querySelector(".director-copy h3");
    if(recommendation) recommendation.textContent="Unable to load scout reports";
  }finally{
    if(refreshButton){refreshButton.disabled=false;refreshButton.textContent="Refresh Data";}
  }
}
try{bindEvents();}catch(error){console.error("Scouting controls failed to bind",error);}
init();

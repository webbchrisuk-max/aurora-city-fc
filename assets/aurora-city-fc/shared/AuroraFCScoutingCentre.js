
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



(() => {
  "use strict";
  const menu = document.querySelector('.aurora-page-folder');
  if (!menu) return;
  const links = [...menu.querySelectorAll('.fm-page-submenu a[href^="#"]')];
  const pairs = links.map(link => ({link, target:document.getElementById(link.getAttribute('href').slice(1))})).filter(x => x.target);
  if (!pairs.length) return;

  const mark = id => {
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  };

  const scrollToHash = hash => {
    const target = document.getElementById(String(hash || '').replace(/^#/,''));
    if (!target) return false;
    menu.open = true;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    mark(target.id);
    return true;
  };

  links.forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || !scrollToHash(hash)) return;
    event.preventDefault();
    try { history.replaceState(null,'',hash); } catch (_) {}
  }));

  let ticking = false;
  const syncActive = () => {
    ticking = false;
    const guide = Math.max(110, window.innerHeight * .28);
    let current = pairs[0];
    for (const pair of pairs) {
      if (pair.target.getBoundingClientRect().top <= guide) current = pair;
      else break;
    }
    mark(current.target.id);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncActive);
  }, {passive:true});
  window.addEventListener('resize', syncActive, {passive:true});
  window.addEventListener('hashchange', () => {
    if (location.hash) scrollToHash(location.hash);
    else syncActive();
  });

  if (location.hash && document.getElementById(location.hash.slice(1))) {
    window.setTimeout(() => scrollToHash(location.hash), 80);
  } else {
    syncActive();
  }
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


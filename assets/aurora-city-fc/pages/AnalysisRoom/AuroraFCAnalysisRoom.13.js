
(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const fmtMove = value => `${value>=0?"+":""}${Number(value||0).toFixed(2)}%`;
  const ui = {
    tacticalFocus:"value",
    formRange:10,
    quadrant:"all",
    dividendMode:"annual",
    sectorMode:"value",
    sector:"all",
    status:"all",
    sort:"value",
    search:"",
    rows:[],
    visibleRows:[],
    drawerIndex:0,
    renderQueued:false
  };

  const positions = [
    {left:50,top:89},{left:18,top:72},{left:39,top:70},{left:61,top:70},{left:82,top:72},
    {left:24,top:49},{left:50,top:52},{left:76,top:49},
    {left:23,top:27},{left:50,top:22},{left:77,top:27}
  ];

  function totalValue(rows){ return rows.reduce((sum,row)=>sum+row.value,0); }
  function totalIncome(rows){ return rows.reduce((sum,row)=>sum+row.income,0); }
  function statusFor(row){
    if(row.movement>.22) return "rising";
    if(row.movement<-.22) return "review";
    return "stable";
  }
  function riskFor(row,portfolioValue){
    const concentration = portfolioValue>0 ? row.value/portfolioValue : 0;
    const movementRisk = Math.max(0,-row.movement)*6;
    const qualityRisk = row.buyStrength>0 ? Math.max(0,60-row.buyStrength)*.55 : 12;
    const incomeRisk = row.yield>0.13 ? (row.yield-.13)*140 : 0;
    return clamp(concentration*95 + movementRisk + qualityRisk + incomeRisk,0,100);
  }
  function ratingFor(row){
    const quality = row.buyStrength>0 ? row.buyStrength : 55;
    const incomeQuality = clamp(row.yield*550,0,100);
    const profitQuality = clamp(50 + (row.value>0 ? row.profit/row.value*160 : 0),0,100);
    const formQuality = clamp(50 + row.movement*11,0,100);
    return Math.round(quality*.38 + incomeQuality*.25 + profitQuality*.17 + formQuality*.20);
  }
  function getRows(){
    if(typeof combinedHoldings!=="function") return [];
    const base = combinedHoldings();
    const pValue = base.reduce((sum,row)=>sum+row.value,0);
    const pIncome = base.reduce((sum,row)=>sum+row.income,0);
    return base.map(row=>{
      const movement = typeof currentMovement==="function" ? currentMovement(row.ticker) : 0;
      const enriched = {
        ...row,
        movement:Number.isFinite(movement)?movement:0,
        monthly:row.income/12,
        valueShare:pValue>0?row.value/pValue:0,
        incomeShare:pIncome>0?row.income/pIncome:0
      };
      enriched.status=statusFor(enriched);
      enriched.risk=riskFor(enriched,pValue);
      enriched.rating=ratingFor(enriched);
      return enriched;
    });
  }
  function aggregateSectors(rows){
    const map=new Map();
    rows.forEach(row=>{
      const name=String(row.sector||"Unclassified").trim()||"Unclassified";
      if(!map.has(name)) map.set(name,{sector:name,value:0,income:0,players:[]});
      const item=map.get(name); item.value+=row.value; item.income+=row.income; item.players.push(row);
    });
    return [...map.values()].sort((a,b)=>b.value-a.value);
  }
  function recentForm(range=10){
    if(typeof valueProgression!=="function") return [];
    const points=valueProgression().slice(-Math.max(2,range));
    return points.map((point,index)=>{
      if(index===0) return {...point,change:0,result:"D"};
      const previous=points[index-1].value;
      const change=point.value-previous;
      const threshold=Math.max(1,Math.abs(previous)*.00025);
      return {...point,change,result:change>threshold?"W":change<-threshold?"L":"D"};
    });
  }

  function renderMatchCentre(rows){
    const positive=rows.filter(row=>row.movement>0), negative=rows.filter(row=>row.movement<0);
    const monthly=totalIncome(rows)/12;
    const sectors=aggregateSectors(rows);
    const portfolio=totalValue(rows);
    const concentration=sectors[0]&&portfolio?sectors[0].value/portfolio:0;
    const strengthRows=rows.filter(row=>row.buyStrength>0);
    const averageStrength=strengthRows.length?strengthRows.reduce((s,r)=>s+r.buyStrength,0)/strengthRows.length:55;
    const avgMove=rows.length?rows.reduce((s,r)=>s+r.movement,0)/rows.length:0;
    const attack=clamp(monthly/625*100,0,100);
    const defence=clamp(100-concentration*145,0,100);
    const quality=clamp(averageStrength,0,100);
    const form=clamp(50+avgMove*13,0,100);
    const overall=Math.round(attack*.32+defence*.23+quality*.27+form*.18);

    byId("matchOverallScore").textContent=`${overall}/100`;
    byId("matchOverallVerdict").textContent=
      overall>=80?"Promotion-level performance with strong income control."
      :overall>=65?"The rebuild is in good shape, with one or two tactical weaknesses."
      :overall>=50?"Competitive, but concentration or recruitment quality needs attention."
      :"The squad needs decisive rebalancing before the next transfer window.";

    const lowest=[["income attack",attack],["portfolio defence",defence],["recruitment quality",quality],["club form",form]].sort((a,b)=>a[1]-b[1])[0];
    byId("matchManagerCall").textContent=
      lowest[1]>=72?"Protect the current shape and keep executing the agreed plan."
      :`Prioritise ${lowest[0]} — it is currently the weakest department at ${Math.round(lowest[1])}/100.`;

    const formRows=recentForm(6).slice(1);
    byId("matchFormRibbon").innerHTML=formRows.length
      ? formRows.map(item=>`<span class="analysis-form-result ${item.result==="W"?"win":item.result==="L"?"loss":"draw"}" title="${dateLabel(item.date)} • ${money(item.change)}">${item.result}</span>`).join("")
      : `<span class="analysis-form-result draw">D</span><span style="color:#71839c;font-size:10px">Price-log form is still building.</span>`;

    byId("analysisCommandState").textContent=
      `${rows.length} players analysed • ${positive.length} rising • ${negative.length} under pressure • ${money(monthly)}/month`;
  }

  function focusValue(row,focus){
    if(focus==="income") return row.income;
    if(focus==="form") return row.movement;
    if(focus==="risk") return row.risk;
    return row.value;
  }
  function focusLabel(row,focus){
    if(focus==="income") return `${money(row.monthly)}/m`;
    if(focus==="form") return fmtMove(row.movement);
    if(focus==="risk") return `${Math.round(row.risk)}/100 risk`;
    return money0(row.value);
  }
  function renderTacticalPitch(rows){
    const sorted=[...rows].sort((a,b)=>focusValue(b,ui.tacticalFocus)-focusValue(a,ui.tacticalFocus)).slice(0,11);
    const pitch=byId("analysisTacticalPitch");
    pitch.querySelectorAll(".analysis-player-node,.analysis-pitch-loading").forEach(node=>node.remove());
    sorted.forEach((row,index)=>{
      const pos=positions[index]||positions.at(-1);
      const button=document.createElement("button");
      button.type="button";
      button.className=`analysis-player-node ${row.status==="review"?"review":row.status==="rising"?"strong":""}`;
      button.style.left=`${pos.left}%`; button.style.top=`${pos.top}%`;
      button.dataset.playerTicker=row.ticker;
      button.innerHTML=`<b>${escapeHtml(row.ticker)}</b><span>${escapeHtml(focusLabel(row,ui.tacticalFocus))}</span>`;
      button.title=`${row.name} • ${row.sector}`;
      pitch.appendChild(button);
    });
    const leader=sorted[0];
    byId("tacticalShapeSummary").textContent=leader
      ? `${leader.ticker} leads the ${ui.tacticalFocus} view. Tap any shirt for the full profile.`
      :"No active squad data available.";
  }

  function renderClubForm(){
    const range=ui.formRange;
    const points=recentForm(range);
    const usable=points.slice(1);
    const wins=usable.filter(x=>x.result==="W").length, losses=usable.filter(x=>x.result==="L").length, draws=usable.length-wins-losses;
    const change=points.length>1?points.at(-1).value-points[0].value:0;
    const lastResults=usable.slice(-5).map(x=>x.result).join(" · ")||"Building";
    byId("clubFormRecord").textContent=`${wins}W ${draws}D ${losses}L`;
    byId("clubFormChange").textContent=`${change>=0?"+":""}${money(change)}`;
    byId("clubFormChange").className=change>=0?"positive":"negative";
    byId("clubFormRun").textContent=lastResults;

    if(points.length<2){
      byId("clubFormSparkline").innerHTML=`<div class="analysis-loading">Price history is still building.</div>`;
      byId("clubFormSessions").innerHTML="";
      return;
    }
    const width=620,height=130,pad=12;
    const values=points.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min);
    const coords=points.map((point,index)=>{
      const x=pad+(width-pad*2)*(index/(points.length-1));
      const y=height-pad-(height-pad*2)*((point.value-min)/span);
      return {x,y,point};
    });
    const line=coords.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area=`${pad},${height-pad} ${line} ${width-pad},${height-pad}`;
    byId("clubFormSparkline").innerHTML=
      `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Club value trend">
        <polygon class="spark-area" points="${area}"></polygon>
        <polyline class="spark-line" points="${line}"></polyline>
        ${coords.map((p,index)=>`<circle class="spark-dot" cx="${p.x}" cy="${p.y}" r="${index===coords.length-1?5:3}" data-form-point="${index}"><title>${dateLabel(p.point.date)} • ${money(p.point.value)}</title></circle>`).join("")}
      </svg>`;
    byId("clubFormSessions").innerHTML=usable.slice(-10).map(item=>
      `<div class="analysis-session-chip ${item.result==="W"?"win":item.result==="L"?"loss":"draw"}">
        <small>${escapeHtml(dateLabel(item.date))}</small><strong>${item.result} • ${item.change>=0?"+":""}${money(item.change)}</strong>
      </div>`).join("");
  }

  function quadrantClass(row){
    const strong=row.buyStrength>=65, highYield=row.yield>=.075;
    if(strong&&highYield) return "elite";
    if(!strong&&highYield) return "income";
    if(!strong&&!highYield) return "watch";
    return "quality";
  }
  function renderQuadrant(rows){
    const map=byId("yieldStrengthMap");
    map.querySelectorAll(".analysis-quadrant-player").forEach(node=>node.remove());
    const scored=rows.filter(row=>row.buyStrength>0&&row.yield>0);
    const maxYield=Math.max(.10,...scored.map(row=>row.yield))*1.08;
    const filtered=ui.quadrant==="all"?scored:scored.filter(row=>quadrantClass(row)===ui.quadrant);
    filtered.forEach(row=>{
      const button=document.createElement("button");
      button.type="button";
      button.className=`analysis-quadrant-player ${quadrantClass(row)}`;
      button.dataset.playerTicker=row.ticker;
      button.style.left=`${clamp(row.yield/maxYield*90+5,5,95)}%`;
      button.style.top=`${clamp(96-row.buyStrength*.88,5,95)}%`;
      button.textContent=row.ticker;
      button.title=`${row.name}: ${(row.yield*100).toFixed(2)}% yield • buy strength ${row.buyStrength}`;
      map.appendChild(button);
    });
    const elite=[...scored].sort((a,b)=>(b.buyStrength+b.yield*500)-(a.buyStrength+a.yield*500)).slice(0,5);
    byId("yieldStrengthTable").innerHTML=elite.length?elite.map(row=>
      `<div class="analysis-mini-row" data-player-ticker="${escapeHtml(row.ticker)}">
        <b>${escapeHtml(row.ticker)}</b><span>${escapeHtml(row.name)}</span><em>${(row.yield*100).toFixed(2)}%</em><em>${Math.round(row.buyStrength)}/100</em>
      </div>`).join(""):`<div class="analysis-loading">Not enough scored holdings.</div>`;
  }

  function setIncomeScenario(mode){
    const chart=typeof charts!=="undefined" ? charts.incomeProgressChart : null;
    if(!chart) return;
    const show={
      reinvest:[true,false,false,true],
      tesco:[false,true,false,true],
      contributions:[false,false,true,true],
      compare:[true,true,true,true]
    }[mode]||[true,false,false,true];
    chart.data.datasets.forEach((dataset,index)=>{dataset.hidden=!show[index];});
    chart.update();
    const point=mode==="tesco"?incomeForecastPoint(60,true,true)
      :mode==="contributions"?incomeForecastPoint(60,false,false)
      :incomeForecastPoint(60,true,false);
    const summary=mode==="compare"
      ?"All four routes are visible for direct comparison."
      :Number.isFinite(point.monthlyIncome)
        ? `${money(point.monthlyIncome)}/month projected at year five • ${money(point.annualIncome)}/year`
        :"Scenario unavailable until current yield loads.";
    byId("incomeScenarioSummary").textContent=summary;
  }

  function renderTarget(rows){
    const monthly=totalIncome(rows)/12, target=625, progress=clamp(monthly/target,0,1),gap=Math.max(0,target-monthly);
    byId("analysisTargetMonthly").textContent=money(monthly);
    byId("analysisTargetGap").textContent=money(gap);
    byId("analysisTargetPercent").textContent=`${(progress*100).toFixed(1)}%`;
    byId("analysisTargetRing").style.setProperty("--target-progress",`${progress*360}deg`);
    let finish=null;
    for(let month=0;month<=120;month++){
      const point=incomeForecastPoint(month,true,true);
      if(Number.isFinite(point.monthlyIncome)&&point.monthlyIncome>=target){finish=month;break;}
    }
    byId("analysisTargetFinish").textContent=finish===null?"Beyond model":finish===0?"Reached":`Month ${finish}`;
    byId("analysisTargetVerdict").textContent=progress>=1
      ?"Promotion secured. Protect dividend quality and reduce concentration."
      :progress>=.8
        ?`Final push: another ${money(gap)} per month is needed.`
        :`The current squad produces ${money(monthly)} per month. The agreed capital plan remains the main route forward.`;
  }

  function renderDividend(rows){
    const incomeRows=rows.filter(row=>row.income>0);
    const total=totalIncome(incomeRows);
    const sorted=[...incomeRows].sort((a,b)=>{
      if(ui.dividendMode==="monthly") return b.monthly-a.monthly;
      if(ui.dividendMode==="share") return b.incomeShare-a.incomeShare;
      if(ui.dividendMode==="yield") return b.yield-a.yield;
      return b.income-a.income;
    });
    const max=Math.max(1,...sorted.map(row=>ui.dividendMode==="yield"?row.yield:ui.dividendMode==="share"?row.incomeShare:ui.dividendMode==="monthly"?row.monthly:row.income));
    byId("dividendLeaderboard").innerHTML=sorted.length?sorted.slice(0,10).map((row,index)=>{
      const metric=ui.dividendMode==="monthly"?money(row.monthly)
        :ui.dividendMode==="share"?`${(row.incomeShare*100).toFixed(1)}%`
        :ui.dividendMode==="yield"?`${(row.yield*100).toFixed(2)}%`
        :money(row.income);
      const raw=ui.dividendMode==="yield"?row.yield:ui.dividendMode==="share"?row.incomeShare:ui.dividendMode==="monthly"?row.monthly:row.income;
      return `<button class="analysis-income-player" type="button" data-player-ticker="${escapeHtml(row.ticker)}" style="--income-width:${clamp(raw/max*100,4,100)}%">
        <span class="analysis-income-rank">${index+1}</span>
        <span><b>${escapeHtml(row.ticker)} — ${escapeHtml(row.name)}</b><span>${escapeHtml(row.accounts.join(" • "))} • ${money(row.monthly)}/month</span></span>
        <strong>${metric}<small>${money(row.income)} annual</small></strong>
      </button>`;
    }).join(""):`<div class="analysis-loading">No dividend income rows found.</div>`;

    const accountMap=new Map();
    if(typeof activeHoldings==="function"){
      activeHoldings().forEach(row=>{
        const account=accountText(row)||"Unassigned";
        accountMap.set(account,(accountMap.get(account)||0)+annualIncome(row));
      });
    }
    byId("dividendAccountSplit").innerHTML=[...accountMap.entries()].sort((a,b)=>b[1]-a[1]).map(([account,income])=>
      `<div class="analysis-account-card"><small>${escapeHtml(account)}</small><strong>${money(income)}/yr</strong><span>${money(income/12)}/month • ${total?((income/total)*100).toFixed(1):0}% of income</span></div>`
    ).join("");
  }

  function renderSectors(rows){
    const sectors=aggregateSectors(rows);
    const metric=sector=>ui.sectorMode==="income"?sector.income:ui.sectorMode==="players"?sector.players.length:sector.value;
    const total=sectors.reduce((s,sector)=>s+metric(sector),0);
    const max=Math.max(1,...sectors.map(metric));
    const portfolio=totalValue(rows), top=sectors[0];
    const topShare=top&&portfolio?top.value/portfolio:0;
    byId("sectorSummaryCards").innerHTML=
      `<div><small>Largest sector</small><strong>${escapeHtml(top?.sector||"—")}</strong></div>
       <div><small>Top concentration</small><strong>${top?`${(topShare*100).toFixed(1)}%`:"—"}</strong></div>
       <div><small>Sectors covered</small><strong>${sectors.length}</strong></div>`;
    byId("sectorLanes").innerHTML=sectors.length?sectors.map(sector=>{
      const display=ui.sectorMode==="income"?money(sector.income)
        :ui.sectorMode==="players"?`${sector.players.length} players`:money0(sector.value);
      return `<button class="analysis-sector-lane ${ui.sector===sector.sector?"active":""}" type="button" data-sector-filter="${escapeHtml(sector.sector)}" style="--sector-width:${clamp(metric(sector)/max*100,5,100)}%">
        <span class="analysis-sector-lane-head"><b>${escapeHtml(sector.sector)}</b><strong>${display} • ${total?((metric(sector)/total)*100).toFixed(1):0}%</strong></span>
        <span class="analysis-sector-players">${sector.players.slice(0,8).map(row=>`<span class="analysis-sector-player">${escapeHtml(row.ticker)}</span>`).join("")}</span>
      </button>`;
    }).join(""):`<div class="analysis-loading">No sector data found.</div>`;
    byId("clearSectorFilter").hidden=ui.sector==="all";
    byId("sectorBadge").textContent=top?`${top.sector}: ${(topShare*100).toFixed(1)}%`:"Shape check";
    byId("sectorBadge").className=`badge ${topShare>.35?"amber":"blue"}`;
    const select=byId("analysisSectorFilter");
    const current=select.value;
    select.innerHTML=`<option value="all">All sectors</option>${sectors.map(s=>`<option value="${escapeHtml(s.sector)}">${escapeHtml(s.sector)}</option>`).join("")}`;
    select.value=sectors.some(s=>s.sector===ui.sector)?ui.sector:"all";
  }

  function renderDecisions(rows){
    const sectors=aggregateSectors(rows),pValue=totalValue(rows),top=sectors[0],topShare=top&&pValue?top.value/pValue:0;
    const weakest=[...rows].sort((a,b)=>a.buyStrength-b.buyStrength)[0];
    const pressure=[...rows].sort((a,b)=>a.movement-b.movement)[0];
    const monthly=totalIncome(rows)/12,gap=Math.max(0,625-monthly);
    const decisions=[
      topShare>.30
        ?{icon:"⚠",title:"Shape discipline",text:`${top.sector} carries ${(topShare*100).toFixed(1)}% of value. New money should avoid increasing that concentration.`,tag:"Watch"}
        :{icon:"✓",title:"Shape controlled",text:"No sector currently dominates the portfolio beyond the main warning threshold.",tag:"Good"},
      pressure&&pressure.movement<0
        ?{icon:"▼",title:`Review ${pressure.ticker} form`,text:`The weakest live move is ${fmtMove(pressure.movement)}. Check whether this is price noise or a fundamental issue.`,tag:"Review"}
        :{icon:"▲",title:"Form stable",text:"No active holding is creating a major live performance warning.",tag:"Stable"},
      {icon:"£",title:"Income promotion route",text:`Another ${money(gap)} per month is required to reach £625. Use the agreed transfer plan rather than chasing yield.`,tag:gap?"Plan":"Reached"}
    ];
    byId("managerDecisionCards").innerHTML=decisions.map(item=>
      `<div class="analysis-decision-card"><span class="analysis-decision-icon">${item.icon}</span><span><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.text)}</span></span><em>${escapeHtml(item.tag)}</em></div>`
    ).join("");
  }

  function filteredRows(){
    let rows=[...ui.rows];
    const term=ui.search.trim().toLowerCase();
    if(term) rows=rows.filter(row=>[row.ticker,row.name,row.role,row.sector,...row.accounts].join(" ").toLowerCase().includes(term));
    if(ui.sector!=="all") rows=rows.filter(row=>row.sector===ui.sector);
    if(ui.status!=="all") rows=rows.filter(row=>row.status===ui.status);
    const sorters={
      value:(a,b)=>b.value-a.value,income:(a,b)=>b.income-a.income,yield:(a,b)=>b.yield-a.yield,
      profit:(a,b)=>b.profit-a.profit,strength:(a,b)=>b.buyStrength-a.buyStrength,
      form:(a,b)=>b.movement-a.movement,risk:(a,b)=>b.risk-a.risk
    };
    rows.sort(sorters[ui.sort]||sorters.value);
    return rows;
  }
  function renderPlayerTable(){
    const rows=filteredRows();
    ui.visibleRows=rows;
    byId("playerCountBadge").textContent=`${rows.length} players`;
    const rising=rows.filter(r=>r.status==="rising").length,review=rows.filter(r=>r.status==="review").length;
    byId("analysisTableSummary").innerHTML=
      `<span class="analysis-table-chip"><b>${rows.length}</b> visible</span>
       <span class="analysis-table-chip"><b>${rising}</b> rising</span>
       <span class="analysis-table-chip"><b>${review}</b> under review</span>
       <span class="analysis-table-chip"><b>${money(totalValue(rows))}</b> value</span>
       <span class="analysis-table-chip"><b>${money(totalIncome(rows))}</b> annual income</span>`;
    byId("analysisPlayerBody").innerHTML=rows.length?rows.map((row,index)=>
      `<tr class="analysis-row-enter" style="--row-index:${index}" data-player-ticker="${escapeHtml(row.ticker)}">
        <td><span class="analysis-player-cell"><span class="analysis-player-avatar">${escapeHtml(row.ticker.slice(0,3))}</span><span><b>${escapeHtml(row.ticker)}</b><span>${escapeHtml(row.name)}</span></span></span></td>
        <td>${escapeHtml(row.role)}<br><span style="color:#71839c">${escapeHtml(row.sector)}</span></td>
        <td><span class="analysis-form-pill ${row.status}">${row.status==="rising"?"▲":row.status==="review"?"▼":"●"} ${fmtMove(row.movement)}</span></td>
        <td>${money(row.value)}<br><span style="color:#71839c">${(row.valueShare*100).toFixed(1)}% of value</span></td>
        <td class="${row.income>0?"positive":"neutral"}">${money(row.income)}<br><span style="color:#71839c">${money(row.monthly)}/month</span></td>
        <td>${(row.yield*100).toFixed(2)}%</td>
        <td class="${row.profit>0?"positive":row.profit<0?"negative":"neutral"}">${money(row.profit)}</td>
        <td><span class="analysis-strength-meter"><span>${row.buyStrength||"—"}</span><i style="--strength:${clamp(row.buyStrength,0,100)}%"></i></span></td>
        <td><button class="analysis-open-profile" type="button" data-player-ticker="${escapeHtml(row.ticker)}">Open profile</button></td>
      </tr>`).join(""):`<tr><td class="loading" colspan="9">No players match the current filters.</td></tr>`;
  }

  function openDrawer(ticker){
    const index=ui.rows.findIndex(row=>row.ticker===ticker);
    if(index<0) return;
    ui.drawerIndex=index;
    const row=ui.rows[index];
    byId("drawerPlayerTitle").textContent=`${row.ticker} — ${row.name}`;
    byId("drawerPlayerSubtitle").textContent=`${row.role} • ${row.sector} • ${row.accounts.join(" / ")}`;
    const valueScore=clamp(row.valueShare*600,0,100);
    const incomeScore=clamp(row.incomeShare*500,0,100);
    const risk=Math.round(row.risk);
    byId("analysisDrawerContent").innerHTML=
      `<div class="analysis-drawer-hero">
        <div class="analysis-drawer-rating" style="--rating-progress:${row.rating*3.6}deg"><span>${row.rating}</span></div>
        <div><h3>${escapeHtml(row.status==="rising"?"Strong live form":row.status==="review"?"Under review":"Stable squad player")}</h3>
        <p>${escapeHtml(row.ticker)} contributes ${(row.incomeShare*100).toFixed(1)}% of annual income and ${(row.valueShare*100).toFixed(1)}% of total club value.</p></div>
      </div>
      <div class="analysis-drawer-metrics">
        <div class="analysis-drawer-metric"><small>Club value</small><strong>${money(row.value)}</strong></div>
        <div class="analysis-drawer-metric"><small>Annual income</small><strong>${money(row.income)}</strong></div>
        <div class="analysis-drawer-metric"><small>Monthly income</small><strong>${money(row.monthly)}</strong></div>
        <div class="analysis-drawer-metric"><small>Dividend yield</small><strong>${(row.yield*100).toFixed(2)}%</strong></div>
        <div class="analysis-drawer-metric"><small>Profit / loss</small><strong class="${row.profit>=0?"positive":"negative"}">${money(row.profit)}</strong></div>
        <div class="analysis-drawer-metric"><small>Live form</small><strong class="${row.movement>=0?"positive":"negative"}">${fmtMove(row.movement)}</strong></div>
        <div class="analysis-drawer-metric"><small>Buy strength</small><strong>${row.buyStrength||"—"}/100</strong></div>
        <div class="analysis-drawer-metric"><small>Risk score</small><strong>${risk}/100</strong></div>
      </div>
      <div class="analysis-drawer-section"><h4>Tactical contribution</h4>
        ${drawerBar("Value influence",valueScore)}
        ${drawerBar("Income influence",incomeScore)}
        ${drawerBar("Recruitment quality",row.buyStrength||0)}
        ${drawerBar("Risk pressure",risk)}
      </div>
      <div class="analysis-drawer-section"><h4>Manager interpretation</h4>
        <div class="analysis-decision-card"><span class="analysis-decision-icon">${row.status==="rising"?"▲":row.status==="review"?"!":"●"}</span>
        <span><b>${escapeHtml(profileCall(row))}</b><span>${escapeHtml(profileDetail(row))}</span></span><em>${escapeHtml(row.status)}</em></div>
      </div>`;
    byId("analysisDrawerBackdrop").hidden=false;
    byId("analysisPlayerDrawer").classList.add("open");
    byId("analysisPlayerDrawer").setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function drawerBar(label,value){
    return `<div class="analysis-drawer-bar"><div class="analysis-drawer-bar-head"><span>${escapeHtml(label)}</span><b>${Math.round(clamp(value,0,100))}/100</b></div><div class="analysis-drawer-bar-track"><i style="width:${clamp(value,0,100)}%"></i></div></div>`;
  }
  function profileCall(row){
    if(row.status==="review") return "Review before adding more capital";
    if(row.buyStrength>=70&&row.yield>=.06) return "Strong all-round squad profile";
    if(row.incomeShare>.15) return "Core income player";
    if(row.status==="rising") return "Form is improving";
    return "Hold current tactical role";
  }
  function profileDetail(row){
    if(row.risk>=65) return "Concentration, form or yield risk is elevated. Check the underlying case before the next purchase.";
    if(row.buyStrength>=70) return "Aurora recruitment quality remains strong relative to the current income rate.";
    return "The holding is contributing, but it is not currently the strongest candidate for additional capital.";
  }
  function closeDrawer(){
    byId("analysisPlayerDrawer").classList.remove("open");
    byId("analysisPlayerDrawer").setAttribute("aria-hidden","true");
    byId("analysisDrawerBackdrop").hidden=true;
    document.body.style.overflow="";
  }
  function stepDrawer(direction){
    if(!ui.rows.length) return;
    ui.drawerIndex=(ui.drawerIndex+direction+ui.rows.length)%ui.rows.length;
    openDrawer(ui.rows[ui.drawerIndex].ticker);
  }

  function renderAll(){
    ui.rows=getRows();
    if(!ui.rows.length) return;
    renderMatchCentre(ui.rows);
    renderTacticalPitch(ui.rows);
    renderClubForm();
    renderQuadrant(ui.rows);
    renderTarget(ui.rows);
    renderDividend(ui.rows);
    renderSectors(ui.rows);
    renderDecisions(ui.rows);
    renderPlayerTable();
    setIncomeScenario(byId("incomeScenarioControls")?.querySelector("button.active")?.dataset.incomeScenario||"reinvest");
  }
  function queueRender(){
    if(ui.renderQueued) return;
    ui.renderQueued=true;
    window.requestAnimationFrame(()=>{
      ui.renderQueued=false;
      try{renderAll();}catch(error){console.error("Analysis BEAST render failed",error);}
    });
  }

  function activateButtons(container,button){
    container?.querySelectorAll("button").forEach(item=>item.classList.toggle("active",item===button));
  }
  function bind(){
    document.addEventListener("click",event=>{
      const scroll=event.target.closest("[data-scroll-target]");
      if(scroll){byId(scroll.dataset.scrollTarget)?.scrollIntoView({behavior:"smooth",block:"start"});return;}

      const focus=event.target.closest("[data-tactical-focus]");
      if(focus){ui.tacticalFocus=focus.dataset.tacticalFocus;activateButtons(byId("tacticalFocusControls"),focus);renderTacticalPitch(ui.rows);return;}

      const range=event.target.closest("[data-form-range]");
      if(range){ui.formRange=Number(range.dataset.formRange)||10;activateButtons(byId("clubFormRange"),range);renderClubForm();return;}

      const quadrant=event.target.closest("[data-quadrant]");
      if(quadrant){ui.quadrant=quadrant.dataset.quadrant;activateButtons(byId("quadrantFilter"),quadrant);renderQuadrant(ui.rows);return;}

      const scenario=event.target.closest("[data-income-scenario]");
      if(scenario){activateButtons(byId("incomeScenarioControls"),scenario);setIncomeScenario(scenario.dataset.incomeScenario);return;}

      const dividend=event.target.closest("[data-dividend-mode]");
      if(dividend){ui.dividendMode=dividend.dataset.dividendMode;activateButtons(byId("dividendModeControls"),dividend);renderDividend(ui.rows);return;}

      const sectorMode=event.target.closest("[data-sector-mode]");
      if(sectorMode){ui.sectorMode=sectorMode.dataset.sectorMode;activateButtons(byId("sectorModeControls"),sectorMode);renderSectors(ui.rows);return;}

      const sector=event.target.closest("[data-sector-filter]");
      if(sector){ui.sector=sector.dataset.sectorFilter;byId("analysisSectorFilter").value=ui.sector;renderSectors(ui.rows);renderPlayerTable();byId("player-performance-table").scrollIntoView({behavior:"smooth",block:"start"});return;}

      const status=event.target.closest("[data-player-status]");
      if(status){ui.status=status.dataset.playerStatus;activateButtons(byId("analysisStatusFilter"),status);renderPlayerTable();return;}

      const best=event.target.closest("[data-analysis-player-best]");
      if(best){const ticker=byId("bestPerformer").textContent.trim();openDrawer(ticker);return;}

      const matchFilter=event.target.closest("[data-analysis-filter]");
      if(matchFilter){
        ui.status=matchFilter.dataset.analysisFilter==="positive"?"rising":"review";
        byId("analysisStatusFilter").querySelectorAll("button").forEach(button=>button.classList.toggle("active",button.dataset.playerStatus===ui.status));
        renderPlayerTable();byId("player-performance-table").scrollIntoView({behavior:"smooth",block:"start"});return;
      }

      const player=event.target.closest("[data-player-ticker]");
      if(player){event.preventDefault();openDrawer(player.dataset.playerTicker);return;}
    });

    byId("analysisPlayerSearch")?.addEventListener("input",event=>{ui.search=event.target.value;renderPlayerTable();});
    byId("analysisPlayerSort")?.addEventListener("change",event=>{ui.sort=event.target.value;renderPlayerTable();});
    byId("analysisSectorFilter")?.addEventListener("change",event=>{ui.sector=event.target.value;renderSectors(ui.rows);renderPlayerTable();});
    byId("clearSectorFilter")?.addEventListener("click",()=>{ui.sector="all";renderSectors(ui.rows);renderPlayerTable();});
    byId("analysisDrawerClose")?.addEventListener("click",closeDrawer);
    byId("analysisDrawerBackdrop")?.addEventListener("click",closeDrawer);
    byId("analysisDrawerPrevious")?.addEventListener("click",()=>stepDrawer(-1));
    byId("analysisDrawerNext")?.addEventListener("click",()=>stepDrawer(1));
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeDrawer();});

    const sections=["match-analysis","income-runway","dividend-command-centre","dividend-contribution","squad-shape-sector","player-performance-table"];
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(!current)return;
        document.querySelectorAll(".analysis-command-tab").forEach(link=>link.classList.toggle("active",link.getAttribute("href")===`#${current.target.id}`));
      },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.2,.5]});
      sections.forEach(id=>{const section=byId(id);if(section)observer.observe(section);});
    }
  }

  bind();

  const legacyBody=byId("playerTable");
  if(legacyBody&&"MutationObserver" in window){
    new MutationObserver(queueRender).observe(legacyBody,{childList:true,subtree:true});
  }

  if(typeof loadData==="function"){
    const baseLoadData=loadData;
    loadData=async function(force=false){
      await baseLoadData(force);
      queueRender();
    };
    window.loadData=loadData;
  }

  let attempts=0;
  const wait=window.setInterval(()=>{
    attempts++;
    if((typeof state!=="undefined"&&state?.holdings?.length)||attempts>80){
      window.clearInterval(wait);
      queueRender();
    }
  },125);

  window.addEventListener("pageshow",queueRender);
})();

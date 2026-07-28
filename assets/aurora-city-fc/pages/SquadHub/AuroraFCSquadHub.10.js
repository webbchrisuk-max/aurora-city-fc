
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

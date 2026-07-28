
(() => {
  "use strict";
  const BUILD = "20260728-unified-shared-v1";
  const AUTO_CLOSE_MS = 5000;
  const OPEN_UNTIL = "auroraSharedSidebarOpenUntil";
  const MANUAL_CLOSED = "auroraSharedSidebarManualClosed";

  const pages = [
    {key:"home",label:"Manager Dashboard",href:"AuroraCityFC_ManagerDashboard.html",icon:"⌂",group:"Club HQ",colour:"#60a5fa",rgb:"96,165,250"},
    {key:"nexus",label:"Nexus HQ",href:"AuroraCityFC_NexusMaster.html",icon:"◆",group:"Club HQ",colour:"#b985ff",rgb:"185,133,255"},
    {key:"finance",label:"Finance Department",href:"AuroraCityFC_FinanceDepartment.html",icon:"£",group:"Departments",colour:"#f3c45b",rgb:"243,196,91"},
    {key:"squad",label:"Squad Hub",href:"AuroraCityFC_SquadHub.html",icon:"♟",group:"Performance",colour:"#22d3ee",rgb:"34,211,238"},
    {key:"analysis",label:"Analysis Room",href:"AuroraCityFC_AnalysisRoom.html",icon:"⌁",group:"Performance",colour:"#a78bfa",rgb:"167,139,250"},
    {key:"training",label:"Training Ground",href:"AuroraCityFC_TrainingGround.html",icon:"▲",group:"Performance",colour:"#34d399",rgb:"52,211,153"},
    {key:"scouting",label:"Scouting Centre",href:"AuroraCityFC_ScoutingCentre.html",icon:"⌕",group:"Recruitment",colour:"#4ade80",rgb:"74,222,128"},
    {key:"transfer",label:"Transfer Centre",href:"AuroraCityFC_TransferCentre.html",icon:"⇄",group:"Recruitment",colour:"#f59e0b",rgb:"245,158,11"},
    {key:"boardroom",label:"Boardroom",href:"AuroraCityFC_Boardroom.html",icon:"♜",group:"Club",colour:"#f472b6",rgb:"244,114,182"},
    {key:"media",label:"Media Centre",href:"AuroraCityFC_MediaCentre.html",icon:"●",group:"Club",colour:"#facc15",rgb:"250,204,21"}
  ];

  const fallbackSections = {
    home:[["home-overview","Overview"],["manager-dashboard","Manager Dashboard"],["club-overview","Club Overview"]],
    nexus:[["overview","Overview"],["data-health","Data Health"],["dividend-runway","Dividend Runway"]],
    finance:[["finance-overview","Overview"],["payday-plan","Payday Plan"],["scheduled-bills","Bills"],["house-project","House Project"]],
    squad:[["squad-overview","Overview"],["starting-xi","Starting XI"],["positional-depth-chart","Depth Chart"],["squad-development-centre","Development"]],
    analysis:[["analysis-overview","Overview"],["portfolio-analysis","Portfolio Analysis"],["risk-analysis","Risk Analysis"]],
    training:[["training-overview","Overview"],["training-plan","Training Plan"],["fitness-centre","Fitness Centre"]],
    scouting:[["scouting-overview","Overview"],["chief-scout-report","Chief Scout Report"],["scouting-radar","Scouting Radar"],["scouting-pipeline","Pipeline"]],
    transfer:[["transfer-overview","Overview"],["top-transfer-board","Top Targets"],["deal-sheet","Deal Sheet"],["incoming-offers","Incoming Offers"]],
    boardroom:[["board-overview","Overview"],["board-confidence","Board Confidence"],["objectives","Objectives"],["governance","Governance"]],
    media:[["media-overview","Overview"],["press-room","Press Room"],["news-feed","News Feed"],["communications","Communications"]]
  };

  const currentKey = () =>
    (document.documentElement.dataset.auroraPage || document.body?.dataset.auroraPage || "home").toLowerCase();

  let timer = 0;
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = 0; };
  const setWindow = (ms=AUTO_CLOSE_MS) => {
    sessionStorage.setItem(OPEN_UNTIL, String(Date.now()+ms));
    sessionStorage.removeItem(MANUAL_CLOSED);
  };
  const closeAuto = () => {
    clearTimer();
    document.body.classList.add("aurora-sidebar-hidden");
    document.body.classList.remove("aurora-sidebar-mobile-open");
    sessionStorage.removeItem(OPEN_UNTIL);
  };
  const scheduleClose = () => {
    clearTimer();
    const remaining = Math.max(0, Number(sessionStorage.getItem(OPEN_UNTIL)||0)-Date.now());
    if (remaining > 0) timer = setTimeout(closeAuto, remaining);
  };
  const open = (fresh=true) => {
    clearTimer();
    document.body.classList.remove("aurora-sidebar-hidden");
    document.body.classList.add("aurora-sidebar-mobile-open");
    if (fresh) setWindow();
    scheduleClose();
  };
  const closeManual = () => {
    clearTimer();
    document.body.classList.add("aurora-sidebar-hidden");
    document.body.classList.remove("aurora-sidebar-mobile-open");
    sessionStorage.removeItem(OPEN_UNTIL);
    sessionStorage.setItem(MANUAL_CLOSED,"1");
  };

  function findSection(id){
    return document.getElementById(id) || document.querySelector(`[data-section="${CSS.escape(id)}"]`);
  }

  function buildSubmenu(container, key, colour, rgb){
    container.style.setProperty("--active-rgb", rgb);
    const legacyButtons = [...document.querySelectorAll(".m13-nav button")];
    if (key === "finance" && legacyButtons.length){
      legacyButtons.forEach(btn => {
        const clone = document.createElement("button");
        clone.type = "button";
        clone.textContent = (btn.textContent || "").trim();
        clone.addEventListener("click", () => {
          btn.click();
          open();
        });
        container.appendChild(clone);
      });
      return;
    }

    const candidates = fallbackSections[key] || [];
    let inserted = 0;
    candidates.forEach(([id,label]) => {
      const target = findSection(id);
      if (!target) return;
      const a = document.createElement("a");
      a.href = `#${id}`;
      a.textContent = label;
      a.addEventListener("click", () => open());
      container.appendChild(a);
      inserted++;
    });

    if (!inserted){
      [...document.querySelectorAll("main [id], .app [id], .wrap [id]")]
        .filter(el => !el.closest("#auroraSharedSidebar"))
        .slice(0,8)
        .forEach(el => {
          const a=document.createElement("a");
          a.href=`#${el.id}`;
          a.textContent=el.id.replace(/[-_]+/g," ").replace(/\b\w/g,m=>m.toUpperCase());
          a.addEventListener("click",()=>open());
          container.appendChild(a);
        });
    }
  }

  function render(){
    document.getElementById("auroraSharedSidebar")?.remove();
    document.getElementById("auroraSharedEdge")?.remove();

    const key=currentKey();
    const current=pages.find(p=>p.key===key) || pages[0];
    const aside=document.createElement("aside");
    aside.id="auroraSharedSidebar";
    aside.setAttribute("aria-label","Aurora City FC navigation");

    aside.innerHTML=`
      <div class="aurora-shared-brand">
        <button id="auroraSharedCollapse" type="button" aria-label="Hide navigation">‹</button>
        <div class="aurora-shared-crest"><img alt="Aurora City FC crest" src="https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png"></div>
        <div><strong>Aurora City FC</strong><small>${current.label}</small></div>
      </div>
      <nav class="aurora-shared-scroll"></nav>
      <div class="aurora-shared-footer">
        <button class="aurora-shared-refresh" type="button">↻ Refresh Data</button>
        <div class="aurora-shared-clock">Connected</div>
      </div>`;

    const nav=aside.querySelector("nav");
    let group="";
    pages.forEach(page=>{
      if(page.group!==group){
        const g=document.createElement("div");
        g.className="aurora-shared-group";g.textContent=page.group;nav.appendChild(g);group=page.group;
      }
      if(page.key===key){
        const currentBox=document.createElement("div");
        currentBox.className="aurora-shared-current";
        currentBox.style.setProperty("--dept",page.colour);
        currentBox.style.setProperty("--dept-rgb",page.rgb);
        currentBox.innerHTML=`<span class="aurora-shared-icon">${page.icon}</span><span>${page.label}</span>`;
        nav.appendChild(currentBox);
        const sub=document.createElement("div");
        sub.className="aurora-shared-submenu";
        buildSubmenu(sub,key,page.colour,page.rgb);
        nav.appendChild(sub);
      }else{
        const a=document.createElement("a");
        a.className="aurora-shared-link";
        a.href=page.href;
        a.style.setProperty("--dept",page.colour);
        a.style.setProperty("--dept-rgb",page.rgb);
        a.innerHTML=`<span class="aurora-shared-icon">${page.icon}</span><span>${page.label}</span>`;
        a.addEventListener("click",()=>{setWindow();document.body.classList.remove("aurora-sidebar-hidden");});
        nav.appendChild(a);
      }
    });

    const edge=document.createElement("div");
    edge.id="auroraSharedEdge";edge.setAttribute("role","button");edge.tabIndex=0;
    edge.setAttribute("aria-label","Show navigation");edge.innerHTML="<span>›</span>";
    document.body.prepend(edge);document.body.prepend(aside);

    aside.querySelector("#auroraSharedCollapse").addEventListener("click",closeManual);
    aside.querySelector(".aurora-shared-refresh").addEventListener("click",()=>location.reload());
    edge.addEventListener("click",()=>open());
    edge.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")open();});
    aside.addEventListener("pointerenter",()=>open());
  }

  function restore(){
    if(sessionStorage.getItem(MANUAL_CLOSED)==="1"){
      document.body.classList.add("aurora-sidebar-hidden");
      return;
    }
    const until=Number(sessionStorage.getItem(OPEN_UNTIL)||0);
    if(until>Date.now()){
      document.body.classList.remove("aurora-sidebar-hidden");
      scheduleClose();
    }else{
      setWindow();
      document.body.classList.remove("aurora-sidebar-hidden");
      scheduleClose();
    }
  }

  function tick(){
    const n=document.querySelector(".aurora-shared-clock");
    if(n)n.textContent=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
  }

  function boot(){
    document.body.classList.add("aurora-shared-ready");
    render();
    restore();
    tick();setInterval(tick,1000);
    document.dispatchEvent(new CustomEvent("aurora:shared-navigation-ready",{detail:{build:BUILD,page:currentKey()}}));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();

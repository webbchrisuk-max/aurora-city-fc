(function(){
  "use strict";

  if(!window.__AURORA_CLOUD_LOADER__){
    window.__AURORA_CLOUD_LOADER__ = true;
    const cloudScript = document.createElement("script");
    cloudScript.id = "auroraCloudSyncLoader";
    cloudScript.type = "module";
    cloudScript.src = "aurora-cloud-sync.js?v=20260730-cloud3";
    cloudScript.addEventListener("error",function(){
      console.warn("Aurora Cloud Sync could not be loaded.");
    });
    document.head.appendChild(cloudScript);
  }

  if(window.__AURORA_WORKFLOW_NAV__) return;
  window.__AURORA_WORKFLOW_NAV__ = true;

  const WORKFLOW = [
    {title:"Payday Plan",note:"Set the real monthly budget and allocation",href:"AuroraCityFC_FinanceDepartment.html#m15PaydayAllocationCentre"},
    {title:"Portfolio Check",note:"Check yield, value, form and concentration",href:"AuroraCityFC_AnalysisRoom.html#yield-strength-workbench"},
    {title:"Scouting Shortlist",note:"Review the live recruitment pipeline",href:"AuroraCityFC_ScoutingCentre.html#scouting-pipeline"},
    {title:"Build Deal Sheet",note:"Choose targets and create this month’s route",href:"AuroraCityFC_TransferCentre.html#top-transfer-board"},
    {title:"Review Transfer Impact",note:"Check income, yield and portfolio effect",href:"AuroraCityFC_TransferCentre.html#post-transfer-impact"},
    {title:"Execute Purchases",note:"Record the completed broker purchases",href:"AuroraCityFC_TransferCentre.html#payday-execution"},
    {title:"Register Signings",note:"Add the completed purchases to Aurora",href:"AuroraCityFC_TransferCentre.html#registration-desk"},
    {title:"Confirm Squad",note:"Check the new holdings are live and correct",href:"AuroraCityFC_SquadHub.html#squad-overview"},
    {title:"Manager Review",note:"Confirm the new income and mission progress",href:"AuroraCityFC_ManagerDashboard.html#club-overview"}
  ];

  const DEPARTMENTS = [
    ["⌂","Aurora Nexus HQ","AuroraCityFC_NexusMaster.html"],
    ["▦","Manager Dashboard","AuroraCityFC_ManagerDashboard.html"],
    ["£","Finance Department","AuroraCityFC_FinanceDepartment.html"],
    ["♟","Squad Hub","AuroraCityFC_SquadHub.html"],
    ["↗","Analysis Room","AuroraCityFC_AnalysisRoom.html"],
    ["▲","Training Ground","AuroraCityFC_TrainingGround.html"],
    ["⌕","Scouting Centre","AuroraCityFC_ScoutingCentre.html"],
    ["⇄","Transfer Centre","AuroraCityFC_TransferCentre.html"],
    ["♜","Boardroom","AuroraCityFC_Boardroom.html"],
    ["●","Media Centre","AuroraCityFC_MediaCentre.html"],
    ["☁","Cloud Sync","AuroraCloudSync.html"]
  ];

  const currentFile = (location.pathname.split("/").pop() || "AuroraCityFC_NexusMaster.html").toLowerCase();
  const currentHash = location.hash.toLowerCase();

  function splitTarget(href){
    const parts = href.split("#");
    return {file:(parts[0] || "").toLowerCase(),hash:parts[1] ? "#" + parts[1].toLowerCase() : ""};
  }

  function isWorkflowActive(href){
    const target = splitTarget(href);
    return target.file === currentFile && target.hash && target.hash === currentHash;
  }

  function esc(value){
    return String(value).replace(/[&<>"']/g,function(char){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
    });
  }

  function build(){
    if(document.getElementById("auroraNavPanel")) return;

    const toggle = document.createElement("button");
    toggle.id = "auroraNavToggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label","Open Aurora navigation");
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-controls","auroraNavPanel");
    toggle.innerHTML = "<span aria-hidden=\"true\"></span>";

    const overlay = document.createElement("div");
    overlay.id = "auroraNavOverlay";
    overlay.setAttribute("aria-hidden","true");

    const panel = document.createElement("aside");
    panel.id = "auroraNavPanel";
    panel.setAttribute("aria-label","Aurora City FC workflow and departments");
    panel.setAttribute("aria-hidden","true");

    const workflowMarkup = WORKFLOW.map(function(step,index){
      const active = isWorkflowActive(step.href);
      return `
        <a class="aurora-nav-step${active ? " is-active" : ""}" href="${esc(step.href)}">
          <span class="aurora-nav-step-number">${index + 1}</span>
          <span class="aurora-nav-step-copy"><strong>${esc(step.title)}</strong><span>${esc(step.note)}</span></span>
          <span class="aurora-nav-step-arrow" aria-hidden="true">›</span>
        </a>`;
    }).join("");

    const departmentMarkup = DEPARTMENTS.map(function(item){
      const current = item[2].toLowerCase() === currentFile;
      return `
        <a class="aurora-nav-dept${current ? " is-current" : ""}" href="${esc(item[2])}">
          <span class="aurora-nav-dept-icon" aria-hidden="true">${esc(item[0])}</span>
          <strong>${esc(item[1])}</strong>
          ${current ? '<span class="aurora-nav-current-tag">Current</span>' : '<span aria-hidden="true">›</span>'}
        </a>`;
    }).join("");

    panel.innerHTML = `
      <header class="aurora-nav-head">
        <div class="aurora-nav-crest" aria-hidden="true">AFC</div>
        <div class="aurora-nav-brand"><strong>Aurora City FC</strong><span>Mission Navigation</span></div>
        <button class="aurora-nav-close" type="button" aria-label="Close Aurora navigation">×</button>
      </header>
      <div class="aurora-nav-scroll">
        <section class="aurora-nav-section" aria-labelledby="auroraMissionLabel">
          <h2 class="aurora-nav-label" id="auroraMissionLabel">Current mission — payday to completed transfer</h2>
          <p class="aurora-nav-mission-note">Follow these steps in order. Each link opens the actual working area you need.</p>
          <nav class="aurora-nav-route" aria-label="Payday and transfer workflow">${workflowMarkup}</nav>
        </section>
        <section class="aurora-nav-section" aria-labelledby="auroraDepartmentsLabel">
          <h2 class="aurora-nav-label" id="auroraDepartmentsLabel">Departments</h2>
          <nav class="aurora-nav-departments" aria-label="Aurora departments">${departmentMarkup}</nav>
        </section>
      </div>
      <footer class="aurora-nav-foot"><strong>Navigation + cloud status.</strong> Cloud Sync protects shared Aurora records without changing calculations or page layout.</footer>`;

    document.body.append(toggle,overlay,panel);
    const closeButton = panel.querySelector(".aurora-nav-close");

    function setOpen(open){
      document.body.classList.toggle("aurora-nav-open",open);
      toggle.setAttribute("aria-expanded",String(open));
      toggle.setAttribute("aria-label",open ? "Close Aurora navigation" : "Open Aurora navigation");
      panel.setAttribute("aria-hidden",String(!open));
      overlay.setAttribute("aria-hidden",String(!open));
      if(open) setTimeout(function(){ closeButton && closeButton.focus({preventScroll:true}); },40);
    }

    toggle.addEventListener("click",function(){setOpen(!document.body.classList.contains("aurora-nav-open"));});
    closeButton.addEventListener("click",function(){setOpen(false);});
    overlay.addEventListener("click",function(){setOpen(false);});
    panel.addEventListener("click",function(event){if(event.target.closest("a[href]"))setOpen(false);});
    document.addEventListener("keydown",function(event){
      if(event.key === "Escape" && document.body.classList.contains("aurora-nav-open")){
        setOpen(false);toggle.focus({preventScroll:true});
      }
    });
    window.addEventListener("pageshow",function(){setOpen(false);});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();

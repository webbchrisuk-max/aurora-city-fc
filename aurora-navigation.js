(function(){
  "use strict";

  if(!window.__AURORA_CLOUD_ENGINE_LOADING__ && !window.AuroraCloudSync){
    window.__AURORA_CLOUD_ENGINE_LOADING__ = true;
    const cloudScript = document.createElement("script");
    cloudScript.id = "auroraCloudSyncLoader";
    cloudScript.src = "aurora-cloud-sync.js?v=20260730-menu-status-1";
    cloudScript.addEventListener("error",function(){
      window.__AURORA_CLOUD_ENGINE_LOADING__ = false;
      console.warn("Aurora Cloud Sync could not be loaded.");
      updateCloudStatus({
        label:"Cloud unavailable",
        detail:"Open Cloud Sync to check the connection",
        state:"error"
      });
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
    ["⚽","Matchday Centre","AuroraCityFC_MatchdayCentre.html"],
    ["●","Media Centre","AuroraCityFC_MediaCentre.html"],
  ];

  const currentFile = (
    location.pathname.split("/").pop()
    || "AuroraCityFC_NexusMaster.html"
  ).toLowerCase();

  const currentHash = location.hash.toLowerCase();

  function splitTarget(href){
    const parts = href.split("#");
    return {
      file:(parts[0] || "").toLowerCase(),
      hash:parts[1] ? "#" + parts[1].toLowerCase() : ""
    };
  }

  function isWorkflowActive(href){
    const target = splitTarget(href);
    return target.file === currentFile
      && target.hash
      && target.hash === currentHash;
  }

  function esc(value){
    return String(value).replace(/[&<>"']/g,function(char){
      return {
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      }[char];
    });
  }

  function cloudPresentation(snapshot){
    if(!snapshot){
      return {
        label:"Checking Aurora Cloud…",
        detail:"Reading the live connection status",
        state:"working"
      };
    }

    if(snapshot.lastError){
      return {
        label:"Aurora Cloud needs attention",
        detail:snapshot.lastError,
        state:"error"
      };
    }

    if(snapshot.working){
      return {
        label:snapshot.action === "sign-in"
          ? "Signing in to Aurora Cloud…"
          : "Synchronising Aurora Cloud…",
        detail:"Keeping shared club records up to date",
        state:"working"
      };
    }

    if(!snapshot.online){
      return {
        label:"Aurora saved offline",
        detail:"Changes will sync when the connection returns",
        state:"attention"
      };
    }

    if(!snapshot.signedIn){
      return {
        label:"Aurora Cloud sign-in required",
        detail:"Open Cloud Sync to connect this device",
        state:"attention"
      };
    }

    if(!snapshot.cloudInitialised){
      return {
        label:"Aurora Cloud setup required",
        detail:"Open Cloud Sync to upload the master copy",
        state:"attention"
      };
    }

    if(snapshot.syncEnabled){
      return {
        label:"Aurora Cloud connected",
        detail:snapshot.pendingRefresh
          ? "Latest club data received"
          : "Shared club records are synchronised",
        state:"synced"
      };
    }

    return {
      label:"Connecting to Aurora Cloud…",
      detail:"The club connection is being prepared",
      state:"working"
    };
  }

  function updateCloudStatus(value){
    const control = document.getElementById("auroraNavCloud");
    if(!control) return;

    const presentation = value && value.label
      ? value
      : cloudPresentation(value);

    control.dataset.state = presentation.state || "working";

    const label = control.querySelector(
      ".aurora-nav-cloud-copy strong"
    );

    const detail = control.querySelector(
      ".aurora-nav-cloud-copy span"
    );

    if(label) label.textContent = "Cloud Sync";
    if(detail) detail.textContent = presentation.detail;

    const stateLabel = control.querySelector(
      ".aurora-nav-cloud-state-label"
    );

    if(stateLabel){
      stateLabel.textContent =
        presentation.state === "synced"
          ? "Synced"
          : presentation.state === "working"
            ? "Syncing"
            : presentation.state === "attention"
              ? "Attention"
              : presentation.state === "error"
                ? "Error"
                : "Checking";
    }

    control.title = presentation.detail || presentation.label;
    control.setAttribute(
      "aria-label",
      `${presentation.label}. ${presentation.detail}`
    );
  }

  function connectCloudStatus(){
    const api = window.AuroraCloudSync;
    if(!api) return false;

    try{
      if(typeof api.getState === "function"){
        updateCloudStatus(api.getState());
      }

      if(typeof api.subscribe === "function"){
        api.subscribe(updateCloudStatus);
      }

      if(api.ready && typeof api.ready.then === "function"){
        api.ready
          .then(updateCloudStatus)
          .catch(function(){
            updateCloudStatus({
              label:"Aurora Cloud needs attention",
              detail:"Open Cloud Sync to check the connection",
              state:"error"
            });
          });
      }

      return true;
    }catch(error){
      console.warn("Aurora navigation could not read cloud status.",error);
      return false;
    }
  }

  function wireCloudStatus(){
    if(connectCloudStatus()) return;

    let attempts = 0;
    const timer = window.setInterval(function(){
      attempts += 1;

      if(connectCloudStatus() || attempts >= 40){
        window.clearInterval(timer);

        if(attempts >= 40 && !window.AuroraCloudSync){
          updateCloudStatus({
            label:"Aurora Cloud unavailable",
            detail:"Open Cloud Sync to check the connection",
            state:"error"
          });
        }
      }
    },250);

    window.addEventListener(
      "aurora-cloud-ready",
      function(event){
        window.clearInterval(timer);

        const api = event.detail || window.AuroraCloudSync;
        if(api && typeof api.getState === "function"){
          updateCloudStatus(api.getState());
        }

        connectCloudStatus();
      },
      {once:true}
    );
  }

  function injectBottomCloudStyles(){
    if(document.getElementById("auroraBottomCloudStyles")) return;

    const style = document.createElement("style");
    style.id = "auroraBottomCloudStyles";
    style.textContent = `
      #auroraNavPanel{
        display:flex;
        flex-direction:column;
        overflow:hidden;
      }

      #auroraNavPanel .aurora-nav-head{
        flex:0 0 auto;
      }

      #auroraNavPanel .aurora-nav-scroll{
        flex:1 1 auto;
        min-height:0;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
      }

      #auroraNavPanel .aurora-nav-foot{
        position:relative;
        z-index:5;
        flex:0 0 auto;
        margin:0;
        padding:
          10px 12px
          calc(10px + env(safe-area-inset-bottom,0px));
        border-top:1px solid rgba(125,211,252,.16);
        background:#030b18;
        box-shadow:0 -10px 24px rgba(0,0,0,.22);
      }

      #auroraNavCloud{
        width:100%;
        min-height:48px;
        display:grid;
        grid-template-columns:32px minmax(0,1fr) auto;
        align-items:center;
        gap:9px;
        padding:7px 9px;
        border:1px solid rgba(125,211,252,.18);
        border-radius:13px;
        color:#dcecff;
        background:linear-gradient(
          135deg,
          rgba(8,47,73,.38),
          rgba(15,23,42,.62)
        );
        text-align:left;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
      }

      #auroraNavCloud:hover,
      #auroraNavCloud:focus-visible{
        border-color:rgba(34,211,238,.42);
        outline:none;
      }

      #auroraNavCloud .aurora-nav-cloud-icon{
        width:30px;
        height:30px;
        display:grid;
        place-items:center;
        border-radius:9px;
        color:#9bdff4;
        background:rgba(8,47,73,.48);
        font-size:15px;
      }

      #auroraNavCloud .aurora-nav-cloud-copy{
        min-width:0;
      }

      #auroraNavCloud .aurora-nav-cloud-copy strong{
        display:block;
        overflow:hidden;
        color:#f0f8ff;
        font-size:11px;
        font-weight:900;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #auroraNavCloud .aurora-nav-cloud-copy span{
        display:block;
        margin-top:2px;
        overflow:hidden;
        color:#8297b3;
        font-size:8px;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #auroraNavCloud .aurora-nav-cloud-state{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:5px 8px;
        border:1px solid rgba(148,163,184,.22);
        border-radius:999px;
        color:#cbd5e1;
        background:rgba(30,41,59,.64);
        font-size:9px;
        font-weight:900;
        white-space:nowrap;
      }

      #auroraNavCloud .aurora-nav-cloud-state-dot{
        width:8px;
        height:8px;
        border-radius:50%;
        background:#94a3b8;
      }

      #auroraNavCloud[data-state="synced"] .aurora-nav-cloud-state{
        color:#a7f3d0;
        border-color:rgba(52,211,153,.38);
        background:rgba(6,78,59,.30);
      }

      #auroraNavCloud[data-state="synced"] .aurora-nav-cloud-state-dot{
        background:#34d399;
        box-shadow:0 0 0 4px rgba(52,211,153,.10);
        animation:auroraSyncedFlash 1.8s ease-in-out infinite;
      }

      #auroraNavCloud[data-state="working"] .aurora-nav-cloud-state{
        color:#a5f3fc;
        border-color:rgba(34,211,238,.36);
        background:rgba(8,47,73,.34);
      }

      #auroraNavCloud[data-state="working"] .aurora-nav-cloud-state-dot{
        background:#22d3ee;
        animation:auroraSyncedFlash 1.1s ease-in-out infinite;
      }

      #auroraNavCloud[data-state="attention"] .aurora-nav-cloud-state{
        color:#fde68a;
        border-color:rgba(251,191,36,.36);
        background:rgba(120,53,15,.30);
      }

      #auroraNavCloud[data-state="attention"] .aurora-nav-cloud-state-dot{
        background:#fbbf24;
      }

      #auroraNavCloud[data-state="error"] .aurora-nav-cloud-state{
        color:#fecdd3;
        border-color:rgba(251,113,133,.38);
        background:rgba(127,29,29,.30);
      }

      #auroraNavCloud[data-state="error"] .aurora-nav-cloud-state-dot{
        background:#fb7185;
      }

      @keyframes auroraSyncedFlash{
        0%,100%{
          opacity:1;
          transform:scale(1);
        }
        50%{
          opacity:.55;
          transform:scale(1.28);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function build(){
    if(document.getElementById("auroraNavPanel")) return;

    injectBottomCloudStyles();

    const toggle = document.createElement("button");
    toggle.id = "auroraNavToggle";
    toggle.type = "button";
    toggle.setAttribute(
      "aria-label",
      "Open Aurora navigation"
    );
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute(
      "aria-controls",
      "auroraNavPanel"
    );
    toggle.innerHTML =
      '<span aria-hidden="true"></span>';

    const overlay = document.createElement("div");
    overlay.id = "auroraNavOverlay";
    overlay.setAttribute("aria-hidden","true");

    const panel = document.createElement("aside");
    panel.id = "auroraNavPanel";
    panel.setAttribute(
      "aria-label",
      "Aurora City FC workflow and departments"
    );
    panel.setAttribute("aria-hidden","true");

    const workflowMarkup = WORKFLOW.map(
      function(step,index){
        const active = isWorkflowActive(step.href);

        return `
          <a
            class="aurora-nav-step${active ? " is-active" : ""}"
            href="${esc(step.href)}"
          >
            <span class="aurora-nav-step-number">${index + 1}</span>
            <span class="aurora-nav-step-copy">
              <strong>${esc(step.title)}</strong>
              <span>${esc(step.note)}</span>
            </span>
            <span class="aurora-nav-step-arrow" aria-hidden="true">›</span>
          </a>
        `;
      }
    ).join("");

    const departmentMarkup = DEPARTMENTS.map(
      function(item){
        const current =
          item[2].toLowerCase() === currentFile;

        return `
          <a
            class="aurora-nav-dept${current ? " is-current" : ""}"
            href="${esc(item[2])}"
          >
            <span class="aurora-nav-dept-icon" aria-hidden="true">${esc(item[0])}</span>
            <strong>${esc(item[1])}</strong>
            ${
              current
                ? '<span class="aurora-nav-current-tag">Current</span>'
                : '<span aria-hidden="true">›</span>'
            }
          </a>
        `;
      }
    ).join("");

    panel.innerHTML = `
      <header class="aurora-nav-head">
        <div class="aurora-nav-crest" aria-hidden="true">AFC</div>
        <div class="aurora-nav-brand">
          <strong>Aurora City FC</strong>
          <span>Mission Navigation</span>
        </div>
        <button
          class="aurora-nav-close"
          type="button"
          aria-label="Close Aurora navigation"
        >×</button>
      </header>

      <div class="aurora-nav-scroll">
        <section
          class="aurora-nav-section"
          aria-labelledby="auroraMissionLabel"
        >
          <h2
            class="aurora-nav-label"
            id="auroraMissionLabel"
          >
            Current mission — payday to completed transfer
          </h2>

          <p class="aurora-nav-mission-note">
            Follow these steps in order. Each link opens the actual working area you need.
          </p>

          <nav
            class="aurora-nav-route"
            aria-label="Payday and transfer workflow"
          >
            ${workflowMarkup}
          </nav>
        </section>

        <section
          class="aurora-nav-section"
          aria-labelledby="auroraDepartmentsLabel"
        >
          <h2
            class="aurora-nav-label"
            id="auroraDepartmentsLabel"
          >
            Departments
          </h2>

          <nav
            class="aurora-nav-departments"
            aria-label="Aurora departments"
          >
            ${departmentMarkup}
          </nav>
        </section>
      </div>

      <footer class="aurora-nav-foot">
        <button
          class="aurora-nav-cloud"
          id="auroraNavCloud"
          type="button"
          data-state="working"
          aria-label="Cloud Sync. Checking connection."
        >
          <span class="aurora-nav-cloud-icon" aria-hidden="true">☁</span>
          <span class="aurora-nav-cloud-copy">
            <strong>Cloud Sync</strong>
            <span>Checking Aurora Cloud connection</span>
          </span>
          <span class="aurora-nav-cloud-state">
            <span class="aurora-nav-cloud-state-dot" aria-hidden="true"></span>
            <span class="aurora-nav-cloud-state-label">Checking</span>
          </span>
        </button>
      </footer>
    `;

    document.body.append(toggle,overlay,panel);

    const closeButton =
      panel.querySelector(".aurora-nav-close");

    const cloudControl =
      panel.querySelector("#auroraNavCloud");

    function setOpen(open){
      document.body.classList.toggle(
        "aurora-nav-open",
        open
      );

      toggle.setAttribute(
        "aria-expanded",
        String(open)
      );

      toggle.setAttribute(
        "aria-label",
        open
          ? "Close Aurora navigation"
          : "Open Aurora navigation"
      );

      panel.setAttribute(
        "aria-hidden",
        String(!open)
      );

      overlay.setAttribute(
        "aria-hidden",
        String(!open)
      );

      if(open){
        window.setTimeout(function(){
          if(closeButton){
            closeButton.focus({
              preventScroll:true
            });
          }
        },40);
      }
    }

    toggle.addEventListener("click",function(){
      setOpen(
        !document.body.classList.contains(
          "aurora-nav-open"
        )
      );
    });

    closeButton.addEventListener(
      "click",
      function(){
        setOpen(false);
      }
    );

    overlay.addEventListener(
      "click",
      function(){
        setOpen(false);
      }
    );

    if(cloudControl){
      cloudControl.addEventListener(
        "click",
        function(){
          setOpen(false);
          location.href = "AuroraCloudSync.html";
        }
      );
    }

    panel.addEventListener(
      "click",
      function(event){
        if(event.target.closest("a[href]")){
          setOpen(false);
        }
      }
    );

    document.addEventListener(
      "keydown",
      function(event){
        if(
          event.key === "Escape"
          && document.body.classList.contains(
            "aurora-nav-open"
          )
        ){
          setOpen(false);
          toggle.focus({
            preventScroll:true
          });
        }
      }
    );

    window.addEventListener(
      "pageshow",
      function(){
        setOpen(false);
      }
    );

    wireCloudStatus();
  }

  if(document.readyState === "loading"){
    document.addEventListener(
      "DOMContentLoaded",
      build,
      {once:true}
    );
  }else{
    build();
  }
})();

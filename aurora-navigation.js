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
    ["🧠","Learning Centre","AuroraCityFC_LearningCentre.html"],
    ["▲","Training Ground","AuroraCityFC_TrainingGround.html"],
    ["⌕","Scouting Centre","AuroraCityFC_ScoutingCentre.html"],
    ["⇄","Transfer Centre","AuroraCityFC_TransferCentre.html"],
    ["♜","Boardroom","AuroraCityFC_Boardroom.html"],
    ["⚽","Matchday Centre","AuroraCityFC_MatchdayCentre.html"],
    ["●","Media Centre","AuroraCityFC_MediaCentre.html"],
  ];


  const MATCHDAY_MASTER_URL =
    "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";

  function setMatchdayStatus(state,label,detail){
    const badge = document.getElementById("auroraMatchdayStatus");
    if(!badge) return;
    badge.dataset.state = state;
    badge.textContent = label;
    badge.title = detail;
  }

  function sameLocalDay(a,b){
    return a && b
      && a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  async function refreshMatchdayStatus(){
    const now = new Date();

    try{
      const response = await fetch(
        MATCHDAY_MASTER_URL + "?matchdayStatus=" + Date.now(),
        {cache:"no-store"}
      );

      if(!response.ok){
        throw new Error("AuroraMaster unavailable");
      }

      const data = await response.json();
      const keys = [
        "MatchdayReport",
        "MatchdayReports",
        "DailyMatchReport",
        "PortfolioMatchReport"
      ];

      let reports = [];
      for(const key of keys){
        if(Array.isArray(data && data[key])){
          reports = data[key];
          break;
        }
      }

      const latest = reports
        .map(function(report){
          const value =
            report.report_date
            || report.date
            || report.Date
            || report.timestamp
            || report.submitted_at;

          const date = value ? new Date(value) : null;
          return {date:date,report:report};
        })
        .filter(function(item){
          return item.date
            && !Number.isNaN(item.date.getTime());
        })
        .sort(function(a,b){
          return b.date.getTime() - a.date.getTime();
        })[0];

      if(latest && sameLocalDay(latest.date,now)){
        const reportStatus = String(
          latest.report.status || ""
        ).trim().toUpperCase();

        if(reportStatus === "READY"){
          setMatchdayStatus(
            "ready",
            "Ready",
            "Today's Matchday report is published and ready"
          );
          return;
        }

        if(
          reportStatus === "ERROR"
          || reportStatus === "FAILED"
          || reportStatus === "EXPORT_FAILED"
        ){
          setMatchdayStatus(
            "error",
            "Error",
            "Today's Matchday report could not be published"
          );
          return;
        }

        setMatchdayStatus(
          "progress",
          "In progress",
          reportStatus === "EXPORT_PENDING"
            ? "Today's report is complete and waiting for the JSON export"
            : "Today's Matchday report is being prepared"
        );
        return;
      }

      const minutes =
        now.getHours() * 60 + now.getMinutes();

      if(minutes >= 17 * 60 && minutes < 19 * 60){
        setMatchdayStatus(
          "progress",
          "In progress",
          "Today's Matchday report is being prepared"
        );
        return;
      }

      setMatchdayStatus(
        "none",
        "No report",
        "No Matchday report has been published today"
      );
    }catch(error){
      console.warn(
        "Could not read Matchday report status.",
        error
      );

      setMatchdayStatus(
        "error",
        "Error",
        "Matchday report status is currently unavailable"
      );
    }
  }

  function wireMatchdayStatus(){
    refreshMatchdayStatus();
    window.setInterval(refreshMatchdayStatus,60000);
    window.addEventListener("focus",refreshMatchdayStatus);
  }

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


  const AURORA_MISSION_PROGRESS_KEY =
    "aurora_payday_mission_progress_v1";

  function loadMissionProgress(){
    try{
      const value = JSON.parse(
        localStorage.getItem(
          AURORA_MISSION_PROGRESS_KEY
        ) || "[]"
      );

      return Array.isArray(value)
        ? value.filter(function(index){
            return Number.isInteger(index)
              && index >= 0
              && index < WORKFLOW.length;
          })
        : [];
    }catch(_){
      return [];
    }
  }

  function saveMissionProgress(progress){
    localStorage.setItem(
      AURORA_MISSION_PROGRESS_KEY,
      JSON.stringify(progress)
    );

    window.dispatchEvent(
      new CustomEvent(
        "aurora-mission-progress-changed",
        {detail:{completed:progress}}
      )
    );
  }

  function isMissionComplete(index){
    return loadMissionProgress().includes(index);
  }

  function nextMissionIndex(){
    const completed = loadMissionProgress();

    for(let index = 0; index < WORKFLOW.length; index += 1){
      if(!completed.includes(index)){
        return index;
      }
    }

    return -1;
  }

  function setMissionComplete(index,complete){
    const progress = loadMissionProgress();
    const next = progress.filter(function(item){
      return item !== index;
    });

    if(complete){
      next.push(index);
      next.sort(function(a,b){
        return a - b;
      });
    }

    saveMissionProgress(next);
    refreshMissionProgressUi();
    wireMatchdayStatus();
  }

  function refreshMissionProgressUi(){
    const completed = loadMissionProgress();
    const nextIndex = nextMissionIndex();

    document.querySelectorAll(
      "#auroraNavPanel .aurora-nav-step"
    ).forEach(function(step){
      const index = Number(step.dataset.missionIndex);
      const done = completed.includes(index);
      const isNext = index === nextIndex;

      step.classList.toggle(
        "is-completed",
        done
      );

      step.classList.toggle(
        "is-next-mission",
        isNext
      );

      const button = step.querySelector(
        ".aurora-nav-complete-button"
      );

      const badge = step.querySelector(
        ".aurora-nav-completed-badge"
      );

      if(button){
        button.hidden = done;
        button.setAttribute(
          "aria-label",
          `Mark ${WORKFLOW[index].title} complete`
        );
      }

      if(badge){
        badge.hidden = !done;
      }
    });

    const summary = document.getElementById(
      "auroraMissionProgressSummary"
    );

    if(summary){
      if(completed.length === WORKFLOW.length){
        summary.textContent =
          "Mission complete — every transfer step is finished.";
      }else{
        summary.textContent =
          `${completed.length} of ${WORKFLOW.length} steps completed`;
      }
    }
  }

  function injectMissionProgressStyles(){
    if(document.getElementById("auroraMissionProgressStyles")) return;

    const style = document.createElement("style");
    style.id = "auroraMissionProgressStyles";
    style.textContent = `
      #auroraNavPanel .aurora-nav-mission-progress{
        margin:0 7px 10px;
        color:#94a3b8;
        font-size:9px;
        font-weight:750;
      }

      #auroraNavPanel .aurora-nav-step{
        grid-template-columns:
          34px minmax(0,1fr) auto;
      }

      #auroraNavPanel .aurora-nav-step-actions{
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:6px;
      }

      #auroraNavPanel .aurora-nav-complete-button[hidden],
      #auroraNavPanel .aurora-nav-completed-badge[hidden]{
        display:none!important;
      }

      #auroraNavPanel .aurora-nav-complete-button{
        min-width:30px;
        height:30px;
        display:grid;
        place-items:center;
        padding:0;
        border:1px solid rgba(251,191,36,.28);
        border-radius:9px;
        color:#fde68a;
        background:rgba(120,53,15,.22);
        cursor:pointer;
        font-size:14px;
        font-weight:900;
        -webkit-tap-highlight-color:transparent;
      }

      #auroraNavPanel .aurora-nav-complete-button:hover,
      #auroraNavPanel .aurora-nav-complete-button:focus-visible{
        color:#fff7c2;
        border-color:rgba(251,191,36,.58);
        background:rgba(146,64,14,.38);
        outline:none;
      }

      #auroraNavPanel .aurora-nav-completed-badge{
        display:inline-flex;
        align-items:center;
        gap:5px;
        padding:5px 8px;
        border:1px solid rgba(251,191,36,.42);
        border-radius:999px;
        color:#fde68a;
        background:
          linear-gradient(
            135deg,
            rgba(146,64,14,.36),
            rgba(120,53,15,.22)
          );
        box-shadow:
          0 0 14px rgba(251,191,36,.10);
        font-size:8px;
        font-weight:950;
        letter-spacing:.06em;
        text-transform:uppercase;
        white-space:nowrap;
      }

      #auroraNavPanel .aurora-nav-step.is-completed{
        border-color:rgba(251,191,36,.32);
        background:
          linear-gradient(
            90deg,
            rgba(146,64,14,.24),
            rgba(120,53,15,.10)
          );
        box-shadow:
          inset 3px 0 0 #fbbf24;
      }

      #auroraNavPanel
      .aurora-nav-step.is-completed
      .aurora-nav-step-number{
        color:#1c1202;
        border-color:#fbbf24;
        background:
          linear-gradient(
            135deg,
            #fde68a,
            #fbbf24
          );
        box-shadow:
          0 0 0 4px var(--aurora-nav-panel),
          0 0 16px rgba(251,191,36,.22);
      }

      #auroraNavPanel .aurora-nav-step.is-next-mission{
        border-color:rgba(34,211,238,.44);
        background:
          linear-gradient(
            90deg,
            rgba(8,145,178,.23),
            rgba(30,64,175,.10)
          );
        box-shadow:
          inset 3px 0 0 var(--aurora-nav-cyan);
      }

      #auroraNavPanel
      .aurora-nav-step.is-next-mission
      .aurora-nav-step-copy strong::after{
        content:"Next";
        display:inline-flex;
        margin-left:7px;
        padding:2px 5px;
        border-radius:999px;
        color:#a5f3fc;
        background:rgba(8,145,178,.18);
        font-size:7px;
        letter-spacing:.06em;
        text-transform:uppercase;
        vertical-align:middle;
      }
    `;

    document.head.appendChild(style);
  }


  function injectMatchdayBadgeStyles(){
    if(document.getElementById("auroraMatchdayBadgeStyles")) return;

    const style = document.createElement("style");
    style.id = "auroraMatchdayBadgeStyles";
    style.textContent = `
      #auroraNavPanel .aurora-nav-matchday-status{
        margin-left:auto;
        flex:0 0 auto;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        min-width:72px;
        padding:5px 8px;
        border:1px solid rgba(148,163,184,.28);
        border-radius:999px;
        color:#cbd5e1;
        background:rgba(30,41,59,.58);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
        font-size:8px;
        font-weight:950;
        letter-spacing:.075em;
        line-height:1;
        text-transform:uppercase;
        white-space:nowrap;
      }

      #auroraNavPanel .aurora-nav-matchday-status::before{
        content:"";
        width:7px;
        height:7px;
        flex:0 0 auto;
        border-radius:50%;
        background:#94a3b8;
        box-shadow:0 0 0 3px rgba(148,163,184,.10);
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="none"]{
        color:#fecdd3;
        border-color:rgba(251,113,133,.38);
        background:
          linear-gradient(
            135deg,
            rgba(127,29,29,.34),
            rgba(76,5,25,.24)
          );
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="none"]::before{
        background:#fb7185;
        box-shadow:
          0 0 0 3px rgba(251,113,133,.11),
          0 0 10px rgba(251,113,133,.28);
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="progress"]{
        color:#fde68a;
        border-color:rgba(251,191,36,.42);
        background:
          linear-gradient(
            135deg,
            rgba(120,53,15,.40),
            rgba(69,26,3,.27)
          );
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="progress"]::before{
        background:#fbbf24;
        box-shadow:
          0 0 0 3px rgba(251,191,36,.12),
          0 0 12px rgba(251,191,36,.38);
        animation:auroraMatchdayBadgePulse 1.35s ease-in-out infinite;
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="ready"]{
        color:#a7f3d0;
        border-color:rgba(52,211,153,.42);
        background:
          linear-gradient(
            135deg,
            rgba(6,78,59,.40),
            rgba(2,44,34,.27)
          );
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="ready"]::before{
        background:#34d399;
        box-shadow:
          0 0 0 3px rgba(52,211,153,.11),
          0 0 12px rgba(52,211,153,.42);
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="error"]{
        color:#fecaca;
        border-color:rgba(239,68,68,.48);
        background:
          linear-gradient(
            135deg,
            rgba(127,29,29,.46),
            rgba(69,10,10,.30)
          );
      }

      #auroraNavPanel .aurora-nav-matchday-status[data-state="error"]::before{
        background:#ef4444;
        box-shadow:
          0 0 0 3px rgba(239,68,68,.12),
          0 0 12px rgba(239,68,68,.42);
      }

      @keyframes auroraMatchdayBadgePulse{
        0%,100%{
          opacity:1;
          transform:scale(1);
        }
        50%{
          opacity:.5;
          transform:scale(1.30);
        }
      }
    `;

    document.head.appendChild(style);
  }


  function injectSidebarReadabilityStyles(){
    if(document.getElementById("auroraSidebarReadabilityStyles")) return;

    const style = document.createElement("style");
    style.id = "auroraSidebarReadabilityStyles";
    style.textContent = `
      /* Wider sidebar so the larger text still breathes */
      #auroraNavPanel{
        width:min(390px,92vw);
      }

      /* Header */
      #auroraNavPanel .aurora-nav-head{
        min-height:76px;
        padding:14px 15px;
        gap:12px;
      }

      #auroraNavPanel .aurora-nav-crest{
        width:48px;
        height:48px;
        border-radius:15px;
        font-size:14px;
        font-weight:950;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.08),
          0 0 20px rgba(34,211,238,.10);
      }

      #auroraNavPanel .aurora-nav-brand strong{
        font-size:17px;
        line-height:1.15;
      }

      #auroraNavPanel .aurora-nav-brand span{
        margin-top:4px;
        font-size:10px;
        letter-spacing:.18em;
      }

      #auroraNavPanel .aurora-nav-close{
        width:40px;
        height:40px;
        border-radius:13px;
        font-size:22px;
      }

      /* Section headings and helper text */
      #auroraNavPanel .aurora-nav-label{
        font-size:9px;
        letter-spacing:.20em;
        line-height:1.45;
      }

      #auroraNavPanel .aurora-nav-mission-note{
        font-size:11px;
        line-height:1.5;
      }

      #auroraNavPanel .aurora-nav-mission-progress{
        font-size:10px;
      }

      /* Mission rows */
      #auroraNavPanel .aurora-nav-step{
        min-height:57px;
        grid-template-columns:39px minmax(0,1fr) auto;
        gap:10px;
        padding:8px 9px;
        border-radius:14px;
      }

      #auroraNavPanel .aurora-nav-step-number{
        width:36px;
        height:36px;
        border-radius:11px;
        font-size:13px;
        font-weight:950;
      }

      #auroraNavPanel .aurora-nav-step-copy strong{
        font-size:12px;
        line-height:1.2;
      }

      #auroraNavPanel .aurora-nav-step-copy span{
        margin-top:4px;
        font-size:9px;
        line-height:1.25;
      }

      #auroraNavPanel .aurora-nav-complete-button{
        min-width:34px;
        width:34px;
        height:34px;
        border-radius:10px;
        font-size:16px;
      }

      #auroraNavPanel .aurora-nav-completed-badge{
        padding:6px 9px;
        font-size:8px;
      }

      /* Department rows */
      #auroraNavPanel .aurora-nav-dept{
        min-height:54px;
        grid-template-columns:40px minmax(0,1fr) auto;
        gap:11px;
        padding:7px 10px;
        border-radius:14px;
      }

      #auroraNavPanel .aurora-nav-dept strong{
        font-size:12px;
        font-weight:850;
        letter-spacing:.01em;
      }

      #auroraNavPanel .aurora-nav-dept > span:last-child:not(.aurora-nav-matchday-status){
        font-size:18px;
      }

      /* Larger, polished icon tiles */
      #auroraNavPanel .aurora-nav-dept-icon{
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        border:1px solid rgba(125,211,252,.18);
        border-radius:12px;
        color:#bcecff;
        background:
          radial-gradient(
            circle at 30% 20%,
            rgba(255,255,255,.10),
            transparent 42%
          ),
          linear-gradient(
            145deg,
            rgba(8,71,96,.72),
            rgba(6,32,54,.88)
          );
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.07),
          0 7px 15px rgba(0,0,0,.18);
        font-family:
          "Arial Unicode MS",
          "Segoe UI Symbol",
          system-ui,
          sans-serif;
        font-size:18px;
        font-weight:900;
        line-height:1;
        text-shadow:0 1px 8px rgba(34,211,238,.25);
        transition:
          transform .18s ease,
          border-color .18s ease,
          box-shadow .18s ease;
      }

      #auroraNavPanel .aurora-nav-dept:hover .aurora-nav-dept-icon,
      #auroraNavPanel .aurora-nav-dept:focus-visible .aurora-nav-dept-icon{
        transform:translateY(-1px) scale(1.04);
        border-color:rgba(34,211,238,.42);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.10),
          0 9px 18px rgba(0,0,0,.22),
          0 0 16px rgba(34,211,238,.12);
      }

      /* Department-specific accent colours */
      #auroraNavPanel
      .aurora-nav-dept[data-department="Aurora Nexus HQ"]
      .aurora-nav-dept-icon{
        color:#a5f3fc;
        background:linear-gradient(145deg,#155e75,#083344);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Manager Dashboard"]
      .aurora-nav-dept-icon{
        color:#bfdbfe;
        background:linear-gradient(145deg,#1e40af,#172554);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Finance Department"]
      .aurora-nav-dept-icon{
        color:#bbf7d0;
        background:linear-gradient(145deg,#166534,#052e16);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Squad Hub"]
      .aurora-nav-dept-icon{
        color:#fde68a;
        background:linear-gradient(145deg,#92400e,#451a03);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Analysis Room"]
      .aurora-nav-dept-icon{
        color:#ddd6fe;
        background:linear-gradient(145deg,#6d28d9,#2e1065);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Learning Centre"]
      .aurora-nav-dept-icon{
        color:#e9d5ff;
        background:
          radial-gradient(
            circle at 32% 24%,
            rgba(255,255,255,.14),
            transparent 42%
          ),
          linear-gradient(145deg,#7e22ce,#2e1065);
        text-shadow:
          0 1px 8px rgba(167,139,250,.35);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Training Ground"]
      .aurora-nav-dept-icon{
        color:#a7f3d0;
        background:linear-gradient(145deg,#047857,#022c22);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Scouting Centre"]
      .aurora-nav-dept-icon{
        color:#bae6fd;
        background:linear-gradient(145deg,#0369a1,#082f49);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Transfer Centre"]
      .aurora-nav-dept-icon{
        color:#fbcfe8;
        background:linear-gradient(145deg,#be185d,#500724);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Boardroom"]
      .aurora-nav-dept-icon{
        color:#fef3c7;
        background:linear-gradient(145deg,#a16207,#422006);
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Matchday Centre"]
      .aurora-nav-dept-icon{
        color:#f8fafc!important;
        background:
          radial-gradient(
            circle at 32% 25%,
            rgba(255,255,255,.14),
            transparent 40%
          ),
          linear-gradient(145deg,#0f766e,#042f2e);
        font-size:0!important;
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Matchday Centre"]
      .aurora-nav-dept-icon::before{
        content:"⚽";
        display:block;
        color:#fff;
        font-size:20px;
        filter:drop-shadow(0 2px 5px rgba(0,0,0,.35));
      }

      #auroraNavPanel
      .aurora-nav-dept[data-department="Media Centre"]
      .aurora-nav-dept-icon{
        color:#cffafe;
        background:linear-gradient(145deg,#0e7490,#083344);
      }

      /* Current tag and Matchday badge slightly larger */
      #auroraNavPanel .aurora-nav-current-tag{
        padding:5px 8px;
        font-size:8px;
        letter-spacing:.12em;
      }

      #auroraNavPanel .aurora-nav-matchday-status{
        min-width:78px;
        padding:6px 9px;
        font-size:8px;
      }

      /* Bottom Cloud Sync */
      #auroraNavCloud{
        min-height:55px;
        grid-template-columns:38px minmax(0,1fr) auto;
        gap:10px;
        padding:8px 10px;
      }

      #auroraNavCloud .aurora-nav-cloud-icon{
        width:36px;
        height:36px;
        border-radius:11px;
        font-size:18px;
      }

      #auroraNavCloud .aurora-nav-cloud-copy strong{
        font-size:12px;
      }

      #auroraNavCloud .aurora-nav-cloud-copy span{
        margin-top:3px;
        font-size:9px;
      }

      #auroraNavCloud .aurora-nav-cloud-state{
        padding:6px 9px;
        font-size:9px;
      }

      @media (max-width:430px){
        #auroraNavPanel{
          width:92vw;
        }

        #auroraNavPanel .aurora-nav-dept strong{
          font-size:11.5px;
        }
      }
    `;

    document.head.appendChild(style);
  }


  function injectSofterMissionColours(){
    if(document.getElementById("auroraSofterMissionColours")) return;

    const style = document.createElement("style");
    style.id = "auroraSofterMissionColours";
    style.textContent = `
      /*
        Keep the mission title as the visible link, while the smaller
        supporting line underneath displays as ordinary text.
      */
      #auroraNavPanel .aurora-nav-step-copy,
      #auroraNavPanel .aurora-nav-step-copy:link,
      #auroraNavPanel .aurora-nav-step-copy:visited,
      #auroraNavPanel .aurora-nav-step-copy:hover,
      #auroraNavPanel .aurora-nav-step-copy:active{
        color:inherit!important;
        text-decoration:none!important;
      }

      #auroraNavPanel .aurora-nav-step-copy strong{
        text-decoration:underline;
        text-decoration-thickness:1px;
        text-underline-offset:2px;
      }

      #auroraNavPanel .aurora-nav-step-copy span,
      #auroraNavPanel .aurora-nav-step.is-next-mission .aurora-nav-step-copy span,
      #auroraNavPanel .aurora-nav-step.is-active .aurora-nav-step-copy span{
        color:#9aa9bc!important;
        -webkit-text-fill-color:#9aa9bc!important;
        text-decoration:none!important;
        text-shadow:none!important;
      }

      /* Softer mission helper and progress copy */
      #auroraNavPanel .aurora-nav-mission-note,
      #auroraNavPanel .aurora-nav-mission-progress{
        color:#9aa9bc!important;
      }

      /* Replace the bright cyan connector line with a muted steel tone */
      #auroraNavPanel .aurora-nav-step:not(:last-child)::after{
        background:
          linear-gradient(
            to bottom,
            rgba(148,163,184,.42),
            rgba(100,116,139,.16)
          )!important;
        box-shadow:none!important;
      }

      /* Keep titles bright and crisp */
      #auroraNavPanel .aurora-nav-step-copy strong{
        color:#f3f7fc!important;
      }

      /* Active highlighting stays on the row, not on the helper text. */
    `;

    document.head.appendChild(style);
  }




  /* ===================== UNIVERSAL AURORA HEADER ===================== */

  const AURORA_PAGE_TITLES = {
    "auroracityfc_nexusmaster.html":"Aurora Nexus HQ",
    "auroracityfc_managerdashboard.html":"Manager Dashboard",
    "auroracityfc_financedepartment.html":"Finance Department",
    "auroracityfc_squadhub.html":"Squad Hub",
    "auroracityfc_analysisroom.html":"Analysis Room",
    "auroracityfc_learningcentre.html":"Learning Centre",
    "auroracityfc_trainingground.html":"Training Ground",
    "auroracityfc_scoutingcentre.html":"Scouting Centre",
    "auroracityfc_transfercentre.html":"Transfer Centre",
    "auroracityfc_boardroom.html":"Boardroom",
    "auroracityfc_matchdaycentre.html":"Matchday Centre",
    "auroracityfc_mediacentre.html":"Media Centre",
    "auroracloudsync.html":"Cloud Sync",
    "auroracityfc_registrationdesk.html":"Registration Desk"
  };

  function currentAuroraDepartment(){
    return (
      AURORA_PAGE_TITLES[currentFile]
      || String(document.title || "")
        .replace(/^Aurora City FC\s*[—|-]\s*/i,"")
        .replace(/\s*[—|-].*$/,"")
        .trim()
      || "Aurora Club System"
    );
  }

  function pageOwnsAuroraHeader(){
    return String(
      document.documentElement.dataset.auroraHeader || ""
    ).toLowerCase() === "page";
  }

  function wirePageHeaderLogout(button,shell){
    if(!button || button.dataset.wired === "true") return;

    button.dataset.wired = "true";
    button.addEventListener("click",function(){
      if(
        shell
        && shell.logout
        && typeof shell.logout.click === "function"
      ){
        shell.logout.click();
        return;
      }

      const oldLogout = Array.from(
        document.querySelectorAll("button,a")
      ).find(function(node){
        const value = String(node.textContent || "")
          .replace(/\s+/g," ")
          .trim()
          .toLowerCase();

        return (
          node !== button
          && (value === "log out" || value === "logout")
        );
      });

      if(oldLogout && typeof oldLogout.click === "function"){
        oldLogout.click();
        return;
      }

      try{
        localStorage.removeItem("aurora_session");
        localStorage.removeItem("aurora_manager_session");
        sessionStorage.clear();
      }catch(_){}

      location.href = "index.html";
    });
  }

  function installUniversalControlsIntoPageHeader(toggle,shell){
    if(!pageOwnsAuroraHeader()) return false;

    const topbar = document.querySelector(
      ".fm-workspace > .topbar"
    );

    const inner = topbar && topbar.querySelector(
      ".topbar-inner"
    );

    const brand = inner && inner.querySelector(".brand");
    const context = inner && inner.querySelector(
      ".fm-top-context"
    );

    if(!topbar || !inner || !brand || !context) return false;

    document.body.classList.add("aurora-page-owned-header");
    document.body.style.removeProperty("padding-top");

    const oldPath = context.querySelector(".fm-page-path");
    if(oldPath) oldPath.hidden = true;

    toggle.setAttribute(
      "aria-label",
      "Open Aurora mission navigation"
    );
    toggle.title = "Open mission navigation";

    /*
      Keep a stable page-header menu button in the black header.
      The real navigation toggle remains hidden and only acts as the
      controller, so it cannot detach and reappear halfway down the page.
    */
    let menuButton = brand.querySelector(
      "#auroraPageHeaderMenuButton"
    );

    if(!menuButton){
      menuButton = document.createElement("button");
      menuButton.id = "auroraPageHeaderMenuButton";
      menuButton.type = "button";
      menuButton.textContent = "☰";
      menuButton.setAttribute(
        "aria-label",
        "Open Aurora mission navigation"
      );
      menuButton.title = "Open mission navigation";
      brand.insertBefore(menuButton,brand.firstChild);
    }

    if(menuButton.dataset.auroraMenuBound !== "true"){
      menuButton.dataset.auroraMenuBound = "true";
      menuButton.addEventListener("click",function(event){
        event.preventDefault();
        event.stopPropagation();
        toggle.click();
      });
    }

    if(toggle.parentElement !== document.body){
      document.body.appendChild(toggle);
    }

    toggle.style.setProperty(
      "display",
      "none",
      "important"
    );

    let department = context.querySelector(
      ".aurora-page-header-department"
    );

    if(!department){
      department = document.createElement("span");
      department.className = "aurora-page-header-department";
      context.appendChild(department);
    }

    department.textContent = currentAuroraDepartment();

    let logout = context.querySelector(
      ".aurora-page-header-logout"
    );

    if(!logout){
      logout = document.createElement("button");
      logout.type = "button";
      logout.className = "aurora-page-header-logout";
      logout.textContent = "Log out";
      context.appendChild(logout);
    }

    wirePageHeaderLogout(logout,shell);

    const localHeader = document.getElementById(
      "auroraUniversalHeader"
    );

    if(localHeader) localHeader.remove();

    if(shell){
      shell.header.style.setProperty(
        "display",
        "none",
        "important"
      );
      shell.header.setAttribute("aria-hidden","true");
      shell.header.dataset.auroraHiddenForPageHeader = "true";
      shell.document.body.classList.add(
        "aurora-page-owned-header-shell"
      );
      document.body.classList.add("aurora-running-in-app-shell");
    }else{
      document.body.classList.remove("aurora-running-in-app-shell");
    }

    return true;
  }

  function injectUniversalHeaderStyles(){
    if(document.getElementById("auroraUniversalHeaderStyles")) return;

    const style = document.createElement("style");
    style.id = "auroraUniversalHeaderStyles";
    style.textContent = `
      :root{
        --aurora-universal-header-height:72px;
      }

      body{
        padding-top:var(--aurora-universal-header-height)!important;
      }

      #auroraUniversalHeader{
        position:fixed;
        top:0;
        left:0;
        right:0;
        z-index:2147483000;
        height:var(--aurora-universal-header-height);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:
          calc(8px + env(safe-area-inset-top,0px))
          14px
          8px;
        border-bottom:1px solid rgba(125,211,252,.16);
        background:
          linear-gradient(
            90deg,
            rgba(3,15,30,.98),
            rgba(4,16,36,.98),
            rgba(10,16,48,.98)
          );
        box-shadow:0 10px 28px rgba(0,0,0,.22);
        backdrop-filter:blur(16px);
        -webkit-backdrop-filter:blur(16px);
      }

      #auroraUniversalHeader .aurora-universal-left,
      #auroraUniversalHeader .aurora-universal-right{
        display:flex;
        align-items:center;
        min-width:0;
      }

      #auroraUniversalHeader .aurora-universal-left{
        gap:10px;
        flex:1 1 auto;
      }

      #auroraUniversalHeader .aurora-universal-right{
        justify-content:flex-end;
        gap:12px;
        flex:0 0 auto;
      }

      #auroraUniversalHeader .aurora-universal-crest{
        width:38px;
        height:38px;
        flex:0 0 auto;
        display:grid;
        place-items:center;
        border:1px solid rgba(125,211,252,.24);
        border-radius:12px;
        color:#dff7ff;
        background:
          radial-gradient(
            circle at 30% 20%,
            rgba(255,255,255,.10),
            transparent 42%
          ),
          linear-gradient(145deg,#155e75,#082f49);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.08),
          0 7px 16px rgba(0,0,0,.18);
        font-size:10px;
        font-weight:950;
        letter-spacing:.04em;
      }

      #auroraUniversalHeader .aurora-universal-brand{
        min-width:0;
      }

      #auroraUniversalHeader .aurora-universal-brand strong{
        display:block;
        overflow:hidden;
        color:#f5fbff;
        font-size:13px;
        font-weight:950;
        line-height:1.15;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #auroraUniversalHeader .aurora-universal-brand span{
        display:block;
        margin-top:3px;
        overflow:hidden;
        color:#a9bdd2;
        font-size:10px;
        font-weight:750;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #auroraUniversalHeader .aurora-universal-department{
        display:inline-flex;
        align-items:center;
        gap:8px;
        color:#b7c7dd;
        font-size:10px;
        font-weight:900;
        letter-spacing:.14em;
        text-transform:uppercase;
        white-space:nowrap;
      }

      #auroraUniversalHeader .aurora-universal-department::before{
        content:"";
        width:8px;
        height:8px;
        flex:0 0 auto;
        border-radius:50%;
        background:#34d399;
        box-shadow:
          0 0 0 4px rgba(52,211,153,.10),
          0 0 13px rgba(52,211,153,.45);
      }

      #auroraUniversalHeader .aurora-universal-logout{
        min-height:36px;
        padding:0 14px;
        border:1px solid rgba(251,113,133,.34);
        border-radius:12px;
        color:#fecdd3;
        background:
          linear-gradient(
            145deg,
            rgba(76,5,25,.76),
            rgba(44,7,20,.90)
          );
        font-size:10px;
        font-weight:950;
        letter-spacing:.13em;
        text-transform:uppercase;
        cursor:pointer;
      }

      #auroraUniversalHeader .aurora-universal-logout:hover,
      #auroraUniversalHeader .aurora-universal-logout:focus-visible{
        border-color:rgba(251,113,133,.58);
        outline:none;
      }

      #auroraUniversalHeader #auroraNavToggle{
        position:static!important;
        inset:auto!important;
        transform:none!important;
        flex:0 0 auto!important;
        width:40px!important;
        height:40px!important;
        min-width:40px!important;
        margin:0!important;
        border:1px solid rgba(125,211,252,.24)!important;
        border-radius:13px!important;
        color:#dff7ff!important;
        background:
          linear-gradient(
            145deg,
            rgba(8,47,73,.92),
            rgba(15,23,42,.98)
          )!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.07),
          0 8px 18px rgba(0,0,0,.20)!important;
        z-index:auto!important;
        opacity:1!important;
        display:grid!important;
      }

      /*
        Hide every old page/app header. The universal header is now the
        only visible Aurora header in every environment.
      */
      body > .topbar,
      body > header.topbar,
      .app > .topbar,
      .app > header.topbar,
      body > .app-header,
      body > .site-header,
      body > .global-header,
      body > header[role="banner"]:not(#auroraUniversalHeader){
        display:none!important;
      }


      body.aurora-page-owned-header{
        padding-top:0!important;
      }

      body.aurora-page-owned-header #auroraUniversalHeader{
        display:none!important;
      }

      body.aurora-page-owned-header .fm-workspace > .topbar{
        display:block!important;
        position:sticky!important;
        top:0!important;
      }

      body.aurora-page-owned-header .topbar-inner .brand{
        flex:1 1 auto;
      }

      body.aurora-page-owned-header #auroraNavToggle{
        display:none!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }

      body.aurora-page-owned-header .topbar-inner #auroraPageHeaderMenuButton{
        position:static!important;
        inset:auto!important;
        transform:none!important;
        width:42px!important;
        height:42px!important;
        min-width:42px!important;
        flex:0 0 42px!important;
        display:grid!important;
        place-items:center!important;
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(125,211,252,.26)!important;
        border-radius:13px!important;
        color:#dff7ff!important;
        background:
          linear-gradient(
            145deg,
            rgba(8,47,73,.92),
            rgba(15,23,42,.98)
          )!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.07),
          0 8px 18px rgba(0,0,0,.20)!important;
        font:900 20px/1 system-ui,sans-serif!important;
        cursor:pointer!important;
        z-index:auto!important;
        opacity:1!important;
      }

      body.aurora-page-owned-header .fm-shell,
      body.aurora-page-owned-header .fm-workspace{
        overflow:visible!important;
      }

      body.aurora-page-owned-header .fm-page-path{
        display:none!important;
      }

      body.aurora-page-owned-header .fm-top-context{
        justify-content:flex-end;
        flex:0 1 auto;
        min-width:0;
        flex-wrap:nowrap;
      }

      body.aurora-page-owned-header .aurora-page-header-department{
        display:inline-flex;
        align-items:center;
        gap:8px;
        color:#b7c7dd;
        font-size:10px;
        font-weight:900;
        letter-spacing:.12em;
        text-transform:uppercase;
        white-space:nowrap;
      }

      body.aurora-page-owned-header .aurora-page-header-department::before{
        content:"";
        width:8px;
        height:8px;
        flex:0 0 auto;
        border-radius:50%;
        background:#34d399;
        box-shadow:
          0 0 0 4px rgba(52,211,153,.10),
          0 0 13px rgba(52,211,153,.45);
      }

      body.aurora-page-owned-header .aurora-page-header-logout{
        min-height:38px;
        padding:0 14px;
        border:1px solid rgba(251,113,133,.34);
        border-radius:12px;
        color:#fecdd3;
        background:
          linear-gradient(
            145deg,
            rgba(76,5,25,.76),
            rgba(44,7,20,.90)
          );
        font-size:10px;
        font-weight:950;
        letter-spacing:.12em;
        text-transform:uppercase;
        white-space:nowrap;
        cursor:pointer;
      }

      body.aurora-page-owned-header .aurora-page-header-logout:hover,
      body.aurora-page-owned-header .aurora-page-header-logout:focus-visible{
        border-color:rgba(251,113,133,.58);
        outline:none;
      }

      @media(max-width:1120px){
        body.aurora-page-owned-header .topbar-inner{
          gap:10px;
        }

        body.aurora-page-owned-header .fm-top-context{
          gap:7px;
        }

        body.aurora-page-owned-header .aurora-page-header-department{
          display:none;
        }
      }

      @media(max-width:760px){
        body.aurora-page-owned-header .topbar-inner{
          align-items:center;
          flex-wrap:wrap;
        }

        body.aurora-page-owned-header .brand{
          min-width:min(100%,360px);
        }

        body.aurora-page-owned-header .fm-top-context{
          width:100%;
          justify-content:flex-start;
          flex-wrap:wrap;
        }

        body.aurora-page-owned-header .aurora-page-header-department{
          display:inline-flex;
        }
      }

      body.aurora-running-in-app-shell{
        padding-top:0!important;
      }

      body.aurora-running-in-app-shell #auroraUniversalHeader{
        display:none!important;
      }

      @media(max-width:760px){
        :root{
          --aurora-universal-header-height:68px;
        }

        #auroraUniversalHeader{
          padding-left:10px;
          padding-right:10px;
          gap:10px;
        }

        #auroraUniversalHeader .aurora-universal-right{
          gap:8px;
        }

        #auroraUniversalHeader .aurora-universal-department{
          font-size:9px;
          letter-spacing:.10em;
        }

        #auroraUniversalHeader .aurora-universal-logout{
          padding:0 10px;
          font-size:9px;
        }

        #auroraUniversalHeader .aurora-universal-brand strong{
          font-size:12px;
        }

        #auroraUniversalHeader .aurora-universal-brand span{
          font-size:9px;
        }
      }

      @media(max-width:560px){
        #auroraUniversalHeader .aurora-universal-department{
          display:none;
        }
      }
    `;

    document.head.appendChild(style);
  }


  function getVerifiedAuroraAppShell(){
    try{
      if(!window.parent || window.parent === window) return null;

      const parentDocument = window.parent.document;
      if(!parentDocument || !parentDocument.body) return null;

      const parentText = String(parentDocument.body.textContent || "")
        .replace(/\s+/g," ")
        .trim()
        .toLowerCase();

      const hasAuroraBrand =
        parentText.includes("aurora city fc");

      const hasManagerSession =
        parentText.includes("manager session")
        && parentText.includes("webby");

      const hasLogout =
        parentText.includes("log out")
        || parentText.includes("logout");

      if(
        !hasAuroraBrand
        || !hasManagerSession
        || !hasLogout
      ){
        return null;
      }

      const headerCandidates = Array.from(
        parentDocument.querySelectorAll(
          "header,.topbar,.app-header,.global-header," +
          "[data-aurora-header],[role='banner']"
        )
      );

      const header = headerCandidates.find(function(node){
        const value = String(node.textContent || "")
          .replace(/\s+/g," ")
          .trim()
          .toLowerCase();

        return (
          value.includes("aurora city fc")
          && value.includes("manager session")
          && value.includes("webby")
          && (
            value.includes("log out")
            || value.includes("logout")
          )
        );
      });

      if(!header) return null;

      const brand =
        header.querySelector(".session-brand");

      const route =
        header.querySelector(".session-route");

      const actions =
        header.querySelector(".session-actions");

      const logout =
        header.querySelector(".logout-button");

      return {
        document:parentDocument,
        header:header,
        brand:brand,
        route:route,
        actions:actions,
        logout:logout
      };
    }catch(_){
      return null;
    }
  }

  function installMenuIntoAuroraAppShell(toggle){
    const shell = getVerifiedAuroraAppShell();
    if(!shell) return false;

    if(pageOwnsAuroraHeader()){
      return installUniversalControlsIntoPageHeader(
        toggle,
        shell
      );
    }

    shell.header.style.removeProperty("display");
    shell.header.removeAttribute("aria-hidden");
    delete shell.header.dataset.auroraHiddenForPageHeader;
    shell.document.body.classList.remove(
      "aurora-page-owned-header-shell"
    );

    const parentDocument = shell.document;
    const header = shell.header;
    const brand = shell.brand;
    const route = shell.route;
    const actions = shell.actions;
    const logout = shell.logout;

    let button = parentDocument.getElementById(
      "auroraTopHeaderMenuButton"
    );

    /*
      The app shell survives while department pages change.
      Replace the proxy button so it always controls the current page.
    */
    if(button){
      const fresh = button.cloneNode(true);
      button.replaceWith(fresh);
      button = fresh;
    }else{
      button = parentDocument.createElement("button");
      button.id = "auroraTopHeaderMenuButton";
      button.type = "button";
      button.textContent = "☰";
    }

    button.setAttribute(
      "aria-label",
      "Open Aurora mission navigation"
    );
    button.title = "Open mission navigation";

    button.style.cssText = [
      "position:static!important",
      "inset:auto!important",
      "width:40px!important",
      "height:40px!important",
      "min-width:40px!important",
      "flex:0 0 40px!important",
      "display:grid!important",
      "place-items:center!important",
      "margin:0 10px 0 0!important",
      "padding:0!important",
      "border:1px solid rgba(125,211,252,.28)!important",
      "border-radius:13px!important",
      "color:#dff7ff!important",
      "background:linear-gradient(145deg,rgba(8,47,73,.94),rgba(15,23,42,.98))!important",
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 18px rgba(0,0,0,.22)!important",
      "font:900 20px/1 system-ui,sans-serif!important",
      "cursor:pointer!important",
      "z-index:auto!important"
    ].join(";");

    button.onclick = function(event){
      event.preventDefault();
      event.stopPropagation();

      if(
        toggle
        && toggle.isConnected
        && typeof toggle.click === "function"
      ){
        toggle.click();
      }
    };

    /*
      Exact Aurora GameShell layout:
      menu button + session brand on the left.
    */
    if(brand){
      brand.style.setProperty("display","flex","important");
      brand.style.setProperty("align-items","center","important");
      brand.style.setProperty("justify-content","flex-start","important");
      brand.style.setProperty("gap","10px","important");
      brand.style.setProperty("margin-right","auto","important");
      brand.insertBefore(button,brand.firstElementChild);
    }else{
      header.prepend(button);
    }

    /*
      Current department route goes into the existing right-side
      action group immediately before Log out.
    */
    if(actions){
      actions.style.setProperty("display","flex","important");
      actions.style.setProperty("align-items","center","important");
      actions.style.setProperty("justify-content","flex-end","important");
      actions.style.setProperty("gap","10px","important");
      actions.style.setProperty("margin-left","auto","important");

      if(route && route.parentElement !== actions){
        actions.insertBefore(route,logout || actions.firstChild);
      }

      if(logout && logout.parentElement !== actions){
        actions.appendChild(logout);
      }
    }

    header.style.setProperty("display","flex","important");
    header.style.setProperty("align-items","center","important");
    header.style.setProperty("justify-content","space-between","important");

    toggle.style.setProperty(
      "display",
      "none",
      "important"
    );

    /*
      Remove the local universal header if this page was previously
      rendered outside the app and then restored inside the shell.
    */
    const localHeader =
      document.getElementById("auroraUniversalHeader");

    if(localHeader){
      localHeader.remove();
    }

    document.body.style.removeProperty("padding-top");
    document.body.classList.add("aurora-running-in-app-shell");

    return true;
  }

  function buildUniversalAuroraHeader(toggle){
    injectUniversalHeaderStyles();

    /*
      Inside the installed Aurora app, first detect the persistent shell.
      Opt-in pages hide that shell header and move the shared controls into
      their own black department header.
    */
    if(installMenuIntoAuroraAppShell(toggle)){
      return null;
    }

    /*
      Outside the installed app, an opt-in page uses its own black header
      instead of building the separate navy universal header.
    */
    if(
      pageOwnsAuroraHeader()
      && installUniversalControlsIntoPageHeader(toggle,null)
    ){
      return null;
    }

    document.body.classList.remove("aurora-running-in-app-shell");

    let header = document.getElementById("auroraUniversalHeader");

    if(!header){
      header = document.createElement("header");
      header.id = "auroraUniversalHeader";
      header.setAttribute("role","banner");
      header.innerHTML = `
        <div class="aurora-universal-left">
          <div class="aurora-universal-crest" aria-hidden="true">AFC</div>
          <div class="aurora-universal-brand">
            <strong>Aurora City FC</strong>
            <span>Manager Session • Webby</span>
          </div>
        </div>

        <div class="aurora-universal-right">
          <div class="aurora-universal-department">
            ${esc(currentAuroraDepartment())}
          </div>
          <button
            id="auroraUniversalLogout"
            class="aurora-universal-logout"
            type="button"
          >
            Log out
          </button>
        </div>
      `;

      document.body.prepend(header);
    }

    const left = header.querySelector(".aurora-universal-left");
    const crest = header.querySelector(".aurora-universal-crest");

    if(toggle && left && crest){
      left.insertBefore(toggle,crest);
      toggle.style.removeProperty("display");
    }

    const logout = header.querySelector("#auroraUniversalLogout");

    if(logout && !logout.dataset.wired){
      logout.dataset.wired = "true";

      logout.addEventListener("click",function(){
        const oldLogout = Array.from(
          document.querySelectorAll("button,a")
        ).find(function(node){
          const value = String(node.textContent || "")
            .replace(/\s+/g," ")
            .trim()
            .toLowerCase();

          return (
            node !== logout
            && (value === "log out" || value === "logout")
          );
        });

        if(oldLogout && typeof oldLogout.click === "function"){
          oldLogout.click();
          return;
        }

        try{
          localStorage.removeItem("aurora_session");
          localStorage.removeItem("aurora_manager_session");
          sessionStorage.clear();
        }catch(_){}

        location.href = "index.html";
      });
    }

    return header;
  }

  function build(){
    if(document.getElementById("auroraNavPanel")) return;

    injectUniversalHeaderStyles();
    injectSofterMissionColours();
    injectSidebarReadabilityStyles();
    injectMatchdayBadgeStyles();
    injectMissionProgressStyles();

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
        const complete = isMissionComplete(index);

        return `
          <div
            class="aurora-nav-step${active ? " is-active" : ""}${complete ? " is-completed" : ""}"
            data-mission-index="${index}"
          >
            <span class="aurora-nav-step-number">${index + 1}</span>

            <a
              class="aurora-nav-step-copy"
              href="${esc(step.href)}"
            >
              <strong>${esc(step.title)}</strong>
              <span>${esc(step.note)}</span>
            </a>

            <span class="aurora-nav-step-actions">
              <button
                class="aurora-nav-complete-button"
                type="button"
                data-complete-mission="${index}"
                ${complete ? "hidden" : ""}
                aria-label="Mark ${esc(step.title)} complete"
                title="Mark complete"
              >✓</button>

              <button
                class="aurora-nav-completed-badge"
                type="button"
                data-reopen-mission="${index}"
                ${complete ? "" : "hidden"}
                aria-label="Mark ${esc(step.title)} incomplete"
                title="Tap to undo"
              >
                ✓ Completed
              </button>
            </span>
          </div>
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
            data-department="${esc(item[1])}"
            href="${esc(item[2])}"
          >
            <span class="aurora-nav-dept-icon" aria-hidden="true">${esc(item[0])}</span>
            <strong>${esc(item[1])}</strong>
            ${
              item[1] === "Matchday Centre"
                ? '<span class="aurora-nav-matchday-status" id="auroraMatchdayStatus" data-state="none">No report</span>'
                : current
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

          <p
            class="aurora-nav-mission-progress"
            id="auroraMissionProgressSummary"
          ></p>

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

    /*
      Clean up remnants created by older navigation builds.
      This does not touch any genuine page/app header.
    */

    buildUniversalAuroraHeader(toggle);

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
        const completeButton =
          event.target.closest(
            "[data-complete-mission]"
          );

        if(completeButton){
          event.preventDefault();
          event.stopPropagation();

          setMissionComplete(
            Number(
              completeButton.dataset.completeMission
            ),
            true
          );
          return;
        }

        const reopenButton =
          event.target.closest(
            "[data-reopen-mission]"
          );

        if(reopenButton){
          event.preventDefault();
          event.stopPropagation();

          setMissionComplete(
            Number(
              reopenButton.dataset.reopenMission
            ),
            false
          );
          return;
        }
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
        buildUniversalAuroraHeader(toggle);
        buildUniversalAuroraHeader(toggle);
      }
    );

    window.addEventListener(
      "resize",
      function(){
        buildUniversalAuroraHeader(toggle);
      }
    );

    wireCloudStatus();
    refreshMissionProgressUi();

    window.addEventListener(
      "aurora-mission-progress-changed",
      refreshMissionProgressUi
    );
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


(() => {
  "use strict";

  const BUILD = "20260728-universal-sidebar-1";
  const AUTO_CLOSE_MS = 5000;
  const OPEN_UNTIL_KEY = "auroraSidebarOpenUntil";
  const MANUAL_CLOSED_KEY = "auroraSidebarManualClosed";

  const pages = [
    { key:"home", label:"Home", href:"AuroraCityFC_ManagerDashboard.html", icon:"⌂", colour:"#60a5fa", rgb:"96,165,250", group:"Navigation" },
    { key:"finance", label:"Finance Department", href:"AuroraCityFC_FinanceDepartment.html", icon:"£", colour:"#f3c45b", rgb:"243,196,91", group:"Finance" },
    { key:"squad-hub", label:"Squad Hub", href:"AuroraCityFC_SquadHub.html", icon:"♟", colour:"#22d3ee", rgb:"34,211,238", group:"Performance" },
    { key:"analysis-room", label:"Analysis Room", href:"AuroraCityFC_AnalysisRoom.html", icon:"⌁", colour:"#a78bfa", rgb:"167,139,250", group:"Performance" },
    { key:"training-ground", label:"Training Ground", href:"AuroraCityFC_TrainingGround.html", icon:"▲", colour:"#34d399", rgb:"52,211,153", group:"Performance" },
    { key:"scouting-centre", label:"Scouting Centre", href:"AuroraCityFC_ScoutingCentre.html", icon:"⌕", colour:"#4ade80", rgb:"74,222,128", group:"Recruitment" },
    { key:"transfer-centre", label:"Transfer Centre", href:"AuroraCityFC_TransferCentre.html", icon:"⇄", colour:"#f59e0b", rgb:"245,158,11", group:"Recruitment" },
    { key:"boardroom", label:"Boardroom", href:"AuroraCityFC_Boardroom.html", icon:"♜", colour:"#f472b6", rgb:"244,114,182", group:"Club" },
    { key:"media-centre", label:"Media Centre", href:"AuroraCityFC_MediaCentre.html", icon:"●", colour:"#facc15", rgb:"250,204,21", group:"Club" }
  ];

  const pageSubmenus = {
    "finance": [
      ["finance-overview","Overview"],["payday-plan","Payday Plan"],["income-builder","Income Builder"],
      ["holdings","Holdings"],["dividends","Dividends"],["watchlist","Watchlist"]
    ],
    "squad-hub": [
      ["squad-overview","Overview"],["squad-summary","Squad Summary"],["first-team-formation","Formation"],
      ["starting-xi","Starting XI"],["bench-depth-chart","Bench"],["positional-depth-chart","Depth Chart"],
      ["chemistry-legends","Chemistry & Legends"],["squad-development-centre","Development Centre"]
    ],
    "training-ground": [
      ["training-overview","Overview"],["training-plan","Training Plan"],["training-report","Training Report"],
      ["fitness-centre","Fitness Centre"],["development","Development"]
    ],
    "scouting-centre": [
      ["scouting-overview","Overview"],["chief-scout-report","Chief Scout Report"],["scouting-best-xi","Best XI"],
      ["rescouting-desk","Re-scouting Desk"],["scouting-radar","Scouting Radar"],["scout-assignments","Assignments"],
      ["scouting-pipeline","Pipeline"],["reports","League Tables"],["meeting","Recruitment Meeting"]
    ],
    "transfer-centre": [
      ["transfer-overview","Overview"],["best-return-allocation","Best Return"],["top-transfer-board","Top Targets"],
      ["deal-sheet","Deal Sheet"],["registration-desk","Registration"],["incoming-offers","Incoming Offers"],
      ["sell-desk","Sell Desk"],["transfer-bench","Transfer Bench"],["no-buy-watch","No-buy Watch"]
    ],
    "boardroom": [
      ["board-overview","Overview"],["club-strategy","Club Strategy"],["board-confidence","Board Confidence"],
      ["objectives","Objectives"],["governance","Governance"]
    ],
    "media-centre": [
      ["media-overview","Overview"],["press-room","Press Room"],["news-feed","News Feed"],
      ["sentiment","Sentiment"],["communications","Communications"]
    ]
  };

  function detectPage() {
    const declared = (
      document.documentElement.dataset.auroraPage ||
      document.body?.dataset.auroraPage ||
      ""
    ).toLowerCase();
    if (declared) return declared;

    const file = location.pathname.split("/").pop().toLowerCase();
    const title = document.title.toLowerCase();

    const checks = [
      ["finance", "financedepartment", "finance department"],
      ["squad-hub", "squadhub", "squad hub"],
      ["analysis-room", "analysisroom", "analysis room"],
      ["training-ground", "trainingground", "training ground"],
      ["scouting-centre", "scoutingcentre", "scouting centre"],
      ["transfer-centre", "transfercentre", "transfer centre"],
      ["boardroom", "boardroom", "boardroom"],
      ["media-centre", "mediacentre", "media centre"],
      ["home", "managerdashboard", "manager dashboard"]
    ];

    for (const [key, fileNeedle, titleNeedle] of checks) {
      if (file.includes(fileNeedle) || title.includes(titleNeedle)) return key;
    }
    return "home";
  }

  function injectStyles() {
    document.getElementById("auroraUniversalNavigationStyles")?.remove();

    const style = document.createElement("style");
    style.id = "auroraUniversalNavigationStyles";
    style.textContent = `
      :root{--aurora-sidebar-width:238px;--aurora-sidebar-compact:214px}
      html{scroll-behavior:smooth}
      body{overflow-x:hidden!important}
      body>.fm-sidebar:not(#auroraUniversalSidebar),
      body .aufc-sidebar,
      body .aufc-mobile-button,
      body .aufc-mobile-shade{display:none!important}

      #auroraUniversalSidebar{
        position:fixed!important;inset:0 auto 0 0!important;
        width:var(--aurora-sidebar-width)!important;height:100dvh!important;
        z-index:2147483000!important;display:grid!important;
        grid-template-rows:auto minmax(0,1fr) auto!important;
        overflow:hidden!important;visibility:visible!important;opacity:1!important;
        pointer-events:auto!important;transform:translateX(0)!important;
        border-right:1px solid rgba(125,211,252,.18)!important;
        background:radial-gradient(circle at 20% 0%,rgba(34,211,238,.12),transparent 30%),
          linear-gradient(180deg,rgba(5,18,38,.995),rgba(2,7,18,1))!important;
        box-shadow:18px 0 60px rgba(0,0,0,.30)!important;
        transition:transform .26s cubic-bezier(.2,.8,.2,1)!important;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      }
      body.aurora-sidebar-hidden #auroraUniversalSidebar{
        transform:translateX(calc(-100% - 18px))!important;
      }

      body.aurora-universal-nav-ready .fm-workspace,
      body.aurora-universal-nav-ready main.app,
      body.aurora-universal-nav-ready .app{
        transition:margin-left .26s cubic-bezier(.2,.8,.2,1)!important;
      }
      body.aurora-universal-nav-ready .fm-workspace{margin-left:var(--aurora-sidebar-width)!important}
      body.aurora-universal-nav-ready:not(.aurora-has-workspace) main.app,
      body.aurora-universal-nav-ready:not(.aurora-has-workspace) .app{
        margin-left:var(--aurora-sidebar-width)!important;
      }
      body.aurora-sidebar-hidden .fm-workspace,
      body.aurora-sidebar-hidden:not(.aurora-has-workspace) main.app,
      body.aurora-sidebar-hidden:not(.aurora-has-workspace) .app{margin-left:0!important}

      .aurora-nav-brand{
        position:relative;min-height:78px;display:flex;align-items:center;gap:11px;
        padding:13px 14px;border-bottom:1px solid rgba(125,211,252,.14);
        background:rgba(2,6,18,.34)
      }
      .aurora-nav-crest{width:48px;height:48px;flex:0 0 48px}
      .aurora-nav-crest img{width:100%;height:100%;display:block;object-fit:contain}
      .aurora-nav-brand strong{display:block;color:#f0f9ff;font-size:15px;letter-spacing:-.035em}
      .aurora-nav-brand span{display:block;margin-top:4px;color:#67e8f9;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .aurora-nav-collapse{
        position:absolute;top:50%;right:-15px;transform:translateY(-50%);
        width:30px;height:66px;display:grid;place-items:center;
        border:1px solid rgba(34,211,238,.30);border-left:0;border-radius:0 12px 12px 0;
        background:rgba(4,18,36,.98);color:#67e8f9;font-size:24px;cursor:pointer
      }

      .aurora-nav-scroll{min-height:0;overflow-y:auto;padding:10px 9px 18px}
      .aurora-nav-group{margin:12px 10px 6px;color:#64748b;font-size:9px;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}
      .aurora-nav-link,.aurora-nav-folder>summary{
        --dept-colour:#60a5fa;--dept-rgb:96,165,250;
        position:relative;min-height:42px;display:grid;grid-template-columns:30px minmax(0,1fr);
        align-items:center;gap:7px;margin:2px 0;padding:7px 9px;border:1px solid rgba(var(--dept-rgb),.14);
        border-radius:11px;color:#cbd5e1;background:linear-gradient(90deg,rgba(var(--dept-rgb),.10),rgba(var(--dept-rgb),.025) 62%,transparent);
        font-size:13px;font-weight:750;text-decoration:none;cursor:pointer;overflow:hidden
      }
      .aurora-nav-link:before,.aurora-nav-folder>summary:before{
        content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 4px 4px 0;
        background:var(--dept-colour);opacity:.58;box-shadow:0 0 12px rgba(var(--dept-rgb),.32)
      }
      .aurora-nav-link:hover,.aurora-nav-folder>summary:hover{
        color:#fff;border-color:rgba(var(--dept-rgb),.42);
        background:linear-gradient(90deg,rgba(var(--dept-rgb),.24),rgba(var(--dept-rgb),.07) 72%,transparent)
      }
      .aurora-nav-link.active,.aurora-nav-folder.active>summary{
        color:#fff;border-color:rgba(var(--dept-rgb),.62);
        background:linear-gradient(90deg,rgba(var(--dept-rgb),.38),rgba(var(--dept-rgb),.16) 68%,rgba(var(--dept-rgb),.05));
        box-shadow:inset 3px 0 0 var(--dept-colour),0 9px 25px rgba(var(--dept-rgb),.17)
      }
      .aurora-nav-icon{
        width:28px;height:28px;display:grid;place-items:center;border-radius:9px;
        color:var(--dept-colour);background:rgba(var(--dept-rgb),.11);border:1px solid rgba(var(--dept-rgb),.14)
      }
      .aurora-nav-folder{margin:2px 0;border-radius:11px}
      .aurora-nav-folder>summary{grid-template-columns:30px minmax(0,1fr) 18px;list-style:none}
      .aurora-nav-folder>summary::-webkit-details-marker{display:none}
      .aurora-nav-arrow{color:var(--dept-colour);font-size:17px;text-align:center;transition:transform .18s}
      .aurora-nav-folder[open] .aurora-nav-arrow{transform:rotate(90deg)}
      .aurora-nav-submenu{display:grid;gap:2px;padding:3px 7px 9px 42px}
      .aurora-nav-submenu a{min-height:30px;display:flex;align-items:center;padding:6px 9px;border-radius:8px;color:#8fa2ba;font-size:11px;font-weight:750;text-decoration:none}
      .aurora-nav-submenu a:hover,.aurora-nav-submenu a.active{color:#fff;background:rgba(var(--dept-rgb),.15)}

      .aurora-nav-footer{display:grid;gap:5px;padding:8px 9px calc(10px + env(safe-area-inset-bottom));border-top:1px solid rgba(125,211,252,.18);background:linear-gradient(180deg,rgba(3,12,27,.99),rgba(2,7,18,1))}
      .aurora-nav-refresh{min-height:38px;border:1px solid rgba(125,211,252,.16);border-radius:11px;background:rgba(15,23,42,.46);color:#cbd5e1;font-size:12px;font-weight:800;cursor:pointer}
      .aurora-nav-clock{color:#64748b;font-size:9px;text-align:center}

      #auroraSidebarEdge{
        position:fixed;inset:0 auto 0 0;z-index:2147482999;width:25px;opacity:0;pointer-events:none;cursor:e-resize
      }
      body.aurora-sidebar-hidden #auroraSidebarEdge{opacity:1;pointer-events:auto}
      #auroraSidebarEdge span{
        position:absolute;left:0;top:50%;transform:translateY(-50%);width:19px;height:96px;
        display:grid;place-items:center;border:1px solid rgba(34,211,238,.34);border-left:0;border-radius:0 13px 13px 0;
        background:linear-gradient(180deg,rgba(4,18,36,.98),rgba(8,47,73,.94));color:#67e8f9;font-size:21px;font-weight:1000
      }

      @media(max-width:1180px){
        #auroraUniversalSidebar{width:var(--aurora-sidebar-compact)!important}
        body.aurora-universal-nav-ready .fm-workspace{margin-left:var(--aurora-sidebar-compact)!important}
        body.aurora-universal-nav-ready:not(.aurora-has-workspace) main.app,
        body.aurora-universal-nav-ready:not(.aurora-has-workspace) .app{margin-left:var(--aurora-sidebar-compact)!important}
      }
      @media(max-width:900px){
        #auroraUniversalSidebar{width:198px!important}
        body.aurora-universal-nav-ready .fm-workspace{margin-left:198px!important}
        body.aurora-universal-nav-ready:not(.aurora-has-workspace) main.app,
        body.aurora-universal-nav-ready:not(.aurora-has-workspace) .app{margin-left:198px!important}
      }
      body.aurora-sidebar-hidden .fm-workspace,
      body.aurora-sidebar-hidden:not(.aurora-has-workspace) main.app,
      body.aurora-sidebar-hidden:not(.aurora-has-workspace) .app{margin-left:0!important}
    `;
    document.head.appendChild(style);
  }

  function createLink(page, activeKey) {
    const isActive = page.key === activeKey;
    const submenu = pageSubmenus[page.key];

    if (submenu && isActive) {
      const details = document.createElement("details");
      details.className = "aurora-nav-folder active";
      details.open = true;
      details.style.setProperty("--dept-colour", page.colour);
      details.style.setProperty("--dept-rgb", page.rgb);

      const summary = document.createElement("summary");
      summary.innerHTML = `<span class="aurora-nav-icon">${page.icon}</span><span>${page.label}</span><span class="aurora-nav-arrow">›</span>`;
      details.appendChild(summary);

      const sub = document.createElement("div");
      sub.className = "aurora-nav-submenu";
      for (const [id, label] of submenu) {
        const a = document.createElement("a");
        a.href = `#${id}`;
        a.textContent = label;
        sub.appendChild(a);
      }
      details.appendChild(sub);
      return details;
    }

    const a = document.createElement("a");
    a.className = "aurora-nav-link" + (isActive ? " active" : "");
    a.href = page.href;
    a.dataset.auroraPageTarget = page.key;
    a.style.setProperty("--dept-colour", page.colour);
    a.style.setProperty("--dept-rgb", page.rgb);
    a.innerHTML = `<span class="aurora-nav-icon">${page.icon}</span><span>${page.label}</span>`;
    return a;
  }

  function renderSidebar() {
    document.getElementById("auroraUniversalSidebar")?.remove();
    document.getElementById("auroraSidebarEdge")?.remove();

    const current = detectPage();
    const sidebar = document.createElement("aside");
    sidebar.id = "auroraUniversalSidebar";
    sidebar.setAttribute("aria-label", "Aurora City FC navigation");

    const brand = document.createElement("div");
    brand.className = "aurora-nav-brand";
    brand.innerHTML = `
      <button class="aurora-nav-collapse" id="auroraSidebarCollapse" type="button" aria-label="Hide navigation">‹</button>
      <div class="aurora-nav-crest"><img alt="Aurora City FC crest" src="https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png"></div>
      <div><strong>Aurora City FC</strong><span>${pages.find(p => p.key === current)?.label || "Club HQ"}</span></div>
    `;
    sidebar.appendChild(brand);

    const scroll = document.createElement("nav");
    scroll.className = "aurora-nav-scroll";

    let lastGroup = "";
    for (const page of pages) {
      if (page.group !== lastGroup) {
        const group = document.createElement("div");
        group.className = "aurora-nav-group";
        group.textContent = page.group;
        scroll.appendChild(group);
        lastGroup = page.group;
      }
      scroll.appendChild(createLink(page, current));
    }
    sidebar.appendChild(scroll);

    const footer = document.createElement("div");
    footer.className = "aurora-nav-footer";
    footer.innerHTML = `
      <button class="aurora-nav-refresh" type="button" id="auroraSidebarRefresh">↻ Refresh Data</button>
      <div class="aurora-nav-clock" id="auroraSidebarClock">Connected</div>
    `;
    sidebar.appendChild(footer);

    const edge = document.createElement("div");
    edge.id = "auroraSidebarEdge";
    edge.setAttribute("role", "button");
    edge.setAttribute("tabindex", "0");
    edge.setAttribute("aria-label", "Show navigation");
    edge.innerHTML = "<span>›</span>";

    document.body.prepend(edge);
    document.body.prepend(sidebar);

    return sidebar;
  }

  let closeTimer = 0;

  function clearCloseTimer() {
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = 0;
  }

  function setOpenWindow(ms = AUTO_CLOSE_MS) {
    sessionStorage.setItem(OPEN_UNTIL_KEY, String(Date.now() + ms));
    sessionStorage.removeItem(MANUAL_CLOSED_KEY);
  }

  function openSidebar({ preserveWindow = false } = {}) {
    clearCloseTimer();
    document.body.classList.remove("aurora-sidebar-hidden");
    if (!preserveWindow) setOpenWindow(AUTO_CLOSE_MS);

    const until = Number(sessionStorage.getItem(OPEN_UNTIL_KEY) || 0);
    const remaining = Math.max(0, until - Date.now());
    if (remaining > 0) {
      closeTimer = window.setTimeout(closeSidebarAutomatically, remaining);
    }
  }

  function closeSidebarAutomatically() {
    clearCloseTimer();
    document.body.classList.add("aurora-sidebar-hidden");
    sessionStorage.removeItem(OPEN_UNTIL_KEY);
  }

  function closeSidebarManually() {
    clearCloseTimer();
    document.body.classList.add("aurora-sidebar-hidden");
    sessionStorage.removeItem(OPEN_UNTIL_KEY);
    sessionStorage.setItem(MANUAL_CLOSED_KEY, "1");
  }

  function restoreCrossPageState() {
    const manuallyClosed = sessionStorage.getItem(MANUAL_CLOSED_KEY) === "1";
    const until = Number(sessionStorage.getItem(OPEN_UNTIL_KEY) || 0);

    if (manuallyClosed) {
      document.body.classList.add("aurora-sidebar-hidden");
      return;
    }

    if (until > Date.now()) {
      openSidebar({ preserveWindow: true });
      return;
    }

    setOpenWindow(AUTO_CLOSE_MS);
    openSidebar({ preserveWindow: true });
  }

  function wireEvents(sidebar) {
    document.getElementById("auroraSidebarCollapse")?.addEventListener("click", closeSidebarManually);

    const edge = document.getElementById("auroraSidebarEdge");
    const openFromEdge = () => openSidebar();
    edge?.addEventListener("click", openFromEdge);
    edge?.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") openFromEdge();
    });

    document.getElementById("auroraSidebarRefresh")?.addEventListener("click", () => location.reload());

    sidebar.querySelectorAll('a[data-aurora-page-target]').forEach(link => {
      link.addEventListener("click", () => {
        setOpenWindow(AUTO_CLOSE_MS);
        document.body.classList.remove("aurora-sidebar-hidden");
      });
    });

    sidebar.addEventListener("pointerenter", () => {
      if (!document.body.classList.contains("aurora-sidebar-hidden")) {
        setOpenWindow(AUTO_CLOSE_MS);
        openSidebar({ preserveWindow: true });
      }
    });

    document.addEventListener("click", event => {
      const anchor = event.target.closest?.(".aurora-nav-submenu a");
      if (!anchor) return;
      setOpenWindow(AUTO_CLOSE_MS);
      openSidebar({ preserveWindow: true });
    });
  }

  function removeLegacyNavigation() {
    document.querySelectorAll(
      "body > .fm-sidebar:not(#auroraUniversalSidebar)," +
      ".aufc-sidebar,.aufc-mobile-button,.aufc-mobile-shade," +
      "#fmSidebarEdgeZone,.fm-sidebar-edge-zone"
    ).forEach(node => node.remove());

    const mount = document.getElementById("auroraNavigationMount");
    if (mount) mount.innerHTML = "";
  }

  function startDuplicateGuard() {
    const observer = new MutationObserver(() => removeLegacyNavigation());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function updateClock() {
    const node = document.getElementById("auroraSidebarClock");
    if (!node) return;
    node.textContent = new Intl.DateTimeFormat("en-GB", {
      hour:"2-digit", minute:"2-digit", second:"2-digit"
    }).format(new Date());
  }

  function boot() {
    injectStyles();
    removeLegacyNavigation();

    document.body.classList.toggle("aurora-has-workspace", !!document.querySelector(".fm-workspace"));
    const sidebar = renderSidebar();
    document.body.classList.add("aurora-universal-nav-ready");

    restoreCrossPageState();
    wireEvents(sidebar);
    startDuplicateGuard();

    updateClock();
    window.setInterval(updateClock, 1000);

    document.dispatchEvent(new CustomEvent("aurora:navigation-ready", {
      detail:{ build:BUILD, page:detectPage() }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();

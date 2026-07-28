/* Aurora City FC shared navigation — Finance + Boardroom */
(function () {
  "use strict";

  const financeSidebarMarkup = "<aside class=\"m13-sidebar aurora-finance-sidebar\" aria-label=\"Aurora City FC finance navigation\">\n  <button class=\"m13-sidebar-toggle\" id=\"m21SidebarToggle\" type=\"button\" aria-expanded=\"true\" aria-label=\"Finance navigation\" title=\"Finance navigation\"><span aria-hidden=\"true\">\u2039</span></button>\n  <div class=\"m13-club\">\n    <div class=\"m13-crest\"><img alt=\"Aurora City FC crest\" src=\"https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png\"/></div>\n    <div><strong>Aurora City FC</strong><small>FINANCE OFFICE</small></div>\n  </div>\n\n  <nav class=\"aurora-finance-nav-scroll\" aria-label=\"Aurora departments\">\n    <div class=\"m13-nav-label\">Manager</div>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_ManagerDashboard.html\" style=\"--nav-accent:#60a5fa;--nav-rgb:96,165,250\">\n      <span class=\"icon\">\u2302</span><span>Home</span><span class=\"aurora-fc-side-arrow\">\u203a</span>\n    </a>\n\n    <div class=\"m13-nav-label aurora-finance-group-label\">Finance</div>\n    <details class=\"aurora-finance-folder\" open>\n      <summary><span class=\"icon\">\u00a3</span><span>Finance Department</span><span class=\"aurora-folder-arrow\">\u203a</span></summary>\n      <div class=\"m13-nav aurora-finance-submenu\" id=\"m13Nav\">\n        <button class=\"active\" data-target=\"m13Dashboard\" type=\"button\"><span class=\"icon\">\u2302</span><span>Budget Dashboard</span></button>\n        <button data-target=\"m13PaydayPlan\" type=\"button\"><span class=\"icon\">\u00a3</span><span>Payday Plan</span></button>\n        <button data-target=\"m13Bills\" type=\"button\"><span class=\"icon\">\u2713</span><span>Bills &amp; Spending</span></button>\n        <button data-target=\"m13PotHealth\" type=\"button\"><span class=\"icon\">\u25c9</span><span>Pot Health</span></button>\n        <button data-target=\"m13HouseProject\" type=\"button\"><span class=\"icon\">\u2302</span><span>House Project</span></button>\n        <button data-target=\"m13Funding\" type=\"button\"><span class=\"icon\">\u2197</span><span>Funding Engine</span></button>\n        <button data-target=\"m13History\" type=\"button\"><span class=\"icon\">\u25a6</span><span>History</span></button>\n      </div>\n    </details>\n\n    <div class=\"m13-nav-label\">Performance</div>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_SquadHub.html\" style=\"--nav-accent:#22d3ee;--nav-rgb:34,211,238\"><span class=\"icon\">\u265f</span><span>Squad Hub</span><span class=\"aurora-fc-side-status\">Linked</span></a>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_AnalysisRoom.html\" style=\"--nav-accent:#a78bfa;--nav-rgb:167,139,250\"><span class=\"icon\">\u2301</span><span>Analysis Room</span><span class=\"aurora-fc-side-status live\">Live</span></a>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_TrainingGround.html\" style=\"--nav-accent:#34d399;--nav-rgb:52,211,153\"><span class=\"icon\">\u25b2</span><span>Training Ground</span><span class=\"aurora-fc-side-status\">Linked</span></a>\n\n    <div class=\"m13-nav-label\">Recruitment</div>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_ScoutingCentre.html\" style=\"--nav-accent:#34d399;--nav-rgb:52,211,153\"><span class=\"icon\">\u2315</span><span>Scouting Centre</span><span class=\"aurora-fc-side-arrow\">\u203a</span></a>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_TransferCentre.html\" style=\"--nav-accent:#f59e0b;--nav-rgb:245,158,11\"><span class=\"icon\">\u21c4</span><span>Transfer Centre</span><span class=\"aurora-fc-side-status ready\">Ready</span></a>\n\n    <div class=\"m13-nav-label\">Club</div>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_Boardroom.html\" style=\"--nav-accent:#ec4899;--nav-rgb:236,72,153\"><span class=\"icon\">\u265c</span><span>Boardroom</span><span class=\"aurora-fc-side-status\">Linked</span></a>\n    <a class=\"aurora-fc-side-link\" href=\"AuroraCityFC_MediaCentre.html\" style=\"--nav-accent:#facc15;--nav-rgb:250,204,21\"><span class=\"icon\">\u25cf</span><span>Media Centre</span><span class=\"aurora-fc-side-status\">Linked</span></a>\n  </nav>\n\n  <div class=\"m13-sidebar-foot aurora-finance-sidebar-foot\">\n    <button class=\"aurora-finance-refresh\" id=\"financeSidebarRefresh\" type=\"button\"><span class=\"icon\">\u21bb</span><span>Refresh Plan</span></button>\n    <div class=\"m13-live\"><i></i> FINANCE DEPARTMENT LIVE</div>\n    <div id=\"m13SideStatus\">Loading saved planner\u2026</div>\n  </div>\n</aside>";

  const boardroomSidebarMarkup = `
<aside class="aufc-sidebar aurora-boardroom-sidebar" aria-label="Aurora City FC navigation">
  <button class="aufc-toggle" id="aufcSidebarToggle" type="button" aria-label="Collapse navigation" aria-expanded="true"><span>‹</span></button>

  <div class="aufc-brand">
    <div class="aufc-crest"><img alt="Aurora City FC crest" src="https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png"></div>
    <div class="aufc-brand-copy"><strong>Aurora City FC</strong><small>BOARDROOM</small></div>
  </div>

  <nav class="aufc-scroll" aria-label="Aurora departments">
    <div class="aufc-label">Manager</div>
    <div class="aufc-links">
      <a class="aufc-link" href="AuroraCityFC_ManagerDashboard.html" style="--nav-accent:#60a5fa;--nav-rgb:96,165,250"><span class="aufc-icon">⌂</span><span class="aufc-name">Home</span></a>
    </div>

    <div class="aufc-label">Finance</div>
    <div class="aufc-links">
      <a class="aufc-link finance-link" href="AuroraCityFC_FinanceDepartment.html"><span class="aufc-icon">£</span><span class="aufc-name">Finance Department</span></a>
    </div>

    <div class="aufc-label">Performance</div>
    <div class="aufc-links">
      <a class="aufc-link" href="AuroraCityFC_SquadHub.html" style="--nav-accent:#22d3ee;--nav-rgb:34,211,238"><span class="aufc-icon">♟</span><span class="aufc-name">Squad Hub</span></a>
      <a class="aufc-link" href="AuroraCityFC_AnalysisRoom.html" style="--nav-accent:#a78bfa;--nav-rgb:167,139,250"><span class="aufc-icon">⌁</span><span class="aufc-name">Analysis Room</span></a>
      <a class="aufc-link" href="AuroraCityFC_TrainingGround.html" style="--nav-accent:#34d399;--nav-rgb:52,211,153"><span class="aufc-icon">▲</span><span class="aufc-name">Training Ground</span></a>
    </div>

    <div class="aufc-label">Recruitment</div>
    <div class="aufc-links">
      <a class="aufc-link" href="AuroraCityFC_ScoutingCentre.html" style="--nav-accent:#4ade80;--nav-rgb:74,222,128"><span class="aufc-icon">⌕</span><span class="aufc-name">Scouting Centre</span></a>
      <a class="aufc-link" href="AuroraCityFC_TransferCentre.html" style="--nav-accent:#f59e0b;--nav-rgb:245,158,11"><span class="aufc-icon">⇄</span><span class="aufc-name">Transfer Centre</span></a>
    </div>

    <div class="aufc-label">Club</div>
    <div class="aufc-links">
      <details class="aurora-page-folder" open style="--page-accent:#f472b6;--page-accent-rgb:244,114,182">
        <summary><span class="fm-side-icon">♜</span><span>Boardroom</span><span class="fm-folder-arrow">›</span></summary>
        <div class="fm-side-submenu fm-page-submenu">
          <a href="#boardroom-overview">Overview</a>
          <a href="#board-summary">Board Summary</a>
          <a href="#confidence-objectives">Confidence &amp; Objectives</a>
          <a href="#executive-control-room">Executive Control</a>
          <a href="#board-agenda-risk">Agenda &amp; Risk</a>
          <a href="#financial-oversight">Financial Oversight</a>
          <a href="#board-decision-log">Decision Log</a>
          <a href="#boardroom-briefing">Boardroom Briefing</a>
          <a href="#aurora-honours-cabinet">Honours Cabinet</a>
        </div>
      </details>
      <a class="aufc-link" href="AuroraCityFC_MediaCentre.html" style="--nav-accent:#facc15;--nav-rgb:250,204,21"><span class="aufc-icon">●</span><span class="aufc-name">Media Centre</span></a>
    </div>
  </nav>

  <div class="aufc-footer"><div class="aufc-live"><i></i><span>Board systems connected</span></div></div>
</aside>
<div class="aufc-mobile-shade" id="aufcMobileShade"></div>
<button class="aufc-mobile-button" id="aufcMobileButton" type="button" aria-label="Open navigation">☰</button>`;

  function mountFinance(mount) {
    mount.outerHTML = financeSidebarMarkup;
  }

  function mountBoardroom(mount) {
    mount.outerHTML = boardroomSidebarMarkup;
    document.body.classList.add("aufc-nav-ready");

    const toggle = document.getElementById("aufcSidebarToggle");
    const mobile = document.getElementById("aufcMobileButton");
    const shade = document.getElementById("aufcMobileShade");
    const sidebar = document.querySelector(".aurora-boardroom-sidebar");
    let timer = 0;

    function cancelTimer() {
      if (timer) clearTimeout(timer);
      timer = 0;
    }

    function openSidebar() {
      cancelTimer();
      if (window.innerWidth <= 820) {
        document.body.classList.add("aufc-mobile-open");
      } else {
        document.body.classList.remove("aufc-nav-collapsed");
        if (toggle) toggle.setAttribute("aria-expanded", "true");
      }
    }

    function closeSidebar() {
      if (window.innerWidth <= 820) {
        document.body.classList.remove("aufc-mobile-open");
      } else {
        document.body.classList.add("aufc-nav-collapsed");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    }

    function scheduleClose() {
      cancelTimer();
      timer = window.setTimeout(closeSidebar, 5000);
    }

    if (toggle) toggle.addEventListener("click", function() {
      cancelTimer();
      document.body.classList.toggle("aufc-nav-collapsed");
      toggle.setAttribute("aria-expanded", document.body.classList.contains("aufc-nav-collapsed") ? "false" : "true");
      if (!document.body.classList.contains("aufc-nav-collapsed")) scheduleClose();
    });

    if (mobile) mobile.addEventListener("click", function() {
      openSidebar();
      scheduleClose();
    });

    if (shade) shade.addEventListener("click", closeSidebar);

    if (sidebar) {
      sidebar.addEventListener("pointerenter", cancelTimer);
      sidebar.addEventListener("pointerleave", scheduleClose);
      sidebar.addEventListener("focusin", cancelTimer);
      sidebar.addEventListener("focusout", scheduleClose);
      sidebar.addEventListener("click", function(event) {
        const link = event.target.closest('a[href^="#"]');
        if (link) {
          openSidebar();
          scheduleClose();
        }
      });
    }

    document.querySelectorAll('.fm-page-submenu a[href^="#"]').forEach(function(link) {
      link.addEventListener("click", function(event) {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior:"smooth", block:"start" });
        document.querySelectorAll(".fm-page-submenu a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");
        scheduleClose();
      });
    });

    window.setTimeout(scheduleClose, 5000);
  }

  function mountAuroraNavigation() {
    const mount = document.getElementById("auroraNavigationMount");
    if (!mount || mount.dataset.mounted === "true") return;
    const page = document.documentElement.dataset.auroraPage || "";
    if (page === "boardroom") mountBoardroom(mount);
    else mountFinance(mount);
  }

  mountAuroraNavigation();
})();

/* Aurora City FC — Shared Master Hero prototype
   Step 2: standalone Manager Dashboard master design.
   Existing Aurora pages are not modified by this file. */
(function(global){
  "use strict";

  const HERO_VERSION = "1.0.0-prototype";

  const CONFIG = Object.freeze({
    manager: {
      pageId: "manager",
      kicker: "Live manager command centre",
      sessionLabel: "Manager session live",
      greeting: "Welcome back, Webby",
      titleMain: "Manager",
      titleSub: "Command Centre",
      description: "The latest club position, recruitment route, daily priority and income target — all in one command view.",
      image: "assets/aurora-city-fc/hero/managerdash.PNG",
      actions: [
        { label: "Open Decision Queue", href: "#decision-queue", primary: true, count: 2 },
        { label: "Open Transfer Centre", href: "AuroraCityFC_TransferCentre.html" },
        { label: "View Learning Centre", href: "AuroraCityFC_LearningCentre.html" }
      ],
      meta: ["Last updated: just now", "Premier League", "Next promotion secured"],
      priority: {
        state: "clear",
        stateLabel: "Markets closed",
        title: "Markets closed — hold discipline",
        text: "AuroraData is current. The latest comparison is from the last market session, so no price-led action is required until markets reopen.",
        nextEventLabel: "Next club event",
        nextEvent: "Monday market open",
        nextEventNote: "Aurora will expect the next trading comparison after the market session."
      },
      position: {
        label: "Club position",
        value: "On course",
        note: "The current income route remains aligned with the board-approved long-term target.",
        rows: [
          ["Board confidence", "91%"],
          ["Portfolio yield", "8.1%"],
          ["Aurora brain", "Learning active"]
        ],
        brainNote: "Outcome reviews are running in the background"
      },
      kpis: [
        { label: "Club Value", value: "£63,482", note: "+£1,248 from previous snapshot" },
        { label: "Annual Income", value: "£5,126", note: "+£84 after latest purchases", tone: "green" },
        { label: "Monthly Income", value: "£427.17", note: "Current passive-income run rate", tone: "green" },
        { label: "Gap to £625/month", value: "£197.83", note: "68.3% of target reached", tone: "amber", progress: 68.3 },
        { label: "Portfolio Yield", value: "8.1%", note: "IG ISA and Trading 212 holdings" },
        { label: "Board Confidence", value: "91%", note: "Overall club-health rating" }
      ]
    }
  });

  const mounted = new Map();

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeHref(value){
    const href = String(value || "#").trim();
    if (/^(?:javascript|data):/i.test(href)) return "#";
    return href;
  }

  function actionMarkup(action){
    const classes = `aurora-hero-action${action.primary ? " primary" : ""}`;
    const badge = Number.isFinite(Number(action.count)) ? `<b>${escapeHtml(action.count)}</b>` : "";
    return `<a class="${classes}" href="${escapeHtml(safeHref(action.href))}"><span>${escapeHtml(action.label)}</span>${badge}</a>`;
  }

  function rowMarkup(row){
    return `<div><small>${escapeHtml(row[0])}</small><strong>${escapeHtml(row[1])}</strong></div>`;
  }

  function kpiMarkup(kpi, index){
    const tone = ["green", "amber"].includes(kpi.tone) ? ` ${kpi.tone}` : "";
    const progress = Number.isFinite(Number(kpi.progress))
      ? `<div class="aurora-hero-progress"><div class="aurora-hero-progress-fill" data-hero-progress="${index}" style="width:${Math.max(0, Math.min(100, Number(kpi.progress)))}%"></div></div>`
      : "";
    return `<article class="aurora-hero-kpi${tone}" data-hero-kpi="${index}"><small>${escapeHtml(kpi.label)}</small><strong>${escapeHtml(kpi.value)}</strong><span>${escapeHtml(kpi.note)}</span>${progress}</article>`;
  }

  function buildMarkup(config){
    return `
      <section class="aurora-master-hero" data-aurora-hero-root data-page="${escapeHtml(config.pageId)}">
        <div aria-hidden="true" class="aurora-hero-aura aurora-hero-aura-one"></div>
        <div aria-hidden="true" class="aurora-hero-aura aurora-hero-aura-two"></div>

        <div class="aurora-hero-topline">
          <div class="aurora-hero-kicker"><span class="aurora-hero-dot"></span>${escapeHtml(config.kicker)}</div>
          <div class="aurora-hero-session">
            <span><i></i>${escapeHtml(config.sessionLabel)}</span>
            <time data-hero-clock>Loading time…</time>
          </div>
        </div>

        <div class="aurora-hero-stage">
          <div class="aurora-hero-identity">
            <p class="aurora-hero-greeting" data-hero-greeting>${escapeHtml(config.greeting)}</p>
            <h1 class="aurora-hero-title">
              <span class="aurora-hero-title-main" data-hero-title-main>${escapeHtml(config.titleMain)}</span>
              <span class="aurora-hero-title-sub" data-hero-title-sub>${escapeHtml(config.titleSub)}</span>
            </h1>
            <p class="aurora-hero-description" data-hero-description>${escapeHtml(config.description)}</p>
            <div class="aurora-hero-actions" data-hero-actions>${config.actions.map(actionMarkup).join("")}</div>
            <div class="aurora-hero-meta" data-hero-meta>${config.meta.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
          </div>

          <article class="aurora-hero-priority" aria-labelledby="auroraHeroPriorityTitle">
            <div class="aurora-hero-card-head">
              <div>
                <small>Today’s manager priority</small>
                <span class="aurora-hero-priority-state" data-hero-priority-state data-state="${escapeHtml(config.priority.state)}">${escapeHtml(config.priority.stateLabel)}</span>
              </div>
              <span aria-hidden="true" class="aurora-hero-priority-icon">◎</span>
            </div>
            <h3 id="auroraHeroPriorityTitle" data-hero-priority-title>${escapeHtml(config.priority.title)}</h3>
            <p data-hero-priority-text>${escapeHtml(config.priority.text)}</p>
            <div class="aurora-hero-priority-foot">
              <span>${escapeHtml(config.priority.nextEventLabel)}</span>
              <strong data-hero-next-event>${escapeHtml(config.priority.nextEvent)}</strong>
              <small data-hero-next-event-note>${escapeHtml(config.priority.nextEventNote)}</small>
            </div>
          </article>

          <article class="aurora-hero-position">
            <small class="aurora-hero-position-label">${escapeHtml(config.position.label)}</small>
            <strong data-hero-position-value>${escapeHtml(config.position.value)}</strong>
            <p data-hero-position-note>${escapeHtml(config.position.note)}</p>
            <div class="aurora-hero-position-grid" data-hero-position-rows>${config.position.rows.map(rowMarkup).join("")}</div>
            <div class="aurora-hero-brain-line"><span class="aurora-hero-brain-dot"></span><span data-hero-brain-note>${escapeHtml(config.position.brainNote)}</span></div>
          </article>
        </div>

        <div class="aurora-hero-kpi-strip" data-hero-kpis>${config.kpis.map(kpiMarkup).join("")}</div>
      </section>`;
  }

  function updateClock(root){
    const clock = root.querySelector("[data-hero-clock]");
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  function resolveImage(host, config){
    return host.dataset.heroImage || config.image || "";
  }

  function mount(hostOrSelector, pageId = "manager", overrides = {}){
    const host = typeof hostOrSelector === "string" ? document.querySelector(hostOrSelector) : hostOrSelector;
    if (!(host instanceof Element)) throw new Error("AuroraHero.mount requires a valid host element.");

    const base = CONFIG[pageId];
    if (!base) throw new Error(`Unknown Aurora hero page: ${pageId}`);

    const config = {
      ...base,
      ...overrides,
      priority: {...base.priority, ...(overrides.priority || {})},
      position: {...base.position, ...(overrides.position || {})},
      actions: overrides.actions || base.actions,
      meta: overrides.meta || base.meta,
      kpis: overrides.kpis || base.kpis
    };

    host.innerHTML = buildMarkup(config);
    const root = host.querySelector("[data-aurora-hero-root]");
    const image = resolveImage(host, config);
    if (image) root.style.setProperty("--aurora-hero-image", `url("${String(image).replaceAll('"', '%22')}")`);

    updateClock(root);
    const timer = global.setInterval(() => updateClock(root), 1000);
    mounted.set(host, {root, timer, pageId, config});

    host.dispatchEvent(new CustomEvent("aurora:hero-mounted", {bubbles:true, detail:{pageId, version:HERO_VERSION}}));
    return root;
  }

  function update(hostOrSelector, patch = {}){
    const host = typeof hostOrSelector === "string" ? document.querySelector(hostOrSelector) : hostOrSelector;
    const state = mounted.get(host);
    if (!state) throw new Error("AuroraHero.update called before mount.");
    unmount(host);
    return mount(host, state.pageId, {...state.config, ...patch});
  }

  function unmount(hostOrSelector){
    const host = typeof hostOrSelector === "string" ? document.querySelector(hostOrSelector) : hostOrSelector;
    const state = mounted.get(host);
    if (!state) return;
    global.clearInterval(state.timer);
    mounted.delete(host);
    host.innerHTML = "";
  }

  function autoMount(){
    document.querySelectorAll("[data-aurora-hero]").forEach(host => {
      if (mounted.has(host)) return;
      const pageId = host.dataset.page || document.documentElement.dataset.auroraPage || "manager";
      mount(host, pageId);
    });
  }

  global.AuroraHero = Object.freeze({
    version: HERO_VERSION,
    config: CONFIG,
    mount,
    update,
    unmount,
    autoMount
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount, {once:true});
  else autoMount();
})(window);

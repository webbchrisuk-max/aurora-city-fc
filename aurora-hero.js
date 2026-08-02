/* Aurora City FC — Shared Master Hero prototype
   Shared Manager Dashboard master hero.
   Step 3: connected to the live Manager Dashboard while remaining reusable by other departments. */
(function(global){
  "use strict";

  const HERO_VERSION = "1.0.1-manager-load-fix";

  const CONFIG = Object.freeze({
    manager: {
      pageId: "manager",
      rootId: "club-overview",
      rootClass: "aurora-section-anchor",
      kicker: "Live manager command centre",
      sessionLabel: "Manager session live",
      clockId: "managerHeroTime",
      greeting: "Welcome back, Webby",
      greetingId: "managerHeroGreeting",
      titleMain: "Manager",
      titleSub: "Command Centre",
      description: "Loading the latest club position, recruitment route and income target.",
      descriptionId: "heroSub",
      image: "assets/aurora-city-fc/hero/managerdash.PNG",
      actions: [
        { label: "Open Decision Queue", type: "button", primary: true, id: "managerHeroDecisionButton", count: 0, countId: "managerHeroDecisionCount" },
        { label: "Open Transfer Centre", href: "AuroraCityFC_TransferCentre.html" },
        { label: "View Learning Centre", href: "AuroraCityFC_LearningCentre.html" }
      ],
      meta: [
        { text: "Last updated: loading…", id: "lastUpdated" },
        { text: "Loading…", id: "currentDivision", strong: true },
        { text: "Next promotion loading…", id: "divisionProgress" }
      ],
      priority: {
        state: "loading",
        stateLabel: "Reviewing",
        stateId: "managerHeroPriorityState",
        title: "Aurora is preparing today’s instruction",
        titleId: "managerHeroPriorityTitle",
        text: "The Decision Queue and daily briefing are being checked.",
        textId: "managerHeroPriorityText",
        nextEventLabel: "Next club event",
        nextEvent: "Checking schedule…",
        nextEventId: "managerHeroNextEvent",
        nextEventNote: "Aurora is reading the dividend calendar.",
        nextEventNoteId: "managerHeroNextEventNote"
      },
      position: {
        label: "Club position",
        value: "Assessing",
        valueId: "managerHeroClubPosition",
        note: "Aurora is calculating the latest board and income position.",
        noteId: "managerHeroClubPositionNote",
        rows: [
          { label: "Board confidence", value: "—", valueId: "managerHeroPositionBoard" },
          { label: "Portfolio yield", value: "—", valueId: "managerHeroPositionYield" },
          { label: "Aurora brain", value: "Learning active", valueId: "managerHeroBrainStatus" }
        ],
        brainNote: "Outcome reviews are running in the background",
        brainNoteId: "managerHeroBrainNote"
      },
      kpis: [
        { label: "Club Value", value: "—", valueId: "heroClubValue", note: "Waiting for previous snapshot…", noteId: "clubValueTrend", noteClass: "hero-detail neutral" },
        { label: "Annual Income", value: "—", valueId: "heroAnnualIncome", note: "Waiting for latest purchase…", noteId: "annualIncomeTrend", noteClass: "hero-detail neutral", tone: "green" },
        { label: "Monthly Income", value: "—", valueId: "monthlyIncome", note: "Current passive-income run rate", hiddenValueId: "heroMonthlyIncome", tone: "green" },
        { label: "Gap to £625/month", value: "—", valueId: "heroTargetGap", note: "Progress loading…", noteId: "targetProgressText", tone: "amber", progress: 0, progressId: "targetProgressFill" },
        { label: "Portfolio Yield", value: "—", valueId: "portfolioYield", note: "IG ISA and Trading 212 holdings" },
        { label: "Board Confidence", value: "—", valueId: "portfolioStrength", note: "Overall club-health rating" }
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

  function attr(name, value){
    const text = String(value || "").trim();
    return text ? ` ${name}="${escapeHtml(text)}"` : "";
  }

  function classNames(...values){
    return values.filter(Boolean).join(" ");
  }

  function safeHref(value){
    const href = String(value || "#").trim();
    if (/^(?:javascript|data):/i.test(href)) return "#";
    return href;
  }

  function actionMarkup(action){
    const classes = classNames("aurora-hero-action", action.primary && "primary");
    const badge = Number.isFinite(Number(action.count))
      ? `<b${attr("id", action.countId)}>${escapeHtml(action.count)}</b>`
      : "";
    const inner = `<span>${escapeHtml(action.label)}</span>${badge}`;
    if (action.type === "button") {
      return `<button class="${classes}" type="button"${attr("id", action.id)}>${inner}</button>`;
    }
    return `<a class="${classes}" href="${escapeHtml(safeHref(action.href))}"${attr("id", action.id)}>${inner}</a>`;
  }

  function metaMarkup(item){
    if (typeof item === "string") return `<span>${escapeHtml(item)}</span>`;
    const content = item.strong ? `<b>${escapeHtml(item.text)}</b>` : escapeHtml(item.text);
    return `<span${attr("id", item.id)}>${content}</span>`;
  }

  function rowMarkup(row){
    if (Array.isArray(row)) return `<div><small>${escapeHtml(row[0])}</small><strong>${escapeHtml(row[1])}</strong></div>`;
    return `<div><small>${escapeHtml(row.label)}</small><strong${attr("id", row.valueId)}>${escapeHtml(row.value)}</strong></div>`;
  }

  function kpiMarkup(kpi, index){
    const tone = ["green", "amber"].includes(kpi.tone) ? ` ${kpi.tone}` : "";
    const progress = Number.isFinite(Number(kpi.progress))
      ? `<div class="aurora-hero-progress"><div class="aurora-hero-progress-fill" data-hero-progress="${index}"${attr("id", kpi.progressId)} style="width:${Math.max(0, Math.min(100, Number(kpi.progress)))}%"></div></div>`
      : "";
    const noteClass = classNames(kpi.noteClass);
    const hiddenValue = kpi.hiddenValueId ? `<span hidden${attr("id", kpi.hiddenValueId)}>${escapeHtml(kpi.value)}</span>` : "";
    return `<article class="aurora-hero-kpi${tone}" data-hero-kpi="${index}"><small>${escapeHtml(kpi.label)}</small><strong${attr("id", kpi.valueId)}>${escapeHtml(kpi.value)}</strong><span${attr("id", kpi.noteId)}${attr("class", noteClass)}>${escapeHtml(kpi.note)}</span>${hiddenValue}${progress}</article>`;
  }

  function buildMarkup(config){
    return `
      <section class="${classNames("aurora-master-hero", config.rootClass)}"${attr("id", config.rootId)} data-aurora-hero-root data-page="${escapeHtml(config.pageId)}">
        <div aria-hidden="true" class="aurora-hero-aura aurora-hero-aura-one"></div>
        <div aria-hidden="true" class="aurora-hero-aura aurora-hero-aura-two"></div>

        <div class="aurora-hero-topline">
          <div class="aurora-hero-kicker"><span class="aurora-hero-dot"></span>${escapeHtml(config.kicker)}</div>
          <div class="aurora-hero-session">
            <span><i></i>${escapeHtml(config.sessionLabel)}</span>
            <time data-hero-clock${attr("id", config.clockId)}>Loading time…</time>
          </div>
        </div>

        <div class="aurora-hero-stage">
          <div class="aurora-hero-identity">
            <p class="aurora-hero-greeting" data-hero-greeting${attr("id", config.greetingId)}>${escapeHtml(config.greeting)}</p>
            <h1 class="aurora-hero-title">
              <span class="aurora-hero-title-main" data-hero-title-main>${escapeHtml(config.titleMain)}</span>
              <span class="aurora-hero-title-sub" data-hero-title-sub>${escapeHtml(config.titleSub)}</span>
            </h1>
            <p class="aurora-hero-description" data-hero-description${attr("id", config.descriptionId)}>${escapeHtml(config.description)}</p>
            <div class="aurora-hero-actions" data-hero-actions>${config.actions.map(actionMarkup).join("")}</div>
            <div class="aurora-hero-meta" data-hero-meta>${config.meta.map(metaMarkup).join("")}</div>
          </div>

          <article class="aurora-hero-priority" aria-labelledby="${escapeHtml(config.priority.titleId || "auroraHeroPriorityTitle")}">
            <div class="aurora-hero-card-head">
              <div>
                <small>Today’s manager priority</small>
                <span class="aurora-hero-priority-state" data-hero-priority-state data-state="${escapeHtml(config.priority.state)}"${attr("id", config.priority.stateId)}>${escapeHtml(config.priority.stateLabel)}</span>
              </div>
              <span aria-hidden="true" class="aurora-hero-priority-icon">◎</span>
            </div>
            <h3${attr("id", config.priority.titleId || "auroraHeroPriorityTitle")} data-hero-priority-title>${escapeHtml(config.priority.title)}</h3>
            <p data-hero-priority-text${attr("id", config.priority.textId)}>${escapeHtml(config.priority.text)}</p>
            <div class="aurora-hero-priority-foot">
              <span>${escapeHtml(config.priority.nextEventLabel)}</span>
              <strong data-hero-next-event${attr("id", config.priority.nextEventId)}>${escapeHtml(config.priority.nextEvent)}</strong>
              <small data-hero-next-event-note${attr("id", config.priority.nextEventNoteId)}>${escapeHtml(config.priority.nextEventNote)}</small>
            </div>
          </article>

          <article class="aurora-hero-position">
            <small class="aurora-hero-position-label">${escapeHtml(config.position.label)}</small>
            <strong data-hero-position-value${attr("id", config.position.valueId)}>${escapeHtml(config.position.value)}</strong>
            <p data-hero-position-note${attr("id", config.position.noteId)}>${escapeHtml(config.position.note)}</p>
            <div class="aurora-hero-position-grid" data-hero-position-rows>${config.position.rows.map(rowMarkup).join("")}</div>
            <div class="aurora-hero-brain-line"><span class="aurora-hero-brain-dot"></span><span data-hero-brain-note${attr("id", config.position.brainNoteId)}>${escapeHtml(config.position.brainNote)}</span></div>
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

  // Mount immediately when a hero host already exists (for pages that load this
  // file directly after the placeholder), and run once more after parsing for
  // pages that include the shared script in the document head.
  autoMount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount, {once:true});
  }
})(window);

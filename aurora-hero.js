/* Aurora City FC — shared Manager Dashboard hero renderer. */
(function(){
  "use strict";

  function render(host){
    if(!host || host.dataset.auroraRendered === "true") return;
    const image = host.dataset.heroImage || "assets/aurora-city-fc/hero/managerdash.PNG";

    host.innerHTML = `
      <section id="club-overview" class="manager-command-header manager-command-hero-v4 aurora-section-anchor" style="--manager-hero-image:url('${image}')">
        <span class="manager-hero-aura manager-hero-aura-one"></span>
        <span class="manager-hero-aura manager-hero-aura-two"></span>
        <div class="manager-hero-topline">
          <span class="panel-kicker">Aurora Manager Command</span>
          <div class="manager-hero-session">
            <span><i></i>Live manager session</span>
            <time id="managerHeroTime">Loading time…</time>
          </div>
        </div>
        <div class="manager-hero-stage">
          <div class="manager-hero-identity">
            <p class="manager-hero-greeting" id="managerHeroGreeting">Manager command online</p>
            <h2><span class="manager-hero-title-main">Manager</span><span>Command Centre</span></h2>
            <p id="heroSub">Aurora is loading the latest squad, income and board briefing.</p>
            <div class="manager-hero-actions">
              <button class="manager-hero-action primary" id="managerHeroDecisionButton" type="button">Open Decision Queue <b id="managerHeroDecisionCount">0</b></button>
              <a class="manager-hero-action" href="AuroraCityFC_NexusMaster.html">Open Aurora Brain</a>
            </div>
          </div>
          <article class="manager-hero-priority">
            <div class="manager-hero-card-head">
              <div><small>Manager briefing</small><span class="manager-hero-priority-state" data-state="clear" id="managerHeroPriorityState">No urgent action</span></div>
              <span class="manager-hero-priority-icon" aria-hidden="true">⚡</span>
            </div>
            <h3 id="managerHeroPriorityTitle">Aurora is monitoring the club</h3>
            <p id="managerHeroPriorityText">The latest manager instruction will appear here when Aurora completes its checks.</p>
            <div class="manager-hero-priority-foot">
              <span>Next income event</span>
              <strong id="managerHeroNextEvent">Schedule is being checked</strong>
              <small id="managerHeroNextEventNote">Aurora is reading the dividend and transfer calendar.</small>
            </div>
          </article>
          <article class="manager-hero-position">
            <span class="manager-hero-position-label">Club position</span>
            <strong id="managerHeroClubPosition">Assessing</strong>
            <p id="managerHeroClubPositionNote">Aurora is calculating the latest board and income position.</p>
            <div class="manager-hero-position-grid">
              <div><small>Board</small><strong id="managerHeroPositionBoard">—</strong></div>
              <div><small>Portfolio yield</small><strong id="managerHeroPositionYield">—</strong></div>
              <div><small>Next event</small><strong id="managerHeroNextEventCompact">Live schedule</strong></div>
            </div>
            <div class="manager-hero-brain-line"><span class="manager-hero-brain-dot"></span><span><strong id="managerHeroBrainStatus">Learning active</strong><br><span id="managerHeroBrainNote">Outcome reviews are running in the background</span></span></div>
          </article>
        </div>
        <div class="manager-hero-kpi-strip">
          <div class="command-metric"><span>Club value</span><strong id="heroClubValue">—</strong><small>Live portfolio</small></div>
          <div class="command-metric"><span>Annual income</span><strong id="heroAnnualIncome">—</strong><small>Dividend run rate</small></div>
          <div class="command-metric"><span>Monthly income</span><strong id="heroMonthlyIncome">—</strong><small>Current pace</small></div>
          <div class="command-metric"><span>Target gap</span><strong id="heroTargetGap">—</strong><small>To £625/month</small></div>
          <div class="command-metric"><span>Aurora brain</span><strong>Live</strong><small>Shared intelligence</small></div>
          <div class="command-metric"><span>Cloud status</span><strong>Synced</strong><small>Cross-device ready</small></div>
        </div>
      </section>`;

    const section = host.querySelector("#club-overview");
    if(section){
      section.style.background = `linear-gradient(110deg,rgba(3,11,28,.72) 0%,rgba(7,25,50,.46) 46%,rgba(17,24,63,.28) 100%),radial-gradient(circle at 12% 15%,rgba(34,211,238,.20),transparent 32%),url("${image}") center center/cover no-repeat`;
    }
    host.dataset.auroraRendered = "true";
  }

  function boot(){
    document.querySelectorAll("[data-aurora-hero]").forEach(render);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();

/* Aurora City FC — restored Manager Dashboard hero renderer.
 * Recovery build: 2026-08-02-2314
 */
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
              <button class="manager-hero-action primary" id="managerHeroDecisionButton" type="button">
                Open Decision Queue <b id="managerHeroDecisionCount">0</b>
              </button>
              <a class="manager-hero-action" href="AuroraCityFC_NexusMaster.html">Open Aurora Brain</a>
            </div>

            <div class="command-meta">
              <span id="lastUpdated">Last updated: loading…</span>
              <span><b id="currentDivision">Loading…</b></span>
              <span id="divisionProgress">Next promotion loading…</span>
            </div>
          </div>

          <article class="manager-hero-priority" aria-labelledby="managerHeroPriorityTitle">
            <div class="manager-hero-card-head">
              <div>
                <small>Today’s manager priority</small>
                <span class="manager-hero-priority-state" data-state="loading" id="managerHeroPriorityState">Reviewing</span>
              </div>
              <span class="manager-hero-priority-icon" aria-hidden="true">◎</span>
            </div>
            <h3 id="managerHeroPriorityTitle">Aurora is preparing today’s instruction</h3>
            <p id="managerHeroPriorityText">The Decision Queue and daily briefing are being checked.</p>
            <div class="manager-hero-priority-foot">
              <span>Next club event</span>
              <strong id="managerHeroNextEvent">Checking schedule…</strong>
              <small id="managerHeroNextEventNote">Aurora is reading the dividend calendar.</small>
            </div>
          </article>

          <article class="manager-hero-position">
            <small class="manager-hero-position-label">Club position</small>
            <strong id="managerHeroClubPosition">Assessing</strong>
            <p id="managerHeroClubPositionNote">Aurora is calculating the latest board and income position.</p>

            <div class="manager-hero-position-grid">
              <div><small>Board confidence</small><strong id="managerHeroPositionBoard">—</strong></div>
              <div><small>Portfolio yield</small><strong id="managerHeroPositionYield">—</strong></div>
              <div><small>Aurora brain</small><strong id="managerHeroBrainStatus">Learning active</strong></div>
            </div>

            <div class="manager-hero-brain-line">
              <span class="manager-hero-brain-dot"></span>
              <span id="managerHeroBrainNote">Outcome reviews are running in the background</span>
            </div>
          </article>
        </div>

        <div class="command-metric-grid manager-hero-kpi-strip">
          <article class="command-metric">
            <small>Club Value</small>
            <strong id="heroClubValue">—</strong>
            <span class="hero-detail neutral" id="clubValueTrend">Waiting for previous snapshot…</span>
          </article>
          <article class="command-metric green">
            <small>Annual Income</small>
            <strong id="heroAnnualIncome">—</strong>
            <span class="hero-detail neutral" id="annualIncomeTrend">Waiting for latest purchase…</span>
          </article>
          <article class="command-metric green">
            <small>Monthly Income</small>
            <strong id="monthlyIncome">—</strong>
            <span>Current passive-income run rate</span>
            <span hidden id="heroMonthlyIncome">—</span>
          </article>
          <article class="command-metric amber">
            <small>Gap to £625/month</small>
            <strong id="heroTargetGap">—</strong>
            <span id="targetProgressText">Progress loading…</span>
            <div class="hero-progress"><div class="hero-progress-fill" id="targetProgressFill"></div></div>
          </article>
          <article class="command-metric">
            <small>Portfolio Yield</small>
            <strong id="portfolioYield">—</strong>
            <span>IG ISA and Trading 212 holdings</span>
          </article>
          <article class="command-metric">
            <small>Board Confidence</small>
            <strong id="portfolioStrength">—</strong>
            <span>Overall club-health rating</span>
          </article>
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

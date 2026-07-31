(function(){
  "use strict";

  if(!window.__AURORA_CLOUD_ENGINE_LOADING__ && !window.AuroraCloudSync){
    window.__AURORA_CLOUD_ENGINE_LOADING__ = true;
    const cloudScript = document.createElement("script");
    cloudScript.id = "auroraCloudSyncLoader";
    cloudScript.src = "aurora-cloud-sync.js?v=20260731-registration-desk-1";
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
    ["●","Media Centre","AuroraCityFC_MediaCentre.html"],
    ["☁","Cloud Sync","AuroraCloudSync.html"]
  ];

  const currentFile = (
    location.pathname.split("/").pop()
    || "AuroraCityFC_NexusMaster.html"
  ).toLowerCase();

  const currentHash = location.hash.toLowerCase();

  const REGISTRATION_CONNECTION_KEY =
    "aurora_registration_connection_v1";

  const REGISTRATION_PUBLIC_EVENT =
    "aurora-registration-connection-changed";

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

    if(label) label.textContent = presentation.label;
    if(detail) detail.textContent = presentation.detail;

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


  function safeRegistrationParse(value){
    try{
      const parsed = JSON.parse(value || "null");
      return parsed && typeof parsed === "object"
        ? parsed
        : null;
    }catch(_){
      return null;
    }
  }

  function loadRegistrationConnection(){
    return safeRegistrationParse(
      localStorage.getItem(
        REGISTRATION_CONNECTION_KEY
      )
    );
  }

  function registrationPublicState(connection){
    const saved = connection || loadRegistrationConnection();

    return {
      configured:Boolean(
        saved
        && saved.url
        && saved.token
      ),
      connected:Boolean(
        saved
        && (
          saved.connected
          || saved.verified
          || saved.status === "connected"
        )
      ),
      url:saved?.url || "",
      savedAt:saved?.savedAt || null,
      testedAt:saved?.testedAt || null,
      lastError:saved?.lastError || ""
    };
  }

  function dispatchRegistrationState(connection){
    const detail =
      registrationPublicState(connection);

    window.dispatchEvent(
      new CustomEvent(
        REGISTRATION_PUBLIC_EVENT,
        {detail}
      )
    );

    return detail;
  }

  function validateRegistrationValues(url,token){
    let parsedUrl;

    try{
      parsedUrl = new URL(
        String(url || "").trim()
      );
    }catch(_){
      throw new Error(
        "Enter the full Apps Script web-app URL."
      );
    }

    if(parsedUrl.protocol !== "https:"){
      throw new Error(
        "The Registration Desk URL must start with https://"
      );
    }

    const cleanToken =
      String(token || "").trim();

    if(cleanToken.length < 4){
      throw new Error(
        "Enter the private registration token."
      );
    }

    return {
      url:parsedUrl.toString(),
      token:cleanToken
    };
  }

  function saveRegistrationConnection(
    url,
    token,
    extra = {}
  ){
    const current =
      loadRegistrationConnection()
      || {};

    const connection = {
      version:1,

      // Compatibility names used by Aurora pages.
      url,
      webAppUrl:url,
      scriptUrl:url,
      endpoint:url,

      token,
      privateToken:token,
      registrationToken:token,

      connected:Boolean(extra.connected),
      verified:Boolean(extra.connected),
      status:extra.connected
        ? "connected"
        : "saved",

      savedAt:
        current.savedAt
        || new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      testedAt:
        extra.testedAt
        || current.testedAt
        || null,

      lastError:
        extra.lastError
        || ""
    };

    localStorage.setItem(
      REGISTRATION_CONNECTION_KEY,
      JSON.stringify(connection)
    );

    dispatchRegistrationState(connection);
    return connection;
  }

  async function testRegistrationConnection(
    url,
    token
  ){
    const testUrl = new URL(url);

    testUrl.searchParams.set(
      "action",
      "ping"
    );

    testUrl.searchParams.set(
      "token",
      token
    );

    testUrl.searchParams.set(
      "_auroraTest",
      String(Date.now())
    );

    /*
      Apps Script web apps commonly return an opaque redirected
      response in installed PWAs. A resolved network request is
      treated as a successful reachability test; the real offers
      request still validates the token when it is used.
    */
    await fetch(
      testUrl.toString(),
      {
        method:"GET",
        mode:"no-cors",
        cache:"no-store",
        redirect:"follow"
      }
    );

    return true;
  }

  function registrationUiState(
    state,
    message
  ){
    const wrap =
      document.getElementById(
        "auroraRegistrationWrap"
      );

    const summary =
      document.getElementById(
        "auroraRegistrationSummary"
      );

    const messageNode =
      document.getElementById(
        "auroraRegistrationMessage"
      );

    if(wrap){
      wrap.dataset.state = state;
    }

    if(summary){
      summary.textContent = message;
    }

    if(messageNode){
      messageNode.dataset.state = state;
      messageNode.textContent = message;
    }
  }

  function loadRegistrationIntoUi(){
    const connection =
      loadRegistrationConnection();

    const urlInput =
      document.getElementById(
        "auroraRegistrationUrl"
      );

    const tokenInput =
      document.getElementById(
        "auroraRegistrationToken"
      );

    if(connection){
      if(urlInput){
        urlInput.value =
          connection.url
          || connection.webAppUrl
          || connection.scriptUrl
          || "";
      }

      if(tokenInput){
        tokenInput.value =
          connection.token
          || connection.privateToken
          || connection.registrationToken
          || "";
      }
    }

    const state =
      registrationPublicState(connection);

    if(state.connected){
      registrationUiState(
        "connected",
        "Registration Desk connected"
      );
    }else if(state.configured){
      registrationUiState(
        "saved",
        "Connection saved — test required"
      );
    }else{
      registrationUiState(
        "idle",
        "Not connected"
      );
    }
  }

  function exposeRegistrationApi(){
    window.AuroraRegistrationDesk = {
      key:REGISTRATION_CONNECTION_KEY,
      getConnection:loadRegistrationConnection,
      getState:registrationPublicState,
      save:function(url,token){
        const values =
          validateRegistrationValues(
            url,
            token
          );

        return saveRegistrationConnection(
          values.url,
          values.token,
          {connected:false}
        );
      },
      test:async function(){
        const connection =
          loadRegistrationConnection();

        if(!connection){
          throw new Error(
            "Save the Registration Desk connection first."
          );
        }

        await testRegistrationConnection(
          connection.url,
          connection.token
        );

        return saveRegistrationConnection(
          connection.url,
          connection.token,
          {
            connected:true,
            testedAt:new Date().toISOString()
          }
        );
      }
    };
  }

  function build(){
    if(document.getElementById("auroraNavPanel")) return;

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

      <button
        class="aurora-nav-cloud"
        id="auroraNavCloud"
        type="button"
        data-state="working"
      >
        <span
          class="aurora-nav-cloud-dot"
          aria-hidden="true"
        ></span>
        <span class="aurora-nav-cloud-copy">
          <strong>Checking Aurora Cloud…</strong>
          <span>Reading the live connection status</span>
        </span>
        <span
          class="aurora-nav-cloud-arrow"
          aria-hidden="true"
        >›</span>
      </button>

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

          <div
            class="aurora-registration-wrap"
            id="auroraRegistrationWrap"
            data-state="idle"
          >
            <button
              class="aurora-registration-toggle"
              id="auroraRegistrationToggle"
              type="button"
              aria-expanded="false"
              aria-controls="auroraRegistrationPanel"
            >
              <span
                class="aurora-registration-icon"
                aria-hidden="true"
              >⌁</span>

              <span class="aurora-registration-toggle-copy">
                <strong>Registration Desk</strong>
                <span id="auroraRegistrationSummary">Not connected</span>
              </span>

              <span
                class="aurora-registration-status-dot"
                aria-hidden="true"
              ></span>
            </button>

            <div
              class="aurora-registration-panel"
              id="auroraRegistrationPanel"
              aria-hidden="true"
            >
              <p class="aurora-registration-explainer">
                Connect Aurora to the private AuroraData Apps Script used by the Chairman’s Offer Room.
              </p>

              <label class="aurora-registration-field">
                <span>Apps Script web-app URL</span>
                <input
                  id="auroraRegistrationUrl"
                  type="url"
                  inputmode="url"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="https://script.google.com/macros/s/…/exec"
                >
              </label>

              <label class="aurora-registration-field">
                <span>Private registration token</span>
                <input
                  id="auroraRegistrationToken"
                  type="password"
                  autocomplete="new-password"
                  spellcheck="false"
                  placeholder="Enter private token"
                >
              </label>

              <div class="aurora-registration-actions">
                <button
                  class="aurora-registration-button aurora-registration-save"
                  id="auroraRegistrationSave"
                  type="button"
                >
                  Save connection
                </button>

                <button
                  class="aurora-registration-button aurora-registration-test"
                  id="auroraRegistrationTest"
                  type="button"
                >
                  Test connection
                </button>
              </div>

              <p
                class="aurora-registration-message"
                id="auroraRegistrationMessage"
                data-state="idle"
                aria-live="polite"
              >
                Enter the URL and token, then save and test.
              </p>

              <p class="aurora-registration-security">
                The private token is stored only in this device’s Aurora app data and is excluded from Aurora Cloud Sync.
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer class="aurora-nav-foot">
        <strong>Aurora HQ navigation.</strong>
        Cloud status is shown above without covering dashboard content.
      </footer>
    `;

    document.body.append(toggle,overlay,panel);

    const closeButton =
      panel.querySelector(".aurora-nav-close");

    const cloudControl =
      panel.querySelector("#auroraNavCloud");

    const registrationToggle =
      panel.querySelector(
        "#auroraRegistrationToggle"
      );

    const registrationPanel =
      panel.querySelector(
        "#auroraRegistrationPanel"
      );

    const registrationSave =
      panel.querySelector(
        "#auroraRegistrationSave"
      );

    const registrationTest =
      panel.querySelector(
        "#auroraRegistrationTest"
      );

    const registrationUrl =
      panel.querySelector(
        "#auroraRegistrationUrl"
      );

    const registrationToken =
      panel.querySelector(
        "#auroraRegistrationToken"
      );

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

    cloudControl.addEventListener(
      "click",
      function(){
        setOpen(false);
        location.href = "AuroraCloudSync.html";
      }
    );

    registrationToggle.addEventListener(
      "click",
      function(){
        const open =
          !registrationPanel.classList.contains(
            "is-open"
          );

        registrationPanel.classList.toggle(
          "is-open",
          open
        );

        registrationPanel.setAttribute(
          "aria-hidden",
          String(!open)
        );

        registrationToggle.setAttribute(
          "aria-expanded",
          String(open)
        );

        if(open){
          window.setTimeout(function(){
            registrationUrl.focus({
              preventScroll:true
            });
          },40);
        }
      }
    );

    registrationSave.addEventListener(
      "click",
      function(){
        try{
          const values =
            validateRegistrationValues(
              registrationUrl.value,
              registrationToken.value
            );

          saveRegistrationConnection(
            values.url,
            values.token,
            {connected:false}
          );

          registrationUiState(
            "saved",
            "Connection saved — tap Test connection"
          );
        }catch(error){
          registrationUiState(
            "error",
            error.message
          );
        }
      }
    );

    registrationTest.addEventListener(
      "click",
      async function(){
        registrationSave.disabled = true;
        registrationTest.disabled = true;

        try{
          const values =
            validateRegistrationValues(
              registrationUrl.value,
              registrationToken.value
            );

          saveRegistrationConnection(
            values.url,
            values.token,
            {connected:false}
          );

          registrationUiState(
            "testing",
            "Testing AuroraData connection…"
          );

          await testRegistrationConnection(
            values.url,
            values.token
          );

          saveRegistrationConnection(
            values.url,
            values.token,
            {
              connected:true,
              testedAt:new Date().toISOString()
            }
          );

          registrationUiState(
            "connected",
            "Registration Desk connected"
          );
        }catch(error){
          try{
            const existing =
              loadRegistrationConnection();

            if(existing?.url && existing?.token){
              saveRegistrationConnection(
                existing.url,
                existing.token,
                {
                  connected:false,
                  lastError:error.message
                }
              );
            }
          }catch(_){}

          registrationUiState(
            "error",
            error.message
            || "The Registration Desk could not connect."
          );
        }finally{
          registrationSave.disabled = false;
          registrationTest.disabled = false;
        }
      }
    );

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

    exposeRegistrationApi();
    loadRegistrationIntoUi();

    window.addEventListener(
      "storage",
      function(event){
        if(
          event.key
          === REGISTRATION_CONNECTION_KEY
        ){
          loadRegistrationIntoUi();
        }
      }
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
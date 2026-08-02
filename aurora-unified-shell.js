/*
 * Aurora City FC — Unified Top Bar & Hero System
 * Build: 2026-08-02 22:50 BST
 */
(function(){
  "use strict";

  const BUILD = "20260802-2250";
  const CREST = "assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png";

  const pages = {
    "AuroraBrowserDataTransfer.html": {
      title:"Browser Data Transfer",
      department:"Aurora Network Utility",
      path:"Home / Browser Data Transfer",
      image:"assets/aurora-city-fc/hero/nexus.PNG",
      subtitle:"Move Aurora’s local browser records safely between devices and browsers."
    },
    "AuroraCityFC_AnalysisRoom.html": {
      title:"Analysis Room",
      department:"Performance Intelligence",
      path:"Home / Analysis Room",
      image:"assets/aurora-city-fc/analysis-room-performance-lab.png",
      subtitle:"Live form, income, concentration and squad-quality intelligence."
    },
    "AuroraCityFC_Boardroom.html": {
      title:"Boardroom",
      department:"Executive Department",
      path:"Home / Boardroom",
      image:"assets/aurora-city-fc/boardroom-executive-suite.png",
      subtitle:"Board confidence, supporter mood, objectives and long-term club direction."
    },
    "AuroraCityFC_FinanceDepartment.html": {
      title:"Finance Department",
      department:"Payday & Capital Control",
      path:"Home / Finance Department",
      image:"assets/aurora-city-fc/hero/finance.PNG",
      subtitle:"Bills, pots, payday deployment and safe capital movement under one command."
    },
    "AuroraCityFC_LearningCentre.html": {
      title:"Learning Centre",
      department:"Brain Performance Department",
      path:"Home / Learning Centre",
      image:"assets/aurora-city-fc/hero/nexus.PNG",
      subtitle:"Aurora’s permanent recommendation memory and outcome review engine."
    },
    "AuroraCityFC_ManagerDashboard.html": {
      title:"Manager Dashboard",
      department:"Club HQ",
      path:"Home / Manager Command Centre",
      image:"assets/aurora-city-fc/hero/managerdash.PNG",
      subtitle:"The live command centre for Aurora City FC."
    },
    "AuroraCityFC_MatchdayCentre.html": {
      title:"Matchday Centre",
      department:"Daily Full-Time Report",
      path:"Home / Matchday Centre",
      image:"assets/aurora-city-fc/hero/matchday.PNG",
      subtitle:"The daily portfolio result, scoreline and manager’s full-time report."
    },
    "AuroraCityFC_MediaCentre.html": {
      title:"Media Centre",
      department:"Press Department",
      path:"Home / Media Centre",
      image:"https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/media/media_hero_press_room.PNG",
      subtitle:"Dividend announcements, market stories, rumours and press conferences."
    },
    "AuroraCityFC_NexusMaster.html": {
      title:"Nexus Command Centre",
      department:"Aurora Brain HQ",
      path:"Home / Nexus Command Centre",
      image:"assets/aurora-city-fc/hero/nexus.PNG",
      subtitle:"The shared intelligence engine connecting every Aurora department."
    },
    "AuroraCityFC_ScoutingCentre.html": {
      title:"Scouting Centre",
      department:"National Scouting Network",
      path:"Home / Scouting Centre",
      image:"assets/aurora-city-fc/hero/nexus.PNG",
      subtitle:"Track, rank and promote future investments before they reach recruitment."
    },
    "AuroraCityFC_SquadHub.html": {
      title:"Squad Hub",
      department:"First-Team Department",
      path:"Home / Squad Hub",
      image:"https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/squad-hub-tactical-room.png",
      subtitle:"Current holdings, roles, squad balance, chemistry and club achievements."
    },
    "AuroraCityFC_TrainingGround.html": {
      title:"Training Ground",
      department:"Performance Department",
      path:"Home / Training Ground",
      image:"https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/training/training_hero_ground.PNG",
      subtitle:"Share-price form, player development, rising stars and coaching reports."
    },
    "AuroraCityFC_TransferCentre.html": {
      title:"Transfer Centre",
      department:"Recruitment Command",
      path:"Home / Transfer Centre",
      image:"assets/aurora-city-fc/transfer-center-war-room.png",
      subtitle:"Authorise the budget, approve the deal sheet and record completed purchases."
    }
  };

  function filename(){
    return decodeURIComponent(location.pathname.split("/").pop() || "index.html");
  }

  function pageConfig(){
    return pages[filename()] || null;
  }

  function versioned(url){
    if(!url) return "";
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}aurora=${BUILD}`;
  }

  function createElement(tag,className,html){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(html !== undefined) node.innerHTML = html;
    return node;
  }

  function shellTarget(){
    /* FM pages keep the bar inside their workspace; every other page gets a
       true full-width bar directly under the browser/app safe area. */
    return document.querySelector(".fm-workspace") || document.body;
  }

  function collectOldTopbarActions(oldTopbar){
    if(!oldTopbar) return [];
    return Array.from(oldTopbar.querySelectorAll("button,a.button,a.btn"))
      .filter(function(node){
        return !node.closest(".brand") && !node.classList.contains("crest");
      });
  }

  function installTopbar(config){
    const isManager = filename() === "AuroraCityFC_ManagerDashboard.html";
    const managerTopbar = isManager ? document.querySelector(".topbar") : null;
    if(managerTopbar) return managerTopbar;

    const oldTopbar = document.querySelector(".topbar");
    const oldActions = collectOldTopbarActions(oldTopbar);

    const topbar = createElement("div","topbar aurora-unified-topbar");
    topbar.setAttribute("data-aurora-build",BUILD);

    const inner = createElement("div","topbar-inner");
    const brand = createElement("div","brand");
    const crest = createElement("div","crest");
    const crestImage = document.createElement("img");
    crestImage.alt = "Aurora City FC crest";
    crestImage.src = versioned(CREST);
    crestImage.addEventListener("error",function(){
      crest.textContent = "AC";
      crest.style.color = "#a5f3fc";
      crest.style.fontWeight = "1000";
    },{once:true});
    crest.appendChild(crestImage);

    const identity = createElement("div","");
    const club = document.createElement("h1");
    club.textContent = "Aurora City FC";
    const page = document.createElement("p");
    page.textContent = `${config.title} • ${config.department}`;
    identity.append(club,page);
    brand.append(crest,identity);

    const context = createElement("div","fm-top-context");
    const path = createElement("span","fm-page-path");
    path.textContent = config.path;

    const actions = createElement("div","aurora-top-actions");
    oldActions.forEach(function(action){
      actions.appendChild(action);
    });

    const refresh = createElement("button","aurora-unified-refresh");
    refresh.type = "button";
    refresh.title = "Refresh this Aurora page";
    refresh.setAttribute("aria-label","Refresh this Aurora page");
    refresh.innerHTML = '<span aria-hidden="true">↻</span><span class="aurora-action-label">Refresh</span>';
    refresh.addEventListener("click",function(){ location.reload(); });
    actions.appendChild(refresh);

    const pill = createElement("span","fm-top-pill");
    pill.innerHTML = '<span class="fm-top-dot"></span>Live Aurora Session';

    context.append(path,actions,pill);
    inner.append(brand,context);
    topbar.appendChild(inner);

    const target = shellTarget();
    target.insertBefore(topbar,target.firstChild);

    if(oldTopbar && oldTopbar !== topbar){
      oldTopbar.remove();
    }

    return topbar;
  }

  function findHero(){
    const selectors = [
      ".aurora-photo-hero",
      ".boardroom-photo-hero",
      ".matchday-stadium-hero",
      "main .hero",
      ".hq-hero",
      "section[id$='-overview']",
      ".hero"
    ];

    for(const selector of selectors){
      const candidate = document.querySelector(selector);
      if(candidate && !candidate.classList.contains("aurora-unified-generated")){
        return candidate;
      }
    }
    return null;
  }

  function addHeroDecorations(hero,config){
    if(!hero.querySelector(":scope > .aurora-unified-aura.aura-one")){
      hero.prepend(createElement("span","aurora-unified-aura aura-two"));
      hero.prepend(createElement("span","aurora-unified-aura aura-one"));
    }

    if(!hero.querySelector(":scope > .aurora-unified-hero-badge")){
      const badge = createElement("span","aurora-unified-hero-badge");
      badge.innerHTML = `<i></i>${config.department} • Live`;
      hero.prepend(badge);
    }
  }

  function generatedHero(config){
    const hero = createElement("section","aurora-unified-hero aurora-unified-generated aurora-section-anchor");
    hero.id = `${filename().replace(/\.html$/i,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-overview`;
    hero.innerHTML = `
      <span class="aurora-unified-aura aura-one"></span>
      <span class="aurora-unified-aura aura-two"></span>
      <span class="aurora-unified-hero-badge"><i></i>${config.department} • Live</span>
      <span class="aurora-generated-kicker">${config.department}</span>
      <h2><span>${config.title}</span></h2>
      <p>${config.subtitle}</p>`;
    return hero;
  }

  function installHero(config){
    const isManager = filename() === "AuroraCityFC_ManagerDashboard.html";
    if(isManager && document.querySelector("#auroraHero[data-aurora-hero]")){
      return;
    }

    let hero = findHero();
    if(!hero){
      hero = generatedHero(config);
      const main = document.querySelector("main") || shellTarget();
      main.insertBefore(hero,main.firstChild);
    }

    hero.classList.add("aurora-unified-hero");
    hero.setAttribute("data-aurora-unified","true");
    hero.setAttribute("data-aurora-build",BUILD);
    hero.style.setProperty("--aurora-hero-image",`url("${versioned(config.image)}")`);
    addHeroDecorations(hero,config);
  }

  function installServiceWorkerUpdate(){
    if(!("serviceWorker" in navigator)) return;

    window.addEventListener("load",function(){
      navigator.serviceWorker.register("./service-worker.js",{
        updateViaCache:"none"
      }).then(function(registration){
        registration.update().catch(function(){});

        if(registration.waiting){
          registration.waiting.postMessage({type:"SKIP_WAITING"});
        }

        registration.addEventListener("updatefound",function(){
          const worker = registration.installing;
          if(!worker) return;
          worker.addEventListener("statechange",function(){
            if(worker.state === "installed" && navigator.serviceWorker.controller){
              worker.postMessage({type:"SKIP_WAITING"});
            }
          });
        });
      }).catch(function(error){
        console.warn("Aurora service worker update check failed",error);
      });
    },{once:true});

    navigator.serviceWorker.addEventListener("controllerchange",function(){
      const key = `aurora-controller-reload-${BUILD}`;
      if(sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key,"1");
      location.reload();
    });
  }

  function boot(){
    const config = pageConfig();
    installServiceWorkerUpdate();
    if(!config) return;

    document.body.classList.add("aurora-unified-ready");
    document.documentElement.setAttribute("data-aurora-shell-build",BUILD);
    installTopbar(config);
    installHero(config);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();

/* ===================== SECTION: AURORA CITY FC SHARED DATA ===================== */
/*
  AuroraFCData.js
  One shared control file for the Aurora City FC HTML set.

  Update this file when you want all four FC pages to use the same:
  - data source
  - page links
  - transfer target groups
  - budget settings
  - platform rules
  - club/board labels
*/

window.AURORA_FC = {
  version: "1.0.0",
  updated: "2026-06-15",

  club: {
    name: "Aurora City FC",
    manager: "Chris Webb",
    assistant: "Lily",
    badgeAlt: "Aurora City FC"
  },

  dataUrl: "https://script.google.com/macros/s/AKfycbzR9kEguzDL5ICF4xn3nHBLyE0ELv_ZSgn46vld54V7KZt6CRsFU_mNzx0AQd1qXPei/exec",
  githubPagesDataUrl: "https://webbchrisuk-max.github.io/pillar-tracker/AuroraMaster.json",

  pages: {
    manager: "AuroraCityFC_ManagerDashboard.html",
    transfer: "AuroraCityFC_TransferCentre.html",
    boardroom: "AuroraCityFC_Boardroom.html",
    squad: "AuroraCityFC_SquadHub.html"
  },

  targets: {
    incomeFour: ["LON:FSFL", "LON:RGL", "LON:UKW", "LON:TRIG"],
    upgradeFour: ["LON:RGL", "LON:RKT", "LON:ULVR", "LON:TRIG"],
    topTransferTarget: "LON:RGL"
  },

  budget: {
    nextPayday: 500,
    reserve: 50,
    available: 450,
    deploymentPerPlayerManager: 112.5,
    deploymentPerPlayerTransfer: 125,
    impactIncomeTrigger: 20
  },

  platformRules: {
    RKT: "IG ISA",
    ULVR: "IG ISA",
    LGEN: "IG ISA",
    MNG: "IG ISA",
    SDLF: "IG ISA",
    SUPR: "IG ISA",
    IMB: "IG ISA",
    SBRY: "IG ISA",
    LMP: "IG ISA",

    FSFL: "Trade212",
    UKW: "Trade212",
    TRIG: "Trade212",
    RGL: "Trade212 / Check",
    GCP: "Trade212",
    PHP: "Trade212",
    FGEN: "Trade212",
    SEQI: "Trade212",
    TW: "Trade212"
  },

  assets: {
    basePath: "assets/aurora-city-fc/",
    crest: "assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png",
    playerPortraits: {
      RGL: "assets/aurora-city-fc/players/rgl_player.png",
      RKT: "assets/aurora-city-fc/players/rkt_player.png",
      ULVR: "assets/aurora-city-fc/players/ulvr_player.png",
      TRIG: "assets/aurora-city-fc/players/trig_player.png",
      GCP: "assets/aurora-city-fc/players/gcp_player.png",
      SBRY: "assets/aurora-city-fc/players/sbry_player.png",
      OMP: "assets/aurora-city-fc/players/omp_player.png",
      IMB: "assets/aurora-city-fc/players/imb_player.png"
    }
  },

  helper: {
    tickerKey(value){
      return String(value || "")
        .replace("LON:", "")
        .replace(".GB", "")
        .replace(".L", "")
        .trim()
        .toUpperCase();
    },

    applySharedLinks(){
      const pages = window.AURORA_FC?.pages || {};
      const linkMap = {
        "AuroraCityFC_ManagerDashboard.html": pages.manager,
        "AuroraCityFC_TransferCentre.html": pages.transfer,
        "AuroraCityFC_Boardroom.html": pages.boardroom,
        "AuroraCityFC_SquadHub.html": pages.squad
      };

      document.querySelectorAll("a[href]").forEach(link => {
        const href = link.getAttribute("href");
        if(linkMap[href]) link.setAttribute("href", linkMap[href]);
      });
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.AURORA_FC?.helper?.applySharedLinks?.();
});

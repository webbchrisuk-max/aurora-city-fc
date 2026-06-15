/* ===================== SECTION: AURORA CITY FC SHARED DATA ===================== */
window.AURORA_FC = {
  version: "2026-06-15-connected",

  club: {
    name: "Aurora City FC",
    manager: "Chris Webb",
    assistant: "Lily"
  },

  dataUrl: "https://script.google.com/macros/s/AKfycbzR9kEguzDL5ICF4xn3nHBLyE0ELv_ZSgn46vld54V7KZt6CRsFU_mNzx0AQd1qXPei/exec",

  pages: {
    manager: "AuroraCityFC_ManagerDashboard.html",
    transfer: "AuroraCityFC_TransferCentre.html",
    boardroom: "AuroraCityFC_Boardroom.html",
    squad: "AuroraCityFC_SquadHub.html"
  },

  targets: {
    incomeFour: ["LON:FSFL", "LON:RGL", "LON:UKW", "LON:TRIG"],
    upgradeFour: ["LON:RGL", "LON:RKT", "LON:ULVR", "LON:TRIG"]
  },

  budget: {
    paydayBudget: 500,
    reserve: 50,
    available: 450,
    deploymentPerPlayerManager: 112.5,
    deploymentPerPlayerTransfer: 125,
    impactIncomeTrigger: 20
  },

  pwa: {
    orientation: "landscape",
    display: "standalone"
  }
};


(() => {
  "use strict";

  const body = document.body;
  const transferMenu = document.getElementById("transferSideMenu");

  if (!transferMenu) return;

  const updateFooter = () => {
    body.classList.toggle(
      "fm-transfer-menu-open",
      transferMenu.open
    );
  };

  transferMenu.addEventListener("toggle", updateFooter);
  window.addEventListener("pageshow", updateFooter);
  updateFooter();
})();

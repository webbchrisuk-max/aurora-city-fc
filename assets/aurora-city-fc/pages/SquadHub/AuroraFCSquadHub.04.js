
(() => {
  "use strict";

  const body = document.body;
  const sidebar = document.querySelector(".fm-sidebar");
  const workspace = document.querySelector(".fm-workspace");
  const edgeZone = document.getElementById("fmSidebarEdgeZone");
  const collapseButton = document.getElementById("fmSidebarCollapse");
  const transferMenu = document.getElementById("transferSideMenu");
  const clock = document.getElementById("fmClock");

  if (!sidebar || !workspace || !edgeZone || !collapseButton) return;

  const hiddenClass = "fm-sidebar-hidden";
  const transferStateKey = "aurora_transfer_sidebar_open";
  const autoHideDelay = 2600;

  let hideTimer = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchSource = "";
  let gestureHandled = false;

  const clearHideTimer = () => {
    if (!hideTimer) return;
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  };

  const isHidden = () => body.classList.contains(hiddenClass);

  const showSidebar = () => {
    clearHideTimer();
    body.classList.remove(hiddenClass);
    sidebar.setAttribute("aria-hidden", "false");
    edgeZone.setAttribute("aria-hidden", "true");
  };

  const hideSidebar = () => {
    clearHideTimer();
    body.classList.add(hiddenClass);
    sidebar.setAttribute("aria-hidden", "true");
    edgeZone.setAttribute("aria-hidden", "false");
  };

  const scheduleHide = (delay = autoHideDelay) => {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      if (!sidebar.matches(":hover") &&
          !sidebar.contains(document.activeElement)) {
        hideSidebar();
      }
    }, delay);
  };

  const updateClock = () => {
    if (!clock) return;
    const now = new Date();

    clock.textContent =
      now.toLocaleDateString("en-GB", {
        weekday:"short",
        day:"2-digit",
        month:"short"
      }) +
      " • " +
      now.toLocaleTimeString("en-GB", {
        hour:"2-digit",
        minute:"2-digit"
      });
  };

  const updateTransferActiveLink = () => {
    if (!transferMenu) return;

    const currentFile =
      window.location.pathname.split("/").pop() ||
      "AuroraCityFC_ManagerDashboard.html";
    const currentHash = window.location.hash || "";

    transferMenu.querySelectorAll(".fm-side-submenu a").forEach(link => {
      const url = new URL(link.href, window.location.href);
      const linkFile = url.pathname.split("/").pop();
      const linkHash = url.hash || "";

      const selected =
        currentFile === "AuroraCityFC_TransferCentre.html" &&
        linkFile === currentFile &&
        (
          (currentHash && linkHash === currentHash) ||
          (!currentHash && !linkHash)
        );

      link.classList.toggle("active", selected);
    });
  };

  collapseButton.addEventListener("click", hideSidebar);

  edgeZone.addEventListener("pointerenter", showSidebar);
  edgeZone.addEventListener("click", showSidebar);
  edgeZone.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    showSidebar();
  });

  sidebar.addEventListener("pointerenter", clearHideTimer);
  sidebar.addEventListener("pointerleave", () => scheduleHide(1200));
  sidebar.addEventListener("focusin", clearHideTimer);
  sidebar.addEventListener("focusout", () => scheduleHide(1500));

  document.addEventListener("mousemove", event => {
    if (isHidden() && event.clientX <= 18) showSidebar();
  }, { passive:true });

  workspace.addEventListener("pointerdown", event => {
    if (!isHidden() && event.pointerType !== "mouse") hideSidebar();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !isHidden()) hideSidebar();
  });

  const beginTouch = (event, source) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchSource = source;
    gestureHandled = false;
  };

  const trackTouch = event => {
    if (gestureHandled) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15) return;

    if (touchSource === "edge" && deltaX > 42) {
      gestureHandled = true;
      showSidebar();
    }

    if (touchSource === "sidebar" && deltaX < -42) {
      gestureHandled = true;
      hideSidebar();
    }
  };

  edgeZone.addEventListener(
    "touchstart",
    event => beginTouch(event, "edge"),
    { passive:true }
  );
  edgeZone.addEventListener("touchmove", trackTouch, { passive:true });

  sidebar.addEventListener(
    "touchstart",
    event => beginTouch(event, "sidebar"),
    { passive:true }
  );
  sidebar.addEventListener("touchmove", trackTouch, { passive:true });

  if (transferMenu) {
    const currentFile = window.location.pathname.split("/").pop();

    try {
      if (currentFile === "AuroraCityFC_TransferCentre.html") {
        transferMenu.open = true;
      } else {
        transferMenu.open =
          sessionStorage.getItem(transferStateKey) === "1";
      }
    } catch (_) {}

    transferMenu.addEventListener("toggle", () => {
      try {
        sessionStorage.setItem(
          transferStateKey,
          transferMenu.open ? "1" : "0"
        );
      } catch (_) {}
    });
  }

  window.addEventListener("hashchange", updateTransferActiveLink);
  window.addEventListener("pageshow", () => {
    showSidebar();
    updateTransferActiveLink();
    scheduleHide(4200);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => registrations.forEach(item => item.update()))
      .catch(() => {});
  }

  updateClock();
  window.setInterval(updateClock, 30000);
  updateTransferActiveLink();
  showSidebar();
  scheduleHide(4200);
})();

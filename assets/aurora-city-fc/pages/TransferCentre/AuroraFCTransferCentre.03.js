
(() => {
  "use strict";

  const targets = Array.from(document.querySelectorAll("[data-aurora-copy-from]"));
  if (!targets.length) return;

  const copyOne = target => {
    const sourceId = target.getAttribute("data-aurora-copy-from");
    const source = sourceId ? document.getElementById(sourceId) : null;
    if (!source || source === target) return;

    const value = (source.textContent || "").trim();
    if (value) target.textContent = value;
  };

  const connect = target => {
    const sourceId = target.getAttribute("data-aurora-copy-from");
    const source = sourceId ? document.getElementById(sourceId) : null;
    copyOne(target);
    if (!source || source === target) return;

    new MutationObserver(() => copyOne(target)).observe(source, {
      subtree: true,
      childList: true,
      characterData: true
    });
  };

  const start = () => {
    targets.forEach(connect);
    window.setTimeout(() => targets.forEach(copyOne), 250);
    window.setTimeout(() => targets.forEach(copyOne), 1000);
    window.setTimeout(() => targets.forEach(copyOne), 3000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

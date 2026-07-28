
(() => {
  "use strict";
  const menu = document.querySelector('.aurora-page-folder');
  if (!menu) return;
  const links = [...menu.querySelectorAll('.fm-page-submenu a[href^="#"]')];
  const pairs = links.map(link => ({link, target:document.getElementById(link.getAttribute('href').slice(1))})).filter(x => x.target);
  if (!pairs.length) return;

  const mark = id => {
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  };

  const scrollToHash = hash => {
    const target = document.getElementById(String(hash || '').replace(/^#/,''));
    if (!target) return false;
    menu.open = true;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    mark(target.id);
    return true;
  };

  links.forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || !scrollToHash(hash)) return;
    event.preventDefault();
    try { history.replaceState(null,'',hash); } catch (_) {}
  }));

  let ticking = false;
  const syncActive = () => {
    ticking = false;
    const guide = Math.max(110, window.innerHeight * .28);
    let current = pairs[0];
    for (const pair of pairs) {
      if (pair.target.getBoundingClientRect().top <= guide) current = pair;
      else break;
    }
    mark(current.target.id);
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncActive);
  }, {passive:true});
  window.addEventListener('resize', syncActive, {passive:true});
  window.addEventListener('hashchange', () => {
    if (location.hash) scrollToHash(location.hash);
    else syncActive();
  });

  if (location.hash && document.getElementById(location.hash.slice(1))) {
    window.setTimeout(() => scrollToHash(location.hash), 80);
  } else {
    syncActive();
  }
})();

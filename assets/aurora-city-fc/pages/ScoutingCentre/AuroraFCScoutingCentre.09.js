
(function(){
  'use strict';
  function fixSidebar(){
    document.body.classList.remove('fm-sidebar-hidden','aufc-nav-collapsed','aufc-mobile-open');
    try{ localStorage.setItem('auroraUnifiedSidebarCollapsed','0'); }catch(e){}
    var old=document.querySelector('.fm-sidebar');
    if(old){ old.setAttribute('aria-hidden','true'); old.style.display='none'; }
    var edge=document.getElementById('fmSidebarEdgeZone');
    if(edge){ edge.setAttribute('aria-hidden','true'); edge.style.display='none'; }
    var workspace=document.querySelector('.fm-workspace');
    if(workspace) workspace.style.marginLeft='0';
    var unified=document.getElementById('auroraUnifiedFinanceSidebar');
    if(unified) unified.setAttribute('aria-hidden','false');
    var toggle=document.getElementById('aufcSidebarToggle');
    if(toggle) toggle.setAttribute('aria-expanded','true');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(fixSidebar,0);},{once:true});
  else setTimeout(fixSidebar,0);
  window.addEventListener('pageshow',fixSidebar);
})();

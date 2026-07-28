
/* ===================== M21 AUTO-HIDE MANAGER SIDEBAR ===================== */
(function(){
  const app=document.querySelector('.m13-app');
  const sidebar=document.querySelector('.m13-sidebar');
  const toggle=document.getElementById('m21SidebarToggle');
  const nav=document.getElementById('m13Nav');
  if(!app||!sidebar||!toggle)return;

  const desktopQuery=window.matchMedia('(min-width: 821px)');
  const hoverQuery=window.matchMedia('(hover: hover) and (pointer: fine)');
  let hideTimer=0;

  const isDesktop=()=>desktopQuery.matches;
  const clearHide=()=>{if(hideTimer){window.clearTimeout(hideTimer);hideTimer=0;}};

  function setToggleState(expanded){
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded?'Hide manager sidebar':'Show manager sidebar');
    toggle.title=expanded?'Hide sidebar':'Show sidebar';
  }

  function expandSidebar(){
    if(!isDesktop())return;
    clearHide();
    app.classList.remove('m13-sidebar-collapsed');
    setToggleState(true);
  }

  function collapseSidebar(){
    if(!isDesktop())return;
    clearHide();
    app.classList.add('m13-sidebar-collapsed');
    setToggleState(false);
  }

  function scheduleCollapse(delay=480){
    if(!isDesktop())return;
    clearHide();
    hideTimer=window.setTimeout(collapseSidebar,delay);
  }

  function syncResponsiveState(){
    clearHide();
    if(isDesktop()){
      collapseSidebar();
    }else{
      app.classList.remove('m13-sidebar-collapsed');
      setToggleState(true);
    }
  }

  toggle.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(app.classList.contains('m13-sidebar-collapsed'))expandSidebar();
    else collapseSidebar();
  });

  sidebar.addEventListener('pointerenter',()=>{
    if(hoverQuery.matches)expandSidebar();
  });
  sidebar.addEventListener('pointerleave',()=>{
    if(hoverQuery.matches)scheduleCollapse();
  });
  sidebar.addEventListener('focusin',expandSidebar);
  sidebar.addEventListener('focusout',()=>scheduleCollapse(650));

  nav?.querySelectorAll('button').forEach(button=>{
    const label=button.querySelector('span:last-child')?.textContent?.trim();
    if(label)button.title=label;
    button.addEventListener('click',()=>scheduleCollapse(260));
  });

  document.addEventListener('click',event=>{
    if(!isDesktop()||hoverQuery.matches)return;
    if(!sidebar.contains(event.target))collapseSidebar();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')collapseSidebar();
  });

  if(typeof desktopQuery.addEventListener==='function')desktopQuery.addEventListener('change',syncResponsiveState);
  else if(typeof desktopQuery.addListener==='function')desktopQuery.addListener(syncResponsiveState);

  setToggleState(!app.classList.contains('m13-sidebar-collapsed'));
  window.addEventListener('load',()=>window.setTimeout(syncResponsiveState,180),{once:true});
})();

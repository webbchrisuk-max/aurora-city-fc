
(function(){
  'use strict';
  var KEEP_KEY='auroraSidebarKeepOpenV4';
  var keepOpen=false;
  function isMobile(){return window.matchMedia('(max-width:820px)').matches;}
  function setKeep(value){keepOpen=!!value;try{sessionStorage.setItem(KEEP_KEY,keepOpen?'1':'0');}catch(e){};if(isMobile())document.body.classList.toggle('aufc-mobile-open',keepOpen);}
  function restoreOpen(){
    try{keepOpen=sessionStorage.getItem(KEEP_KEY)==='1';}catch(e){keepOpen=false;}
    document.body.classList.remove('aufc-nav-collapsed');
    try{localStorage.setItem('auroraUnifiedSidebarCollapsed','0');}catch(e){}
    if(isMobile()&&keepOpen)document.body.classList.add('aufc-mobile-open');
  }
  function installSections(){
    var unified=document.getElementById('auroraUnifiedFinanceSidebar');
    if(!unified||unified.querySelector('.aufc-page-sections'))return;
    var source=document.querySelector('.fm-side-folder.active .fm-side-submenu');
    var active=unified.querySelector('.aufc-link.active');
    if(!source||!active)return;
    var box=document.createElement('div');box.className='aufc-page-sections';
    source.querySelectorAll('a[href]').forEach(function(old){
      var a=document.createElement('a');a.href=old.getAttribute('href');a.textContent=old.textContent.trim();
      if(a.hash&&a.hash===location.hash)a.classList.add('active');
      box.appendChild(a);
    });
    active.insertAdjacentElement('afterend',box);
  }
  function navigateKeepingOpen(a,e){
    var href=a.getAttribute('href')||'';
    if(!href||href==='#')return;
    e.preventDefault();e.stopImmediatePropagation();
    setKeep(true);
    var url=new URL(href,location.href);
    if(url.pathname===location.pathname&&url.hash){
      history.pushState(null,'',url.hash);
      var target=document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
      document.querySelectorAll('.aufc-page-sections a').forEach(function(x){x.classList.toggle('active',x.hash===url.hash)});
      document.body.classList.add('aufc-mobile-open');
    }else{
      location.href=url.href;
    }
  }
  function bindCapture(){
    document.addEventListener('click',function(e){
      var a=e.target.closest('#auroraUnifiedFinanceSidebar a[href], #auroraUnifiedFinanceSidebar .aufc-page-sections a[href]');
      if(a){navigateKeepingOpen(a,e);return;}
      if(e.target.closest('#aufcMobileShade')){e.preventDefault();e.stopImmediatePropagation();setKeep(false);return;}
      var mobile=e.target.closest('#aufcMobileButton');
      if(mobile){e.preventDefault();e.stopImmediatePropagation();setKeep(!document.body.classList.contains('aufc-mobile-open'));return;}
    },true);
    window.addEventListener('scroll',function(e){
      if(isMobile()&&keepOpen){
        document.body.classList.add('aufc-mobile-open');
      }
    },true);
    var observer=new MutationObserver(function(){
      if(isMobile()&&keepOpen&&!document.body.classList.contains('aufc-mobile-open')){
        document.body.classList.add('aufc-mobile-open');
      }
    });
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  function init(){restoreOpen();setTimeout(installSections,20);setTimeout(installSections,250);bindCapture();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('pageshow',restoreOpen);
})();


(function(){
  'use strict';
  var activePage="boardroom";
  function mount(){
    if(document.getElementById('auroraUnifiedFinanceSidebar')) return;
    document.body.insertAdjacentHTML('afterbegin', "\n<aside class=\"aufc-sidebar\" id=\"auroraUnifiedFinanceSidebar\" aria-label=\"Aurora City FC navigation\">\n  <button class=\"aufc-toggle\" id=\"aufcSidebarToggle\" type=\"button\" aria-label=\"Collapse navigation\" aria-expanded=\"true\"><span>\u2039</span></button>\n  <div class=\"aufc-brand\">\n    <div class=\"aufc-crest\"><img alt=\"Aurora City FC crest\" src=\"https://raw.githubusercontent.com/webbchrisuk-max/aurora-city-fc/main/assets/aurora-city-fc/098E0ECA-EF84-4317-86E5-6592469C7534.png\"></div>\n    <div class=\"aufc-brand-copy\"><strong>Aurora City FC</strong><small>CONNECTED CLUB SYSTEM</small></div>\n  </div>\n  <nav class=\"aufc-scroll\"><div class=\"aufc-label\">Manager</div><div class=\"aufc-links\"><a class=\"aufc-link\" data-page=\"home\" href=\"AuroraCityFC_ManagerDashboard.html\" style=\"--nav-accent:#60a5fa;--nav-rgb:96,165,250\"><span class=\"aufc-icon\">\u2302</span><span class=\"aufc-name\">Home</span><span class=\"aufc-status\"></span></a></div><div class=\"aufc-label\">Finance</div><div class=\"aufc-links\"><a class=\"aufc-link finance-link\" data-page=\"finance\" href=\"AuroraCityFC_FinanceDepartment.html\" style=\"--nav-accent:#f3c45b;--nav-rgb:243,196,91\"><span class=\"aufc-icon\">\u00a3</span><span class=\"aufc-name\">Finance Department</span><span class=\"aufc-status\"></span></a></div><div class=\"aufc-label\">Performance</div><div class=\"aufc-links\"><a class=\"aufc-link\" data-page=\"squad\" href=\"AuroraCityFC_SquadHub.html\" style=\"--nav-accent:#22d3ee;--nav-rgb:34,211,238\"><span class=\"aufc-icon\">\u265f</span><span class=\"aufc-name\">Squad Hub</span><span class=\"aufc-status\"></span></a><a class=\"aufc-link\" data-page=\"analysis\" href=\"AuroraCityFC_AnalysisRoom.html\" style=\"--nav-accent:#a78bfa;--nav-rgb:167,139,250\"><span class=\"aufc-icon\">\u2301</span><span class=\"aufc-name\">Analysis Room</span><span class=\"aufc-status\"></span></a><a class=\"aufc-link\" data-page=\"training\" href=\"AuroraCityFC_TrainingGround.html\" style=\"--nav-accent:#34d399;--nav-rgb:52,211,153\"><span class=\"aufc-icon\">\u2699</span><span class=\"aufc-name\">Training Ground</span><span class=\"aufc-status\"></span></a></div><div class=\"aufc-label\">Recruitment</div><div class=\"aufc-links\"><a class=\"aufc-link\" data-page=\"scouting\" href=\"AuroraCityFC_ScoutingCentre.html\" style=\"--nav-accent:#4ade80;--nav-rgb:74,222,128\"><span class=\"aufc-icon\">\u25ce</span><span class=\"aufc-name\">Scouting Centre</span><span class=\"aufc-status\"></span></a><a class=\"aufc-link\" data-page=\"transfer\" href=\"AuroraCityFC_TransferCentre.html\" style=\"--nav-accent:#fbbf24;--nav-rgb:251,191,36\"><span class=\"aufc-icon\">\u21c4</span><span class=\"aufc-name\">Transfer Centre</span><span class=\"aufc-status\"></span></a></div><div class=\"aufc-label\">Club</div><div class=\"aufc-links\"><a class=\"aufc-link active\" data-page=\"boardroom\" href=\"AuroraCityFC_Boardroom.html\" style=\"--nav-accent:#60a5fa;--nav-rgb:96,165,250\"><span class=\"aufc-icon\">\u265c</span><span class=\"aufc-name\">Boardroom</span><span class=\"aufc-status\"></span></a><a class=\"aufc-link\" data-page=\"media\" href=\"AuroraCityFC_MediaCentre.html\" style=\"--nav-accent:#fb7185;--nav-rgb:251,113,133\"><span class=\"aufc-icon\">\u25eb</span><span class=\"aufc-name\">Media Centre</span><span class=\"aufc-status\"></span></a><a class=\"aufc-link\" data-page=\"nexus\" href=\"AuroraCityFC_NexusMaster.html\" style=\"--nav-accent:#b985ff;--nav-rgb:185,133,255\"><span class=\"aufc-icon\">\u2726</span><span class=\"aufc-name\">Nexus HQ</span><span class=\"aufc-status\"></span></a></div></nav>\n  <div class=\"aufc-footer\"><div class=\"aufc-live\"><i></i><span>Club systems connected</span></div></div>\n</aside>\n<div class=\"aufc-mobile-shade\" id=\"aufcMobileShade\"></div>\n<button class=\"aufc-mobile-button\" id=\"aufcMobileButton\" type=\"button\" aria-label=\"Open navigation\">\u2630</button>\n");
    document.body.classList.add('aufc-nav-ready');
    var saved=localStorage.getItem('auroraUnifiedSidebarCollapsed')==='1';
    if(saved && window.innerWidth>820) document.body.classList.add('aufc-nav-collapsed');
    var toggle=document.getElementById('aufcSidebarToggle');
    var mobile=document.getElementById('aufcMobileButton');
    var shade=document.getElementById('aufcMobileShade');
    function sync(){
      var collapsed=document.body.classList.contains('aufc-nav-collapsed');
      if(toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
    }
    if(toggle) toggle.addEventListener('click',function(){
      document.body.classList.toggle('aufc-nav-collapsed');
      localStorage.setItem('auroraUnifiedSidebarCollapsed',document.body.classList.contains('aufc-nav-collapsed')?'1':'0');
      sync();
    });
    function closeMobile(){document.body.classList.remove('aufc-mobile-open')}
    if(mobile) mobile.addEventListener('click',function(){document.body.classList.toggle('aufc-mobile-open')});
    if(shade) shade.addEventListener('click',closeMobile);
    document.querySelectorAll('.aufc-link').forEach(function(a){
      a.addEventListener('click',closeMobile);
    });
    window.addEventListener('resize',function(){
      if(window.innerWidth>820) closeMobile();
    });
    
    var lastY=Math.max(0,window.scrollY||0);
    var scrollTick=false;
    var lastDirection='';
    function autoSidebarOnScroll(){
      var y=Math.max(0,window.scrollY||0);
      var delta=y-lastY;
      if(window.innerWidth<=820){
        if(Math.abs(delta)>3) closeMobile();
      }else{
        if(y<=24){
          document.body.classList.remove('aufc-nav-collapsed');
          lastDirection='up';
        }else if(delta>7 && lastDirection!=='down'){
          document.body.classList.add('aufc-nav-collapsed');
          lastDirection='down';
        }else if(delta<-7 && lastDirection!=='up'){
          document.body.classList.remove('aufc-nav-collapsed');
          lastDirection='up';
        }
        sync();
      }
      lastY=y;
      scrollTick=false;
    }
    window.addEventListener('scroll',function(){
      if(!scrollTick){
        scrollTick=true;
        window.requestAnimationFrame(autoSidebarOnScroll);
      }
    },{passive:true});
    sync();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();

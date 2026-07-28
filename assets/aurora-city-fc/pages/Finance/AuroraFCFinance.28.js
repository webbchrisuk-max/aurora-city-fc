
(function(){
  'use strict';
  function init(){
    var app=document.querySelector('.m13-app');
    var side=document.querySelector('.m13-sidebar.aurora-finance-sidebar');
    if(!app||!side)return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='m13-sidebar-toggle aurora-finance-toggle';
    btn.setAttribute('aria-label','Collapse Finance navigation');
    btn.setAttribute('aria-expanded','true');
    btn.innerHTML='<span>‹</span>';
    side.appendChild(btn);

    function setCollapsed(value){
      app.classList.toggle('m13-sidebar-collapsed',!!value);
      btn.setAttribute('aria-expanded',String(!value));
    }
    btn.addEventListener('click',function(){
      setCollapsed(!app.classList.contains('m13-sidebar-collapsed'));
    });

    var lastY=Math.max(0,window.scrollY||0);
    var ticking=false;
    var direction='';
    function onFrame(){
      var y=Math.max(0,window.scrollY||0);
      var delta=y-lastY;
      if(window.innerWidth>820){
        if(y<=24){
          setCollapsed(false);
          direction='up';
        }else if(delta>7 && direction!=='down'){
          setCollapsed(true);
          direction='down';
        }else if(delta<-7 && direction!=='up'){
          setCollapsed(false);
          direction='up';
        }
      }
      lastY=y;
      ticking=false;
    }
    window.addEventListener('scroll',function(){
      if(!ticking){
        ticking=true;
        requestAnimationFrame(onFrame);
      }
    },{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();

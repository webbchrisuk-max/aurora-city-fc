
(function(){
  function cleanScoutingDuplicate(){
    const nav=document.querySelector('.fm-side-scroll');
    const folder=document.getElementById('scoutingSideMenu');
    if(!nav||!folder)return;
    nav.querySelectorAll('a[href*="AuroraCityFC_ScoutingCentre.html"]').forEach(link=>{
      if(!folder.contains(link)) link.remove();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',cleanScoutingDuplicate,{once:true});
  else cleanScoutingDuplicate();
  const nav=document.querySelector('.fm-side-scroll');
  if(nav){
    new MutationObserver(cleanScoutingDuplicate).observe(nav,{childList:true,subtree:true});
  }
})();

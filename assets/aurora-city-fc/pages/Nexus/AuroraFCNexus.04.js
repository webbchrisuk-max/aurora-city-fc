
(()=>{
 function init(){
  document.querySelectorAll('#auroraMissionPipeline .pipeline-stage').forEach((stage,i)=>{const h=stage.querySelector('h3'),link=stage.querySelector('.pipeline-link');if(i===0){if(h)h.textContent='Finance Mission';if(link){link.textContent='Open Finance Department';link.href='AuroraCityFC_FinanceDepartment.html'}}else if(i===1){if(h)h.textContent='Scouting Intelligence';if(link){link.textContent='Open Scouting Centre';link.href='AuroraCityFC_ScoutingCentre.html'}}else if(i===2){if(h)h.textContent='Transfer & Registration';if(link){link.textContent='Open Transfer Centre';link.href='AuroraCityFC_TransferCentre.html#registration-desk'}}});
  document.querySelectorAll('*').forEach(el=>{if(el.childElementCount===0&&typeof el.textContent==='string'){el.textContent=el.textContent.replace(/Wealth HQ/g,'Finance Department').replace(/Trading Brain/g,'Scouting Centre')}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

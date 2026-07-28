
(()=>{
 const CANONICAL='aurora_finance_department_mission_v1',LEGACY='aurora_wealth_investment_mission_v1',TEST='aurora_transfer_test_mode_v1';
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
 function publish(){const mission=read(LEGACY)||read(CANONICAL);if(!mission)return;const test=read(TEST);const enriched={...mission,source:'Finance Department',department:'Finance Department',destination:'Aurora City FC Transfer Centre',status:mission.status||'READY_FOR_TRANSFER_CENTRE',testMode:!!test?.active,updatedAt:new Date().toISOString()};write(CANONICAL,enriched);write(LEGACY,enriched);try{dispatchEvent(new CustomEvent('aurora:finance-mission',{detail:enriched}))}catch(_){}}
 function rebrand(){document.title='Aurora Finance Department — Payday & Capital Control';document.querySelectorAll('.m13-club strong').forEach(el=>el.textContent='Finance Department');const hero=document.querySelector('.aurora-title');if(hero)hero.innerHTML='Finance<br>Department';document.querySelectorAll('a[href*="from=wealth-hq"]').forEach(a=>a.href=a.href.replace('from=wealth-hq','from=finance-department'));document.body.classList.toggle('finance-test-mode',!!read(TEST)?.active)}
 function init(){rebrand();publish();document.getElementById('m37SendToTradingBrain')?.addEventListener('click',()=>setTimeout(publish,30));addEventListener('storage',e=>{if([LEGACY,CANONICAL,TEST].includes(e.key)){publish();rebrand()}});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

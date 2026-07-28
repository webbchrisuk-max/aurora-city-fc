
(()=>{
 const KEY='aurora_m42_house_share_strategy_v1';
 const money=v=>'£'+Number(v||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 const num=id=>Math.max(0,Number(document.getElementById(id)?.value)||0);
 const text=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 function houseGap(){
   const direct=Number((document.getElementById('m27RemainingKpi')?.textContent||'').replace(/[^0-9.-]/g,''));
   if(Number.isFinite(direct)&&direct>=0)return direct;
   const target=Number(document.getElementById('m27HouseTarget')?.value)||0;
   const cash=Number(document.getElementById('m27HouseCash')?.value)||0;
   const spent=Number(document.getElementById('m27OpeningSpend')?.value)||0;
   return Math.max(0,target-cash-spent);
 }
 function render(){
   const reserve=num('m42Reserve'),release=num('m42MonthlyRelease'),overtime=num('m42Overtime'),gap=houseGap();
   const use=Math.min(reserve,gap),left=Math.max(0,reserve-use),months=release>0?Math.ceil(left/release):0,total=release+overtime;
   text('m42HouseGap',money(gap));text('m42HouseUse',money(use));text('m42ShareReserve',money(left));text('m42Runway',months+' month'+(months===1?'':'s'));text('m42MonthlyShares',money(total)+'/m');
   const route=document.getElementById('m42Route'),badge=document.getElementById('m42Badge');
   if(gap<=0){route.innerHTML='<strong>House mission already funded.</strong> Keep the full '+money(reserve)+' investment reserve and direct overtime to shares.';badge.textContent='HOUSE FUNDED';}
   else if(reserve>=gap){route.innerHTML='<strong>Recommended route:</strong> move '+money(use)+' to complete the house fund, retain '+money(left)+' for shares, release about '+money(release)+' monthly for '+months+' months, and add overtime on top.';badge.textContent='HOUSE CAN BE COMPLETED';}
   else{route.innerHTML='<strong>Reserve is not enough to close the house gap.</strong> Use '+money(reserve)+' for the house and leave shares temporarily paused until the remaining '+money(gap-reserve)+' is covered.';badge.textContent='HOUSE GAP REMAINS';}
 }
 function save(){localStorage.setItem(KEY,JSON.stringify({reserve:num('m42Reserve'),release:num('m42MonthlyRelease'),overtime:num('m42Overtime')}));text('m42Status','Strategy saved on this device. Overtime remains routed to shares.');render();}
 function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x){document.getElementById('m42Reserve').value=x.reserve??10000;document.getElementById('m42MonthlyRelease').value=x.release??1000;document.getElementById('m42Overtime').value=x.overtime??800;}}catch{}render();}
 ['m42Reserve','m42MonthlyRelease','m42Overtime'].forEach(id=>document.getElementById(id)?.addEventListener('input',render));
 document.getElementById('m42Save')?.addEventListener('click',save);
 document.getElementById('m42ApplyHouse')?.addEventListener('click',()=>{const gap=houseGap(),use=Math.min(num('m42Reserve'),gap);const field=document.getElementById('m33ScenarioHouse');if(field){field.value=use;field.dispatchEvent(new Event('input',{bubbles:true}));text('m42Status',money(use)+' added to the House Pot boost in Scenario Lab.');}else text('m42Status','Scenario Lab is not currently available.');});
 window.addEventListener('load',()=>setTimeout(render,250));
 const obs=new MutationObserver(render);const k=document.getElementById('m27RemainingKpi');if(k)obs.observe(k,{childList:true,subtree:true,characterData:true});
 load();
})();

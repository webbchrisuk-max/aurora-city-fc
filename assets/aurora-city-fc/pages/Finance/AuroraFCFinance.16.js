
(function(){
  function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]))}
  function potTheme(name){
    const n=String(name||'').toLowerCase();
    if(n.includes('house')) return {a:'#0ea5e9',b:'#14b8a6',icon:'⌂',scene:'home'};
    if(n.includes('dent')) return {a:'#10b981',b:'#22c55e',icon:'✦',scene:'health'};
    if(n.includes('season')||n.includes('football')||n.includes('coventry')) return {a:'#7c3aed',b:'#2563eb',icon:'⚽',scene:'stadium'};
    if(n.includes('christ')) return {a:'#dc2626',b:'#f59e0b',icon:'★',scene:'gift'};
    if(n.includes('emerg')||n.includes('grow')) return {a:'#16a34a',b:'#0f766e',icon:'🛡',scene:'shield'};
    if(n.includes('car')||n.includes('mot')) return {a:'#f59e0b',b:'#ef4444',icon:'◆',scene:'car'};
    if(n.includes('spend')||n.includes('lifestyle')) return {a:'#ec4899',b:'#8b5cf6',icon:'£',scene:'wallet'};
    if(n.includes('holiday')||n.includes('travel')) return {a:'#06b6d4',b:'#3b82f6',icon:'✈',scene:'travel'};
    return {a:'#22d3ee',b:'#6366f1',icon:'£',scene:'vault'};
  }
  function pictureData(name){
    const t=potTheme(name), title=esc(name||'Goal Pot');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500" viewBox="0 0 900 500">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient><radialGradient id="r"><stop stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="900" height="500" fill="#06101e"/><rect width="900" height="500" fill="url(#g)" opacity=".55"/>
      <circle cx="715" cy="90" r="190" fill="url(#r)"/><circle cx="110" cy="430" r="250" fill="url(#r)" opacity=".32"/>
      <g opacity=".18" stroke="#fff"><path d="M0 390L900 120"/><path d="M0 450L900 180"/><path d="M120 0L760 500"/><path d="M240 0L880 500"/></g>
      <rect x="62" y="66" rx="28" width="172" height="172" fill="#03101d" fill-opacity=".58" stroke="#fff" stroke-opacity=".28"/>
      <text x="148" y="178" text-anchor="middle" font-size="86" font-family="Arial, sans-serif" fill="#fff">${esc(t.icon)}</text>
      <text x="62" y="310" font-size="30" font-weight="700" font-family="Arial, sans-serif" fill="#fff" opacity=".95">AURORA WEALTH</text>
      <text x="62" y="355" font-size="48" font-weight="900" font-family="Arial, sans-serif" fill="#fff">${title.slice(0,24)}</text>
      <text x="62" y="400" font-size="22" font-family="Arial, sans-serif" fill="#fff" opacity=".72">Protected goal • Executive Finance Room</text>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }
  function setupShell(){
    const grid=document.getElementById('potHealthRadar'); if(!grid) return null;
    grid.classList.add('pot-carousel-track');
    if(!grid.parentElement.classList.contains('pot-carousel-shell')){
      const shell=document.createElement('div'); shell.className='pot-carousel-shell';
      grid.parentNode.insertBefore(shell,grid); shell.appendChild(grid);
      const nav=document.createElement('div'); nav.className='pot-carousel-nav';
      nav.innerHTML='<div class="pot-carousel-buttons"><button class="pot-carousel-btn" type="button" data-dir="-1" aria-label="Previous pot">‹</button><button class="pot-carousel-btn" type="button" data-dir="1" aria-label="Next pot">›</button></div><div class="pot-carousel-dots" id="potCarouselDots"></div><div class="pot-carousel-count" id="potCarouselCount"></div>';
      shell.appendChild(nav);
      nav.querySelectorAll('.pot-carousel-btn').forEach(b=>b.addEventListener('click',()=>scrollByCard(Number(b.dataset.dir))));
      grid.addEventListener('scroll',()=>requestAnimationFrame(updateDots),{passive:true});
    }
    return grid;
  }
  function scrollByCard(dir){const g=document.getElementById('potHealthRadar');const c=g?.querySelector('.pot-radar-card');if(!g||!c)return;g.scrollBy({left:dir*(c.getBoundingClientRect().width+14),behavior:'smooth'})}
  function updateDots(){
    const g=document.getElementById('potHealthRadar'),dots=document.getElementById('potCarouselDots'),count=document.getElementById('potCarouselCount'); if(!g||!dots)return;
    const cards=[...g.querySelectorAll('.pot-radar-card')]; if(!cards.length){dots.innerHTML='';if(count)count.textContent='';return}
    let best=0,dist=Infinity;cards.forEach((c,i)=>{const d=Math.abs(c.offsetLeft-g.scrollLeft);if(d<dist){dist=d;best=i}});
    dots.innerHTML=cards.map((_,i)=>`<button class="pot-carousel-dot ${i===best?'active':''}" type="button" aria-label="Go to pot ${i+1}" data-i="${i}"></button>`).join('');
    dots.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>cards[Number(b.dataset.i)]?.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'})));
    if(count)count.textContent=`${best+1} of ${cards.length}`;
  }
  function renderCarousel(){
    const grid=setupShell();if(!grid)return;
    const liveState=(typeof plannerState!=='undefined'&&plannerState)?plannerState:null;
    if(liveState&&(!Array.isArray(liveState.editablePots)||!liveState.editablePots.length)){
      liveState.editablePots=typeof freshEditablePots==='function'?freshEditablePots():[];
      if(typeof savePlannerData==='function')savePlannerData();
      if(typeof renderPotEditor==='function')renderPotEditor();
    }
    const pots=[...(Array.isArray(liveState?.editablePots)?liveState.editablePots:[])];
    pots.sort((a,b)=>{const pa=typeof normalisePotPriority==='function'?normalisePotPriority(a.priority):Number(a.priority||2),pb=typeof normalisePotPriority==='function'?normalisePotPriority(b.priority):Number(b.priority||2);if(pa!==pb)return pa-pb;const ar=Number(a.target||0)>0?Number(a.balance||0)/Number(a.target||1):1,br=Number(b.target||0)>0?Number(b.balance||0)/Number(b.target||1):1;return ar-br||String(a.name||'').localeCompare(String(b.name||''),'en-GB')});
    const houseMetrics=typeof window.m27HouseMetrics==='function'?window.m27HouseMetrics():null;
    grid.innerHTML=pots.map(p=>{
      const name=String(p.name||'Unnamed Pot'),isHouse=String(p.id||'')==='house_fund'||name.toLowerCase().includes('house');
      const cash=isHouse&&houseMetrics?Number(houseMetrics.cash||0):Number(p.balance||0);
      const spent=isHouse&&houseMetrics?Number(houseMetrics.spent||0):0;
      const funded=isHouse&&houseMetrics?Number(houseMetrics.funded||0):cash;
      const target=Number(p.target||0),progress=target>0?Math.min(100,funded/target*100):(funded>0?100:0),cls=progress>=85?'good':progress>=45?'watch':'risk';
      const priority=typeof normalisePotPriority==='function'?normalisePotPriority(p.priority):Number(p.priority||2),priorityText=typeof priorityLabel==='function'?priorityLabel(priority):'';
      const state=progress>=85?'On target':progress>=45?'Building':'Needs funding';
      const note=String(p.note||'Personal savings goal');
      const moneyBlock=isHouse&&houseMetrics
        ? `<div><div class="pot-card-target">TOTAL BALANCE</div><div class="pot-card-value">£${formatMoney(cash)}</div><div class="pot-house-financials"><div class="pot-house-line pot-house-spent"><span>Spent</span><strong>−£${formatMoney(spent)}</strong></div><div class="pot-house-line pot-house-total"><span>Total funded</span><strong>£${formatMoney(funded)}</strong></div><div class="pot-house-line"><span>Project target</span><strong>£${formatMoney(target)}</strong></div></div></div>`
        : `<div><div class="pot-card-value">£${formatMoney(cash)}</div><div class="pot-card-target">${target>0?`Target £${formatMoney(target)}`:'Open target'}</div></div>`;
      return `<article class="pot-radar-card ${cls} priority-${priority}"><div class="pot-card-picture"><img src="${pictureData(name)}" alt="${esc(name)} illustrated goal card"><span class="pot-card-status"><i></i>${state}</span></div><div class="pot-card-body"><div class="pot-card-title-row"><div><div class="pot-card-title">${esc(name)}</div><div class="pot-card-target">P${priority} ${esc(priorityText)}</div></div><span class="pot-priority-rank">P${priority}</span></div>${moneyBlock}<div class="pot-card-note">${esc(note)}</div><div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div><div class="pot-card-progress-meta"><span>Funding progress</span><strong>${progress.toFixed(0)}%</strong></div></div></article>`;
    }).join('')||'<div class="subv">Add pots in the Editable Pot Manager to build your carousel.</div>';
    setTimeout(updateDots,0);
  }
  const prior=window.renderPotHealthRadar;
  window.renderPotHealthRadar=function(){renderCarousel()};
  function ensurePotsAndRender(){
    try{
      if(typeof plannerState!=='undefined'){
        if(!Array.isArray(plannerState.editablePots)||!plannerState.editablePots.length){
          plannerState.editablePots=typeof freshEditablePots==='function'?freshEditablePots():[];
          if(typeof savePlannerData==='function')savePlannerData();
        }
        if(typeof renderPotEditor==='function')renderPotEditor();
      }
      renderCarousel();
    }catch(err){console.error('Aurora pot carousel recovery failed',err)}
  }
  window.addEventListener('load',()=>setTimeout(ensurePotsAndRender,250));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(ensurePotsAndRender,120));
  document.addEventListener('click',e=>{
    if(e.target.closest('#savePotsBtn,#addPotBtn,#resetPotsBtn,.pot-editor-row button,[data-target="m13PotHealth"]')){
      setTimeout(ensurePotsAndRender,160);
    }
  });
  const potHost=document.getElementById('potHealthRadar');
  if(potHost){
    new MutationObserver(()=>{
      if(!potHost.querySelector('.pot-radar-card')) setTimeout(ensurePotsAndRender,30);
    }).observe(potHost,{childList:true});
  }
})();

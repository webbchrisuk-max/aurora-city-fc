
(function(){
  function moneyText(id,fallback='£0.00'){const el=document.getElementById(id);return el?el.textContent.trim():fallback}
  function syncExec(){
    const map=[
      ['m34BillsValue','m13BeforeOut'],['m34PaydayValue','m13ExpectedPay'],['m34PotValue','m13ScoreLabel'],['m34SurplusValue','m13RunSafe'],['m34BillsMeta','m13BeforeCount']
    ];
    map.forEach(([to,from])=>{const a=document.getElementById(to),b=document.getElementById(from);if(a&&b){a.textContent=to==='m34BillsMeta'?`${b.textContent.trim()} payments protected`:b.textContent.trim()}});
    const next=document.getElementById('nextPaydayLabel');const top=document.getElementById('m34TopNext');if(next&&top) top.textContent=next.textContent.trim()||'—';
  }
  function go(target){const btn=[...document.querySelectorAll('#m13Nav button')].find(b=>b.dataset.target===target);if(btn)btn.click()}
  document.addEventListener('DOMContentLoaded',()=>{
    const dash=document.getElementById('m13Dashboard');
    const hero=document.querySelector('#m13Dashboard .m13-hero');
    const kpis=document.querySelector('#m13Dashboard .m13-kpis');
    const grid=document.querySelector('#m13Dashboard .m13-dashboard');
    const topStats=document.querySelector('.m32-balance-stats');
    if(topStats&&!document.getElementById('m34TopNext')){
      topStats.insertAdjacentHTML('beforeend','<div class="m32-balance-stat"><span>Next payday</span><strong id="m34TopNext">—</strong><small>Current pay cycle</small></div>');
    }
    if(hero&&!document.getElementById('m34MatchdayBoard')){
      hero.insertAdjacentHTML('afterend',`<div class="m34-section-title"><div><h2>Financial Matchday Board</h2><small>Four decisions that matter right now.</small></div></div><section class="m34-matchday-board" id="m34MatchdayBoard">
        <article class="m34-decision-card" style="--accent:#79a8ff"><div class="m34-decision-top"><div class="m34-decision-icon">✓</div><span>Bills protected</span></div><strong id="m34BillsValue">£0.00</strong><p id="m34BillsMeta">0 payments protected</p><button type="button" data-go="m13Bills">View bills</button></article>
        <article class="m34-decision-card" style="--accent:#f3c45b"><div class="m34-decision-top"><div class="m34-decision-icon">£</div><span>Payday allocation</span></div><strong id="m34PaydayValue">£0.00</strong><p>Expected wage and planned allocation.</p><button type="button" data-go="m13PaydayPlan">View plan</button></article>
        <article class="m34-decision-card" style="--accent:#4ee09a"><div class="m34-decision-top"><div class="m34-decision-icon">◉</div><span>Pot health</span></div><strong id="m34PotValue">Checking</strong><p>Funding strength across your active pots.</p><button type="button" data-go="m13PotHealth">View pots</button></article>
        <article class="m34-decision-card" style="--accent:#b59cff"><div class="m34-decision-top"><div class="m34-decision-icon">↗</div><span>Safe surplus</span></div><strong id="m34SurplusValue">£0.00</strong><p>Available only after full protection.</p><button type="button" data-go="m13Funding">View funding</button></article>
      </section>`);
    }
    if(kpis&&grid){
      const title=document.createElement('div');title.className='m34-snapshot-title';title.textContent='Payday War Room Snapshot';
      grid.insertAdjacentElement('afterend',title);title.insertAdjacentElement('afterend',kpis);
    }
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
    syncExec();
    const obs=new MutationObserver(syncExec);
    ['m13BeforeOut','m13ExpectedPay','m13ScoreLabel','m13RunSafe','m13BeforeCount','nextPaydayLabel'].forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true,characterData:true})});
    setTimeout(syncExec,500);setTimeout(syncExec,1500);
  });
})();

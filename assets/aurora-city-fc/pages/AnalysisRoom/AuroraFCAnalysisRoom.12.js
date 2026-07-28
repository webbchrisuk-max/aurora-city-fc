
(function(){
  'use strict';
  const root=document.documentElement;
  const title=(document.title||'').toLowerCase();
  const page=title.includes('manager dashboard')?'manager':title.includes('squad hub')?'squad':title.includes('analysis')?'analysis':title.includes('training')?'training':title.includes('scouting')?'scouting':title.includes('transfer')?'transfer':title.includes('boardroom')?'boardroom':title.includes('media')?'media':'aurora';
  const MOTION_KEY='aurora_motion_level_v1';
  const levels=['full','subtle','off'];
  root.dataset.auroraPage=page;

  function savedLevel(){
    try{const value=localStorage.getItem(MOTION_KEY);if(levels.includes(value))return value}catch(_){}
    return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'full';
  }
  function label(level){return level==='full'?'Full':level==='subtle'?'Subtle':'Off'}
  function applyLevel(level,announce=false){
    const next=levels.includes(level)?level:'full';root.dataset.auroraMotion=next;
    try{localStorage.setItem(MOTION_KEY,next)}catch(_){}
    const btn=document.getElementById('auroraMotionToggle');
    if(btn){const value=btn.querySelector('[data-motion-value]');if(value)value.textContent=label(next);btn.title=`Aurora animations: ${label(next)}`;btn.setAttribute('aria-label',`Aurora animations ${label(next)}. Tap to change.`)}
    if(announce) flashValue(btn);
  }
  function installToggle(){
    if(document.getElementById('auroraMotionToggle'))return;
    const footer=document.querySelector('.fm-side-footer');if(!footer)return;
    const btn=document.createElement('button');btn.type='button';btn.id='auroraMotionToggle';btn.className='fm-side-action aurora-motion-toggle';btn.innerHTML='<span class="fm-side-icon">✦</span><span>Motion: <b data-motion-value>Full</b></span>';
    const clock=footer.querySelector('.fm-side-clock');footer.insertBefore(btn,clock||null);
    btn.addEventListener('click',()=>{const current=root.dataset.auroraMotion||'full';applyLevel(levels[(levels.indexOf(current)+1)%levels.length],true)});
    applyLevel(root.dataset.auroraMotion||savedLevel());
  }
  function flashValue(el){if(!el)return;el.classList.remove('aurora-value-updated');void el.offsetWidth;el.classList.add('aurora-value-updated');setTimeout(()=>el.classList.remove('aurora-value-updated'),900)}
  function observeValue(selector){
    const el=document.querySelector(selector);if(!el)return;
    let last=el.textContent;
    new MutationObserver(()=>{const now=el.textContent;if(now!==last&&now.trim()&&now.trim()!=='—'){last=now;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true});
  }
  function refreshWave(){
    document.querySelector('.aurora-refresh-wave')?.remove();const wave=document.createElement('div');wave.className='aurora-refresh-wave';wave.setAttribute('aria-hidden','true');document.body.appendChild(wave);setTimeout(()=>wave.remove(),1200);
    if(page==='scouting'){root.classList.add('aurora-scan-boost');setTimeout(()=>root.classList.remove('aurora-scan-boost'),3200)}
  }
  function bindRefresh(){document.addEventListener('click',event=>{if(event.target.closest?.('#refreshBtn,.refresh-btn,[data-refresh]'))refreshWave()},true)}
  function decorateManager(){
    ['#beastCurrentMonthly','#beastTargetPercent','#beastRating','#monthlyIncome','#heroAnnualIncome'].forEach(observeValue);
    const badge=document.getElementById('beastNotificationCount'),button=document.getElementById('beastNotificationButton');
    if(badge&&button){let previous=Number(badge.textContent)||0;const alert=()=>{const current=badge.hidden?0:(Number(badge.textContent)||0);if(current>previous&&current>0){button.classList.remove('aurora-alert-arrival');void button.offsetWidth;button.classList.add('aurora-alert-arrival');setTimeout(()=>button.classList.remove('aurora-alert-arrival'),1400)}previous=current};new MutationObserver(alert).observe(badge,{attributes:true,childList:true,subtree:true,characterData:true});alert()}
    const strip=document.getElementById('beastHoldingStrip');const decorate=()=>{strip?.querySelectorAll('.beast-holding-card').forEach(card=>{card.classList.toggle('aurora-form-review',!!card.querySelector('.beast-status-review'));card.classList.toggle('aurora-form-strong',!!card.querySelector('.beast-status-strong'))})};if(strip){new MutationObserver(decorate).observe(strip,{childList:true,subtree:true});decorate()}
  }
  function decorateScouting(){
    const command=document.querySelector('.command-radar');if(command&&!command.querySelector('.aurora-command-blip')){[['29%','37%','0s'],['67%','29%','.7s'],['73%','68%','1.35s'],['38%','73%','2s']].forEach(([left,top,delay])=>{const dot=document.createElement('i');dot.className='aurora-command-blip';dot.style.left=left;dot.style.top=top;dot.style.setProperty('--delay',delay);command.appendChild(dot)})}
    const field=document.getElementById('radarField');const decorate=()=>{const blips=[...(field?.querySelectorAll('.radar-blip')||[])];blips.forEach((blip,index)=>{blip.style.setProperty('--aurora-blip-delay',`${(index%7)*.22}s`);blip.classList.toggle('aurora-priority-blip',index===0)})};if(field){new MutationObserver(decorate).observe(field,{childList:true,subtree:true});decorate()}
    ['#commandTitle','#kpiScouted','#kpiProspects','#kpiGems','#directorScore'].forEach(observeValue);
  }
  function decorateTransfer(){
    ['#m4TargetProgress','#m4FullCapital','#m4BaseFinal','#m4FullFinal'].forEach(observeValue);
    let lastStage='';const lifecycle=document.getElementById('m4LifecycleSteps');const decorateStages=()=>{const current=lifecycle?.querySelector('.m4-step.current');const stage=current?.dataset.step||'';if(stage&&stage!==lastStage){lastStage=stage;current.classList.add('aurora-stage-change');setTimeout(()=>current.classList.remove('aurora-stage-change'),950)}};if(lifecycle){new MutationObserver(decorateStages).observe(lifecycle,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});decorateStages()}
    const decorateRows=()=>{const rows=[...(document.querySelectorAll('#m4MonthRows tr')||[])];const month=Math.max(1,Number(document.getElementById('m4CurrentMonth')?.value)||1);rows.forEach((row,index)=>row.classList.toggle('aurora-current-plan-row',index===month-1))};const tbody=document.getElementById('m4MonthRows');if(tbody){new MutationObserver(decorateRows).observe(tbody,{childList:true,subtree:true});decorateRows()}document.getElementById('m4CurrentMonth')?.addEventListener('input',decorateRows);
    document.querySelectorAll('.registration-message').forEach(observeRegistrationMessage);
    const registration=document.getElementById('registration-desk');if(registration)new MutationObserver(()=>registration.querySelectorAll('.registration-message').forEach(observeRegistrationMessage)).observe(registration,{childList:true,subtree:true});
  }
  function observeRegistrationMessage(el){if(!el||el.dataset.motionObserved)return;el.dataset.motionObserved='1';let last=el.textContent;new MutationObserver(()=>{if(el.textContent!==last){last=el.textContent;flashValue(el)}}).observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})}
  function decorateSquad(){
    const income=document.getElementById('annualIncome')?.closest('.squad-card');income?.classList.add('aurora-income-card');['#annualIncome','#monthlyIncome','#squadStrength'].forEach(observeValue);
    const body=document.getElementById('teamSelectionBody');const decorate=()=>{body?.querySelectorAll('.player-row').forEach(row=>{const positive=!!row.querySelector('.positive')||/[▲+]/.test(row.textContent);const negative=!!row.querySelector('.negative')||/▼/.test(row.textContent);row.classList.toggle('aurora-positive-row',positive&&!negative);row.classList.toggle('aurora-negative-row',negative)})};if(body){new MutationObserver(()=>{decorate();body.querySelectorAll('.player-row').forEach(row=>{const cls=row.classList.contains('aurora-negative-row')?'aurora-row-flash-negative':'aurora-row-flash-positive';row.classList.add(cls);setTimeout(()=>row.classList.remove(cls),1250)})}).observe(body,{childList:true,subtree:true});decorate()}
  }
  function decorateAnalysis(){
    document.getElementById('bestPerformer')?.closest('.score-card')?.classList.add('aurora-best-card');['#bestPerformer','#positiveMovers','#negativeMovers','#analysisStatus'].forEach(observeValue);
    const table=document.getElementById('playerTable');const decorate=()=>{table?.querySelectorAll('tr').forEach(row=>{if(row.querySelector('.positive'))row.classList.add('aurora-positive-row');if(row.querySelector('.negative'))row.classList.add('aurora-negative-row')})};if(table){new MutationObserver(()=>{decorate();table.querySelectorAll('tr.aurora-positive-row').forEach(r=>{r.classList.add('aurora-row-flash-positive');setTimeout(()=>r.classList.remove('aurora-row-flash-positive'),1200)});table.querySelectorAll('tr.aurora-negative-row').forEach(r=>{r.classList.add('aurora-row-flash-negative');setTimeout(()=>r.classList.remove('aurora-row-flash-negative'),1200)})}).observe(table,{childList:true,subtree:true});decorate()}
  }
  function decorateTraining(){
    ['#topHeadline','#dividendCount','#rumourCount','#pressMood'].forEach(observeValue);
    const rising=document.getElementById('risingStars'),medical=document.getElementById('medicalRoom');const decorate=()=>medical?.querySelectorAll('.row').forEach(row=>row.classList.toggle('aurora-medical-watch',!!row.querySelector('.score-pill.red')));if(rising)new MutationObserver(()=>{const first=rising.querySelector('.row:first-child');if(first)flashValue(first)}).observe(rising,{childList:true,subtree:true});if(medical){new MutationObserver(decorate).observe(medical,{childList:true,subtree:true});decorate()}
  }
  function decorateBoardroom(){['#boardConfidence','#confidenceGaugeScore','#supporterMood','#jobSecurity','#priorityObjective'].forEach(observeValue)}
  function decorateMedia(){
    ['#topHeadline','#pressMood','#dividendCount','#rumourCount'].forEach(observeValue);
    const breaking=document.getElementById('breakingStories'),divs=document.getElementById('dividendDesk');if(breaking)new MutationObserver(()=>{const first=breaking.querySelector('.row:first-child');if(first)flashValue(first)}).observe(breaking,{childList:true,subtree:true});if(divs)new MutationObserver(()=>{const first=divs.querySelector('.row:first-child');if(first)flashValue(first)}).observe(divs,{childList:true,subtree:true});
  }
  function start(){
    applyLevel(savedLevel());installToggle();bindRefresh();
    ({manager:decorateManager,scouting:decorateScouting,transfer:decorateTransfer,squad:decorateSquad,analysis:decorateAnalysis,training:decorateTraining,boardroom:decorateBoardroom,media:decorateMedia}[page]||(()=>{}))();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

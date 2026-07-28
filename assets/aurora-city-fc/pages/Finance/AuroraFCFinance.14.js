
(function(){
  'use strict';
  const SOURCE_OPTIONS=['Holding Pot','Spending Pot','House Pot','Dentist Pot','Season Ticket Pot','Christmas Pot','Current Account','Track only / already funded'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'£'+Number(v||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const getAllCosts=()=>{
    const rows=[];
    (plannerState?.scheduledBills||[]).forEach((x,i)=>rows.push({section:'scheduledBills',index:i,item:x,type:'Scheduled bill'}));
    (plannerState?.futureCosts||[]).forEach((x,i)=>rows.push({section:'futureCosts',index:i,item:x,type:'Future cost'}));
    (plannerState?.yearlyRecurringCosts||[]).forEach((x,i)=>rows.push({section:'yearlyRecurringCosts',index:i,item:x,type:'Yearly cost'}));
    return rows;
  };
  function inferSource(item){
    if(item.fundingSource)return item.fundingSource;
    const txt=(String(item.name||'')+' '+String(item.category||'')+' '+String(item.notes||'')).toLowerCase();
    if(txt.includes('dentist')||txt.includes('tooth')||txt.includes('hygien'))return 'Dentist Pot';
    if(txt.includes('season ticket')||txt.includes('coventry'))return 'Season Ticket Pot';
    if(txt.includes('christmas'))return 'Christmas Pot';
    if(txt.includes('house')||txt.includes('floor')||txt.includes('decor')||txt.includes('plaster'))return 'House Pot';
    return item.included===false?'Track only / already funded':'Holding Pot';
  }
  function normaliseSources(){
    getAllCosts().forEach(r=>{if(!r.item.fundingSource)r.item.fundingSource=inferSource(r.item)});
  }
  function applySource(section,index,source){
    const arr=plannerState?.[section];if(!Array.isArray(arr)||!arr[index])return;
    const item=arr[index];item.fundingSource=source;
    item.included=source==='Holding Pot';
    if(typeof savePlannerData==='function')savePlannerData();
    if(typeof runPlanner==='function')runPlanner();
    setTimeout(renderM30,0);
  }
  function alerts(){
    const out=[],today=new Date();today.setHours(0,0,0,0);
    const active=getAllCosts();
    const names=new Map();
    active.forEach(r=>{
      const x=r.item,key=String(x.name||'').trim().toLowerCase();if(key)names.set(key,(names.get(key)||0)+1);
      if(x.included!==false&&!x.paid&&x.due){const d=parseLocalDate(x.due);if(d<today)out.push({level:'risk',title:`${x.name||'Unnamed cost'} is overdue`,meta:`${money(x.amount)} was due ${dateLabel(x.due)}. Mark it paid, roll it forward or exclude it.`})}
      if(x.included!==false&&!x.paid&&!x.due)out.push({level:'watch',title:`${x.name||'Unnamed cost'} needs a date`,meta:'Aurora cannot calculate paydays remaining until a due date is entered.'});
      if(!x.fundingSource)out.push({level:'watch',title:`${x.name||'Unnamed cost'} has no funding source`,meta:'Choose the pot or account responsible for this cost.'});
    });
    names.forEach((count,name)=>{if(count>1)out.push({level:'watch',title:`Possible duplicate: ${name}`,meta:`This name appears ${count} times across live cost sections. Check that it is not funded twice.`})});
    const holding=Number(plannerState?.holdingBalance||0),buffer=Number(plannerState?.minimumBuffer||0);
    if(holding<buffer)out.push({level:'risk',title:'Holding Pot is below its minimum buffer',meta:`Balance ${money(holding)} versus minimum ${money(buffer)}.`});
    if(!out.length)out.push({level:'good',title:'No critical planner warnings',meta:'Bills, dates and funding sources currently reconcile cleanly.'});
    return out.slice(0,8);
  }
  function explanations(){
    const rows=[];
    const mission=window.m22EnsureState?.();
    const plan=window.m22BuildPlan?.();
    if(plan){
      rows.push({title:`Actual pay received: ${money(plan.actualPay||0)}`,meta:`Expected ${money(plan.expectedPay||0)}. ${Number(plan.actualPay||0)>=Number(plan.expectedPay||0)?'No wage shortfall is affecting the plan.':'Aurora is protecting essentials before optional allocations.'}`});
      if(plan.sinking)rows.push({title:`Due-date contribution: ${money(plan.sinking.contribution||0)}`,meta:`Spread across the remaining paydays for included Holding Pot commitments.`});
      rows.push({title:`Deliberately retained: ${money(plan.retained||plan.buffered||0)}`,meta:'Money intentionally left in the current account is not treated as unexplained cash.'});
    }
    const s=window.m25SinkingFundPlan?.(mission?.paydayDate||'');
    (s?.details||[]).slice(0,5).forEach(r=>rows.push({title:`${r.name}: ${money(r.contribution)} this payday`,meta:`${money(r.remaining)} remains with ${r.paydays} payday${r.paydays===1?'':'s'} left before ${dateLabel(r.due)}.`}));
    if(!rows.length)rows.push({title:'Payday explanation is waiting for inputs',meta:'Open Payday Plan and confirm the payday date and actual wage received.'});
    return rows;
  }
  function fundingRows(){
    return getAllCosts().filter(r=>!r.item.paid).sort((a,b)=>String(a.item.due||'9999').localeCompare(String(b.item.due||'9999'))).slice(0,18);
  }
  function renderM30(){
    if(typeof plannerState==='undefined')return;
    normaliseSources();
    const host=document.getElementById('m30CommandCentre');if(!host)return;
    const a=alerts(),e=explanations(),f=fundingRows();
    const included=f.filter(r=>r.item.included!==false).reduce((s,r)=>s+Number(r.item.amount||0),0);
    const external=f.filter(r=>r.item.fundingSource&&r.item.fundingSource!=='Holding Pot'&&r.item.fundingSource!=='Track only / already funded').reduce((s,r)=>s+Number(r.item.amount||0),0);
    const urgent=a.filter(x=>x.level==='risk').length;
    host.innerHTML=`<div class="m30-head"><div><div class="m13-eyebrow">AURORA WEALTH OPERATING SYSTEM</div><h2>Financial Control Centre</h2><p>One control layer for payday explanations, funding ownership, duplicate prevention and genuine issues that need action.</p></div><span class="m30-beast-chip"><i></i> Control Centre Live</span></div>
    <div class="m30-grid"><div class="m30-tile" style="--m30c:#ff4f87"><span>Urgent alerts</span><strong>${urgent}</strong><small>Overdue or under-protected items</small></div><div class="m30-tile" style="--m30c:#35f2ff"><span>Holding-funded costs</span><strong>${money(included)}</strong><small>Included in Holding Pot calculations</small></div><div class="m30-tile" style="--m30c:#b98cff"><span>Other-pot funded</span><strong>${money(external)}</strong><small>Tracked without inflating Holding Pot</small></div><div class="m30-tile" style="--m30c:#65ff9d"><span>Funding records</span><strong>${f.length}</strong><small>Upcoming costs with clear ownership</small></div></div>
    <div class="m30-body"><div class="m30-panel"><div class="m30-panel-head"><h3>Needs Attention</h3><span class="m30-count">${a.length} SIGNAL${a.length===1?'':'S'}</span></div><div class="m30-list">${a.map(x=>`<div class="m30-alert ${x.level}"><strong>${esc(x.title)}</strong><div>${esc(x.meta)}</div></div>`).join('')}</div></div><div class="m30-panel"><div class="m30-panel-head"><h3>Why the Payday Plan Says That</h3><span class="m30-count">LIVE EXPLANATION</span></div><div class="m30-list">${e.map(x=>`<div class="m30-explain"><strong>${esc(x.title)}</strong><div>${esc(x.meta)}</div></div>`).join('')}</div></div></div>
    ${(()=>{const groups={};f.forEach(r=>{const source=inferSource(r.item);(groups[source]||(groups[source]=[])).push(r)});const cards=Object.entries(groups).map(([source,rows])=>{const total=rows.reduce((s,r)=>s+Number(r.item.amount||0),0);const cls=source==='Holding Pot'?'holding':source==='Track only / already funded'?'track':'external';return `<div class="m31-funding-card ${cls}"><div class="m31-funding-icon">${source==='Holding Pot'?'H':source==='House Pot'?'⌂':source==='Dentist Pot'?'D':source==='Season Ticket Pot'?'⚽':source==='Christmas Pot'?'★':'•'}</div><div><span>${esc(source)}</span><strong>${money(total)}</strong><small>${rows.length} upcoming item${rows.length===1?'':'s'}</small></div></div>`}).join('');const editor=f.map(r=>{const source=inferSource(r.item),cls=source==='Holding Pot'?'holding':source==='Track only / already funded'?'track':'external';return `<div class="m30-funding-row"><div><strong>${esc(r.item.name||'Unnamed cost')} • ${money(r.item.amount)}</strong><small>${esc(r.type)}${r.item.due?' • '+esc(dateLabel(r.item.due)):''}</small></div><select class="m30-funding-select" data-m30-section="${r.section}" data-m30-index="${r.index}">${SOURCE_OPTIONS.map(o=>`<option ${o===source?'selected':''}>${esc(o)}</option>`).join('')}</select><span class="m30-source-pill ${cls}">${esc(source)}</span></div>`}).join('');return `<div class="m30-panel m30-funding-shell m31-funding-shell"><div class="m30-panel-head"><h3>Funding Overview</h3><span class="m30-count">CLEAR OWNERSHIP</span></div><div class="m31-funding-grid">${cards||'<div class="m30-alert good"><strong>No upcoming funding records</strong><div>Add a cost to begin.</div></div>'}</div>${f.length?`<details class="m31-funding-details"><summary>Manage funding sources <span>${f.length} records</span></summary><div class="m30-list m31-funding-editor">${editor}</div></details>`:''}</div>`})()}`;
  }
  function install(){
    const dashboard=document.getElementById('m13Dashboard');
    if(dashboard&&!document.getElementById('m30CommandCentre')){const el=document.createElement('section');el.id='m30CommandCentre';el.className='m30-command';const hero=dashboard.querySelector('.m13-hero');hero?.insertAdjacentElement('afterend',el)}
    document.body.classList.add('m30-calm');
    document.getElementById('m30ModeToggle')?.remove();
    document.getElementById('m30CommandCentre')?.addEventListener('change',ev=>{const s=ev.target.closest('.m30-funding-select');if(s)applySource(s.dataset.m30Section,Number(s.dataset.m30Index),s.value)});
    renderM30();
  }
  const originalRun=window.runPlanner;if(typeof originalRun==='function')window.runPlanner=function(){const result=originalRun.apply(this,arguments);setTimeout(renderM30,0);return result};
  window.addEventListener('load',()=>setTimeout(install,80));
  if(document.readyState!=='loading')setTimeout(install,80);
})();

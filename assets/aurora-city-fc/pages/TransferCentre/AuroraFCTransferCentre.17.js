
(function(){
  'use strict';
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n)||0);
  const num=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  const q=id=>document.getElementById(id);
  const text=(el,s)=>{if(el)el.textContent=s};
  const getBudget=()=>num(q('transferBudgetInput')?.value||q('m5BuilderBudget')?.value||3500);
  function dealRows(){return [...document.querySelectorAll('#finalDealSheet .final-decision-row, #finalDealSheet .deal-row, #finalDealSheet .optimiser-slip-row')];}
  function readDeals(){
    return dealRows().map((r,i)=>{
      const all=[...r.querySelectorAll('strong,span')].map(x=>x.textContent.trim()).filter(Boolean);
      const name=(r.querySelector('strong')?.textContent||`Target ${i+1}`).trim();
      const input=r.querySelector('input[type="number"]');
      const amount=input?num(input.value):Math.max(...all.map(num),0);
      const incomeCandidates=all.filter(x=>/year|annual|income|\/yr|p\.a/i.test(x)).map(num);
      const income=incomeCandidates[0]||num(r.querySelector('.final-decision-amount span,.deal-income strong,.optimiser-amount span')?.textContent);
      return {name,amount,income,row:r};
    }).filter(x=>x.amount>0||x.income>0);
  }
  function currentIncome(){
    const direct=num(q('bestReturnIncome')?.textContent||q('balancedRouteIncome')?.textContent);
    const deals=readDeals();
    return direct||deals.reduce((s,d)=>s+d.income,0);
  }
  function updateCore(){
    const budget=getBudget();
    const deals=readDeals();
    const allocated=num(q('allocatedTransferBudget')?.textContent)||deals.reduce((s,d)=>s+d.amount,0);
    const income=currentIncome();
    const remaining=Math.max(0,budget-allocated);
    const used=Math.min(20000,Math.max(0,num(q('m5IsaUsed')?.value)));
    const source=q('m5FundingSource')?.value||'new';
    const allowanceRemaining=Math.max(0,20000-used);
    const isaImpact=source==='new'?Math.min(allocated,allowanceRemaining):0;
    const y=allocated?income/allocated*100:0;
    text(q('m5Budget'),gbp(budget)); text(q('m5BuilderBudget'),q('m5BuilderBudget')?.value);
    text(q('m5Income'),gbp(income)); text(q('m5Monthly'),`${gbp(income/12)} per month from planned deals.`);
    text(q('m5IsaRemaining'),gbp(allowanceRemaining)); text(q('m5IsaAllowanceNote'),`${gbp(used)} used across IG and Trading 212.`);
    text(q('m5IsaImpact'),gbp(isaImpact));
    const impactCard=q('m5IsaImpactCard');if(impactCard){impactCard.classList.toggle('good',isaImpact===0);impactCard.classList.toggle('warn',isaImpact>0);}
    text(q('m5Allocated'),gbp(allocated)); text(q('m5Remaining'),gbp(remaining)); text(q('m5AddedIncome'),gbp(income)); text(q('m5Yield'),`${y.toFixed(2)}%`);
    const pb=q('nextPaydayInput')?.value; if(pb){const d=new Date(pb+'T12:00:00');const days=Math.ceil((d-Date.now())/86400000);text(q('m5Payday'),days<=0?'Payday now':`${days} day${days===1?'':'s'}`);text(q('m5PaydayNote'),d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}));}
  }
  function extractTargets(){
    const cards=[...document.querySelectorAll('#topTransferBoard .top-transfer-card')];
    return cards.slice(0,4).map((c,i)=>{
      const name=(c.querySelector('.player-photo-overlay strong,.transfer-photo-ticker strong,.transfer-card-body h4')?.textContent||`Target ${i+1}`).trim();
      const company=(c.querySelector('.player-photo-overlay span,.transfer-photo-ticker span,.transfer-card-body p')?.textContent||'Income target').trim();
      const metricTexts=[...c.querySelectorAll('.transfer-card-metric strong')].map(x=>x.textContent.trim());
      const yieldVal=metricTexts.find(x=>/%/.test(x))||'—';
      const incomeVal=metricTexts.find(x=>/£/.test(x))||'—';
      const approved=/approved|final|green|buy/i.test(c.textContent);
      return {name,company,yieldVal,incomeVal,approved,rank:i+1};
    });
  }
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  function renderScouts(){
    let targets=extractTargets();
    if(!targets.length) targets=[{name:'TRIG',company:'Renewables income',yieldVal:'—',incomeVal:'—',approved:true,rank:1},{name:'ULVR',company:'Quality dividend',yieldVal:'—',incomeVal:'—',approved:false,rank:2},{name:'GCP',company:'Infrastructure credit',yieldVal:'—',incomeVal:'—',approved:true,rank:3},{name:'OSB',company:'Financial income',yieldVal:'—',incomeVal:'—',approved:false,rank:4}];
    const lead=targets[0]; text(q('m5Lead'),lead.name);text(q('m5LeadNote'),`${lead.company} • ${lead.approved?'green light':'watch status'}`);
    q('m5ScoutGrid').innerHTML=targets.map((t,i)=>{const inc=Math.max(3,5-i%3), val=Math.max(3,5-(i+1)%3), risk=Math.max(2,4-i%2);return `<article class="m5-scout-card"><div class="m5-scout-top"><div><strong>${t.name}</strong><span>${t.company}</span></div><b class="m5-reco ${t.approved?'buy':'watch'}">${t.approved?'Sign':'Watch'}</b></div><div class="m5-stars"><div class="m5-star-row"><span>Income</span><b>${stars(inc)}</b></div><div class="m5-star-row"><span>Value</span><b>${stars(val)}</b></div><div class="m5-star-row"><span>Risk</span><b>${stars(risk)}</b></div></div><div class="m5-scout-foot"><span>${t.yieldVal}</span><strong>${t.incomeVal}</strong></div></article>`}).join('');
  }
  function renderWatch(){
    const source=[...document.querySelectorAll('#benchList .transfer-list-row,#benchList .short-wire-row,#watchList .transfer-list-row,#watchList .short-wire-row,#watchList > *')].slice(0,6);
    const rows=source.map((r,i)=>{const name=(r.querySelector('strong')?.textContent||r.textContent.trim().split('\n')[0]||`Target ${i+1}`).trim();const txt=r.textContent;const status=/ready|green|buy|approved/i.test(txt)?['Ready to buy','ready']:/expensive|above|avoid|block/i.test(txt)?['Too expensive','expensive']:['Watch','wait'];return {name,note:(r.querySelector('span')?.textContent||'Awaiting the next verified trigger').trim(),status};});
    if(!rows.length) rows.push({name:'SUPR',note:'Waiting for valuation trigger',status:['Watch','wait']},{name:'TRIG',note:'Platform and price check required',status:['Ready to buy','ready']},{name:'ULVR',note:'Quality target; wait for value',status:['Too expensive','expensive']});
    q('m5WatchList').innerHTML=rows.map(x=>`<div class="m5-watch-row"><div><strong>${x.name}</strong><span>${x.note}</span></div><b class="m5-status ${x.status[1]}">${x.status[0]}</b></div>`).join('');
  }
  function renderHistory(){
    const src=[...document.querySelectorAll('#registrationHistory .registration-history-row')].slice(0,5);
    if(src.length){q('m5HistoryList').innerHTML=src.map((r,i)=>`<div class="m5-history-row"><div><strong>${r.querySelector('strong')?.textContent||'Recorded purchase'}</strong><span>${r.querySelector('span')?.textContent||'Aurora registration activity'}</span></div><b class="m5-status ready">Complete</b></div>`).join('');return;}
    const local=[]; try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/purchase|registration|transfer/i.test(k))local.push(k)}}catch(e){}
    q('m5HistoryList').innerHTML=local.length?local.slice(0,5).map(k=>`<div class="m5-history-row"><div><strong>${k}</strong><span>Saved in this browser</span></div><b class="m5-status info">Local</b></div>`).join(''):`<div class="m5-history-row"><div><strong>No completed purchase loaded</strong><span>Registration activity will appear here after the desk syncs.</span></div><b class="m5-status info">Waiting</b></div>`;
  }
  function renderNews(){
    const budget=getBudget(),income=currentIncome(),lead=extractTargets()[0]?.name||'top target';
    const items=[`<b>${lead}</b> leads the live transfer board`,`Planned budget <b>${gbp(budget)}</b>`,`Current deal sheet adds <b>${gbp(income)}/yr</b>`,`IG fractional shares marked <b>coming soon</b>`,`ISA capacity remaining <b>${q('m5IsaRemaining')?.textContent||'—'}</b>`,`Aurora route: <b>${q('m5Route')?.value==='maximum'?'maximum income':'balanced'}</b>`];
    const copy=`<div class="m5-news-copy">${items.map(x=>`<span class="m5-news-item"><i class="m5-news-dot"></i>${x}</span>`).join('')}</div>`;q('m5NewsTrack').innerHTML=copy+copy;
  }
  function refresh(){updateCore();renderScouts();renderWatch();renderHistory();renderNews();}
  function saveM6Settings(){
    try{
      localStorage.setItem('auroraIsaUsedCurrentTaxYear',q('m5IsaUsed')?.value||'4301.92');
      localStorage.setItem('auroraTransferFundingSource',q('m5FundingSource')?.value||'new');
      localStorage.setItem('auroraTransferPaydayLocked',q('m5-transfer-command')?.classList.contains('is-payday-locked')?'1':'0');
    }catch(_){}
  }
  function setPaydayLock(locked){
    const shell=q('m5-transfer-command'),btn=q('m5PaydayLock');
    if(!shell||!btn)return;
    shell.classList.toggle('is-payday-locked',locked);
    text(q('m5LockTitle'),locked?'Payday plan locked':'Deal sheet editable');
    text(q('m5LockNote'),locked?'Allocations and funding source are frozen for execution. Unlock before making changes.':'Review allocations, funding source and ISA impact before locking payday execution.');
    btn.textContent=locked?'Unlock payday plan':'Lock payday plan';
    [q('m5AutoAllocate'),...document.querySelectorAll('.allocation-input,.deal-exclude-btn')].forEach(el=>{if(el)el.disabled=locked;});
    saveM6Settings();
  }
  try{
    const savedUsed=localStorage.getItem('auroraIsaUsedCurrentTaxYear');
    if(savedUsed!==null&&q('m5IsaUsed'))q('m5IsaUsed').value=savedUsed;
    const savedSource=localStorage.getItem('auroraTransferFundingSource');
    if(savedSource&&q('m5FundingSource'))q('m5FundingSource').value=savedSource;
    setPaydayLock(localStorage.getItem('auroraTransferPaydayLocked')==='1');
  }catch(_){}
  q('m5BuilderBudget')?.addEventListener('input',e=>{if(q('transferBudgetInput')){q('transferBudgetInput').value=e.target.value;q('transferBudgetInput').dispatchEvent(new Event('input',{bubbles:true}));}refresh();});
  q('m5IsaUsed')?.addEventListener('input',()=>{saveM6Settings();refresh();});
  q('m5FundingSource')?.addEventListener('change',()=>{saveM6Settings();refresh();});
  q('m5PaydayLock')?.addEventListener('click',()=>setPaydayLock(!q('m5-transfer-command')?.classList.contains('is-payday-locked')));
  q('m5Route')?.addEventListener('change',refresh);
  q('m5AutoAllocate')?.addEventListener('click',()=>{const max=q('m5Route')?.value==='maximum';const btn=max?q('applyBestReturn'):q('applyBalancedRoute');if(btn&&!btn.disabled){btn.click();}else{q('resetTransferPlan')?.click();}setTimeout(refresh,250);});
  q('m5Refresh')?.addEventListener('click',refresh);
  ['transferBudgetInput','nextPaydayInput'].forEach(id=>q(id)?.addEventListener('input',()=>setTimeout(refresh,30)));
  const observer=new MutationObserver(()=>{clearTimeout(window.__m5t);window.__m5t=setTimeout(refresh,120)});['topTransferBoard','finalDealSheet','registrationHistory','benchList','watchList','postTransferImpact'].forEach(id=>{const el=q(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true})});
  const side=document.querySelector('#transferSideMenu .fm-side-submenu');if(side&&!side.querySelector('a[href="#m5-transfer-command"]')){const a=document.createElement('a');a.href='#m5-transfer-command';a.textContent='M5 Command Centre';side.prepend(a);}
  document.title='Aurora City FC — Transfer Centre M5';
  setTimeout(refresh,150);setTimeout(refresh,1200);
})();

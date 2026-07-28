
/* ===================== M27 HOUSE PROJECT LEDGER ENGINE — ROOM EDITION ===================== */
(function(){
  'use strict';

  const M27_VERSION = 29;
  const M27_TARGET = 19000;
  const M27_OPENING_CASH = 16152.01;
  const DEFAULT_ROOMS = ['Games Room','Living Room','Hallway','Kitchen','Whole House'];
  const ROOM_COLOURS = ['#a78bfa','#22d3ee','#fbbf24','#34d399','#60a5fa','#fb7185','#f97316'];
  const M27_SEED_ENTRIES = [
    {id:'m27-electrician-20260726',name:'Electrician',estimated:280,actual:0,due:'2026-07-26',room:'Whole House',category:'Electrical',status:'reserved',deducted:false,paidDate:'',notes:'Upcoming house payment'},
    {id:'m27-window-20260727',name:'Window repair',estimated:134,actual:0,due:'2026-07-27',room:'Whole House',category:'Windows',status:'reserved',deducted:false,paidDate:'',notes:'Upcoming house payment'}
  ];

  function m27Money(value){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0))}
  function m27Number(value){const n=Number(String(value??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
  function m27Escape(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
  function m27Today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function m27HousePot(){
    if(!Array.isArray(plannerState.editablePots))plannerState.editablePots=[];
    let pot=plannerState.editablePots.find(item=>String(item?.id||'')==='house_fund')||plannerState.editablePots.find(item=>String(item?.name||'').trim().toLowerCase().includes('house'));
    if(!pot){pot={id:'house_fund',name:'House Fund',balance:M27_OPENING_CASH,target:M27_TARGET,note:'Renovation and home projects',priority:2};plannerState.editablePots.push(pot)}
    return pot;
  }
  function m27NormaliseEntry(item,index){
    const status=['reserved','paid','historical'].includes(String(item?.status||''))?String(item.status):(item?.paid?'paid':'reserved');
    const legacy=Math.max(0,m27Number(item?.amount));
    const estimated=Math.max(0,m27Number(item?.estimated??legacy));
    const actual=Math.max(0,m27Number(item?.actual??((status==='paid'||status==='historical')?legacy:0)));
    return {
      id:String(item?.id||`house-${Date.now()}-${index}`),name:String(item?.name||'House payment'),
      estimated,actual,amount:status==='reserved'?estimated:actual,due:String(item?.due||''),
      room:String(item?.room||item?.category||'Whole House'),category:String(item?.category||'House project'),
      status,deducted:Boolean(item?.deducted),paidDate:String(item?.paidDate||''),notes:String(item?.notes||'')
    };
  }
  function m27EnsureState(){
    const pot=m27HousePot();
    if(!plannerState.houseProjectLedger||typeof plannerState.houseProjectLedger!=='object')plannerState.houseProjectLedger={version:M27_VERSION,openingHistoricalSpend:0,rooms:[...DEFAULT_ROOMS],entries:[]};
    const ledger=plannerState.houseProjectLedger;
    ledger.version=M27_VERSION;ledger.openingHistoricalSpend=Math.max(0,m27Number(ledger.openingHistoricalSpend));
    ledger.rooms=Array.isArray(ledger.rooms)&&ledger.rooms.length?[...new Set(ledger.rooms.map(v=>String(v).trim()).filter(Boolean))]:[...DEFAULT_ROOMS];
    DEFAULT_ROOMS.forEach(room=>{if(!ledger.rooms.includes(room))ledger.rooms.push(room)});
    ledger.entries=Array.isArray(ledger.entries)?ledger.entries.map(m27NormaliseEntry):[];
    if(!plannerState.m27HouseProjectMigrated){
      pot.target=M27_TARGET;if(m27Number(pot.balance)<=0)pot.balance=M27_OPENING_CASH;
      M27_SEED_ENTRIES.forEach(seed=>{const exists=ledger.entries.some(e=>e.id===seed.id||(e.name.toLowerCase()===seed.name.toLowerCase()&&Math.abs(e.estimated-seed.estimated)<.01));if(!exists)ledger.entries.push({...seed})});
      plannerState.m27HouseProjectMigrated=true;if(typeof savePlannerData==='function')savePlannerData();
    }
    return {pot,ledger};
  }
  function m27Metrics(){
    const {pot,ledger}=m27EnsureState(),cash=Math.max(0,m27Number(pot.balance)),target=Math.max(0,m27Number(pot.target));
    const reserved=ledger.entries.filter(e=>e.status==='reserved').reduce((s,e)=>s+e.estimated,0);
    const entrySpend=ledger.entries.filter(e=>e.status==='paid'||e.status==='historical').reduce((s,e)=>s+e.actual,0);
    const spent=Math.max(0,m27Number(ledger.openingHistoricalSpend))+entrySpend,funded=cash+spent,remaining=Math.max(0,target-funded),available=Math.max(0,cash-reserved),progress=target>0?Math.min(100,funded/target*100):(funded>0?100:0);
    const rooms=ledger.rooms.map((room,index)=>{
      const rows=ledger.entries.filter(e=>e.room===room);
      const estimated=rows.reduce((s,e)=>s+e.estimated,0),actual=rows.filter(e=>e.status==='paid'||e.status==='historical').reduce((s,e)=>s+e.actual,0);
      const pending=rows.filter(e=>e.status==='reserved').reduce((s,e)=>s+e.estimated,0),variance=estimated-actual;
      return {room,index,rows,estimated,actual,pending,variance};
    });
    return {pot,ledger,cash,target,reserved,spent,funded,remaining,available,progress,rooms};
  }
  function m27Set(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function m27SetStatus(message,error=false){const box=document.getElementById('m27HouseStatus');if(!box)return;box.textContent=message;box.classList.toggle('error',!!error);box.classList.add('show');clearTimeout(window.m27StatusTimer);window.m27StatusTimer=setTimeout(()=>box.classList.remove('show'),5200)}
  function m27StatusLabel(status){return status==='paid'?'✅ Paid':status==='historical'?'✅ Historically paid':'Reserved'}
  function m27DateLabel(value){if(!value)return'No date';try{return typeof dateLabel==='function'?dateLabel(value):new Date(value).toLocaleDateString('en-GB')}catch(_){return value}}
  function m27RenderRooms(metrics){
    const select=document.getElementById('m27EntryRoom');if(select){const current=select.value;select.innerHTML=metrics.ledger.rooms.map(r=>`<option value="${m27Escape(r)}">${m27Escape(r)}</option>`).join('');if(metrics.ledger.rooms.includes(current))select.value=current}
    const host=document.getElementById('m27RoomGrid');if(!host)return;
    host.innerHTML=metrics.rooms.map((r,i)=>{
      const pct=r.estimated>0?Math.min(100,r.actual/r.estimated*100):0;
      const varianceClass=r.variance>=0?'good':'risk';
      const varianceText=r.variance>=0?`${m27Money(r.variance)} under / unspent`:`${m27Money(Math.abs(r.variance))} over`;
      return `<div class="m27-room-card" style="--room-accent:${ROOM_COLOURS[i%ROOM_COLOURS.length]}">
        <div class="m27-room-top"><div class="m27-room-name">${m27Escape(r.room)}</div><div class="m27-room-count">${r.rows.length} item${r.rows.length===1?'':'s'}</div></div>
        <div class="m27-room-stats"><div class="m27-room-stat"><span>Estimated</span><strong>${m27Money(r.estimated)}</strong></div><div class="m27-room-stat"><span>Actual spent</span><strong>${m27Money(r.actual)}</strong></div><div class="m27-room-stat"><span>Reserved</span><strong>${m27Money(r.pending)}</strong></div><div class="m27-room-stat"><span>Difference</span><strong>${m27Money(r.variance)}</strong></div></div>
        <div class="m27-room-bar"><i style="width:${pct}%"></i></div>
        <div class="m27-room-foot"><span>${pct.toFixed(0)}% of estimate spent</span><b class="${varianceClass}">${varianceText}</b></div>
      </div>`;
    }).join('');
  }
  function m27RenderLedger(metrics){
    const host=document.getElementById('m27LedgerList');if(!host)return;
    const entries=[...metrics.ledger.entries].sort((a,b)=>a.room.localeCompare(b.room,'en-GB')||({reserved:0,paid:1,historical:2}[a.status]-({reserved:0,paid:1,historical:2}[b.status]))||String(a.due||'9999').localeCompare(String(b.due||'9999')));
    m27Set('m27LedgerMeta',`${entries.length} record${entries.length===1?'':'s'} • ${m27Money(metrics.reserved)} estimated reserved • ${m27Money(metrics.spent)} actual spent`);
    host.innerHTML=entries.length?entries.map(entry=>{
      const diff=entry.estimated-entry.actual,diffClass=diff>=0?'saving':'overspend';
      return `<div class="m27-ledger-row ${entry.status}">
        <div><span class="m27-room-tag">${m27Escape(entry.room)}</span><div class="m27-entry-name">${m27Escape(entry.name)}</div><div class="m27-entry-meta">${m27Escape(entry.category||'House project')}${entry.notes?` • ${m27Escape(entry.notes)}`:''}</div></div>
        <div class="m27-entry-date">${m27Escape(m27DateLabel(entry.paidDate||entry.due))}</div>
        <div><span class="m27-status-pill ${entry.status}">${m27StatusLabel(entry.status)}</span>
          <div class="m27-cost-pair"><div><span>Estimated</span><strong>${m27Money(entry.estimated)}</strong></div><div><span>Actual</span><strong>${entry.actual>0?m27Money(entry.actual):'Not entered'}</strong></div>${entry.actual>0?`<div class="${diffClass}"><span>Difference</span><strong>${diff>=0?'+':'-'}${m27Money(Math.abs(diff))}</strong></div>`:''}</div>
        </div>
        <div>
          ${entry.status==='reserved'?`<div class="m27-actual-edit"><input class="m27-actual-input" type="number" min="0" step="0.01" value="${entry.actual||''}" placeholder="Actual cost" data-m27-actual="${m27Escape(entry.id)}"><button class="m27-save-actual" type="button" data-m27-save-actual="${m27Escape(entry.id)}">Save</button></div>`:''}
          <div class="m27-entry-actions">
            ${entry.status==='reserved'?`<button class="m27-paid-btn" type="button" data-m27-pay="${m27Escape(entry.id)}">Mark paid</button>`:''}
            ${(entry.status==='paid'||entry.status==='historical')&&entry.deducted?`<button class="m27-undo-payment" type="button" data-m27-undo="${m27Escape(entry.id)}">Undo payment</button>`:''}
            <button class="m27-edit-entry" type="button" data-m27-edit="${m27Escape(entry.id)}">Edit</button>
            <button class="m27-delete-entry" type="button" data-m27-delete="${m27Escape(entry.id)}">Delete</button>
          </div>
        </div>
      </div>`;
    }).join(''):'<div class="m22-empty">No house payments have been recorded yet.</div>';
  }
  function m27Render(){
    const m=m27Metrics();
    m27Set('m27TargetKpi',m27Money(m.target));m27Set('m27CashKpi',m27Money(m.cash));m27Set('m27ReservedKpi',m27Money(m.reserved));m27Set('m27AvailableKpi',m27Money(m.available));m27Set('m27SpentKpi',m27Money(m.spent));m27Set('m27FundedKpi',m27Money(m.funded));m27Set('m27RemainingKpi',m27Money(m.remaining));m27Set('m27ProgressPct',`${m.progress.toFixed(1)}%`);
    m27Set('m27ProgressCaption',m.remaining>.009?`${m27Money(m.remaining)} remains to reach the ${m27Money(m.target)} project target.`:`Project target reached • ${m27Money(Math.max(0,m.funded-m.target))} above target.`);
    document.getElementById('m27ProgressRing')?.style.setProperty('--m27-progress',`${m.progress}%`);
    [['m27HouseTarget',m.target],['m27HouseCash',m.cash],['m27OpeningSpend',m.ledger.openingHistoricalSpend]].forEach(([id,v])=>{const el=document.getElementById(id);if(el&&document.activeElement!==el)el.value=Number(v).toFixed(2)});
    m27RenderRooms(m);m27RenderLedger(m);
  }
  function m27SaveSetup(){
    const {pot,ledger}=m27EnsureState();pot.target=Math.max(0,m27Number(document.getElementById('m27HouseTarget')?.value));pot.balance=Math.max(0,m27Number(document.getElementById('m27HouseCash')?.value));ledger.openingHistoricalSpend=Math.max(0,m27Number(document.getElementById('m27OpeningSpend')?.value));
    if(typeof savePlannerData==='function')savePlannerData();if(typeof renderPotEditor==='function')renderPotEditor();if(typeof runPlanner==='function')runPlanner();else m27Render();m27SetStatus(`House setup saved. ${m27Money(m27Metrics().remaining)} remains to fund.`);
  }
  function m27AddEntry(){
    const {ledger}=m27EnsureState(),name=String(document.getElementById('m27EntryName')?.value||'').trim(),estimated=Math.max(0,m27Number(document.getElementById('m27EntryEstimated')?.value)),actual=Math.max(0,m27Number(document.getElementById('m27EntryActual')?.value)),due=String(document.getElementById('m27EntryDate')?.value||''),type=String(document.getElementById('m27EntryType')?.value||'reserved'),room=String(document.getElementById('m27EntryRoom')?.value||'Whole House'),category=String(document.getElementById('m27EntryCategory')?.value||'House project').trim()||'House project';
    if(!name||estimated<=0){m27SetStatus('Enter a payment description and an estimated cost above £0.',true);return}
    if(type==='historical'&&actual<=0){m27SetStatus('Enter the actual cost for a payment that is already paid.',true);return}
    ledger.entries.push({id:`house-${Date.now()}-${Math.random().toString(16).slice(2)}`,name,estimated,actual:type==='historical'?actual:actual,due,room,category,status:type==='reserved'?'reserved':'historical',deducted:false,paidDate:type==='historical'?(due||m27Today()):'',notes:type==='historical'?'Previous payment added without deducting current cash':'Upcoming House Pot payment'});
    ['m27EntryName','m27EntryEstimated','m27EntryActual','m27EntryDate','m27EntryCategory'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    if(typeof savePlannerData==='function')savePlannerData();if(typeof runPlanner==='function')runPlanner();else m27Render();m27SetStatus(type==='reserved'?`${name} reserved at ${m27Money(estimated)} for ${room}.`:`${name} added to ${room} with an actual cost of ${m27Money(actual)}.`);
  }
  function m27Find(id){return m27EnsureState().ledger.entries.find(e=>e.id===id)}
  function m27SaveActual(id,input){
    const e=m27Find(id);if(!e||e.status!=='reserved')return;const actual=Math.max(0,m27Number(input?.value));if(actual<=0){m27SetStatus('Enter the actual cost before saving.',true);return}
    e.actual=actual;if(typeof savePlannerData==='function')savePlannerData();m27Render();m27SetStatus(`${e.name} actual cost saved as ${m27Money(actual)}.`);
  }
  function m27PayEntry(id){
    const m=m27Metrics(),e=m.ledger.entries.find(x=>x.id===id);if(!e||e.status!=='reserved')return;
    if(e.actual<=0){m27SetStatus(`Enter the actual cost for ${e.name} before marking it paid.`,true);return}
    if(m.cash+0.009<e.actual){m27SetStatus(`The House Pot has ${m27Money(m.cash)}, which is not enough for the actual cost of ${m27Money(e.actual)}.`,true);return}
    m.pot.balance=Math.max(0,m.cash-e.actual);e.status='paid';e.deducted=true;e.paidDate=m27Today();e.amount=e.actual;
    if(typeof savePlannerData==='function')savePlannerData();if(typeof renderPotEditor==='function')renderPotEditor();if(typeof runPlanner==='function')runPlanner();else m27Render();
    const diff=e.estimated-e.actual;m27SetStatus(`${e.name} marked paid. ${m27Money(e.actual)} came off the House Pot${diff>0?`, releasing ${m27Money(diff)} back from the estimate`:diff<0?`, ${m27Money(Math.abs(diff))} over estimate`:''}.`);
  }
  function m27UndoEntry(id){
    const m=m27Metrics(),e=m.ledger.entries.find(x=>x.id===id);if(!e||(e.status!=='paid'&&e.status!=='historical')||!e.deducted)return;
    m.pot.balance=m.cash+e.actual;e.status='reserved';e.deducted=false;e.paidDate='';
    if(typeof savePlannerData==='function')savePlannerData();if(typeof renderPotEditor==='function')renderPotEditor();if(typeof runPlanner==='function')runPlanner();else m27Render();m27SetStatus(`${e.name} was undone. ${m27Money(e.actual)} was restored to the House Pot.`);
  }
  function m27EditEntry(id){
    const {pot,ledger}=m27EnsureState(),e=ledger.entries.find(x=>x.id===id);if(!e)return;
    const oldActual=Math.max(0,m27Number(e.actual)),oldDeducted=Boolean(e.deducted);
    const name=prompt('Payment description:',e.name);if(name===null)return;
    const estimatedText=prompt('Estimated cost (£):',Number(e.estimated||0).toFixed(2));if(estimatedText===null)return;
    const actualText=prompt('Actual cost (£):',Number(e.actual||0).toFixed(2));if(actualText===null)return;
    const due=prompt('Date (YYYY-MM-DD, or leave blank):',e.due||e.paidDate||'');if(due===null)return;
    const room=prompt('Room or area:',e.room||'Whole House');if(room===null)return;
    const category=prompt('Category:',e.category||'House project');if(category===null)return;
    const cleanName=String(name).trim(),cleanRoom=String(room).trim()||'Whole House',cleanCategory=String(category).trim()||'House project';
    const estimated=Math.max(0,m27Number(estimatedText)),actual=Math.max(0,m27Number(actualText));
    if(!cleanName||estimated<=0){m27SetStatus('The description and estimated cost must be completed.',true);return}
    if((e.status==='paid'||e.status==='historical')&&actual<=0){m27SetStatus('Paid and historical records need an actual cost above £0.',true);return}
    if(oldDeducted){
      const adjustment=oldActual-actual;
      const revisedCash=m27Number(pot.balance)+adjustment;
      if(revisedCash<-.009){m27SetStatus(`This edit would take the House Pot below £0. The largest actual cost you can enter is ${m27Money(m27Number(pot.balance)+oldActual)}.`,true);return}
      pot.balance=Math.max(0,revisedCash);
    }
    e.name=cleanName;e.estimated=estimated;e.actual=actual;e.amount=e.status==='reserved'?estimated:actual;e.due=String(due).trim();e.room=cleanRoom;e.category=cleanCategory;
    if((e.status==='paid'||e.status==='historical')&&!e.paidDate)e.paidDate=e.due||m27Today();
    if(!ledger.rooms.includes(cleanRoom))ledger.rooms.push(cleanRoom);
    if(typeof savePlannerData==='function')savePlannerData();if(typeof renderPotEditor==='function')renderPotEditor();if(typeof runPlanner==='function')runPlanner();else m27Render();
    const cashNote=oldDeducted&&Math.abs(oldActual-actual)>.009?` House Pot adjusted by ${m27Money(Math.abs(oldActual-actual))} ${actual>oldActual?'down':'up'}.`:'';
    m27SetStatus(`${cleanName} was updated.${cashNote}`);
  }

  function m27DeleteEntry(id){
    const {pot,ledger}=m27EnsureState(),i=ledger.entries.findIndex(e=>e.id===id);if(i<0)return;const e=ledger.entries[i];
    if((e.status==='paid'||e.status==='historical')&&e.deducted)pot.balance=m27Number(pot.balance)+e.actual;ledger.entries.splice(i,1);
    if(typeof savePlannerData==='function')savePlannerData();if(typeof renderPotEditor==='function')renderPotEditor();if(typeof runPlanner==='function')runPlanner();else m27Render();m27SetStatus(`${e.name} was deleted.`);
  }
  function m27AddRoom(){
    const name=prompt('New room or area name:');if(!name)return;const clean=String(name).trim();if(!clean)return;
    const {ledger}=m27EnsureState();if(ledger.rooms.some(r=>r.toLowerCase()===clean.toLowerCase())){m27SetStatus(`${clean} already exists.`,true);return}
    ledger.rooms.push(clean);if(typeof savePlannerData==='function')savePlannerData();m27Render();document.getElementById('m27EntryRoom').value=clean;m27SetStatus(`${clean} added to the room dashboard.`);
  }

  window.m27HouseMetrics=m27Metrics;window.m27HouseProjectProgress=()=>m27Metrics().funded;
  const originalGap=window.m15PotGap;window.m15PotGap=function(pot){const id=String(pot?.id||''),name=String(pot?.name||'').toLowerCase();if(id==='house_fund'||name.includes('house')){const m=m27Metrics();return Math.max(0,Number(pot?.target||m.target)-m.funded)}return typeof originalGap==='function'?originalGap(pot):Math.max(0,Number(pot?.target||0)-Number(pot?.balance||0))};
  const originalRun=window.runPlanner;if(typeof originalRun==='function')window.runPlanner=function(){m27EnsureState();const result=originalRun.apply(this,arguments);m27Render();return result};
  const originalReset=window.resetPlannerData;if(typeof originalReset==='function')window.resetPlannerData=function(){const result=originalReset.apply(this,arguments);plannerState.m27HouseProjectMigrated=false;m27EnsureState();return result};

  document.getElementById('m27SaveSetup')?.addEventListener('click',m27SaveSetup);
  document.getElementById('m27AddEntry')?.addEventListener('click',m27AddEntry);
  document.getElementById('m27AddRoom')?.addEventListener('click',m27AddRoom);
  document.getElementById('m27LedgerList')?.addEventListener('click',event=>{
    const save=event.target.closest('[data-m27-save-actual]');if(save){const input=document.querySelector(`[data-m27-actual="${CSS.escape(save.dataset.m27SaveActual)}"]`);m27SaveActual(save.dataset.m27SaveActual,input);return}
    const pay=event.target.closest('[data-m27-pay]');if(pay){m27PayEntry(pay.dataset.m27Pay);return}
    const undo=event.target.closest('[data-m27-undo]');if(undo){m27UndoEntry(undo.dataset.m27Undo);return}
    const edit=event.target.closest('[data-m27-edit]');if(edit){m27EditEntry(edit.dataset.m27Edit);return}
    const del=event.target.closest('[data-m27-delete]');if(del)m27DeleteEntry(del.dataset.m27Delete);
  });
  document.getElementById('savePotsBtn')?.addEventListener('click',()=>setTimeout(m27Render,0));
  document.getElementById('potEditorGrid')?.addEventListener('change',()=>setTimeout(m27Render,0));
  window.addEventListener('load',()=>{m27EnsureState();m27Render();if(typeof renderPotHealthRadar==='function')renderPotHealthRadar({})});
  m27EnsureState();m27Render();
})();

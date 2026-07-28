
(function(){
  const button=document.getElementById('auroraSystemButton');
  const panel=document.getElementById('auroraSystemPanel');
  const close=document.getElementById('auroraSystemClose');
  const list=document.getElementById('auroraSystemList');
  if(!button||!panel||!list) return;
  const parseDate=row=>{
    const raw=row?.date??row?.Date??row?.timestamp??row?.Timestamp??row?.updated_at??row?.Updated??row?.time;
    const d=raw?new Date(raw):null; return d&&!Number.isNaN(d.getTime())?d:null;
  };
  const ticker=row=>String(row?.ticker??row?.Ticker??'').trim().toUpperCase().replace('LON:','').replace('.L','');
  const value=row=>{
    const raw=row?.current_value??row?.market_value??row?.holding_value??row?.value??row?.Value;
    const n=Number(String(raw??'').replace(/[£,%]/g,'')); return Number.isFinite(n)?n:0;
  };
  const qty=row=>{const n=Number(String(row?.shares??row?.quantity??row?.units??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  function build(){
    const s=(typeof state!=='undefined'&&state)||{};
    const holdings=Array.isArray(s.holdings)?s.holdings:[];
    const active=holdings.filter(r=>qty(r)>0||value(r)>0);
    const counts=new Map(); active.forEach(r=>{const t=ticker(r);if(t)counts.set(t,(counts.get(t)||0)+1);});
    const duplicates=[...counts].filter(([,n])=>n>1);
    const missingAccount=active.filter(r=>!String(r.account??r.Account??r.platform??r.broker??'').trim()).length;
    const valuationRows=[...(s.watchlist||[]),...(s.scout||[]),...(s.globalWatchlist||[])];
    const missingFair=valuationRows.filter(r=>ticker(r)&&!(r.fair_value??r['Fair Value']??r.target_price??r['Target Price'])).length;
    const allRows=Object.values(s).flatMap(v=>Array.isArray(v)?v:[]);
    const latest=allRows.map(parseDate).filter(Boolean).sort((a,b)=>b-a)[0];
    const ageHours=latest?(Date.now()-latest.getTime())/36e5:NaN;
    const extra=(typeof window.AURORA_PAGE_CHECKS==='function'?window.AURORA_PAGE_CHECKS():[])||[];
    const checks=[
      {level:active.length?'ok':'bad',title:`${active.length} active holding rows`,detail:active.length?'Holdings are available to the page.':'No active holdings were detected.'},
      {level:missingAccount?'warn':'ok',title:missingAccount?`${missingAccount} holding rows missing an account`:'Account labels complete',detail:missingAccount?'Add IG ISA, Trade 212 or the correct platform to prevent scope errors.':'Account-scoped calculations can be applied safely.'},
      {level:duplicates.length?'warn':'ok',title:duplicates.length?`${duplicates.length} tickers appear in multiple accounts`:'No unexpected duplicate tickers',detail:duplicates.length?duplicates.slice(0,6).map(([t,n])=>`${t} ×${n}`).join(' • '):'Unique-ticker and account totals can be separated deliberately.'},
      {level:missingFair?'warn':'ok',title:missingFair?`${missingFair} valuation rows missing fair value`:'Fair-value fields available',detail:missingFair?'Those rows will show a neutral valuation until the sheet is completed.':'Transfer valuation indicators have source data.'},
      {level:Number.isFinite(ageHours)&&ageHours>26?'bad':Number.isFinite(ageHours)&&ageHours>8?'warn':'ok',title:latest?`Latest dated row: ${latest.toLocaleString('en-GB')}`:'No dated data row found',detail:Number.isFinite(ageHours)?`${ageHours.toFixed(1)} hours old.`:'The page can still run, but true data freshness cannot be confirmed.'},
      ...extra
    ];
    list.innerHTML=checks.map(c=>`<div class="aurora-system-row ${c.level==='ok'?'':c.level}"><i class="aurora-system-dot"></i><div><strong>${c.title}</strong><span>${c.detail}</span></div></div>`).join('');
  }
  function toggle(open){panel.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));if(open)build();}
  button.addEventListener('click',()=>toggle(!panel.classList.contains('open'))); close?.addEventListener('click',()=>toggle(false));
})();

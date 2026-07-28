
(() => {
  "use strict";
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const el=id=>document.getElementById(id);
  const cash=n=>Number.isFinite(Number(n))?new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2}).format(Number(n)):"—";
  const cash0=n=>Number.isFinite(Number(n))?new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Number(n)):"—";
  const num=v=>{if(v===null||v===undefined||v==="")return NaN;const n=Number(String(v).replace(/[£,$%]/g,"").trim());return Number.isFinite(n)?n:NaN};
  const normalise=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const field=(r,names)=>{const keys=Object.keys(r||{});for(const name of names){const wanted=normalise(name);const key=keys.find(k=>normalise(k)===wanted);if(key!==undefined&&r[key]!=="")return r[key]}return ""};
  function parseDate(v){
    if(!v)return null;if(v instanceof Date&&!isNaN(v))return v;
    if(typeof v==="number"&&v>20000)return new Date(Math.round((v-25569)*86400000));
    const raw=String(v).trim();let m=raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1],12)}
    if(/^\d{4}-\d{2}-\d{2}/.test(raw)){const [y,mo,d]=raw.slice(0,10).split("-").map(Number);return new Date(y,mo-1,d,12)}
    const d=new Date(raw);return isNaN(d)?null:d;
  }
  const today=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
  const dateLabel=d=>d?d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
  const daysTo=d=>d?Math.ceil((d-today())/86400000):null;
  const currentState=()=>window.state||{};
  function sourceRows(){
    const st=currentState();
    return [
      ...(Array.isArray(st.dividends)?st.dividends:[]),
      ...(Array.isArray(st.incomeLog)?st.incomeLog:[]),
      ...(Array.isArray(st.holdings)?st.holdings:[])
    ];
  }
  function dividendEvents(){
    const events=[],seen=new Set();
    sourceRows().forEach(r=>{
      const ticker=String(field(r,["ticker","symbol","epic","code"])||"").replace("LON:","").replace(".L","").trim().toUpperCase();
      const name=String(field(r,["name","holding","company","stock","security"])||ticker||"Holding").trim();
      const ex=parseDate(field(r,["ex_date","ex date","ex-dividend date","ex dividend date","ex_div_date","next ex date","next_ex_date"]));
      const pay=parseDate(field(r,["pay_date","pay date","payment date","payment_date","next payment date","next_pay_date","dividend pay date"]));
      const due=num(field(r,["dividend_due","dividend due","total_dividend","amount","cash","expected_cash","expected cash","payment amount","dividend amount","net amount"]));
      const received=num(field(r,["dividend_received","dividend received","received amount","cash received"]));
      const add=(type,date,cashValue)=>{if(!date)return;const key=[ticker||name,type,date.toISOString().slice(0,10)].join("|");if(seen.has(key))return;seen.add(key);events.push({ticker,name,type,date,cash:cashValue||0})};
      add("Ex-Date",ex,0);add("Pay Date",pay,Number.isFinite(due)?due:Number.isFinite(received)?received:0);
    });
    return events.sort((a,b)=>a.date-b.date);
  }
  function renderTicket(events){
    const next=events.find(e=>e.type==="Pay Date"&&e.date>=today());
    if(!next){el("m82TicketName").textContent="No upcoming payment loaded";el("m82TicketDate").textContent="—";el("m82TicketCash").textContent="—";el("m82TicketDays").textContent="—";el("m82TicketTag").textContent="Waiting";el("m82TicketNote").textContent="No future payment date was found in Dividends, IncomeLog or Holdings.";el("m82TicketBar").style.width="0%";return}
    const days=daysTo(next.date);el("m82TicketName").textContent=next.name;el("m82TicketDate").textContent=dateLabel(next.date);el("m82TicketCash").textContent=next.cash>0?cash(next.cash):"Amount pending";el("m82TicketDays").textContent=days===0?"Today":String(days);el("m82TicketTag").textContent=days<=7?"Imminent":"Scheduled";el("m82TicketNote").textContent=days===0?"Dividend cash is due today.":`${days} days until the next scheduled cash event.`;el("m82TicketBar").style.width=`${Math.max(8,Math.min(100,100-days*2.5))}%`;
  }
  function renderCalendar(events){
    const totals=Array(12).fill(0);events.filter(e=>e.type==="Pay Date").forEach(e=>totals[e.date.getMonth()]+=Math.max(0,e.cash||0));
    const positive=totals.filter(v=>v>0),avg=positive.length?positive.reduce((a,b)=>a+b,0)/positive.length:0,best=Math.max(...totals),bestI=totals.indexOf(best),gaps=totals.filter(v=>v===0).length,coverage=12-gaps;
    const paid=totals.map((v,i)=>({v,i})).filter(x=>x.v>0);const weakest=paid.length?paid.reduce((a,b)=>a.v<=b.v?a:b):null;
    el("m82Calendar").innerHTML=MONTHS.map((m,i)=>{const v=totals[i];let cls="gap",note="Gap";if(v===best&&best>0){cls="best";note="Strongest"}else if(v>0&&v<avg){cls="watch";note="Light"}else if(v>0){cls="healthy";note="Healthy"}return `<div class="m82-month ${cls}"><small>${m}</small><strong>${cash0(v)}</strong><span>${note}</span></div>`}).join("");
    el("m82StrongMonth").textContent=best>0?`${MONTHS[bestI]} ${cash0(best)}`:"—";el("m82WeakMonth").textContent=weakest?`${MONTHS[weakest.i]} ${cash0(weakest.v)}`:"—";el("m82Coverage").textContent=`${coverage}/12 months`;el("m82Gaps").textContent=String(gaps);el("m82CalendarTag").textContent=`Coverage ${coverage}/12`;
    const missing=MONTHS.filter((_,i)=>totals[i]===0);el("m82CalendarAdvice").textContent=events.length?(missing.length?`Cashflow gaps appear in ${missing.join(", ")}. Treat payment timing as a secondary tie-breaker behind total income, valuation and dividend quality.`:"All 12 months have dividend coverage. Future transfers can remain focused on maximum sustainable income."):"No dated dividend payments were found in the current AuroraMaster feed.";
  }
  function renderTimeline(events){
    const upcoming=events.filter(e=>e.date>=today()).slice(0,8);el("m82Timeline").innerHTML=upcoming.length?upcoming.map(e=>`<div class="m82-event"><span class="m82-event-icon">${e.type==="Pay Date"?"£":"📅"}</span><div><strong>${e.name} • ${e.type}</strong><span>${daysTo(e.date)} days away${e.cash>0?` • ${cash(e.cash)}`:""}</span></div><time>${dateLabel(e.date)}</time></div>`).join(""):`<div class="m82-event"><span class="m82-event-icon">…</span><div><strong>No upcoming events loaded</strong><span>Add future ex-dividend or payment dates to AuroraMaster.</span></div><time>—</time></div>`;
  }
  function renderSnowball(){
    const rows=Array.isArray(currentState().incomeLog)?currentState().incomeLog:[];let received=0,recycled=0,created=0;
    rows.forEach(r=>{const type=String(field(r,["source_type","source type","type","event","category"])||"").toLowerCase().replace(/[\s-]+/g,"_");const amount=num(field(r,["amount","dividend_amount","cash_amount","source_amount","received","cash received","value"]));const add=num(field(r,["income_added","income added","annual_income_added","new annual income","annual income created"]));if(Number.isFinite(amount)){if(type.includes("dividend")||type.includes("income")||type.includes("payment"))received+=amount;if(type.includes("recycl")||type.includes("reinvest")||type==="capital")recycled+=amount}if(Number.isFinite(add))created+=add});
    el("m82Received").textContent=cash(received);el("m82Recycled").textContent=cash(recycled);el("m82IncomeCreated").textContent=`${cash(created)}/yr`;el("m82SnowNote").textContent=rows.length?`${cash(received)} of logged dividend cash and ${cash(recycled)} of recycled capital have created ${cash(created)} of additional annual income.`:"No IncomeLog entries are available yet. The ledger will populate as Aurora records dividend cash and redeployment.";
  }
  function renderRadar(){
    let rows=[];try{rows=typeof combinedHoldings==="function"?combinedHoldings():[]}catch(_){rows=[]}
    const totalIncome=rows.reduce((s,x)=>s+(x.income||0),0);const ranked=rows.filter(x=>x.income>0).sort((a,b)=>b.income-a.income).slice(0,7);
    el("m82Radar").innerHTML=ranked.length?ranked.map(x=>{const share=totalIncome?x.income/totalIncome:0,y=x.yield||0;let level="safe",label="Balanced",score=78;if(share>.3||y>.12){level="review";label="Review";score=42}else if(share>.18||y>.09){level="watch";label="Watch";score=61}return `<div class="m82-risk-row"><b>${x.ticker} • ${x.name}</b><div class="bar"><div class="fill" style="width:${Math.max(18,Math.min(100,score))}%"></div></div><span class="m82-risk-pill ${level}">${label}</span></div>`}).join(""):`<div class="m82-event"><div><strong>No income holdings loaded</strong><span>Radar will activate from the live holdings feed.</span></div></div>`;
    const top=ranked[0],topShare=top&&totalIncome?top.income/totalIncome:0;el("m82RadarAdvice").textContent=topShare>.3?`${top.ticker} supplies ${(topShare*100).toFixed(1)}% of portfolio income. That concentration deserves review before adding more.`:top?`The largest income contributor is ${top.ticker} at ${(topShare*100).toFixed(1)}%. No single payer currently dominates above the 30% review line.`:"Aurora is waiting for live income holdings.";
  }
  function render(){
    const st=currentState();if(!Array.isArray(st.holdings))return false;const events=dividendEvents();renderTicket(events);renderCalendar(events);renderTimeline(events);renderSnowball();renderRadar();el("m82SuiteStatus").textContent=events.length?`Live • ${events.length} events`:`Connected • no dated events`;return true;
  }
  document.addEventListener("aurora:data-ready",render);
  let tries=0;const timer=setInterval(()=>{tries++;if(render()||tries>30)clearInterval(timer)},500);
  document.getElementById("refreshBtn")?.addEventListener("click",()=>setTimeout(render,1400));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(render,250)});
})();


/* ===================== M26 FULL PAY-CYCLE PROTECTION FIX ===================== */
(function(){
  'use strict';

  const M26_LOGIC_VERSION = 26;
  const m26OriginalBillProtection = window.m22BillProtection;
  const m26OriginalSinkingFundPlan = window.m25SinkingFundPlan;
  const m26OriginalComputePlan = window.m22ComputePlan;

  function m26Date(value){
    if(!value) return null;
    const date = value instanceof Date
      ? new Date(value)
      : (typeof parseLocalDate === 'function' ? parseLocalDate(value) : new Date(value));
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function m26Iso(date){
    if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function m26Norm(value){
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g,'and')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function m26ItemDate(item){
    return m26Date(item?._d || item?.due);
  }

  function m26ItemAmount(item){
    return Math.max(0, Number((item?._cashAmount ?? item?.amount) || 0));
  }

  function m26Unique(items){
    const seen = new Set();
    return (items || []).filter(item => {
      const due = item?.due || m26Iso(m26ItemDate(item));
      const key = `${m26Norm(item?.name)}|${due}|${m26ItemAmount(item).toFixed(2)}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function m26Window(paydayValue){
    const payday = m26Date(paydayValue);
    if(!payday) return null;
    payday.setHours(0,0,0,0);
    const nextPayday = new Date(payday);
    nextPayday.setDate(nextPayday.getDate()+28);
    nextPayday.setHours(0,0,0,0);
    return {payday,nextPayday};
  }

  window.m26PayCycleItems = function(paydayValue){
    const range = m26Window(paydayValue);
    if(!range || typeof window.m25BeforePaydayItems !== 'function') return [];
    const throughNextPayday = window.m25BeforePaydayItems(range.nextPayday) || [];
    return m26Unique(throughNextPayday.filter(item => {
      const due = m26ItemDate(item);
      if(!due) return false;
      due.setHours(0,0,0,0);
      return due >= range.payday && due < range.nextPayday;
    })).sort((a,b)=>m26ItemDate(a)-m26ItemDate(b));
  };

  window.m22BillProtection = function(paydayDate){
    const prePaydayItems = typeof window.m25BeforePaydayItems === 'function'
      ? window.m25BeforePaydayItems(paydayDate)
      : (typeof m26OriginalBillProtection === 'function' ? (m26OriginalBillProtection(paydayDate)?.items || []) : []);
    const cycleItems = window.m26PayCycleItems(paydayDate);
    const items = m26Unique([...(prePaydayItems || []),...(cycleItems || [])])
      .sort((a,b)=>m26ItemDate(a)-m26ItemDate(b));
    const preBills = (prePaydayItems || []).reduce((sum,item)=>sum+m26ItemAmount(item),0);
    const cycleBills = cycleItems.reduce((sum,item)=>sum+m26ItemAmount(item),0);
    const bills = items.reduce((sum,item)=>sum+m26ItemAmount(item),0);
    const recurring = (plannerState?.recurringCosts || [])
      .filter(item=>item?.included!==false)
      .reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)-Number(item.spentThisCycle||0)),0);
    const minimum = Math.max(0,Number(plannerState?.minimumBuffer||0));
    const holding = Math.max(0,Number(plannerState?.holdingBalance||0));
    const required = minimum+bills+recurring;
    const range = m26Window(paydayDate);
    return {
      items,
      prePaydayItems,
      cycleItems,
      preBills,
      cycleBills,
      bills,
      recurring,
      minimum,
      holding,
      required,
      headroom:Math.max(0,holding-required),
      topUp:Math.max(0,required-holding),
      paydayDate:range?m26Iso(range.payday):'',
      nextPayday:range?m26Iso(range.nextPayday):''
    };
  };

  function m26SourceLabel(item){
    if(item?._sourceLabel) return String(item._sourceLabel);
    if(item?.source === 'yearly') return 'Yearly Costs';
    if(item?.source === 'future') return 'Future Costs';
    return 'Scheduled Bills';
  }

  window.m25SinkingFundPlan = function(paydayValue){
    const plan = typeof m26OriginalSinkingFundPlan === 'function'
      ? m26OriginalSinkingFundPlan(paydayValue)
      : {details:[],totalCommitments:0,totalRemaining:0,allocatedHeadroom:0,contribution:0};
    const protection = window.m22BillProtection(paydayValue);
    const cycleDetails = (protection.cycleItems || []).map(item=>({
      ...item,
      amount:m26ItemAmount(item),
      sourceLabel:m26SourceLabel(item),
      paydays:1,
      contribution:m26ItemAmount(item),
      dueThisCycle:true
    }));
    return {
      ...plan,
      protection,
      cycleDetails,
      cycleCommitments:protection.cycleBills || 0,
      payCycleStart:protection.paydayDate,
      payCycleEnd:protection.nextPayday
    };
  };

  window.m22ComputePlan = function(){
    const plan = typeof m26OriginalComputePlan === 'function' ? m26OriginalComputePlan() : null;
    if(!plan) return plan;
    plan.logicVersion = M26_LOGIC_VERSION;
    const urgent = plan.actions?.find(action=>action.id==='holding:protection');
    if(urgent){
      urgent.meta = `Immediate cover through the following payday: ${m15Money(plan.protection.minimum)} buffer + ${m15Money(plan.protection.bills)} dated payments + ${m15Money(plan.protection.recurring)} remaining monthly spending`;
    }
    plan.cycleBills = Number(plan.protection?.cycleBills || 0);
    return plan;
  };

  window.m22CurrentPlan = function(){
    const mission = m22EnsureState();
    if(mission.plan && mission.plan.logicVersion !== M26_LOGIC_VERSION && !m22AnyExecuted() && !mission.completed){
      mission.plan = null;
    }
    return mission.plan || window.m22ComputePlan();
  };

  window.m25RenderSinking = function(plan){
    const sinking = plan.sinking || window.m25SinkingFundPlan(plan.paydayDate);
    const cycleTotal = Number(sinking.cycleCommitments || 0);
    const futureContribution = Number(sinking.contribution || 0);

    m15Set('m25SinkingTotal',cycleTotal > .009
      ? `${m15Money(futureContribution)} FUTURE • ${m15Money(cycleTotal)} DUE THIS CYCLE`
      : `${m15Money(futureContribution)} THIS PAYDAY`);
    m15Set('m25LongTermTarget',m15Money(sinking.totalCommitments || 0));
    m15Set('m25LongTermGap',m15Money(sinking.totalRemaining || 0));

    const summary = document.getElementById('m25SinkingSummary');
    if(summary){
      summary.innerHTML = `
        <div class="m25-sinking-stat"><span>Due this pay cycle</span><strong>${m15Money(cycleTotal)}</strong></div>
        <div class="m25-sinking-stat"><span>Future commitments</span><strong>${m15Money(sinking.totalCommitments || 0)}</strong></div>
        <div class="m25-sinking-stat"><span>Future funding gap</span><strong>${m15Money(sinking.totalRemaining || 0)}</strong></div>`;
    }

    const host = document.getElementById('m25SinkingList');
    if(!host) return;
    const cycleRows = (sinking.cycleDetails || []).map(item=>`
      <div class="m25-sinking-row">
        <div>
          <strong>${m22Escape(item.name)}</strong>
          <small>${m22Escape(item.sourceLabel)} • due ${m22Escape(dateLabel(item.due))} • due before ${m22Escape(dateLabel(sinking.payCycleEnd))} • protected in full</small>
        </div>
        <div class="m25-sinking-amount">${m15Money(item.amount)}<small>full cycle reserve</small></div>
      </div>`);
    const futureRows = (sinking.details || []).map(item=>`
      <div class="m25-sinking-row">
        <div>
          <strong>${m22Escape(item.name)}</strong>
          <small>${m22Escape(item.source === 'scheduled' ? 'Scheduled Bills' : item.source === 'yearly' ? 'Yearly Costs' : 'Future Costs')} • due ${m22Escape(dateLabel(item.due))} • ${item.paydays} payday${item.paydays===1?'':'s'} left • ${m15Money(item.remaining)} still to fund</small>
        </div>
        <div class="m25-sinking-amount">${m15Money(item.contribution)}<small>this payday</small></div>
      </div>`);
    const rows = [...cycleRows,...futureRows];
    host.innerHTML = rows.length
      ? rows.join('')
      : '<div class="m22-empty">No dated commitments currently need protection or a sinking-fund contribution.</div>';
  };

  const m26OriginalInstruction = window.m22Instruction;
  window.m22Instruction = function(plan){
    if(typeof m26OriginalInstruction === 'function') m26OriginalInstruction(plan);
    const el = document.getElementById('m15Instruction');
    if(!el || plan.unresolvedProtection > .009 || plan.unresolvedRegularHolding > .009 || plan.shortfall > .009) return;
    const cycleBills = Number(plan.protection?.cycleBills || 0);
    if(cycleBills > .009){
      el.className = 'm22-callout good';
      el.innerHTML = `Current-account payday plan ready. <strong>${m15Money(cycleBills)}</strong> due between this payday and the following payday is protected in full. Any required immediate top-up is <strong>${m15Money(plan.urgentHoldingAmount)}</strong>, with <strong>${m15Money(plan.regularHoldingAmount)}</strong> added for later dated commitments.`;
    }
  };

  window.addEventListener('load',()=>{
    const mission = typeof m22EnsureState === 'function' ? m22EnsureState() : null;
    if(mission && mission.plan && mission.plan.logicVersion !== M26_LOGIC_VERSION && !m22AnyExecuted() && !mission.completed){
      mission.plan = null;
    }
    if(typeof m22Render === 'function') m22Render();
    if(typeof m25ApplyPlannerClarity === 'function') m25ApplyPlannerClarity();
  });
})();

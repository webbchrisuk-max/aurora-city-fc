/* Aurora City FC Finance Department — page-specific logic extracted from unified HTML */

/* ===== Original inline script 01 ===== */
function toggleSection(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}
function parseLocalDate(dateStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const due = parseLocalDate(dateStr);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMoney0(v) {
  return Number(v || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function parseNum(v) {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function dateLabel(dateStr) {
  if (!dateStr) return "No date yet";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "No date yet";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(dateStr) {
  return getDaysLeft(dateStr);
}

function weeklyFromYearly(v) {
  return v / 52;
}

function monthlyFromYearly(v) {
  return v / 12;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

const STORAGE_KEY = "aurora_wealth_centre";
const FIRST_PAYDAY = "2026-04-24";
const GROW_POT_TARGET = 7500;

const defaultScheduledBills = [
  { id: "Spain", name: "Spain Holiday", due: "2026-05-31", amount: 350, paid: false, actualPaid: 0, deducted: false, included: true, category: "Travel", notes: "End of May" },
  { id: "tooth", name: "Tooth Extraction Balance", due: "2026-06-16", amount: 120, paid: false, actualPaid: 0, deducted: false, included: true, category: "Dentist", notes: "Confirmed" },
  { id: "hygienist", name: "Hygienist", due: "2026-07-10", amount: 50, paid: false, actualPaid: 0, deducted: false, included: true, category: "Dentist", notes: "Confirmed" },
  { id: "carrepairs", name: "Car Repairs", due: "2026-08-15", amount: 400, paid: false, actualPaid: 0, deducted: false, included: true, category: "Car", notes: "Editable placeholder" },
  { id: "carservice", name: "Car Service", due: "2026-09-15", amount: 300, paid: false, actualPaid: 0, deducted: false, included: true, category: "Car", notes: "Editable estimate" },
  { id: "insurance", name: "Car Insurance", due: "2026-10-01", amount: 240, paid: false, actualPaid: 0, deducted: false, included: true, category: "Car", notes: "Editable estimate" },
  { id: "ps", name: "PlayStation Subscription", due: "2026-11-14", amount: 99.99, paid: false, actualPaid: 0, deducted: false, included: true, category: "Subscription", notes: "Annual renewal" },
  { id: "christmas", name: "Christmas", due: "2026-12-01", amount: 500, paid: false, actualPaid: 0, deducted: false, included: true, category: "Seasonal", notes: "Planned target" },
  { id: "mot", name: "MOT", due: "2027-01-31", amount: 60, paid: false, actualPaid: 0, deducted: false, included: true, category: "Car", notes: "Editable estimate" },
  { id: "boiler", name: "Boiler Service", due: "2027-01-31", amount: 90, paid: false, actualPaid: 0, deducted: false, included: true, category: "Home", notes: "End of January / early February" },
  { id: "tvsub", name: "TV Subscription", due: "2027-03-15", amount: 50, paid: false, actualPaid: 0, deducted: false, included: true, category: "Subscription", notes: "Annual subscription" }
];

const defaultFutureCosts = [
  { id: "dent1", name: "Dentist Treatment 1", due: "", amount: 550, included: false, category: "Dentist", notes: "No due date agreed yet" },
  { id: "dent2", name: "Dentist Treatment 2", due: "", amount: 300, included: false, category: "Dentist", notes: "No due date agreed yet" },
  { id: "ticket", name: "Coventry Season Ticket", due: "2027-05-01", amount: 750, included: false, category: "Football", notes: "May 2027 estimate only" },
  { id: "marchholiday", name: "March Holiday", due: "2027-03-01", amount: 400, included: false, category: "Holiday", notes: "Five-day holiday not confirmed yet" },
  { id: "marchspend", name: "March Holiday Spending Money", due: "2027-03-01", amount: 150, included: false, category: "Holiday", notes: "Editable later if needed" }
];

const defaultRecurringCosts = [
  { id: "haircut", name: "Haircut", amount: 21, originalAmount: 21, included: true, category: "Lifestyle" },
  { id: "carwash", name: "Car Wash", amount: 20, originalAmount: 20, included: true, category: "Car" },
  { id: "petrol", name: "Petrol", amount: 60, originalAmount: 60, included: true, category: "Car" }
];

const defaultYearlyRecurringCosts = [
  { id: "tv_yearly", name: "TV Subscription", due: "2027-03-15", amount: 50, paid: false, deducted: false, paidAmount: 0, lastPaidDate: "", nextRenewalDue: "2028-03-15", included: true, category: "Subscription", notes: "" },
  { id: "ps_yearly", name: "PlayStation Subscription", due: "2026-11-14", amount: 99.99, paid: false, deducted: false, paidAmount: 0, lastPaidDate: "", nextRenewalDue: "2027-11-14", included: true, category: "Subscription" }
];

function m21DateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function m21NextRenewalDate(dueValue, fromToday = false) {
  if (!dueValue) return "";
  const due = parseLocalDate(dueValue);
  if (Number.isNaN(due.getTime())) return "";
  due.setFullYear(due.getFullYear() + 1);

  if (fromToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    while (due <= today) due.setFullYear(due.getFullYear() + 1);
  }
  return m21DateValue(due);
}

function normaliseYearlyRecurringCosts(items) {
  const source = Array.isArray(items) ? items : [];
  return source.map(item => {
    const due = String(item?.due || "");
    const paid = Boolean(item?.paid);
    const deducted = Boolean(item?.deducted);
    return {
      ...item,
      due,
      amount: Number(item?.amount || 0),
      paid,
      deducted,
      paidAmount: Number(item?.paidAmount || (deducted ? item?.amount : 0) || 0),
      lastPaidDate: String(item?.lastPaidDate || ""),
      nextRenewalDue: String(item?.nextRenewalDue || m21NextRenewalDate(due)),
      included: item?.included !== false,
      category: String(item?.category || "Other"),
      notes: String(item?.notes || "")
    };
  });
}


const defaultEditablePots = [
  {id:"spending_pot",name:"Spending Pot",balance:0,target:600,note:"Lifestyle spending",priority:3},
  {id:"coventry_city_tickets_travel",name:"Coventry City Tickets / Travel",balance:0,target:540,note:"Match tickets and travel",priority:2},
  {id:"coventry_city_season_ticket",name:"Coventry City Season Ticket",balance:0,target:635,note:"Season ticket fund",priority:2},
  {id:"dentist",name:"Dentist",balance:150,target:345,note:"Current dentist balance",priority:1},
  {id:"car_costs",name:"Car Costs",balance:0,target:650,note:"Maintenance, MOT and repairs",priority:1},
  {id:"christmas",name:"Christmas Pot",balance:0,target:500,note:"Christmas fund",priority:2},
  {id:"holiday_pot",name:"Holiday Pot",balance:0,target:500,note:"Holiday fund",priority:3},
  {id:"emergency_fund",name:"Emergency Fund",balance:700,target:7500,note:"Long-term safety reserve",priority:1},
  {id:"payday_rollover",name:"Payday Rollover",balance:0,target:350,note:"Short-term safety buffer",priority:1},
  {id:"house_fund",name:"House Fund",balance:16152.01,target:19000,note:"Renovation and home projects",priority:2}
];
function freshEditablePots(){return JSON.parse(JSON.stringify(defaultEditablePots));}
function migrateLegacyPots(parsed){
  if(Array.isArray(parsed?.editablePots) && parsed.editablePots.length) return parsed.editablePots;
  const mp=parsed?.monzoPots;
  if(!mp || typeof mp!=="object") return freshEditablePots();
  return Object.entries(mp).map(([id,p])=>({
    id,
    name:String(p?.name||id.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())),
    balance:parseNum(p?.balance),
    target:parseNum(p?.target ?? p?.payday_target),
    note:String(p?.note||"Imported from previous pot data"),
    priority:Math.max(1,Math.min(3,Number(p?.priority||2)))
  }));
}

function getFreshDefaults() {
  const freshScheduled = JSON.parse(JSON.stringify(defaultScheduledBills));
  const freshFuture = JSON.parse(JSON.stringify(defaultFutureCosts));
  const freshRecurring = JSON.parse(JSON.stringify(defaultRecurringCosts));
  const freshYearlyRecurring = JSON.parse(JSON.stringify(defaultYearlyRecurringCosts));

  freshFuture.forEach(item => {
    if (
      item.id === "dent1" ||
      item.id === "dent2" ||
      String(item.name || "").toLowerCase().includes("dentist")
    ) {
      item.due = "";
    }
  });

  return {
    holdingBalance: 2550.36,
    paydayContribution: 140,
    minimumBuffer: 1000,
    growPotBalance: 700,
    growPotTarget: 7500,
    editablePots: freshEditablePots(),
    scheduledBills: freshScheduled,
    futureCosts: freshFuture,
    recurringCosts: freshRecurring,
    yearlyRecurringCosts: freshYearlyRecurring,
    archivedBills: [],
    canteen: {
      budget: 80,
      lastSpend: 0,
      lastReleased: 0
    }
  };
}

let plannerState = getFreshDefaults();

function savePlannerData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerState));
}

function loadPlannerData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    plannerState = {
      ...getFreshDefaults(),
      ...parsed,
      paydayContribution: parseNum(parsed.paydayContribution ?? 140),
      growPotBalance: parseNum(parsed.growPotBalance ?? 700),
      growPotTarget: parseNum(parsed.growPotTarget ?? 7500),
      editablePots: migrateLegacyPots(parsed),

      scheduledBills: Array.isArray(parsed.scheduledBills)
        ? parsed.scheduledBills.map(bill => ({
            deducted: false,
            ...bill
          }))
        : JSON.parse(JSON.stringify(defaultScheduledBills)),

      futureCosts: Array.isArray(parsed.futureCosts)
        ? parsed.futureCosts
        : JSON.parse(JSON.stringify(defaultFutureCosts)),

      recurringCosts: Array.isArray(parsed.recurringCosts)
        ? parsed.recurringCosts
        : JSON.parse(JSON.stringify(defaultRecurringCosts)),

      yearlyRecurringCosts: normaliseYearlyRecurringCosts(
        Array.isArray(parsed.yearlyRecurringCosts)
          ? parsed.yearlyRecurringCosts
          : JSON.parse(JSON.stringify(defaultYearlyRecurringCosts))
      ),

      archivedBills: Array.isArray(parsed.archivedBills)
        ? parsed.archivedBills
        : [],

      canteen: parsed.canteen || {
        budget: 80,
        lastSpend: 0,
        lastReleased: 0
      }
    };

    plannerState.recurringCosts = plannerState.recurringCosts.map(item => ({
      ...item,
      originalAmount: Number(item.originalAmount ?? item.amount ?? 0),
      spentThisCycle: Number(item.spentThisCycle || 0),
      payAmount: Number(item.payAmount ?? item.amount ?? 0),
      lastPaidDate: item.lastPaidDate || ""
    }));
    plannerState.recurringSpendHistory = Array.isArray(plannerState.recurringSpendHistory)
      ? plannerState.recurringSpendHistory
      : [];
  } catch (err) {
    console.error("Could not load planner data", err);
  }
}

function resetPlannerData() {
  localStorage.removeItem(STORAGE_KEY);
  plannerState = getFreshDefaults();
}

function savePotHistory() {
  const historyKey = "aurora_wealth_centre_history_v1";
  const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");

  const today = new Date();
  const stamp = today.toISOString().slice(0, 10);
  const last = existing[existing.length - 1];

  if (!last || last.date !== stamp || Number(last.balance) !== Number(plannerState.holdingBalance || 0)) {
    existing.push({
      date: stamp,
      balance: Number(plannerState.holdingBalance || 0)
    });
  }

  const trimmed = existing.slice(-8);
  localStorage.setItem(historyKey, JSON.stringify(trimmed));
}

function renderPotTrendChart() {
  const canvas = document.getElementById("potTrendChart");
  if (!canvas || typeof Chart === "undefined") return;

  const historyKey = "aurora_wealth_centre_history_v1";
  let history = JSON.parse(localStorage.getItem(historyKey) || "[]");

  if (!Array.isArray(history) || history.length === 0) {
    history = [{
      date: new Date().toISOString().slice(0, 10),
      balance: Number(plannerState.holdingBalance || 0)
    }];
  }

  const labels = history.map(item => {
    const d = new Date(item.date);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  });

  const data = history.map(item => Number(item.balance || 0));

  if (window.potTrendChartInstance) {
    window.potTrendChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, "rgba(98,243,255,0.35)");
  gradient.addColorStop(1, "rgba(98,243,255,0.02)");

  window.potTrendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#62f3ff",
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `£${formatMoney(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#96abc5",
            maxRotation: 0,
            autoSkip: true
          },
          grid: {
            display: false
          }
        },
        y: {
          ticks: {
            color: "#96abc5",
            callback: function(value) {
              return `£${formatMoney0(value)}`;
            }
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        }
      }
    }
  });

  setText("potTrendMeta", `${history.length} saved snapshots of your holding pot`);
}

function exportPlannerBackup() {
  try {
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: "aurora_wealth_centre",
      plannerState
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    a.href = url;
    a.download = `aurora-wealth-centre-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setText("backupStatus", `Backup exported: ${new Date().toLocaleString("en-GB")}`);
  } catch (err) {
    console.error("Export failed", err);
    setText("backupStatus", "Backup export failed");
  }
}

function importPlannerBackupFromFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const importedState = parsed?.plannerState ? parsed.plannerState : parsed;

      if (!importedState || typeof importedState !== "object") {
        throw new Error("Invalid backup format");
      }

      plannerState = {
        ...getFreshDefaults(),
        ...importedState,
        paydayContribution: Number.isFinite(Number(importedState.paydayContribution))
          ? Number(importedState.paydayContribution)
          : 140,
        growPotBalance: Number.isFinite(Number(importedState.growPotBalance))
          ? Number(importedState.growPotBalance)
          : 700,
        growPotTarget: Number.isFinite(Number(importedState.growPotTarget))
          ? Number(importedState.growPotTarget)
          : 7500,
        scheduledBills: Array.isArray(importedState.scheduledBills)
          ? importedState.scheduledBills.map(bill => ({
              deducted: false,
              ...bill
            }))
          : JSON.parse(JSON.stringify(defaultScheduledBills)),
        futureCosts: Array.isArray(importedState.futureCosts)
          ? importedState.futureCosts
          : JSON.parse(JSON.stringify(defaultFutureCosts)),
        recurringCosts: Array.isArray(importedState.recurringCosts)
          ? importedState.recurringCosts
          : JSON.parse(JSON.stringify(defaultRecurringCosts)),
        yearlyRecurringCosts: normaliseYearlyRecurringCosts(
          Array.isArray(importedState.yearlyRecurringCosts)
            ? importedState.yearlyRecurringCosts
            : JSON.parse(JSON.stringify(defaultYearlyRecurringCosts))
        ),
        archivedBills: Array.isArray(importedState.archivedBills)
          ? importedState.archivedBills
          : [],
        canteen: importedState.canteen || {
          budget: 80,
          lastSpend: 0,
          lastReleased: 0
        }
      };

      document.getElementById("holdingBalanceInput").value = Number(plannerState.holdingBalance || 0).toFixed(2);
      document.getElementById("paydayContributionInput").value = Number(plannerState.paydayContribution || 0);
      document.getElementById("minimumBufferInput").value = Number(plannerState.minimumBuffer || 0);
      document.getElementById("growPotBalanceInput").value = Number(plannerState.growPotBalance || 0).toFixed(2);
      document.getElementById("growPotTargetInput").value = Number(plannerState.growPotTarget || 7500);

      savePlannerData();
      runPlanner();

      setText("backupStatus", `Backup imported: ${new Date().toLocaleString("en-GB")}`);
    } catch (err) {
      console.error("Import failed", err);
      setText("backupStatus", "Import failed - invalid backup file");
    }
  };

  reader.readAsText(file);
}

function getContributionInput() {
  return document.getElementById("paydayContributionInput");
}

function getNextPaydayDate() {
  const base = parseLocalDate(FIRST_PAYDAY);
  base.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(base);

  while (next < today) {
    next.setDate(next.getDate() + 28);
  }

  return next;
}

function getNextPaydayLabel() {
  return getNextPaydayDate().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getDaysToNextPayday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = getNextPaydayDate();
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function m38FindFundingPot(sourceName) {
  const wanted = String(sourceName || "").trim().toLocaleLowerCase("en-GB");
  if (!wanted || !Array.isArray(plannerState?.editablePots)) return null;
  return plannerState.editablePots.find(pot =>
    String(pot?.name || "").trim().toLocaleLowerCase("en-GB") === wanted ||
    String(pot?.id || "").trim().toLocaleLowerCase("en-GB") === wanted
  ) || null;
}

function m38DeductFundingSource(bill, amount) {
  const paid = Math.max(0, Number(amount || 0));
  if (!paid) return;
  const source = String(bill?.fundingSource || (bill?.included === false ? "Current Account" : "Holding Pot"));
  if (source === "Holding Pot") {
    plannerState.holdingBalance = Math.max(0, Number(plannerState.holdingBalance || 0) - paid);
    const holdingInput = document.getElementById("holdingBalanceInput");
    if (holdingInput) holdingInput.value = Number(plannerState.holdingBalance || 0).toFixed(2);
    return;
  }
  if (source === "Current Account") return;
  const pot = m38FindFundingPot(source);
  if (pot) pot.balance = Math.max(0, Number(pot.balance || 0) - paid);
}

function applyPaidScheduledDeductions() {
  (plannerState.scheduledBills || []).forEach(bill => {
    if (bill.paid && !bill.deducted && Number(bill.actualPaid || 0) > 0) {
      m38DeductFundingSource(bill, Number(bill.actualPaid || 0));
      bill.deducted = true;
    }
    if (!bill.paid && bill.deducted) bill.deducted = false;
  });
}

function m18Escape(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function m18CategoryName(value) {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  return clean || "Other";
}

function m18DueTimestamp(bill) {
  if (!bill?.due) return Number.POSITIVE_INFINITY;
  const d = parseLocalDate(bill.due);
  return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
}

function m18BillStatus(bill) {
  if (bill.paid) return { label:"Paid", cls:"paid", rank:5 };
  if (!bill.included) return { label:"Excluded", cls:"excluded", rank:4 };
  if (!bill.due) return { label:"No date", cls:"no-date", rank:3 };
  const days = getDaysLeft(bill.due);
  if (days < 0) return { label:"Overdue", cls:"overdue", rank:0 };
  if (days === 0) return { label:"Due today", cls:"due-today", rank:1 };
  if (days <= 7) return { label:"Due soon", cls:"due-soon", rank:2 };
  return { label:"Planned", cls:"planned", rank:3 };
}


function m20AddRecurrence(dateValue, recurrence) {
  const d = parseLocalDate(dateValue);
  if (!dateValue || Number.isNaN(d.getTime())) return null;
  const next = new Date(d);

  if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "fortnightly") next.setDate(next.getDate() + 14);
  else if (recurrence === "four-weekly") next.setDate(next.getDate() + 28);
  else if (recurrence === "yearly") next.setFullYear(next.getFullYear() + 1);
  else {
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  return next;
}
function m20DateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function m20NextRollLabel(bill) {
  if (!bill?.due) return "No date";
  if (bill.recurrence === "none") return "One-off";
  const next = m20AddRecurrence(bill.due, bill.recurrence || "monthly");
  return next ? next.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "—";
}

let m38SelectedBillId = null;
let m38UrgencyFilter = "before";
let m38CategoryFilter = "all";

function m38FundingSource(bill) {
  const existing = String(bill?.fundingSource || "").trim();
  if (existing) return existing;
  const notes = String(bill?.notes || "").toLocaleLowerCase("en-GB");
  const category = String(bill?.category || "").toLocaleLowerCase("en-GB");
  const pot = (plannerState.editablePots || []).find(item => {
    const name = String(item?.name || "").toLocaleLowerCase("en-GB");
    return name && (notes.includes(name) || category.includes(name.replace(/ pot$/,"")));
  });
  return pot ? String(pot.name) : (bill?.included === false ? "Current Account" : "Holding Pot");
}

function m38NormaliseBill(bill) {
  bill.name = String(bill?.name || "Unnamed bill");
  bill.due = String(bill?.due || "");
  bill.amount = Number(bill?.amount || 0);
  bill.actualPaid = Number(bill?.actualPaid || 0);
  bill.paid = Boolean(bill?.paid);
  bill.deducted = Boolean(bill?.deducted);
  bill.included = bill?.included !== false;
  bill.category = m18CategoryName(bill?.category);
  bill.notes = String(bill?.notes || "");
  bill.recurrence = String(bill?.recurrence || "monthly");
  bill.fundingSource = m38FundingSource(bill);
  return bill;
}

function m38Today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function m38FollowingPayday() {
  const p = getNextPaydayDate();
  const next = new Date(p); next.setDate(next.getDate() + 28); next.setHours(23,59,59,999); return next;
}
function m38Bucket(bill) {
  if (bill.paid) return "paid";
  if (!bill.due) return "later";
  const due = parseLocalDate(bill.due); if (Number.isNaN(due.getTime())) return "later";
  due.setHours(23,59,59,999);
  const payday = getNextPaydayDate(); payday.setHours(23,59,59,999);
  if (due <= payday) return "before";
  if (due <= m38FollowingPayday()) return "next";
  return "later";
}
function m38DaysText(bill) {
  if (!bill.due) return "Date not set";
  const days = getDaysLeft(bill.due);
  if (days === null) return "Date not set";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days)===1?"":"s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
function m38CardClass(bill) {
  if (bill.paid) return "paid";
  if (!bill.included) return "excluded";
  const days = bill.due ? getDaysLeft(bill.due) : null;
  if (days !== null && days < 0) return "overdue";
  if (days !== null && days <= 7) return "soon";
  return "planned";
}
function m38StatusLabel(bill) {
  const cls = m38CardClass(bill);
  return cls === "paid" ? "Paid" : cls === "overdue" ? "Overdue" : cls === "soon" ? "Due soon" : cls === "excluded" ? "Not protected" : "Planned";
}
function m38BillIcon(bill) {
  const text = `${bill?.category||""} ${bill?.name||""}`.toLocaleLowerCase("en-GB");
  if (/house|home|council|water|energy|broadband|boiler/.test(text)) return "⌂";
  if (/car|mot|insurance|petrol|vehicle/.test(text)) return "🚗";
  if (/dent/.test(text)) return "✚";
  if (/football|coventry|ticket|season/.test(text)) return "⚽";
  if (/subscription|playstation|apple|amazon|chatgpt|vodafone|tv/.test(text)) return "◉";
  if (/repay|flex|loan|credit/.test(text)) return "↘";
  if (/holiday|travel/.test(text)) return "✈";
  return "£";
}
function m38FundingOptions(selected) {
  const values = ["Holding Pot","Current Account",...(plannerState.editablePots||[]).map(p=>String(p.name||"")).filter(Boolean)];
  return [...new Set(values)].map(value=>`<option value="${m18Escape(value)}" ${value===selected?"selected":""}>${m18Escape(value)}</option>`).join("");
}
function m38RecurrenceLabel(value) {
  return ({none:"One-off",weekly:"Weekly",fortnightly:"Fortnightly","four-weekly":"Every 4 weeks",monthly:"Monthly",yearly:"Yearly"})[value] || "Monthly";
}
function m38SelectedBill() {
  return (plannerState.scheduledBills || []).find(bill => String(bill.id) === String(m38SelectedBillId)) || null;
}
function m38SelectFallback(items) {
  if (!items.length) return;
  const visible = items.some(item => String(item.bill.id) === String(m38SelectedBillId));
  if (!visible) m38SelectedBillId = items[0].bill.id;
}

function m38RenderInspector() {
  const host = document.getElementById("m38BillInspector");
  if (!host) return;
  const bill = m38SelectedBill();
  if (!bill) {
    host.innerHTML = `<div class="m38-inspector-empty"><div class="m38-empty-orb">£</div><h3>Select a payment</h3><p>Choose a bill from the timeline to inspect its funding and edit the plan.</p></div>`;
    return;
  }
  const index = plannerState.scheduledBills.indexOf(bill);
  const statusClass = m38CardClass(bill);
  const next = bill.recurrence === "none" ? "Moves to history after payment" : `Next date: ${m20NextRollLabel(bill)}`;
  const paydayImpact = bill.included ? Number(bill.amount||0) : 0;
  host.innerHTML = `
    <div class="m38-inspector-title">
      <div><span class="m38-panel-kicker">BILL FUNDING INSPECTOR</span><h3>${m18Escape(bill.name)}</h3><p>${m38DaysText(bill)} • ${m38RecurrenceLabel(bill.recurrence)}</p></div>
      <span class="m38-status-chip ${statusClass}">${m38StatusLabel(bill)}</span>
    </div>
    <div class="m38-inspector-form">
      <div class="m38-form-grid">
        <div class="m38-field full"><label for="m38Name">Bill name</label><input id="m38Name" type="text" value="${m18Escape(bill.name)}" data-section="scheduled" data-index="${index}" data-field="name"></div>
        <div class="m38-field"><label for="m38Due">Due date</label><input id="m38Due" type="date" value="${m18Escape(bill.due)}" data-section="scheduled" data-index="${index}" data-field="due"></div>
        <div class="m38-field"><label for="m38Amount">Planned amount</label><input id="m38Amount" type="number" min="0" step="0.01" value="${Number(bill.amount||0)}" data-section="scheduled" data-index="${index}" data-field="amount"></div>
        <div class="m38-field"><label for="m38Category">Category</label><input id="m38Category" type="text" value="${m18Escape(bill.category)}" data-section="scheduled" data-index="${index}" data-field="category"></div>
        <div class="m38-field"><label for="m38Frequency">Frequency</label><select id="m38Frequency" data-section="scheduled" data-index="${index}" data-field="recurrence">
          <option value="none" ${bill.recurrence==="none"?"selected":""}>One-off</option><option value="weekly" ${bill.recurrence==="weekly"?"selected":""}>Weekly</option><option value="fortnightly" ${bill.recurrence==="fortnightly"?"selected":""}>Fortnightly</option><option value="four-weekly" ${bill.recurrence==="four-weekly"?"selected":""}>Every 4 weeks</option><option value="monthly" ${bill.recurrence==="monthly"?"selected":""}>Monthly</option><option value="yearly" ${bill.recurrence==="yearly"?"selected":""}>Yearly</option>
        </select></div>
        <div class="m38-field full"><label for="m38FundingSource">Funding source</label><select id="m38FundingSource" data-section="scheduled" data-index="${index}" data-field="fundingSource">${m38FundingOptions(bill.fundingSource)}</select></div>
        <div class="m38-field"><label for="m38ActualPaid">Actual payment</label><input id="m38ActualPaid" type="number" min="0" step="0.01" value="${Number(bill.actualPaid||0)}" placeholder="Defaults to planned" data-section="scheduled" data-index="${index}" data-field="actualPaid"></div>
        <div class="m38-field"><label>Completion rule</label><input type="text" value="${m18Escape(next)}" disabled></div>
        <div class="m38-field full"><label for="m38Notes">Funding note</label><textarea id="m38Notes" rows="3" placeholder="Example: Covered by Dentist Pot — exclude from Holding Pot contribution." data-section="scheduled" data-index="${index}" data-field="notes">${m18Escape(bill.notes)}</textarea></div>
      </div>
      <div class="m38-switch-row">
        <div class="m38-switch-copy"><b>Include in Holding Pot contribution</b><span>Aurora protects this amount in the payday calculation when enabled.</span></div>
        <label class="m38-switch"><input type="checkbox" ${bill.included?"checked":""} data-section="scheduled" data-index="${index}" data-field="included"><i></i></label>
      </div>
      <div class="m38-funding-readout">
        <div><span>Funding source</span><b>${m18Escape(bill.fundingSource)}</b></div>
        <div><span>Payday impact</span><b>£${formatMoney(paydayImpact)}</b></div>
        <div><span>Next action</span><b>${bill.paid?"Finish record":"Complete payment"}</b></div>
      </div>
      <div class="m38-action-row">
        <button type="button" class="m38-complete-btn" data-m38-complete="${index}">${bill.recurrence==="none"?"Complete & archive":"Complete & schedule next"}</button>
        <button type="button" class="m38-delete-bill" data-delete-section="scheduled" data-delete-index="${index}">Delete</button>
      </div>
      <p class="m38-action-note">Completing a payment deducts the actual amount from its chosen tracked pot. Current Account payments are recorded without changing the Holding Pot.</p>
    </div>`;
}

function renderScheduledBills() {
  const host = document.getElementById("m18DynamicBillGroups");
  if (!host) return;
  plannerState.scheduledBills = (plannerState.scheduledBills || []).map(m38NormaliseBill);
  const indexed = plannerState.scheduledBills.map((bill,index)=>({bill,index}));
  document.querySelectorAll("[data-m38-urgency]").forEach(button => button.classList.toggle("active", button.dataset.m38Urgency === m38UrgencyFilter));
  const categories = [...new Set(indexed.map(item=>m18CategoryName(item.bill.category)))].sort((a,b)=>a.localeCompare(b,"en-GB"));
  const categoryHost = document.getElementById("m38CategoryFilters");
  if (categoryHost) categoryHost.innerHTML = ["all",...categories].map(category => {
    const label = category === "all" ? "All" : category;
    return `<button type="button" data-m38-category="${m18Escape(category)}" class="${m38CategoryFilter===category?"active":""}">${m18Escape(label)}</button>`;
  }).join("");

  let filtered = indexed.filter(item => (m38UrgencyFilter === "all" || m38Bucket(item.bill) === m38UrgencyFilter));
  if (m38CategoryFilter !== "all") filtered = filtered.filter(item => m18CategoryName(item.bill.category) === m38CategoryFilter);
  filtered.sort((a,b)=>{
    const ar = a.bill.paid ? 2 : (a.bill.included ? 0 : 1), br = b.bill.paid ? 2 : (b.bill.included ? 0 : 1);
    return ar-br || m18DueTimestamp(a.bill)-m18DueTimestamp(b.bill) || String(a.bill.name).localeCompare(String(b.bill.name),"en-GB");
  });
  m38SelectFallback(filtered);
  const queueCount = document.getElementById("m38QueueCount");
  if (queueCount) queueCount.textContent = `${filtered.length} bill${filtered.length===1?"":"s"}`;

  if (!filtered.length) {
    host.innerHTML = `<div class="m38-timeline-empty"><div><b>No payments in this view</b>Try another timing or category filter, or add a confirmed bill.</div></div>`;
    m38RenderInspector();
    return;
  }
  host.innerHTML = filtered.map(({bill,index})=>{
    const cls = m38CardClass(bill), selected = String(bill.id)===String(m38SelectedBillId);
    const source = m38FundingSource(bill);
    return `<article class="m38-bill-card ${cls} ${selected?"selected":""}" data-m38-select="${m18Escape(bill.id)}">
      <div class="m38-bill-icon">${m38BillIcon(bill)}</div>
      <div class="m38-bill-main">
        <div class="m38-bill-title-row"><b>${m18Escape(bill.name)}</b><span class="m38-status-chip ${cls}">${m38StatusLabel(bill)}</span></div>
        <div class="m38-bill-meta"><span>▣ ${bill.due?dateLabel(bill.due):"No date"}</span><span>↻ ${m38RecurrenceLabel(bill.recurrence)}</span><span class="m38-source-tag">● ${m18Escape(source)}</span><span class="${bill.included?"m38-protected-tag":"m38-unprotected-tag"}">${bill.included?"✓ Protected":"○ Not in contribution"}</span></div>
      </div>
      <div class="m38-bill-amount"><strong>£${formatMoney(bill.amount||0)}</strong><small>${m38DaysText(bill)}</small></div>
    </article>`;
  }).join("");
  m38RenderInspector();
}


function getScheduledGroupKey(bill) {
  return m18CategoryName(bill?.category).toLocaleLowerCase("en-GB");
}

function updateScheduledBillsCommander() {
  const bills = (plannerState.scheduledBills || []).map(m38NormaliseBill);
  const unpaid = bills.filter(bill=>!bill.paid);
  const payday = getNextPaydayDate(); payday.setHours(23,59,59,999);
  const today = m38Today();
  const next7 = new Date(today); next7.setDate(next7.getDate()+7); next7.setHours(23,59,59,999);
  const dueBefore = unpaid.filter(bill=>{
    if(!bill.due) return false; const due=parseLocalDate(bill.due); if(Number.isNaN(due.getTime())) return false; due.setHours(23,59,59,999); return due<=payday;
  });
  const dueSoon = unpaid.filter(bill=>{
    if(!bill.due) return false; const due=parseLocalDate(bill.due); if(Number.isNaN(due.getTime())) return false; due.setHours(23,59,59,999); return due<=next7;
  });
  const protectedBefore = dueBefore.filter(bill=>bill.included && m38FundingSource(bill)==="Holding Pot");
  const beforeTotal = dueBefore.reduce((sum,bill)=>sum+Number(bill.amount||0),0);
  const soonTotal = dueSoon.reduce((sum,bill)=>sum+Number(bill.amount||0),0);
  const protectedTotal = protectedBefore.reduce((sum,bill)=>sum+Number(bill.amount||0),0);
  const holding = Number(plannerState.holdingBalance||0);
  const minimum = Number(plannerState.minimumBuffer||0);
  const topUp = Math.max(0, protectedTotal + minimum - holding);
  const nextBill = unpaid.filter(b=>b.due).sort((a,b)=>m18DueTimestamp(a)-m18DueTimestamp(b))[0];
  setText("scheduledBeforePayday",`£${formatMoney(beforeTotal)}`);
  setText("scheduledBeforePaydayMeta",`${dueBefore.length} payment${dueBefore.length===1?"":"s"} before ${payday.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`);
  setText("scheduledDueSoon",`£${formatMoney(soonTotal)}`);
  setText("scheduledDueSoonMeta",dueSoon.length?`${dueSoon.length} payment${dueSoon.length===1?"":"s"} need attention`:"No immediate pressure");
  setText("scheduledProtectionNeeded",`£${formatMoney(topUp)}`);
  setText("scheduledFundingStatus",topUp>0?"Top-up needed":protectedTotal?"Protected":"Clear");
  setText("scheduledFundingStatusMeta",topUp>0?`Add £${formatMoney(topUp)} to protect selected bills`:protectedTotal?`£${formatMoney(protectedTotal)} protected through Holding Pot`:"No Holding Pot bills before payday");
  setText("scheduledLiveCount",unpaid.filter(b=>b.included).length);
  setText("scheduledLiveTotal",`£${formatMoney(unpaid.filter(b=>b.included).reduce((s,b)=>s+Number(b.amount||0),0))}`);
  setText("scheduledNextBill",nextBill?nextBill.name:"Clear");
  setText("scheduledNextBillMeta",nextBill?`${m38DaysText(nextBill)} • £${formatMoney(nextBill.amount||0)}`:"No live scheduled pressure");
  const protectionTile=document.getElementById("scheduledProtectionTile"), fundingTile=document.getElementById("scheduledFundingTile");
  if(protectionTile){protectionTile.classList.toggle("risk",topUp>0);protectionTile.classList.toggle("good",topUp===0)}
  if(fundingTile){fundingTile.classList.toggle("risk",topUp>0);fundingTile.classList.toggle("good",topUp===0)}
}

function renderArchivedBills() {
  const host = document.getElementById("archivedBillsBody");
  const countEl = document.getElementById("archivedBillsCount");
  if (!host) return;
  const items = plannerState.archivedBills || [];
  if (countEl) countEl.textContent = String(items.length);
  if (!items.length) { host.innerHTML = '<div class="m38-history-empty">No completed bill records yet.</div>'; return; }
  host.innerHTML = items.map((bill,index)=>`<article class="m38-history-card">
    <div><b>${m18Escape(bill.name||"Completed bill")}</b><p>${bill.due?dateLabel(bill.due):"No due date"} • ${m18Escape(bill.category||"Other")} • ${m18Escape(bill.fundingSource||"Holding Pot")}</p></div>
    <strong>£${formatMoney(bill.actualPaid||bill.amount||0)}</strong>
    <button class="delete-btn" type="button" data-delete-section="archived" data-delete-index="${index}">Delete record</button>
  </article>`).join("");
}


function renderFutureCosts() {
  const body = document.getElementById("futureCostsBody");
  if (!body) return;
  body.innerHTML = "";

  plannerState.futureCosts.forEach((bill, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="table-input" type="text" value="${bill.name || ""}" data-section="future" data-index="${index}" data-field="name"></td>
      <td><input class="table-input" type="date" value="${bill.due || ""}" data-section="future" data-index="${index}" data-field="due"></td>
      <td><input class="table-input" type="number" step="0.01" value="${bill.amount}" data-section="future" data-index="${index}" data-field="amount"></td>
      <td><div class="check-wrap"><input type="checkbox" ${bill.included ? "checked" : ""} data-section="future" data-index="${index}" data-field="included"><span>${bill.included ? "Yes" : "No"}</span></div></td>
      <td><input class="table-input" type="text" value="${bill.category || ""}" data-section="future" data-index="${index}" data-field="category"></td>
      <td class="m28-note-cell"><label class="m28-notes-label" for="m28FutureNote_${index}">Funding note</label><textarea id="m28FutureNote_${index}" class="m28-notes-textarea" rows="3" placeholder="State which pot covers this cost, or why it is excluded." data-section="future" data-index="${index}" data-field="notes">${m18Escape(bill.notes)}</textarea></td>
      <td><button class="quick-btn" type="button" data-convert-future="${index}">Convert to bill</button></td>
      <td><button class="delete-btn" data-delete-section="future" data-delete-index="${index}">Delete</button></td>
    `;
    body.appendChild(tr);
  });
}

function renderRecurringCosts() {
  const body = document.getElementById("recurringCostsBody");
  if (!body) return;
  body.innerHTML = "";

  plannerState.recurringCosts.forEach((cost, index) => {
    const monthly = Number(cost.amount || 0);
    const spent = Number(cost.spentThisCycle || 0);
    const yearly = monthly * 12;
    const remaining = Math.max(0, monthly - spent);
    const spentClass = spent > monthly && monthly > 0 ? "over" : (spent >= monthly && monthly > 0 ? "complete" : "");
    const tr = document.createElement("tr");
    if (spent > monthly && monthly > 0) tr.classList.add("m19-over-budget");
    tr.innerHTML = `
      <td><input class="table-input" type="text" value="${m18Escape(cost.name)}" data-section="recurring" data-index="${index}" data-field="name"></td>
      <td><input class="table-input" type="number" step="0.01" value="${monthly}" data-section="recurring" data-index="${index}" data-field="amount"></td>
      <td><span class="m19-spent ${spentClass}">£${formatMoney(spent)} / £${formatMoney(monthly)}${remaining > 0 ? ` • £${formatMoney(remaining)} left` : ""}</span></td>
      <td><input class="table-input m19-pay-input" type="number" min="0" step="0.01" value="${Number(cost.payAmount ?? monthly)}" data-section="recurring" data-index="${index}" data-field="payAmount"></td>
      <td><button class="m19-pay-btn" type="button" data-m19-pay="${index}">Pay from Holding Pot</button></td>
      <td><span class="recurring-yearly" data-yearly-index="${index}">£${formatMoney(yearly)}</span></td>
      <td><div class="check-wrap"><input type="checkbox" ${cost.included ? "checked" : ""} data-section="recurring" data-index="${index}" data-field="included"><span>${cost.included ? "Yes" : "No"}</span></div></td>
      <td><input class="table-input" type="text" value="${m18Escape(cost.category)}" data-section="recurring" data-index="${index}" data-field="category"></td>
      <td>${cost.lastPaidDate ? new Date(cost.lastPaidDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
      <td><button class="m19-reset-btn" type="button" data-m19-reset="${index}">Reset</button></td>
      <td><button class="delete-btn" data-delete-section="recurring" data-delete-index="${index}">Delete</button></td>
    `;
    body.appendChild(tr);
  });
}

function m21ShowYearlyStatus(message, isError = false) {
  const box = document.getElementById("m21YearlyStatus");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("error", Boolean(isError));
  box.classList.add("show");
  clearTimeout(window.m21YearlyStatusTimer);
  window.m21YearlyStatusTimer = setTimeout(() => box.classList.remove("show"), 5200);
}

function processYearlyAutoRenewals() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  plannerState.yearlyRecurringCosts = normaliseYearlyRecurringCosts(plannerState.yearlyRecurringCosts);
  plannerState.yearlyRecurringCosts.forEach(cost => {
    if (!cost.paid || !cost.nextRenewalDue) return;
    const renewal = parseLocalDate(cost.nextRenewalDue);
    if (Number.isNaN(renewal.getTime()) || renewal > today) return;

    cost.due = cost.nextRenewalDue;
    cost.paid = false;
    cost.deducted = false;
    cost.paidAmount = 0;
    cost.lastPaidDate = "";
    cost.nextRenewalDue = m21NextRenewalDate(cost.due);
  });
}

function handleYearlyRecurringPaid(e) {
  const input = e.target.closest("[data-m21-paid]");
  if (!input) return;
  const index = Number(input.dataset.m21Paid);
  const cost = plannerState.yearlyRecurringCosts[index];
  if (!cost || !Number.isFinite(index)) return;

  if (!input.checked) {
    input.checked = Boolean(cost.paid);
    return;
  }

  if (!cost.due) {
    input.checked = false;
    m21ShowYearlyStatus("Add the annual due date before marking this cost as paid.", true);
    return;
  }

  const amount = Math.max(0, Number(cost.amount || 0));
  if (amount <= 0) {
    input.checked = false;
    m21ShowYearlyStatus("Enter the yearly amount before marking this cost as paid.", true);
    return;
  }

  const holding = Number(plannerState.holdingBalance || 0);
  if (amount > holding) {
    input.checked = false;
    m21ShowYearlyStatus(`Holding Pot is £${formatMoney(holding)}. Add funds before deducting £${formatMoney(amount)}.`, true);
    return;
  }

  if (!cost.deducted) {
    plannerState.holdingBalance = holding - amount;
    cost.paidAmount = amount;
    cost.deducted = true;
  }
  cost.paid = true;
  cost.lastPaidDate = new Date().toISOString();
  cost.nextRenewalDue = m21NextRenewalDate(cost.due, true);

  const holdingInput = document.getElementById("holdingBalanceInput");
  if (holdingInput) holdingInput.value = Number(plannerState.holdingBalance).toFixed(2);

  savePlannerData();
  m21ShowYearlyStatus(`${cost.name || "Yearly cost"} marked paid. £${formatMoney(amount)} deducted from the Holding Pot.`);
  runPlanner();
}

function handleYearlyRecurringUndo(e) {
  const btn = e.target.closest("[data-m21-undo]");
  if (!btn) return;
  const index = Number(btn.dataset.m21Undo);
  const cost = plannerState.yearlyRecurringCosts[index];
  if (!cost || !Number.isFinite(index) || !cost.deducted) return;

  const refund = Math.max(0, Number(cost.paidAmount || cost.amount || 0));
  plannerState.holdingBalance = Number(plannerState.holdingBalance || 0) + refund;
  cost.paid = false;
  cost.deducted = false;
  cost.paidAmount = 0;
  cost.lastPaidDate = "";
  cost.nextRenewalDue = m21NextRenewalDate(cost.due);

  const holdingInput = document.getElementById("holdingBalanceInput");
  if (holdingInput) holdingInput.value = Number(plannerState.holdingBalance).toFixed(2);

  savePlannerData();
  m21ShowYearlyStatus(`${cost.name || "Yearly cost"} payment was undone. £${formatMoney(refund)} returned to the Holding Pot.`);
  runPlanner();
}

function renderYearlyRecurringCosts() {
  const body = document.getElementById("yearlyRecurringCostsBody");
  if (!body) return;
  body.innerHTML = "";

  plannerState.yearlyRecurringCosts = normaliseYearlyRecurringCosts(plannerState.yearlyRecurringCosts);

  plannerState.yearlyRecurringCosts.forEach((cost, index) => {
    const daysLeft = cost.due ? getDaysLeft(cost.due) : null;
    const rowClass = cost.paid
      ? "m21-yearly-row-paid"
      : (daysLeft !== null && daysLeft < 0)
        ? "m21-yearly-row-overdue"
        : (daysLeft !== null && daysLeft <= 30)
          ? "m21-yearly-row-due-soon"
          : "";
    const locked = cost.paid && cost.deducted;
    const renewal = cost.nextRenewalDue || m21NextRenewalDate(cost.due);
    const paidDate = cost.lastPaidDate
      ? new Date(cost.lastPaidDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
      : "";

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.innerHTML = `
      <td><input class="table-input" type="text" value="${m18Escape(cost.name)}" data-section="yearlyRecurring" data-index="${index}" data-field="name"></td>
      <td><input class="table-input" type="date" value="${m18Escape(cost.due)}" data-section="yearlyRecurring" data-index="${index}" data-field="due" ${locked ? "disabled" : ""}></td>
      <td><input class="table-input" type="number" min="0" step="0.01" value="${Number(cost.amount || 0)}" data-section="yearlyRecurring" data-index="${index}" data-field="amount" ${locked ? "disabled" : ""}></td>
      <td>
        <div class="m21-paid-wrap">
          <input class="m21-paid-check" type="checkbox" data-m21-paid="${index}" ${cost.paid ? "checked disabled" : ""}>
          <span class="m21-paid-label ${cost.paid ? "done" : ""}">${cost.paid ? "✅ Paid" : "Mark paid"}</span>
        </div>
      </td>
      <td>
        <div class="m21-payment-record">
          ${cost.deducted
            ? `<span class="m21-payment-pill">−£${formatMoney(cost.paidAmount || cost.amount)} • ${paidDate || "recorded"}</span><button class="m21-undo-btn" type="button" data-m21-undo="${index}">Undo payment</button>`
            : `<span class="m21-payment-pending">Not deducted yet</span>`}
        </div>
      </td>
      <td><span class="m21-renewal-pill">${renewal ? dateLabel(renewal) : "Add due date"}</span></td>
      <td><div class="check-wrap"><input type="checkbox" ${cost.included ? "checked" : ""} data-section="yearlyRecurring" data-index="${index}" data-field="included"><span>${cost.included ? "Yes" : "No"}</span></div></td>
      <td><input class="table-input" type="text" value="${m18Escape(cost.category)}" data-section="yearlyRecurring" data-index="${index}" data-field="category"></td>
      <td class="m28-note-cell"><label class="m28-notes-label" for="m28YearlyNote_${index}">Funding note</label><textarea id="m28YearlyNote_${index}" class="m28-notes-textarea" rows="3" placeholder="Example: Fully covered by a named Monzo pot." data-section="yearlyRecurring" data-index="${index}" data-field="notes">${m18Escape(cost.notes || "")}</textarea></td>
      <td><button class="delete-btn" data-delete-section="yearlyRecurring" data-delete-index="${index}">Delete</button></td>
    `;
    body.appendChild(tr);
  });
}

function m21CombinedDatedBills() {
  const scheduled = (plannerState.scheduledBills || []).filter(item => item && item.included && !item.paid);
  const seen = new Set(scheduled.map(item => `${String(item.name || "").trim().toLowerCase()}|${item.due || ""}`));
  const yearly = (plannerState.yearlyRecurringCosts || [])
    .filter(item => item && item.included && !item.paid)
    .filter(item => {
      const key = `${String(item.name || "").trim().toLowerCase()}|${item.due || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({ ...item, _sourceLabel: "Yearly recurring cost" }));
  return [...scheduled, ...yearly];
}

function renderNext7DaysBills(bills) {
  const grid = document.getElementById("next7DaysGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const next7 = [...bills]
    .filter(x => x.included && !x.paid && x.due)
    .filter(x => {
      const left = getDaysLeft(x.due);
      return left !== null && left >= 0 && left <= 7;
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  if (!next7.length) {
    const card = document.createElement("div");
    card.className = "next-bill-box";
    card.innerHTML = `
      <div class="next-bill-title">No bills due in the next 7 days</div>
      <div class="subv">Short-term pressure is currently clear.</div>
    `;
    grid.appendChild(card);
    setText("next7BillsMeta", "No short-term bill pressure");
    setText("next7BillsTotal", "£0 due in next 7 days");
    return;
  }

  next7.forEach(item => {
    const left = getDaysLeft(item.due);
    const card = document.createElement("div");
    card.className = "next-bill-box";
    card.innerHTML = `
      <div class="next-bill-title">${item.name}</div>
      <div class="subv">${dateLabel(item.due)} • £${formatMoney(item.amount)}</div>
      <div class="subv ${left <= 3 ? "risk" : "watch"}">${left} days left • ${item.category}${item._sourceLabel ? ` • ${item._sourceLabel}` : ""}</div>
    `;
    grid.appendChild(card);
  });

  const total = next7.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  setText("next7BillsMeta", `${next7.length} bill(s) coming up soon`);
  setText("next7BillsTotal", `£${formatMoney(total)} due in next 7 days`);
}

function renderCategoryBreakdown(categoryTotals) {
  const grid = document.getElementById("categoryGrid");
  if (!grid) return;
  grid.innerHTML = "";

  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, total]) => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.innerHTML = `
        <div class="category-title">${name}</div>
        <div class="stat small">£${formatMoney(total)}</div>
        <div class="subv">£${formatMoney(weeklyFromYearly(total))}/week • £${formatMoney(monthlyFromYearly(total))}/month</div>
      `;
      grid.appendChild(card);
    });
}

function renderYearlyTable(rows) {
  const body = document.getElementById("yearlyTableBody");
  if (!body) return;
  body.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>£${formatMoney(row.yearly)}</td>
      <td>£${formatMoney(weeklyFromYearly(row.yearly))}</td>
      <td>£${formatMoney(monthlyFromYearly(row.yearly))}</td>
      <td>${row.notes}</td>
    `;
    body.appendChild(tr);
  });
}

function calculateMonthlyAdjustments() {
  const rows = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let runningBalance = Number(plannerState.holdingBalance || 0);

  function countPaydaysInMonth(year, month) {
    let count = 0;
    const checkDate = new Date(FIRST_PAYDAY);
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 24; i++) {
      if (checkDate.getFullYear() === year && checkDate.getMonth() === month) {
        count++;
      }
      checkDate.setDate(checkDate.getDate() + 28);
    }

    return count;
  }

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const monthLabel = monthDate.toLocaleString("en-GB", {
      month: "short",
      year: "numeric"
    });

    const paydaysThisMonth = countPaydaysInMonth(year, month);
    const monthContribution = paydaysThisMonth * Number(plannerState.paydayContribution || 0);

    runningBalance += monthContribution;

    const scheduledTotal = plannerState.scheduledBills
      .filter(b => {
        if (!b.included || !b.due || b.paid) return false;
        const d = new Date(b.due);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const futureTotal = plannerState.futureCosts
      .filter(b => {
        if (!b.included || !b.due) return false;
        const d = new Date(b.due);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const recurringMonthlyTotal = plannerState.recurringCosts
      .filter(c => c.included)
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const yearlyRecurringMonthlyShare = plannerState.yearlyRecurringCosts
      .filter(c => c.included)
      .reduce((sum, c) => sum + (Number(c.amount || 0) / 12), 0);

    const monthTotal = scheduledTotal + futureTotal + recurringMonthlyTotal + yearlyRecurringMonthlyShare;
    runningBalance -= monthTotal;

    const minRequired = Number(plannerState.minimumBuffer || 0);

    let adjustment = 0;
    let status = "OK";

    if (runningBalance < minRequired) {
      adjustment = Math.ceil((minRequired - runningBalance) / 3);
      status = "Increase";
    } else if (runningBalance > minRequired + 300) {
      adjustment = Math.floor((runningBalance - (minRequired + 300)) / 3);
      status = "Reduce";
    }

    rows.push({
      month: monthLabel,
      balance: runningBalance,
      min: minRequired,
      adjustment,
      status
    });
  }

  return rows;
}

function renderContributionTable() {
  const body = document.getElementById("contributionTableBody");
  if (!body) return;

  body.innerHTML = "";
  const rows = calculateMonthlyAdjustments();

  rows.forEach(r => {
    const tr = document.createElement("tr");
    const adjText = r.adjustment > 0
      ? (r.status === "Increase" ? `+£${r.adjustment}` : `-£${r.adjustment}`)
      : "—";

    tr.innerHTML = `
      <td>${r.month}</td>
      <td>£${formatMoney(r.balance)}</td>
      <td>£${formatMoney(r.min)}</td>
      <td>${adjText}</td>
      <td class="${r.status === "Increase" ? "risk" : r.status === "Reduce" ? "good" : "neutral"}">${r.status}</td>
    `;
    body.appendChild(tr);
  });
}

function updatePlannerTotals() {
  plannerState.holdingBalance = parseNum(document.getElementById("holdingBalanceInput")?.value);
  plannerState.paydayContribution = parseNum(getContributionInput()?.value);
  plannerState.minimumBuffer = parseNum(document.getElementById("minimumBufferInput")?.value);
  plannerState.growPotBalance = parseNum(document.getElementById("growPotBalanceInput")?.value);
  plannerState.growPotTarget = parseNum(document.getElementById("growPotTargetInput")?.value) || GROW_POT_TARGET;

  const includedScheduled = plannerState.scheduledBills.filter(x => x.included);
  const includedFuture = plannerState.futureCosts.filter(x => x.included);
  const includedRecurring = plannerState.recurringCosts.filter(x => x.included);
  const includedYearlyRecurring = plannerState.yearlyRecurringCosts.filter(x => x.included);

  const scheduledIncludedTotal = includedScheduled.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const futureIncludedTotal = includedFuture.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const recurringIncludedTotal = includedRecurring.reduce((sum, x) => sum + (Number(x.amount || 0) * 12), 0);
  const yearlyRecurringTotal = includedYearlyRecurring.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const includedGrandTotal = scheduledIncludedTotal + futureIncludedTotal + recurringIncludedTotal + yearlyRecurringTotal;

  const unpaidScheduled = includedScheduled.filter(x => !x.paid);
  const unpaidScheduledTotal = unpaidScheduled.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const scheduledKeys = new Set(unpaidScheduled.map(x => `${String(x.name || "").trim().toLowerCase()}|${x.due || ""}`));
  const unpaidYearlyRecurring = includedYearlyRecurring
    .filter(x => !x.paid)
    .filter(x => !scheduledKeys.has(`${String(x.name || "").trim().toLowerCase()}|${x.due || ""}`));
  const unpaidYearlyRecurringTotal = unpaidYearlyRecurring.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const unpaidProtectedTotal = unpaidScheduledTotal + unpaidYearlyRecurringTotal;

  const actualPaidScheduledTotal = includedScheduled
    .filter(x => x.paid)
    .reduce((sum, x) => sum + Number(x.actualPaid || 0), 0);

  const plannedPaidScheduledTotal = includedScheduled
    .filter(x => x.paid)
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  let recurringReleased = 0;
  includedRecurring.forEach(x => {
    const original = Number(x.originalAmount ?? x.amount ?? 0);
    const current = Number(x.amount || 0);
    if (current < original) {
      recurringReleased += (original - current) * 12;
    }
  });

  const releasedSurplus =
    Math.max(0, plannedPaidScheduledTotal - actualPaidScheduledTotal) +
    Math.max(0, recurringReleased);

  const next7DayBillsList = [...unpaidScheduled, ...unpaidYearlyRecurring]
    .filter(x => x.due)
    .filter(x => {
      const diff = getDaysLeft(x.due);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  const next30DayBillsList = [...unpaidScheduled, ...unpaidYearlyRecurring]
    .filter(x => x.due)
    .filter(x => {
      const diff = getDaysLeft(x.due);
      return diff >= 0 && diff <= 30;
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  const next7DaysBills = next7DayBillsList.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const next30DaysBills = next30DayBillsList.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const recurringMonthlyTotal = includedRecurring.reduce((sum, x) => sum + Math.max(0, Number(x.amount || 0) - Number(x.spentThisCycle || 0)), 0);

  const protectedBase = plannerState.minimumBuffer;
  const protectedRecurringMonthly = recurringMonthlyTotal;
  const protectedMoney = protectedBase + unpaidProtectedTotal + protectedRecurringMonthly;
  const protectedNext30Cycle = next30DaysBills + protectedRecurringMonthly;

  const availableToInvest = Math.max(
    0,
    plannerState.holdingBalance - protectedBase - unpaidProtectedTotal - protectedRecurringMonthly + releasedSurplus
  );

  const safeToMoveNow = Math.max(
    0,
    plannerState.holdingBalance - protectedBase - protectedNext30Cycle + releasedSurplus
  );

  const trueSurplus = Math.max(0, safeToMoveNow);
  const freeAfterBuffer = Math.max(0, plannerState.holdingBalance - plannerState.minimumBuffer);
  const deficit = Math.max(0, includedGrandTotal - plannerState.holdingBalance - releasedSurplus);
  const payCycleTarget = deficit / 13;
  const currentPotOffset = Math.max(0, plannerState.holdingBalance - protectedMoney);
  const finalAmountToAdd = Math.max(0, payCycleTarget);

  const currentRateAnnual = plannerState.paydayContribution * 13;
  const monthlyTarget = deficit / 12;
  const weeklyTarget = deficit / 52;
  const surplusShortfall = currentRateAnnual - deficit;

  let pressureLevel = "Low";
  let pressureClass = "good";
  const totalNext7DaysPressure = next7DaysBills + recurringMonthlyTotal;

  if (totalNext7DaysPressure > 400) {
    pressureLevel = "High";
    pressureClass = "risk";
  } else if (totalNext7DaysPressure > 150) {
    pressureLevel = "Medium";
    pressureClass = "watch";
  }

  const categoryTotals = {};

  includedScheduled.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount || 0);
  });

  includedFuture.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount || 0);
  });

  includedRecurring.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + (Number(item.amount || 0) * 12);
  });

  includedYearlyRecurring.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount || 0);
  });

  setText("potBalance", formatMoney(plannerState.holdingBalance));
  setText("potBalanceMeta", `Minimum safe buffer: £${formatMoney0(plannerState.minimumBuffer)}`);

  setText("includedTotal", formatMoney(includedGrandTotal));
  setText("includedTotalMeta", `${includedScheduled.length} scheduled • ${includedFuture.length} future • ${includedRecurring.length} recurring • ${includedYearlyRecurring.length} yearly recurring active`);

  setText("availableToInvest", formatMoney(availableToInvest));
  setText("safeToMoveNow", formatMoney(safeToMoveNow));
  setText("safeToMoveNowMeta", protectedNext30Cycle > 0 ? `After protecting £${formatMoney(next30DaysBills)} due in next 30 days + £${formatMoney(protectedRecurringMonthly)} recurring monthly costs` : "No scheduled or recurring monthly costs protected");

  setText("pressureLevel", pressureLevel);
  setText("pressureMeta", `£${formatMoney(totalNext7DaysPressure)} in next 7 days • £${formatMoney(next30DaysBills)} in next 30 days • £${formatMoney(protectedRecurringMonthly)} recurring monthly`);

  const pressureCard = document.getElementById("pressureCard");
  if (pressureCard) {
    pressureCard.classList.remove("good", "watch", "risk");
    pressureCard.classList.add(pressureClass);
  }

  setText("releasedSurplus", formatMoney(releasedSurplus));
  setText("releasedSurplusMeta", releasedSurplus > 0
    ? `Paid bill savings: £${formatMoney(Math.max(0, plannedPaidScheduledTotal - actualPaidScheduledTotal))} • Recurring released: £${formatMoney(Math.max(0, recurringReleased))}`
    : "No surplus released from cheaper paid bills or reduced recurring costs yet"
  );

  setText("weeklyTarget", `£${formatMoney0(weeklyTarget)}`);
  setText("weeklyTargetMeta", `Based on £${formatMoney(deficit)} remaining deficit to fund`);
  setText("monthlyTarget", `£${formatMoney(monthlyTarget)}`);
  setText("currentRateAnnual", `£${formatMoney(currentRateAnnual)}`);
  setText("currentRateMeta", `£${formatMoney(plannerState.paydayContribution)}/payday • 13 paydays yearly`);

  const surplusEl = document.getElementById("surplusShortfall");
  if (surplusEl) {
    surplusEl.innerText = `${surplusShortfall >= 0 ? "+" : "-"}£${formatMoney(Math.abs(surplusShortfall))}`;
    surplusEl.classList.remove("good", "risk", "neutral");
    if (surplusShortfall > 0) surplusEl.classList.add("good");
    else if (surplusShortfall < 0) surplusEl.classList.add("risk");
    else surplusEl.classList.add("neutral");
  }

  setText("surplusShortfallMeta", surplusShortfall >= 0 ? "Funding ahead of target" : "Funding below target");

  setText("yearlyScheduled", `£${formatMoney(scheduledIncludedTotal)}`);
  setText("yearlyRecurring", `£${formatMoney(recurringIncludedTotal)}`);
  setText("yearlyFuture", `£${formatMoney(futureIncludedTotal)}`);
  setText("yearlyGrand", `£${formatMoney(includedGrandTotal)}`);

  setText("trueSurplus", formatMoney(trueSurplus));
  setText("trueSurplusMeta", trueSurplus > 0 ? "Money genuinely spare after short-term protection" : "No genuine spare money right now");

  setText("protectedMoney", formatMoney(protectedMoney));
  setText("protectedMoneyMeta", `£${formatMoney(plannerState.minimumBuffer)} buffer + £${formatMoney(unpaidProtectedTotal)} unpaid dated / annual bills + £${formatMoney(protectedRecurringMonthly)} recurring monthly`);

  setText("releaseSurplusCard", `£${formatMoney(releasedSurplus)}`);
  setText("protectedBillsCard", `£${formatMoney(unpaidProtectedTotal + protectedRecurringMonthly)}`);
  setText("safeSurplusCard", `£${formatMoney(safeToMoveNow)}`);
  setText("freeAfterBufferCard", `£${formatMoney(freeAfterBuffer)}`);

  setText("suggestedContributionNow", formatMoney(payCycleTarget));
  setText("suggestedContributionMeta", `Based on remaining planner gap across 13 paydays`);
  setText("currentPotOffset", formatMoney(currentPotOffset));
  setText("currentPotOffsetMeta", currentPotOffset > 0 ? "Already above protection level" : "No spare pot offset currently");
  setText("finalAmountToAdd", formatMoney(finalAmountToAdd));
  setText("finalAmountToAddMeta", finalAmountToAdd > 0 ? "This is the clean payday contribution guide" : "No extra top-up needed");

  const daysToPayday = getDaysToNextPayday();
  setText("nextPaydayLabel", getNextPaydayLabel());
  setText("nextPaydayMeta", `${daysToPayday} day(s) remaining`);
  setText("daysToPayday", daysToPayday);
  setText("daysToPaydayMeta", `Next payday on ${getNextPaydayLabel()}`);

  const growBalance = Number(plannerState.growPotBalance || 0);
  const growTarget = Number(plannerState.growPotTarget || GROW_POT_TARGET);
  const growGap = Math.max(0, growTarget - growBalance);
  const growProgress = growTarget > 0 ? Math.min(100, (growBalance / growTarget) * 100) : 0;

  let growStatus = "Building";
  let growClass = "watch";

  if (growBalance < 1000) {
    growStatus = "Priority Funding";
    growClass = "risk";
  } else if (growBalance < 3000) {
    growStatus = "Building Buffer";
    growClass = "watch";
  } else if (growBalance < growTarget) {
    growStatus = "Healthy";
    growClass = "good";
  } else {
    growStatus = "Target Reached";
    growClass = "good";
  }

  setText("growPotBalanceDisplay", formatMoney(growBalance));
  setText("growPotTargetDisplay", formatMoney(growTarget));
  setText("growPotGap", formatMoney(growGap));
  setText("growPotGapMeta", growGap > 0 ? "Amount still needed to hit target" : "Target fully reached");
  setText("growPotStatus", growStatus);
  setText("growPotStatusMeta", `Current progress: ${growProgress.toFixed(0)}%`);
  setText("growPotProgressMeta", `${growProgress.toFixed(0)}% of target reached`);

  const growPotStatusEl = document.getElementById("growPotStatus");
  if (growPotStatusEl) {
    growPotStatusEl.classList.remove("good", "watch", "risk", "neutral");
    growPotStatusEl.classList.add(growClass);
  }

  const growPotFill = document.getElementById("growPotFill");
  if (growPotFill) {
    growPotFill.style.width = `${growProgress}%`;
  }

  const growPotMove = growBalance < 1000 ? Math.min(100, Math.max(0, safeToMoveNow)) : 0;
  setText("finalPotTopUp", `£${formatMoney(finalAmountToAdd)}`);
  setText("finalPotTopUpMeta", finalAmountToAdd > 0 ? "Suggested contribution after current balance offset" : "Pot already covered");
  setText("growPotMove", `£${formatMoney(growPotMove)}`);
  setText("growPotMoveMeta", growPotMove > 0 ? "Suggested move to strengthen Grow Pot" : "No Grow Pot top-up suggested right now");

  const paydayActions = [];
  if (finalAmountToAdd > 0) paydayActions.push(`• Add £${formatMoney(finalAmountToAdd)} to the holding pot`);
  if (growPotMove > 0) paydayActions.push(`• Move £${formatMoney(growPotMove)} to Grow Pot`);
  if (safeToMoveNow > 0) paydayActions.push(`• Up to £${formatMoney(safeToMoveNow)} is safe to move if no new bills appear`);
  if (!paydayActions.length) paydayActions.push(`• No action needed right now — pot is covered`);

  const paydayActionsList = document.getElementById("paydayActionsList");
  if (paydayActionsList) {
    paydayActionsList.innerHTML = paydayActions.join("<br>");
  }

  let igSignal = "Hold";
  let igMeta = `Keep surplus in holding pot for now. Suggested per payday: £${formatMoney(payCycleTarget)}.`;

  if (
    releasedSurplus > 0 &&
    plannerState.holdingBalance - releasedSurplus >= plannerState.minimumBuffer &&
    (plannerState.holdingBalance - plannerState.minimumBuffer) >= (unpaidProtectedTotal + protectedRecurringMonthly)
  ) {
    igSignal = "Move Surplus";
    igMeta = `Safe to move up to £${formatMoney(releasedSurplus)} to IG ISA if you want. Suggested per payday: £${formatMoney(payCycleTarget)}.`;
  } else if (
    plannerState.holdingBalance >= (unpaidProtectedTotal + protectedRecurringMonthly + plannerState.minimumBuffer) &&
    surplusShortfall >= 0
  ) {
    igSignal = "Balanced";
    igMeta = `Holding pot is covering unpaid bills and minimum buffer. Suggested per payday: £${formatMoney(payCycleTarget)}.`;
  } else {
    igSignal = "Protect Pot";
    igMeta = `Do not skim to IG yet — holding pot still needs support. Suggested per payday: £${formatMoney(payCycleTarget)}.`;
  }

  setText("igSignal", igSignal);
  setText("igSignalMeta", igMeta);

  const igCard = document.getElementById("igCard");
  if (igCard) {
    igCard.classList.remove("good", "watch", "risk");
    if (igSignal === "Move Surplus") igCard.classList.add("good");
    else if (igSignal === "Balanced") igCard.classList.add("watch");
    else igCard.classList.add("risk");
  }

  const safeMoveCard = document.getElementById("safeMoveCard");
  if (safeMoveCard) {
    safeMoveCard.classList.remove("good", "watch", "risk");
    if (safeToMoveNow > 0) safeMoveCard.classList.add("good");
    else if (availableToInvest > 0) safeMoveCard.classList.add("watch");
    else safeMoveCard.classList.add("risk");
  }

  renderYearlyTable([
    { name: "Scheduled Bills Included", yearly: scheduledIncludedTotal, notes: `Unpaid scheduled remaining: £${formatMoney(unpaidScheduledTotal)} • unique yearly renewals awaiting payment: £${formatMoney(unpaidYearlyRecurringTotal)}` },
    { name: "Recurring Monthly Costs Included", yearly: recurringIncludedTotal, notes: "Monthly costs annualised" },
    { name: "Future Costs Included", yearly: futureIncludedTotal, notes: "Future items currently switched on" },
    { name: "Recurring Yearly Costs Included", yearly: yearlyRecurringTotal, notes: "Fixed annual costs" },
    { name: "Released Surplus", yearly: releasedSurplus, notes: "From actual paid being lower than planned" },
    { name: "Full Included Total", yearly: includedGrandTotal, notes: "Active planner scenario" }
  ]);

  renderCategoryBreakdown(categoryTotals);
  
renderNext7DaysBills(m21CombinedDatedBills());
  renderContributionTable();

  updateWealthCommandDeck({
    safeToMoveNow,
    next30DaysBills,
    finalAmountToAdd,
    protectedMoney,
    releasedSurplus,
    trueSurplus,
    availableToInvest,
    includedGrandTotal,
    unpaidScheduledTotal: unpaidProtectedTotal,
    protectedRecurringMonthly,
    protectedNext30Cycle
  });

  savePlannerData();
}

function handleTableEdit(e) {
  const target = e.target;
  const section = target.dataset.section;
  const index = Number(target.dataset.index);
  const field = target.dataset.field;

  if (!Number.isFinite(index) || !section || !field) return;

  let source = null;
  if (section === "scheduled") source = plannerState.scheduledBills;
  if (section === "future") source = plannerState.futureCosts;
  if (section === "recurring") source = plannerState.recurringCosts;
  if (section === "yearlyRecurring") source = plannerState.yearlyRecurringCosts;
  if (!source || !source[index]) return;

  if (field === "included" || field === "paid") {
    source[index][field] = target.checked;
    savePlannerData();
    runPlanner();
    return;
  }

  if (field === "amount" || field === "actualPaid" || field === "payAmount") {
    source[index][field] = parseNum(target.value);
  } else {
    source[index][field] = target.value;
  }

  if (section === "recurring" && field === "amount") {
    const yearlyEl = document.querySelector(`[data-yearly-index="${index}"]`);
    if (yearlyEl) {
      yearlyEl.innerText = `£${formatMoney(Number(source[index].amount || 0) * 12)}`;
    }
  }

  if (section === "yearlyRecurring" && field === "due") {
    source[index].nextRenewalDue = m21NextRenewalDate(source[index].due);
  }

  savePlannerData();
  if (section === "scheduled" && ["name","due","amount","actualPaid","category","recurrence","fundingSource","notes"].includes(field) && e.type === "change") {
    runPlanner();
    return;
  }
  if (section === "yearlyRecurring" && field === "due" && e.type === "change") {
    runPlanner();
    return;
  }
  updatePlannerTotals();
}

function handleDelete(e) {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;

  const section = btn.dataset.deleteSection;
  const index = Number(btn.dataset.deleteIndex);
  if (!Number.isFinite(index)) return;

  if (section === "scheduled") plannerState.scheduledBills.splice(index, 1);
  if (section === "future") plannerState.futureCosts.splice(index, 1);
  if (section === "recurring") plannerState.recurringCosts.splice(index, 1);
  if (section === "yearlyRecurring") plannerState.yearlyRecurringCosts.splice(index, 1);
  if (section === "archived") plannerState.archivedBills.splice(index, 1);

  savePlannerData();
  runPlanner();
}

function handleArchive(e) {
  const btn = e.target.closest("[data-archive-section]");
  if (!btn) return;

  const section = btn.dataset.archiveSection;
  const index = Number(btn.dataset.archiveIndex);
  if (section !== "scheduled" || !Number.isFinite(index)) return;

  const bill = plannerState.scheduledBills[index];
  if (!bill || !bill.paid) return;

  plannerState.archivedBills.unshift({
    ...bill,
    archivedAt: new Date().toISOString()
  });

  plannerState.scheduledBills.splice(index, 1);

  savePlannerData();
  runPlanner();
}

function handleRollForward(e) {
  const btn = e.target.closest("[data-roll-section]");
  if (!btn) return;

  const index = Number(btn.dataset.rollIndex);
  if (!Number.isFinite(index)) return;

  const bill = plannerState.scheduledBills[index];
  if (!bill || !bill.paid) return;

  const recurrence = bill.recurrence || "monthly";
  if (recurrence === "none") return;

  const surplus = Math.max(0, Number(bill.amount || 0) - Number(bill.actualPaid || 0));
  if (surplus > 0) {
    plannerState.holdingBalance += surplus;
  }

  const nextDate = m20AddRecurrence(bill.due, recurrence);
  if (nextDate) bill.due = m20DateInputValue(nextDate);

  bill.paid = false;
  bill.actualPaid = 0;
  bill.deducted = false;

  savePlannerData();
  runPlanner();
}

function m28AutoGrowNotes(element) {
  if (!element || element.tagName !== "TEXTAREA") return;
  element.style.height = "auto";
  element.style.height = `${Math.max(78, element.scrollHeight)}px`;
}

function m38CompleteScheduledPayment(index) {
  const bill = plannerState.scheduledBills?.[index];
  if (!bill) return;
  const actual = Math.max(0, Number(bill.actualPaid || bill.amount || 0));
  if (actual <= 0) { alert("Enter a planned or actual payment amount first."); return; }
  const action = (bill.recurrence || "monthly") === "none" ? "complete and archive" : "complete and schedule the next date for";
  if (!confirm(`£${formatMoney(actual)} will be recorded from ${m38FundingSource(bill)}. ${action.charAt(0).toUpperCase()+action.slice(1)} ${bill.name}?`)) return;
  if (!bill.deducted) m38DeductFundingSource(bill, actual);
  const completed = {...bill, paid:true, actualPaid:actual, deducted:true, archivedAt:new Date().toISOString(), completedAt:new Date().toISOString()};
  if (!Array.isArray(plannerState.archivedBills)) plannerState.archivedBills = [];
  plannerState.archivedBills.unshift(completed);
  const recurrence = bill.recurrence || "monthly";
  if (recurrence === "none") {
    plannerState.scheduledBills.splice(index,1);
    m38SelectedBillId = null;
  } else {
    const nextDate = m20AddRecurrence(bill.due, recurrence);
    if (nextDate) bill.due = m20DateInputValue(nextDate);
    bill.paid = false; bill.actualPaid = 0; bill.deducted = false;
  }
  savePlannerData(); runPlanner();
}

function m38ConvertFuture(index) {
  const future = plannerState.futureCosts?.[index];
  if (!future) return;
  const bill = {
    id:`scheduled_${Date.now()}`, name:String(future.name||"New Scheduled Bill"), due:String(future.due||""),
    amount:Number(future.amount||0), paid:false, actualPaid:0, deducted:false,
    included:future.included!==false, category:m18CategoryName(future.category), notes:String(future.notes||""),
    recurrence:"none", fundingSource:future.included===false?"Current Account":"Holding Pot"
  };
  plannerState.scheduledBills.push(bill); plannerState.futureCosts.splice(index,1); m38SelectedBillId=bill.id; m38UrgencyFilter="all"; m38CategoryFilter="all";
  savePlannerData(); runPlanner();
  document.getElementById("m13Bills")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function bindTableInputs() {
  document.querySelectorAll("[data-section]").forEach(el => {
    const field = el.dataset.field;
    el.oninput = null; el.onchange = null;
    if (field === "notes" && el.tagName === "TEXTAREA") {
      m28AutoGrowNotes(el);
      el.oninput = event => { m28AutoGrowNotes(el); handleTableEdit(event); };
      el.onchange = handleTableEdit;
    } else if (field === "included" || field === "paid") {
      el.onchange = handleTableEdit;
    } else {
      el.oninput = handleTableEdit; el.onchange = handleTableEdit;
    }
  });
  document.querySelectorAll(".delete-btn").forEach(btn => { btn.onclick = handleDelete; });
  document.querySelectorAll("[data-archive-section]").forEach(btn => { btn.onclick = handleArchive; });
  document.querySelectorAll("[data-roll-section]").forEach(btn => { btn.onclick = handleRollForward; });
  document.querySelectorAll("[data-m21-paid]").forEach(input => { input.onchange = handleYearlyRecurringPaid; });
  document.querySelectorAll("[data-m21-undo]").forEach(btn => { btn.onclick = handleYearlyRecurringUndo; });
  document.querySelectorAll("[data-m38-select]").forEach(card => { card.onclick = () => { m38SelectedBillId=card.dataset.m38Select; renderScheduledBills(); bindTableInputs(); }; });
  document.querySelectorAll("[data-m38-urgency]").forEach(btn => { btn.onclick = () => { m38UrgencyFilter=btn.dataset.m38Urgency; document.querySelectorAll("[data-m38-urgency]").forEach(x=>x.classList.toggle("active",x===btn)); renderScheduledBills(); bindTableInputs(); }; });
  document.querySelectorAll("[data-m38-category]").forEach(btn => { btn.onclick = () => { m38CategoryFilter=btn.dataset.m38Category; renderScheduledBills(); bindTableInputs(); }; });
  document.querySelectorAll("[data-m38-complete]").forEach(btn => { btn.onclick = () => m38CompleteScheduledPayment(Number(btn.dataset.m38Complete)); });
  document.querySelectorAll("[data-convert-future]").forEach(btn => { btn.onclick = () => m38ConvertFuture(Number(btn.dataset.convertFuture)); });
}


function addScheduledBill() {
  const bill = {
    id: `scheduled_${Date.now()}`,
    name: "New Scheduled Bill",
    due: "",
    amount: 0,
    paid: false,
    actualPaid: 0,
    deducted: false,
    included: true,
    category: "Other",
    notes: "",
    recurrence: "monthly",
    fundingSource: "Holding Pot"
  };
  plannerState.scheduledBills.push(bill);
  m38SelectedBillId = bill.id;
  m38UrgencyFilter = "all";
  m38CategoryFilter = "all";
  savePlannerData();
  runPlanner();
  document.getElementById("m38BillInspector")?.scrollIntoView({behavior:"smooth",block:"nearest"});
}


function addFutureCost() {
  plannerState.futureCosts.push({
    id: `future_${Date.now()}`,
    name: "New Future Cost",
    due: "",
    amount: 0,
    included: false,
    category: "Other",
    notes: ""
  });
  savePlannerData();
  runPlanner();
}

function addRecurringCost() {
  plannerState.recurringCosts.push({
    id: `recurring_${Date.now()}`,
    name: "New Recurring Cost",
    amount: 0,
    originalAmount: 0,
    spentThisCycle: 0,
    payAmount: 0,
    lastPaidDate: "",
    included: true,
    category: "Other",
    notes: ""
  });
  savePlannerData();
  runPlanner();
}

function addYearlyRecurringCost() {
  plannerState.yearlyRecurringCosts.push({
    id: `yearlyRecurring_${Date.now()}`,
    name: "New Yearly Cost",
    due: "",
    amount: 0,
    paid: false,
    deducted: false,
    paidAmount: 0,
    lastPaidDate: "",
    nextRenewalDue: "",
    included: true,
    category: "Other"
  });
  savePlannerData();
  runPlanner();
}


/* ===================== SECTION: AURORA WEALTH COMMAND UPGRADE JS ===================== */
function updateWealthCommandDeck(metrics) {
  const safeToMove = metrics.safeToMoveNow || 0;
  const pressure = metrics.next30DaysBills || 0;
  const potBalance = Number(plannerState.holdingBalance || 0);
  const buffer = Number(plannerState.minimumBuffer || 0);
  const growBalance = Number(plannerState.growPotBalance || 0);
  const growTarget = Number(plannerState.growPotTarget || 7500);
  const finalTopUp = metrics.finalAmountToAdd || 0;
  const protectedMoney = metrics.protectedMoney || 0;

  const bufferScore = buffer > 0 ? Math.min(100, (potBalance / (buffer + 1)) * 40) : 50;
  const safeScore = safeToMove > 0 ? 25 : 8;
  const growScore = growTarget > 0 ? Math.min(20, (growBalance / growTarget) * 20) : 0;
  const pressureScore = pressure < 150 ? 15 : pressure < 400 ? 8 : 2;
  const score = Math.round(Math.max(0, Math.min(100, bufferScore + safeScore + growScore + pressureScore)));

  setText("wealthScore", score);
  const badge = document.getElementById("wealthCommandBadge");
  if (badge) {
    badge.className = `command-badge ${score >= 75 ? "good" : score >= 55 ? "watch" : "risk"}`;
    badge.innerText = score >= 75 ? "STRONG" : score >= 55 ? "WATCH" : "PROTECT";
  }

  setText("commandSafeSignal", safeToMove > 0 ? "MOVE" : "HOLD");
  setText("commandSafeMeta", safeToMove > 0 ? `£${formatMoney(safeToMove)} available after protection` : "Keep cash protected for bills");
  setText("commandPaydayMove", `£${formatMoney(finalTopUp)}`);
  setText("commandPressure", pressure > 400 ? "HIGH" : pressure > 150 ? "MEDIUM" : "LOW");
  setText("commandPressureMeta", `£${formatMoney(pressure)} due in next 30 days`);

  let route = "Hold";
  let routeMeta = "No surplus route active yet";
  if (safeToMove > 250) {
    route = "IG ISA";
    routeMeta = "Surplus can support wealth building";
  } else if (growBalance < 1000 && safeToMove > 0) {
    route = "Grow Pot";
    routeMeta = "Emergency buffer still needs strength";
  } else if (finalTopUp > 0) {
    route = "Bills";
    routeMeta = "Fund holding pot before skimming";
  }
  setText("commandSurplusRoute", route);
  setText("commandSurplusMeta", routeMeta);

  renderPotEditor();
  renderPotHealthRadar(metrics);
  updatePaydaySimulator(metrics);
  updateNextPaydayPlan(metrics);
  renderWealthAiView(metrics, score);
  renderFreedomFlightPath(metrics);
}

function normalisePotPriority(value){
  const n=Number(value);
  return n===1||n===2||n===3?n:2;
}
function priorityLabel(priority){
  return priority===1?"CRITICAL":priority===2?"IMPORTANT":"FLEXIBLE";
}
function renderPotEditor() {
  const grid=document.getElementById("potEditorGrid");
  if(!grid)return;
  const pots=Array.isArray(plannerState.editablePots)?plannerState.editablePots:[];
  grid.innerHTML=pots.map((p,index)=>`
    <div class="pot-editor-row" data-pot-index="${index}">
      <input data-pot-field="name" value="${String(p.name||"").replace(/"/g,"&quot;")}" aria-label="Pot name">
      <input data-pot-field="balance" type="number" step="0.01" value="${Number(p.balance||0)}" aria-label="Current balance">
      <input data-pot-field="target" type="number" step="0.01" value="${Number(p.target||0)}" aria-label="Target">
      <select data-pot-field="priority" aria-label="Priority">
        <option value="1" ${normalisePotPriority(p.priority)===1?"selected":""}>1 — Critical</option>
        <option value="2" ${normalisePotPriority(p.priority)===2?"selected":""}>2 — Important</option>
        <option value="3" ${normalisePotPriority(p.priority)===3?"selected":""}>3 — Flexible</option>
      </select>
      <textarea class="pot-note" data-pot-field="note" rows="3" placeholder="Explain what this pot covers and which bills it funds." aria-label="Pot note">${m18Escape(p.note || "")}</textarea>
      <button class="delete-btn" type="button" data-delete-pot="${index}">Delete</button>
    </div>`).join("") || `<div class="subv">No pots yet. Add your first pot below.</div>`;
  requestAnimationFrame(() => {
    grid.querySelectorAll("textarea.pot-note").forEach(note => {
      m28AutoGrowNotes(note);
      note.addEventListener("input", () => m28AutoGrowNotes(note));
    });
  });
}
function syncPotEditorToState(){
  const rows=[...document.querySelectorAll("#potEditorGrid .pot-editor-row")];
  plannerState.editablePots=rows.map((row,index)=>({
    id:String(plannerState.editablePots?.[index]?.id||`pot_${Date.now()}_${index}`),
    name:String(row.querySelector('[data-pot-field="name"]')?.value||`Pot ${index+1}`).trim(),
    balance:parseNum(row.querySelector('[data-pot-field="balance"]')?.value),
    target:parseNum(row.querySelector('[data-pot-field="target"]')?.value),
    priority:normalisePotPriority(row.querySelector('[data-pot-field="priority"]')?.value),
    note:String(row.querySelector('[data-pot-field="note"]')?.value||"").trim()
  }));
}
function renderPotHealthRadar(metrics) {
  const grid = document.getElementById("potHealthRadar");
  if (!grid) return;
  const pots=[...(Array.isArray(plannerState.editablePots)?plannerState.editablePots:[])];
  pots.sort((a,b)=>{
    const pa=normalisePotPriority(a.priority), pb=normalisePotPriority(b.priority);
    if(pa!==pb)return pa-pb;
    const ar=a.target>0?Number(a.balance||0)/Number(a.target||1):1;
    const br=b.target>0?Number(b.balance||0)/Number(b.target||1):1;
    return ar-br || String(a.name||"").localeCompare(String(b.name||""));
  });
  grid.innerHTML = pots.map((p,index) => {
    const current=Number(p.balance||0), target=Number(p.target||0);
    const progress = target > 0 ? Math.min(100, (current / target) * 100) : (current>0?100:0);
    const cls = progress >= 85 ? "good" : progress >= 45 ? "watch" : "risk";
    const priority=normalisePotPriority(p.priority);
    const targetText=target>0?`£${formatMoney(target)}`:"Open target";
    return `
      <div class="pot-radar-card ${cls} priority-${priority}">
        <div class="pot-radar-top">
          <div class="pot-name">${p.name||"Unnamed Pot"}</div>
          <span class="pot-priority-rank">P${priority} ${priorityLabel(priority)}</span>
        </div>
        <div class="m28-note-display ${String(p.note || "").trim() ? "" : "is-empty"}">${String(p.note || "").trim() ? m18Escape(p.note) : "No pot funding note recorded"}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="subv">£${formatMoney(current)} / ${targetText} • ${progress.toFixed(0)}%</div>
      </div>
    `;
  }).join("") || `<div class="subv">Add pots in the Editable Pot Manager to build your radar.</div>`;
}


function updateNextPaydayPlan(metrics) {
  const pay = parseNum(document.getElementById("simPayInput")?.value || 2100);
  const invest = parseNum(document.getElementById("simInvestInput")?.value || 1000);
  const lifestyle = parseNum(document.getElementById("simLifestyleInput")?.value || 250);
  const goals = parseNum(document.getElementById("simGoalsInput")?.value || 250);
  const holding = Number(metrics.finalAmountToAdd || 0);

  const growBalance = Number(plannerState.growPotBalance || 0);
  const grow = growBalance < 1000
    ? Math.min(100, Math.max(0, pay - invest - lifestyle - goals - holding))
    : 0;

  const leftover = pay - invest - lifestyle - goals - holding - grow;

  setText("planHoldingPot", `£${formatMoney0(holding)}`);
  setText("planIgIsa", `£${formatMoney0(invest)}`);
  setText("planGoalPots", `£${formatMoney0(goals)}`);
  setText("planSpending", `£${formatMoney0(lifestyle)}`);
  setText("planGrowPot", `£${formatMoney0(grow)}`);
  setText("planLeftover", `${leftover < 0 ? "-" : ""}£${formatMoney0(Math.abs(leftover))}`);

  const leftoverTile = document.getElementById("planLeftoverTile");
  if (leftoverTile) {
    leftoverTile.classList.remove("good", "watch", "risk", "cyan");
    leftoverTile.classList.add(leftover < 0 ? "risk" : leftover < 100 ? "watch" : "good");
  }

  const badge = document.getElementById("nextPaydayPlanBadge");
  if (badge) {
    badge.className = `command-badge ${leftover < 0 ? "risk" : leftover < 100 ? "watch" : "good"}`;
    badge.innerText = leftover < 0 ? "OVERSTRETCHED" : leftover < 100 ? "TIGHT" : "PAYDAY READY";
  }

  const verdict = document.getElementById("nextPaydayPlanVerdict");
  if (verdict) {
    const safeToMove = Number(metrics.safeToMoveNow || 0);
    let message = "";

    if (leftover < 0) {
      message = `Plan is <b>over by £${formatMoney(Math.abs(leftover))}</b>. Reduce goals, lifestyle or IG ISA before payday. No hero moves — the spreadsheet goblin is armed.`;
    } else if (safeToMove > 250) {
      message = `Plan leaves <b>£${formatMoney(leftover)}</b> flex and Aurora sees <b>£${formatMoney(safeToMove)}</b> safe-to-move. IG ISA can stay active after the Holding Pot is protected.`;
    } else if (holding > 0) {
      message = `Main priority is the <b>Holding Pot top-up of £${formatMoney(holding)}</b>. Keep IG ISA steady, but do not skim extra until bills pressure clears.`;
    } else {
      message = `Bills engine looks covered. Payday can focus on <b>IG ISA, goal pots and spending discipline</b>. Clean, boring, powerful — annoyingly effective.`;
    }

    verdict.innerHTML = message;
  }
}


function updatePaydaySimulator(metrics) {
  const pay = parseNum(document.getElementById("simPayInput")?.value || 2100);
  const invest = parseNum(document.getElementById("simInvestInput")?.value || 1000);
  const lifestyle = parseNum(document.getElementById("simLifestyleInput")?.value || 250);
  const goals = parseNum(document.getElementById("simGoalsInput")?.value || 250);
  const holding = Number(metrics.finalAmountToAdd || 0);
  const grow = Number(plannerState.growPotBalance || 0) < 1000 ? Math.min(100, Math.max(0, pay - invest - lifestyle - goals - holding)) : 0;
  const remaining = pay - invest - lifestyle - goals - holding - grow;

  const box = document.getElementById("paydaySimulationResults");
  if (!box) return;

  box.innerHTML = `
    <div class="payday-row"><strong>Holding Pot</strong><span>£${formatMoney(holding)}</span></div>
    <div class="payday-row"><strong>IG ISA</strong><span>£${formatMoney(invest)}</span></div>
    <div class="payday-row"><strong>Goal Pots</strong><span>£${formatMoney(goals)}</span></div>
    <div class="payday-row"><strong>Grow Pot</strong><span>£${formatMoney(grow)}</span></div>
    <div class="payday-row"><strong>Lifestyle / Spending</strong><span>£${formatMoney(lifestyle)}</span></div>
    <div class="payday-row"><strong>Remaining Flex</strong><span class="${remaining >= 0 ? "good" : "risk"}">£${formatMoney(remaining)}</span></div>
  `;
}

function renderWealthAiView(metrics, score) {
  const safeToMove = Number(metrics.safeToMoveNow || 0);
  const pressure = Number(metrics.next30DaysBills || 0);
  const finalTopUp = Number(metrics.finalAmountToAdd || 0);
  const growBalance = Number(plannerState.growPotBalance || 0);
  const growTarget = Number(plannerState.growPotTarget || 7500);

  let action = "protect the Holding Pot";
  if (safeToMove > 250) action = "route surplus towards IG ISA";
  else if (growBalance < 1000 && safeToMove > 0) action = "strengthen the Grow Pot first";
  else if (finalTopUp <= 0) action = "hold steady and avoid forced moves";

  const text = `
    Aurora scores this setup at <b>${score}/100</b>. 
    Current bill pressure is <b>£${formatMoney(pressure)}</b> over the next 30 days. 
    Safe-to-move is <b>£${formatMoney(safeToMove)}</b>. 
    The next payday Holding Pot guide is <b>£${formatMoney(finalTopUp)}</b>. 
    Grow Pot progress is <b>${growTarget > 0 ? ((growBalance / growTarget) * 100).toFixed(0) : 0}%</b>. 
    Recommended action: <b>${action}</b>.
  `;
  const el = document.getElementById("wealthAiView");
  if (el) el.innerHTML = text;
}

function renderFreedomFlightPath(metrics) {
  const box = document.getElementById("freedomFlightPath");
  if (!box) return;

  const targetAnnual = 24000;
  const assumedCurrentIncome = 5064; /* From Dividend Terminal current run-rate area */
  const progress = Math.min(100, (assumedCurrentIncome / targetAnnual) * 100);
  const nextMilestone = 6000;
  const milestoneProgress = Math.min(100, (assumedCurrentIncome / nextMilestone) * 100);

  const rows = [
    { name:"£500/month Stage", value:assumedCurrentIncome, target:nextMilestone, pct:milestoneProgress },
    { name:"Master Goal", value:assumedCurrentIncome, target:targetAnnual, pct:progress },
    { name:"Emergency Fund", value:Number(plannerState.growPotBalance||0), target:Number(plannerState.growPotTarget||7500), pct:Number(plannerState.growPotTarget||7500)>0?(Number(plannerState.growPotBalance||0)/Number(plannerState.growPotTarget||7500))*100:0 },
    { name:"Bills Engine", value:Number(plannerState.holdingBalance||0), target:Number(metrics.protectedMoney||0), pct:Number(metrics.protectedMoney||0)>0?(Number(plannerState.holdingBalance||0)/Number(metrics.protectedMoney||0))*100:0 }
  ];

  box.innerHTML = rows.map(r => `
    <div class="flight-row">
      <div class="flight-name">${r.name}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,r.pct))}%"></div></div>
      <div class="flight-value">${Math.min(100,r.pct).toFixed(0)}%</div>
    </div>
  `).join("");
}

function runPlanner() {
  plannerState.holdingBalance = parseNum(document.getElementById("holdingBalanceInput")?.value);
  plannerState.paydayContribution = parseNum(document.getElementById("paydayContributionInput")?.value);
  plannerState.minimumBuffer = parseNum(document.getElementById("minimumBufferInput")?.value);
  plannerState.growPotBalance = parseNum(document.getElementById("growPotBalanceInput")?.value);
  plannerState.growPotTarget = parseNum(document.getElementById("growPotTargetInput")?.value);

  applyPaidScheduledDeductions();
  processYearlyAutoRenewals();

  const holdingInput = document.getElementById("holdingBalanceInput");
  if (holdingInput) {
    holdingInput.value = Number(plannerState.holdingBalance || 0).toFixed(2);
  }

  savePotHistory();
  renderScheduledBills();
  updateScheduledBillsCommander();
  renderArchivedBills();
  renderFutureCosts();
  renderRecurringCosts();
  renderYearlyRecurringCosts();
  bindTableInputs();
  updatePlannerTotals();
  renderPotTrendChart();
}

loadPlannerData();

document.getElementById("holdingBalanceInput").value = plannerState.holdingBalance ?? 0;
document.getElementById("paydayContributionInput").value = plannerState.paydayContribution ?? 0;
document.getElementById("minimumBufferInput").value = plannerState.minimumBuffer ?? 1000;
document.getElementById("growPotBalanceInput").value = plannerState.growPotBalance ?? 700;
document.getElementById("growPotTargetInput").value = plannerState.growPotTarget ?? 7500;

document.getElementById("holdingBalanceInput")?.addEventListener("input", () => {
  updatePlannerTotals();
});

document.getElementById("paydayContributionInput")?.addEventListener("input", () => {
  updatePlannerTotals();
});

document.getElementById("minimumBufferInput")?.addEventListener("input", () => {
  updatePlannerTotals();
});

document.getElementById("growPotBalanceInput")?.addEventListener("input", () => {
  updatePlannerTotals();
});

document.getElementById("growPotTargetInput")?.addEventListener("input", () => {
  updatePlannerTotals();
});

document.getElementById("savePlannerBtn")?.addEventListener("click", () => {
  savePlannerData();
  runPlanner();
});

document.getElementById("resetPlannerBtn")?.addEventListener("click", () => {
  resetPlannerData();

  document.getElementById("holdingBalanceInput").value = plannerState.holdingBalance ?? 0;
  document.getElementById("paydayContributionInput").value = plannerState.paydayContribution ?? 0;
  document.getElementById("minimumBufferInput").value = plannerState.minimumBuffer ?? 1000;
  document.getElementById("growPotBalanceInput").value = plannerState.growPotBalance ?? 700;
  document.getElementById("growPotTargetInput").value = plannerState.growPotTarget ?? 7500;

  savePlannerData();
  runPlanner();
});

document.getElementById("exportBackupBtn")?.addEventListener("click", exportPlannerBackup);

document.getElementById("importBackupBtn")?.addEventListener("click", () => {
  document.getElementById("importBackupFile")?.click();
});

document.getElementById("importBackupFile")?.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  importPlannerBackupFromFile(file);
  e.target.value = "";
});

document.getElementById("addScheduledBtn")?.addEventListener("click", addScheduledBill);
document.getElementById("addFutureBtn")?.addEventListener("click", addFutureCost);
document.getElementById("addRecurringBtn")?.addEventListener("click", addRecurringCost);
document.getElementById("addYearlyRecurringBtn")?.addEventListener("click", addYearlyRecurringCost);

document.getElementById("addPaydayBtn")?.addEventListener("click", () => {
  const contribution = parseNum(document.getElementById("paydayContributionInput")?.value);
  if (contribution <= 0) return;

  plannerState.holdingBalance += contribution;
  document.getElementById("holdingBalanceInput").value = plannerState.holdingBalance.toFixed(2);

  savePlannerData();
  runPlanner();
});

document.getElementById("addCustomBtn")?.addEventListener("click", () => {
  const customAmount = parseNum(document.getElementById("customAddInput")?.value);
  if (customAmount <= 0) return;

  plannerState.holdingBalance += customAmount;
  document.getElementById("holdingBalanceInput").value = plannerState.holdingBalance.toFixed(2);
  document.getElementById("customAddInput").value = "";

  savePlannerData();
  runPlanner();
});

document.getElementById("removeCustomBtn")?.addEventListener("click", () => {
  const removeAmount = parseNum(document.getElementById("customRemoveInput")?.value);
  if (removeAmount <= 0) return;

  plannerState.holdingBalance = Math.max(0, plannerState.holdingBalance - removeAmount);
  document.getElementById("holdingBalanceInput").value = plannerState.holdingBalance.toFixed(2);
  document.getElementById("customRemoveInput").value = "";

  savePlannerData();
  runPlanner();
});



document.getElementById("addPotBtn")?.addEventListener("click",()=>{
  syncPotEditorToState();
  plannerState.editablePots.push({id:`pot_${Date.now()}`,name:"New Pot",balance:0,target:0,priority:3,note:""});
  renderPotEditor();renderPotHealthRadar({});
});
document.getElementById("savePotsBtn")?.addEventListener("click",()=>{
  syncPotEditorToState();savePlannerData();renderPotHealthRadar({});
  setText("potEditorStatus",`Pot changes saved at ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}.`);
});
document.getElementById("resetPotsBtn")?.addEventListener("click",()=>{
  plannerState.editablePots=freshEditablePots();savePlannerData();renderPotEditor();renderPotHealthRadar({});
  setText("potEditorStatus","Pot list reset to the Aurora starter layout.");
});
document.getElementById("potEditorGrid")?.addEventListener("input",()=>{
  syncPotEditorToState();renderPotHealthRadar({});
});
document.getElementById("potEditorGrid")?.addEventListener("click",(event)=>{
  const btn=event.target.closest("[data-delete-pot]");if(!btn)return;
  syncPotEditorToState();plannerState.editablePots.splice(Number(btn.dataset.deletePot),1);
  savePlannerData();renderPotEditor();renderPotHealthRadar({});
});

["simPayInput","simInvestInput","simLifestyleInput","simGoalsInput"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", () => updatePlannerTotals());
});

runPlanner();
setTimeout(m13Render,50);


/* ===== Original inline script 02 ===== */
/* ===================== M23 RECURRING CASH-FLOW EXPANSION ===================== */
function m23DateValue(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function m23Recurrence(value){
  const recurrence=String(value||"none").toLowerCase();
  return ["weekly","fortnightly","four-weekly","monthly","yearly","none"].includes(recurrence)?recurrence:"none";
}
function m23RecurrenceLabel(value){
  return ({weekly:"Weekly",fortnightly:"Fortnightly","four-weekly":"Every 4 weeks",monthly:"Monthly",yearly:"Yearly",none:"One-off"})[m23Recurrence(value)]||"One-off";
}
function m23AdvanceDate(date,recurrence){
  const next=new Date(date);
  const rule=m23Recurrence(recurrence);
  if(rule==="weekly")next.setDate(next.getDate()+7);
  else if(rule==="fortnightly")next.setDate(next.getDate()+14);
  else if(rule==="four-weekly")next.setDate(next.getDate()+28);
  else if(rule==="yearly")next.setFullYear(next.getFullYear()+1);
  else if(rule==="monthly"){
    const originalDay=next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth()+1);
    const lastDay=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();
    next.setDate(Math.min(originalDay,lastDay));
  }
  return next;
}
function m23CashflowBaseItems(){
  const scheduled=(plannerState?.scheduledBills||[]).filter(item=>item&&item.included!==false);
  const scheduledKeys=new Set(scheduled.map(item=>`${String(item.name||"").trim().toLowerCase()}|${item.due||""}`));
  const yearly=(plannerState?.yearlyRecurringCosts||[])
    .filter(item=>item&&item.included!==false)
    .map(item=>{
      const due=item.paid?(item.nextRenewalDue||""):(item.due||"");
      return {...item,due,paid:false,recurrence:"yearly",_sourceLabel:"Yearly renewal"};
    })
    .filter(item=>item.due&&!scheduledKeys.has(`${String(item.name||"").trim().toLowerCase()}|${item.due||""}`));
  return [...scheduled,...yearly];
}
function m23ExpandBeforePayday(paydayValue){
  const today=new Date();today.setHours(0,0,0,0);
  let payday;
  if(paydayValue instanceof Date)payday=new Date(paydayValue);
  else if(paydayValue)payday=parseLocalDate(paydayValue);
  else payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():new Date(today);
  if(!(payday instanceof Date)||Number.isNaN(payday.getTime()))return [];
  payday.setHours(0,0,0,0);
  const expanded=[];
  m23CashflowBaseItems().forEach(item=>{
    if(!item.due)return;
    const base=parseLocalDate(item.due);
    if(Number.isNaN(base.getTime()))return;
    base.setHours(0,0,0,0);
    const recurrence=item._sourceLabel==="Yearly renewal"?"yearly":m23Recurrence(item.recurrence);
    let occurrence=new Date(base);
    let projectedIndex=0;
    if(item.paid){
      if(recurrence==="none")return;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex=1;
    }
    let guard=0;
    while(occurrence<today&&guard<120){
      if(recurrence==="none")return;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex+=1;
      guard+=1;
    }
    while(occurrence<payday&&guard<120){
      const isOriginal=!item.paid&&occurrence.getTime()===base.getTime();
      const cashAmount=isOriginal&&Number(item.actualPaid||0)>0?Number(item.actualPaid):Number(item.amount||0);
      expanded.push({
        ...item,
        due:m23DateValue(occurrence),
        _d:new Date(occurrence),
        _cashAmount:cashAmount,
        _projectedOccurrence:!isOriginal,
        _recurrenceLabel:m23RecurrenceLabel(recurrence),
        _sourceLabel:item._sourceLabel||(isOriginal?"":`${m23RecurrenceLabel(recurrence)} repeat`)
      });
      if(recurrence==="none")break;
      occurrence=m23AdvanceDate(occurrence,recurrence);
      projectedIndex+=1;
      guard+=1;
    }
  });
  return expanded.sort((a,b)=>a._d-b._d||String(a.name||"").localeCompare(String(b.name||""),"en-GB"));
}
/* ===================== M13 LIVE DASHBOARD BINDING ===================== */
function m13GBP(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m13Num(id){return Number(document.getElementById(id)?.value||0)}
function m13Date(v){if(!v)return null;const d=typeof parseLocalDate==="function"?parseLocalDate(v):new Date(v);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
function m13Set(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function m13Render(){
  if(typeof plannerState==="undefined")return;
  const pay=m13Num("simPayInput")||2100;
  const isa=m13Num("simInvestInput");
  const lifestyle=m13Num("simLifestyleInput");
  const goals=m13Num("simGoalsInput");
  const grow=m13Num("simGrowInput");
  const holding=Number(plannerState.holdingBalance||0);
  const flex=Math.max(0,pay-isa-lifestyle-goals-grow);

  const included=(plannerState.scheduledBills||[]).filter(x=>x&&x.included);
  const unpaidScheduled=included.filter(x=>!x.paid);
  const scheduledKeys=new Set(unpaidScheduled.map(x=>`${String(x.name||"").trim().toLowerCase()}|${x.due||""}`));
  const unpaidYearly=(plannerState.yearlyRecurringCosts||[])
    .filter(x=>x&&x.included&&!x.paid)
    .filter(x=>!scheduledKeys.has(`${String(x.name||"").trim().toLowerCase()}|${x.due||""}`))
    .map(x=>({...x,_sourceLabel:"Yearly renewal"}));
  const unpaid=[...unpaidScheduled,...unpaidYearly];
  const unpaidTotal=unpaid.reduce((s,x)=>s+Number(x.amount||0),0);
  const recurringMonthly=(plannerState.recurringCosts||[]).filter(x=>x&&x.included).reduce((s,x)=>s+Number(x.amount||0),0);
  const protectedMoney=Number(plannerState.minimumBuffer||0)+unpaidTotal+recurringMonthly;
  const trueSurplus=Math.max(0,holding-protectedMoney);
  const safeToMove=trueSurplus;
  const days=typeof getDaysToNextPayday==="function"?getDaysToNextPayday():0;
  const payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():null;
  const today=new Date();today.setHours(0,0,0,0);
  if(payday)payday.setHours(23,59,59,999);
  const before=typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(payday):unpaid.map(x=>({...x,_d:m13Date(x.due),_cashAmount:Number(x.amount||0)})).filter(x=>x._d&&x._d>=today&&(!payday||x._d<payday)).sort((a,b)=>a._d-b._d);
  const beforeTotal=before.reduce((s,x)=>s+Number((x._cashAmount??x.amount)||0),0);
  const projected=holding-beforeTotal;
  const protectionPct=holding>0?Math.min(100,Math.max(0,(protectedMoney/holding)*100)):0;
  const score=Math.max(0,Math.min(100,Math.round(100-(beforeTotal>holding?45:0)-(holding<Number(plannerState.minimumBuffer||0)?30:0)+(trueSurplus>0?8:0))));

  m13Set("m13ExpectedPay",m13GBP(pay));m13Set("m13Isa",m13GBP(isa));m13Set("m13Goals",m13GBP(goals));m13Set("m13Lifestyle",m13GBP(lifestyle));m13Set("m13Flex",m13GBP(flex));m13Set("m13Holding",m13GBP(holding));
  m13Set("m32TopBalance",m13GBP(holding));m13Set("m32TopBefore",m13GBP(beforeTotal));m13Set("m32TopProjected",m13GBP(projected));m13Set("m32TopSafe",m13GBP(safeToMove));
  m13Set("m32TopBalanceNote",beforeTotal>0?`${before.length} payment${before.length===1?"":"s"} due before payday • ${m13GBP(beforeTotal)} protected`:`No included payments are due before payday`);
  m13Set("m13LineIsa",m13GBP(isa).replace(".00",""));m13Set("m13LineGoals",m13GBP(goals).replace(".00",""));m13Set("m13LineLifestyle",m13GBP(lifestyle).replace(".00",""));m13Set("m13LineHolding",m13GBP(Math.max(0,Number(plannerState.minimumBuffer||0))));
  m13Set("m13BufferValue",m13GBP(flex));m13Set("m13RunHolding",m13GBP(holding));m13Set("m13RunProtected",m13GBP(protectedMoney));m13Set("m13RunSurplus",m13GBP(trueSurplus));m13Set("m13RunSafe",m13GBP(safeToMove));m13Set("m13DaysBadge",`${days} DAYS`);
  m13Set("m13RunwayPct",`${Math.round(protectionPct)}%`);document.getElementById("m13Donut")?.style.setProperty("--runway",`${protectionPct}%`);
  m13Set("m13BeforeCurrent",m13GBP(holding));m13Set("m13BeforeOut",m13GBP(beforeTotal));m13Set("m13BeforeCount",String(before.length));m13Set("m13BeforeProjected",m13GBP(projected));m13Set("m13ImpactNow",m13GBP(holding));m13Set("m13ImpactOut",`−${m13GBP(beforeTotal)}`);m13Set("m13ImpactFinal",m13GBP(projected));
  m13Set("m13Score",String(score));document.getElementById("m13ScoreRing")?.style.setProperty("--score",`${score}%`);
  m13Set("m13ScoreLabel",score>=80?"STRONG POSITION":score>=60?"CONTROLLED POSITION":"PROTECT THE POT");
  m13Set("m13SideStatus",`${days} days to payday • ${before.length} payment${before.length===1?"":"s"} before payday`);

  const title=beforeTotal===0?"No scheduled payments are currently due before payday.":projected>=Number(plannerState.minimumBuffer||0)?"Your known payments are covered before payday.":"Protect the Holding Pot — the current projection is tight.";
  const copy=beforeTotal===0?"Aurora has not found any included, unpaid bill with a due date before the next payday.":`Aurora has found ${before.length} unpaid payment${before.length===1?"":"s"} totalling ${m13GBP(beforeTotal)} before payday. Your projected balance afterwards is ${m13GBP(projected)}.`;
  m13Set("m13BriefTitle",title);m13Set("m13BriefCopy",copy);
  document.getElementById("m13Callout").innerHTML=`<strong>Holding Pot instruction:</strong> ${projected>=Number(plannerState.minimumBuffer||0)?"keep the remaining flex buffered and review again at the end of the cycle.":"do not move extra money to shares until the bill position improves."}`;
  m13Set("m13BufferText",`Keep the ${m13GBP(flex)} remaining flex available. At the end of the pay cycle, move only the genuine leftover after actual bills and spending are confirmed.`);
  m13Set("m13Ticker",`Expected pay ${m13GBP(pay)} • IG ISA ${m13GBP(isa)} • Goal pots ${m13GBP(goals)} • Lifestyle ${m13GBP(lifestyle)} • ${m13GBP(beforeTotal)} scheduled before payday • projected balance ${m13GBP(projected)}`);

  const list=document.getElementById("m13CashflowList");
  if(list){
    if(!before.length){
      list.innerHTML=`<div class="m31-cashflow-clear"><span>✓</span><div><strong>Cash flow clear</strong><small>No included payments are due before payday.</small></div><b>${m13GBP(0)}</b></div>`;
    }else{
      const visible=before.slice(0,4);
      const hidden=before.slice(4);
      const rows=visible.map(x=>`<div class="m13-cashflow-item"><div class="m13-cashflow-date">${x._d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">−${m13GBP(x._cashAmount??x.amount)}</div></div>`).join("");
      const more=hidden.length?`<details class="m31-cashflow-more"><summary>View ${hidden.length} more payment${hidden.length===1?'':'s'} <span>${m13GBP(hidden.reduce((s,x)=>s+Number((x._cashAmount ?? x.amount) || 0),0))}</span></summary><div class="m31-cashflow-hidden">${hidden.map(x=>`<div class="m13-cashflow-item"><div class="m13-cashflow-date">${x._d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">−${m13GBP(x._cashAmount??x.amount)}</div></div>`).join('')}</div></details>`:'';
      list.innerHTML=rows+more;
    }
  }

  const upcoming=[...unpaid].filter(x=>m13Date(x.due)).sort((a,b)=>m13Date(a.due)-m13Date(b.due)).slice(0,4);
  const up=document.getElementById("m13UpcomingBills");
  if(up)up.innerHTML=upcoming.length?upcoming.map(x=>{const d=m13Date(x.due);return `<div class="m13-cashflow-item"><div class="m13-cashflow-date">${d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase()}</div><div><div class="m13-cashflow-name">${x.name||"Unnamed payment"}</div><div class="m13-cashflow-meta">${x.category||"Scheduled bill"}${x._sourceLabel?` • ${x._sourceLabel}`:""}</div></div><div class="m13-cashflow-amount">${m13GBP(x.amount)}</div></div>`}).join(""):`<div class="m13-cashflow-item"><div class="m13-cashflow-date">CLEAR</div><div><div class="m13-cashflow-name">No upcoming dated bills</div><div class="m13-cashflow-meta">Add due dates in Bills & Spending</div></div><div class="m13-cashflow-amount">—</div></div>`;
}
function m13ScrollTo(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
document.querySelectorAll("#m13Nav button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");m13ScrollTo(btn.dataset.target)}));
document.getElementById("m13Refresh")?.addEventListener("click",()=>{if(typeof runPlanner==="function")runPlanner();m13Render()});
document.getElementById("m13Presentation")?.addEventListener("click",()=>document.documentElement.requestFullscreen?.());
document.addEventListener("input",()=>setTimeout(m13Render,0));
document.addEventListener("change",()=>setTimeout(m13Render,0));
window.addEventListener("load",()=>setTimeout(m13Render,80));


/* ===== Original inline script 03 ===== */
window.AURORA_MASTER_JSON_URL = window.AURORA_MASTER_JSON_URL || "https://webbchrisuk-max.github.io/aurora-city-fc/AuroraMaster.json";


/* ===== Original inline script 04 ===== */
/* ===================== M14 VIEW CONTROLLER ===================== */
const M14_VIEWS = {
  m13PaydayPlan:{
    title:"Payday Plan",
    subtitle:"Protect bills, reconcile the current account and complete every transfer once.",
    headings:[
      "Payday Mission Control"
    ]
  },
  m13Bills:{
    title:"Bills & Spending",
    subtitle:"Manage scheduled payments, actual spending, future costs and recurring commitments.",
    headings:[
      "Next 7 Days Bills","Bills Control Centre","Editable Future Costs",
      "Editable Yearly Recurring Costs","Editable Recurring Monthly Costs"
    ]
  },
  m13PotHealth:{
    title:"Pot Health",
    subtitle:"Review every savings pot, its priority, funding gap and the money genuinely protected.",
    headings:[
      "Pot Control Panel","Pot Health Radar","Grow Pot Engine","True Surplus Split"
    ]
  },
  m13HouseProject:{
    title:"House Project",
    subtitle:"Control renovation costs room by room, compare estimates with actual payments and update the House Pot.",
    headings:[
      "House Project Ledger"
    ]
  },
  m13Funding:{
    title:"Funding Engine",
    subtitle:"See how surplus money is routed and how your longer-term financial flight path changes.",
    headings:[
      "Aurora CFO Command Deck","Aurora Wealth Intelligence","Financial Freedom Flight Path",
      "Funding Engine"
    ]
  },
  m13History:{
    title:"History",
    subtitle:"Review category totals, yearly breakdowns and your saved Holding Pot movement.",
    headings:[
      "Category Breakdown","Yearly Breakdown"
    ]
  }
};
function m14AllPlannerSections(){
  return [...document.querySelectorAll("#m14WorkingPlanner .section")];
}
function m14Heading(section){
  return (section.querySelector("h2, .m15-hero h3, .m22-hero h3")?.textContent||"").trim();
}
function m14ShowDashboard(){
  document.getElementById("m13Dashboard").style.display="";
  document.getElementById("m14WorkingPlanner")?.classList.remove("view-active");
  document.getElementById("m14ViewHeader")?.classList.remove("active");
  m14AllPlannerSections().forEach(s=>s.classList.remove("m14-visible"));
  document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.toggle("active",b.dataset.target==="m13Dashboard"));
  window.scrollTo({top:0,behavior:"smooth"});
}
function m14ShowView(target){
  const config=M14_VIEWS[target];
  if(!config){m14ShowDashboard();return}
  document.getElementById("m13Dashboard").style.display="none";
  document.getElementById("m14WorkingPlanner")?.classList.add("view-active");
  document.getElementById("m14ViewHeader")?.classList.add("active");
  document.getElementById("m14ViewTitle").textContent=config.title;
  document.getElementById("m14ViewSubtitle").textContent=config.subtitle;
  let count=0;
  m14AllPlannerSections().forEach(section=>{
    const visible=config.headings.includes(m14Heading(section));
    section.classList.toggle("m14-visible",visible);
    if(visible)count++;
  });
  let empty=document.getElementById("m14Empty");
  if(!count){
    if(!empty){
      empty=document.createElement("div");empty.id="m14Empty";empty.className="m14-empty";
      document.getElementById("m14WorkingPlanner").prepend(empty);
    }
    empty.textContent="No working sections were found for this view.";
    empty.style.display="";
  }else if(empty){empty.style.display="none"}
  document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.toggle("active",b.dataset.target===target));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("#m13Nav button").forEach(btn=>{
  const fresh=btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh,btn);
  fresh.addEventListener("click",()=>{
    fresh.dataset.target==="m13Dashboard"?m14ShowDashboard():m14ShowView(fresh.dataset.target);
  });
});
document.getElementById("m14BackDashboard")?.addEventListener("click",m14ShowDashboard);


/* ===== Original inline script 05 ===== */
/* ===================== M24 PAYDAY MISSION CONTROL + REGULAR HOLDING CONTRIBUTION ===================== */
function m15Money(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m15Value(id){return Math.max(0,Number(document.getElementById(id)?.value||0))}
function m15Set(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function m15PotPriority(p){return Math.max(1,Math.min(3,Number(p?.priority||2)))}
function m15PotGap(p){return Math.max(0,Number(p?.target||0)-Number(p?.balance||0))}
function m22IsoDate(date){if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "";return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function m22DefaultPayday(){try{return m22IsoDate(getNextPaydayDate())}catch(error){return m22IsoDate(new Date())}}
function m22FreshMission(paydayDate){return {version:22,id:`payday-${paydayDate||m22DefaultPayday()}-${Date.now()}`,paydayDate:paydayDate||m22DefaultPayday(),inputs:{expected:2100,actual:2100,coreInvestment:1500,lifestyle:250,goalPots:250,houseBoost:0,emergencyBoost:0,extraAllocate:0,strategy:"priority",platform:"ig",extraEdited:false},executed:{},plan:null,completed:false,startedAt:"",completedAt:"",receipt:null}}
function m22EnsureState(){
  if(!Array.isArray(plannerState.paydayHistory))plannerState.paydayHistory=[];
  if(!plannerState.paydayMission||plannerState.paydayMission.version!==22)plannerState.paydayMission=m22FreshMission();
  plannerState.paydayMission.executed=plannerState.paydayMission.executed&&typeof plannerState.paydayMission.executed==="object"?plannerState.paydayMission.executed:{};
  plannerState.paydayMission.inputs={...m22FreshMission(plannerState.paydayMission.paydayDate).inputs,...(plannerState.paydayMission.inputs||{})};
  return plannerState.paydayMission;
}
function m22Save(){if(typeof savePlannerData==="function")savePlannerData();else try{localStorage.setItem("auroraSpendingPlanner",JSON.stringify(plannerState))}catch(error){console.warn(error)}}
function m22Escape(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function m22ShowStatus(message,isError=false){const box=document.getElementById("m22Status");if(!box)return;box.textContent=message;box.classList.toggle("error",Boolean(isError));box.classList.add("show");clearTimeout(window.m22StatusTimer);window.m22StatusTimer=setTimeout(()=>box.classList.remove("show"),5200)}
function m22InputSnapshot(){return {expected:m15Value("m15ExpectedPay"),actual:m15Value("m15ActualPay"),coreInvestment:m15Value("m22CoreInvestment"),lifestyle:m15Value("m22Lifestyle"),goalPots:m15Value("m22GoalPots"),houseBoost:m15Value("m33LiveHouseBoost"),emergencyBoost:m15Value("m33LiveEmergencyBoost"),extraAllocate:m15Value("m15AllocateExtra"),strategy:document.getElementById("m15Strategy")?.value||"priority",platform:document.getElementById("m22InvestmentPlatform")?.value||"ig",extraEdited:Boolean(document.getElementById("m15AllocateExtra")?.dataset.userEdited==="1")}}
function m22SyncHiddenSimulator(inputs){
  const map={simPayInput:inputs.expected,simInvestInput:inputs.coreInvestment,simLifestyleInput:inputs.lifestyle,simGoalsInput:inputs.goalPots};
  Object.entries(map).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)});
}
function m22HydrateInputs(){
  const mission=m22EnsureState(),i=mission.inputs||{};
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??""};
  set("m22PaydayDate",mission.paydayDate||m22DefaultPayday());set("m15ExpectedPay",i.expected);set("m15ActualPay",i.actual);set("m22CoreInvestment",i.coreInvestment);set("m22Lifestyle",i.lifestyle);set("m22GoalPots",i.goalPots);set("m33LiveHouseBoost",i.houseBoost||0);set("m33LiveEmergencyBoost",i.emergencyBoost||0);set("m15AllocateExtra",i.extraAllocate);set("m15Strategy",i.strategy);set("m22InvestmentPlatform",i.platform);
  const extra=document.getElementById("m15AllocateExtra");if(extra)extra.dataset.userEdited=i.extraEdited?"1":"0";
  m22SyncHiddenSimulator(i);
}
function m22BillProtection(paydayDate){
  const items=typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(paydayDate):[];
  const bills=items.reduce((sum,item)=>sum+Number((item._cashAmount??item.amount)||0),0);
  const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false).reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)-Number(item.spentThisCycle||0)),0);
  const minimum=Math.max(0,Number(plannerState.minimumBuffer||0));
  const holding=Math.max(0,Number(plannerState.holdingBalance||0));
  const required=minimum+bills+recurring;
  return {items,bills,recurring,minimum,holding,required,topUp:Math.max(0,required-holding)};
}
function m24RegularHoldingContribution(){
  const scheduled=(plannerState.scheduledBills||[]).filter(item=>item?.included!==false);
  const future=(plannerState.futureCosts||[]).filter(item=>item?.included!==false);
  const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false);
  const yearly=(plannerState.yearlyRecurringCosts||[]).filter(item=>item?.included!==false);
  const includedTotal=scheduled.reduce((sum,item)=>sum+Number(item.amount||0),0)
    + future.reduce((sum,item)=>sum+Number(item.amount||0),0)
    + recurring.reduce((sum,item)=>sum+(Number(item.amount||0)*12),0)
    + yearly.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const plannedPaid=scheduled.filter(item=>item.paid).reduce((sum,item)=>sum+Number(item.amount||0),0);
  const actualPaid=scheduled.filter(item=>item.paid).reduce((sum,item)=>sum+Number(item.actualPaid||0),0);
  const recurringReleased=recurring.reduce((sum,item)=>{
    const original=Number(item.originalAmount??item.amount??0);
    const current=Number(item.amount||0);
    return sum+(current<original?(original-current)*12:0);
  },0);
  const released=Math.max(0,plannedPaid-actualPaid)+Math.max(0,recurringReleased);
  const deficit=Math.max(0,includedTotal-Number(plannerState.holdingBalance||0)-released);
  return Math.max(0,deficit/13);
}
function m22PotCandidates(excludeIds=[]){
  const excluded=new Set(excludeIds.map(String));
  return (Array.isArray(plannerState.editablePots)?plannerState.editablePots:[]).map(p=>({...p,gap:m15PotGap(p),priority:m15PotPriority(p)})).filter(p=>p.gap>0&&!excluded.has(String(p.id||"")));
}
function m22BuildPotActions(amount,strategy,prefix="goal",excludeIds=[]){
  let remaining=Math.max(0,Number(amount||0));const actions=[];const pots=m22PotCandidates(excludeIds);
  const push=(p,value,meta)=>{const actual=Math.max(0,Math.min(remaining,value,p.gap-actions.filter(a=>a.potId===p.id).reduce((s,a)=>s+a.amount,0)));if(actual<=0)return;actions.push({id:`${prefix}:pot:${p.id||p.name}`,name:p.name,amount:actual,type:"pot",potId:p.id||p.name,meta});remaining-=actual};
  if(strategy==="balanced"){
    let active=[...pots].sort((a,b)=>a.priority-b.priority||b.gap-a.gap);
    while(remaining>.009&&active.length){const share=remaining/active.length,next=[];active.forEach(p=>{const used=actions.filter(a=>a.potId===p.id).reduce((s,a)=>s+a.amount,0);const need=Math.max(0,p.gap-used);const value=Math.min(share,need,remaining);if(value>0){actions.push({id:`${prefix}:pot:${p.id||p.name}`,name:p.name,amount:value,type:"pot",potId:p.id||p.name,meta:`P${p.priority} • balanced funding • ${m15Money(p.gap)} gap`});remaining-=value}if(need-value>.009)next.push(p)});if(next.length===active.length&&share<.01)break;active=next}
  }else{
    const maxPriority=strategy==="critical"?1:3;
    pots.filter(p=>p.priority<=maxPriority).sort((a,b)=>a.priority-b.priority||b.gap-a.gap).forEach(p=>push(p,p.gap,`P${p.priority} ${p.priority===1?"Critical":p.priority===2?"Important":"Flexible"} • ${m15Money(p.gap)} target gap`));
  }
  const merged=[];const byId=new Map();actions.forEach(action=>{if(byId.has(action.id)){byId.get(action.id).amount+=action.amount}else{const copy={...action};byId.set(copy.id,copy);merged.push(copy)}});
  return {actions:merged,remaining};
}
function m22InvestmentActions(amount,platform,prefix="core"){
  const total=Math.max(0,Number(amount||0));if(total<=.009)return [];
  if(platform==="split"){const first=Math.round(total*50)/100;return [{id:`${prefix}:investment:ig`,name:"IG ISA",amount:first,type:"investment",meta:"Investment transfer • 50% split"},{id:`${prefix}:investment:t212`,name:"Trading 212 ISA",amount:total-first,type:"investment",meta:"Investment transfer • 50% split"}]}
  const name=platform==="t212"?"Trading 212 ISA":"IG ISA";return [{id:`${prefix}:investment:${platform}`,name,amount:total,type:"investment",meta:prefix==="core"?"Core payday share contribution":"Extra pay routed to investments"}]
}

function m33FindSpecialPot(kind){
  const pots=Array.isArray(plannerState.editablePots)?plannerState.editablePots:[];
  const words=kind==="house"?["house","home","renovation","project"]:["emergency","rainy","safety","reserve"];
  return pots.find(p=>words.some(word=>String(p?.name||"").toLowerCase().includes(word)))||null;
}
function m33BuildSpecialPotAction(amount,kind,prefix="regular"){
  const requested=Math.max(0,Number(amount||0));if(requested<=.009)return {actions:[],unused:0,used:0};
  const pot=m33FindSpecialPot(kind);if(!pot)return {actions:[],unused:requested,used:0};
  const gap=m15PotGap(pot);const used=Math.min(requested,gap);
  if(used<=.009)return {actions:[],unused:requested,used:0};
  const label=kind==="house"?"House Pot":"Emergency Fund";
  return {actions:[{id:`${prefix}:pot:${pot.id||pot.name}`,name:pot.name||label,amount:used,type:"pot",potId:pot.id||pot.name,meta:`Scenario priority boost • ${m15Money(gap)} target gap`}],unused:Math.max(0,requested-used),used};
}

function m22ComputePlan(){
  const mission=m22EnsureState();const inputs=m22InputSnapshot();const protection=m22BillProtection(mission.paydayDate);
  const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);
  let available=actual;const actions=[];
  const urgentHoldingAmount=Math.min(protection.topUp,available);if(urgentHoldingAmount>.009){actions.push({id:"holding:protection",name:"Holding Pot urgent protection",amount:urgentHoldingAmount,type:"holding",holdingKind:"urgent",meta:`Immediate cover for ${m15Money(protection.minimum)} buffer + ${m15Money(protection.bills)} bills + ${m15Money(protection.recurring)} monthly spending`});available-=urgentHoldingAmount}
  const regularHoldingTarget=m24RegularHoldingContribution();
  const regularHoldingAmount=Math.min(regularHoldingTarget,available);if(regularHoldingAmount>.009){actions.push({id:"holding:regular",name:"Holding Pot regular contribution",amount:regularHoldingAmount,type:"holding",holdingKind:"regular",meta:`Long-range planner funding across 13 four-weekly paydays • dashboard move ${m15Money(regularHoldingTarget)}`});available-=regularHoldingAmount}
  let regularBudget=available;
  let lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
  let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
  const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
  const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
  const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
  const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
  const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
  if(lifestyle>.009){actions.push({id:"regular:lifestyle",name:"Spending Pot",amount:lifestyle,type:"lifestyle",potId:"spending_pot",meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:"Four-week lifestyle allocation"});regularBudget-=lifestyle}
  const houseResult=m33BuildSpecialPotAction(houseBoost,"house","regular");actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
  const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,"emergency","regular");actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
  const goalResult=m22BuildPotActions(goals,"priority","regular",["spending_pot",...(houseResult.actions.map(a=>a.potId)),...(emergencyResult.actions.map(a=>a.potId))]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,a)=>sum+a.amount,0);
  const coreActions=m22InvestmentActions(core,inputs.platform,"core");actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,a)=>sum+a.amount,0);
  available=Math.max(0,regularBudget);
  const extraAvailable=Math.min(extra,available);const extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
  if(extraRemaining>.009){
    if(inputs.strategy==="isa"){const invest=m22InvestmentActions(extraRemaining,inputs.platform,"extra");actions.push(...invest);extraRemaining=0}
    else{const extraResult=m22BuildPotActions(extraRemaining,inputs.strategy,"extra",["spending_pot"]);actions.push(...extraResult.actions);extraRemaining=extraResult.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}}
    available-=extraRequested;
  }
  const buffered=Math.max(0,available);if(buffered>.009)actions.push({id:"buffer:retained",name:"Keep buffered",amount:buffered,type:"buffer",meta:"Leave uncommitted in the payday account until the cycle settles"});
  const planned=actions.reduce((sum,a)=>sum+a.amount,0);
  const unresolvedProtection=Math.max(0,protection.topUp-urgentHoldingAmount);
  const unresolvedRegularHolding=Math.max(0,regularHoldingTarget-regularHoldingAmount);
  const holdingAmount=urgentHoldingAmount+regularHoldingAmount;
  return {logicVersion:25,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,expected,actual,extra,shortfall,holdingAmount,urgentHoldingAmount,regularHoldingTarget,regularHoldingAmount,lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,unresolvedProtection,unresolvedRegularHolding,actions,planned,buffered};
}
function m22CurrentPlan(){const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==25&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;return mission.plan||m22ComputePlan()}
function m22AnyExecuted(){return Object.keys(m22EnsureState().executed||{}).length>0}
function m22ActionDone(action){const record=m22EnsureState().executed?.[action.id];return Boolean(record&&Math.abs(Number(record.amount||0)-Number(action.amount||0))<.011)}
function m22ExecutedTotal(plan){return plan.actions.reduce((sum,a)=>sum+(m22ActionDone(a)?a.amount:0),0)}
function m22FindPot(action){const pots=Array.isArray(plannerState.editablePots)?plannerState.editablePots:[];return pots.find(p=>String(p.id||p.name)===String(action.potId||action.name))||pots.find(p=>String(p.name||"").toLowerCase()===String(action.name||"").toLowerCase())}
function m22ExecuteAction(actionId){
  const mission=m22EnsureState();if(mission.completed)return;
  if(!mission.plan)mission.plan=m22ComputePlan();const action=mission.plan.actions.find(a=>a.id===actionId);if(!action||m22ActionDone(action))return;
  if(action.type==="holding")plannerState.holdingBalance=Number(plannerState.holdingBalance||0)+Number(action.amount||0);
  else if(action.type==="lifestyle"||action.type==="pot"){
    let pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);
    if(!pot){m22ShowStatus(`Aurora could not find ${action.name}. Open Pot Health and make sure the pot still exists.`,true);return}
    pot.balance=Number(pot.balance||0)+Number(action.amount||0);
  }
  mission.startedAt=mission.startedAt||new Date().toISOString();mission.executed[action.id]={amount:Number(action.amount||0),name:action.name,type:action.type,at:new Date().toISOString()};
  m22Save();const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);
  if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${m15Money(action.amount)} completed: ${action.name}.`);m22Render();if(typeof m13Render==="function")m13Render();
}
function m22SetInputsLocked(locked){document.querySelectorAll("#m22InputGrid input,#m22InputGrid select").forEach(el=>{el.disabled=locked;el.closest(".m22-field")?.classList.toggle("locked",locked)});document.getElementById("m15UseFullExtra").disabled=locked;document.getElementById("m15UseHalfExtra").disabled=locked;document.getElementById("m22ResetMission").disabled=locked}
function m22Instruction(plan){
  const el=document.getElementById("m15Instruction");if(!el)return;
  if(plan.unresolvedProtection>.009){el.className="m22-callout risk";el.innerHTML=`Actual pay cannot fully cover the urgent Holding Pot requirement. The plan is still short by <strong>${m15Money(plan.unresolvedProtection)}</strong>, so flexible pots and investing have been reduced first.`;return}
  if(plan.unresolvedRegularHolding>.009){el.className="m22-callout risk";el.innerHTML=`Urgent bills are protected, but this wage cannot fully make the regular Holding Pot contribution. <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> remains unfunded after prioritising essential protection.`;return}
  if(plan.shortfall>.009){el.className="m22-callout watch";el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora has still reserved <strong>${m15Money(plan.regularHoldingAmount)}</strong> for the regular Holding Pot contribution, then reduced lifestyle by <strong>${m15Money(plan.lifestyleCut)}</strong>, goal pots by <strong>${m15Money(plan.goalsCut)}</strong> and shares by <strong>${m15Money(plan.coreCut)}</strong>.`;return}
  if(plan.extra>.009){el.className="m22-callout good";el.innerHTML=`You received <strong>${m15Money(plan.extra)} extra</strong>. Aurora has protected the Holding Pot first, followed your chosen live allocations, and left any money not assigned to a transfer safely buffered in the current account.`;return}
  el.className="m22-callout good";el.innerHTML=`Normal payday plan ready. Aurora has included <strong>${m15Money(plan.regularHoldingAmount)}</strong> regular Holding Pot funding before lifestyle, goal pots, shares and the final buffer.`;
}
function m22RenderHistory(){const host=document.getElementById("m22History");if(!host)return;const history=(plannerState.paydayHistory||[]).slice(-6).reverse();host.innerHTML=history.length?history.map(item=>`<div class="m22-history-row"><span>${m22Escape(dateLabel(item.paydayDate))}</span><strong>${m22Escape(item.summary||"Payday completed")}</strong><strong>${m15Money(item.actualPay||0)}</strong></div>`).join(""):'<div class="m22-empty">No completed payday receipts yet.</div>'}
function m22RenderReceipt(){const host=document.getElementById("m22Receipt"),mission=m22EnsureState();if(!host)return;if(!mission.completed||!mission.receipt){host.classList.remove("show");host.innerHTML="";return}const r=mission.receipt;host.innerHTML=`<h3>✅ Payday completed — ${m22Escape(dateLabel(r.paydayDate))}</h3><div class="m22-receipt-grid"><div class="m22-receipt-item"><span>Actual pay</span><strong>${m15Money(r.actualPay)}</strong></div><div class="m22-receipt-item"><span>Urgent Holding top-up</span><strong>${m15Money(r.urgentHolding||0)}</strong></div><div class="m22-receipt-item"><span>Regular Holding funding</span><strong>${m15Money(r.regularHolding||0)}</strong></div><div class="m22-receipt-item"><span>Total added to Holding</span><strong>${m15Money(r.holdingAdded)}</strong></div><div class="m22-receipt-item"><span>Pots funded</span><strong>${m15Money(r.potsFunded)}</strong></div><div class="m22-receipt-item"><span>Shares transferred</span><strong>${m15Money(r.invested)}</strong></div><div class="m22-receipt-item"><span>Kept buffered</span><strong>${m15Money(r.buffered)}</strong></div><div class="m22-receipt-item"><span>Closing Holding Pot</span><strong>${m15Money(r.closingHolding)}</strong></div><div class="m22-receipt-item"><span>Moves completed</span><strong>${r.actionCount}</strong></div><div class="m22-receipt-item"><span>Completed at</span><strong>${m22Escape(new Date(r.completedAt).toLocaleString("en-GB"))}</strong></div></div>`;host.classList.add("show")}
function m22Render(){
  if(typeof plannerState==="undefined")return;const mission=m22EnsureState();const plan=m22CurrentPlan();const locked=Boolean(mission.plan||m22AnyExecuted()||mission.completed);const executed=m22ExecutedTotal(plan),remaining=Math.max(0,plan.planned-executed),doneCount=plan.actions.filter(m22ActionDone).length,totalCount=plan.actions.length,pct=totalCount?Math.round(doneCount/totalCount*100):0;
  mission.inputs=plan.inputs;m22SyncHiddenSimulator(plan.inputs);
  m15Set("m15SumExpected",m15Money(plan.expected));m15Set("m15SumActual",m15Money(plan.actual));m15Set("m15SumExtra",m15Money(plan.extra));m15Set("m22SumShortfall",m15Money(plan.shortfall));m15Set("m15SumHolding",m15Money(plan.holdingAmount));m15Set("m15SumAvailable",m15Money(plan.actual));
  m15Set("m22MinimumBuffer",m15Money(plan.protection.minimum));m15Set("m22BillsReserve",m15Money(plan.protection.bills));m15Set("m22RecurringReserve",m15Money(plan.protection.recurring));m15Set("m22HoldingRequirement",m15Money(plan.protection.required));m15Set("m22HoldingNow",m15Money(plan.protection.holding));m15Set("m22UrgentHolding",m15Money(plan.urgentHoldingAmount));m15Set("m22RegularHolding",m15Money(plan.regularHoldingAmount));
  m15Set("m22WalletTotal",m15Money(plan.planned));m15Set("m22WalletExecuted",m15Money(executed));m15Set("m22WalletRemaining",m15Money(remaining));m15Set("m22WalletBuffered",m15Money(plan.buffered));m15Set("m15AllocationTotal",`${m15Money(plan.planned)} planned`);
  const progress=document.getElementById("m22ProgressFill");if(progress)progress.style.width=`${pct}%`;m15Set("m22ProgressText",`${doneCount} of ${totalCount} moves completed`);m15Set("m22LockText",mission.completed?"Payday completed":locked?"Plan locked during execution":"Plan editable until first move");m15Set("m22MissionBadge",mission.completed?"PAYDAY COMPLETE":locked?"EXECUTION LIVE":"DRAFT PLAN");
  m22Instruction(plan);m22SetInputsLocked(locked);
  const list=document.getElementById("m15AllocationList");
  if(list){
    if(plan.actions.length){
      list.innerHTML=plan.actions.map(action=>{
        const done=m22ActionDone(action);
        const rowClass=done?"done":"";
        const check=done?"✓":"○";
        const disabled=done||mission.completed?"disabled":"";
        const buttonLabel=done?"Completed ✓":"Complete move";
        return `<div class="m22-action-row ${rowClass}"><div class="m22-check">${check}</div><div><div class="m22-action-name">${m22Escape(action.name)}</div><div class="m22-action-meta">${m22Escape(action.meta)}</div></div><div class="m22-action-amount">${m15Money(action.amount)}</div><button class="m22-execute-btn" type="button" data-m22-execute="${m22Escape(action.id)}" ${disabled}>${buttonLabel}</button></div>`;
      }).join("");
    }else{
      list.innerHTML='<div class="m22-empty">No payday moves were created. Check the pay and allocation inputs.</div>';
    }
  }
  const route=document.getElementById("m15Route");if(route)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${m22Escape(a.name)}</div><div class="m22-step-meta">${m22Escape(a.meta)}</div></div><div class="m22-step-amount">${m15Money(a.amount)}</div></div>`).join("");
  const complete=document.getElementById("m22CompletePayday");if(complete)complete.disabled=mission.completed||!totalCount||doneCount!==totalCount;const reset=document.getElementById("m22ResetMission");if(reset)reset.style.display=mission.completed?"none":"";const next=document.getElementById("m22NewMission");if(next)next.style.display=mission.completed?"":"none";
  m15Set("m33PlannedTotal",m15Money(plan.planned));m15Set("m33ExpectedMirror",m15Money(plan.expected));m15Set("m33ActualMirror",m15Money(plan.actual));m15Set("m33ExtraMirror",m15Money(plan.extra));m15Set("m33ShortfallMirror",m15Money(plan.shortfall));m15Set("m33RetainedMirror",m15Money(plan.buffered));m15Set("m33LivePayNote",plan.extra>.009?`${m15Money(plan.extra)} above expected`:plan.shortfall>.009?`${m15Money(plan.shortfall)} below expected`:"Wage matches expectation");
  m22RenderReceipt();m22RenderHistory();m22Save();if(typeof m13Render==="function")m13Render();if(typeof m33RenderScenario==="function")m33RenderScenario();
}
function m15Render(){m22Render()}
function m22InputChanged(event){const mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed)return;if(event?.target?.id==="m15AllocateExtra")event.target.dataset.userEdited="1";if(event?.target?.id==="m15ActualPay"||event?.target?.id==="m15ExpectedPay"){const expected=m15Value("m15ExpectedPay"),actual=m15Value("m15ActualPay"),extra=Math.max(0,actual-expected),field=document.getElementById("m15AllocateExtra");if(field&&field.dataset.userEdited!=="1")field.value=extra.toFixed(2)}mission.paydayDate=document.getElementById("m22PaydayDate")?.value||m22DefaultPayday();mission.inputs=m22InputSnapshot();mission.plan=null;m22Save();m22Render()}
function m22CompletePayday(){const mission=m22EnsureState(),plan=m22CurrentPlan();if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus("Complete every payday move before closing the mission.",true);return}const sumType=type=>plan.actions.filter(a=>a.type===type).reduce((s,a)=>s+a.amount,0);const sumHoldingKind=kind=>plan.actions.filter(a=>a.type==="holding"&&a.holdingKind===kind).reduce((s,a)=>s+a.amount,0);const potsFunded=plan.actions.filter(a=>a.type==="pot"||a.type==="lifestyle").reduce((s,a)=>s+a.amount,0);const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,urgentHolding:sumHoldingKind("urgent"),regularHolding:sumHoldingKind("regular"),holdingAdded:sumType("holding"),potsFunded,invested:sumType("investment"),buffered:sumType("buffer"),closingHolding:Number(plannerState.holdingBalance||0),actionCount:plan.actions.length,completedAt:new Date().toISOString()};mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${m15Money(receipt.invested)} invested • ${m15Money(receipt.holdingAdded)} to Holding • ${m15Money(receipt.potsFunded)} to pots`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus("Payday completed and saved to local history.");m22Render()}
function m22ResetDraft(){const mission=m22EnsureState();if(m22AnyExecuted()||mission.plan){m22ShowStatus("The plan is locked because execution has started. Complete this payday before starting another.",true);return}plannerState.paydayMission=m22FreshMission(mission.paydayDate||m22DefaultPayday());m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Payday draft reset.")}
function m22StartNextMission(){const current=m22EnsureState();let next=parseLocalDate(current.paydayDate||m22DefaultPayday());next.setDate(next.getDate()+28);plannerState.paydayMission=m22FreshMission(m22IsoDate(next));m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Next payday mission created.")}
function m22CopyPlan(){const plan=m22CurrentPlan(),mission=m22EnsureState();const rows=plan.actions.map((a,i)=>`${i+1}. ${a.name}: ${m15Money(a.amount)}${m22ActionDone(a)?" — completed":""}`);const text=`Aurora Payday Mission Control
Payday: ${dateLabel(mission.paydayDate)}
Expected: ${m15Money(plan.expected)}
Actual: ${m15Money(plan.actual)}
Bills protected: ${m15Money(plan.protection.bills)}

${rows.join("\n")}`;navigator.clipboard?.writeText(text).then(()=>{const b=document.getElementById("m15CopyPlan");if(b){b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy Payday Plan",1300)}}).catch(()=>m22ShowStatus("Copy was blocked by the browser.",true))}
document.addEventListener("click",event=>{const execute=event.target.closest("[data-m22-execute]");if(execute){m22ExecuteAction(execute.dataset.m22Execute);return}});
document.querySelectorAll("#m22InputGrid input,#m22InputGrid select").forEach(el=>el.addEventListener(el.tagName==="SELECT"||el.type==="date"?"change":"input",m22InputChanged));
document.getElementById("m15UseFullExtra")?.addEventListener("click",()=>{const extra=Math.max(0,m15Value("m15ActualPay")-m15Value("m15ExpectedPay")),f=document.getElementById("m15AllocateExtra");f.value=extra.toFixed(2);f.dataset.userEdited="1";m22InputChanged({target:f})});
document.getElementById("m15UseHalfExtra")?.addEventListener("click",()=>{const extra=Math.max(0,m15Value("m15ActualPay")-m15Value("m15ExpectedPay")),f=document.getElementById("m15AllocateExtra");f.value=(extra/2).toFixed(2);f.dataset.userEdited="1";m22InputChanged({target:f})});
document.getElementById("m15CopyPlan")?.addEventListener("click",m22CopyPlan);document.getElementById("m22CompletePayday")?.addEventListener("click",m22CompletePayday);document.getElementById("m22ResetMission")?.addEventListener("click",m22ResetDraft);document.getElementById("m22NewMission")?.addEventListener("click",m22StartNextMission);
window.addEventListener("load",()=>{m22HydrateInputs();m22Render()});


/* ===== Original inline script 06 ===== */
/* ===================== M33 PAYDAY SCENARIO LAB ===================== */
const m33ScenarioState={mode:"overtime",initialised:false,userEdited:false};
function m33Num(id){return Math.max(0,Number(document.getElementById(id)?.value||0))}
function m33SetValue(id,value){const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)}
function m33LiveBreakdown(plan){
  const result={holding:Number(plan?.holdingAmount||0),lifestyle:0,goals:0,house:0,emergency:0,shares:0,retained:Number(plan?.buffered||0)};
  (plan?.actions||[]).forEach(action=>{
    if(action.type==="lifestyle")result.lifestyle+=Number(action.amount||0);
    else if(action.type==="investment")result.shares+=Number(action.amount||0);
    else if(action.type==="pot"){
      const name=String(action.name||"").toLowerCase();
      if(name.includes("house")||name.includes("home")||name.includes("renovation"))result.house+=Number(action.amount||0);
      else if(name.includes("emergency")||name.includes("rainy")||name.includes("safety"))result.emergency+=Number(action.amount||0);
      else result.goals+=Number(action.amount||0);
    }
  });
  return result;
}
function m33SeedScenario(mode=m33ScenarioState.mode){
  const plan=m22CurrentPlan();const live=m33LiveBreakdown(plan);const expected=Number(plan.expected||2100);const currentExtra=Math.max(0,Number(plan.actual||0)-expected);
  m33ScenarioState.mode=mode;m33ScenarioState.initialised=true;m33ScenarioState.userEdited=false;
  let pay=Number(plan.actual||expected);
  if(mode==="baseline")pay=expected;
  if(mode==="overtime")pay=expected+(currentExtra>0?currentExtra:800);
  m33SetValue("m33ScenarioPay",pay);m33SetValue("m33ScenarioShares",live.shares||Number(plan.inputs?.coreInvestment||0));m33SetValue("m33ScenarioLifestyle",live.lifestyle||Number(plan.inputs?.lifestyle||0));m33SetValue("m33ScenarioGoals",live.goals||Number(plan.inputs?.goalPots||0));m33SetValue("m33ScenarioHouse",live.house||Number(plan.inputs?.houseBoost||0));m33SetValue("m33ScenarioEmergency",live.emergency||Number(plan.inputs?.emergencyBoost||0));
  document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.m33Mode===mode));
  const note=document.getElementById("m33ModeNote");if(note)note.textContent=mode==="baseline"?"Baseline mirrors the expected wage and current allocation priorities.":mode==="overtime"?`Overtime mode starts with ${m15Money(currentExtra>0?currentExtra:800)} above expected pay.`:"Custom mode keeps every value under your control.";
  m33RenderScenario();
}
function m33ComputeScenario(){
  const plan=m22CurrentPlan();const protection=m22BillProtection(m22EnsureState().paydayDate);const pay=m33Num("m33ScenarioPay");
  const urgent=Math.min(protection.topUp,pay);let left=Math.max(0,pay-urgent);const regularTarget=m24RegularHoldingContribution();const regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
  let lifestyle=m33Num("m33ScenarioLifestyle"),goals=m33Num("m33ScenarioGoals"),house=m33Num("m33ScenarioHouse"),emergency=m33Num("m33ScenarioEmergency"),shares=m33Num("m33ScenarioShares");
  let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-left);
  const trim=(key)=>{const cut=Math.min(key.value,deficit);key.value-=cut;deficit-=cut;return cut};
  const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
  const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
  const allocated=urgent+regular+lifestyle+goals+house+emergency+shares;const retained=Math.max(0,pay-allocated);const unresolved=Math.max(0,protection.topUp-urgent)+Math.max(0,regularTarget-regular);
  let state="healthy",label="HEALTHY";if(unresolved>.009){state="risk";label="UNPROTECTED"}else if(Object.values(cuts).reduce((a,b)=>a+b,0)>.009){state="risk";label="AUTO-REDUCED"}else if(retained<100){state="tight";label="TIGHT"}
  const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/pay*100||0)-(Object.values(cuts).reduce((a,b)=>a+b,0)/(pay||1)*60)-(retained<100?(100-retained)/2:0))));
  return {plan,pay,urgent,regular,protection:urgent+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,cuts,state,label,score};
}
function m33Diff(value){const n=Number(value||0);return `${n>0?"+":n<0?"−":""}${m15Money(Math.abs(n))}`}
function m33RenderScenario(){
  if(!document.getElementById("m33ScenarioPay"))return;
  if(!m33ScenarioState.initialised){m33SeedScenario("overtime");return}
  const scenario=m33ComputeScenario(),live=m33LiveBreakdown(scenario.plan);
  const verdict=document.getElementById("m33ScenarioVerdict");if(verdict)verdict.dataset.state=scenario.state;
  m15Set("m33ScenarioStatus",scenario.label);m15Set("m33ScenarioScore",String(scenario.score));m15Set("m33ScenarioProtection",m15Money(scenario.protection));m15Set("m33ScenarioAllocated",m15Money(scenario.allocated));m15Set("m33ScenarioRetained",m15Money(scenario.retained));
  const categories=[
    ["Holding protection","holding",scenario.protection],
    ["Spending Pot","lifestyle",scenario.lifestyle],
    ["Other goal pots","goals",scenario.goals],
    ["House Pot","house",scenario.house],
    ["Emergency Fund","emergency",scenario.emergency],
    ["Shares","shares",scenario.shares],
    ["Retained","retained",scenario.retained]
  ];
  const stack=document.getElementById("m33AllocationStack");if(stack){const max=Math.max(1,...categories.map(row=>row[2]));stack.innerHTML=categories.filter(row=>row[2]>.009).map(([label,key,value])=>`<div class="m33-stack-row"><span>${m22Escape(label)}</span><div class="m33-stack-track"><div class="m33-stack-fill" style="width:${Math.max(3,value/max*100).toFixed(1)}%"></div></div><strong>${m15Money(value)}</strong></div>`).join("")}
  const body=document.getElementById("m33ComparisonBody");if(body)body.innerHTML=categories.map(([label,key,value])=>{const difference=value-Number(live[key]||0);const cls=difference>0.009?"pos":difference<-.009?"neg":"zero";return `<div class="m33-compare-row"><span>${m22Escape(label)}</span><span>${m15Money(live[key]||0)}</span><span>${m15Money(value)}</span><span class="m33-change ${cls}">${m33Diff(difference)}</span></div>`}).join("");
  const liveRetained=Number(live.retained||0),retainedChange=scenario.retained-liveRetained;m15Set("m33ScenarioDifference",`${m33Diff(retainedChange)} retained`);
  const cutTotal=Object.values(scenario.cuts).reduce((a,b)=>a+b,0);const insight=document.getElementById("m33ScenarioInsight");if(insight){
    if(scenario.unresolved>.009)insight.innerHTML=`<strong>Protection warning:</strong> this wage is ${m15Money(scenario.unresolved)} short of the Holding Pot requirement. Aurora would stop flexible funding before allowing the mission to close.`;
    else if(cutTotal>.009)insight.innerHTML=`<strong>Overallocated:</strong> Aurora automatically removed ${m15Money(cutTotal)} from flexible allocations so the scenario cannot spend more than the wage received.`;
    else if(scenario.retained<100)insight.innerHTML=`<strong>Tight finish:</strong> the plan works, but only ${m15Money(scenario.retained)} remains in the current account. A larger retained cushion would make the cycle safer.`;
    else if(retainedChange>100)insight.innerHTML=`<strong>Stronger buffer:</strong> this scenario keeps ${m15Money(retainedChange)} more in the current account than the live plan while protecting every required move.`;
    else if(scenario.shares>live.shares)insight.innerHTML=`<strong>Investment opportunity:</strong> shares rise by ${m15Money(scenario.shares-live.shares)} and the plan still retains ${m15Money(scenario.retained)}.`;
    else insight.innerHTML=`<strong>Balanced scenario:</strong> every required protection move is covered and ${m15Money(scenario.retained)} remains uncommitted.`;
  }
  const apply=document.getElementById("m33ApplyScenario"),mission=m22EnsureState();if(apply){const locked=Boolean(mission.plan||m22AnyExecuted()||mission.completed);apply.disabled=locked;apply.textContent=locked?"Live Plan Locked":"Apply Scenario to Live Plan"}
}
function m33ShowApply(message,error=false){const box=document.getElementById("m33ApplyStatus");if(!box)return;box.textContent=message;box.className=`m33-apply-status show${error?" error":""}`;clearTimeout(window.m33ApplyTimer);window.m33ApplyTimer=setTimeout(()=>box.classList.remove("show"),4800)}
function m33ApplyScenario(){
  const mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed){m33ShowApply("The live mission is locked because execution has started.",true);return}
  const scenario=m33ComputeScenario();
  m33SetValue("m15ActualPay",scenario.pay);m33SetValue("m22CoreInvestment",scenario.shares);m33SetValue("m22Lifestyle",scenario.lifestyle);m33SetValue("m22GoalPots",scenario.goals);m33SetValue("m33LiveHouseBoost",scenario.house);m33SetValue("m33LiveEmergencyBoost",scenario.emergency);m33SetValue("m15AllocateExtra",0);
  const extra=document.getElementById("m15AllocateExtra");if(extra)extra.dataset.userEdited="1";
  mission.inputs=m22InputSnapshot();mission.plan=null;m22Save();m22Render();m33ShowApply("Scenario applied. The left-hand live mission has been rebuilt and is ready for review.");
}
document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.addEventListener("click",()=>m33SeedScenario(btn.dataset.m33Mode)));
document.querySelectorAll("#m33ScenarioPay,#m33ScenarioShares,#m33ScenarioLifestyle,#m33ScenarioGoals,#m33ScenarioHouse,#m33ScenarioEmergency").forEach(input=>input.addEventListener("input",()=>{m33ScenarioState.mode="custom";m33ScenarioState.userEdited=true;document.querySelectorAll("[data-m33-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.m33Mode==="custom"));const note=document.getElementById("m33ModeNote");if(note)note.textContent="Custom mode keeps every value under your control.";m33RenderScenario()}));
document.getElementById("m33ResetScenario")?.addEventListener("click",()=>m33SeedScenario("overtime"));document.getElementById("m33ApplyScenario")?.addEventListener("click",m33ApplyScenario);
window.addEventListener("load",()=>setTimeout(()=>m33SeedScenario("overtime"),40));


/* ===== Original inline script 07 ===== */
/* ===================== M16 ALL TAB VIEW BUILDER ===================== */
const M16_VIEW_DATA = {
  m13Bills:{
    eyebrow:"CASH-FLOW OPERATIONS",
    title:"Bills & Spending Centre",
    copy:"Manage every outgoing, record actual spending and keep the Holding Pot forecast accurate.",
    status:"BILL CONTROL LIVE",
    note:"Only included and unpaid entries with valid dates affect the before-payday forecast. Marking a bill paid immediately updates the dashboard.",
    kpis:()=>[
      ["Unpaid scheduled",m16Money(m16UnpaidTotal()),"#fb7185"],
      ["Due before payday",m16Money(m16BeforePaydayTotal()),"#fbbf24"],
      ["Payments remaining",String(m16BeforePaydayItems().length),"#22d3ee"],
      ["Projected balance",m16Money(Number(plannerState?.holdingBalance||0)-m16BeforePaydayTotal()),"#34d399"]
    ]
  },
  m13PotHealth:{
    eyebrow:"SAVINGS SQUAD MANAGEMENT",
    title:"Pot Health Centre",
    copy:"See which pots are critical, which are on track and where the next available money should be directed.",
    status:"POT RADAR LIVE",
    note:"Pot priority controls the suggested funding order: P1 Critical first, then P2 Important, followed by P3 Flexible.",
    kpis:()=>{
      const pots=Array.isArray(plannerState?.editablePots)?plannerState.editablePots:[];
      const total=pots.reduce((s,p)=>s+Number(p.balance||0),0);
      const target=pots.reduce((s,p)=>s+Number(p.target||0),0);
      const gap=Math.max(0,target-total);
      const critical=pots.filter(p=>Number(p.priority||2)===1&&Number(p.balance||0)<Number(p.target||0)).length;
      return [
        ["Total pot balances",m16Money(total),"#22d3ee"],
        ["Combined targets",m16Money(target),"#a78bfa"],
        ["Remaining funding gap",m16Money(gap),"#fbbf24"],
        ["Critical pots below target",String(critical),"#fb7185"]
      ]
    }
  },
  m13Funding:{
    eyebrow:"SURPLUS ROUTING ENGINE",
    title:"Funding & Growth Centre",
    copy:"Turn genuine surplus into a controlled route across buffers, pots and long-term investing.",
    status:"ROUTING ENGINE LIVE",
    note:"Aurora should only route money after the Holding Pot, unpaid bills and recurring monthly commitments have been protected.",
    kpis:()=>{
      const holding=Number(plannerState?.holdingBalance||0);
      const protectedValue=m16Protected();
      const surplus=Math.max(0,holding-protectedValue);
      const min=Number(plannerState?.minimumBuffer||0);
      return [
        ["Holding Pot",m16Money(holding),"#22d3ee"],
        ["Protection requirement",m16Money(protectedValue),"#fbbf24"],
        ["True surplus",m16Money(surplus),"#34d399"],
        ["Minimum buffer",m16Money(min),"#a78bfa"]
      ]
    }
  },
  m13History:{
    eyebrow:"FINANCIAL RECORDS",
    title:"History & Breakdown Centre",
    copy:"Review completed spending, compare categories and follow changes in the Holding Pot over time.",
    status:"RECORDS READY",
    note:"The full House Project Ledger now lives only in Pot Health. House payments still feed the history totals and breakdowns automatically.",
    kpis:()=>{
      const hist=Array.isArray(plannerState?.holdingHistory)?plannerState.holdingHistory:[];
      const current=Number(plannerState?.holdingBalance||0);
      const first=hist.length?Number(hist[0]?.balance||hist[0]?.value||0):current;
      const change=current-first;
      const scheduledPaid=(plannerState?.scheduledBills||[]).filter(x=>x?.paid).reduce((s,x)=>s+Number(x.amount||0),0);
      const housePaid=(plannerState?.houseProjectLedger?.entries||[]).filter(x=>x?.status==='paid'||x?.status==='historical').reduce((s,x)=>s+Number(x.amount||0),0);
      const paid=scheduledPaid+housePaid;
      return [
        ["Current Holding Pot",m16Money(current),"#22d3ee"],
        ["Saved snapshots",String(hist.length),"#60a5fa"],
        ["Recorded paid bills",m16Money(paid),"#fbbf24"],
        ["Balance change",`${change>=0?"+":""}${m16Money(change)}`,change>=0?"#34d399":"#fb7185"]
      ]
    }
  }
};
function m16Money(v){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))}
function m16ValidDate(v){if(!v)return null;const d=typeof parseLocalDate==="function"?parseLocalDate(v):new Date(v);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
function m16BeforePaydayItems(){
  const payday=typeof getNextPaydayDate==="function"?getNextPaydayDate():null;
  return typeof m23ExpandBeforePayday==="function"?m23ExpandBeforePayday(payday):[];
}
function m16BeforePaydayTotal(){return m16BeforePaydayItems().reduce((s,x)=>s+Number((x._cashAmount??x.amount)||0),0)}
function m16UnpaidTotal(){return (plannerState?.scheduledBills||[]).filter(x=>x&&x.included&&!x.paid).reduce((s,x)=>s+Number(x.amount||0),0)}
function m16Protected(){
  const unpaid=m16UnpaidTotal();
  const recurring=(plannerState?.recurringCosts||[]).filter(x=>x&&x.included).reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.spentThisCycle||0)),0);
  return Number(plannerState?.minimumBuffer||0)+unpaid+recurring;
}
function m16ApplyGridClasses(target){
  const planner=document.getElementById("m14WorkingPlanner");
  if(!planner)return;
  planner.classList.add("m16-view-grid");
  const visible=[...planner.querySelectorAll(".section.m14-visible")];
  visible.forEach((section,index)=>{
    section.classList.remove("m16-wide","m16-third");
    const heading=(section.querySelector("h2,.m15-hero h3,.m22-hero h3")?.textContent||"").trim();
    if(target==="m13Bills"&&["Bills Control Centre","Editable Future Costs"].includes(heading))section.classList.add("m16-wide");
    if(target==="m13PotHealth"&&heading==="Pot Health Radar")section.classList.add("m16-wide");
    if(target==="m13HouseProject")section.classList.add("m16-wide");
    if(target==="m13Funding"&&["Financial Freedom Flight Path","Funding Engine"].includes(heading))section.classList.add("m16-wide");
    if(target==="m13History")section.classList.add("m16-wide");
    if(visible.length===3&&!section.classList.contains("m16-wide"))section.classList.add("m16-third");
  });
}
function m16RenderOverview(target){
  const config=M16_VIEW_DATA[target];
  const box=document.getElementById("m16ViewOverview");
  if(!box)return;
  if(!config){box.classList.remove("active");return}
  box.classList.add("active");
  document.getElementById("m16Eyebrow").textContent=config.eyebrow;
  document.getElementById("m16OverviewTitle").textContent=config.title;
  document.getElementById("m16OverviewCopy").textContent=config.copy;
  document.getElementById("m16StatusText").textContent=config.status;
  document.getElementById("m16ViewNote").textContent=config.note;
  document.getElementById("m16Kpis").innerHTML=config.kpis().map(([label,value,color])=>
    `<div class="m16-kpi" style="--c:${color}"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
  m16ApplyGridClasses(target);
}
const m16OriginalShowView=window.m14ShowView;
window.m14ShowView=function(target){
  m16OriginalShowView(target);
  setTimeout(()=>m16RenderOverview(target),0);
};
const m16OriginalShowDashboard=window.m14ShowDashboard;
window.m14ShowDashboard=function(){
  document.getElementById("m16ViewOverview")?.classList.remove("active");
  document.getElementById("m14WorkingPlanner")?.classList.remove("m16-view-grid");
  m16OriginalShowDashboard();
};
document.addEventListener("input",()=>setTimeout(()=>{
  const active=[...document.querySelectorAll("#m13Nav button")].find(b=>b.classList.contains("active"))?.dataset.target;
  if(M16_VIEW_DATA[active])m16RenderOverview(active);
},0));
document.addEventListener("change",()=>setTimeout(()=>{
  const active=[...document.querySelectorAll("#m13Nav button")].find(b=>b.classList.contains("active"))?.dataset.target;
  if(M16_VIEW_DATA[active])m16RenderOverview(active);
},0));


/* ===== Original inline script 08 ===== */
document.addEventListener("click", event => {
  const head = event.target.closest("[data-m18-toggle]");
  if (!head) return;
  const body = document.getElementById(head.dataset.m18Toggle);
  if (body) body.classList.toggle("closed");
});


/* ===== Original inline script 09 ===== */
/* ===================== M19 RECURRING SPEND PAYMENTS ===================== */
function m19Show(message, error=false){
  const box=document.getElementById("m19SpendStatus");
  if(!box)return;
  box.textContent=message;
  box.style.borderColor=error?"rgba(251,113,133,.30)":"rgba(52,211,153,.25)";
  box.style.background=error?"rgba(251,113,133,.07)":"rgba(52,211,153,.06)";
  box.style.color=error?"#ffc2cc":"#c7ffda";
  box.classList.add("show");
  clearTimeout(window.m19StatusTimer);
  window.m19StatusTimer=setTimeout(()=>box.classList.remove("show"),5000);
}
function m19Save(){
  if(typeof savePlannerData==="function")savePlannerData();
}
function m19PayRecurring(index){
  const cost=plannerState.recurringCosts?.[index];
  if(!cost)return;
  const amount=Math.max(0,Number(cost.payAmount||0));
  if(amount<=0){m19Show("Enter the amount actually spent before pressing Pay from Holding Pot.",true);return}
  const holding=Number(plannerState.holdingBalance||0);
  if(amount>holding){m19Show(`The Holding Pot only contains £${formatMoney(holding)}. This payment cannot be recorded yet.`,true);return}

  plannerState.holdingBalance=holding-amount;
  cost.spentThisCycle=Number(cost.spentThisCycle||0)+amount;
  cost.lastPaidDate=new Date().toISOString();
  plannerState.recurringSpendHistory=Array.isArray(plannerState.recurringSpendHistory)?plannerState.recurringSpendHistory:[];
  plannerState.recurringSpendHistory.unshift({
    id:`spend_${Date.now()}`,
    recurringId:cost.id||"",
    name:cost.name,
    category:cost.category||"Other",
    amount,
    date:cost.lastPaidDate
  });

  const holdingInput=document.getElementById("holdingBalanceInput");
  if(holdingInput)holdingInput.value=plannerState.holdingBalance.toFixed(2);
  m19Save();
  if(typeof runPlanner==="function")runPlanner();
  m19Show(`£${formatMoney(amount)} for ${cost.name} has been taken from the Holding Pot. New Holding Pot balance: £${formatMoney(plannerState.holdingBalance)}.`);
}
function m19ResetCycle(index){
  const cost=plannerState.recurringCosts?.[index];
  if(!cost)return;
  cost.spentThisCycle=0;
  cost.payAmount=Number(cost.amount||0);
  m19Save();
  if(typeof runPlanner==="function")runPlanner();
  m19Show(`${cost.name} has been reset for the new monthly/payday cycle.`);
}
document.addEventListener("click",event=>{
  const pay=event.target.closest("[data-m19-pay]");
  if(pay){m19PayRecurring(Number(pay.dataset.m19Pay));return}
  const reset=event.target.closest("[data-m19-reset]");
  if(reset)m19ResetCycle(Number(reset.dataset.m19Reset));
});


/* ===== Original inline script 10 ===== */
/* ===================== M21 AUTO-HIDE MANAGER SIDEBAR ===================== */
(function(){
  const app=document.querySelector('.m13-app');
  const sidebar=document.querySelector('.m13-sidebar');
  const toggle=document.getElementById('m21SidebarToggle');
  const nav=document.getElementById('m13Nav');
  if(!app||!sidebar||!toggle)return;

  const desktopQuery=window.matchMedia('(min-width: 821px)');
  const hoverQuery=window.matchMedia('(hover: hover) and (pointer: fine)');
  let hideTimer=0;

  const isDesktop=()=>desktopQuery.matches;
  const clearHide=()=>{if(hideTimer){window.clearTimeout(hideTimer);hideTimer=0;}};

  function setToggleState(expanded){
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded?'Hide manager sidebar':'Show manager sidebar');
    toggle.title=expanded?'Hide sidebar':'Show sidebar';
  }

  function expandSidebar(){
    if(!isDesktop())return;
    clearHide();
    app.classList.remove('m13-sidebar-collapsed');
    setToggleState(true);
  }

  function collapseSidebar(){
    if(!isDesktop())return;
    clearHide();
    app.classList.add('m13-sidebar-collapsed');
    setToggleState(false);
  }

  function scheduleCollapse(delay=480){
    if(!isDesktop())return;
    clearHide();
    hideTimer=window.setTimeout(collapseSidebar,delay);
  }

  function syncResponsiveState(){
    clearHide();
    if(isDesktop()){
      collapseSidebar();
    }else{
      app.classList.remove('m13-sidebar-collapsed');
      setToggleState(true);
    }
  }

  toggle.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(app.classList.contains('m13-sidebar-collapsed'))expandSidebar();
    else collapseSidebar();
  });

  sidebar.addEventListener('pointerenter',()=>{
    if(hoverQuery.matches)expandSidebar();
  });
  sidebar.addEventListener('pointerleave',()=>{
    if(hoverQuery.matches)scheduleCollapse();
  });
  sidebar.addEventListener('focusin',expandSidebar);
  sidebar.addEventListener('focusout',()=>scheduleCollapse(650));

  nav?.querySelectorAll('button').forEach(button=>{
    const label=button.querySelector('span:last-child')?.textContent?.trim();
    if(label)button.title=label;
    button.addEventListener('click',()=>scheduleCollapse(260));
  });

  document.addEventListener('click',event=>{
    if(!isDesktop()||hoverQuery.matches)return;
    if(!sidebar.contains(event.target))collapseSidebar();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')collapseSidebar();
  });

  if(typeof desktopQuery.addEventListener==='function')desktopQuery.addEventListener('change',syncResponsiveState);
  else if(typeof desktopQuery.addListener==='function')desktopQuery.addListener(syncResponsiveState);

  setToggleState(!app.classList.contains('m13-sidebar-collapsed'));
  window.addEventListener('load',()=>window.setTimeout(syncResponsiveState,180),{once:true});
})();


/* ===== Original inline script 11 ===== */
/* ===================== M25 FINANCIAL CONTROL ENGINE ===================== */
(function(){
  const M25_LOGIC_VERSION=25;
  const m25OriginalExpandBeforePayday=window.m23ExpandBeforePayday;
  const m25OriginalRunPlanner=window.runPlanner;
  const m25OriginalUpdatePlannerTotals=window.updatePlannerTotals;
  const m25OriginalM13Render=window.m13Render;

  function m25Norm(value){return String(value||"").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim()}
  function m25Date(value){if(!value)return null;const d=value instanceof Date?new Date(value):typeof parseLocalDate==="function"?parseLocalDate(value):new Date(value);return d instanceof Date&&!Number.isNaN(d.getTime())?d:null}
  function m25Round(value){return Math.round((Number(value||0)+Number.EPSILON)*100)/100}
  function m25DateKey(record){return record?.due?`${m25Norm(record.name)}|${record.due}`:""}
  function m25SourcePriority(source){return source==="scheduled"?0:source==="yearly"?1:2}
  function m25SourceLabel(source){return source==="scheduled"?"Scheduled Bills":source==="yearly"?"Yearly Costs":"Future Costs"}
  function m25NextScheduledDue(item){
    if(!item?.due)return "";
    if(!item.paid)return item.due;
    const recurrence=String(item.recurrence||"none");
    if(recurrence==="none")return "";
    let next=typeof m20AddRecurrence==="function"?m20AddRecurrence(item.due,recurrence):null;
    const today=new Date();today.setHours(0,0,0,0);let guard=0;
    while(next&&next<today&&guard<120){next=m20AddRecurrence(m22IsoDate(next),recurrence);guard+=1}
    return next?m22IsoDate(next):"";
  }
  window.m25ActiveCostRecords=function(){
    const rows=[];
    (plannerState?.scheduledBills||[]).forEach((item,index)=>{if(!item||item.included===false)return;const due=m25NextScheduledDue(item);if(!due)return;rows.push({source:"scheduled",index,name:String(item.name||"Unnamed scheduled bill"),due,amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    (plannerState?.yearlyRecurringCosts||[]).forEach((item,index)=>{if(!item||item.included===false)return;const due=item.paid?(item.nextRenewalDue||""):(item.due||"");if(!due)return;rows.push({source:"yearly",index,name:String(item.name||"Unnamed yearly cost"),due,amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    (plannerState?.futureCosts||[]).forEach((item,index)=>{if(!item||item.included===false)return;rows.push({source:"future",index,name:String(item.name||"Unnamed future cost"),due:String(item.due||""),amount:Math.max(0,Number(item.amount||0)),category:String(item.category||"Other")})});
    return rows;
  };
  window.m25DuplicateAudit=function(){
    const rows=m25ActiveCostRecords();const exact=[];const potential=[];const exactMap=new Map();
    rows.filter(r=>r.due).forEach(r=>{const key=m25DateKey(r);if(!exactMap.has(key))exactMap.set(key,[]);exactMap.get(key).push(r)});
    exactMap.forEach(group=>{if(group.length>1)exact.push(group.slice().sort((a,b)=>m25SourcePriority(a.source)-m25SourcePriority(b.source)))});
    const exactPairs=new Set(exact.flatMap(group=>group.map(r=>`${r.source}:${r.index}`)));
    const byNameAmount=new Map();rows.forEach(r=>{const key=`${m25Norm(r.name)}|${m25Round(r.amount).toFixed(2)}`;if(!byNameAmount.has(key))byNameAmount.set(key,[]);byNameAmount.get(key).push(r)});
    byNameAmount.forEach(group=>{if(group.length<2)return;const candidates=group.filter(r=>!exactPairs.has(`${r.source}:${r.index}`));if(candidates.length<2)return;let close=false;for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){const a=m25Date(candidates[i].due),b=m25Date(candidates[j].due);if(!a||!b||Math.abs(a-b)<=14*86400000)close=true}if(close)potential.push(candidates)});
    return {rows,exact,potential};
  };
  window.m25CanonicalCostRecords=function(){
    const rows=m25ActiveCostRecords().slice().sort((a,b)=>m25SourcePriority(a.source)-m25SourcePriority(b.source));const seen=new Set();const unique=[];
    rows.forEach(r=>{const key=m25DateKey(r);if(key&&seen.has(key))return;if(key)seen.add(key);unique.push(r)});return unique;
  };
  window.m25BeforePaydayItems=function(paydayValue){
    const base=typeof m25OriginalExpandBeforePayday==="function"?m25OriginalExpandBeforePayday(paydayValue):[];
    const today=new Date();today.setHours(0,0,0,0);const payday=paydayValue instanceof Date?new Date(paydayValue):m25Date(paydayValue);if(!payday)return base;payday.setHours(0,0,0,0);
    const future=(plannerState?.futureCosts||[]).filter(x=>x&&x.included!==false&&x.due).map(x=>({...x,_d:m25Date(x.due),_cashAmount:Number(x.amount||0),_sourceLabel:"Future cost"})).filter(x=>x._d&&x._d>=today&&x._d<payday);
    const combined=[...base,...future].sort((a,b)=>(a._d||m25Date(a.due))-(b._d||m25Date(b.due)));const seen=new Set();
    return combined.filter(item=>{const key=`${m25Norm(item.name)}|${item.due||m22IsoDate(item._d)}`;if(seen.has(key))return false;seen.add(key);return true});
  };
  window.m23ExpandBeforePayday=function(paydayValue){return m25BeforePaydayItems(paydayValue)};

  window.m22BillProtection=function(paydayDate){
    const items=m25BeforePaydayItems(paydayDate);const bills=items.reduce((sum,item)=>sum+Number((item._cashAmount??item.amount)||0),0);
    const recurring=(plannerState.recurringCosts||[]).filter(item=>item?.included!==false).reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)-Number(item.spentThisCycle||0)),0);
    const minimum=Math.max(0,Number(plannerState.minimumBuffer||0));const holding=Math.max(0,Number(plannerState.holdingBalance||0));const required=minimum+bills+recurring;
    return {items,bills,recurring,minimum,holding,required,headroom:Math.max(0,holding-required),topUp:Math.max(0,required-holding)};
  };
  function m25PaydaysRemaining(paydayDate,dueDate){
    const start=m25Date(paydayDate),due=m25Date(dueDate);if(!start||!due||due<start)return 0;start.setHours(0,0,0,0);due.setHours(23,59,59,999);let count=0,cursor=new Date(start),guard=0;while(cursor<=due&&guard<80){count+=1;cursor.setDate(cursor.getDate()+28);guard+=1}return count;
  }
  window.m25SinkingFundPlan=function(paydayValue){
    const payday=m25Date(paydayValue)||m25Date(m22DefaultPayday());const nextPayday=new Date(payday);nextPayday.setDate(nextPayday.getDate()+28);nextPayday.setHours(0,0,0,0);
    const protection=m22BillProtection(payday);let headroom=Math.max(0,protection.headroom);const all=m25CanonicalCostRecords();const unplanned=all.filter(r=>!r.due);
    const eligible=all.filter(r=>{const d=m25Date(r.due);return d&&d>=nextPayday&&r.amount>0}).sort((a,b)=>m25Date(a.due)-m25Date(b.due)||m25SourcePriority(a.source)-m25SourcePriority(b.source));
    const details=eligible.map(r=>{const funded=Math.min(headroom,r.amount);headroom-=funded;const remaining=Math.max(0,r.amount-funded);const paydays=Math.max(1,m25PaydaysRemaining(payday,r.due));const contribution=remaining/paydays;return {...r,fundedFromHeadroom:funded,remaining,paydays,contribution}});
    const totalCommitments=details.reduce((s,r)=>s+r.amount,0);const totalRemaining=details.reduce((s,r)=>s+r.remaining,0);const contribution=m25Round(details.reduce((s,r)=>s+r.contribution,0));
    return {paydayDate:m22IsoDate(payday),nextPayday:m22IsoDate(nextPayday),protection,details,unplanned,totalCommitments,totalRemaining,allocatedHeadroom:details.reduce((s,r)=>s+r.fundedFromHeadroom,0),contribution};
  };
  window.m24RegularHoldingContribution=function(){return m25SinkingFundPlan(m22EnsureState().paydayDate||m22DefaultPayday()).contribution};

  window.m22ComputePlan=function(){
    const mission=m22EnsureState(),inputs=m22InputSnapshot(),protection=m22BillProtection(mission.paydayDate),sinking=m25SinkingFundPlan(mission.paydayDate);
    const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);let available=actual;const actions=[];
    const urgentHoldingAmount=Math.min(protection.topUp,available);if(urgentHoldingAmount>.009){actions.push({id:"holding:protection",name:"Holding Pot urgent protection",amount:urgentHoldingAmount,type:"holding",holdingKind:"urgent",meta:`Immediate cover for ${m15Money(protection.minimum)} buffer + ${m15Money(protection.bills)} payments before payday + ${m15Money(protection.recurring)} monthly spending`});available-=urgentHoldingAmount}
    const regularHoldingTarget=sinking.contribution;const regularHoldingAmount=Math.min(regularHoldingTarget,available);if(regularHoldingAmount>.009){actions.push({id:"holding:regular",name:"Holding Pot due-date contribution",amount:regularHoldingAmount,type:"holding",holdingKind:"regular",meta:`Date-aware sinking funds across ${sinking.details.length} future commitment${sinking.details.length===1?"":"s"} • target ${m15Money(regularHoldingTarget)}`});available-=regularHoldingAmount}
    let regularBudget=available,lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
    let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
    const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
    const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
    const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
    const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
    const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
    if(lifestyle>.009){actions.push({id:"regular:lifestyle",name:"Spending Pot",amount:lifestyle,type:"lifestyle",potId:"spending_pot",meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:"Four-week lifestyle allocation"});regularBudget-=lifestyle}
    const houseResult=m33BuildSpecialPotAction(houseBoost,"house","regular");actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
    const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,"emergency","regular");actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
    const specialIds=[...houseResult.actions,...emergencyResult.actions].map(action=>action.potId);
    const goalResult=m22BuildPotActions(goals,"priority","regular",["spending_pot",...specialIds]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,a)=>sum+a.amount,0);
    const coreActions=m22InvestmentActions(core,inputs.platform,"core");actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,a)=>sum+a.amount,0);available=Math.max(0,regularBudget);
    const extraAvailable=Math.min(extra,available),extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
    if(extraRemaining>.009){if(inputs.strategy==="isa"){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}else{const result=m22BuildPotActions(extraRemaining,inputs.strategy,"extra",["spending_pot",...specialIds]);actions.push(...result.actions);extraRemaining=result.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,"extra"));extraRemaining=0}}available-=extraRequested}
    const buffered=Math.max(0,available);actions.push({id:"buffer:retained",name:"Retain in current account",amount:buffered,type:"buffer",meta:"Money deliberately left in the current account after all planned transfers"});
    const planned=actions.reduce((sum,a)=>sum+a.amount,0);return {logicVersion:M25_LOGIC_VERSION,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,sinking,expected,actual,extra,shortfall,holdingAmount:urgentHoldingAmount+regularHoldingAmount,urgentHoldingAmount,regularHoldingTarget,regularHoldingAmount,lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,unresolvedProtection:Math.max(0,protection.topUp-urgentHoldingAmount),unresolvedRegularHolding:Math.max(0,regularHoldingTarget-regularHoldingAmount),actions,planned,buffered};
  };
  window.m22CurrentPlan=function(){const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==M25_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;return mission.plan||m22ComputePlan()};
  window.m22ActionDone=function(action){return Boolean(m22EnsureState().executed?.[action.id])};
  window.m25ActualForAction=function(action){const r=m22EnsureState().executed?.[action.id];return r?Number(r.actualAmount??r.amount??action.amount):null};
  window.m22ExecutedTotal=function(plan){return plan.actions.reduce((sum,a)=>sum+(m22ActionDone(a)?Number(m25ActualForAction(a)||0):0),0)};
  window.m25Reconciliation=function(plan){
    const outflows=plan.actions.filter(a=>a.type!=="buffer"),buffer=plan.actions.find(a=>a.type==="buffer");
    const completed=outflows.reduce((s,a)=>s+(m22ActionDone(a)?Number(m25ActualForAction(a)||0):0),0);const pending=outflows.reduce((s,a)=>s+(m22ActionDone(a)?0:Number(a.amount||0)),0);
    const retained=buffer?(m22ActionDone(buffer)?Number(m25ActualForAction(buffer)||0):Number(buffer.amount||0)):0;const current=Math.max(0,Number(plan.actual||0)-completed);const difference=Number(plan.actual||0)-completed-pending-retained;
    return {completed,pending,retained,current,difference};
  };
  function m25ActionRow(actionId){return [...document.querySelectorAll("[data-m22-execute]")].find(b=>b.dataset.m22Execute===actionId)?.closest(".m22-action-row")||null}
  window.m22ExecuteAction=function(actionId){
    const mission=m22EnsureState();if(mission.completed)return;if(!mission.plan)mission.plan=m22ComputePlan();const action=mission.plan.actions.find(a=>a.id===actionId);if(!action||m22ActionDone(action))return;
    const row=m25ActionRow(actionId),input=row?.querySelector("[data-m25-actual]");const actual=m25Round(input?Number(input.value):Number(action.amount||0));if(!Number.isFinite(actual)||actual<0){m22ShowStatus("Enter a valid actual amount before completing this move.",true);return}
    const rec=m25Reconciliation(mission.plan);if(action.type!=="buffer"&&actual>rec.current+.011){m22ShowStatus(`Only ${m15Money(rec.current)} remains in the current-account payday balance.`,true);return}
    if(action.type==="holding")plannerState.holdingBalance=Number(plannerState.holdingBalance||0)+actual;else if(action.type==="lifestyle"||action.type==="pot"){const pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);if(!pot){m22ShowStatus(`Aurora could not find ${action.name}. Check the Pot Manager.`,true);return}pot.balance=Number(pot.balance||0)+actual}
    mission.startedAt=mission.startedAt||new Date().toISOString();mission.openingHolding=Number.isFinite(Number(mission.openingHolding))?mission.openingHolding:Number(plannerState.holdingBalance||0)-(action.type==="holding"?actual:0);mission.executed[action.id]={plannedAmount:Number(action.amount||0),actualAmount:actual,amount:actual,name:action.name,type:action.type,at:new Date().toISOString()};
    const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);m22Save();if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${m15Money(actual)} recorded for ${action.name}${Math.abs(actual-action.amount)>.009?` (planned ${m15Money(action.amount)})`:""}.`);m22Render();
  };
  window.m25UndoAction=function(actionId){
    const mission=m22EnsureState(),plan=m22CurrentPlan(),action=plan.actions.find(a=>a.id===actionId),record=mission.executed?.[actionId];if(!action||!record||mission.completed)return;const actual=Number(record.actualAmount??record.amount??0);
    if(action.type==="holding")plannerState.holdingBalance=Math.max(0,Number(plannerState.holdingBalance||0)-actual);else if(action.type==="lifestyle"||action.type==="pot"){const pot=action.type==="lifestyle"?(plannerState.editablePots||[]).find(p=>String(p.id)==="spending_pot")||m22FindPot(action):m22FindPot(action);if(pot)pot.balance=Math.max(0,Number(pot.balance||0)-actual)}
    delete mission.executed[actionId];if(!m22AnyExecuted()){mission.plan=null;mission.startedAt="";delete mission.openingHolding}
    const holdingInput=document.getElementById("holdingBalanceInput");if(holdingInput)holdingInput.value=Number(plannerState.holdingBalance||0).toFixed(2);m22Save();if(typeof runPlanner==="function")runPlanner();m22ShowStatus(`${action.name} was undone. ${m15Money(actual)} has been reversed.`);m22Render();
  };
  window.m22Instruction=function(plan){
    const el=document.getElementById("m15Instruction");if(!el)return;if(plan.unresolvedProtection>.009){el.className="m22-callout risk";el.innerHTML=`Actual pay cannot fully cover the immediate Holding Pot requirement. The mission remains short by <strong>${m15Money(plan.unresolvedProtection)}</strong>.`;return}if(plan.unresolvedRegularHolding>.009){el.className="m22-callout risk";el.innerHTML=`Immediate bills are protected, but <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> of the due-date sinking-fund contribution remains unfunded.`;return}if(plan.shortfall>.009){el.className="m22-callout watch";el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora protected immediate commitments and the date-aware Holding contribution first, then reduced lifestyle by <strong>${m15Money(plan.lifestyleCut)}</strong>, goal pots by <strong>${m15Money(plan.goalsCut)}</strong> and shares by <strong>${m15Money(plan.coreCut)}</strong>.`;return}el.className="m22-callout good";el.innerHTML=`Current-account payday plan ready. <strong>${m15Money(plan.urgentHoldingAmount)}</strong> covers any immediate shortfall and <strong>${m15Money(plan.regularHoldingAmount)}</strong> funds future commitments according to their actual due dates.`;
  };
  window.m25RenderSinking=function(plan){
    const sinking=plan.sinking||m25SinkingFundPlan(plan.paydayDate);m15Set("m25SinkingTotal",`${m15Money(sinking.contribution)} THIS PAYDAY`);m15Set("m25LongTermTarget",m15Money(sinking.totalCommitments));m15Set("m25LongTermGap",m15Money(sinking.totalRemaining));
    const summary=document.getElementById("m25SinkingSummary");if(summary)summary.innerHTML=`<div class="m25-sinking-stat"><span>Future commitments</span><strong>${m15Money(sinking.totalCommitments)}</strong></div><div class="m25-sinking-stat"><span>Already covered by headroom</span><strong>${m15Money(sinking.allocatedHeadroom)}</strong></div><div class="m25-sinking-stat"><span>Remaining funding gap</span><strong>${m15Money(sinking.totalRemaining)}</strong></div>`;
    const host=document.getElementById("m25SinkingList");if(!host)return;host.innerHTML=sinking.details.length?sinking.details.map(r=>`<div class="m25-sinking-row"><div><strong>${m22Escape(r.name)}</strong><small>${m22Escape(m25SourceLabel(r.source))} • due ${m22Escape(dateLabel(r.due))} • ${r.paydays} payday${r.paydays===1?"":"s"} left • ${m15Money(r.remaining)} still to fund</small></div><div class="m25-sinking-amount">${m15Money(r.contribution)}<small>this payday</small></div></div>`).join(""):`<div class="m22-empty">No dated long-term commitments need a sinking-fund contribution.</div>`;
  };
  window.m25RenderAudit=function(){
    const audit=m25DuplicateAudit(),host=document.getElementById("m25AuditList"),badge=document.getElementById("m25AuditBadge");if(!host)return;const count=audit.exact.length+audit.potential.length;if(badge){badge.textContent=count?`${count} REVIEW ITEM${count===1?"":"S"}`:"CLEAR";badge.style.color=count?"#ffe08a":"#8cffb8"}
    const rows=[];audit.exact.forEach(group=>rows.push(`<div class="m25-audit-row exact"><div class="m25-audit-title">Exact duplicate excluded once</div><div class="m25-audit-meta"><strong>${m22Escape(group[0].name)}</strong> • ${m22Escape(dateLabel(group[0].due))} • ${m15Money(group[0].amount)}<br>Aurora uses ${m22Escape(m25SourceLabel(group[0].source))} as the primary record for protection and sinking-fund calculations.</div><div>${group.map(r=>`<span class="m25-audit-source">${m22Escape(m25SourceLabel(r.source))}</span>`).join("")}</div></div>`));
    audit.potential.forEach(group=>rows.push(`<div class="m25-audit-row"><div class="m25-audit-title">Possible duplicate — review dates</div><div class="m25-audit-meta"><strong>${m22Escape(group[0].name)}</strong> appears more than once for ${m15Money(group[0].amount)} on nearby or missing dates. These are not auto-merged unless the name and due date match exactly.</div><div>${group.map(r=>`<span class="m25-audit-source">${m22Escape(m25SourceLabel(r.source))} • ${m22Escape(r.due?dateLabel(r.due):"No date")}</span>`).join("")}</div></div>`));
    host.innerHTML=rows.length?rows.join(""):'<div class="m25-audit-row good"><div class="m25-audit-title">No duplicate commitments detected</div><div class="m25-audit-meta">Scheduled bills, yearly costs and future costs currently reconcile without an exact overlap.</div></div>';
  };
  window.m25RenderReconciliation=function(plan){
    const r=m25Reconciliation(plan);m15Set("m25RecWage",m15Money(plan.actual));m15Set("m25RecCompleted",m15Money(r.completed));m15Set("m25RecPending",m15Money(r.pending));m15Set("m25RecCurrent",m15Money(r.current));m15Set("m25RecRetained",m15Money(r.retained));m15Set("m25RecDifference",`${r.difference<-.009?"−":""}${m15Money(Math.abs(r.difference))}`);
    const card=document.getElementById("m25DifferenceCard"),note=document.getElementById("m25ReconcileNote");if(card){card.classList.toggle("good",Math.abs(r.difference)<.011);card.classList.toggle("risk",Math.abs(r.difference)>=.011)}if(note)note.textContent=Math.abs(r.difference)<.011?"Reconciled: every pound is assigned to a transfer or deliberately retained in the current account.":r.difference>0?`${m15Money(r.difference)} is not assigned. Adjust the retained amount or an actual transfer before completing payday.`:`The recorded moves exceed the wage by ${m15Money(Math.abs(r.difference))}. Undo or correct a transfer before completing payday.`;return r;
  };
  window.m22Render=function(){
    if(typeof plannerState==="undefined")return;const mission=m22EnsureState(),plan=m22CurrentPlan(),locked=Boolean(m22AnyExecuted()||mission.completed),doneCount=plan.actions.filter(m22ActionDone).length,totalCount=plan.actions.length,pct=totalCount?Math.round(doneCount/totalCount*100):0;mission.inputs=plan.inputs;m22SyncHiddenSimulator(plan.inputs);
    m15Set("m15SumExpected",m15Money(plan.expected));m15Set("m15SumActual",m15Money(plan.actual));m15Set("m15SumExtra",m15Money(plan.extra));m15Set("m22SumShortfall",m15Money(plan.shortfall));m15Set("m15SumHolding",m15Money(plan.holdingAmount));m15Set("m15SumAvailable",m15Money(plan.actual));m15Set("m22MinimumBuffer",m15Money(plan.protection.minimum));m15Set("m22BillsReserve",m15Money(plan.protection.bills));m15Set("m22RecurringReserve",m15Money(plan.protection.recurring));m15Set("m22HoldingRequirement",m15Money(plan.protection.required));m15Set("m22HoldingNow",m15Money(plan.protection.holding));m15Set("m22UrgentHolding",m15Money(plan.urgentHoldingAmount));m15Set("m22RegularHolding",m15Money(plan.regularHoldingAmount));
    const rec=m25Reconciliation(plan);m15Set("m22WalletTotal",m15Money(plan.actual));m15Set("m22WalletExecuted",m15Money(rec.completed));m15Set("m22WalletRemaining",m15Money(rec.pending));m15Set("m22WalletBuffered",m15Money(rec.retained));m15Set("m15AllocationTotal",`${m15Money(plan.actual)} reconciled`);
    const progress=document.getElementById("m22ProgressFill");if(progress)progress.style.width=`${pct}%`;m15Set("m22ProgressText",`${doneCount} of ${totalCount} moves completed`);m15Set("m22LockText",mission.completed?"Payday completed":locked?"Plan locked during execution":"Plan editable until first move");m15Set("m22MissionBadge",mission.completed?"PAYDAY COMPLETE":locked?"EXECUTION LIVE":"DRAFT PLAN");m22Instruction(plan);m22SetInputsLocked(locked);
    const list=document.getElementById("m15AllocationList");if(list)list.innerHTML=plan.actions.length?plan.actions.map(action=>{const done=m22ActionDone(action),actual=done?Number(m25ActualForAction(action)||0):Number(action.amount||0),variance=actual-Number(action.amount||0),varianceClass=Math.abs(variance)<.011?"good":variance>0?"watch":"risk",varianceText=Math.abs(variance)<.011?"Matches plan":`${variance>0?"+":"−"}${m15Money(Math.abs(variance))} vs plan`;return `<div class="m22-action-row ${done?"done":""}"><div class="m22-check">${done?"✓":"○"}</div><div><div class="m22-action-name">${m22Escape(action.name)}</div><div class="m22-action-meta">${m22Escape(action.meta)}</div>${done?`<div class="m25-variance ${varianceClass}">${varianceText}</div>`:""}</div><div class="m25-planned">Planned<strong>${m15Money(action.amount)}</strong></div><div class="m25-actual-wrap"><label>Actual ${action.type==="buffer"?"retained":"transferred"}</label><input class="m25-actual-input" data-m25-actual type="number" min="0" step="0.01" value="${actual.toFixed(2)}" ${done||mission.completed?"disabled":""}></div>${done&&!mission.completed?`<button class="m25-undo-btn" type="button" data-m25-undo="${m22Escape(action.id)}">Undo move</button>`:`<button class="m22-execute-btn" type="button" data-m22-execute="${m22Escape(action.id)}" ${done||mission.completed?"disabled":""}>${done?"Completed ✓":action.type==="buffer"?"Confirm retained":"Complete move"}</button>`}</div>`}).join(""):'<div class="m22-empty">No payday moves were created.</div>';
    const route=document.getElementById("m15Route");if(route)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${m22Escape(a.name)}</div><div class="m22-step-meta">${m22Escape(a.meta)}</div></div><div class="m22-step-amount">${m15Money(a.amount)}</div></div>`).join("");
    const reconciliation=m25RenderReconciliation(plan);m25RenderSinking(plan);m25RenderAudit();const complete=document.getElementById("m22CompletePayday");if(complete)complete.disabled=mission.completed||!totalCount||doneCount!==totalCount||Math.abs(reconciliation.difference)>=.011;const reset=document.getElementById("m22ResetMission");if(reset)reset.style.display=mission.completed?"none":"";const next=document.getElementById("m22NewMission");if(next)next.style.display=mission.completed?"":"none";m15Set("m33PlannedTotal",m15Money(plan.planned));m15Set("m33ExpectedMirror",m15Money(plan.expected));m15Set("m33ActualMirror",m15Money(plan.actual));m15Set("m33ExtraMirror",m15Money(plan.extra));m15Set("m33ShortfallMirror",m15Money(plan.shortfall));m15Set("m33RetainedMirror",m15Money(rec.retained));m15Set("m33LivePayNote",plan.extra>.009?`${m15Money(plan.extra)} above expected`:plan.shortfall>.009?`${m15Money(plan.shortfall)} below expected`:"Wage matches expectation");m22RenderReceipt();m22RenderHistory();m22Save();if(typeof m13Render==="function")m13Render();if(typeof m33RenderScenario==="function")m33RenderScenario();
  };
  window.m22CompletePayday=function(){
    const mission=m22EnsureState(),plan=m22CurrentPlan();if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus("Complete every payday move before closing the mission.",true);return}const rec=m25Reconciliation(plan);if(Math.abs(rec.difference)>=.011){m22ShowStatus(`The current account does not reconcile. Correct the ${m15Money(Math.abs(rec.difference))} difference first.`,true);return}
    const actualBy=predicate=>plan.actions.filter(predicate).reduce((s,a)=>s+Number(m25ActualForAction(a)||0),0),holdingAdded=actualBy(a=>a.type==="holding"),urgentHolding=actualBy(a=>a.type==="holding"&&a.holdingKind==="urgent"),regularHolding=actualBy(a=>a.type==="holding"&&a.holdingKind==="regular"),potsFunded=actualBy(a=>a.type==="pot"||a.type==="lifestyle"),invested=actualBy(a=>a.type==="investment"),buffered=actualBy(a=>a.type==="buffer");
    const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,plannedTotal:plan.planned,urgentHolding,regularHolding,holdingAdded,potsFunded,invested,buffered,transfersCompleted:rec.completed,closingHolding:Number(plannerState.holdingBalance||0),openingHolding:Number(mission.openingHolding??(Number(plannerState.holdingBalance||0)-holdingAdded)),difference:rec.difference,actionCount:plan.actions.length,actions:plan.actions.map(a=>({id:a.id,name:a.name,type:a.type,planned:Number(a.amount||0),actual:Number(m25ActualForAction(a)||0)})),completedAt:new Date().toISOString()};mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${m15Money(receipt.invested)} invested • ${m15Money(receipt.holdingAdded)} to Holding • ${m15Money(receipt.potsFunded)} to pots • ${m15Money(receipt.buffered)} retained`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus("Payday completed, reconciled and saved to local history.");m22Render();
  };
  window.m22RenderReceipt=function(){const host=document.getElementById("m22Receipt"),mission=m22EnsureState();if(!host)return;if(!mission.completed||!mission.receipt){host.classList.remove("show");host.innerHTML="";return}const r=mission.receipt;host.innerHTML=`<h3>✅ Payday completed and reconciled — ${m22Escape(dateLabel(r.paydayDate))}</h3><div class="m22-receipt-grid"><div class="m22-receipt-item"><span>Actual wage</span><strong>${m15Money(r.actualPay)}</strong></div><div class="m22-receipt-item"><span>Transfers completed</span><strong>${m15Money(r.transfersCompleted||0)}</strong></div><div class="m22-receipt-item"><span>Urgent Holding top-up</span><strong>${m15Money(r.urgentHolding||0)}</strong></div><div class="m22-receipt-item"><span>Due-date Holding funding</span><strong>${m15Money(r.regularHolding||0)}</strong></div><div class="m22-receipt-item"><span>Pots funded</span><strong>${m15Money(r.potsFunded||0)}</strong></div><div class="m22-receipt-item"><span>Shares transferred</span><strong>${m15Money(r.invested||0)}</strong></div><div class="m22-receipt-item"><span>Retained in current account</span><strong>${m15Money(r.buffered||0)}</strong></div><div class="m22-receipt-item"><span>Closing Holding Pot</span><strong>${m15Money(r.closingHolding||0)}</strong></div><div class="m22-receipt-item"><span>Reconciliation difference</span><strong>${m15Money(Math.abs(r.difference||0))}</strong></div><div class="m22-receipt-item"><span>Completed at</span><strong>${m22Escape(new Date(r.completedAt).toLocaleString("en-GB"))}</strong></div></div>`;host.classList.add("show")};
  window.m22CopyPlan=function(){const plan=m22CurrentPlan(),mission=m22EnsureState(),rec=m25Reconciliation(plan);const rows=plan.actions.map((a,i)=>{const actual=m22ActionDone(a)?Number(m25ActualForAction(a)||0):null;return `${i+1}. ${a.name}: planned ${m15Money(a.amount)}${actual!==null?` • actual ${m15Money(actual)} — completed`:""}`});const text=`Aurora Payday Mission Control\nPayday: ${dateLabel(mission.paydayDate)}\nCurrent-account wage: ${m15Money(plan.actual)}\nImmediate payments protected: ${m15Money(plan.protection.bills)}\nDue-date Holding contribution: ${m15Money(plan.regularHoldingAmount)}\nUnexplained difference: ${m15Money(Math.abs(rec.difference))}\n\n${rows.join("\n")}`;navigator.clipboard?.writeText(text).then(()=>{const b=document.getElementById("m15CopyPlan");if(b){b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy Payday Plan",1300)}}).catch(()=>m22ShowStatus("Copy was blocked by the browser.",true))};
  window.m22ResetDraft=function(){const mission=m22EnsureState();if(m22AnyExecuted()){m22ShowStatus("Undo completed moves before resetting this payday draft.",true);return}plannerState.paydayMission=m22FreshMission(mission.paydayDate||m22DefaultPayday());m22HydrateInputs();m22Save();m22Render();m22ShowStatus("Payday draft reset.")};

  window.m25ApplyPlannerClarity=function(){
    if(typeof plannerState==="undefined")return;
    const missionPayday=typeof m22EnsureState==="function"?m22EnsureState()?.paydayDate:"";
    const payday=m25Date(missionPayday)||(typeof getNextPaydayDate==="function"?getNextPaydayDate():m25Date(m22DefaultPayday()));
    const protection=m22BillProtection(payday);
    const sinking=m25SinkingFundPlan(payday);
    const holding=Number(plannerState.holdingBalance||0);
    const immediateCatchUp=m25Round(Math.max(0,Number(protection.topUp||0)));
    const futureContribution=m25Round(Math.max(0,Number(sinking.contribution||0)));
    const totalHoldingTransfer=m25Round(immediateCatchUp+futureContribution);
    const totalRequirement=protection.required+sinking.totalCommitments;
    const trueSurplus=Math.max(0,holding-totalRequirement);
    const fundingGap=Math.max(0,totalRequirement-holding);
    const protectionParts=[`${m15Money(protection.minimum)} buffer`,`${m15Money(protection.bills)} dated payments`];
    if(Number(protection.recurring||0)>0)protectionParts.push(`${m15Money(protection.recurring)} remaining monthly spending`);
    const protectionSummary=protectionParts.join(" + ");

    setText("protectedMoney",formatMoney(totalRequirement));
    setText("protectedMoneyMeta",`£${formatMoney(protection.required)} required through the following payday + £${formatMoney(sinking.totalCommitments)} later dated commitments • exact duplicates counted once`);
    setText("trueSurplus",formatMoney(trueSurplus));
    setText("trueSurplusMeta",trueSurplus>0?"Genuinely above short-term and dated long-term protection":"No genuine surplus after all dated protection requirements");

    setText("currentPotOffset",formatMoney(immediateCatchUp));
    setText("currentPotOffsetMeta",immediateCatchUp>0?`Catch-up needed to fully protect ${protectionSummary}`:`Current Holding Pot already covers ${protectionSummary}`);
    setText("suggestedContributionNow",formatMoney(futureContribution));
    setText("suggestedContributionMeta",futureContribution>0?`${sinking.details.length} later commitment${sinking.details.length===1?"":"s"} spread across the paydays before each due date`:"No later due-date contribution needed this payday");
    setText("finalAmountToAdd",formatMoney(totalHoldingTransfer));
    setText("finalAmountToAddMeta",totalHoldingTransfer>0?`${m15Money(immediateCatchUp)} immediate catch-up + ${m15Money(futureContribution)} future funding`:"No Holding Pot transfer needed this payday");
    setText("finalPotTopUp",`£${formatMoney(totalHoldingTransfer)}`);
    setText("finalPotTopUpMeta",totalHoldingTransfer>0?`${m15Money(immediateCatchUp)} catch-up + ${m15Money(futureContribution)} due-date contribution`:"Holding Pot is fully covered");
    setText("commandPaydayMove",`£${formatMoney0(totalHoldingTransfer)}`);
    setText("m13RunProtected",m13GBP(totalRequirement));
    setText("m13RunSurplus",m13GBP(trueSurplus));
    setText("m13RunSafe",m13GBP(trueSurplus));
    setText("m13LineHolding",m13GBP(totalHoldingTransfer).replace(".00",""));

    const actionHost=document.getElementById("paydayActionsList");
    if(actionHost){
      const lines=[];
      lines.push(`<div class="m39-funding-line"><strong>Immediate catch-up — ${m15Money(immediateCatchUp)}</strong><span>${immediateCatchUp>0?`Restores full cover for ${protectionSummary}.`:"No short-term catch-up is required."}</span></div>`);
      lines.push(`<div class="m39-funding-line"><strong>Future due-date contribution — ${m15Money(futureContribution)}</strong><span>${futureContribution>0?`Builds funding for ${sinking.details.length} later commitment${sinking.details.length===1?"":"s"}.`:"No later commitment needs funding from this payday."}</span></div>`);
      lines.push(`<div class="m39-funding-total"><strong>Total Holding Pot transfer — ${m15Money(totalHoldingTransfer)}</strong></div>`);
      actionHost.innerHTML=lines.join("");
    }

    const recommendation=document.getElementById("m36RecommendationState");
    if(recommendation)recommendation.textContent=totalHoldingTransfer>0.005?"FUND NEXT":"NO TOP-UP";
    const finalCard=document.getElementById("finalContributionCard");
    if(finalCard)finalCard.dataset.state=totalHoldingTransfer>0.005?"fund":"covered";
    const meta=document.getElementById("currentPotOffsetMeta");
    if(meta&&fundingGap>0&&immediateCatchUp<=0)meta.textContent=`${m15Money(fundingGap)} total protection gap remains`;
  };
  if(typeof m25OriginalUpdatePlannerTotals==="function")window.updatePlannerTotals=function(){const result=m25OriginalUpdatePlannerTotals.apply(this,arguments);m25ApplyPlannerClarity();m25RenderAudit();return result};
  if(typeof m25OriginalRunPlanner==="function")window.runPlanner=function(){const result=m25OriginalRunPlanner.apply(this,arguments);m25ApplyPlannerClarity();m25RenderAudit();return result};
  if(typeof m25OriginalM13Render==="function")window.m13Render=function(){const result=m25OriginalM13Render.apply(this,arguments);m25ApplyPlannerClarity();return result};

  function m25CloneButton(id,handler){const old=document.getElementById(id);if(!old)return;const fresh=old.cloneNode(true);old.parentNode.replaceChild(fresh,old);fresh.addEventListener("click",handler)}
  m25CloneButton("m15CopyPlan",m22CopyPlan);m25CloneButton("m22CompletePayday",m22CompletePayday);m25CloneButton("m22ResetMission",m22ResetDraft);m25CloneButton("m22NewMission",m22StartNextMission);
  document.addEventListener("click",event=>{const undo=event.target.closest("[data-m25-undo]");if(undo){event.preventDefault();m25UndoAction(undo.dataset.m25Undo)}});
  window.addEventListener("load",()=>{m22Render();m25ApplyPlannerClarity();m25RenderAudit()});
})();


/* ===== Original inline script 12 ===== */
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


/* ===== Original inline script 13 ===== */
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


/* ===== Original inline script 14 ===== */
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


/* ===== Original inline script 15 ===== */
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


/* ===== Original inline script 16 ===== */
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


/* ===== Original inline script 17 ===== */
(function(){
  const GBP=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
  const n=id=>Math.max(0,Number(document.getElementById(id)?.value||0));
  const setValue=(id,value)=>{const el=document.getElementById(id);if(el)el.value=Number(value||0).toFixed(2)};
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  function humanDate(value){
    if(!value)return 'No payday selected';
    const parts=String(value).split('-').map(Number);if(parts.length!==3||parts.some(Number.isNaN))return value;
    const d=new Date(parts[0],parts[1]-1,parts[2]);
    return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  }
  function classifyPlan(plan){
    const result={holding:0,lifestyle:0,goals:0,house:0,emergency:0,shares:0,retained:0,potTotal:0,transfers:0,accounted:0};
    (plan?.actions||[]).forEach(action=>{
      const amount=Number(action.amount||0);result.accounted+=amount;
      if(action.type==='holding')result.holding+=amount;
      else if(action.type==='buffer')result.retained+=amount;
      else if(action.type==='lifestyle')result.lifestyle+=amount;
      else if(action.type==='investment')result.shares+=amount;
      else if(action.type==='pot'){
        result.potTotal+=amount;const name=String(action.name||'').toLowerCase();
        if(name.includes('house')||name.includes('home')||name.includes('renovation'))result.house+=amount;
        else if(name.includes('emergency')||name.includes('rainy')||name.includes('safety'))result.emergency+=amount;
        else result.goals+=amount;
      }
    });
    result.transfers=Math.max(0,result.accounted-result.retained);return result;
  }
  window.m33LiveBreakdown=classifyPlan;

  function setModeUI(mode){
    const overtime=mode==='overtime',custom=mode==='custom';
    const field=document.getElementById('m35OvertimeField'),strip=document.getElementById('m35OvertimeStrip'),route=document.getElementById('m35OvertimeRoute'),pay=document.getElementById('m33ScenarioPay');
    if(field)field.hidden=!overtime;if(strip)strip.hidden=!overtime;if(route)route.hidden=!overtime;if(pay)pay.readOnly=!custom;
  }
  window.m33SeedScenario=function(mode=m33ScenarioState.mode){
    const plan=m22CurrentPlan(),live=classifyPlan(plan),expected=Number(plan.expected||2100),currentExtra=Math.max(0,Number(plan.actual||0)-expected),extra=currentExtra>0?currentExtra:800;
    m33ScenarioState.mode=mode;m33ScenarioState.initialised=true;m33ScenarioState.userEdited=false;
    let pay=Number(plan.actual||expected);
    if(mode==='baseline')pay=expected;
    if(mode==='overtime')pay=expected+extra;
    setValue('m35OvertimeExtra',mode==='overtime'?extra:0);setValue('m33ScenarioPay',pay);setValue('m33ScenarioShares',live.shares||Number(plan.inputs?.coreInvestment||0));setValue('m33ScenarioLifestyle',live.lifestyle||Number(plan.inputs?.lifestyle||0));setValue('m33ScenarioGoals',live.goals||Number(plan.inputs?.goalPots||0));setValue('m33ScenarioHouse',live.house||Number(plan.inputs?.houseBoost||0));setValue('m33ScenarioEmergency',live.emergency||Number(plan.inputs?.emergencyBoost||0));setValue('m33ScenarioRetain',Math.max(100,Number(live.retained||0)));
    document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode===mode));
    const note=document.getElementById('m33ModeNote');if(note)note.textContent=mode==='baseline'?'Baseline mirrors the expected wage and current allocation priorities.':mode==='overtime'?`Overtime mode separates the normal ${GBP(expected)} payday from the extra pay.`:'Custom mode keeps every value under your control.';
    setModeUI(mode);m33RenderScenario();
  };

  window.m33ComputeScenario=function(){
    const plan=m22CurrentPlan(),protection=m22BillProtection(m22EnsureState().paydayDate),pay=n('m33ScenarioPay'),retainedTarget=n('m33ScenarioRetain');
    const urgent=Math.min(protection.topUp,pay);let left=Math.max(0,pay-urgent);const regularTarget=m24RegularHoldingContribution(),regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
    let lifestyle=n('m33ScenarioLifestyle'),goals=n('m33ScenarioGoals'),house=n('m33ScenarioHouse'),emergency=n('m33ScenarioEmergency'),shares=n('m33ScenarioShares');
    const flexibleBudget=Math.max(0,left-retainedTarget);let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-flexibleBudget);
    const trim=holder=>{const cut=Math.min(holder.value,deficit);holder.value-=cut;deficit-=cut;return cut};
    const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
    const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
    const allocated=urgent+regular+lifestyle+goals+house+emergency+shares,retained=Math.max(0,pay-allocated),unresolved=Math.max(0,protection.topUp-urgent)+Math.max(0,regularTarget-regular),retainGap=Math.max(0,retainedTarget-retained),cutTotal=Object.values(cuts).reduce((a,b)=>a+b,0);
    let state='healthy',label='HEALTHY';if(unresolved>.009){state='risk';label='UNPROTECTED'}else if(cutTotal>.009){state='risk';label='AUTO-REDUCED'}else if(retainGap>.009||retained<100){state='tight';label='TIGHT'}
    const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/(pay||1)*100)-(cutTotal/(pay||1)*60)-(retainGap/(Math.max(retainedTarget,1))*25)-(retained<100?(100-retained)/2:0))));
    return {plan,pay,expected:Number(plan.expected||0),overtime:Math.max(0,pay-Number(plan.expected||0)),retainedTarget,urgent,regular,protection:urgent+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,retainGap,cuts,state,label,score};
  };

  const originalRenderScenario=window.m33RenderScenario;
  window.m33RenderScenario=function(){
    const result=originalRenderScenario.apply(this,arguments);const scenario=m33ComputeScenario(),live=classifyPlan(scenario.plan),cutTotal=Object.values(scenario.cuts).reduce((a,b)=>a+b,0),transfers=Math.max(0,scenario.allocated);
    setModeUI(m33ScenarioState.mode);setText('m35BasePay',GBP(scenario.expected));setText('m35OvertimeDisplay',GBP(scenario.overtime));setText('m35ScenarioTotal',GBP(scenario.pay));
    const statement=document.getElementById('m35DecisionStatement');if(statement){statement.dataset.state=scenario.state;if(scenario.unresolved>.009)statement.innerHTML=`<strong>This scenario is not safe yet.</strong> Required Holding Pot protection is short by ${GBP(scenario.unresolved)}.`;else if(cutTotal>.009)statement.innerHTML=`<strong>Aurora has corrected an over-allocation.</strong> ${GBP(cutTotal)} was removed from flexible moves so the plan cannot spend more than the wage received.`;else if(scenario.retained<scenario.retainedTarget-.009)statement.innerHTML=`<strong>This scenario is tight.</strong> It protects the required moves but misses your retained-cash floor by ${GBP(scenario.retainedTarget-scenario.retained)}.`;else statement.innerHTML=`<strong>This scenario is safe.</strong> All required protection is covered, ${GBP(transfers)} would be moved and ${GBP(scenario.retained)} would remain in the current account.`}
    const route=document.getElementById('m35OvertimeRoute');if(route&&m33ScenarioState.mode==='overtime'){
      const extra=Math.max(0,scenario.pay-scenario.expected),routes=[];[['shares','shares'],['house','House Pot'],['emergency','Emergency Fund'],['goals','other pots'],['lifestyle','Spending Pot'],['retained','retained cash']].forEach(([key,label])=>{const diff=Number(scenario[key]||0)-Number(live[key]||0);if(diff>.009)routes.push(`${GBP(diff)} to ${label}`)});
      route.innerHTML=extra>.009?`<strong>Extra ${GBP(extra)} route:</strong> ${routes.length?routes.join(' • '):`${GBP(extra)} currently remains unassigned.`}`:'No overtime has been added to this scenario.';
    }
    const confirmCopy=document.getElementById('m35ApplyConfirmCopy');if(confirmCopy)confirmCopy.textContent=`This will rebuild the live mission using ${GBP(scenario.pay)} pay, ${GBP(scenario.allocated)} in planned transfers and ${GBP(scenario.retained)} retained.`;
    return result;
  };

  function renderLiveRefinement(){
    const plan=m22CurrentPlan(),snap=classifyPlan(plan),mission=m22EnsureState();setText('m33PlannedTotal',GBP(snap.accounted));setText('m15AllocationTotal',`${GBP(snap.transfers)} transfers planned`);setText('m35PaydayHuman',humanDate(mission.paydayDate||document.getElementById('m22PaydayDate')?.value));
    const actions=plan.actions||[],pending=actions.filter(a=>!m22ActionDone(a)),done=actions.length-pending.length,preview=document.getElementById('m35ChecklistPreview');
    setText('m35ChecklistSummary',`${done} of ${actions.length} completed`);setText('m35FullChecklistMeta',`${actions.length} move${actions.length===1?'':'s'}`);
    if(preview){
      const icon=a=>a.type==='holding'?'H':a.type==='investment'?'↗':a.type==='buffer'?'£':a.type==='lifestyle'?'S':'P';
      preview.innerHTML=pending.length?pending.slice(0,3).map(a=>`<div class="m35-preview-row"><div class="m35-preview-icon">${icon(a)}</div><div><strong>${m22Escape(a.name)}</strong><small>${m22Escape(a.meta||'Ready to complete')}</small></div><strong class="m35-preview-amount">${GBP(a.amount)}</strong></div>`).join('')+(pending.length>3?`<div class="m35-preview-more">+ ${pending.length-3} more move${pending.length-3===1?'':'s'} in the full checklist</div>`:''):`<div class="m35-preview-row"><div class="m35-preview-icon">✓</div><div><strong>All payday moves completed</strong><small>Review reconciliation, then close the mission.</small></div><strong class="m35-preview-amount">READY</strong></div>`;
    }
  }

  const originalM22Render=window.m22Render;
  window.m22Render=function(){const result=originalM22Render.apply(this,arguments);renderLiveRefinement();return result};

  const originalApply=window.m33ApplyScenario;
  window.m33ApplyScenario=function(){
    const mission=m22EnsureState();m33ScenarioState.undo={inputs:JSON.parse(JSON.stringify(mission.inputs||{})),paydayDate:mission.paydayDate};const result=originalApply.apply(this,arguments);const undo=document.getElementById('m35UndoScenario');if(undo)undo.hidden=false;return result;
  };

  function showConfirm(){const scenario=m33ComputeScenario(),mission=m22EnsureState();if(mission.plan||m22AnyExecuted()||mission.completed){m33ShowApply('The live mission is locked because execution has started.',true);return}const panel=document.getElementById('m35ApplyConfirm');if(panel)panel.hidden=false;const copy=document.getElementById('m35ApplyConfirmCopy');if(copy)copy.textContent=`This will replace the editable live plan with ${GBP(scenario.pay)} pay, ${GBP(Math.max(0,scenario.allocated))} in transfers and ${GBP(scenario.retained)} retained. Your current plan will be kept as an undo point.`}
  function hideConfirm(){const panel=document.getElementById('m35ApplyConfirm');if(panel)panel.hidden=true}
  function undoApply(){const undo=m33ScenarioState.undo;if(!undo)return;const mission=m22EnsureState();if(m22AnyExecuted()||mission.completed){m33ShowApply('Undo is unavailable after execution has started.',true);return}mission.inputs=JSON.parse(JSON.stringify(undo.inputs));mission.paydayDate=undo.paydayDate;mission.plan=null;m22HydrateInputs();m22Save();m22Render();m33ScenarioState.undo=null;const btn=document.getElementById('m35UndoScenario');if(btn)btn.hidden=true;m33ShowApply('The previous live payday plan has been restored.')}

  function replaceButton(id,handler){const old=document.getElementById(id);if(!old)return;const fresh=old.cloneNode(true);old.parentNode.replaceChild(fresh,old);fresh.addEventListener('click',handler);return fresh}
  replaceButton('m33ApplyScenario',showConfirm);replaceButton('m33ResetScenario',()=>{hideConfirm();m33SeedScenario('overtime')});
  document.getElementById('m35ConfirmApply')?.addEventListener('click',()=>{hideConfirm();m33ApplyScenario()});document.getElementById('m35CancelApply')?.addEventListener('click',hideConfirm);document.getElementById('m35UndoScenario')?.addEventListener('click',undoApply);
  document.getElementById('m35OvertimeExtra')?.addEventListener('input',()=>{m33ScenarioState.mode='overtime';const expected=Number(m22CurrentPlan().expected||0),extra=n('m35OvertimeExtra');setValue('m33ScenarioPay',expected+extra);document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode==='overtime'));setModeUI('overtime');m33RenderScenario()});
  document.getElementById('m33ScenarioRetain')?.addEventListener('input',()=>{m33ScenarioState.mode='custom';document.querySelectorAll('[data-m33-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.m33Mode==='custom'));setModeUI('custom');const note=document.getElementById('m33ModeNote');if(note)note.textContent='Custom mode keeps every value under your control.';m33RenderScenario()});
  document.getElementById('m22PaydayDate')?.addEventListener('change',()=>setText('m35PaydayHuman',humanDate(document.getElementById('m22PaydayDate')?.value)));
  window.addEventListener('load',()=>setTimeout(()=>{renderLiveRefinement();m33SeedScenario(m33ScenarioState.mode||'overtime')},120));
  if(document.readyState!=='loading')setTimeout(()=>{renderLiveRefinement();m33SeedScenario(m33ScenarioState.mode||'overtime')},120);
})();


/* ===== Original inline script 18 ===== */
/* ===================== M36 FUNDING ENGINE VISUAL SYNC ===================== */
(function(){
  const id=x=>document.getElementById(x);
  const amountFromText=x=>{const raw=String(id(x)?.textContent||'').replace(/[^0-9.-]/g,'');const n=Number(raw);return Number.isFinite(n)?n:0};
  const inputValue=x=>Math.max(0,Number(id(x)?.value||0));
  const pct=(value,max)=>max>0?Math.max(0,Math.min(100,value/max*100)):0;
  const gbp=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
  function render(){
    if(!id('m36EngineState'))return;
    const weekly=amountFromText('weeklyTarget');
    const annualNeed=weekly*52;
    const annualCurrent=amountFromText('currentRateAnnual');
    const variance=amountFromText('surplusShortfall');
    const coverage=annualNeed>0?annualCurrent/annualNeed*100:100;
    const holding=inputValue('holdingBalanceInput');
    const buffer=inputValue('minimumBufferInput');
    const bufferPct=buffer>0?pct(holding,buffer):100;
    const grow=inputValue('growPotBalanceInput');
    const target=inputValue('growPotTargetInput');
    const growthPct=pct(grow,target);
    const finalAdd=amountFromText('finalAmountToAdd');
    const state=id('m36EngineState');
    const stateText=id('m36EngineStateText');
    let tone='live',label='ON TARGET';
    if(variance < -0.005){tone='risk';label='CATCH-UP REQUIRED'}
    else if(coverage < 99.5){tone='watch';label='BUILDING COVERAGE'}
    state.dataset.state=tone;if(stateText)stateText.textContent=label;
    const coverageFill=id('m36CoverageFill');if(coverageFill)coverageFill.style.width=`${Math.min(100,coverage).toFixed(1)}%`;
    if(id('m36CoverageBadge'))id('m36CoverageBadge').textContent=`${Math.round(coverage)}%`;
    if(id('m36CoverageText'))id('m36CoverageText').textContent=annualNeed>0?`${gbp(annualCurrent)} funded against ${gbp(annualNeed)} annual requirement`:'No active annual requirement';
    const varianceCard=id('m36VarianceCard');if(varianceCard)varianceCard.dataset.state=variance<0?'risk':'good';
    const bufferFill=id('m36BufferFill');if(bufferFill)bufferFill.style.width=`${bufferPct.toFixed(1)}%`;
    if(id('m36BufferPosition'))id('m36BufferPosition').textContent=holding>=buffer?`${gbp(holding-buffer)} above the minimum buffer`:`${gbp(buffer-holding)} below the minimum buffer`;
    if(id('m36HoldingPosition'))id('m36HoldingPosition').textContent=holding>=buffer?'Holding Pot is above the protected floor':'Holding Pot needs rebuilding to the protected floor';
    const growthFill=id('m36GrowthFill');if(growthFill)growthFill.style.width=`${growthPct.toFixed(1)}%`;
    if(id('m36GrowthScore'))id('m36GrowthScore').textContent=`${Math.round(growthPct)}%`;
    if(id('m36GrowthText'))id('m36GrowthText').textContent=target>0?`${gbp(Math.max(0,target-grow))} remaining to reach the ${gbp(target)} safety target`:'Set a target to activate the growth route';
    const recommendation=id('m36RecommendationState');if(recommendation)recommendation.textContent=finalAdd>0.005?'FUND NEXT':'NO TOP-UP';
  }
  const watch=['weeklyTarget','monthlyTarget','currentRateAnnual','surplusShortfall','suggestedContributionNow','currentPotOffset','finalAmountToAdd','finalPotTopUp','growPotMove','weeklyTargetMeta','currentRateMeta','surplusShortfallMeta','suggestedContributionMeta','currentPotOffsetMeta','finalAmountToAddMeta','nextPaydayLabel','nextPaydayMeta','finalPotTopUpMeta','growPotMoveMeta','paydayActionsList'];
  const observer=new MutationObserver(()=>requestAnimationFrame(render));
  watch.forEach(x=>{const el=id(x);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true})});
  ['holdingBalanceInput','minimumBufferInput','growPotBalanceInput','growPotTargetInput','paydayContributionInput','customAddInput','customRemoveInput'].forEach(x=>id(x)?.addEventListener('input',render));
  window.addEventListener('load',()=>setTimeout(render,180));
  if(document.readyState!=='loading')setTimeout(render,80);else document.addEventListener('DOMContentLoaded',()=>setTimeout(render,80));
})();


/* ===== Original inline script 19 ===== */
/* ===================== M51 CONNECTED MULTI-SOURCE INVESTMENT PIPELINE • CANONICAL TRANSFER LINK ===================== */
(function(){
  const WEALTH_KEY="aurora_wealth_investment_mission_v1";
  const FUNDING_KEY="aurora_wealth_investment_funding_v1";
  const DECISION_KEY="aurora_trading_brain_decision_v1";
  const REGISTRATION_KEY="aurora_pending_registrations_v1";
  const el=id=>document.getElementById(id);
  const gbp=value=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value||0));
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.warn(error);return false}};
  const num=id=>Math.max(0,Number(el(id)?.value||0));
  const round=value=>Math.round((Number(value||0)+Number.EPSILON)*100)/100;
  const accountLabel=value=>value==="t212"?"Trading 212 ISA":value==="split"?"Split IG / Trading 212":"IG ISA";
  function loadFunding(){
    const saved=read(FUNDING_KEY)||{};
    if(el("m50CapitalBalance"))el("m50CapitalBalance").value=Number(saved.capitalBalance??7000).toFixed(2);
    if(el("m50CapitalRelease"))el("m50CapitalRelease").value=Number(saved.capitalRelease??1000).toFixed(2);
    if(el("m50EtfBalance"))el("m50EtfBalance").value=Number(saved.etfBalance??0).toFixed(2);
    if(el("m50EtfRelease"))el("m50EtfRelease").value=Number(saved.etfRelease??1000).toFixed(2);
  }
  function fundingState(paydayBudget=0){
    const capitalBalance=num("m50CapitalBalance"),capitalTarget=num("m50CapitalRelease");
    const etfBalance=num("m50EtfBalance"),etfTarget=num("m50EtfRelease");
    const capitalRelease=Math.min(capitalBalance,capitalTarget);
    const etfRelease=Math.min(etfBalance,etfTarget);
    return {paydayRelease:round(paydayBudget),capitalBalance:round(capitalBalance),capitalTarget:round(capitalTarget),capitalRelease:round(capitalRelease),etfBalance:round(etfBalance),etfTarget:round(etfTarget),etfRelease:round(etfRelease),total:round(paydayBudget+capitalRelease+etfRelease)};
  }
  function saveFunding(show=true){
    const f=fundingState(0);write(FUNDING_KEY,{capitalBalance:f.capitalBalance,capitalRelease:f.capitalTarget,etfBalance:f.etfBalance,etfRelease:f.etfTarget,updatedAt:new Date().toISOString()});
    if(show){const feedback=el("m37HandoffFeedback");if(feedback){feedback.textContent="Investment funding pools saved on this device.";feedback.className="m37-feedback good"}}
  }
  function liveSnapshot(){
    if(typeof window.m22CurrentPlan!=="function"||typeof window.m22EnsureState!=="function")return null;
    const plan=window.m22CurrentPlan(),mission=window.m22EnsureState();
    const investments=(plan?.actions||[]).filter(action=>action?.type==="investment");
    const paydayBudget=investments.reduce((sum,action)=>sum+Number(action.amount||0),0);
    const funding=fundingState(paydayBudget);
    const platform=String(plan?.inputs?.platform||mission?.inputs?.platform||"ig");
    const completed=investments.filter(action=>typeof window.m22ActionDone==="function"&&window.m22ActionDone(action)).length;
    return {plan,mission,investments,paydayBudget,budget:funding.total,funding,platform,completed};
  }
  function linkedStage(snapshot,payload){
    const decision=read(DECISION_KEY),queue=read(REGISTRATION_KEY),transferReceipt=read("aurora_transfer_centre_receipt_v1");
    if(transferReceipt&&payload&&transferReceipt.wealthMissionId===payload.id)return {label:"Transfer Centre accepted mission",state:"approved"};
    if(queue&&payload&&queue.sourceMissionId===payload.id){const items=Array.isArray(queue.items)?queue.items:[];const completed=items.filter(item=>["PURCHASED","REGISTERED","COMPLETE"].includes(String(item.status||"").toUpperCase())).length;return {label:items.length?`${completed}/${items.length} purchases complete`:"Transfer window approved",state:"approved"}}
    if(decision&&payload&&decision.wealthMissionId===payload.id)return {label:"Transfer plan ready",state:"approved"};
    if(payload)return {label:"Released to Transfer Centre",state:"sent"};
    return {label:snapshot?.budget>0?"Ready to release":"No investment move",state:"none"};
  }
  function render(){
    const snapshot=liveSnapshot();if(!snapshot||!el("m37InvestmentHandoff"))return;
    const f=snapshot.funding,payload=read(WEALTH_KEY),stage=linkedStage(snapshot,payload);
    el("m37InvestmentBudget").textContent=gbp(snapshot.budget);el("m50PaydayRelease").textContent=gbp(f.paydayRelease);el("m50CombinedMission").textContent=gbp(f.total);
    el("m50CapitalRunway").textContent=f.capitalBalance>0&&f.capitalRelease>0?`${Math.ceil(f.capitalBalance/f.capitalRelease)} monthly release${Math.ceil(f.capitalBalance/f.capitalRelease)===1?'':'s'} available`:"No existing capital available";
    el("m50EtfRunway").textContent=f.etfBalance>0&&f.etfRelease>0?`${Math.ceil(f.etfBalance/f.etfRelease)} monthly release${Math.ceil(f.etfBalance/f.etfRelease)===1?'':'s'} available`:"Waiting for sale proceeds";
    const parts=[`Payday ${gbp(f.paydayRelease)}`];if(f.capitalRelease>0)parts.push(`Existing capital ${gbp(f.capitalRelease)}`);if(f.etfRelease>0)parts.push(`ETF/share-sale pot ${gbp(f.etfRelease)}`);el("m50MissionBreakdown").textContent=parts.join(" + ");
    el("m37InvestmentAccount").textContent=accountLabel(snapshot.platform);el("m37InvestmentPayday").textContent=snapshot.mission?.paydayDate?new Date(`${snapshot.mission.paydayDate}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
    el("m37PipelineStage").textContent=stage.label;el("m37HandoffStatus").textContent=stage.label.toUpperCase();el("m37HandoffStatus").dataset.state=stage.state;
    el("m37InvestmentRoute").innerHTML=snapshot.budget>0?`<strong>Combined mission ready:</strong> ${parts.join(" • ")} • <strong>${gbp(snapshot.budget)} total</strong> will be sent to the Transfer Centre for portfolio-aware sizing.`:`<strong>No investment mission yet:</strong> Add a payday share contribution or make a capital funding pool available.`;
    const send=el("m37SendToTradingBrain");if(send){send.disabled=snapshot.budget<=0;send.textContent=snapshot.budget>0?`Release ${gbp(snapshot.budget)} to Transfer Centre`:"No Investment Allocation to Release"}
    ["m50CapitalBalance","m50CapitalRelease","m50EtfBalance","m50EtfRelease"].forEach(id=>{const node=el(id)?.closest(".m50-source");if(node)node.classList.toggle("is-empty",num(id)===0)});
  }
  function sendMission(){
    const snapshot=liveSnapshot(),feedback=el("m37HandoffFeedback");if(!snapshot||snapshot.budget<=0){if(feedback){feedback.textContent="There is no investment funding available for this mission.";feedback.className="m37-feedback risk"}return}
    saveFunding(false);const f=snapshot.funding;
    const payload={schemaVersion:2,id:`finance-${snapshot.mission.id}-${Date.now()}`,sourceMissionId:snapshot.mission.id,source:"Finance Department",generatedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),paydayDate:snapshot.mission.paydayDate,budget:Number(snapshot.budget.toFixed(2)),paydayContribution:Number(f.paydayRelease.toFixed(2)),preferredPlatform:snapshot.platform,preferredAccount:accountLabel(snapshot.platform),actualPay:Number(snapshot.plan.actual||0),expectedPay:Number(snapshot.plan.expected||0),status:"READY_FOR_TRANSFER_CENTRE",tradingMode:"income",destination:"Aurora FC Transfer Centre",fundingSources:[{id:"payday",name:"Payday share contribution",available:Number(f.paydayRelease.toFixed(2)),release:Number(f.paydayRelease.toFixed(2)),type:"income"},{id:"existing-capital",name:"Existing capital pot",available:Number(f.capitalBalance.toFixed(2)),release:Number(f.capitalRelease.toFixed(2)),type:"capital"},{id:"etf-sale",name:"ETF/share-sale pot",available:Number(f.etfBalance.toFixed(2)),release:Number(f.etfRelease.toFixed(2)),type:"sale-proceeds"}].filter(source=>source.release>0),investmentActions:snapshot.investments.map(action=>({id:action.id,name:action.name,amount:Number(action.amount||0),meta:action.meta||""}))};
    if(!write(WEALTH_KEY,payload)){if(feedback){feedback.textContent="The browser blocked the handoff save.";feedback.className="m37-feedback risk"}return}
    if(feedback){feedback.textContent=`${gbp(payload.budget)} combined mission sent to the Transfer Centre: ${payload.fundingSources.map(x=>`${x.name} ${gbp(x.release)}`).join(" • ")}.`;feedback.className="m37-feedback good"}
    try{window.dispatchEvent(new CustomEvent("aurora:wealth-mission",{detail:payload}))}catch(_){ }
    render();setTimeout(()=>{window.location.href=`AuroraCityFC_TransferCentre.html?from=finance-department&mission=${encodeURIComponent(payload.id)}&v=${Date.now()}`},180);
  }
  loadFunding();["m50CapitalBalance","m50CapitalRelease","m50EtfBalance","m50EtfRelease"].forEach(id=>el(id)?.addEventListener("input",render));el("m50SaveFunding")?.addEventListener("click",()=>{saveFunding(true);render()});el("m37SendToTradingBrain")?.addEventListener("click",sendMission);el("m37RefreshHandoff")?.addEventListener("click",render);
  window.addEventListener("storage",event=>{if([WEALTH_KEY,FUNDING_KEY,DECISION_KEY,REGISTRATION_KEY].includes(event.key))render()});window.addEventListener("aurora:trading-brain-decision",render);
  const originalRender=window.m22Render;if(typeof originalRender==="function")window.m22Render=function(){const result=originalRender.apply(this,arguments);setTimeout(render,0);return result};
  window.addEventListener("load",()=>setTimeout(render,260));if(document.readyState!=="loading")setTimeout(render,160);
})();


/* ===== Original inline script 20 ===== */
/* ===================== M40 ONE-PAY-CYCLE FUNDING ENGINE ===================== */
(function(){
  'use strict';
  const M40_LOGIC_VERSION=40;
  const previousRender=window.m22Render;
  const previousReceipt=window.m22RenderReceipt;
  const previousScenarioRender=window.m33RenderScenario;

  function n(value){const number=Number(value||0);return Number.isFinite(number)?number:0}
  function round(value){return Math.round((n(value)+Number.EPSILON)*100)/100}
  function date(value){
    if(!value)return null;
    const d=value instanceof Date?new Date(value):(typeof parseLocalDate==='function'?parseLocalDate(value):new Date(value));
    if(!(d instanceof Date)||Number.isNaN(d.getTime()))return null;
    d.setHours(0,0,0,0);return d;
  }
  function iso(d){return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function amount(item){return Math.max(0,n(item?._cashAmount??item?.amount))}
  function normalise(value){return String(value||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim()}
  function unique(items){
    const seen=new Set();
    return (items||[]).filter(item=>{
      const d=date(item?._d||item?.due);const key=`${normalise(item?.name)}|${iso(d)}|${amount(item).toFixed(2)}`;
      if(seen.has(key))return false;seen.add(key);return true;
    }).sort((a,b)=>date(a?._d||a?.due)-date(b?._d||b?.due));
  }
  function windows(paydayValue){
    const payday=date(paydayValue);if(!payday)return null;
    const next=new Date(payday);next.setDate(next.getDate()+28);next.setHours(0,0,0,0);
    return {payday,next};
  }
  function itemsBefore(cutoff){
    return typeof window.m25BeforePaydayItems==='function'?unique(window.m25BeforePaydayItems(cutoff)||[]):[];
  }
  function cycleItems(paydayValue){
    const range=windows(paydayValue);if(!range)return [];
    return unique(itemsBefore(range.next).filter(item=>{
      const d=date(item?._d||item?.due);return d&&d>=range.payday&&d<range.next;
    }));
  }
  function paydaysRemaining(paydayValue,dueValue){
    const start=date(paydayValue),due=date(dueValue);if(!start||!due||due<start)return 0;
    let count=0,cursor=new Date(start),guard=0;
    while(cursor<=due&&guard<80){count++;cursor.setDate(cursor.getDate()+28);guard++}
    return count;
  }
  function sourceLabel(item){
    if(item?._sourceLabel)return String(item._sourceLabel);
    if(item?.source==='yearly')return 'Yearly Costs';
    if(item?.source==='future')return 'Future Costs';
    return 'Scheduled Bills';
  }

  window.m22BillProtection=function(paydayValue){
    const range=windows(paydayValue);
    const preItems=itemsBefore(range?range.payday:paydayValue);
    const nextItems=cycleItems(paydayValue);
    const preBills=round(preItems.reduce((sum,item)=>sum+amount(item),0));
    const cycleBills=round(nextItems.reduce((sum,item)=>sum+amount(item),0));
    const minimum=Math.max(0,n(plannerState?.minimumBuffer));
    const holding=Math.max(0,n(plannerState?.holdingBalance));
    const currentRequired=round(minimum+preBills);
    const topUpNow=round(Math.max(0,currentRequired-holding));
    const projectedAtPayday=round(Math.max(0,holding-preBills));
    const protectedAtPayday=round(Math.max(0,holding+topUpNow-preBills));
    const cycleRequired=round(minimum+cycleBills);
    const paydayTransfer=round(Math.max(0,cycleRequired-protectedAtPayday));
    const postCycleHeadroom=round(Math.max(0,protectedAtPayday-cycleRequired));
    return {
      items:preItems,
      prePaydayItems:preItems,
      cycleItems:nextItems,
      preBills,
      cycleBills,
      bills:preBills,
      recurring:0,
      minimum,
      holding,
      required:currentRequired,
      currentRequired,
      cycleRequired,
      topUp:topUpNow,
      topUpNow,
      projectedAtPayday,
      protectedAtPayday,
      paydayTransfer,
      postCycleHeadroom,
      headroom:Math.max(0,holding-currentRequired),
      paydayDate:range?iso(range.payday):'',
      nextPayday:range?iso(range.next):''
    };
  };

  window.m25SinkingFundPlan=function(paydayValue){
    const range=windows(paydayValue)||windows(m22DefaultPayday());
    const protection=window.m22BillProtection(range.payday);
    let headroom=Math.max(0,n(protection.postCycleHeadroom));
    const all=typeof window.m25CanonicalCostRecords==='function'?window.m25CanonicalCostRecords():[];
    const unplanned=all.filter(record=>!record.due);
    const eligible=all.filter(record=>{
      const d=date(record.due);return d&&d>=range.next&&n(record.amount)>0;
    }).sort((a,b)=>date(a.due)-date(b.due));
    const details=eligible.map(record=>{
      const full=Math.max(0,n(record.amount));
      const funded=Math.min(headroom,full);headroom-=funded;
      const remaining=Math.max(0,full-funded);
      const paydays=Math.max(1,paydaysRemaining(range.payday,record.due));
      return {...record,fundedFromHeadroom:funded,remaining,paydays,contribution:remaining/paydays};
    });
    const totalCommitments=round(details.reduce((sum,row)=>sum+n(row.amount),0));
    const totalRemaining=round(details.reduce((sum,row)=>sum+n(row.remaining),0));
    const contribution=round(details.reduce((sum,row)=>sum+n(row.contribution),0));
    const cycleDetails=(protection.cycleItems||[]).map(item=>({...item,amount:amount(item),sourceLabel:sourceLabel(item),paydays:1,contribution:amount(item),dueThisCycle:true}));
    return {
      paydayDate:iso(range.payday),nextPayday:iso(range.next),protection,details,unplanned,
      totalCommitments,totalRemaining,allocatedHeadroom:round(details.reduce((sum,row)=>sum+n(row.fundedFromHeadroom),0)),contribution,
      cycleDetails,cycleCommitments:protection.cycleBills,payCycleStart:iso(range.payday),payCycleEnd:iso(range.next)
    };
  };
  window.m24RegularHoldingContribution=function(){return window.m25SinkingFundPlan(m22EnsureState().paydayDate||m22DefaultPayday()).contribution};

  window.m22ComputePlan=function(){
    const mission=m22EnsureState(),inputs=m22InputSnapshot(),protection=window.m22BillProtection(mission.paydayDate),sinking=window.m25SinkingFundPlan(mission.paydayDate);
    const expected=inputs.expected,actual=inputs.actual,extra=Math.max(0,actual-expected),shortfall=Math.max(0,expected-actual);
    let available=actual;const actions=[];
    const cycleHoldingTarget=Math.max(0,n(protection.paydayTransfer));
    const cycleHoldingAmount=Math.min(cycleHoldingTarget,available);
    if(cycleHoldingAmount>.009){
      actions.push({id:'holding:cycle',name:'Holding Pot next pay-cycle funding',amount:cycleHoldingAmount,type:'holding',holdingKind:'cycle',meta:`Covers ${m15Money(protection.cycleBills)} of bills from ${dateLabel(protection.paydayDate)} to ${dateLabel(protection.nextPayday)} while preserving the ${m15Money(protection.minimum)} buffer`});
      available-=cycleHoldingAmount;
    }
    const regularHoldingTarget=Math.max(0,n(sinking.contribution));
    const regularHoldingAmount=Math.min(regularHoldingTarget,available);
    if(regularHoldingAmount>.009){
      actions.push({id:'holding:regular',name:'Holding Pot future due-date contribution',amount:regularHoldingAmount,type:'holding',holdingKind:'regular',meta:`Date-aware funding across ${sinking.details.length} later commitment${sinking.details.length===1?'':'s'} • target ${m15Money(regularHoldingTarget)}`});
      available-=regularHoldingAmount;
    }
    let regularBudget=available,lifestyle=inputs.lifestyle,goals=inputs.goalPots,houseBoost=inputs.houseBoost||0,emergencyBoost=inputs.emergencyBoost||0,core=inputs.coreInvestment;
    let deficit=Math.max(0,lifestyle+goals+houseBoost+emergencyBoost+core-regularBudget);
    const lifestyleCut=Math.min(lifestyle,deficit);lifestyle-=lifestyleCut;deficit-=lifestyleCut;
    const goalsCut=Math.min(goals,deficit);goals-=goalsCut;deficit-=goalsCut;
    const houseCut=Math.min(houseBoost,deficit);houseBoost-=houseCut;deficit-=houseCut;
    const emergencyCut=Math.min(emergencyBoost,deficit);emergencyBoost-=emergencyCut;deficit-=emergencyCut;
    const coreCut=Math.min(core,deficit);core-=coreCut;deficit-=coreCut;
    if(lifestyle>.009){actions.push({id:'regular:lifestyle',name:'Spending Pot',amount:lifestyle,type:'lifestyle',potId:'spending_pot',meta:lifestyleCut>0?`Reduced by ${m15Money(lifestyleCut)} under low-pay protection`:'Four-week lifestyle allocation'});regularBudget-=lifestyle}
    const houseResult=m33BuildSpecialPotAction(houseBoost,'house','regular');actions.push(...houseResult.actions);regularBudget-=houseResult.used;goals+=houseResult.unused;
    const emergencyResult=m33BuildSpecialPotAction(emergencyBoost,'emergency','regular');actions.push(...emergencyResult.actions);regularBudget-=emergencyResult.used;goals+=emergencyResult.unused;
    const specialIds=[...houseResult.actions,...emergencyResult.actions].map(action=>action.potId);
    const goalResult=m22BuildPotActions(goals,'priority','regular',['spending_pot',...specialIds]);actions.push(...goalResult.actions);regularBudget-=goalResult.actions.reduce((sum,action)=>sum+action.amount,0);
    const coreActions=m22InvestmentActions(core,inputs.platform,'core');actions.push(...coreActions);regularBudget-=coreActions.reduce((sum,action)=>sum+action.amount,0);available=Math.max(0,regularBudget);
    const extraAvailable=Math.min(extra,available),extraRequested=Math.min(extraAvailable,inputs.extraAllocate);let extraRemaining=extraRequested;
    if(extraRemaining>.009){
      if(inputs.strategy==='isa'){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,'extra'));extraRemaining=0}
      else{const result=m22BuildPotActions(extraRemaining,inputs.strategy,'extra',['spending_pot',...specialIds]);actions.push(...result.actions);extraRemaining=result.remaining;if(extraRemaining>.009){actions.push(...m22InvestmentActions(extraRemaining,inputs.platform,'extra'));extraRemaining=0}}
      available-=extraRequested;
    }
    const buffered=Math.max(0,available);actions.push({id:'buffer:retained',name:'Retain in current account',amount:buffered,type:'buffer',meta:'Money deliberately left in the current account after all planned transfers'});
    const planned=actions.reduce((sum,action)=>sum+action.amount,0);
    return {
      logicVersion:M40_LOGIC_VERSION,createdAt:new Date().toISOString(),paydayDate:mission.paydayDate,inputs,protection,sinking,expected,actual,extra,shortfall,
      currentTopUpNow:protection.topUpNow,cycleHoldingTarget,cycleHoldingAmount,
      holdingAmount:cycleHoldingAmount+regularHoldingAmount,urgentHoldingAmount:cycleHoldingAmount,regularHoldingTarget,regularHoldingAmount,
      lifestyleCut,goalsCut,houseCut,emergencyCut,coreCut,
      unresolvedProtection:Math.max(0,protection.topUpNow)+Math.max(0,cycleHoldingTarget-cycleHoldingAmount),
      unresolvedRegularHolding:Math.max(0,regularHoldingTarget-regularHoldingAmount),actions,planned,buffered
    };
  };
  window.m22CurrentPlan=function(){
    const mission=m22EnsureState();
    if(mission.plan&&mission.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;
    return mission.plan||window.m22ComputePlan();
  };

  window.m22Instruction=function(plan){
    const el=document.getElementById('m15Instruction');if(!el)return;
    if(n(plan.protection?.topUpNow)>.009){el.className='m22-callout risk';el.innerHTML=`Current Holding Pot protection is short by <strong>${m15Money(plan.protection.topUpNow)}</strong> before payday. This is a top-up needed now, not part of the payday wage allocation.`;return}
    if(Math.max(0,n(plan.cycleHoldingTarget)-n(plan.cycleHoldingAmount))>.009){el.className='m22-callout risk';el.innerHTML=`The wage cannot fully fund the next pay cycle. <strong>${m15Money(Math.max(0,n(plan.cycleHoldingTarget)-n(plan.cycleHoldingAmount)))}</strong> remains unfunded after protecting flexible spending first.`;return}
    if(plan.unresolvedRegularHolding>.009){el.className='m22-callout risk';el.innerHTML=`The next pay cycle is protected, but <strong>${m15Money(plan.unresolvedRegularHolding)}</strong> of later due-date funding remains unfunded.`;return}
    if(plan.shortfall>.009){el.className='m22-callout watch';el.innerHTML=`Pay is <strong>${m15Money(plan.shortfall)} below expected</strong>. Aurora funded the next payday-to-payday cycle first, then reduced flexible allocations.`;return}
    el.className='m22-callout good';el.innerHTML=`Protected now: <strong>${m15Money(plan.protection.preBills)}</strong> of bills are covered until payday, with no immediate top-up needed. On payday, transfer <strong>${m15Money(plan.cycleHoldingAmount)}</strong> for the following four-week cycle and <strong>${m15Money(plan.regularHoldingAmount)}</strong> for later commitments.`;
  };

  function ensureDom(){
    const urgent=document.querySelector('.m36-urgent-move');
    if(urgent){urgent.querySelector('span').textContent='Top-up needed now';urgent.querySelector('small').textContent='Only bills due before the next payday plus the protected buffer';}
    const cycle=document.querySelector('.m36-future-move');
    if(cycle){cycle.classList.add('m40-cycle-move');cycle.querySelector('span').textContent='Next payday cycle funding';cycle.querySelector('small').textContent='Bills due from this payday to the following payday';}
    const final=document.getElementById('finalContributionCard');
    if(final){final.querySelector('span').textContent='Total planned payday transfer';}
    if(cycle&&!document.getElementById('m40FutureDue')){
      const article=document.createElement('article');article.className='m40-future-due-move';article.innerHTML='<span>Future due-date contribution</span><strong>£<b id="m40FutureDue">0.00</b></strong><small id="m40FutureDueMeta">Funding spread across paydays before later commitments</small>';
      cycle.insertAdjacentElement('afterend',article);
    }
    const grid=document.querySelector('.m36-decision-grid');
    if(grid&&!document.getElementById('m40WindowBreakdown')){
      const details=document.createElement('details');details.id='m40WindowBreakdown';details.className='m40-window-breakdown';details.innerHTML='<summary><span>Show exactly what is being protected</span><small id="m40BreakdownHint">Current cycle and next cycle</small></summary><div class="m40-breakdown-body"><div class="m40-window"><div class="m40-window-head"><span>Now → payday</span><strong id="m40CurrentTotal">£0.00</strong></div><div id="m40CurrentRows"></div></div><div class="m40-window"><div class="m40-window-head"><span>Payday → following payday</span><strong id="m40NextTotal">£0.00</strong></div><div id="m40NextRows"></div></div></div>';
      grid.insertAdjacentElement('afterend',details);
    }
    const protect=document.querySelector('.m22-protection');
    if(protect){
      const labels=[...protect.querySelectorAll('.m22-protect-item span')];
      labels.forEach(label=>{
        const t=label.textContent.trim();
        if(t==='Monthly spend remaining')label.textContent='Projected Holding on payday';
        if(t==='Total Holding requirement')label.textContent='Required until payday';
        if(t==='Urgent top-up')label.textContent='Next pay-cycle funding';
        if(t==='Regular contribution')label.textContent='Future due-date funding';
      });
      if(!document.getElementById('m40TopUpNow')){
        const card=document.createElement('div');card.className='m22-protect-item';card.innerHTML='<span>Top-up needed now</span><strong id="m40TopUpNow">£0.00</strong>';
        protect.insertBefore(card,protect.children[5]||null);
      }
    }
  }
  function rowsHtml(items){
    if(!items?.length)return '<div class="m40-empty">No included payments in this window.</div>';
    return items.map(item=>`<div class="m40-bill-row"><div><strong>${m22Escape(item.name||'Unnamed payment')}</strong><small>${m22Escape(dateLabel(item.due||item._d))} • ${m22Escape(sourceLabel(item))}</small></div><b>${m15Money(amount(item))}</b></div>`).join('');
  }
  function renderClarity(){
    ensureDom();
    const payday=m22EnsureState().paydayDate||m22DefaultPayday();
    const protection=window.m22BillProtection(payday),sinking=window.m25SinkingFundPlan(payday);
    const topUpNow=round(protection.topUpNow),cycleTransfer=round(protection.paydayTransfer),future=round(sinking.contribution),paydayTotal=round(cycleTransfer+future);
    setText('currentPotOffset',formatMoney(topUpNow));
    setText('currentPotOffsetMeta',topUpNow>0?`${m15Money(protection.preBills)} due before payday plus ${m15Money(protection.minimum)} buffer exceeds the current Holding Pot.`:`${m15Money(protection.preBills)} due before payday is already covered. Projected Holding on payday: ${m15Money(protection.projectedAtPayday)}.`);
    setText('suggestedContributionNow',formatMoney(cycleTransfer));
    setText('suggestedContributionMeta',`${m15Money(protection.cycleBills)} of bills fall in the next four-week payday cycle. This transfer preserves the ${m15Money(protection.minimum)} buffer.`);
    setText('m40FutureDue',formatMoney(future));
    setText('m40FutureDueMeta',future>0?`${sinking.details.length} later commitment${sinking.details.length===1?'':'s'} spread across the paydays before each due date.`:'No later due-date contribution is needed this payday.');
    setText('finalAmountToAdd',formatMoney(paydayTotal));
    setText('finalAmountToAddMeta',paydayTotal>0?`${m15Money(cycleTransfer)} next-cycle funding + ${m15Money(future)} later due-date funding.`:'No Holding Pot transfer is planned on payday.');
    setText('finalPotTopUp',`£${formatMoney(paydayTotal)}`);
    setText('finalPotTopUpMeta',paydayTotal>0?`${m15Money(cycleTransfer)} next cycle + ${m15Money(future)} future contribution`:'No payday Holding transfer required');
    setText('commandPaydayMove',`£${formatMoney0(paydayTotal)}`);
    setText('m13LineHolding',m13GBP(paydayTotal).replace('.00',''));
    setText('m22RecurringReserve',m15Money(protection.projectedAtPayday));
    setText('m22HoldingRequirement',m15Money(protection.currentRequired));
    setText('m22UrgentHolding',m15Money(protection.paydayTransfer));
    setText('m22RegularHolding',m15Money(future));
    setText('m40TopUpNow',m15Money(topUpNow));
    setText('m40CurrentTotal',m15Money(protection.preBills));
    setText('m40NextTotal',m15Money(protection.cycleBills));
    const currentRows=document.getElementById('m40CurrentRows');if(currentRows)currentRows.innerHTML=rowsHtml(protection.prePaydayItems);
    const nextRows=document.getElementById('m40NextRows');if(nextRows)nextRows.innerHTML=rowsHtml(protection.cycleItems);
    setText('m40BreakdownHint',`${protection.prePaydayItems.length} now • ${protection.cycleItems.length} next cycle`);
    const actionHost=document.getElementById('paydayActionsList');
    if(actionHost){actionHost.innerHTML=[
      `<div class="m39-funding-line"><strong>Top-up needed now — ${m15Money(topUpNow)}</strong><span>${topUpNow>0?'Current Holding Pot is short before payday.':'Current bills are already protected until payday.'}</span></div>`,
      `<div class="m39-funding-line"><strong>Next payday cycle funding — ${m15Money(cycleTransfer)}</strong><span>Covers ${m15Money(protection.cycleBills)} due from payday to the following payday while retaining the buffer.</span></div>`,
      `<div class="m39-funding-line"><strong>Future due-date contribution — ${m15Money(future)}</strong><span>${future>0?`Builds funding for ${sinking.details.length} later commitment${sinking.details.length===1?'':'s'}.`:'No later funding is needed this payday.'}</span></div>`,
      `<div class="m39-funding-total"><strong>Total planned payday transfer — ${m15Money(paydayTotal)}</strong></div>`
    ].join('')}
    const recommendation=document.getElementById('m36RecommendationState');if(recommendation)recommendation.textContent=topUpNow>.005?'TOP UP NOW':paydayTotal>.005?'PLAN PAYDAY':'COVERED';
    const finalCard=document.getElementById('finalContributionCard');if(finalCard)finalCard.dataset.state=paydayTotal>.005?'fund':'covered';
  }

  window.m40RenderClarity=renderClarity;
  const baseUpdatePlannerTotals=typeof window.updatePlannerTotals==='function'?window.updatePlannerTotals:null;
  if(baseUpdatePlannerTotals){
    window.updatePlannerTotals=function(){
      const result=baseUpdatePlannerTotals.apply(this,arguments);
      renderClarity();
      return result;
    };
  }
  window.m22Render=function(){const result=previousRender?previousRender.apply(this,arguments):undefined;renderClarity();return result};
  window.m22RenderReceipt=function(){
    if(previousReceipt)previousReceipt.apply(this,arguments);
    const host=document.getElementById('m22Receipt');if(!host||!host.classList.contains('show'))return;
    host.querySelectorAll('.m22-receipt-item span').forEach(label=>{if(label.textContent.trim()==='Urgent Holding top-up')label.textContent='Next pay-cycle funding'});
  };
  window.m33ComputeScenario=function(){
    const plan=m22CurrentPlan(),protection=window.m22BillProtection(m22EnsureState().paydayDate),pay=n(document.getElementById('m33ScenarioPay')?.value),retainedTarget=n(document.getElementById('m33ScenarioRetain')?.value);
    const cycle=Math.min(protection.paydayTransfer,pay);let left=Math.max(0,pay-cycle);const regularTarget=window.m24RegularHoldingContribution(),regular=Math.min(regularTarget,left);left=Math.max(0,left-regular);
    const get=id=>Math.max(0,n(document.getElementById(id)?.value));
    let lifestyle=get('m33ScenarioLifestyle'),goals=get('m33ScenarioGoals'),house=get('m33ScenarioHouse'),emergency=get('m33ScenarioEmergency'),shares=get('m33ScenarioShares');
    const flexibleBudget=Math.max(0,left-retainedTarget);let deficit=Math.max(0,lifestyle+goals+house+emergency+shares-flexibleBudget);
    const trim=holder=>{const cut=Math.min(holder.value,deficit);holder.value-=cut;deficit-=cut;return cut};
    const l={value:lifestyle},g={value:goals},h={value:house},e={value:emergency},sh={value:shares};
    const cuts={lifestyle:trim(l),goals:trim(g),house:trim(h),emergency:trim(e),shares:trim(sh)};lifestyle=l.value;goals=g.value;house=h.value;emergency=e.value;shares=sh.value;
    const allocated=cycle+regular+lifestyle+goals+house+emergency+shares,retained=Math.max(0,pay-allocated);
    const unresolved=Math.max(0,protection.topUpNow)+Math.max(0,protection.paydayTransfer-cycle)+Math.max(0,regularTarget-regular),retainGap=Math.max(0,retainedTarget-retained),cutTotal=Object.values(cuts).reduce((a,b)=>a+b,0);
    let state='healthy',label='HEALTHY';if(unresolved>.009){state='risk';label='UNPROTECTED'}else if(cutTotal>.009){state='risk';label='AUTO-REDUCED'}else if(retainGap>.009||retained<100){state='tight';label='TIGHT'}
    const score=Math.max(0,Math.min(100,Math.round(100-(unresolved/(pay||1)*100)-(cutTotal/(pay||1)*60)-(retainGap/Math.max(retainedTarget,1)*25)-(retained<100?(100-retained)/2:0))));
    return {plan,pay,expected:n(plan.expected),overtime:Math.max(0,pay-n(plan.expected)),retainedTarget,urgent:cycle,regular,protection:cycle+regular,lifestyle,goals,house,emergency,shares,allocated,retained,unresolved,retainGap,cuts,state,label,score};
  };
  if(previousScenarioRender)window.m33RenderScenario=function(){const result=previousScenarioRender.apply(this,arguments);renderClarity();return result};

  function contributionRate(){return Math.max(0,n(document.getElementById('paydayContributionInput')?.value))}
  function contributionStatus(message,tone){
    const el=document.getElementById('m41ContributionStatus');if(!el)return;
    el.textContent=message;el.className='m41-contribution-status '+(tone||'');
  }
  function persistContributionRate(){
    if(typeof plannerState==='undefined')return;
    plannerState.paydayContribution=contributionRate();
    if(typeof savePlannerData==='function')savePlannerData();
    renderClarity();
    contributionStatus('Saved rate: '+m15Money(plannerState.paydayContribution)+' per payday. This has not changed the Holding Pot balance.','good');
  }
  const rateInput=document.getElementById('paydayContributionInput');
  rateInput?.addEventListener('input',persistContributionRate);
  rateInput?.addEventListener('change',persistContributionRate);
  document.getElementById('holdingBalanceInput')?.addEventListener('input',()=>requestAnimationFrame(renderClarity));
  document.getElementById('minimumBufferInput')?.addEventListener('input',()=>requestAnimationFrame(renderClarity));
  document.getElementById('addPaydayBtn')?.addEventListener('click',()=>{
    const moved=contributionRate();
    setTimeout(()=>{
      if(typeof savePlannerData==='function')savePlannerData();
      renderClarity();
      contributionStatus(moved>0?m15Money(moved)+' added to the Holding Pot. New balance: '+m15Money(plannerState?.holdingBalance||0)+'.':'Enter an amount before recording the transfer.',moved>0?'good':'warn');
    },0);
  });
  contributionStatus('Saved rate: '+m15Money(contributionRate())+' per payday. It is not counted as a transfer until you press Add payday contribution.');

  const mission=m22EnsureState();if(mission.plan&&mission.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!mission.completed)mission.plan=null;
  ensureDom();
  window.addEventListener('load',()=>{const state=m22EnsureState();if(state.plan&&state.plan.logicVersion!==M40_LOGIC_VERSION&&!m22AnyExecuted()&&!state.completed)state.plan=null;if(typeof m22Render==='function')m22Render();renderClarity()});
})();


/* ===== Original inline script 21 ===== */
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


/* ===== Original inline script 22 ===== */
/* ===================== AURORA SMART WEALTH CENTRE ROUTER ===================== */
(()=>{
  const dock=document.querySelector('.aurora-smart-dock[data-aurora-page]');
  const launcher=document.getElementById('auroraDockLauncher');
  if(!dock)return;
  const page=dock.dataset.auroraPage||'nexus';
  const local=location.protocol==='file:';
  const routes=local?{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    transfer:'AuroraCityFC_TransferCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster_Connected_v3.html'
  }:{
    nexus:'AuroraCityFC_NexusMaster.html',
    wealth:'AuroraCityFC_FinanceDepartment.html',
    brain:'AuroraCityFC_ScoutingCentre.html',
    transfer:'AuroraCityFC_TransferCentre.html',
    registration:'AuroraCityFC_TransferCentre.html#registration-desk',
    tesco:'TescoSimMaster.html'
  };
  const labels={nexus:'NEXUS HQ • SYSTEM OVERVIEW',wealth:'WEALTH HQ • PAYDAY & POTS',brain:'TRADING BRAIN • ANALYTICS',transfer:'TRANSFER CENTRE • EXECUTION',registration:'REGISTRATION DESK • PURCHASES',tesco:'TESCO SAYE • 2029 PLAN'};
  const nextMap={nexus:['wealth','Open Finance Department →'],wealth:['transfer','Next: Transfer Centre →'],brain:['transfer','Open Transfer Centre →'],transfer:['registration','Next: Registration →'],registration:['nexus','Return to Nexus HQ →'],tesco:['nexus','Return to Nexus HQ →']};
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const money=(v)=>Number(v||0).toLocaleString('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0});
  const setStatus=(name,text,tone)=>{const el=dock.querySelector('[data-aurora-status="'+name+'"]');if(!el)return;el.textContent=text;el.className='aurora-smart-status '+(tone||'')};
  dock.querySelectorAll('[data-aurora-route]').forEach(link=>{const name=link.dataset.auroraRoute;link.href=routes[name]||'#';link.classList.toggle('active',name===page);if(name===page)link.setAttribute('aria-current','page')});
  const current=dock.querySelector('[data-aurora-current-label]');if(current)current.textContent=labels[page]||labels.nexus;
  const [nextRoute,nextText]=nextMap[page]||nextMap.nexus;const next=dock.querySelector('[data-aurora-next]');if(next){next.href=routes[nextRoute];next.textContent=nextText}
  dock.querySelector('[data-aurora-back]')?.addEventListener('click',()=>{const ref=document.referrer;if(history.length>1&&(local||(ref&&new URL(ref,location.href).origin===location.origin)))history.back();else location.href=routes.nexus});
  function refresh(){
    const mission=read('aurora_wealth_investment_mission_v1');const decision=read('aurora_trading_brain_decision_v1');const queue=read('aurora_pending_registrations_v1');
    if(mission){const budget=Number(mission.budget||mission.investmentBudget||mission.amount||0);setStatus('wealth',budget>0?money(budget):'MISSION READY',budget>0?'good':'');setStatus('transfer',budget>0?money(budget):'MISSION READY',budget>0?'good':'')}else{setStatus('wealth',page==='wealth'?'OPEN':'NO MISSION',page==='wealth'?'cyan':'watch');setStatus('transfer','NO MISSION','watch')}
    if(decision&&Array.isArray(decision.purchases)&&decision.purchases.length)setStatus('brain',decision.purchases.length+' PLANNED','good');else setStatus('brain',page==='brain'?'OPEN':'PLAN READY','cyan');
    if(Array.isArray(queue)&&queue.length){const pending=queue.filter(x=>String(x.status||'').toLowerCase()!=='completed').length;setStatus('registration',pending?pending+' WAITING':'READY',pending?'good':'cyan')}else setStatus('registration','EMPTY','');
    setStatus('nexus','HOME','cyan');setStatus('tesco','2029 PLAN','cyan');
  }
  refresh();window.addEventListener('storage',refresh);
  launcher?.addEventListener('click',()=>dock.scrollIntoView({behavior:'smooth',block:'end'}));
  let timer=null;
  function updateLauncher(){
    if(!launcher)return;
    const rect=dock.getBoundingClientRect();
    const nearDock=rect.top<window.innerHeight&&rect.bottom>0;
    launcher.classList.toggle('is-near-dock',nearDock);
  }
  window.addEventListener('scroll',()=>{
    if(!launcher)return;
    launcher.classList.add('is-scrolling');
    clearTimeout(timer);
    timer=setTimeout(()=>{launcher.classList.remove('is-scrolling');updateLauncher()},320);
  },{passive:true});
  window.addEventListener('resize',updateLauncher,{passive:true});
  updateLauncher();
})();


/* ===== Original inline script 23 ===== */
/* ===================== M43 PAYDAY POT GAP DEDUPLICATION FIX ===================== */
(function(){
  let plannedPotLedger = new Map();

  function potKey(p){ return String((p && (p.id || p.name)) || ''); }
  function money(v){ return typeof m15Money === 'function' ? m15Money(v) : `£${Number(v||0).toFixed(2)}`; }

  const originalComputePlan = window.m22ComputePlan;

  window.m22BuildPotActions = m22BuildPotActions = function(amount,strategy,prefix='goal',excludeIds=[]){
    let remaining=Math.max(0,Number(amount||0));
    const actions=[];
    const excluded=new Set((excludeIds||[]).map(String));
    const pots=(Array.isArray(plannerState.editablePots)?plannerState.editablePots:[])
      .map(p=>({
        ...p,
        gap:Math.max(0,m15PotGap(p)-Number(plannedPotLedger.get(potKey(p))||0)),
        priority:m15PotPriority(p)
      }))
      .filter(p=>p.gap>.009&&!excluded.has(potKey(p)));

    const reserve=(p,value,meta)=>{
      const key=potKey(p);
      const alreadyInCall=actions.filter(a=>String(a.potId)===key).reduce((s,a)=>s+Number(a.amount||0),0);
      const availableGap=Math.max(0,p.gap-alreadyInCall);
      const actual=Math.max(0,Math.min(remaining,Number(value||0),availableGap));
      if(actual<=.009)return;
      actions.push({id:`${prefix}:pot:${key}`,name:p.name,amount:actual,type:'pot',potId:key,meta});
      remaining-=actual;
    };

    if(strategy==='balanced'){
      let active=[...pots].sort((a,b)=>a.priority-b.priority||b.gap-a.gap);
      while(remaining>.009&&active.length){
        const share=remaining/active.length;
        const next=[];
        active.forEach(p=>{
          const key=potKey(p);
          const used=actions.filter(a=>String(a.potId)===key).reduce((s,a)=>s+Number(a.amount||0),0);
          const need=Math.max(0,p.gap-used);
          const value=Math.min(share,need,remaining);
          if(value>.009){
            actions.push({id:`${prefix}:pot:${key}`,name:p.name,amount:value,type:'pot',potId:key,meta:`P${p.priority} • balanced funding • ${money(p.gap)} remaining gap`});
            remaining-=value;
          }
          if(need-value>.009)next.push(p);
        });
        if(next.length===active.length&&share<.01)break;
        active=next;
      }
    }else{
      const maxPriority=strategy==='critical'?1:3;
      pots.filter(p=>p.priority<=maxPriority)
        .sort((a,b)=>a.priority-b.priority||b.gap-a.gap)
        .forEach(p=>reserve(p,p.gap,`P${p.priority} ${p.priority===1?'Critical':p.priority===2?'Important':'Flexible'} • ${money(p.gap)} remaining target gap`));
    }

    const merged=[];
    const byId=new Map();
    actions.forEach(action=>{
      if(byId.has(action.id))byId.get(action.id).amount+=action.amount;
      else{const copy={...action};byId.set(copy.id,copy);merged.push(copy);}
    });

    merged.forEach(action=>{
      const key=String(action.potId||'');
      plannedPotLedger.set(key,Number(plannedPotLedger.get(key)||0)+Number(action.amount||0));
    });
    return {actions:merged,remaining};
  };

  if(typeof originalComputePlan==='function'){
    window.m22ComputePlan=function(){
      plannedPotLedger=new Map();
      return originalComputePlan.apply(this,arguments);
    };
  }

  function clearStalePlan(){
    try{
      const mission=typeof m22EnsureState==='function'?m22EnsureState():null;
      if(mission && !mission.completed && !(typeof m22AnyExecuted==='function'&&m22AnyExecuted())){
        mission.plan=null;
        if(typeof m22Save==='function')m22Save();
        if(typeof m22Render==='function')m22Render();
      }
    }catch(err){console.warn('Aurora allocator refresh',err);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clearStalePlan,180));
  else setTimeout(clearStalePlan,180);
})();


/* ===== Original inline script 24 ===== */
(function(){
  const money=v=>typeof m15Money==='function'?m15Money(Number(v||0)):`£${Number(v||0).toFixed(2)}`;
  const round=v=>Math.round((Number(v||0)+Number.EPSILON)*100)/100;
  function destinationKey(a){
    if(a.type==='holding')return 'holding';
    if(a.type==='buffer')return 'buffer';
    if(a.type==='investment')return `investment:${String(a.platform||a.name||'shares').toLowerCase()}`;
    if(a.type==='lifestyle'||a.type==='pot')return `pot:${String(a.potId||a.name||'pot').toLowerCase()}`;
    return `${a.type}:${String(a.id||a.name)}`;
  }
  function destinationName(a){
    if(a.type==='holding')return 'Transfer to Holding Pot';
    if(a.type==='buffer')return 'Retain in current account';
    if(a.type==='investment')return `Transfer to ${a.name||a.platform||'Investment account'}`;
    return `Transfer to ${a.name}`;
  }
  function componentLabel(a){
    if(a.type==='holding'&&a.holdingKind==='cycle')return 'Next pay-cycle protection';
    if(a.type==='holding'&&a.holdingKind==='urgent')return 'Immediate bill protection';
    if(a.type==='holding'&&a.holdingKind==='regular')return 'Future due-date funding';
    if(String(a.id||'').includes('priority'))return 'Priority goal funding';
    if(String(a.id||'').includes('regular'))return 'Regular payday allocation';
    if(String(a.id||'').includes('extra'))return 'Extra / overtime allocation';
    if(a.type==='buffer')return 'Deliberately retained cash';
    return a.name||'Allocation';
  }
  function consolidate(actions){
    const groups=new Map();
    (actions||[]).forEach(a=>{
      const key=destinationKey(a);
      if(!groups.has(key))groups.set(key,{...a,id:`bank:${key}`,name:destinationName(a),amount:0,components:[],originalIds:[]});
      const g=groups.get(key);
      g.amount=round(g.amount+Number(a.amount||0));
      g.components.push({id:a.id,label:componentLabel(a),amount:Number(a.amount||0),meta:a.meta||'',holdingKind:a.holdingKind||''});
      g.originalIds.push(a.id);
      if(a.type==='holding'){
        g.holdingKind='combined';
        g.urgentAmount=round(Number(g.urgentAmount||0)+(a.holdingKind==='urgent'?Number(a.amount||0):0));
        g.cycleAmount=round(Number(g.cycleAmount||0)+(a.holdingKind==='cycle'?Number(a.amount||0):0));
        g.regularAmount=round(Number(g.regularAmount||0)+(a.holdingKind==='regular'?Number(a.amount||0):0));
      }
    });
    return [...groups.values()].map(g=>{
      const parts=g.components.map(c=>`${c.label} ${money(c.amount)}`);
      g.meta=parts.join(' • ');
      return g;
    });
  }
  const baseCompute=window.m22ComputePlan;
  if(typeof baseCompute==='function'){
    window.m22ComputePlan=function(){
      const plan=baseCompute.apply(this,arguments);
      plan.actions=consolidate(plan.actions);
      plan.planned=round(plan.actions.reduce((s,a)=>s+Number(a.amount||0),0));
      plan.bankingMissionVersion=41;
      return plan;
    };
  }
  function clearOldDraft(){
    try{
      const mission=typeof m22EnsureState==='function'?m22EnsureState():null;
      if(mission&&!mission.completed&&!Object.keys(mission.executed||{}).length&&mission.plan&&!mission.plan.bankingMissionVersion){mission.plan=null;}
    }catch(e){}
  }
  const baseRender=window.m22Render;
  if(typeof baseRender==='function'){
    window.m22Render=function(){
      clearOldDraft();
      const result=baseRender.apply(this,arguments);
      document.querySelectorAll('#m15AllocationList .m22-action-row').forEach((row,index)=>{
        const plan=typeof m22CurrentPlan==='function'?m22CurrentPlan():null;
        const action=plan?.actions?.[index];
        if(!action)return;
        const name=row.querySelector('.m22-action-name');
        if(name&&!name.querySelector('.m41-transfer-label'))name.insertAdjacentHTML('afterbegin','<span class="m41-transfer-label">Banking action</span>');
        const meta=row.querySelector('.m22-action-meta');
        if(meta&&action.components?.length>1){
          meta.innerHTML=`<div class="m41-breakdown">${action.components.map(c=>`<div class="m41-breakdown-row"><span>${typeof m22Escape==='function'?m22Escape(c.label):c.label}</span><b>${money(c.amount)}</b></div>`).join('')}</div>`;
        }
      });
      const route=document.getElementById('m15Route');
      const plan=typeof m22CurrentPlan==='function'?m22CurrentPlan():null;
      if(route&&plan)route.innerHTML=plan.actions.map((a,i)=>`<div class="m22-route-step"><div class="m22-step-no">${i+1}</div><div><div class="m22-step-title">${typeof m22Escape==='function'?m22Escape(a.name):a.name}</div><div class="m22-step-meta">${a.components?.map(c=>`${c.label} ${money(c.amount)}`).join(' • ')||a.meta||''}</div></div><div class="m22-step-amount">${money(a.amount)}</div></div>`).join('');
      return result;
    };
  }
  window.m22CompletePayday=function(){
    const mission=m22EnsureState(),plan=m22CurrentPlan();
    if(plan.actions.some(a=>!m22ActionDone(a))){m22ShowStatus('Complete every banking move before closing the mission.',true);return}
    const rec=m25Reconciliation(plan);if(Math.abs(rec.difference)>=.011){m22ShowStatus(`The current account does not reconcile. Correct the ${money(Math.abs(rec.difference))} difference first.`,true);return}
    const actualFor=a=>Number(m25ActualForAction(a)||0);
    const actualBy=predicate=>plan.actions.filter(predicate).reduce((s,a)=>s+actualFor(a),0);
    const holdingAction=plan.actions.find(a=>a.type==='holding');
    const holdingActual=holdingAction?actualFor(holdingAction):0;
    const holdingPlanned=holdingAction?Number(holdingAction.amount||0):0;
    const scale=holdingPlanned>0?holdingActual/holdingPlanned:0;
    const urgentHolding=round((Number(holdingAction?.urgentAmount||0)+Number(holdingAction?.cycleAmount||0))*scale);
    const regularHolding=round(Number(holdingAction?.regularAmount||0)*scale);
    const holdingAdded=actualBy(a=>a.type==='holding'),potsFunded=actualBy(a=>a.type==='pot'||a.type==='lifestyle'),invested=actualBy(a=>a.type==='investment'),buffered=actualBy(a=>a.type==='buffer');
    const receipt={id:mission.id,paydayDate:mission.paydayDate,actualPay:plan.actual,expectedPay:plan.expected,extraPay:plan.extra,plannedTotal:plan.planned,urgentHolding,regularHolding,holdingAdded,potsFunded,invested,buffered,transfersCompleted:rec.completed,closingHolding:Number(plannerState.holdingBalance||0),openingHolding:Number(mission.openingHolding??(Number(plannerState.holdingBalance||0)-holdingAdded)),difference:rec.difference,actionCount:plan.actions.length,actions:plan.actions.map(a=>({id:a.id,name:a.name,type:a.type,planned:Number(a.amount||0),actual:actualFor(a),components:a.components||[]})),completedAt:new Date().toISOString()};
    mission.completed=true;mission.completedAt=receipt.completedAt;mission.receipt=receipt;plannerState.paydayHistory.push({...receipt,summary:`${money(receipt.invested)} invested • ${money(receipt.holdingAdded)} to Holding • ${money(receipt.potsFunded)} to pots • ${money(receipt.buffered)} retained`});plannerState.paydayHistory=plannerState.paydayHistory.slice(-24);m22Save();m22ShowStatus('Payday banking mission completed, reconciled and saved.');m22Render();
  };
  clearOldDraft();
  setTimeout(()=>{try{window.m22Render?.()}catch(e){}},80);
})();


/* ===== Original inline script 25 ===== */
(()=>{
 const CANONICAL='aurora_finance_department_mission_v1',LEGACY='aurora_wealth_investment_mission_v1',TEST='aurora_transfer_test_mode_v1';
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
 function publish(){const mission=read(LEGACY)||read(CANONICAL);if(!mission)return;const test=read(TEST);const enriched={...mission,source:'Finance Department',department:'Finance Department',destination:'Aurora City FC Transfer Centre',status:mission.status||'READY_FOR_TRANSFER_CENTRE',testMode:!!test?.active,updatedAt:new Date().toISOString()};write(CANONICAL,enriched);write(LEGACY,enriched);try{dispatchEvent(new CustomEvent('aurora:finance-mission',{detail:enriched}))}catch(_){}}
 function rebrand(){document.title='Aurora Finance Department — Payday & Capital Control';document.querySelectorAll('.m13-club strong').forEach(el=>el.textContent='Finance Department');const hero=document.querySelector('.aurora-title');if(hero)hero.innerHTML='Finance<br>Department';document.querySelectorAll('a[href*="from=wealth-hq"]').forEach(a=>a.href=a.href.replace('from=wealth-hq','from=finance-department'));document.body.classList.toggle('finance-test-mode',!!read(TEST)?.active)}
 function init(){rebrand();publish();document.getElementById('m37SendToTradingBrain')?.addEventListener('click',()=>setTimeout(publish,30));addEventListener('storage',e=>{if([LEGACY,CANONICAL,TEST].includes(e.key)){publish();rebrand()}});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ===== Original inline script 26 ===== */
(()=>{
  const PAGE='finance';
  const ROUTES={"nexus":"AuroraCityFC_NexusMaster.html","finance":"AuroraCityFC_FinanceDepartment.html","manager":"AuroraCityFC_ManagerDashboard.html","transfer":"AuroraCityFC_TransferCentre.html","squad":"AuroraCityFC_SquadHub.html","boardroom":"AuroraCityFC_Boardroom.html","analysis":"AuroraCityFC_AnalysisRoom.html","training":"AuroraCityFC_TrainingGround.html","scouting":"AuroraCityFC_ScoutingCentre.html","media":"AuroraCityFC_MediaCentre.html"};
  const FINANCE_KEY='aurora_finance_department_mission_v1';
  const LEGACY_KEY='aurora_wealth_investment_mission_v1';
  const TEST_KEY='aurora_transfer_test_mode_v1';
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
  const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value||0));
  const mission=()=>read(FINANCE_KEY)||read(LEGACY_KEY);
  function mirrorMission(){const canonical=read(FINANCE_KEY),legacy=read(LEGACY_KEY);if(canonical&&!legacy)write(LEGACY_KEY,canonical);else if(legacy&&!canonical)write(FINANCE_KEY,{...legacy,source:legacy.source||'Finance Department'});}
  function patchLinks(){
    const map=[
      [/(?:AuroraCityFC_)?NexusMaster(?:_Connected_v\\d+|\\(\\d+\\))?\\.html/i,ROUTES.nexus],
      [/(?:SpendingPlannerMaster[^?#\"']*|AuroraWealthExecutiveRoom_Connected_v\\d+)\\.html/i,ROUTES.finance],
      [/AuroraCityFC_ManagerDashboard(?:\\(\\d+\\))?\\.html/i,ROUTES.manager],
      [/AuroraCityFC_TransferCentre(?:\\(\\d+\\)[^?#\"']*)?\\.html/i,ROUTES.transfer],
      [/AuroraCityFC_SquadHub(?:\\(\\d+\\))?\\.html/i,ROUTES.squad],
      [/AuroraCityFC_Boardroom(?:\\(\\d+\\))?\\.html/i,ROUTES.boardroom],
      [/AuroraCityFC_AnalysisRoom(?:\\(\\d+\\))?\\.html/i,ROUTES.analysis],
      [/AuroraCityFC_TrainingGround(?:\\(\\d+\\))?\\.html/i,ROUTES.training],
      [/AuroraCityFC_ScoutingCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.scouting],
      [/AuroraCityFC_MediaCentre(?:\\(\\d+\\))?\\.html/i,ROUTES.media],
      [/TradingBrainMaster(?:_Connected_v\\d+)?\\.html/i,ROUTES.scouting],
      [/RegistrationDesk\\.html/i,ROUTES.transfer+'#registration-desk']
    ];
    document.querySelectorAll('a[href]').forEach(a=>{let href=a.getAttribute('href')||'';map.forEach(([rx,to])=>{href=href.replace(rx,to)});a.setAttribute('href',href)});
  }
  function addFinanceSidebarLink(){
    const host=document.querySelector('.fm-side-scroll');if(!host||host.querySelector('[data-aurora-finance-sidebar]'))return;
    const a=document.createElement('a');a.href=ROUTES.finance;a.dataset.auroraFinanceSidebar='1';a.className='fm-side-link'+(PAGE==='finance'?' active':'');a.innerHTML='<span class="fm-side-icon">£</span><span>Finance Department</span>';
    const firstGroup=host.querySelector('.fm-nav-group');if(firstGroup)firstGroup.insertAdjacentElement('afterend',a);else host.prepend(a);
  }
  function addConnectedCard(){
    if(document.getElementById('auroraConnectedFinanceCard'))return;
    const card=document.createElement('section');card.id='auroraConnectedFinanceCard';card.className='aurora-connected-card';
    card.innerHTML='<div class="aurora-connected-card-inner"><div><small>Connected finance pipeline</small><strong data-card-title>Finance Department linked</strong><span data-card-copy>Checking the current payday investment mission…</span></div><div class="aurora-connected-actions"><a href="'+ROUTES.finance+'">Open Finance</a><a class="primary" href="'+ROUTES.transfer+'">Open Transfer Centre</a></div></div>';
    const target=document.querySelector('.transfer-hero,.hq-hero,.hero,.hero-card');
    if(target&&target.parentElement)target.insertAdjacentElement('afterend',card);else document.body.insertAdjacentElement('afterbegin',card);
  }
  function refresh(){
    mirrorMission();const m=mission();const test=read(TEST_KEY);const budget=Number(m?.budget||m?.investmentBudget||m?.amount||0);const account=m?.preferredAccount||m?.preferredPlatform||'Investment account';
    const summary=document.querySelector('[data-aurora-finance-summary]');
    if(summary)summary.textContent=m&&budget>0?`Finance Department linked • ${money(budget)} authorised • ${account}`:'Finance Department linked • no mission released';
    const title=document.querySelector('#auroraConnectedFinanceCard [data-card-title]');const copy=document.querySelector('#auroraConnectedFinanceCard [data-card-copy]');
    if(title)title.textContent=m&&budget>0?`${money(budget)} investment mission authorised`:'Finance Department linked';
    if(copy)copy.textContent=m&&budget>0?`${account} • payday ${m.paydayDate||'not set'} • ${Array.isArray(m.fundingSources)?m.fundingSources.length:1} funding source${Array.isArray(m.fundingSources)&&m.fundingSources.length===1?'':'s'}`:'Build the payday plan in Finance Department, then release the complete budget to the Transfer Centre.';
    document.querySelectorAll('[data-aurora-nav-status]').forEach(el=>{const name=el.dataset.auroraNavStatus;el.className='aurora-system-status';if(name==='finance'){el.textContent=budget>0?money(budget):'NO MISSION';el.classList.add(budget>0?'good':'watch')}else if(name==='transfer'){el.textContent=budget>0?'BUDGET READY':'WAITING';el.classList.add(budget>0?'cyan':'')}else if(name===PAGE){el.textContent='OPEN';el.classList.add('cyan')}else el.textContent='LINKED'});
    document.body.classList.toggle('aurora-transfer-test-active',!!test?.active);
  }
  function init(){
    document.querySelectorAll('.aurora-smart-dock').forEach(el=>el.style.setProperty('display','none','important'));
    patchLinks();addFinanceSidebarLink();addConnectedCard();refresh();
    const dock=document.querySelector('.aurora-system-dock');dock?.querySelector('.aurora-system-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else location.href=ROUTES.nexus});
    let lastY=scrollY||0,ticking=false,timer;const show=()=>dock?.classList.remove('is-hidden'),hide=()=>dock?.classList.add('is-hidden');
    addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY||0,max=Math.max(0,document.documentElement.scrollHeight-innerHeight),nearBottom=max-y<70;if(nearBottom||y<12||y<lastY-6)show();else if(y>lastY+6)hide();lastY=y;clearTimeout(timer);timer=setTimeout(show,180);ticking=false})},{passive:true});
    addEventListener('storage',e=>{if([FINANCE_KEY,LEGACY_KEY,TEST_KEY].includes(e.key))refresh()});addEventListener('aurora:finance-mission',refresh);addEventListener('aurora:wealth-mission',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* ===== Original inline script 27 ===== */
(()=>{
  const app=document.querySelector('.m13-app');
  const refresh=document.getElementById('financeSidebarRefresh');
  const financeFolder=document.querySelector('.aurora-finance-folder');
  const forceOpen=()=>{app?.classList.remove('m13-sidebar-collapsed');if(financeFolder)financeFolder.open=true;};
  forceOpen();
  window.addEventListener('load',()=>setTimeout(forceOpen,20));
  window.addEventListener('resize',forceOpen);
  refresh?.addEventListener('click',()=>document.getElementById('m13Refresh')?.click());
  document.querySelectorAll('#m13Nav button').forEach(button=>button.addEventListener('click',()=>{if(financeFolder)financeFolder.open=true;}));
})();


/* ===== Original inline script 28 ===== */
(function(){
  'use strict';
  function init(){
    var app=document.querySelector('.m13-app');
    var side=document.querySelector('.m13-sidebar.aurora-finance-sidebar');
    if(!app||!side)return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='m13-sidebar-toggle aurora-finance-toggle';
    btn.setAttribute('aria-label','Collapse Finance navigation');
    btn.setAttribute('aria-expanded','true');
    btn.innerHTML='<span>‹</span>';
    side.appendChild(btn);

    function setCollapsed(value){
      app.classList.toggle('m13-sidebar-collapsed',!!value);
      btn.setAttribute('aria-expanded',String(!value));
    }
    btn.addEventListener('click',function(){
      setCollapsed(!app.classList.contains('m13-sidebar-collapsed'));
    });

    var lastY=Math.max(0,window.scrollY||0);
    var ticking=false;
    var direction='';
    function onFrame(){
      var y=Math.max(0,window.scrollY||0);
      var delta=y-lastY;
      if(window.innerWidth>820){
        if(y<=24){
          setCollapsed(false);
          direction='up';
        }else if(delta>7 && direction!=='down'){
          setCollapsed(true);
          direction='down';
        }else if(delta<-7 && direction!=='up'){
          setCollapsed(false);
          direction='up';
        }
      }
      lastY=y;
      ticking=false;
    }
    window.addEventListener('scroll',function(){
      if(!ticking){
        ticking=true;
        requestAnimationFrame(onFrame);
      }
    },{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();


/* ===== Original inline script 29 ===== */
(function(){
  'use strict';
  function fixSidebar(){
    document.body.classList.remove('fm-sidebar-hidden','aufc-nav-collapsed','aufc-mobile-open');
    try{ localStorage.setItem('auroraUnifiedSidebarCollapsed','0'); }catch(e){}
    var old=document.querySelector('.fm-sidebar');
    if(old){ old.setAttribute('aria-hidden','true'); old.style.display='none'; }
    var edge=document.getElementById('fmSidebarEdgeZone');
    if(edge){ edge.setAttribute('aria-hidden','true'); edge.style.display='none'; }
    var workspace=document.querySelector('.fm-workspace');
    if(workspace) workspace.style.marginLeft='0';
    var unified=document.getElementById('auroraUnifiedFinanceSidebar');
    if(unified) unified.setAttribute('aria-hidden','false');
    var toggle=document.getElementById('aufcSidebarToggle');
    if(toggle) toggle.setAttribute('aria-expanded','true');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(fixSidebar,0);},{once:true});
  else setTimeout(fixSidebar,0);
  window.addEventListener('pageshow',fixSidebar);
})();


/* ===== Original inline script 30 ===== */
(function(){
  'use strict';
  var KEEP_KEY='auroraSidebarKeepOpenV4';
  var keepOpen=false;
  function isMobile(){return window.matchMedia('(max-width:820px)').matches;}
  function setKeep(value){keepOpen=!!value;try{sessionStorage.setItem(KEEP_KEY,keepOpen?'1':'0');}catch(e){};if(isMobile())document.body.classList.toggle('aufc-mobile-open',keepOpen);}
  function restoreOpen(){
    try{keepOpen=sessionStorage.getItem(KEEP_KEY)==='1';}catch(e){keepOpen=false;}
    document.body.classList.remove('aufc-nav-collapsed');
    try{localStorage.setItem('auroraUnifiedSidebarCollapsed','0');}catch(e){}
    if(isMobile()&&keepOpen)document.body.classList.add('aufc-mobile-open');
  }
  function installSections(){
    var unified=document.getElementById('auroraUnifiedFinanceSidebar');
    if(!unified||unified.querySelector('.aufc-page-sections'))return;
    var source=document.querySelector('.fm-side-folder.active .fm-side-submenu');
    var active=unified.querySelector('.aufc-link.active');
    if(!source||!active)return;
    var box=document.createElement('div');box.className='aufc-page-sections';
    source.querySelectorAll('a[href]').forEach(function(old){
      var a=document.createElement('a');a.href=old.getAttribute('href');a.textContent=old.textContent.trim();
      if(a.hash&&a.hash===location.hash)a.classList.add('active');
      box.appendChild(a);
    });
    active.insertAdjacentElement('afterend',box);
  }
  function navigateKeepingOpen(a,e){
    var href=a.getAttribute('href')||'';
    if(!href||href==='#')return;
    e.preventDefault();e.stopImmediatePropagation();
    setKeep(true);
    var url=new URL(href,location.href);
    if(url.pathname===location.pathname&&url.hash){
      history.pushState(null,'',url.hash);
      var target=document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
      document.querySelectorAll('.aufc-page-sections a').forEach(function(x){x.classList.toggle('active',x.hash===url.hash)});
      document.body.classList.add('aufc-mobile-open');
    }else{
      location.href=url.href;
    }
  }
  function bindCapture(){
    document.addEventListener('click',function(e){
      var a=e.target.closest('#auroraUnifiedFinanceSidebar a[href], #auroraUnifiedFinanceSidebar .aufc-page-sections a[href]');
      if(a){navigateKeepingOpen(a,e);return;}
      if(e.target.closest('#aufcMobileShade')){e.preventDefault();e.stopImmediatePropagation();setKeep(false);return;}
      var mobile=e.target.closest('#aufcMobileButton');
      if(mobile){e.preventDefault();e.stopImmediatePropagation();setKeep(!document.body.classList.contains('aufc-mobile-open'));return;}
    },true);
    window.addEventListener('scroll',function(e){
      if(isMobile()&&keepOpen){
        document.body.classList.add('aufc-mobile-open');
      }
    },true);
    var observer=new MutationObserver(function(){
      if(isMobile()&&keepOpen&&!document.body.classList.contains('aufc-mobile-open')){
        document.body.classList.add('aufc-mobile-open');
      }
    });
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  function init(){restoreOpen();setTimeout(installSections,20);setTimeout(installSections,250);bindCapture();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('pageshow',restoreOpen);
})();

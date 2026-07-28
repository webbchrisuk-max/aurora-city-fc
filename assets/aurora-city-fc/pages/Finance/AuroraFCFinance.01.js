
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

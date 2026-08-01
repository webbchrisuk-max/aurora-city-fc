
/**
 * Aurora City FC — AuroraBrain.js v3.0
 * Derived intelligence engine.
 *
 * It does not require extra summary sheets. It derives:
 * - Premier League zones
 * - fair-value discounts
 * - next dividend and 12-month runway
 * - dividend roadmap
 * - today's best action
 * from the existing AuroraMaster tabs.
 */
(function (global) {
  "use strict";

  const VERSION = "3.0.0";

  function compact(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function cleanTicker(value) {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/^LON:/, "")
      .replace(/\.L$/, "")
      .replace(/\s+/g, "");
  }

  function number(value) {
    if (value === null || value === undefined || value === "") return NaN;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const cleaned = String(value).replace(/[£$€,%\s]/g, "").replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function percent(value) {
    const parsed = number(value);
    if (!Number.isFinite(parsed)) return NaN;
    return Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
  }

  function excelDate(value) {
    const serial = number(value);
    if (Number.isFinite(serial) && serial > 20000 && serial < 100000) {
      return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    }
    if (!value) return null;
    const uk = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (uk) return new Date(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]));
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function value(row, ...names) {
    if (!row || typeof row !== "object") return "";
    const map = new Map(Object.keys(row).map(key => [compact(key), row[key]]));
    for (const name of names) {
      const result = map.get(compact(name));
      if (result !== undefined && result !== null && String(result).trim() !== "") return result;
    }
    return "";
  }

  function rowsFromValue(source) {
    if (!source) return [];
    if (Array.isArray(source)) {
      if (!source.length) return [];
      if (source.every(row => row && typeof row === "object" && !Array.isArray(row))) return source;
      if (source.every(Array.isArray)) {
        const headers = (source[0] || []).map(item => String(item ?? "").trim());
        return source.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined))
          .map(row => {
            const object = {};
            headers.forEach((header, index) => { if (header) object[header] = row[index]; });
            return object;
          });
      }
      return [];
    }
    if (typeof source !== "object") return [];

    if (Array.isArray(source.cols) && Array.isArray(source.rows)) {
      const headers = source.cols.map((column, index) => String(column?.label || column?.id || `column_${index + 1}`));
      return source.rows.map(row => {
        const object = {};
        const cells = Array.isArray(row?.c) ? row.c : [];
        headers.forEach((header, index) => { object[header] = cells[index]?.v ?? cells[index]?.f ?? ""; });
        return object;
      });
    }

    for (const candidate of [source.rows, source.data, source.values, source.records, source.items]) {
      const rows = rowsFromValue(candidate);
      if (rows.length) return rows;
    }
    return [];
  }

  function getTab(master, name) {
    const wanted = compact(name);
    const containers = [
      master, master?.data, master?.tabs, master?.sheets,
      master?.feeds, master?.tables, master?.payload
    ].filter(item => item && typeof item === "object");

    for (const container of containers) {
      for (const key of Object.keys(container)) {
        if (compact(key) === wanted) return rowsFromValue(container[key]);
      }
    }
    return [];
  }

  function latestPrices(master) {
    const map = new Map();

    getTab(master, "DailyPriceSummary").forEach(row => {
      const ticker = cleanTicker(value(row, "ticker", "symbol"));
      const date = excelDate(value(row, "date", "timestamp"));
      if (!ticker) return;
      const existing = map.get(ticker);
      if (!existing || (date?.getTime() || 0) >= (existing.date?.getTime() || 0)) {
        map.set(ticker, {
          ticker,
          price: number(value(row, "close price", "close", "price")),
          change: number(value(row, "change")),
          changePct: percent(value(row, "change %", "change pct", "change_pct")),
          low: number(value(row, "low price", "low")),
          high: number(value(row, "high price", "high")),
          date
        });
      }
    });

    getTab(master, "LivePrices").forEach(row => {
      const ticker = cleanTicker(value(row, "symbol", "ticker"));
      const price = number(value(row, "price", "live price"));
      if (ticker && Number.isFinite(price)) {
        const existing = map.get(ticker) || { ticker };
        existing.price = price;
        map.set(ticker, existing);
      }
    });

    return map;
  }

  function holdingRows(master) {
    const prices = latestPrices(master);
    const groups = new Map();

    getTab(master, "Holdings").forEach(row => {
      const ticker = cleanTicker(value(row, "ticker", "symbol", "epic"));
      const shares = number(value(row, "shares", "quantity", "units")) || 0;
      if (!ticker || shares <= 0) return;

      if (!groups.has(ticker)) groups.set(ticker, []);
      groups.get(ticker).push(row);
    });

    return [...groups.entries()].map(([ticker, rows]) => {
      const first = rows[0] || {};
      const priceRow = prices.get(ticker) || {};
      const shares = rows.reduce((sum, row) => sum + (number(value(row, "shares", "quantity", "units")) || 0), 0);
      const sheetValues = rows.reduce((sum, row) => sum + (number(value(row, "current value", "current_value", "market value", "market_value")) || 0), 0);
      const annualIncome = rows.reduce((sum, row) => sum + (number(value(row, "annual dps total", "annual_dps_total", "annual income", "annual_income")) || 0), 0);
      const fairValues = rows.map(row => number(value(row, "fair value", "fair_value"))).filter(Number.isFinite);
      const fairValue = fairValues.length ? fairValues.reduce((a,b)=>a+b,0) / fairValues.length : NaN;
      const explicitPrice = rows.map(row => number(value(row, "live price", "live_price", "price"))).find(Number.isFinite);
      const currentValue = sheetValues || 0;
      let price = Number.isFinite(explicitPrice) ? explicitPrice : priceRow.price;
      if ((!Number.isFinite(price) || price <= 0) && currentValue > 0 && shares > 0) price = currentValue / shares;

      const scores = rows.map(row => number(value(row, "buy strength", "buy_strength", "confidence", "confidence_score"))).filter(Number.isFinite);
      const score = scores.length ? Math.max(...scores) : 50;
      const annualDpsValues = rows.map(row => number(value(row, "annual dps", "annual_dps", "dps"))).filter(Number.isFinite);
      const annualDps = annualDpsValues.length ? annualDpsValues[0] : (shares > 0 ? annualIncome / shares : 0);
      const yieldPct = Number.isFinite(price) && price > 0 ? (annualDps / price) * 100 : percent(value(first, "yield pct", "yield_pct", "yield")) || 0;
      const discount = Number.isFinite(price) && price > 0 && Number.isFinite(fairValue) && fairValue > 0
        ? ((fairValue - price) / fairValue) * 100
        : 0;

      const status = String(value(first, "status", "action", "recommendation") || "HOLD").toUpperCase();
      const blocked = /WAIT|REVIEW|NO BUY|AVOID|LOCKED/.test(status);
      const valuationScore = number(value(first, "valuation score", "valuation_score")) || 50;
      const yieldScore = number(value(first, "yield score", "yield_score")) || 50;
      const payoutScore = number(value(first, "payout score", "payout_score")) || 50;
      const growthScore = number(value(first, "growth score", "growth_score")) || 50;
      const derivedConfidence = Math.round(
        score * 0.45 + valuationScore * 0.20 + yieldScore * 0.18 +
        payoutScore * 0.08 + growthScore * 0.09 - (blocked ? 10 : 0)
      );

      return {
        ticker,
        name: String(value(first, "name", "company", "company_name") || ticker),
        accounts: [...new Set(rows.map(row => String(value(row, "account", "broker", "platform") || "")).filter(Boolean))],
        sector: String(value(first, "sector", "industry") || "Unclassified"),
        role: String(value(first, "role", "squad role", "squad_role") || ""),
        shares,
        price: Number.isFinite(price) ? price : 0,
        fairValue: Number.isFinite(fairValue) ? fairValue : 0,
        currentValue,
        annualIncome,
        annualDps,
        yieldPct,
        discount,
        score,
        confidence: Math.max(0, Math.min(100, derivedConfidence)),
        status,
        blocked,
        changePct: priceRow.changePct || 0,
        valuationStatus: String(value(first, "valuation status", "valuation_status") || ""),
        payoutRisk: String(value(first, "payout risk", "payout_risk") || ""),
        annualTarget: number(value(first, "annual target", "annual_target")) || 0,
        raw: rows
      };
    }).sort((a,b) => b.confidence - a.confidence);
  }

  function watchRows(master) {
    const prices = latestPrices(master);
    return getTab(master, "Watchlist").map(row => {
      const ticker = cleanTicker(value(row, "ticker", "symbol"));
      const priceRow = prices.get(ticker) || {};
      let price = number(value(row, "live price", "live_price", "price"));
      if (!Number.isFinite(price)) price = priceRow.price;
      const low = number(value(row, "low 52w", "low_52w"));
      const high = number(value(row, "high 52w", "high_52w"));
      const fair = number(value(row, "fair value", "fair_value"));
      if ((!Number.isFinite(price) || price <= 0) && Number.isFinite(low) && Number.isFinite(high)) price = (low + high) / 2;
      const dps = number(value(row, "annual dps", "annual_dps")) || 0;
      const yieldPct = Number.isFinite(price) && price > 0 ? dps / price * 100 : 0;
      const score = number(value(row, "buy strength", "buy_strength", "score")) || 0;
      const discount = Number.isFinite(price) && price > 0 && Number.isFinite(fair) && fair > 0 ? ((fair-price)/fair)*100 : 0;
      return {
        ticker,
        name: String(value(row, "name", "company", "company_name") || ticker),
        price: Number.isFinite(price) ? price : 0,
        fairValue: Number.isFinite(fair) ? fair : 0,
        annualDps: dps,
        yieldPct,
        score,
        confidence: Math.round(Math.max(0, Math.min(100, score * .7 + (number(value(row,"valuation score","valuation_score"))||50)*.18 + (number(value(row,"yield score","yield_score"))||50)*.12))),
        discount,
        status: String(value(row, "status") || ""),
        trialStatus: String(value(row, "trial status", "trial_status") || ""),
        verdict: String(value(row, "trial verdict", "trial_verdict") || "")
      };
    }).filter(row => row.ticker).sort((a,b)=>b.confidence-a.confidence);
  }

  function dividends(master) {
    const activeTickers = new Set(holdingRows(master).map(item => item.ticker));
    return getTab(master, "Dividends").map(row => {
      const ticker = cleanTicker(value(row, "ticker", "symbol"));
      return {
        ticker,
        name: String(value(row, "name", "company") || ticker),
        exDate: excelDate(value(row, "ex date", "ex_date")),
        payDate: excelDate(value(row, "pay date", "pay_date")),
        amount: number(value(row, "dividend due", "dividend_due", "amount")) || 0,
        received: number(value(row, "dividend received", "dividend_received")) || 0,
        status: String(value(row, "status", "payment stage", "payment_stage") || ""),
        stage: String(value(row, "payment stage", "payment_stage") || ""),
        month: String(value(row, "income month", "income_month") || ""),
        year: number(value(row, "income year", "income_year")),
        active: activeTickers.has(ticker)
      };
    }).filter(row => row.ticker && row.active);
  }

  function confidenceBand(score) {
    if (score >= 85) return "Elite";
    if (score >= 75) return "Strong";
    if (score >= 65) return "Good";
    if (score >= 50) return "Watch";
    return "Concern";
  }

  function create(master) {
    if (!master || typeof master !== "object") throw new Error("AuroraBrain.create requires AuroraMaster data.");

    const holdings = holdingRows(master);
    const watchlist = watchRows(master);
    const dividendRows = dividends(master);
    const intelligence = getTab(master, "AuroraIntelligence");
    const briefing = getTab(master, "ManagerBriefing");

    const averageConfidence = holdings.length
      ? holdings.reduce((sum,row)=>sum+row.confidence,0)/holdings.length
      : 0;
    const restrictions = holdings.filter(row => row.blocked);
    const topHolding = holdings[0] || null;
    const lowestHolding = holdings.at(-1) || null;

    function getPremierLeague() {
      const sorted = holdings.slice().sort((a,b)=>b.confidence-a.confidence);
      return {
        topFour: sorted.slice(0,4),
        midTable: sorted.slice(4, Math.max(4, sorted.length-3)),
        relegation: sorted.slice(-3),
        promotion: watchlist.slice(0,4)
      };
    }

    function getFairValueDiscounts(limit=6) {
      return holdings.filter(row => row.discount > 0)
        .sort((a,b)=>b.discount-a.discount)
        .slice(0,limit);
    }

    function getNextDividend(now=new Date()) {
      const upcoming = dividendRows
        .filter(row => row.payDate && row.payDate.getTime() >= now.getTime() - 86400000)
        .sort((a,b)=>a.payDate-b.payDate);
      return upcoming[0] || null;
    }

    function getDividendRunway(now=new Date()) {
      const months = Array.from({length:12}, (_,index) => {
        const date = new Date(now.getFullYear(), now.getMonth()+index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`,
          label: date.toLocaleString("en-GB",{month:"short",year:"numeric"}),
          amount: 0,
          rows: []
        };
      });
      const byKey = new Map(months.map(month=>[month.key,month]));
      dividendRows.forEach(row => {
        const date = row.payDate;
        if (!date) return;
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
        const month = byKey.get(key);
        if (month) {
          month.amount += row.amount || row.received || 0;
          month.rows.push(row);
        }
      });
      const populated = months.filter(month=>month.amount>0);
      const best = populated.slice().sort((a,b)=>b.amount-a.amount)[0] || null;
      const weakest = months.slice().sort((a,b)=>a.amount-b.amount)[0] || null;
      const nextEx = dividendRows.filter(row=>row.exDate && row.exDate>=now).sort((a,b)=>a.exDate-b.exDate)[0] || null;
      return {months,best,weakest,nextEx,gapCount:months.filter(month=>month.amount<=0).length};
    }

    function getDividendRoadmap() {
      const annualIncome = holdings.reduce((sum,row)=>sum+(row.annualIncome||0),0);
      const monthly = annualIncome/12;
      const targets = [
        [2026,250,350],[2027,350,500],[2028,500,700],[2029,800,1100],
        [2030,1150,1400],[2031,1400,1600],[2032,1600,1800],[2033,2000,2000]
      ];
      return {
        currentMonthly: monthly,
        currentAnnual: annualIncome,
        years: targets.map(([year,min,max]) => ({
          year,min,max,
          progress: Math.min(100, min > 0 ? monthly/min*100 : 0),
          gap: Math.max(0,min-monthly),
          status: monthly>=min ? "Ahead / Achieved" : monthly>=min*.75 ? "On Track" : "Needs Build"
        }))
      };
    }

    function getTodayBestAction() {
      const incomeCandidates = holdings.filter(row=>!row.blocked && row.price>0 && row.annualDps>0)
        .map(row=>({...row,incomeFrom500:500/row.price*row.annualDps}))
        .sort((a,b)=>b.incomeFrom500-a.incomeFrom500);
      const growthCandidates = holdings.filter(row=>/GROWTH|ETF|TECH/i.test(`${row.role} ${row.sector}`) && !row.blocked)
        .sort((a,b)=>b.confidence-a.confidence);
      const discounts = getFairValueDiscounts();
      const nextDividend = getNextDividend();
      const bestIncome = incomeCandidates[0] || null;
      const bestGrowth = growthCandidates[0] || holdings.find(row=>!row.blocked) || null;
      const mostUndervalued = discounts[0] || null;

      let decision = "Hold Position";
      let note = "No forced move. Follow Aurora's restrictions and wait for a stronger signal.";
      if (bestIncome && bestIncome.confidence >= 65) {
        decision = `Review ${bestIncome.ticker}`;
        note = `${bestIncome.name} currently produces the strongest estimated income from a £500 deployment.`;
      } else if (mostUndervalued) {
        decision = `Review ${mostUndervalued.ticker}`;
        note = `${mostUndervalued.name} has the largest current discount to fair value.`;
      }
      return {decision,note,bestIncome,bestGrowth,mostUndervalued,nextDividend};
    }

    function getSummary() {
      return {
        managerVerdict: restrictions.length >= 3 ? "Defensive review required" : "Selective accumulation remains appropriate",
        averageConfidence: Math.round(averageConfidence*10)/10,
        confidenceBand: confidenceBand(averageConfidence),
        topHolding,
        lowestHolding,
        restrictions: restrictions.length,
        holdingCount: holdings.length,
        annualIncome: holdings.reduce((sum,row)=>sum+(row.annualIncome||0),0),
        marketValue: holdings.reduce((sum,row)=>sum+(row.currentValue||0),0)
      };
    }

    const summary = getSummary();
    const portfolio = Object.freeze({
      version: VERSION,
      holdingCount: summary.holdingCount,
      averageConfidence: summary.averageConfidence,
      confidenceBand: summary.confidenceBand,
      topHolding,
      lowestHolding,
      restrictionCount: restrictions.length,
      annualIncome: summary.annualIncome,
      marketValue: summary.marketValue,
      managerVerdict: summary.managerVerdict,
      marketRegime: String(value(briefing[0],"market regime","market_regime") || value(intelligence[0],"market regime","market_regime") || "Live portfolio conditions"),
      buyMode: String(value(briefing[0],"buy mode","buy_mode") || value(intelligence[0],"buy mode","buy_mode") || "Selective accumulation"),
      positiveNews: intelligence.reduce((sum,row)=>sum+(number(value(row,"positive news","positive_news"))||0),0),
      negativeNews: intelligence.reduce((sum,row)=>sum+(number(value(row,"negative news","negative_news"))||0),0),
      dataQuality: {
        holdingsRows:getTab(master,"Holdings").length,
        watchlistRows:getTab(master,"Watchlist").length,
        dividendRows:getTab(master,"Dividends").length,
        priceRows:getTab(master,"DailyPriceSummary").length
      }
    });

    return Object.freeze({
      version: VERSION,
      portfolio,
      getTab: name => getTab(master,name),
      getAllHoldings: () => holdings.slice(),
      getHolding: ticker => holdings.find(row=>row.ticker===cleanTicker(ticker)) || null,
      getPriorityBuys: () => holdings.filter(row=>!row.blocked && row.confidence>=65),
      getBlockedHoldings: () => restrictions.slice(),
      getRestrictions: () => restrictions.map(row=>({ticker:row.ticker,action:row.status,confidence:row.confidence})),
      canBuy: ticker => Boolean(holdings.find(row=>row.ticker===cleanTicker(ticker) && !row.blocked)),
      getBuyReason: ticker => {
        const row = holdings.find(item=>item.ticker===cleanTicker(ticker));
        return row ? `${row.name}: ${row.status}, confidence ${row.confidence}/100, discount ${row.discount.toFixed(1)}%.` : "No holding found.";
      },
      getPremierLeague,
      getFairValueDiscounts,
      getNextDividend,
      getDividendRunway,
      getDividendRoadmap,
      getTodayBestAction,
      getSummary,
      raw: Object.freeze({master,holdings,watchlist,dividends:dividendRows})
    });
  }

  async function load(url="AuroraMaster.json", options={}) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}v=${Date.now()}`, {cache:"no-store", ...(options.fetch||{})});
    if (!response.ok) throw new Error(`AuroraMaster load failed: HTTP ${response.status}`);
    return create(await response.json());
  }

  global.AuroraBrain = Object.freeze({
    version: VERSION,
    create,
    load,
    getTab,
    cleanTicker,
    parseNumber:number,
    parsePercent:percent
  });
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Aurora City FC — AuroraBrain.js
 * Shared intelligence layer for all Aurora HTML departments.
 *
 * Reads AuroraMaster.json-compatible data and exposes one consistent API:
 *
 *   const data = await fetch("AuroraMaster.json").then(r => r.json());
 *   const brain = AuroraBrain.create(data);
 *
 *   brain.portfolio
 *   brain.getHolding("UKW")
 *   brain.getAllHoldings()
 *   brain.getPriorityBuys()
 *   brain.getBlockedHoldings()
 *   brain.getRestrictions()
 *   brain.canBuy("UKW")
 *   brain.getBuyReason("UKW")
 *   brain.getTrainingGroup("UKW")
 *   brain.compareHoldings("UKW", "FGEN")
 *   brain.getManagerThought("UKW")
 *   brain.getSectorStrength()
 *
 * Build: Aurora Brain v1.0
 */
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  const DEFAULTS = Object.freeze({
    confidenceBands: Object.freeze([
      { min: 85, name: "Elite", statusClass: "elite" },
      { min: 75, name: "Strong", statusClass: "strong" },
      { min: 65, name: "Good", statusClass: "good" },
      { min: 50, name: "Watch", statusClass: "watch" },
      { min: 0, name: "Concern", statusClass: "concern" }
    ]),
    trainingGroups: Object.freeze([
      { min: 75, name: "Elite Squad", statusClass: "elite", icon: "🏆" },
      { min: 65, name: "First Team", statusClass: "first", icon: "⭐" },
      { min: 50, name: "Development Squad", statusClass: "development", icon: "📈" },
      { min: 0, name: "Recovery Squad", statusClass: "recovery", icon: "🩺" }
    ]),
    blockedActionPatterns: Object.freeze([
      /no new money/i,
      /avoid/i,
      /review/i,
      /locked legacy/i,
      /monitor only/i,
      /watch \/ no new money/i
    ]),
    buyActionPatterns: Object.freeze([
      /priority buy/i,
      /selective buy/i,
      /hold \/ accumulate/i,
      /accumulate/i
    ])
  });

  function AuroraBrainError(message, details) {
    this.name = "AuroraBrainError";
    this.message = message || "Aurora Brain error";
    this.details = details || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, AuroraBrainError);
  }
  AuroraBrainError.prototype = Object.create(Error.prototype);
  AuroraBrainError.prototype.constructor = AuroraBrainError;

  function normaliseKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function compactKey(value) {
    return normaliseKey(value).replace(/[^a-z0-9]/g, "");
  }

  function cleanTicker(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/^LON:/, "")
      .replace(/\.L$/, "")
      .replace(/\s+/g, "");
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;

    const cleaned = String(value)
      .replace(/[£$€,%\s]/g, "")
      .replace(/,/g, "")
      .trim();

    if (!cleaned) return NaN;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : NaN;
  }

  function parsePercent(value) {
    const number = parseNumber(value);
    if (!Number.isFinite(number)) return NaN;
    return Math.abs(number) <= 1 ? number * 100 : number;
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const text = String(value).trim();
    const uk = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);

    if (uk) {
      const date = new Date(
        Number(uk[3]),
        Number(uk[2]) - 1,
        Number(uk[1]),
        Number(uk[4] || 0),
        Number(uk[5] || 0)
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getValue(row, ...names) {
    if (!row || typeof row !== "object") return "";

    const index = new Map();
    Object.keys(row).forEach(key => index.set(compactKey(key), row[key]));

    for (const name of names) {
      const key = compactKey(name);
      if (index.has(key)) {
        const value = index.get(key);
        if (value !== null && value !== undefined && String(value).trim() !== "") return value;
      }
    }

    return "";
  }

  function getTab(master, tabName) {
    if (!master || typeof master !== "object") return [];

    const wanted = compactKey(tabName);
    const containers = [
      master,
      master.data,
      master.tabs,
      master.sheets,
      master.feeds
    ].filter(Boolean);

    for (const container of containers) {
      for (const key of Object.keys(container)) {
        if (compactKey(key) === wanted && Array.isArray(container[key])) {
          return container[key];
        }
      }
    }

    return [];
  }

  function actionType(action) {
    const text = String(action || "");

    if (DEFAULTS.blockedActionPatterns.some(pattern => pattern.test(text))) return "blocked";
    if (DEFAULTS.buyActionPatterns.some(pattern => pattern.test(text))) return "buy";
    return "watch";
  }

  function confidenceBand(score) {
    const value = Number.isFinite(score) ? score : 0;
    return DEFAULTS.confidenceBands.find(item => value >= item.min) || DEFAULTS.confidenceBands.at(-1);
  }

  function trainingGroup(score) {
    const value = Number.isFinite(score) ? score : 0;
    return DEFAULTS.trainingGroups.find(item => value >= item.min) || DEFAULTS.trainingGroups.at(-1);
  }

  function sortByDateDescending(rows) {
    return rows.slice().sort((a, b) => {
      const aDate = parseDate(
        getValue(a, "generated_at", "published at", "published_at", "date", "timestamp", "created at")
      );
      const bDate = parseDate(
        getValue(b, "generated_at", "published at", "published_at", "date", "timestamp", "created at")
      );
      return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
    });
  }

  function latestByTicker(rows) {
    const map = new Map();

    sortByDateDescending(rows).forEach(row => {
      const ticker = cleanTicker(getValue(row, "ticker", "symbol", "epic"));
      if (ticker && !map.has(ticker)) map.set(ticker, row);
    });

    return map;
  }

  function normaliseBriefing(rows) {
    if (!Array.isArray(rows) || !rows.length) return {};

    const first = rows[0] || {};
    const keys = Object.keys(first).map(compactKey);

    if (keys.includes("managerverdict") || keys.includes("marketregime")) {
      return first;
    }

    const keyValue = {};
    rows.forEach(row => {
      const label = getValue(row, "label", "metric", "name", "field", "key", "A");
      const value = getValue(row, "value", "result", "B");
      if (label) keyValue[normaliseKey(label)] = value;
    });

    return keyValue;
  }

  function buildHolding(intelligenceRow, holdingsRows, newsRows) {
    const ticker = cleanTicker(getValue(intelligenceRow, "ticker", "symbol", "epic"));
    const score = parseNumber(getValue(intelligenceRow, "confidence_score", "confidence", "score"));
    const band = confidenceBand(score);
    const action = String(getValue(intelligenceRow, "action", "recommendation", "decision") || "HOLD / WATCH");
    const riskLevel = String(getValue(intelligenceRow, "risk_level", "risk", "risk band") || "Unknown");
    const holdingRows = holdingsRows.filter(row => cleanTicker(getValue(row, "ticker", "symbol", "epic")) === ticker);
    const matchingNews = newsRows.filter(row => cleanTicker(getValue(row, "ticker", "symbol", "epic")) === ticker);

    const accounts = [...new Set(
      holdingRows
        .map(row => String(getValue(row, "account", "platform", "broker") || "").trim())
        .filter(Boolean)
    )];

    const shares = holdingRows.reduce((sum, row) => sum + (parseNumber(getValue(row, "shares", "quantity", "units")) || 0), 0);
    const marketValueFromHoldings = holdingRows.reduce((sum, row) => {
      return sum + (parseNumber(getValue(row, "market value", "market_value", "current value", "value")) || 0);
    }, 0);
    const incomeFromHoldings = holdingRows.reduce((sum, row) => {
      return sum + (parseNumber(getValue(row, "annual income", "annual_income", "projected annual income")) || 0);
    }, 0);

    const positiveNews = parseNumber(getValue(intelligenceRow, "positive_news")) || 0;
    const negativeNews = parseNumber(getValue(intelligenceRow, "negative_news")) || 0;
    const latestNews =
      String(getValue(intelligenceRow, "latest_news", "latest headline") || "") ||
      String(getValue(sortByDateDescending(matchingNews)[0], "headline", "title", "news headline") || "");

    const generatedAt = parseDate(getValue(intelligenceRow, "generated_at", "generated", "timestamp"));

    return Object.freeze({
      ticker,
      company: String(getValue(intelligenceRow, "company", "name") || getValue(holdingRows[0], "name", "company") || ticker),
      account: String(getValue(intelligenceRow, "account") || accounts.join(" + ")),
      accounts: Object.freeze(accounts),
      shares,
      confidence: Number.isFinite(score) ? score : 0,
      confidenceBand: band.name,
      statusClass: band.statusClass,
      action,
      actionType: actionType(action),
      canBuy: actionType(action) === "buy",
      blocked: actionType(action) === "blocked",
      price: parseNumber(getValue(intelligenceRow, "price")),
      changePct: parsePercent(getValue(intelligenceRow, "change_pct", "daily_change_pct")),
      yieldPct: parsePercent(getValue(intelligenceRow, "yield_pct", "yield")),
      annualIncome: parseNumber(getValue(intelligenceRow, "annual_income")) || incomeFromHoldings,
      marketValue: parseNumber(getValue(intelligenceRow, "market_value")) || marketValueFromHoldings,
      priceScore: parseNumber(getValue(intelligenceRow, "price_score")),
      incomeScore: parseNumber(getValue(intelligenceRow, "income_score")),
      newsScore: parseNumber(getValue(intelligenceRow, "news_score")),
      decisionScore: parseNumber(getValue(intelligenceRow, "decision_score")),
      regimeScore: parseNumber(getValue(intelligenceRow, "regime_score")),
      riskLevel,
      riskPenalty: parseNumber(getValue(intelligenceRow, "risk_penalty")) || 0,
      newsCount: parseNumber(getValue(intelligenceRow, "news_count")) || matchingNews.length,
      positiveNews,
      negativeNews,
      latestNews,
      marketRegime: String(getValue(intelligenceRow, "market_regime") || ""),
      buyMode: String(getValue(intelligenceRow, "buy_mode") || ""),
      explanation: String(getValue(intelligenceRow, "explanation") || ""),
      source: String(getValue(intelligenceRow, "source") || "Aurora Intelligence Engine"),
      generatedAt,
      generatedAtIso: generatedAt ? generatedAt.toISOString() : "",
      trainingGroup: trainingGroup(score).name,
      trainingGroupClass: trainingGroup(score).statusClass,
      trainingGroupIcon: trainingGroup(score).icon,
      developmentStatus:
        score >= 75 ? "Peak form" :
        score >= 65 ? "First-team standard" :
        score >= 50 ? "Development required" :
        "Recovery programme",
      newsImpact:
        positiveNews > negativeNews ? "Positive" :
        negativeNews > positiveNews ? "Negative" :
        "Neutral",
      raw: Object.freeze({
        intelligence: intelligenceRow,
        holdings: Object.freeze(holdingRows.slice()),
        news: Object.freeze(matchingNews.slice())
      })
    });
  }

  function managerThought(holding) {
    if (!holding) return "No Aurora Intelligence record is available for this holding.";

    const reasons = [];

    if (Number.isFinite(holding.incomeScore)) {
      if (holding.incomeScore >= 75) reasons.push("income quality is strong");
      else if (holding.incomeScore < 50) reasons.push("income quality remains weak");
    }

    if (Number.isFinite(holding.newsScore)) {
      if (holding.newsScore >= 70) reasons.push("recent news is supportive");
      else if (holding.newsScore < 45) reasons.push("recent news is applying pressure");
    }

    if (Number.isFinite(holding.regimeScore)) {
      if (holding.regimeScore >= 75) reasons.push("the current market regime is favourable");
      else if (holding.regimeScore < 50) reasons.push("the current market regime is a poor fit");
    }

    if (holding.riskLevel.toLowerCase() === "high") reasons.push("risk remains elevated");
    else if (holding.riskLevel.toLowerCase() === "low") reasons.push("risk is controlled");

    const why = reasons.length ? reasons.join(", ") : "the current score mix is balanced";

    return `${holding.ticker} is rated ${holding.confidence}/100 (${holding.confidenceBand}). Aurora's instruction is ${holding.action} because ${why}.`;
  }

  function compareHoldings(a, b) {
    if (!a && !b) return null;
    if (!a) return { winner: b.ticker, loser: null, difference: null, summary: `${b.ticker} is the only holding available for comparison.` };
    if (!b) return { winner: a.ticker, loser: null, difference: null, summary: `${a.ticker} is the only holding available for comparison.` };

    const difference = Math.round((a.confidence - b.confidence) * 10) / 10;

    if (difference === 0) {
      return {
        winner: null,
        loser: null,
        difference: 0,
        summary: `${a.ticker} and ${b.ticker} have the same confidence score of ${a.confidence}/100.`,
        a,
        b
      };
    }

    const winner = difference > 0 ? a : b;
    const loser = difference > 0 ? b : a;

    return {
      winner: winner.ticker,
      loser: loser.ticker,
      difference: Math.abs(difference),
      summary: `${winner.ticker} currently leads ${loser.ticker} by ${Math.abs(difference).toFixed(1)} confidence points.`,
      a,
      b
    };
  }

  function create(master, options) {
    if (!master || typeof master !== "object") {
      throw new AuroraBrainError("AuroraBrain.create() requires an AuroraMaster JSON object.");
    }

    const config = Object.assign({}, options || {});
    const intelligenceRows = getTab(master, "AuroraIntelligence");
    const briefingRows = getTab(master, "ManagerBriefing");
    const holdingsRows = getTab(master, "Holdings");
    const newsRows = getTab(master, "AuroraTimes");
    const regimeRows = getTab(master, "MarketRegime");

    const briefing = normaliseBriefing(briefingRows);
    const latestIntelligence = [...latestByTicker(intelligenceRows).values()];
    const holdingList = latestIntelligence
      .map(row => buildHolding(row, holdingsRows, newsRows))
      .filter(holding => holding.ticker)
      .sort((a, b) => b.confidence - a.confidence);

    const holdingMap = new Map(holdingList.map(holding => [holding.ticker, holding]));
    const scores = holdingList.map(holding => holding.confidence).filter(Number.isFinite);
    const averageConfidence = scores.length
      ? scores.reduce((sum, value) => sum + value, 0) / scores.length
      : 0;

    const topHolding = holdingList[0] || null;
    const lowestHolding = holdingList.at(-1) || null;
    const positiveNews = holdingList.reduce((sum, holding) => sum + holding.positiveNews, 0);
    const negativeNews = holdingList.reduce((sum, holding) => sum + holding.negativeNews, 0);
    const restrictions = holdingList.filter(holding => holding.blocked);
    const priorityBuys = holdingList.filter(holding => holding.canBuy);

    const regimeRow = regimeRows[0] || {};
    const marketRegime =
      String(getValue(briefing, "market regime", "market_regime") || "") ||
      String(getValue(regimeRow, "current regime", "current_regime", "regime") || "") ||
      String(topHolding?.marketRegime || "");

    const buyMode =
      String(getValue(briefing, "buy mode", "buy_mode") || "") ||
      String(getValue(regimeRow, "buy mode", "buy_mode") || "") ||
      String(topHolding?.buyMode || "");

    const managerVerdict =
      String(getValue(briefing, "manager verdict", "manager_verdict", "verdict") || "") ||
      (
        restrictions.length >= 3
          ? "Defensive review required"
          : negativeNews > positiveNews
            ? "Caution: news balance has weakened"
            : "Selective accumulation remains appropriate"
      );

    const generatedAt =
      parseDate(getValue(briefing, "generated", "generated_at", "last update")) ||
      topHolding?.generatedAt ||
      null;

    const portfolio = Object.freeze({
      version: VERSION,
      holdingCount: holdingList.length,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      confidenceBand: confidenceBand(averageConfidence).name,
      statusClass: confidenceBand(averageConfidence).statusClass,
      topHolding,
      lowestHolding,
      managerVerdict,
      marketRegime,
      buyMode,
      restrictionCount: restrictions.length,
      buyEligibleCount: priorityBuys.length,
      positiveNews,
      negativeNews,
      newsBalance: positiveNews - negativeNews,
      annualIncome: holdingList.reduce((sum, holding) => sum + (holding.annualIncome || 0), 0),
      marketValue: holdingList.reduce((sum, holding) => sum + (holding.marketValue || 0), 0),
      generatedAt,
      generatedAtIso: generatedAt ? generatedAt.toISOString() : "",
      dataQuality: Object.freeze({
        hasIntelligence: intelligenceRows.length > 0,
        hasBriefing: briefingRows.length > 0,
        hasHoldings: holdingsRows.length > 0,
        hasNews: newsRows.length > 0,
        intelligenceRows: intelligenceRows.length,
        briefingRows: briefingRows.length,
        holdingsRows: holdingsRows.length,
        newsRows: newsRows.length
      })
    });

    function getHolding(ticker) {
      return holdingMap.get(cleanTicker(ticker)) || null;
    }

    function getAllHoldings() {
      return holdingList.slice();
    }

    function getPriorityBuys() {
      return priorityBuys.slice();
    }

    function getBlockedHoldings() {
      return restrictions.slice();
    }

    function getRestrictions() {
      return restrictions.map(holding => ({
        ticker: holding.ticker,
        action: holding.action,
        reason: holding.explanation || holding.riskLevel,
        confidence: holding.confidence
      }));
    }

    function canBuy(ticker) {
      return Boolean(getHolding(ticker)?.canBuy);
    }

    function getBuyReason(ticker) {
      const holding = getHolding(ticker);
      if (!holding) return "No Aurora Intelligence record is available.";
      return holding.canBuy
        ? holding.explanation || `${holding.ticker} is currently eligible for ${holding.action}.`
        : holding.explanation || `${holding.ticker} is currently restricted by ${holding.action}.`;
    }

    function getTrainingGroup(ticker) {
      const holding = getHolding(ticker);
      if (!holding) return null;

      return {
        name: holding.trainingGroup,
        statusClass: holding.trainingGroupClass,
        icon: holding.trainingGroupIcon,
        developmentStatus: holding.developmentStatus
      };
    }

    function getManagerThought(ticker) {
      return managerThought(getHolding(ticker));
    }

    function compare(tickerA, tickerB) {
      return compareHoldings(getHolding(tickerA), getHolding(tickerB));
    }

    function getSectorStrength() {
      const sectors = new Map();

      holdingList.forEach(holding => {
        const sourceRows = holding.raw.holdings;
        const sector =
          String(getValue(sourceRows[0], "sector", "industry", "asset class", "category") || "Unclassified");

        if (!sectors.has(sector)) {
          sectors.set(sector, {
            sector,
            holdings: [],
            confidenceTotal: 0,
            annualIncome: 0,
            marketValue: 0
          });
        }

        const entry = sectors.get(sector);
        entry.holdings.push(holding.ticker);
        entry.confidenceTotal += holding.confidence;
        entry.annualIncome += holding.annualIncome || 0;
        entry.marketValue += holding.marketValue || 0;
      });

      return [...sectors.values()]
        .map(entry => ({
          sector: entry.sector,
          holdings: entry.holdings,
          holdingCount: entry.holdings.length,
          averageConfidence: entry.holdings.length
            ? Math.round((entry.confidenceTotal / entry.holdings.length) * 10) / 10
            : 0,
          annualIncome: entry.annualIncome,
          marketValue: entry.marketValue
        }))
        .sort((a, b) => b.averageConfidence - a.averageConfidence);
    }

    function getSummary() {
      return {
        managerVerdict: portfolio.managerVerdict,
        marketRegime: portfolio.marketRegime,
        buyMode: portfolio.buyMode,
        averageConfidence: portfolio.averageConfidence,
        topHolding: portfolio.topHolding?.ticker || "",
        lowestHolding: portfolio.lowestHolding?.ticker || "",
        restrictions: portfolio.restrictionCount,
        positiveNews: portfolio.positiveNews,
        negativeNews: portfolio.negativeNews
      };
    }

    return Object.freeze({
      version: VERSION,
      config: Object.freeze(config),
      portfolio,
      getHolding,
      getAllHoldings,
      getPriorityBuys,
      getBlockedHoldings,
      getRestrictions,
      canBuy,
      getBuyReason,
      getTrainingGroup,
      getManagerThought,
      compareHoldings: compare,
      getSectorStrength,
      getSummary,
      raw: Object.freeze({
        master,
        intelligence: Object.freeze(intelligenceRows.slice()),
        briefing: Object.freeze(briefingRows.slice()),
        holdings: Object.freeze(holdingsRows.slice()),
        news: Object.freeze(newsRows.slice()),
        regime: Object.freeze(regimeRows.slice())
      })
    });
  }

  async function load(url, options) {
    const target = url || "AuroraMaster.json";
    const fetchOptions = Object.assign({ cache: "no-store" }, options?.fetch || {});
    const response = await fetch(target, fetchOptions);

    if (!response.ok) {
      throw new AuroraBrainError(
        `AuroraMaster load failed with HTTP ${response.status}.`,
        { url: target, status: response.status }
      );
    }

    const data = await response.json();
    return create(data, options);
  }

  const api = Object.freeze({
    version: VERSION,
    create,
    load,
    cleanTicker,
    parseNumber,
    parsePercent,
    confidenceBand,
    trainingGroup,
    AuroraBrainError
  });

  global.AuroraBrain = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

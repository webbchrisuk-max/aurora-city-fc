/**
 * Aurora City FC — Shared Notification System
 * One notification store for every Aurora department.
 *
 * Public API:
 *   AuroraNotifications.add({...})
 *   AuroraNotifications.notifyCurrent(title, message, options)
 *   AuroraNotifications.list({ unreadOnly, department, limit })
 *   AuroraNotifications.markRead(id)
 *   AuroraNotifications.markAllRead()
 *   AuroraNotifications.remove(id)
 *   AuroraNotifications.clear()
 *   AuroraNotifications.subscribe(callback)
 *   AuroraNotifications.test()
 */
(() => {
  'use strict';

  if (window.AuroraNotifications?.version) return;

  const VERSION = '1.0.0';
  const STORE_KEY = 'aurora_notifications_v1';
  const READ_KEY = 'aurora_notifications_read_v1';
  const INSTALL_KEY = 'aurora_notifications_installed_v1';
  const EVENT_NAME = 'aurora:notifications-changed';
  const CHANNEL_NAME = 'aurora-notifications';
  const MAX_ITEMS = 120;
  const DEFAULT_TTL_DAYS = 45;

  const PAGE_MAP = [
    ['ManagerDashboard', 'Manager Dashboard', 'AuroraCityFC_ManagerDashboard.html', '🧭'],
    ['NexusMaster', 'Aurora Nexus HQ', 'AuroraCityFC_NexusMaster.html', '🌐'],
    ['FinanceDepartment', 'Finance Department', 'AuroraCityFC_FinanceDepartment.html', '💷'],
    ['TransferCentre', 'Transfer Centre', 'AuroraCityFC_TransferCentre.html', '🔄'],
    ['MatchdayCentre', 'Matchday Centre', 'AuroraCityFC_MatchdayCentre.html', '🏟️'],
    ['SquadHub', 'Squad Hub', 'AuroraCityFC_SquadHub.html', '👥'],
    ['AnalysisRoom', 'Analysis Room', 'AuroraCityFC_AnalysisRoom.html', '📊'],
    ['ScoutingCentre', 'Scouting Centre', 'AuroraCityFC_ScoutingCentre.html', '🔍'],
    ['TrainingGround', 'Training Ground', 'AuroraCityFC_TrainingGround.html', '🏋️'],
    ['LearningCentre', 'Learning Centre', 'AuroraCityFC_LearningCentre.html', '🎓'],
    ['Boardroom', 'Boardroom', 'AuroraCityFC_Boardroom.html', '🏛️'],
    ['MediaCentre', 'Media Centre', 'AuroraCityFC_MediaCentre.html', '📰']
  ];

  const STORAGE_RULES = [
    {
      key: 'aurora_finance_department_mission_v1',
      department: 'Finance Department',
      page: 'AuroraCityFC_FinanceDepartment.html',
      title: 'Finance mission updated',
      icon: '💷',
      priority: 'normal',
      message: value => describeMission(value, 'The Finance Department has updated the authorised investment mission.')
    },
    {
      key: 'aurora_wealth_investment_mission_v1',
      department: 'Finance Department',
      page: 'AuroraCityFC_FinanceDepartment.html',
      title: 'Investment mission recalculated',
      icon: '📈',
      priority: 'normal',
      message: value => describeMission(value, 'The investment mission has been recalculated.')
    },
    {
      key: 'aurora_transfer_plan_v2',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Transfer deal sheet updated',
      icon: '🔄',
      priority: 'high',
      message: describeTransferPlan
    },
    {
      key: 'aurora_payday_execution_v1',
      department: 'Finance Department',
      page: 'AuroraCityFC_FinanceDepartment.html',
      title: 'Payday execution updated',
      icon: '✅',
      priority: 'high',
      message: value => describeMoneyEvent(value, 'The payday execution checklist has changed.')
    },
    {
      key: 'aurora_registration_last_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Purchase registration updated',
      icon: '🧾',
      priority: 'high',
      message: describeRegistration
    },
    {
      key: 'aurora_m4_signing_lifecycle_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Transfer workflow moved forward',
      icon: '✍️',
      priority: 'normal',
      message: value => describeLifecycle(value, 'The Transfer Centre signing workflow has changed.')
    },
    {
      key: 'aurora_investment_handoff_completion_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Investment handoff completed',
      icon: '🤝',
      priority: 'high',
      message: value => describeMoneyEvent(value, 'The Finance Department handoff has been completed.')
    }
  ];

  const subscribers = new Set();
  const watchedValues = new Map();
  let channel = null;
  let dashboardBridge = null;

  try {
    if ('BroadcastChannel' in window) channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (_) {
    channel = null;
  }

  function now() {
    return Date.now();
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function readStore() {
    try {
      const rows = safeJsonParse(localStorage.getItem(STORE_KEY) || '[]', []);
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  function readState() {
    try {
      const state = safeJsonParse(localStorage.getItem(READ_KEY) || '{}', {});
      return {
        allReadAt: Number(state?.allReadAt) || 0,
        ids: Array.isArray(state?.ids) ? state.ids.map(String).slice(-300) : []
      };
    } catch (_) {
      return { allReadAt: 0, ids: [] };
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(state));
      publishChange('read');
      return true;
    } catch (_) {
      return false;
    }
  }

  function cleanStore(rows = readStore()) {
    const timestamp = now();
    const seen = new Set();
    return rows
      .filter(row => row && typeof row === 'object')
      .filter(row => !Number(row.expiresAt) || Number(row.expiresAt) > timestamp)
      .filter(row => {
        const id = String(row.id || '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, MAX_ITEMS);
  }

  function writeStore(rows, reason = 'write') {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cleanStore(rows)));
      publishChange(reason);
      return true;
    } catch (_) {
      return false;
    }
  }

  function randomId() {
    return `${now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function normalisePriority(value) {
    const text = String(value || 'normal').toLowerCase();
    if (['critical', 'urgent', 'danger', 'bad'].includes(text)) return 'critical';
    if (['high', 'warning', 'warn'].includes(text)) return 'high';
    if (['low', 'info'].includes(text)) return 'low';
    return 'normal';
  }

  function detectPage() {
    const pathname = String(location.pathname || '');
    const title = String(document.title || '');
    const match = PAGE_MAP.find(([needle]) => pathname.includes(needle) || title.includes(needle.replace(/([A-Z])/g, ' $1').trim()));
    if (match) return { department: match[1], page: match[2], icon: match[3] };
    return {
      department: document.documentElement?.dataset?.auroraPage || 'Aurora HQ',
      page: pathname.split('/').pop() || 'AuroraCityFC_ManagerDashboard.html',
      icon: '🔔'
    };
  }

  function normaliseNotification(input = {}) {
    const current = detectPage();
    const createdAt = Number(input.createdAt) || now();
    const ttlDays = Number.isFinite(Number(input.ttlDays)) ? Number(input.ttlDays) : DEFAULT_TTL_DAYS;
    const expiresAt = Number(input.expiresAt) || (ttlDays > 0 ? createdAt + ttlDays * 86400000 : 0);
    const title = String(input.title || 'Aurora update').trim();
    const message = String(input.message || input.text || '').trim();
    const department = String(input.department || current.department || 'Aurora HQ').trim();
    const page = String(input.page || current.page || 'AuroraCityFC_ManagerDashboard.html').trim();
    const priority = normalisePriority(input.priority || input.level);
    const icon = String(input.icon || current.icon || '🔔');
    const dedupeKey = String(input.dedupeKey || '').trim();
    const fingerprint = String(input.fingerprint || hashString(`${department}|${title}|${message}|${page}`));

    return {
      id: String(input.id || randomId()),
      department,
      title,
      message,
      priority,
      icon,
      page,
      actionLabel: String(input.actionLabel || `Open ${department}`).trim(),
      createdAt,
      expiresAt,
      dedupeKey,
      fingerprint,
      source: String(input.source || 'aurora-notifications.js'),
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }

  function add(input = {}) {
    const item = normaliseNotification(input);
    if (!item.title) return null;

    const rows = cleanStore();
    const duplicate = rows.find(row => {
      if (item.dedupeKey && row.dedupeKey === item.dedupeKey && row.fingerprint === item.fingerprint) return true;
      return !item.dedupeKey && row.fingerprint === item.fingerprint && now() - Number(row.createdAt || 0) < 60000;
    });
    if (duplicate) return duplicate;

    rows.unshift(item);
    if (!writeStore(rows, 'add')) return null;
    return item;
  }

  function notifyCurrent(title, message, options = {}) {
    const current = detectPage();
    return add({ ...options, title, message, department: options.department || current.department, page: options.page || current.page, icon: options.icon || current.icon });
  }

  function list(options = {}) {
    const state = readState();
    const rows = cleanStore();
    const department = options.department ? String(options.department).toLowerCase() : '';
    const limit = Math.max(1, Math.min(MAX_ITEMS, Number(options.limit) || MAX_ITEMS));

    return rows
      .map(row => ({ ...row, read: isRead(row, state) }))
      .filter(row => !options.unreadOnly || !row.read)
      .filter(row => !department || String(row.department).toLowerCase() === department)
      .slice(0, limit);
  }

  function isRead(row, state = readState()) {
    return Number(row.createdAt || 0) <= Number(state.allReadAt || 0) || state.ids.includes(String(row.id));
  }

  function unreadCount() {
    return list({ unreadOnly: true }).length;
  }

  function markRead(id) {
    const value = String(id || '');
    if (!value) return false;
    const state = readState();
    if (!state.ids.includes(value)) state.ids.push(value);
    state.ids = state.ids.slice(-300);
    return writeState(state);
  }

  function markAllRead() {
    return writeState({ allReadAt: now(), ids: [] });
  }

  function remove(id) {
    const value = String(id || '');
    return writeStore(readStore().filter(row => String(row.id) !== value), 'remove');
  }

  function clear() {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(READ_KEY);
      publishChange('clear');
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearExpired() {
    return writeStore(cleanStore(), 'cleanup');
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function publishChange(reason = 'update') {
    const detail = { reason, unread: unreadCount(), notifications: list({ limit: 30 }) };
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    } catch (_) {}
    try {
      channel?.postMessage({ type: 'changed', reason, at: now() });
    } catch (_) {}
    subscribers.forEach(callback => {
      try { callback(detail); } catch (_) {}
    });
    renderDashboardBridge();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function formatTime(timestamp) {
    const date = new Date(Number(timestamp) || now());
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function dashboardMarkup(rows) {
    if (!rows.length) return '<div class="beast-empty">No department notifications right now.</div>';
    return rows.map(row => {
      const levelClass = row.priority === 'critical' ? 'bad' : row.priority === 'high' ? 'warn' : '';
      const unreadClass = row.read ? '' : ' aurora-shared-unread';
      const href = row.page ? ` href="${escapeHtml(row.page)}"` : '';
      return `<a class="beast-alert ${levelClass}${unreadClass}" data-aurora-notification-id="${escapeHtml(row.id)}"${href}><span class="beast-alert-icon">${escapeHtml(row.icon)}</span><span><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.message || row.department)}</p><small class="aurora-shared-department">${escapeHtml(row.department)}</small></span><span class="beast-alert-time">${escapeHtml(formatTime(row.createdAt))}</span></a>`;
    }).join('');
  }

  function injectDashboardStyles() {
    if (document.getElementById('auroraSharedNotificationStyles')) return;
    const style = document.createElement('style');
    style.id = 'auroraSharedNotificationStyles';
    style.textContent = `
      .aurora-shared-notification-section{margin-top:14px;padding-top:13px;border-top:1px solid rgba(148,163,184,.12)}
      .aurora-shared-notification-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .aurora-shared-notification-head strong{font-size:12px;color:#e5eefc}
      .aurora-shared-notification-head span{display:block;margin-top:2px;color:#8495ad;font-size:9px}
      .aurora-shared-mark-read{border:1px solid rgba(96,165,250,.22);border-radius:999px;background:rgba(30,64,175,.12);color:#bfdbfe;padding:6px 8px;font-size:8px;font-weight:900;cursor:pointer}
      .aurora-shared-alert-list{display:grid;gap:8px}
      .aurora-shared-alert-list .beast-alert{color:inherit;text-decoration:none;cursor:pointer}
      .aurora-shared-alert-list .aurora-shared-unread{border-color:rgba(34,211,238,.30);background:rgba(8,47,73,.28);box-shadow:inset 3px 0 0 #22d3ee}
      .aurora-shared-department{display:block;margin-top:5px;color:#7dd3fc;font-size:8px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
    `;
    document.head.appendChild(style);
  }

  function attachManagerDashboard() {
    const panel = document.getElementById('beastNotificationPanel');
    const nativeList = document.getElementById('beastAlertList');
    const badge = document.getElementById('beastNotificationCount');
    if (!panel || !nativeList || !badge) return false;

    injectDashboardStyles();

    let section = document.getElementById('auroraSharedNotificationSection');
    if (!section) {
      section = document.createElement('section');
      section.id = 'auroraSharedNotificationSection';
      section.className = 'aurora-shared-notification-section';
      section.innerHTML = `
        <div class="aurora-shared-notification-head">
          <div><strong>Department Notifications</strong><span>Shared updates from every Aurora page.</span></div>
          <button class="aurora-shared-mark-read" id="auroraSharedMarkRead" type="button">Mark all read</button>
        </div>
        <div class="aurora-shared-alert-list" id="auroraSharedAlertList"></div>`;
      nativeList.insertAdjacentElement('afterend', section);
    }

    dashboardBridge = {
      panel,
      badge,
      list: document.getElementById('auroraSharedAlertList'),
      nativeUnread: badge.hidden ? 0 : Number.parseInt(badge.textContent || '0', 10) || 0,
      expectedTotal: null
    };

    const syncNativeBadge = () => {
      if (!dashboardBridge) return;
      const current = badge.hidden ? 0 : Number.parseInt(badge.textContent || '0', 10) || 0;
      if (dashboardBridge.expectedTotal !== null && current === dashboardBridge.expectedTotal) return;
      dashboardBridge.nativeUnread = current;
      renderDashboardBridge();
    };

    new MutationObserver(syncNativeBadge).observe(badge, { attributes: true, childList: true, characterData: true, subtree: true });

    section.addEventListener('click', event => {
      const markAll = event.target.closest('#auroraSharedMarkRead');
      if (markAll) {
        event.preventDefault();
        markAllRead();
        return;
      }
      const alert = event.target.closest('[data-aurora-notification-id]');
      if (alert) markRead(alert.dataset.auroraNotificationId);
    });

    panel.addEventListener('click', event => {
      if (!event.target.closest('#auroraSharedMarkRead')) markAllRead();
    });

    renderDashboardBridge();
    return true;
  }

  function renderDashboardBridge() {
    if (!dashboardBridge) return;
    const rows = list({ limit: 24 });
    if (dashboardBridge.list) dashboardBridge.list.innerHTML = dashboardMarkup(rows);

    const sharedUnread = rows.filter(row => !row.read).length;
    const total = Math.max(0, Number(dashboardBridge.nativeUnread) || 0) + sharedUnread;
    dashboardBridge.expectedTotal = total;
    dashboardBridge.badge.textContent = String(total);
    dashboardBridge.badge.hidden = total === 0;
  }

  function parseStored(value) {
    if (!value) return null;
    return safeJsonParse(value, value);
  }

  function firstFinite(...values) {
    for (const value of values) {
      const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(number)) return number;
    }
    return NaN;
  }

  function formatCash(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: number >= 1000 ? 0 : 2 }).format(number)
      : '';
  }

  function describeMission(value, fallback) {
    const data = parseStored(value);
    if (!data || typeof data !== 'object') return fallback;
    const total = firstFinite(data.total, data.budget, data.investmentTotal, data.totalInvestment, data.requiredTotal);
    const route = data.strategy || data.route || data.scenario || data.mode;
    const parts = [fallback];
    if (route) parts.push(`Route: ${String(route)}.`);
    if (Number.isFinite(total)) parts.push(`Mission value ${formatCash(total)}.`);
    return parts.join(' ');
  }

  function describeTransferPlan(value) {
    const data = parseStored(value);
    if (!data || typeof data !== 'object') return 'The Transfer Centre has changed the final deal sheet.';
    const rows = Array.isArray(data.rows) ? data.rows : Array.isArray(data.allocations) ? data.allocations : [];
    const tickers = rows.map(row => row?.displayTicker || row?.ticker || row?.symbol).filter(Boolean).slice(0, 5);
    const total = firstFinite(data.total, data.totalBudget, data.budget, data.totalInvestment);
    const parts = ['The final deal sheet has been updated.'];
    if (tickers.length) parts.push(`Targets: ${tickers.join(' / ')}.`);
    if (Number.isFinite(total)) parts.push(`Total ${formatCash(total)}.`);
    return parts.join(' ');
  }

  function describeMoneyEvent(value, fallback) {
    const data = parseStored(value);
    if (!data || typeof data !== 'object') return fallback;
    const amount = firstFinite(data.amount, data.total, data.actual, data.actualPaid, data.value, data.invested);
    const status = data.status || data.stage || data.state;
    return `${fallback}${status ? ` Status: ${String(status)}.` : ''}${Number.isFinite(amount) ? ` Value ${formatCash(amount)}.` : ''}`;
  }

  function describeRegistration(value) {
    const data = parseStored(value);
    if (!data || typeof data !== 'object') return 'The Transfer Centre purchase record has changed.';
    const ticker = data.ticker || data.symbol || data.displayTicker || data.name;
    const amount = firstFinite(data.totalCostGbp, data.total_cost_gbp, data.total, data.amount, data.value);
    const shares = firstFinite(data.shares, data.quantity, data.units);
    const parts = ['A purchase registration has been updated.'];
    if (ticker) parts.push(String(ticker));
    if (Number.isFinite(shares)) parts.push(`${shares.toLocaleString('en-GB', { maximumFractionDigits: 4 })} shares.`);
    if (Number.isFinite(amount)) parts.push(`${formatCash(amount)} recorded.`);
    return parts.join(' ');
  }

  function describeLifecycle(value, fallback) {
    const data = parseStored(value);
    if (!data || typeof data !== 'object') return fallback;
    const stage = data.stage || data.status || data.currentStage;
    return stage ? `${fallback} Current stage: ${String(stage)}.` : fallback;
  }

  function handleStorageRule(rule, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') return;
    const fingerprint = hashString(rawValue);
    const dedupeKey = `storage:${rule.key}:${fingerprint}`;
    const message = typeof rule.message === 'function' ? rule.message(rawValue) : String(rule.message || 'Aurora data updated.');
    add({
      department: rule.department,
      page: rule.page,
      title: rule.title,
      message,
      icon: rule.icon,
      priority: rule.priority,
      dedupeKey,
      fingerprint,
      source: rule.key,
      actionLabel: `Open ${rule.department}`
    });
  }

  function initialiseStorageWatchers() {
    STORAGE_RULES.forEach(rule => {
      try { watchedValues.set(rule.key, localStorage.getItem(rule.key)); } catch (_) { watchedValues.set(rule.key, null); }
    });

    const check = () => {
      STORAGE_RULES.forEach(rule => {
        let current = null;
        try { current = localStorage.getItem(rule.key); } catch (_) {}
        const previous = watchedValues.get(rule.key);
        if (current !== previous) {
          watchedValues.set(rule.key, current);
          if (previous !== undefined) handleStorageRule(rule, current);
        }
      });
    };

    window.setInterval(check, 1600);
    window.addEventListener('storage', event => {
      const rule = STORAGE_RULES.find(item => item.key === event.key);
      if (!rule) return;
      watchedValues.set(rule.key, event.newValue);
      handleStorageRule(rule, event.newValue);
    });
  }

  function test() {
    return add({
      department: 'Aurora HQ',
      page: 'AuroraCityFC_ManagerDashboard.html',
      title: 'Notification system test',
      message: 'The shared Aurora notification channel is working correctly.',
      priority: 'normal',
      icon: '🔔',
      dedupeKey: `manual-test:${Math.floor(now() / 60000)}`,
      ttlDays: 1
    });
  }

  function seedInstallNotice() {
    try {
      if (localStorage.getItem(INSTALL_KEY)) return;
      localStorage.setItem(INSTALL_KEY, VERSION);
      add({
        department: 'Aurora HQ',
        page: 'AuroraCityFC_ManagerDashboard.html',
        title: 'Shared notifications connected',
        message: 'The Manager Dashboard can now receive shared updates from Aurora departments.',
        priority: 'normal',
        icon: '🔔',
        dedupeKey: 'aurora-notifications-installed-v1',
        ttlDays: 7
      });
    } catch (_) {}
  }

  function start() {
    clearExpired();
    seedInstallNotice();
    initialiseStorageWatchers();
    attachManagerDashboard();
    window.setTimeout(attachManagerDashboard, 900);
    window.setTimeout(attachManagerDashboard, 2500);
  }

  window.AuroraNotifications = Object.freeze({
    version: VERSION,
    add,
    notify: add,
    notifyCurrent,
    list,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    clear,
    clearExpired,
    subscribe,
    test,
    currentPage: detectPage
  });

  document.addEventListener('aurora:notify', event => {
    if (event?.detail) add(event.detail);
  });

  window.addEventListener(EVENT_NAME, renderDashboardBridge);
  channel?.addEventListener('message', event => {
    if (event?.data?.type === 'changed') {
      renderDashboardBridge();
      subscribers.forEach(callback => {
        try { callback({ reason: 'channel', unread: unreadCount(), notifications: list({ limit: 30 }) }); } catch (_) {}
      });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

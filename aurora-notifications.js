/**
 * Aurora City FC — Shared Notification System
 * One notification store for every Aurora department.
 *
 * Public API:
 *   AuroraNotifications.add({...})
 *   AuroraNotifications.notifyCurrent(title, message, options)
 *   AuroraNotifications.replaceLive(source, notifications)
 *   AuroraNotifications.list({ unreadOnly, department, limit })
 *   AuroraNotifications.markRead(id)
 *   AuroraNotifications.markAllRead()
 *   AuroraNotifications.remove(id)
 *   AuroraNotifications.clear()
 *   AuroraNotifications.subscribe(callback)
 *   AuroraNotifications.attachDocument(document)
 *   AuroraNotifications.test()
 */
(() => {
  'use strict';

  const OWNER_SCRIPT_ATTRIBUTE =
    'data-aurora-notifications-global-owner';

  const OWNER_SCRIPT_VERSION = '5.1.0';

  const currentScriptUrl = (() => {
    try {
      return document.currentScript?.src
        || 'aurora-notifications.js';
    } catch (_) {
      return 'aurora-notifications.js';
    }
  })();

  function sameOriginTopWindow() {
    try {
      if (
        window.top
        && window.top !== window
        && window.top.document
      ) {
        return window.top;
      }
    } catch (_) {}

    return null;
  }

  function connectChildToOwner(ownerWindow) {
    if (!ownerWindow?.AuroraNotifications) {
      return false;
    }

    try {
      window.AuroraNotifications =
        ownerWindow.AuroraNotifications;
    } catch (_) {}

    try {
      ownerWindow.AuroraNotifications
        .attachDocument?.(document);
    } catch (_) {}

    return true;
  }

  /*
   * Every iframe page delegates to the same top-level GameShell owner.
   * This prevents each HTML from creating a competing notification
   * instance that disappears when the iframe navigates.
   */
  const ownerWindow = sameOriginTopWindow();

  if (ownerWindow) {
    const ownerDocument = ownerWindow.document;

    if (
      !ownerDocument.querySelector(
        `script[${OWNER_SCRIPT_ATTRIBUTE}]`
      )
    ) {
      const script = ownerDocument.createElement('script');

      script.src = currentScriptUrl;
      script.async = false;
      script.setAttribute(
        OWNER_SCRIPT_ATTRIBUTE,
        OWNER_SCRIPT_VERSION
      );

      ownerDocument.head?.appendChild(script);
    }

    if (!connectChildToOwner(ownerWindow)) {
      let attempts = 0;

      const timer = window.setInterval(() => {
        attempts += 1;

        if (
          connectChildToOwner(ownerWindow)
          || attempts >= 80
        ) {
          window.clearInterval(timer);
        }
      }, 100);
    }

    return;
  }

  function installUniversalShellUI(api) {
    if (!api) return null;

    const existing =
      window.AuroraNotificationsShellUI;

    if (
      existing
      && existing.version === OWNER_SCRIPT_VERSION
    ) {
      existing.setApi?.(api);
      existing.refresh?.();
      return existing;
    }

    const documentObject = document;
    let currentApi = api;
    let frame = null;
    let frameLoadHandler = null;

    function escapeHtml(value) {
      return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        })[character]
      );
    }

    function formatTime(timestamp) {
      const date = new Date(
        Number(timestamp) || Date.now()
      );

      const today = new Date();

      return date.toDateString()
        === today.toDateString()
          ? date.toLocaleTimeString(
              'en-GB',
              {hour:'2-digit',minute:'2-digit'}
            )
          : date.toLocaleDateString(
              'en-GB',
              {day:'2-digit',month:'short'}
            );
    }

    function inferRich(row = {}) {
      const supplied =
        row?.metadata?.rich
        && typeof row.metadata.rich === 'object'
          ? row.metadata.rich
          : null;

      if (supplied) return supplied;

      const text = `${row.department || ''} ${row.title || ''} ${row.message || ''}`
        .toLowerCase();

      const type =
        /transfer|purchase|registration|broker/.test(text)
          ? 'transfer'
          : /income|finance|dividend|budget/.test(text)
            ? 'income'
            : /warning|refresh|review|stale/.test(text)
              ? 'warning'
              : /success|complete|ready|signed/.test(text)
                ? 'success'
                : 'update';

      return {
        type,
        kicker:row.department || 'Aurora HQ',
        badge:
          row.priority === 'critical'
            ? 'Urgent'
            : row.priority === 'high'
              ? 'Priority'
              : 'Live',
        value:'',
        valueLabel:'',
        secondary:row.department || '',
        progress:null,
        featured:false,
        actionText:
          row.actionLabel
          || `Open ${row.department || 'Aurora'}`
      };
    }

    function injectStyles() {
      let style = documentObject.getElementById(
        'auroraGlobalNotificationOwnerStyles'
      );

      if (style) return;

      style = documentObject.createElement('style');
      style.id = 'auroraGlobalNotificationOwnerStyles';
      style.textContent = `
        #auroraShellNotificationPanel{
          position:fixed;
          z-index:2147483000;
          right:18px;
          top:78px;
          width:min(500px,calc(100vw - 36px));
          max-height:calc(100dvh - 96px);
          display:none;
          overflow:auto;
          padding:16px;
          border:1px solid rgba(34,211,238,.30);
          border-radius:24px;
          background:
            radial-gradient(circle at 96% 0%,rgba(34,211,238,.13),transparent 34%),
            linear-gradient(180deg,rgba(7,20,40,.995),rgba(2,7,18,.998));
          box-shadow:0 30px 90px rgba(0,0,0,.68);
          color:#eaf4ff;
          backdrop-filter:blur(22px);
          -webkit-backdrop-filter:blur(22px)
        }
        #auroraShellNotificationPanel.open{display:block}
        .aurora-shell-notification-head{
          position:sticky;
          top:-16px;
          z-index:8;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          margin:-16px -16px 12px;
          padding:16px;
          border-bottom:1px solid rgba(148,163,184,.12);
          background:rgba(5,17,35,.98)
        }
        .aurora-shell-notification-head h2{
          margin:0;
          font-size:20px
        }
        .aurora-shell-notification-head p{
          margin:4px 0 0;
          color:#8495ad;
          font-size:10px
        }
        .aurora-shell-notification-head-actions{
          display:flex;
          gap:6px;
          align-items:center
        }
        .aurora-shell-notification-tool,
        .aurora-shell-notification-close{
          min-height:34px;
          border:1px solid rgba(96,165,250,.22);
          border-radius:10px;
          background:rgba(30,64,175,.14);
          color:#bfdbfe;
          padding:7px 9px;
          font:900 9px/1 system-ui,sans-serif;
          cursor:pointer
        }
        .aurora-shell-notification-close{
          width:34px;
          padding:0;
          color:#fecaca;
          border-color:rgba(248,113,113,.28);
          background:rgba(127,29,29,.22);
          font-size:20px
        }
        .aurora-shell-notification-list{
          display:grid;
          gap:10px
        }
        .aurora-shell-notification-empty{
          padding:28px 14px;
          text-align:center;
          color:#8192aa;
          font-size:12px
        }
        .aurora-shell-rich-alert{
          --rich-accent:34,211,238;
          --rich-solid:#22d3ee;
          position:relative;
          overflow:hidden;
          border:1px solid rgba(var(--rich-accent),.28);
          border-radius:18px;
          background:
            radial-gradient(circle at 100% 0%,rgba(var(--rich-accent),.16),transparent 42%),
            linear-gradient(145deg,rgba(8,18,38,.98),rgba(4,10,24,.99));
          box-shadow:inset 3px 0 0 rgba(var(--rich-accent),.76)
        }
        .aurora-shell-rich-alert[data-type="transfer"]{
          --rich-accent:245,158,11;
          --rich-solid:#f59e0b
        }
        .aurora-shell-rich-alert[data-type="income"]{
          --rich-accent:96,165,250;
          --rich-solid:#60a5fa
        }
        .aurora-shell-rich-alert[data-type="warning"]{
          --rich-accent:251,191,36;
          --rich-solid:#fbbf24
        }
        .aurora-shell-rich-alert[data-type="success"],
        .aurora-shell-rich-alert[data-type="performer"]{
          --rich-accent:52,211,153;
          --rich-solid:#34d399
        }
        .aurora-shell-rich-alert.is-unread{
          box-shadow:
            inset 4px 0 0 var(--rich-solid),
            0 12px 28px rgba(0,0,0,.24)
        }
        .aurora-shell-rich-open{
          display:flex;
          flex-direction:column;
          gap:10px;
          padding:14px 42px 14px 14px;
          color:inherit;
          text-decoration:none
        }
        .aurora-shell-rich-top,
        .aurora-shell-rich-main,
        .aurora-shell-rich-foot{
          display:flex;
          align-items:center;
          gap:10px
        }
        .aurora-shell-rich-top,
        .aurora-shell-rich-foot{
          justify-content:space-between
        }
        .aurora-shell-rich-top small{
          color:rgb(var(--rich-accent));
          font-size:8px;
          font-weight:1000;
          letter-spacing:.12em;
          text-transform:uppercase
        }
        .aurora-shell-rich-badge{
          padding:5px 8px;
          border:1px solid rgba(var(--rich-accent),.28);
          border-radius:999px;
          color:rgb(var(--rich-accent));
          background:rgba(var(--rich-accent),.09);
          font-size:7px;
          font-weight:1000;
          text-transform:uppercase
        }
        .aurora-shell-rich-main{
          align-items:flex-start
        }
        .aurora-shell-rich-icon{
          width:44px;
          height:44px;
          flex:0 0 44px;
          display:grid;
          place-items:center;
          border:1px solid rgba(var(--rich-accent),.24);
          border-radius:13px;
          background:rgba(var(--rich-accent),.11);
          font-size:20px
        }
        .aurora-shell-rich-copy{
          min-width:0;
          flex:1 1 auto
        }
        .aurora-shell-rich-copy strong{
          display:block;
          color:#f8fbff;
          font-size:13px
        }
        .aurora-shell-rich-copy p{
          margin:4px 0 0;
          color:#98a9bf;
          font-size:9px;
          line-height:1.45
        }
        .aurora-shell-rich-value{
          flex:0 0 auto;
          text-align:right
        }
        .aurora-shell-rich-value strong{
          display:block;
          color:rgb(var(--rich-accent));
          font-size:18px
        }
        .aurora-shell-rich-value small{
          display:block;
          margin-top:4px;
          color:#8193aa;
          font-size:7px;
          font-weight:900
        }
        .aurora-shell-rich-progress{
          height:5px;
          overflow:hidden;
          border-radius:999px;
          background:rgba(148,163,184,.13)
        }
        .aurora-shell-rich-progress i{
          display:block;
          height:100%;
          border-radius:inherit;
          background:linear-gradient(90deg,rgba(var(--rich-accent),.70),var(--rich-solid))
        }
        .aurora-shell-rich-foot{
          color:#8294aa;
          font-size:8px
        }
        .aurora-shell-rich-action{
          margin-left:auto;
          color:#dcecff;
          font-weight:900
        }
        .aurora-shell-rich-remove{
          position:absolute;
          z-index:4;
          top:8px;
          right:8px;
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          padding:0;
          border:1px solid rgba(248,113,113,.28);
          border-radius:50%;
          color:#fecaca;
          background:rgba(127,29,29,.22);
          cursor:pointer
        }
        #auroraShellNotificationButton.is-active{
          border-color:rgba(34,211,238,.52)!important;
          box-shadow:0 0 0 4px rgba(34,211,238,.10)!important
        }
        @media(max-width:720px){
          #auroraShellNotificationPanel{
            right:10px;
            top:auto;
            bottom:calc(70px + env(safe-area-inset-bottom,0px));
            width:calc(100vw - 20px);
            max-height:70dvh
          }
        }
      `;

      documentObject.head?.appendChild(style);
    }

    function ensurePanel() {
      injectStyles();

      let panel = documentObject.getElementById(
        'auroraShellNotificationPanel'
      );

      if (!panel) {
        panel = documentObject.createElement('section');
        panel.id = 'auroraShellNotificationPanel';
        panel.setAttribute(
          'aria-label',
          'Aurora notifications'
        );
        panel.setAttribute('aria-hidden','true');
        panel.innerHTML = `
          <div class="aurora-shell-notification-head">
            <div>
              <h2>Command Notifications</h2>
              <p>One live panel across every Aurora department.</p>
            </div>
            <div class="aurora-shell-notification-head-actions">
              <button class="aurora-shell-notification-tool" id="auroraShellMarkNotificationsRead" type="button">Mark read</button>
              <button class="aurora-shell-notification-tool" id="auroraShellClearNotifications" type="button">Clear</button>
              <button class="aurora-shell-notification-close" id="auroraShellNotificationClose" type="button" aria-label="Close notifications">×</button>
            </div>
          </div>
          <div class="aurora-shell-notification-list" id="auroraShellNotificationList"></div>`;

        documentObject.body?.appendChild(panel);
      }

      return panel;
    }

    function elements() {
      const panel = ensurePanel();

      return {
        button:
          documentObject.getElementById(
            'auroraShellNotificationButton'
          )
          || documentObject.getElementById(
            'beastNotificationButton'
          ),
        count:
          documentObject.getElementById(
            'auroraShellNotificationCount'
          )
          || documentObject.getElementById(
            'beastNotificationCount'
          ),
        panel,
        list:
          documentObject.getElementById(
            'auroraShellNotificationList'
          ),
        close:
          documentObject.getElementById(
            'auroraShellNotificationClose'
          ),
        mark:
          documentObject.getElementById(
            'auroraShellMarkNotificationsRead'
          ),
        clear:
          documentObject.getElementById(
            'auroraShellClearNotifications'
          )
      };
    }

    function markup(rows) {
      if (!rows.length) {
        return '<div class="aurora-shell-notification-empty">No notifications right now.</div>';
      }

      return rows.map(row => {
        const rich = inferRich(row);
        const progressValue = Number(rich.progress);

        const progress = Number.isFinite(progressValue)
          ? `<div class="aurora-shell-rich-progress"><i style="width:${Math.max(0,Math.min(100,progressValue))}%"></i></div>`
          : '';

        const value = rich.value
          ? `<span class="aurora-shell-rich-value"><strong>${escapeHtml(rich.value)}</strong><small>${escapeHtml(rich.valueLabel || '')}</small></span>`
          : '';

        return `
          <article
            class="aurora-shell-rich-alert${row.read ? '' : ' is-unread'}"
            data-type="${escapeHtml(rich.type || 'update')}"
            data-id="${escapeHtml(row.id)}"
          >
            <a
              class="aurora-shell-rich-open"
              href="#"
              data-aurora-shell-open="${escapeHtml(row.id)}"
              data-open-page="${escapeHtml(row.page || '')}"
            >
              <span class="aurora-shell-rich-top">
                <small>${escapeHtml(rich.kicker || row.department || 'Aurora Update')}</small>
                <span class="aurora-shell-rich-badge">${escapeHtml(rich.badge || 'Live')}</span>
              </span>
              <span class="aurora-shell-rich-main">
                <span class="aurora-shell-rich-icon">${escapeHtml(row.icon || '🔔')}</span>
                <span class="aurora-shell-rich-copy">
                  <strong>${escapeHtml(row.title || 'Aurora update')}</strong>
                  <p>${escapeHtml(row.message || row.department || '')}</p>
                </span>
                ${value}
              </span>
              ${progress}
              <span class="aurora-shell-rich-foot">
                <span>${escapeHtml(rich.secondary || row.department || '')}</span>
                <span class="aurora-shell-rich-action">${escapeHtml(rich.actionText || row.actionLabel || 'Open')} →</span>
                <time>${escapeHtml(formatTime(row.createdAt))}</time>
              </span>
            </a>
            <button
              class="aurora-shell-rich-remove"
              type="button"
              data-aurora-shell-remove="${escapeHtml(row.id)}"
              aria-label="Remove notification"
            >×</button>
          </article>`;
      }).join('');
    }

    function render() {
      const ui = elements();
      const rows = currentApi?.list?.({limit:30}) || [];
      const unread = Number(
        currentApi?.unreadCount?.()
      ) || 0;

      if (ui.list) {
        ui.list.innerHTML = markup(rows);
      }

      if (ui.count) {
        ui.count.textContent = String(unread);
        ui.count.hidden = unread <= 0;
      }
    }

    function openPanel() {
      const ui = elements();
      render();
      ui.panel.hidden = false;
      ui.panel.classList.add('open');
      ui.panel.style.setProperty('display','block','important');
      ui.panel.setAttribute('aria-hidden','false');
      ui.panel.scrollTop = 0;
      ui.button?.classList.add('is-active');
      ui.button?.setAttribute('aria-expanded','true');
    }

    function closePanel() {
      const ui = elements();
      ui.panel.classList.remove('open');
      ui.panel.style.removeProperty('display');
      ui.panel.setAttribute('aria-hidden','true');
      ui.button?.classList.remove('is-active');
      ui.button?.setAttribute('aria-expanded','false');
    }

    function togglePanel() {
      const ui = elements();

      if (ui.panel.classList.contains('open')) {
        closePanel();
      } else {
        openPanel();
      }
    }

    function attachChild() {
      const childFrame = documentObject.getElementById(
        'clubFrame'
      );

      if (!childFrame) return false;

      try {
        const childWindow = childFrame.contentWindow;
        const childDocument = childFrame.contentDocument;

        if (childWindow) {
          childWindow.AuroraNotifications = currentApi;
        }

        currentApi?.attachDocument?.(childDocument);
        return true;
      } catch (_) {
        return false;
      }
    }

    function bindFrame() {
      const nextFrame = documentObject.getElementById(
        'clubFrame'
      );

      if (nextFrame === frame) return;

      if (frame && frameLoadHandler) {
        frame.removeEventListener(
          'load',
          frameLoadHandler
        );
      }

      frame = nextFrame;

      if (!frame) return;

      frameLoadHandler = () => {
        /*
         * Navigation never destroys the notification owner. We only
         * reconnect the newly loaded child document and reset the panel
         * to a known closed state ready for the next bell press.
         */
        closePanel();
        window.setTimeout(attachChild,0);
        window.setTimeout(attachChild,250);
      };

      frame.addEventListener(
        'load',
        frameLoadHandler
      );

      attachChild();
    }

    function bindEvents() {
      const root = documentObject.documentElement;

      if (
        root.dataset
          .auroraGlobalNotificationsBound === OWNER_SCRIPT_VERSION
      ) {
        return;
      }

      root.dataset.auroraGlobalNotificationsBound =
        OWNER_SCRIPT_VERSION;

      /*
       * Capture phase deliberately wins over the old GameShell handler
       * that used to redirect notification clicks to Manager Dashboard.
       */
      documentObject.addEventListener(
        'click',
        event => {
          const button = event.target?.closest?.(
            '#auroraShellNotificationButton,#beastNotificationButton'
          );

          if (button) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            togglePanel();
            return;
          }

          const close = event.target?.closest?.(
            '#auroraShellNotificationClose'
          );

          if (close) {
            event.preventDefault();
            closePanel();
            return;
          }

          const mark = event.target?.closest?.(
            '#auroraShellMarkNotificationsRead'
          );

          if (mark) {
            event.preventDefault();
            currentApi?.markAllRead?.();
            render();
            return;
          }

          const clear = event.target?.closest?.(
            '#auroraShellClearNotifications'
          );

          if (clear) {
            event.preventDefault();
            currentApi?.clear?.();
            render();
            return;
          }

          const remove = event.target?.closest?.(
            '[data-aurora-shell-remove]'
          );

          if (remove) {
            event.preventDefault();
            currentApi?.remove?.(
              remove.dataset.auroraShellRemove
            );
            render();
            return;
          }

          const open = event.target?.closest?.(
            '[data-aurora-shell-open]'
          );

          if (open) {
            event.preventDefault();

            currentApi?.markRead?.(
              open.dataset.auroraShellOpen
            );

            const page = open.dataset.openPage;

            if (page) {
              closePanel();

              if (
                window.AuroraGameShell?.loadPage
              ) {
                window.AuroraGameShell.loadPage(page);
              } else {
                window.location.href = page;
              }
            } else {
              render();
            }

            return;
          }

          const ui = elements();

          if (
            ui.panel.classList.contains('open')
            && !ui.panel.contains(event.target)
          ) {
            closePanel();
          }
        },
        true
      );

      documentObject.addEventListener(
        'keydown',
        event => {
          if (event.key === 'Escape') {
            closePanel();
          }
        }
      );

      window.addEventListener(
        'aurora:notifications-changed',
        render
      );

      /*
       * Do not observe the whole shell subtree here. render() replaces the
       * notification list markup, so a subtree MutationObserver would trigger
       * itself forever and starve later clicks after the first page load.
       * The GameShell iframe is permanent and its own load event is sufficient
       * to reconnect every department page.
       */
      window.addEventListener(
        'pageshow',
        () => {
          bindFrame();
          render();
        }
      );
    }

    const shellUi = Object.freeze({
      version:OWNER_SCRIPT_VERSION,
      open:openPanel,
      close:closePanel,
      toggle:togglePanel,
      render,
      refresh(){
        bindFrame();
        render();
      },
      setApi(nextApi){
        if (nextApi) currentApi = nextApi;
      }
    });

    window.AuroraNotificationsShellUI = shellUi;
    window.AuroraShellNotifications = shellUi;

    ensurePanel();
    bindEvents();
    bindFrame();
    render();

    return shellUi;
  }

  /*
   * A legacy embedded core may already exist in an older GameShell.
   * Instead of silently returning, install the permanent shell UI on
   * top of that API so the bell remains usable during migration.
   */
  if (window.AuroraNotifications?.version) {
    installUniversalShellUI(
      window.AuroraNotifications
    );
    return;
  }

  const VERSION = '5.1.0';
  const STORE_KEY = 'aurora_notifications_v1';
  const READ_KEY = 'aurora_notifications_read_v1';
  const INSTALL_KEY = 'aurora_notifications_installed_v1';
  const WATCH_KEY = 'aurora_notifications_watch_state_v3';
  const SNAPSHOT_KEY = 'aurora_notification_snapshots_v1';
  const PREFERENCES_KEY = 'aurora_notification_preferences_v1';
  const DIGEST_KEY = 'aurora_notification_digest_v1';
  const DISMISS_KEY = 'aurora_notifications_dismissed_v2';
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
    },
    {
      key: 'aurora_trading_brain_decision_v1',
      department: 'Analysis Room',
      page: 'AuroraCityFC_AnalysisRoom.html',
      title: 'Investment decision updated',
      icon: '🧠',
      priority: 'high',
      message: value => describeLifecycle(value, 'The Aurora decision engine has changed its current instruction.')
    },
    {
      key: 'aurora_account_transfer_instruction_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Broker funding route changed',
      icon: '🏦',
      priority: 'high',
      message: value => describeMoneyEvent(value, 'The broker funding route has changed.')
    },
    {
      key: 'aurora_transfer_centre_receipt_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Transfer receipt updated',
      icon: '🧾',
      priority: 'normal',
      message: value => describeMoneyEvent(value, 'The Transfer Centre receipt has changed.')
    },
    {
      key: 'aurora_m7_manager_approval',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Manager approval updated',
      icon: '✅',
      priority: 'high',
      message: value => describeLifecycle(value, 'The manager approval state has changed.')
    },
    {
      key: 'aurora_wealth_centre',
      department: 'Finance Department',
      page: 'AuroraCityFC_FinanceDepartment.html',
      title: 'Finance position updated',
      icon: '💷',
      priority: 'normal',
      message: describeFinancePlanner
    },
    {
      key: 'aurora_pending_registrations_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Registration queue updated',
      icon: '🧾',
      priority: 'normal',
      message: value => describeCollection(value, 'Pending registrations')
    },
    {
      key: 'aurora_m3_last_transfer_receipt_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Latest transfer receipt updated',
      icon: '🧾',
      priority: 'normal',
      message: value => describeMoneyEvent(value, 'The latest transfer receipt has changed.')
    },
    {
      key: 'aurora_m3_dynamic_transfer_budget_v1',
      department: 'Transfer Centre',
      page: 'AuroraCityFC_TransferCentre.html',
      title: 'Transfer budget recalculated',
      icon: '💷',
      priority: 'normal',
      message: value => describeMoneyEvent(value, 'The live transfer budget has changed.')
    }

  ];

  const STORAGE_SOURCE_KEYS = new Set(STORAGE_RULES.map(rule => rule.key));

  const subscribers = new Set();
  const watchedValues = new Map();
  const watchedSnapshots = new Map();
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

  const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
    performance:'immediate',
    targets:'immediate',
    transfers:'immediate',
    finance:'immediate',
    income:'immediate',
    intelligence:'immediate',
    system:'immediate'
  });

  const NOTIFICATION_GROUP_LABELS = Object.freeze({
    performance:'Performance',
    targets:'Targets',
    transfers:'Transfers',
    finance:'Finance & bills',
    income:'Dividends & income',
    intelligence:'Intelligence',
    system:'System & data'
  });

  function normalisePreferenceMode(value) {
    const mode = String(value || '').toLowerCase();

    return ['immediate','digest','off'].includes(mode)
      ? mode
      : 'immediate';
  }

  function readPreferences() {
    try {
      const saved = safeJsonParse(
        localStorage.getItem(PREFERENCES_KEY) || '{}',
        {}
      );

      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(saved && typeof saved === 'object'
          ? Object.fromEntries(
              Object.entries(saved).map(
                ([key, value]) => [
                  key,
                  normalisePreferenceMode(value)
                ]
              )
            )
          : {})
      };
    } catch (_) {
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES
      };
    }
  }

  function notificationGroupFor(item = {}) {
    const explicit = String(
      item?.metadata?.notificationGroup || ''
    ).toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        DEFAULT_NOTIFICATION_PREFERENCES,
        explicit
      )
    ) {
      return explicit;
    }

    const type = String(
      item?.metadata?.rich?.type || ''
    ).toLowerCase();

    const department = String(
      item?.department || ''
    ).toLowerCase();

    const title = String(
      item?.title || ''
    ).toLowerCase();

    const message = String(
      item?.message || ''
    ).toLowerCase();

    const text = `${department} ${title} ${message}`;

    if (
      /performer|biggest drag|portfolio move|market close/.test(text)
      || ['performer','risk','performance'].includes(type)
    ) {
      return 'performance';
    }

    if (
      /target zone|target hit|target report|below target/.test(text)
      || type === 'target'
    ) {
      return 'targets';
    }

    if (
      /transfer|broker funding|registration|purchase executed|signing|handoff/.test(text)
      || ['transfer','signing'].includes(type)
    ) {
      return 'transfers';
    }

    if (
      /finance|bill|holding pot|budget position/.test(text)
      || type === 'finance'
    ) {
      return 'finance';
    }

    if (
      /dividend|income|milestone/.test(text)
      || ['income','milestone'].includes(type)
    ) {
      return 'income';
    }

    if (
      /intelligence|confidence|buy permission|market regime|restriction|risk level/.test(text)
      || ['intelligence','decision'].includes(type)
    ) {
      return 'intelligence';
    }

    return 'system';
  }

  function getPreference(group) {
    const key = String(group || 'system').toLowerCase();
    const preferences = readPreferences();

    return normalisePreferenceMode(
      preferences[key]
      || DEFAULT_NOTIFICATION_PREFERENCES[key]
      || 'immediate'
    );
  }

  function applyPreferencesToStore() {
    const rows = cleanStore(readStore());

    const filtered = rows.filter(row => {
      const group = notificationGroupFor(row);
      const mode = getPreference(group);

      if (mode === 'off') return false;

      if (mode === 'digest') {
        return Boolean(
          row?.metadata?.digestCard
        );
      }

      if (
        mode === 'immediate'
        && row?.metadata?.digestCard
      ) {
        return false;
      }

      return true;
    });

    return writeStore(
      filtered,
      'preferences-applied'
    );
  }

  function setPreference(group, mode) {
    const key = String(group || '').toLowerCase();

    if (
      !Object.prototype.hasOwnProperty.call(
        DEFAULT_NOTIFICATION_PREFERENCES,
        key
      )
    ) {
      return false;
    }

    const preferences = readPreferences();
    preferences[key] = normalisePreferenceMode(mode);

    try {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify(preferences)
      );

      if (
        preferences[key] !== 'digest'
      ) {
        const digestState =
          readDigestState();

        Object.keys(digestState).forEach(
          digestId => {
            if (
              digestState[digestId]?.group
              === key
            ) {
              delete digestState[digestId];
            }
          }
        );

        writeDigestState(digestState);
      }
    } catch (_) {
      return false;
    }

    applyPreferencesToStore();

    try {
      window.dispatchEvent(
        new CustomEvent(
          'aurora:notification-preferences-changed',
          {
            detail:{
              group:key,
              mode:preferences[key],
              preferences
            }
          }
        )
      );
    } catch (_) {}

    return true;
  }

  function readDigestState() {
    try {
      const value = safeJsonParse(
        localStorage.getItem(DIGEST_KEY) || '{}',
        {}
      );

      return value && typeof value === 'object'
        ? value
        : {};
    } catch (_) {
      return {};
    }
  }

  function writeDigestState(value) {
    try {
      localStorage.setItem(
        DIGEST_KEY,
        JSON.stringify(value || {})
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function digestDateKey(timestamp = now()) {
    const date = new Date(timestamp);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function upsertDigestRow(rows, item) {
    const group = notificationGroupFor(item);
    const dateKey = digestDateKey(item.createdAt);
    const digestId = `${dateKey}:${group}`;
    const digestState = readDigestState();
    const current = digestState[digestId] || {
      dateKey,
      group,
      count:0,
      latestTitles:[],
      fingerprints:[],
      lastAt:0
    };

    current.fingerprints =
      Array.isArray(current.fingerprints)
        ? current.fingerprints
        : [];

    const fingerprint = String(
      item.fingerprint || ''
    );

    const alreadyIncluded =
      fingerprint
      && current.fingerprints.includes(
        fingerprint
      );

    if (!alreadyIncluded) {
      current.count += 1;
      current.lastAt =
        Number(item.createdAt) || now();

      current.latestTitles = [
        item.title,
        ...(Array.isArray(current.latestTitles)
          ? current.latestTitles
          : [])
      ]
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        )
        .slice(0, 4);

      if (fingerprint) {
        current.fingerprints.unshift(
          fingerprint
        );

        current.fingerprints =
          current.fingerprints.slice(0, 80);
      }
    }

    digestState[digestId] = current;
    writeDigestState(digestState);

    const title =
      `${NOTIFICATION_GROUP_LABELS[group] || 'Aurora'} daily digest`;

    const message =
      `${current.count} update${current.count === 1 ? '' : 's'} today`
      + (
        current.latestTitles.length
          ? ` • Latest: ${current.latestTitles.join(' • ')}`
          : ''
      );

    const digestItem = normaliseNotification({
      department:'Aurora HQ',
      page:'AuroraCityFC_ManagerDashboard.html',
      title,
      message,
      icon:'📋',
      priority:'low',
      dedupeKey:`digest:${digestId}`,
      fingerprint:hashString(
        `${digestId}|${current.count}|${current.latestTitles.join('|')}`
      ),
      source:'notification-digest',
      actionLabel:'Open notification digest',
      metadata:{
        digestCard:true,
        preferenceBypass:true,
        notificationGroup:group,
        category:'information',
        replaceExisting:true,
        rich:{
          type:'update',
          kicker:'DAILY DIGEST',
          badge:(NOTIFICATION_GROUP_LABELS[group] || group).toUpperCase(),
          value:String(current.count),
          valueLabel:'UPDATES',
          secondary:current.latestTitles[0] || '',
          actionText:'Review digest'
        }
      }
    });

    const next = rows.filter(
      row =>
        String(row?.dedupeKey || '')
        !== digestItem.dedupeKey
    );

    next.unshift(digestItem);
    return next;
  }

  function deliveryModeFor(item) {
    if (item?.metadata?.preferenceBypass) {
      return 'immediate';
    }

    return getPreference(
      notificationGroupFor(item)
    );
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


  function readWatchState() {
    try {
      const value = safeJsonParse(
        localStorage.getItem(WATCH_KEY) || '{}',
        {}
      );
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function writeWatchState(value) {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(value || {}));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readSnapshotState() {
    try {
      const value = safeJsonParse(
        localStorage.getItem(SNAPSHOT_KEY) || '{}',
        {}
      );

      return value && typeof value === 'object'
        ? value
        : {};
    } catch (_) {
      return {};
    }
  }

  function writeSnapshotState(value) {
    try {
      localStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify(value || {})
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function readDismissed() {
    const timestamp = now();

    try {
      const value = safeJsonParse(
        localStorage.getItem(DISMISS_KEY) || '{}',
        {}
      );

      const clean = {};

      Object.entries(
        value && typeof value === 'object' ? value : {}
      ).forEach(([key, expiresAt]) => {
        if (Number(expiresAt) > timestamp) {
          clean[key] = Number(expiresAt);
        }
      });

      if (JSON.stringify(clean) !== JSON.stringify(value || {})) {
        localStorage.setItem(DISMISS_KEY, JSON.stringify(clean));
      }

      return clean;
    } catch (_) {
      return {};
    }
  }

  function dismissFingerprint(source, fingerprint, days = 7) {
    const sourceKey = String(source || '');
    const value = String(fingerprint || '');

    if (!sourceKey || !value) return false;

    const dismissed = readDismissed();
    dismissed[`${sourceKey}|${value}`] =
      now() + Math.max(1, Number(days) || 7) * 86400000;

    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify(dismissed)
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function isDismissed(source, fingerprint) {
    const dismissed = readDismissed();

    return Boolean(
      dismissed[
        `${String(source || '')}|${String(fingerprint || '')}`
      ]
    );
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

  function isSuppressedZeroValueNotification(row) {
    const source = String(row?.source || '');
    const message = String(row?.message || '');
    const missionSources = new Set([
      'aurora_finance_department_mission_v1',
      'aurora_wealth_investment_mission_v1'
    ]);

    if (missionSources.has(source)) {
      return /Mission value\s+£0(?:\.00)?(?![\d.])/i.test(message);
    }
    if (source === 'aurora_transfer_plan_v2') {
      return /Total\s+£0(?:\.00)?(?![\d.])/i.test(message);
    }
    return false;
  }


  function isLegacyRowAgeNotification(row) {
    const title = String(row?.title || '');
    const message = String(row?.message || '');

    return (
      /Aurora data needs a refresh/i.test(title)
      && /newest dated row is\s+\d+(?:\.\d+)?\s+hours old/i.test(message)
    );
  }

  function cleanStore(rows = readStore()) {
    const timestamp = now();
    const seenIds = new Set();
    const seenStorageStates = new Set();

    return rows
      .filter(row => row && typeof row === 'object')
      .filter(row => !isSuppressedZeroValueNotification(row))
      .filter(row => !isLegacyRowAgeNotification(row))
      .filter(row => !Number(row.expiresAt) || Number(row.expiresAt) > timestamp)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .filter(row => {
        const id = String(row.id || '');
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);

        const source = String(row.source || '');
        if (STORAGE_SOURCE_KEYS.has(source)) {
          const semanticState = [
            source,
            String(row.department || ''),
            String(row.title || ''),
            String(row.message || ''),
            String(row.page || '')
          ].join('|');
          if (seenStorageStates.has(semanticState)) return false;
          seenStorageStates.add(semanticState);
        }
        return true;
      })
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

    item.metadata = {
      ...(item.metadata || {}),
      notificationGroup:
        notificationGroupFor(item)
    };

    /*
     * Honour a user's Clear or × dismissal for every generated notification,
     * not only replaceLive rows. The exact current fingerprint stays hidden;
     * a materially changed state can still create a fresh notification.
     */
    if (
      !item.metadata?.dismissalBypass
      && isDismissed(
        String(item.source || ''),
        item.fingerprint
      )
    ) {
      return null;
    }

    const deliveryMode =
      deliveryModeFor(item);

    if (deliveryMode === 'off') {
      return null;
    }

    let rows = cleanStore();

    if (deliveryMode === 'digest') {
      rows = upsertDigestRow(rows, item);
      if (!writeStore(rows, 'digest-add')) {
        return null;
      }

      return rows.find(
        row =>
          row?.metadata?.digestCard
          && row?.metadata?.notificationGroup
            === item.metadata.notificationGroup
      ) || null;
    }

    const duplicate = rows.find(row => {
      if (
        item.dedupeKey
        && row.dedupeKey === item.dedupeKey
        && row.fingerprint === item.fingerprint
      ) {
        return true;
      }

      if (
        STORAGE_SOURCE_KEYS.has(
          String(item.source || '')
        )
        && String(row.source || '')
          === String(item.source || '')
        && String(row.title || '')
          === item.title
        && String(row.message || '')
          === item.message
        && String(row.page || '')
          === item.page
      ) {
        return true;
      }

      return !item.dedupeKey
        && row.fingerprint === item.fingerprint
        && now() - Number(
          row.createdAt || 0
        ) < 60000;
    });

    if (duplicate) return duplicate;

    const replaceExisting = Boolean(
      item.metadata?.replaceExisting
      || STORAGE_SOURCE_KEYS.has(
        String(item.source || '')
      )
    );

    if (replaceExisting && item.dedupeKey) {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (
          String(rows[index]?.dedupeKey || '')
          === item.dedupeKey
        ) {
          rows.splice(index, 1);
        }
      }
    }

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

    if (!value) return false;

    const rows = cleanStore(readStore());
    const row = rows.find(
      item => String(item.id || '') === value
    );

    /*
     * Removing a generated notification must dismiss its current
     * fingerprint as well as deleting the visible card. Otherwise the
     * storage watcher or transfer lifecycle synchroniser can recreate the
     * same card moments later.
     */
    const dismissalSource = row
      ? (
          liveSourceForRow(row)
          || String(row.source || '').trim()
        )
      : '';

    if (
      dismissalSource
      && row?.fingerprint
    ) {
      dismissFingerprint(
        dismissalSource,
        row.fingerprint,
        30
      );
    }

    return writeStore(
      rows.filter(item => String(item.id || '') !== value),
      'remove'
    );
  }

  function liveSourceForRow(row) {
    const metadataSource =
      String(
        row?.metadata?.liveSource || ""
      ).trim();

    if(metadataSource){
      return metadataSource;
    }

    const source =
      String(row?.source || "");

    if(source.startsWith("live:")){
      return source.slice(5);
    }

    const dedupeKey =
      String(row?.dedupeKey || "");

    if(dedupeKey.startsWith("manager-live:")){
      return "manager-dashboard-alerts";
    }

    return "";
  }

  function clear() {
    try {
      cleanStore(readStore()).forEach(row => {
        /*
         * Clear means dismiss the current generated state, not merely empty
         * the visible list. Store the exact source + fingerprint so the same
         * transfer lifecycle or intelligence state cannot immediately return.
         * A genuinely changed state receives a new fingerprint and may notify.
         */
        const dismissalSource =
          liveSourceForRow(row)
          || String(row?.source || '').trim();

        if (
          dismissalSource
          && row?.fingerprint
        ) {
          dismissFingerprint(
            dismissalSource,
            row.fingerprint,
            30
          );
        }
      });

      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(READ_KEY);
      localStorage.removeItem(DIGEST_KEY);

      if(dashboardBridge?.list){
        dashboardBridge.list.innerHTML =
          '<div class="beast-empty">No notifications right now.</div>';
      }

      if(dashboardBridge?.badge){
        dashboardBridge.badge.textContent = "0";
        dashboardBridge.badge.hidden = true;
      }

      publishChange('clear');
      return true;
    } catch (_) {
      return false;
    }
  }

  function replaceLive(source, items = []) {
    const liveSource = String(source || '').trim();

    if (!liveSource) return false;

    const currentRows = cleanStore(readStore());
    const existing = new Map(
      currentRows
        .filter(
          row =>
            String(row?.metadata?.liveSource || '')
            === liveSource
        )
        .map(row => [String(row.fingerprint || ''), row])
    );

    let nextRows = currentRows.filter(
      row =>
        String(row?.metadata?.liveSource || '')
        !== liveSource
    );

    (Array.isArray(items) ? items : []).forEach(input => {
      const provisional = normaliseNotification({
        ...input,
        source: `live:${liveSource}`,
        ttlDays:
          Number.isFinite(Number(input?.ttlDays))
            ? Number(input.ttlDays)
            : 2,
        metadata: {
          ...(input?.metadata || {}),
          liveSource
        }
      });

      provisional.metadata = {
        ...(provisional.metadata || {}),
        notificationGroup:
          notificationGroupFor(provisional)
      };

      const deliveryMode =
        deliveryModeFor(provisional);

      if (deliveryMode === 'off') {
        return;
      }

      if (deliveryMode === 'digest') {
        nextRows = upsertDigestRow(
          nextRows,
          provisional
        );
        return;
      }

      if (
        isDismissed(
          liveSource,
          provisional.fingerprint
        )
      ) {
        return;
      }

      const previous =
        existing.get(provisional.fingerprint);

      nextRows.push({
        ...provisional,
        id: previous?.id || provisional.id,
        createdAt:
          Number(previous?.createdAt)
          || provisional.createdAt,
        expiresAt:
          Number(previous?.expiresAt)
          || provisional.expiresAt
      });
    });

    return writeStore(nextRows, 'replace-live');
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
    window.AuroraNotificationsShellUI
      ?.render?.();
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

  function richNotificationData(row) {
    let rich =
      row?.metadata?.rich
      && typeof row.metadata.rich === "object"
        ? row.metadata.rich
        : null;

    /*
     * Upgrade older stored notifications that were created before
     * rich metadata existed.
     */
    if (!rich) {
      const title =
        String(row?.title || "").toLowerCase();

      const message =
        String(row?.message || "");

      const percentMatch =
        message.match(/[-+]?\d+(?:\.\d+)?%/);

      const cashMatch =
        message.match(/£[\d,]+(?:\.\d+)?/);

      if (/top performer|best performer/.test(title)) {
        rich = {
          type:"performer",
          kicker:"TODAY'S TOP PERFORMER",
          badge:"TOP FORM",
          value:percentMatch?.[0] || "",
          valueLabel:percentMatch ? "TODAY" : "",
          featured:true,
          actionText:"Open Analysis Room"
        };
      } else if (
        /transfer|deal sheet|broker funding|mission handoff/.test(title)
      ) {
        rich = {
          type:"transfer",
          kicker:"TRANSFER CENTRE",
          badge:"ACTION UPDATE",
          value:cashMatch?.[0] || "",
          valueLabel:cashMatch ? "VALUE" : "",
          actionText:"Open Transfer Centre"
        };
      } else if (
        /hit its target|target zone|target reached/.test(title)
      ) {
        rich = {
          type:"target",
          kicker:"TARGET HIT",
          badge:"IN THE ZONE",
          value:percentMatch?.[0] || "",
          valueLabel:percentMatch ? "MOVE" : "",
          progress:100,
          actionText:"Review Holding"
        };
      } else if (/dividend|income is next/.test(title)) {
        rich = {
          type:"income",
          kicker:"NEXT INCOME",
          badge:"UPCOMING",
          value:cashMatch?.[0] || "",
          valueLabel:cashMatch ? "DIVIDEND" : "",
          actionText:"Open Finance"
        };
      } else if (/milestone|objective achieved/.test(title)) {
        rich = {
          type:"milestone",
          kicker:"MILESTONE ACHIEVED",
          badge:"PROMOTED",
          value:cashMatch?.[0] || "",
          valueLabel:cashMatch ? "INCOME" : "",
          actionText:"Open Finance"
        };
      }
    }

    if (!rich) return null;

    const progress = Number(rich.progress);

    return {
      type: String(rich.type || "update")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, ""),
      kicker: String(
        rich.kicker || row.department || "Aurora Update"
      ),
      badge: String(rich.badge || ""),
      value: String(rich.value || ""),
      valueLabel: String(rich.valueLabel || ""),
      secondary: String(rich.secondary || ""),
      progress: Number.isFinite(progress)
        ? Math.max(0, Math.min(100, progress))
        : null,
      featured: Boolean(rich.featured),
      actionText: String(
        rich.actionText
        || row.actionLabel
        || `Open ${row.department}`
      )
    };
  }

  function dashboardMarkup(rows) {
    if (!rows.length) {
      return '<div class="beast-empty">No notifications right now.</div>';
    }

    const categoryRank = row => {
      const category = String(
        row?.metadata?.category || ''
      ).toLowerCase();

      if (
        category === 'critical'
        || row?.priority === 'critical'
      ) {
        return 4;
      }

      if (
        category === 'action'
        || row?.priority === 'high'
      ) {
        return 3;
      }

      if (category === 'achievement') {
        return 2;
      }

      if (category === 'information') {
        return 1;
      }

      return 0;
    };

    const ordered = rows.slice().sort((a, b) => {
      const ar = richNotificationData(a);
      const br = richNotificationData(b);

      return (
        Number(Boolean(br?.featured))
        - Number(Boolean(ar?.featured))
      ) || (
        categoryRank(b)
        - categoryRank(a)
      ) || (
        Number(b.createdAt || 0)
        - Number(a.createdAt || 0)
      );
    });

    return ordered.map(row => {
      const levelClass =
        row.priority === 'critical'
          ? ' bad'
          : row.priority === 'high'
            ? ' warn'
            : '';

      const unreadClass =
        row.read ? '' : ' aurora-shared-unread';

      const href = row.page
        ? ` href="${escapeHtml(row.page)}"`
        : '';

      const rich = richNotificationData(row);

      if (rich) {
        const badge = rich.badge
          ? `<span class="aurora-rich-badge">${escapeHtml(rich.badge)}</span>`
          : "";

        const value = rich.value
          ? `<span class="aurora-rich-value"><strong>${escapeHtml(rich.value)}</strong><small>${escapeHtml(rich.valueLabel)}</small></span>`
          : "";

        const progress = rich.progress === null
          ? ""
          : `<div class="aurora-rich-progress"><i style="width:${rich.progress}%"></i></div>`;

        const secondary = rich.secondary
          ? `<span class="aurora-rich-secondary">${escapeHtml(rich.secondary)}</span>`
          : "";

        return `
          <article
            class="beast-alert aurora-shared-alert aurora-rich-card aurora-rich-${escapeHtml(rich.type)}${rich.featured ? " aurora-rich-featured" : ""}${levelClass}${unreadClass}"
            data-aurora-notification-id="${escapeHtml(row.id)}"
          >
            <a
              class="aurora-shared-alert-open aurora-rich-open"
              data-aurora-notification-open="${escapeHtml(row.id)}"
              ${href}
            >
              <span class="aurora-rich-topline">
                <small>${escapeHtml(rich.kicker)}</small>
                ${badge}
              </span>

              <span class="aurora-rich-main">
                <span class="beast-alert-icon aurora-rich-icon">${escapeHtml(row.icon)}</span>

                <span class="aurora-shared-alert-copy aurora-rich-copy">
                  <strong>${escapeHtml(row.title)}</strong>
                  <p>${escapeHtml(row.message || row.department)}</p>
                </span>

                ${value}
              </span>

              ${progress}

              <span class="aurora-rich-footer">
                <span>
                  <small class="aurora-shared-department">${escapeHtml(row.department)}</small>
                  ${secondary}
                </span>

                <span class="aurora-rich-action">
                  ${escapeHtml(rich.actionText)}
                  <b>→</b>
                </span>

                <time>${escapeHtml(formatTime(row.createdAt))}</time>
              </span>
            </a>

            <button
              class="aurora-shared-remove"
              data-aurora-notification-remove="${escapeHtml(row.id)}"
              type="button"
              aria-label="Remove ${escapeHtml(row.title)}"
            >×</button>
          </article>`;
      }

      return `
        <div
          class="beast-alert aurora-shared-alert${levelClass}${unreadClass}"
          data-aurora-notification-id="${escapeHtml(row.id)}"
        >
          <a
            class="aurora-shared-alert-open"
            data-aurora-notification-open="${escapeHtml(row.id)}"
            ${href}
          >
            <span class="beast-alert-icon">${escapeHtml(row.icon)}</span>
            <span class="aurora-shared-alert-copy">
              <strong>${escapeHtml(row.title)}</strong>
              <p>${escapeHtml(row.message || row.department)}</p>
              <small class="aurora-shared-department">${escapeHtml(row.department)}</small>
            </span>
            <span class="beast-alert-time">${escapeHtml(formatTime(row.createdAt))}</span>
          </a>

          <button
            class="aurora-shared-remove"
            data-aurora-notification-remove="${escapeHtml(row.id)}"
            type="button"
            aria-label="Remove ${escapeHtml(row.title)}"
          >×</button>
        </div>`;
    }).join('');
  }

  function injectDashboardStyles(documentObject = document) {
    if (!documentObject) {
      return;
    }

    const existingStyle =
      documentObject.getElementById(
        'auroraSharedNotificationStyles'
      );

    if (
      existingStyle
      && existingStyle.dataset.version === VERSION
    ) {
      return;
    }

    if (existingStyle) {
      existingStyle.remove();
    }

    const style =
      documentObject.createElement('style');

    style.id = 'auroraSharedNotificationStyles';
    style.dataset.version = VERSION;
    style.textContent = `
      #beastNotificationPanel>.beast-panel-head{
        position:sticky;
        top:-16px;
        z-index:8;
        margin:-16px -16px 0;
        padding:16px 16px 12px;
        background:linear-gradient(
          180deg,
          rgba(7,20,40,.995),
          rgba(7,20,40,.97)
        );
        border-bottom:1px solid rgba(148,163,184,.10)
      }

      #beastAlertList[hidden]{
        display:none!important
      }

      .aurora-shared-notification-section{
        margin-top:0;
        padding-top:0
      }

      .aurora-shared-notification-head{
        position:sticky;
        top:58px;
        z-index:7;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin:0 -16px 9px;
        padding:10px 16px;
        background:linear-gradient(
          180deg,
          rgba(5,17,35,.99),
          rgba(5,17,35,.96)
        );
        border-bottom:1px solid rgba(148,163,184,.10);
        box-shadow:0 8px 20px rgba(0,0,0,.18)
      }

      .aurora-shared-notification-head strong{
        font-size:12px;
        color:#e5eefc
      }

      .aurora-shared-notification-head span{
        display:block;
        margin-top:2px;
        color:#8495ad;
        font-size:9px
      }

      .aurora-shared-notification-actions{
        display:flex;
        align-items:center;
        gap:6px;
        flex-wrap:wrap;
        justify-content:flex-end
      }

      .aurora-shared-mark-read,
      .aurora-shared-clear-all{
        border:1px solid rgba(96,165,250,.22);
        border-radius:999px;
        background:rgba(30,64,175,.12);
        color:#bfdbfe;
        padding:6px 8px;
        font-size:8px;
        font-weight:900;
        cursor:pointer
      }

      .aurora-shared-clear-all{
        border-color:rgba(248,113,113,.24);
        background:rgba(127,29,29,.16);
        color:#fecaca
      }

      .aurora-shared-alert-list{
        display:grid;
        gap:8px
      }

      #beastNotificationPanel{
        width:min(520px,calc(100vw - 36px))!important;
      }

      .aurora-shared-alert{
        position:relative!important;
        display:block!important;
        grid-template-columns:none!important;
        width:100%!important;
        min-width:0!important;
        padding:0!important;
        overflow:hidden!important
      }

      .aurora-shared-alert-open{
        box-sizing:border-box!important;
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:start;
        gap:10px;
        width:100%!important;
        min-width:0!important;
        padding:12px 38px 12px 12px;
        color:inherit;
        text-decoration:none;
        cursor:pointer
      }

      .aurora-shared-alert-copy{
        min-width:0
      }

      #beastNotificationPanel
      .aurora-shared-remove{
        -webkit-appearance:none!important;
        appearance:none!important;
        box-sizing:border-box!important;
        position:absolute!important;
        z-index:6!important;
        top:8px!important;
        right:8px!important;
        left:auto!important;
        bottom:auto!important;
        width:24px!important;
        min-width:24px!important;
        max-width:24px!important;
        height:24px!important;
        min-height:24px!important;
        max-height:24px!important;
        margin:0!important;
        padding:0!important;
        display:grid!important;
        place-items:center!important;
        border:1px solid rgba(248,113,113,.25)!important;
        border-radius:50%!important;
        background:rgba(127,29,29,.24)!important;
        color:#fecaca!important;
        box-shadow:none!important;
        font-size:15px!important;
        font-weight:800!important;
        line-height:1!important;
        letter-spacing:0!important;
        text-transform:none!important;
        cursor:pointer!important;
        flex:0 0 24px!important
      }

      #beastNotificationPanel
      .aurora-shared-remove:hover,
      #beastNotificationPanel
      .aurora-shared-remove:focus-visible{
        border-color:rgba(248,113,113,.55)!important;
        background:rgba(127,29,29,.42)!important;
        outline:none!important
      }

      .aurora-shared-alert-list .aurora-shared-unread{
        border-color:rgba(34,211,238,.30);
        background:rgba(8,47,73,.28);
        box-shadow:inset 3px 0 0 #22d3ee
      }

      .aurora-shared-department{
        display:block;
        margin-top:5px;
        color:#7dd3fc;
        font-size:8px;
        font-weight:900;
        letter-spacing:.07em;
        text-transform:uppercase
      }

      .aurora-rich-card{
        --rich-accent:34,211,238;
        --rich-solid:#22d3ee;
        border-color:rgba(var(--rich-accent),.28)!important;
        background:
          radial-gradient(
            circle at 100% 0%,
            rgba(var(--rich-accent),.18),
            transparent 42%
          ),
          linear-gradient(
            145deg,
            rgba(8,18,38,.98),
            rgba(4,10,24,.99)
          )!important;
        box-shadow:
          inset 3px 0 0 rgba(var(--rich-accent),.76),
          0 14px 30px rgba(0,0,0,.22);
      }

      .aurora-rich-featured{
        min-height:158px;
        border-color:rgba(var(--rich-accent),.45)!important;
        box-shadow:
          inset 4px 0 0 var(--rich-solid),
          0 20px 44px rgba(0,0,0,.30),
          0 0 28px rgba(var(--rich-accent),.10);
      }

      .aurora-rich-performer{
        --rich-accent:52,211,153;
        --rich-solid:#34d399;
      }

      .aurora-rich-transfer{
        --rich-accent:245,158,11;
        --rich-solid:#f59e0b;
      }

      .aurora-rich-target,
      .aurora-rich-milestone{
        --rich-accent:250,204,21;
        --rich-solid:#facc15;
      }

      .aurora-rich-income{
        --rich-accent:96,165,250;
        --rich-solid:#60a5fa;
      }

      .aurora-rich-open{
        box-sizing:border-box!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        gap:10px!important;
        width:100%!important;
        min-width:0!important;
        padding:14px 42px 14px 14px!important;
      }

      .aurora-rich-card>*{
        min-width:0
      }

      .aurora-rich-card
      .aurora-rich-main{
        display:grid!important;
        grid-template-columns:44px minmax(0,1fr) auto!important;
        align-items:start!important
      }

      .aurora-rich-card
      .aurora-rich-copy{
        width:auto!important;
        min-width:0!important
      }

      .aurora-rich-card
      .aurora-rich-copy>strong,
      .aurora-rich-card
      .aurora-rich-copy>p{
        overflow-wrap:anywhere;
        word-break:normal
      }

      .aurora-rich-topline,
      .aurora-rich-main,
      .aurora-rich-footer{
        display:flex;
        align-items:center;
        gap:10px;
        width:100%;
      }

      .aurora-rich-topline{
        justify-content:space-between;
      }

      .aurora-rich-topline>small{
        color:rgb(var(--rich-accent));
        font-size:8px;
        font-weight:1000;
        letter-spacing:.14em;
        text-transform:uppercase;
      }

      .aurora-rich-badge{
        padding:5px 8px;
        border:1px solid rgba(var(--rich-accent),.30);
        border-radius:999px;
        color:rgb(var(--rich-accent));
        background:rgba(var(--rich-accent),.10);
        font-size:7px;
        font-weight:1000;
        letter-spacing:.09em;
        text-transform:uppercase;
      }

      .aurora-rich-main{
        align-items:flex-start;
      }

      .aurora-rich-icon{
        width:44px!important;
        height:44px!important;
        flex:0 0 44px;
        background:rgba(var(--rich-accent),.12)!important;
        border-color:rgba(var(--rich-accent),.25)!important;
        font-size:20px!important;
      }

      .aurora-rich-copy{
        flex:1 1 auto;
        min-width:0;
      }

      .aurora-rich-copy>strong{
        display:block;
        color:#f8fbff;
        font-size:13px!important;
        line-height:1.25;
      }

      .aurora-rich-copy>p{
        margin-top:4px!important;
        color:#98a9bf!important;
        font-size:9px!important;
        line-height:1.45!important;
      }

      .aurora-rich-value{
        flex:0 0 auto;
        min-width:70px;
        text-align:right;
      }

      .aurora-rich-value strong{
        display:block;
        color:rgb(var(--rich-accent));
        font-size:19px;
        line-height:1;
        white-space:nowrap;
      }

      .aurora-rich-value small{
        display:block;
        margin-top:5px;
        color:#8193aa;
        font-size:7px;
        font-weight:950;
        letter-spacing:.10em;
        text-transform:uppercase;
      }

      .aurora-rich-progress{
        width:100%;
        height:5px;
        overflow:hidden;
        border-radius:999px;
        background:rgba(148,163,184,.13);
      }

      .aurora-rich-progress i{
        display:block;
        height:100%;
        border-radius:inherit;
        background:linear-gradient(
          90deg,
          rgba(var(--rich-accent),.70),
          var(--rich-solid)
        );
      }

      .aurora-rich-footer{
        justify-content:space-between;
        color:#8294aa;
        font-size:8px;
      }

      .aurora-rich-footer
      .aurora-shared-department{
        margin:0;
        color:rgb(var(--rich-accent));
      }

      .aurora-rich-secondary{
        display:block;
        margin-top:3px;
        color:#93a4bb;
      }

      .aurora-rich-action{
        display:inline-flex;
        align-items:center;
        gap:6px;
        margin-left:auto;
        padding:6px 8px;
        border:1px solid rgba(var(--rich-accent),.20);
        border-radius:9px;
        color:#dcecff;
        background:rgba(var(--rich-accent),.07);
        font-weight:900;
        white-space:nowrap;
      }

      .aurora-rich-action b{
        color:rgb(var(--rich-accent));
      }

      .aurora-rich-footer time{
        min-width:36px;
        text-align:right;
      }

      @media(max-width:760px){
        #beastNotificationPanel{
          width:calc(100vw - 20px)!important;
        }
      }

      @media(max-width:560px){
        .aurora-rich-card
        .aurora-rich-main{
          grid-template-columns:40px minmax(0,1fr)!important;
        }

        .aurora-rich-card
        .aurora-rich-value{
          grid-column:2;
          margin-top:2px;
          text-align:left;
        }

        .aurora-rich-footer{
          flex-wrap:wrap;
        }

        .aurora-rich-action{
          order:3;
          width:100%;
          justify-content:center;
        }
      }
    `;

    documentObject.head?.appendChild(style);
  }

  function attachManagerDashboard(
    documentObject = document
  ) {
    if (!documentObject) return false;

    const panel =
      documentObject.getElementById(
        'beastNotificationPanel'
      );

    const nativeList =
      documentObject.getElementById(
        'beastAlertList'
      );

    const badge =
      documentObject.getElementById(
        'beastNotificationCount'
      );

    if (!panel || !nativeList || !badge) {
      return false;
    }

    injectDashboardStyles(documentObject);

    let section =
      documentObject.getElementById(
        'auroraSharedNotificationSection'
      );

    if (!section) {
      section =
        documentObject.createElement('section');

      section.id =
        'auroraSharedNotificationSection';

      section.className =
        'aurora-shared-notification-section';

      section.innerHTML = `
        <div class="aurora-shared-notification-head">
          <div>
            <strong>Aurora Notifications</strong>
            <span>Live dashboard alerts and shared department updates.</span>
          </div>
          <div class="aurora-shared-notification-actions">
            <button
              class="aurora-shared-mark-read"
              id="auroraSharedMarkRead"
              type="button"
            >Mark all read</button>
            <button
              class="aurora-shared-clear-all"
              id="auroraSharedClearAll"
              type="button"
            >Clear all</button>
          </div>
        </div>
        <div
          class="aurora-shared-alert-list"
          id="auroraSharedAlertList"
        ></div>`;

      const panelHead =
        panel.querySelector('.beast-panel-head');

      if (panelHead) {
        panelHead.insertAdjacentElement(
          'afterend',
          section
        );
      } else {
        nativeList.insertAdjacentElement(
          'beforebegin',
          section
        );
      }
    }

    nativeList.hidden = true;
    nativeList.setAttribute(
      'aria-hidden',
      'true'
    );

    dashboardBridge = {
      documentObject,
      panel,
      badge,
      list:
        documentObject.getElementById(
          'auroraSharedAlertList'
        ),
      expectedTotal:null
    };

    /*
     * Bind at panel level so controls work whether they are placed
     * directly in the Command Notifications header or injected later.
     */
    if (!panel.dataset.auroraControlsBound) {
      panel.dataset.auroraControlsBound = '1';

      panel.addEventListener('click', event => {
        const removeButton =
          event.target.closest(
            '[data-aurora-notification-remove]'
          );

        if (removeButton) {
          event.preventDefault();
          event.stopPropagation();

          remove(
            removeButton.dataset
              .auroraNotificationRemove
          );
          return;
        }

        const markAll =
          event.target.closest(
            '#auroraSharedMarkRead'
          );

        if (markAll) {
          event.preventDefault();
          event.stopPropagation();

          markAllRead();

          const original =
            markAll.dataset.originalLabel
            || markAll.textContent
            || 'Mark all read';

          markAll.dataset.originalLabel = original;
          markAll.textContent = 'All read';

          window.setTimeout(() => {
            markAll.textContent = original;
          }, 1300);

          return;
        }

        const clearAll =
          event.target.closest(
            '#auroraSharedClearAll'
          );

        if (clearAll) {
          event.preventDefault();
          event.stopPropagation();

          clear();

          const original =
            clearAll.dataset.originalLabel
            || clearAll.textContent
            || 'Clear all';

          clearAll.dataset.originalLabel = original;
          clearAll.textContent = 'Cleared';

          window.setTimeout(() => {
            clearAll.textContent = original;
          }, 1300);

          return;
        }

        const alert =
          event.target.closest(
            '[data-aurora-notification-open]'
          );

        if (alert) {
          markRead(
            alert.dataset
              .auroraNotificationOpen
          );
        }
      });
    }

    const notificationButton =
      documentObject.getElementById(
        'beastNotificationButton'
      );

    if (
      notificationButton
      && !notificationButton.dataset
        .auroraScrollReset
    ) {
      notificationButton.dataset
        .auroraScrollReset = '1';

      notificationButton.addEventListener(
        'click',
        () => {
          window.setTimeout(() => {
            if (panel.classList.contains('open')) {
              panel.scrollTop = 0;
            }
          }, 0);
        }
      );
    }

    renderDashboardBridge();
    return true;
  }

  function renderDashboardBridge() {
    if (!dashboardBridge) return;

    if (
      !dashboardBridge.documentObject
      || !dashboardBridge.documentObject.defaultView
      || !dashboardBridge.panel?.isConnected
      || !dashboardBridge.list?.isConnected
    ) {
      dashboardBridge = null;
      return;
    }
    const rows = list({ limit: 24 });
    if (dashboardBridge.list) dashboardBridge.list.innerHTML = dashboardMarkup(rows);

    const sharedUnread = unreadCount();
    dashboardBridge.expectedTotal = sharedUnread;
    dashboardBridge.badge.textContent = String(sharedUnread);
    dashboardBridge.badge.hidden = sharedUnread === 0;
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


  function describeFinancePlanner(value) {
    const data = parseStored(value);

    if (!data || typeof data !== 'object') {
      return 'The Finance planner has been updated.';
    }

    const bills = Array.isArray(data.scheduledBills)
      ? data.scheduledBills
      : [];

    const completed = bills.filter(item => {
      const status = String(item?.status || '').toLowerCase();
      return Boolean(
        item?.archived
        || item?.completed
        || item?.paid
        || /paid|complete|archived/.test(status)
      );
    }).length;

    const due = bills.filter(item => {
      const status = String(item?.status || '').toLowerCase();
      return !item?.archived
        && !item?.completed
        && !item?.paid
        && !/paid|complete|archived/.test(status);
    }).length;

    const holdingBalance = firstFinite(
      data.holdingBalance,
      data.currentHoldingPot,
      data.balance
    );

    const parts = ['The Finance planner has been saved.'];

    if (completed || due) {
      parts.push(`${completed} completed and ${due} still due.`);
    }

    if (Number.isFinite(holdingBalance)) {
      parts.push(`Holding Pot ${formatCash(holdingBalance)}.`);
    }

    return parts.join(' ');
  }

  function describeCollection(value, label) {
    const data = parseStored(value);

    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.registrations)
            ? data.registrations
            : [];

    if (rows.length) {
      return `${label} now contains ${rows.length} item${rows.length === 1 ? '' : 's'}.`;
    }

    return `${label} has been updated.`;
  }

  function finiteOrNull(value) {
    const number = firstFinite(value);
    return Number.isFinite(number)
      ? Number(number)
      : null;
  }

  function normalStatus(value) {
    return String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function billIsComplete(item) {
    const status = String(
      item?.status || ''
    ).toLowerCase();

    return Boolean(
      item?.archived
      || item?.completed
      || item?.paid
      || /paid|complete|archived/.test(status)
    );
  }

  function billAmount(item) {
    return firstFinite(
      item?.amount,
      item?.cost,
      item?.value,
      item?.billAmount,
      item?.bill_amount,
      item?.expectedAmount,
      item?.expected_amount
    );
  }

  function financePlannerSummary(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const bills = Array.isArray(data.scheduledBills)
      ? data.scheduledBills
      : [];

    let completed = 0;
    let due = 0;
    let completedValue = 0;
    let dueValue = 0;

    bills.forEach(item => {
      const amount = billAmount(item);

      if (billIsComplete(item)) {
        completed += 1;
        if (Number.isFinite(amount)) {
          completedValue += amount;
        }
      } else {
        due += 1;
        if (Number.isFinite(amount)) {
          dueValue += amount;
        }
      }
    });

    const holdingBalance = finiteOrNull(
      firstFinite(
        data.holdingBalance,
        data.currentHoldingPot,
        data.balance,
        data.availableBalance
      )
    );

    return {
      completed,
      due,
      completedValue:
        Number(completedValue.toFixed(2)),
      dueValue:
        Number(dueValue.toFixed(2)),
      holdingBalance,
      billCount:bills.length
    };
  }

  function transferPlanSummary(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const rows = Array.isArray(data.rows)
      ? data.rows
      : Array.isArray(data.allocations)
        ? data.allocations
        : [];

    const tickers = rows
      .map(row =>
        row?.displayTicker
        || row?.ticker
        || row?.symbol
      )
      .filter(Boolean)
      .map(value => String(value).toUpperCase());

    const total = finiteOrNull(
      firstFinite(
        data.total,
        data.totalBudget,
        data.budget,
        data.totalInvestment,
        data.investmentTotal
      )
    );

    const income = finiteOrNull(
      firstFinite(
        data.totalIncome,
        data.annualIncome,
        data.estimatedIncome,
        data.projectedIncome
      )
    );

    return {
      count:rows.length,
      tickers,
      total,
      income,
      status:normalStatus(
        data.status
        || data.stage
        || data.state
      )
    };
  }

  function fundingRouteSummary(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const ig = finiteOrNull(
      firstFinite(
        data.ig,
        data.igIsa,
        data.igISA,
        data.igAmount,
        data.ig_amount,
        data.igTotal,
        data.ig_total,
        data?.brokers?.ig,
        data?.route?.ig
      )
    );

    const trading212 = finiteOrNull(
      firstFinite(
        data.trading212,
        data.trade212,
        data.t212,
        data.trading212Amount,
        data.trading_212_amount,
        data.t212Amount,
        data.t212_amount,
        data?.brokers?.trading212,
        data?.brokers?.t212,
        data?.route?.trading212,
        data?.route?.t212
      )
    );

    let total = finiteOrNull(
      firstFinite(
        data.total,
        data.amount,
        data.value,
        data.totalFunding,
        data.total_funding,
        data.invested
      )
    );

    if (
      (!Number.isFinite(total) || total <= 0)
      && (
        Number.isFinite(ig)
        || Number.isFinite(trading212)
      )
    ) {
      total =
        (Number.isFinite(ig) ? ig : 0)
        + (Number.isFinite(trading212) ? trading212 : 0);
    }

    return {
      status:normalStatus(
        data.status
        || data.stage
        || data.state
        || data.routeStatus
      ),
      total,
      ig,
      trading212
    };
  }

  function semanticObject(value) {
    if (Array.isArray(value)) {
      return value.map(semanticObject);
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const output = {};

    Object.keys(value)
      .sort()
      .forEach(key => {
        if (
          /^(saved|updated|generated|created|modified|last).*?(at|time|date)?$/i.test(key)
          || /^(revision|timestamp|savedIso|savedAt)$/i.test(key)
          || key === '_persistence'
        ) {
          return;
        }

        output[key] = semanticObject(value[key]);
      });

    return output;
  }

  function snapshotForRule(rule, rawValue) {
    const data = parseStored(rawValue);

    if (rule.key === 'aurora_wealth_centre') {
      return financePlannerSummary(data);
    }

    if (rule.key === 'aurora_transfer_plan_v2') {
      return transferPlanSummary(data);
    }

    if (
      rule.key
      === 'aurora_account_transfer_instruction_v1'
    ) {
      return fundingRouteSummary(data);
    }

    return semanticObject(data);
  }

  function numbersDiffer(a, b, tolerance = 0.005) {
    if (
      !Number.isFinite(Number(a))
      && !Number.isFinite(Number(b))
    ) {
      return false;
    }

    if (
      !Number.isFinite(Number(a))
      || !Number.isFinite(Number(b))
    ) {
      return true;
    }

    return Math.abs(Number(a) - Number(b))
      > tolerance;
  }

  function moneyArrow(previous, current) {
    if (
      !Number.isFinite(Number(previous))
      || !Number.isFinite(Number(current))
    ) {
      return '';
    }

    return `${formatCash(previous)} → ${formatCash(current)}`;
  }


  const TRANSFER_LIFECYCLE_KEYS = new Set([
    'aurora_transfer_plan_v2',
    'aurora_m7_manager_approval',
    'aurora_investment_handoff_completion_v1',
    'aurora_account_transfer_instruction_v1',
    'aurora_payday_execution_v1',
    'aurora_transfer_centre_receipt_v1',
    'aurora_m3_last_transfer_receipt_v1',
    'aurora_registration_last_v1',
    'aurora_pending_registrations_v1',
    'aurora_m4_signing_lifecycle_v1'
  ]);

  function objectText(value) {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }

  function positiveState(value, pattern) {
    if (!value) return false;

    if (
      value === true
      || value?.completed === true
      || value?.approved === true
      || value?.registered === true
      || value?.executed === true
      || value?.transferred === true
      || value?.completedAt
      || value?.approvedAt
      || value?.registeredAt
      || value?.executedAt
      || value?.transferredAt
    ) {
      return true;
    }

    const text =
      typeof value === 'string'
        ? value
        : [
            value?.status,
            value?.state,
            value?.stage,
            value?.action,
            value?.result,
            value?.label,
            value?.message,
            value?.notes
          ].filter(Boolean).join(' ');

    return pattern.test(
      String(text || '').toLowerCase()
    );
  }

  function registrationCount(value) {
    if (Array.isArray(value)) return value.length;

    const rows = Array.isArray(value?.rows)
      ? value.rows
      : Array.isArray(value?.items)
        ? value.items
        : Array.isArray(value?.registrations)
          ? value.registrations
          : [];

    return rows.length;
  }

  function transferLifecycleSnapshot() {
    const stored = key => {
      try {
        return parseStored(
          localStorage.getItem(key)
        );
      } catch (_) {
        return null;
      }
    };

    const plan = stored(
      'aurora_transfer_plan_v2'
    );

    const planSummary =
      transferPlanSummary(plan);

    const approval = stored(
      'aurora_m7_manager_approval'
    );

    const handoff = stored(
      'aurora_investment_handoff_completion_v1'
    );

    const funding = stored(
      'aurora_account_transfer_instruction_v1'
    );

    const payday = stored(
      'aurora_payday_execution_v1'
    );

    const receipt = stored(
      'aurora_transfer_centre_receipt_v1'
    );

    const latestReceipt = stored(
      'aurora_m3_last_transfer_receipt_v1'
    );

    const registration = stored(
      'aurora_registration_last_v1'
    );

    const pending = stored(
      'aurora_pending_registrations_v1'
    );

    const lifecycle = stored(
      'aurora_m4_signing_lifecycle_v1'
    );

    const lifecycleStage =
      Number(lifecycle?.stage || 0);

    const routePrepared = Boolean(
      planSummary?.count
      || lifecycleStage >= 1
    );

    const managerApproved = Boolean(
      positiveState(
        approval,
        /approved|accepted|confirmed|authorised|authorized|yes/
      )
    );

    const cashTransferred = Boolean(
      positiveState(
        handoff,
        /handoff complete|completed|cash moved|funds ready|transferred/
      )
      || positiveState(
        funding,
        /cash moved|funds transferred|transfer complete|completed/
      )
      || lifecycleStage >= 3
    );

    const purchaseExecuted = Boolean(
      positiveState(
        payday,
        /purchase complete|purchased|executed|broker fill|completed/
      )
      || positiveState(
        receipt,
        /purchase complete|purchased|executed|broker fill|completed/
      )
      || positiveState(
        latestReceipt,
        /purchase complete|purchased|executed|broker fill|completed/
      )
      || lifecycleStage >= 3
    );

    const registered = Boolean(
      positiveState(
        registration,
        /registered|registration complete|confirmed|completed/
      )
      || (
        registration
        && (
          registration.at
          || registration.registeredAt
          || registration.completedAt
          || registration.ticker
        )
      )
      || lifecycleStage >= 4
    );

    const pendingCount =
      registrationCount(pending);

    const stage =
      registered
        ? 5
        : purchaseExecuted
          ? 4
          : cashTransferred
            ? 3
            : managerApproved
              ? 2
              : routePrepared
                ? 1
                : 0;

    const tickers =
      planSummary?.tickers || [];

    const labels = [
      'Route prepared',
      'Manager approved',
      'Cash transferred',
      'Purchase executed',
      'Registration complete'
    ];

    const nextActions = [
      'Prepare the Transfer Centre route',
      'Approve the transfer route',
      'Move the authorised broker cash',
      'Execute the broker purchases',
      'Register the completed purchases',
      'Transfer lifecycle complete'
    ];

    return {
      stage,
      labels,
      nextAction:nextActions[stage],
      tickers,
      count:planSummary?.count || 0,
      total:planSummary?.total,
      income:planSummary?.income,
      pendingCount,
      routePrepared,
      managerApproved,
      cashTransferred,
      purchaseExecuted,
      registered
    };
  }

  function syncTransferLifecycleNotification() {
    const lifecycle =
      transferLifecycleSnapshot();

    if (!lifecycle.stage) {
      return null;
    }

    const completedLabel =
      lifecycle.labels[
        Math.max(0, lifecycle.stage - 1)
      ];

    const isComplete =
      lifecycle.stage >= 5;

    const route =
      lifecycle.tickers.length
        ? lifecycle.tickers.join(' / ')
        : `${lifecycle.count || 0} signing${lifecycle.count === 1 ? '' : 's'}`;

    const detail = [
      `${completedLabel}.`,
      route ? `Route: ${route}.` : '',
      !isComplete
        ? `Next: ${lifecycle.nextAction}.`
        : 'All five transfer stages are complete.',
      lifecycle.pendingCount
        ? `${lifecycle.pendingCount} registration${lifecycle.pendingCount === 1 ? '' : 's'} remain queued.`
        : ''
    ]
      .filter(Boolean)
      .join(' ');

    const title =
      isComplete
        ? 'Transfer lifecycle completed'
        : `Transfer lifecycle advanced to stage ${lifecycle.stage} of 5`;

    return add({
      department:'Transfer Centre',
      page:'AuroraCityFC_TransferCentre.html',
      title,
      message:detail,
      icon:isComplete ? '🏁' : '🔄',
      priority:isComplete ? 'normal' : 'high',
      dedupeKey:'transfer-lifecycle',
      fingerprint:hashString(
        JSON.stringify(lifecycle)
      ),
      source:'transfer-lifecycle',
      actionLabel:
        isComplete
          ? 'Open completed transfer'
          : 'Continue transfer lifecycle',
      metadata:{
        category:
          isComplete
            ? 'achievement'
            : 'action',
        notificationGroup:'transfers',
        replaceExisting:true,
        rich:{
          type:'transfer',
          kicker:
            isComplete
              ? 'TRANSFER COMPLETE'
              : 'TRANSFER LIFECYCLE',
          badge:
            isComplete
              ? 'ALL STAGES COMPLETE'
              : `STAGE ${lifecycle.stage} OF 5`,
          value:`${lifecycle.stage}/5`,
          valueLabel:'STAGES',
          secondary:
            isComplete
              ? 'Signing fully registered'
              : lifecycle.nextAction,
          progress:lifecycle.stage * 20,
          featured:true,
          actionText:
            isComplete
              ? 'Open Transfer Centre'
              : 'Continue transfer'
        }
      }
    });
  }

  function buildSmartStorageNotification(
    rule,
    previous,
    current,
    rawValue
  ) {
    if (
      TRANSFER_LIFECYCLE_KEYS.has(rule.key)
      && rule.key !== 'aurora_transfer_plan_v2'
      && rule.key !== 'aurora_account_transfer_instruction_v1'
    ) {
      return null;
    }

    if (rule.key === 'aurora_wealth_centre') {
      if (!current) return null;

      const previousValue =
        previous && typeof previous === 'object'
          ? previous
          : null;

      const completedDelta =
        previousValue
          ? current.completed - previousValue.completed
          : 0;

      const dueDelta =
        previousValue
          ? current.due - previousValue.due
          : 0;

      const balanceChanged =
        previousValue
        && numbersDiffer(
          previousValue.holdingBalance,
          current.holdingBalance
        );

      const dueValueChanged =
        previousValue
        && numbersDiffer(
          previousValue.dueValue,
          current.dueValue
        );

      /*
       * A save timestamp or revision alone is not a notification.
       */
      if (
        previousValue
        && completedDelta === 0
        && dueDelta === 0
        && !balanceChanged
        && !dueValueChanged
      ) {
        return null;
      }

      let title = 'Finance position updated';
      let badge = 'POSITION CHANGED';
      let category = 'information';
      let priority = 'normal';

      if (completedDelta > 0) {
        title =
          completedDelta === 1
            ? 'Bill completed — finance position updated'
            : `${completedDelta} bills completed — finance position updated`;
        badge = 'BILL COMPLETED';
        category = 'achievement';
      } else if (balanceChanged) {
        title = 'Holding Pot balance changed';
        badge = 'BALANCE CHANGED';
      }

      const parts = [];

      if (completedDelta > 0) {
        parts.push(
          `${completedDelta} newly completed.`
        );
      }

      parts.push(
        `${current.completed} completed • ${current.due} still due.`
      );

      if (balanceChanged) {
        parts.push(
          `Holding Pot ${moneyArrow(
            previousValue.holdingBalance,
            current.holdingBalance
          )}.`
        );
      } else if (
        Number.isFinite(current.holdingBalance)
      ) {
        parts.push(
          `Holding Pot ${formatCash(
            current.holdingBalance
          )}.`
        );
      }

      if (
        dueValueChanged
        && Number.isFinite(current.dueValue)
      ) {
        parts.push(
          `Outstanding bills ${moneyArrow(
            previousValue.dueValue,
            current.dueValue
          )}.`
        );
      }

      return {
        title,
        message:parts.join(' '),
        priority,
        metadata:{
          category,
          replaceExisting:true,
          rich:{
            type:'finance',
            kicker:'FINANCE POSITION',
            badge,
            value:Number.isFinite(current.holdingBalance)
              ? formatCash(current.holdingBalance)
              : String(current.due),
            valueLabel:Number.isFinite(current.holdingBalance)
              ? 'HOLDING POT'
              : 'BILLS DUE',
            secondary:
              `${current.completed} completed • ${current.due} due`,
            actionText:'Open Finance'
          }
        }
      };
    }

    if (rule.key === 'aurora_transfer_plan_v2') {
      if (!current) return null;

      const previousValue =
        previous && typeof previous === 'object'
          ? previous
          : null;

      const tickersChanged =
        JSON.stringify(previousValue?.tickers || [])
        !== JSON.stringify(current.tickers || []);

      const totalChanged =
        previousValue
        && numbersDiffer(
          previousValue.total,
          current.total
        );

      const incomeChanged =
        previousValue
        && numbersDiffer(
          previousValue.income,
          current.income
        );

      const statusChanged =
        previousValue
        && previousValue.status !== current.status;

      if (
        previousValue
        && !tickersChanged
        && !totalChanged
        && !incomeChanged
        && !statusChanged
      ) {
        return null;
      }

      if (
        !current.count
        && !(Number.isFinite(current.total)
          && current.total > 0)
      ) {
        return null;
      }

      const parts = [];

      if (tickersChanged && current.tickers.length) {
        parts.push(
          `Route: ${current.tickers.join(' / ')}.`
        );
      }

      if (totalChanged) {
        parts.push(
          `Budget ${moneyArrow(
            previousValue.total,
            current.total
          )}.`
        );
      } else if (Number.isFinite(current.total)) {
        parts.push(`Budget ${formatCash(current.total)}.`);
      }

      if (incomeChanged) {
        parts.push(
          `Projected income ${moneyArrow(
            previousValue.income,
            current.income
          )}/year.`
        );
      } else if (Number.isFinite(current.income)) {
        parts.push(
          `Projected income ${formatCash(
            current.income
          )}/year.`
        );
      }

      return {
        title:
          current.status
            ? `Transfer route — ${current.status}`
            : 'Transfer route changed',
        message:parts.join(' '),
        priority:'high',
        metadata:{
          category:'action',
          replaceExisting:true,
          rich:{
            type:'transfer',
            kicker:'TRANSFER WINDOW',
            badge:current.status || 'ACTION READY',
            value:String(current.count),
            valueLabel:'SIGNINGS',
            secondary:Number.isFinite(current.income)
              ? `${formatCash(current.income)}/year`
              : Number.isFinite(current.total)
                ? `${formatCash(current.total)} budget`
                : '',
            actionText:'Open Transfer Centre'
          }
        }
      };
    }

    if (
      rule.key
      === 'aurora_account_transfer_instruction_v1'
    ) {
      if (!current) return null;

      /*
       * Zero-value routes are incomplete data, not useful alerts.
       */
      if (
        !Number.isFinite(current.total)
        || current.total <= 0
      ) {
        return null;
      }

      const previousValue =
        previous && typeof previous === 'object'
          ? previous
          : null;

      const changed =
        !previousValue
        || previousValue.status !== current.status
        || numbersDiffer(
          previousValue.total,
          current.total
        )
        || numbersDiffer(
          previousValue.ig,
          current.ig
        )
        || numbersDiffer(
          previousValue.trading212,
          current.trading212
        );

      if (!changed) return null;

      const parts = [];

      if (
        previousValue
        && previousValue.status !== current.status
      ) {
        parts.push(
          `Status ${previousValue.status || 'NOT SET'} → ${current.status || 'READY'}.`
        );
      } else if (current.status) {
        parts.push(`Status ${current.status}.`);
      }

      if (Number.isFinite(current.ig)) {
        parts.push(`IG ISA ${formatCash(current.ig)}.`);
      }

      if (Number.isFinite(current.trading212)) {
        parts.push(
          `Trading 212 ${formatCash(
            current.trading212
          )}.`
        );
      }

      parts.push(
        `Total funding ${formatCash(current.total)}.`
      );

      return {
        title:'Broker funding route ready',
        message:parts.join(' '),
        priority:'high',
        metadata:{
          category:'action',
          replaceExisting:true,
          rich:{
            type:'transfer',
            kicker:'BROKER FUNDING',
            badge:current.status || 'ACTION REQUIRED',
            value:formatCash(current.total),
            valueLabel:'TOTAL FUNDING',
            secondary:[
              Number.isFinite(current.ig)
                ? `IG ${formatCash(current.ig)}`
                : '',
              Number.isFinite(current.trading212)
                ? `T212 ${formatCash(current.trading212)}`
                : ''
            ].filter(Boolean).join(' • '),
            actionText:'Open Transfer Centre'
          }
        }
      };
    }

    return {
      title:rule.title,
      message:
        typeof rule.message === 'function'
          ? rule.message(rawValue)
          : String(
              rule.message
              || 'Aurora data updated.'
            ),
      priority:rule.priority,
      metadata:{
        category:
          rule.priority === 'critical'
            ? 'critical'
            : rule.priority === 'high'
              ? 'action'
              : 'information',
        notificationGroup:
          notificationGroupFor({
            department:rule.department,
            title:rule.title,
            message:
              typeof rule.message === 'function'
                ? rule.message(rawValue)
                : String(rule.message || ''),
            metadata:{}
          }),
        replaceExisting:true,
        rich:{
          type:'update',
          kicker:String(
            rule.department || 'AURORA HQ'
          ).toUpperCase(),
          badge:'STATE CHANGED',
          secondary:'Open the department to review the impact.',
          actionText:`Open ${rule.department}`
        }
      }
    };
  }

  function actionLabel_(control) {
    if (!control) return '';

    return String(
      control.getAttribute?.('aria-label')
      || control.getAttribute?.('title')
      || control.value
      || control.textContent
      || ''
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  function meaningfulAction_(label) {
    const text = String(label || '').toLowerCase();

    if (!text) return false;

    if (
      /mark all read|clear all|close|cancel|back|next|previous|menu|log out|logout|open |view |show |hide |copy /.test(text)
    ) {
      return false;
    }

    /*
     * Routine saves, refreshes and recalculations are observed through
     * semantic storage changes. A click alone is not a notification.
     */
    if (
      /save|refresh|sync|recalculate|run planner|update/.test(text)
    ) {
      return false;
    }

    return /complete|approve|confirm|register|execute|submit|archive|mark paid|paid|generate|record purchase|finish mission|apply transfer/.test(text);
  }

  function describeDepartmentAction_(page, label) {
    const lower = String(label || '').toLowerCase();

    if (page.page.includes('FinanceDepartment')) {
      if (/bill|paid/.test(lower)) {
        return {
          title: 'Finance bill updated',
          message: `${label} was recorded in the Finance Department.`,
          icon: '💷',
          priority: 'normal'
        };
      }

      if (/planner|budget|recalculate/.test(lower)) {
        return {
          title: 'Finance planner recalculated',
          message: `${label} was completed in the Finance Department.`,
          icon: '📊',
          priority: 'normal'
        };
      }

      if (/mission|handoff/.test(lower)) {
        return {
          title: 'Investment mission updated',
          message: `${label} was completed in the Finance Department.`,
          icon: '📈',
          priority: 'high'
        };
      }
    }

    if (page.page.includes('TransferCentre')) {
      if (/register|purchase/.test(lower)) {
        return {
          title: 'Purchase registration updated',
          message: `${label} was completed in the Transfer Centre.`,
          icon: '🧾',
          priority: 'high'
        };
      }

      if (/approve/.test(lower)) {
        return {
          title: 'Transfer plan approved',
          message: `${label} was completed in the Transfer Centre.`,
          icon: '✅',
          priority: 'high'
        };
      }

      if (/payday|execute|complete/.test(lower)) {
        return {
          title: 'Transfer workflow updated',
          message: `${label} was completed in the Transfer Centre.`,
          icon: '🔄',
          priority: 'normal'
        };
      }
    }

    return {
      title: 'Department action completed',
      message: `${label} was completed in ${page.department || 'Aurora HQ'}.`,
      icon: page.icon || '🔔',
      priority: 'low'
    };
  }

  function installDepartmentBridge(documentObject = document) {
    if (!documentObject?.documentElement) return false;

    const page = detectPageForDocument(documentObject);
    const childWindow = documentObject.defaultView;

    if (childWindow && childWindow !== window) {
      try {
        childWindow.AuroraNotifications =
          window.AuroraNotifications;
      } catch (_) {}
    }

    if (
      documentObject.documentElement.dataset
        .auroraNotificationBridge === '1'
    ) {
      return true;
    }

    documentObject.documentElement.dataset
      .auroraNotificationBridge = '1';

    const forward = detail => {
      if (detail && typeof detail === 'object') {
        add({
          ...detail,
          department:
            detail.department || page.department,
          page:
            detail.page || page.page,
          icon:
            detail.icon || page.icon
        });
      }
    };

    documentObject.addEventListener(
      'aurora:notify',
      event => forward(event?.detail)
    );

    childWindow?.addEventListener?.(
      'aurora:notify',
      event => forward(event?.detail)
    );

    documentObject.addEventListener(
      'click',
      event => {
        const control = event.target?.closest?.(
          'button,[role="button"],input[type="submit"],input[type="button"]'
        );

        const label = actionLabel_(control);

        if (!meaningfulAction_(label)) return;

        if (
          page.page.includes('FinanceDepartment')
          || page.page.includes('TransferCentre')
        ) {
          return;
        }

        const detail = describeDepartmentAction_(
          page,
          label
        );

        window.setTimeout(() => {
          add({
            ...detail,
            department: page.department,
            page: page.page,
            dedupeKey:
              `ui:${page.page}:${hashString(label.toLowerCase())}`,
            fingerprint: hashString(
              `${page.page}|${label}|${Math.floor(now() / 60000)}`
            ),
            source: 'aurora-child-action-bridge',
            ttlDays: 14
          });
        }, 250);
      },
      true
    );

    return true;
  }

  function detectPageForDocument(documentObject) {
    const pathname = String(
      documentObject?.location?.pathname || ''
    );

    const title = String(
      documentObject?.title || ''
    );

    const match = PAGE_MAP.find(([needle]) => {
      const spaced = needle
        .replace(/([A-Z])/g, ' $1')
        .trim();

      return pathname.includes(needle)
        || title.includes(spaced);
    });

    if (match) {
      return {
        department: match[1],
        page: match[2],
        icon: match[3]
      };
    }

    return {
      department:
        documentObject?.documentElement?.dataset
          ?.auroraPage || 'Aurora HQ',
      page:
        pathname.split('/').pop()
        || 'AuroraCityFC_ManagerDashboard.html',
      icon: '🔔'
    };
  }

  function shouldNotifyStorageRule(
    rule,
    rawValue,
    previousSnapshot,
    currentSnapshot
  ) {
    if (
      rawValue === null
      || rawValue === undefined
      || rawValue === ''
      || currentSnapshot === null
      || currentSnapshot === undefined
    ) {
      return false;
    }

    if (
      rule.key === 'aurora_finance_department_mission_v1'
      || rule.key === 'aurora_wealth_investment_mission_v1'
    ) {
      const data = parseStored(rawValue);

      if (!data || typeof data !== 'object') {
        return false;
      }

      const total = firstFinite(
        data.total,
        data.budget,
        data.investmentTotal,
        data.totalInvestment,
        data.requiredTotal
      );

      return Number.isFinite(total) && total > 0;
    }

    if (rule.key === 'aurora_transfer_plan_v2') {
      return Boolean(
        currentSnapshot?.count
        || (
          Number.isFinite(currentSnapshot?.total)
          && currentSnapshot.total > 0
        )
      );
    }

    if (
      rule.key
      === 'aurora_account_transfer_instruction_v1'
    ) {
      return Boolean(
        Number.isFinite(currentSnapshot?.total)
        && currentSnapshot.total > 0
      );
    }

    return true;
  }

  function handleStorageRule(
    rule,
    rawValue,
    previousSnapshot,
    currentSnapshot
  ) {
    const shouldNotify =
      shouldNotifyStorageRule(
        rule,
        rawValue,
        previousSnapshot,
        currentSnapshot
      );

    if (shouldNotify) {
      const smart =
        buildSmartStorageNotification(
          rule,
          previousSnapshot,
          currentSnapshot,
          rawValue
        );

      if (smart) {
        const message = String(
          smart.message || ''
        ).trim();

        if (message) {
          const fingerprint = hashString(
            `${rule.key}|${smart.title}|${message}`
          );

          add({
            department:rule.department,
            page:rule.page,
            title:smart.title || rule.title,
            message,
            icon:smart.icon || rule.icon,
            priority:
              smart.priority || rule.priority,
            dedupeKey:`storage:${rule.key}`,
            fingerprint,
            source:rule.key,
            actionLabel:
              smart.metadata?.rich?.actionText
              || `Open ${rule.department}`,
            metadata:{
              ...(smart.metadata || {}),
              storageRule:rule.key
            }
          });
        }
      }
    }

    if (
      TRANSFER_LIFECYCLE_KEYS.has(rule.key)
    ) {
      syncTransferLifecycleNotification();
    }
  }

  function initialiseStorageWatchers() {
    const saved = readWatchState();
    const snapshots = readSnapshotState();

    const remember = (
      rule,
      rawValue,
      notify
    ) => {
      const currentSnapshot =
        snapshotForRule(rule, rawValue);

      const fingerprint = hashString(
        JSON.stringify(
          currentSnapshot === undefined
            ? null
            : currentSnapshot
        )
      );

      const previousFingerprint =
        watchedValues.get(rule.key);

      const previousSnapshot =
        watchedSnapshots.has(rule.key)
          ? watchedSnapshots.get(rule.key)
          : snapshots[rule.key];

      watchedValues.set(
        rule.key,
        fingerprint
      );

      watchedSnapshots.set(
        rule.key,
        currentSnapshot
      );

      saved[rule.key] = fingerprint;
      snapshots[rule.key] = currentSnapshot;

      if (
        notify
        && previousFingerprint !== undefined
        && previousFingerprint !== fingerprint
      ) {
        handleStorageRule(
          rule,
          rawValue,
          previousSnapshot,
          currentSnapshot
        );
      }
    };

    STORAGE_RULES.forEach(rule => {
      let current = null;

      try {
        current =
          localStorage.getItem(rule.key);
      } catch (_) {}

      const currentSnapshot =
        snapshotForRule(rule, current);

      const currentFingerprint =
        hashString(
          JSON.stringify(
            currentSnapshot === undefined
              ? null
              : currentSnapshot
          )
        );

      const persistentPrevious =
        Object.prototype.hasOwnProperty.call(
          saved,
          rule.key
        )
          ? String(saved[rule.key])
          : undefined;

      watchedValues.set(
        rule.key,
        persistentPrevious === undefined
          ? currentFingerprint
          : persistentPrevious
      );

      watchedSnapshots.set(
        rule.key,
        Object.prototype.hasOwnProperty.call(
          snapshots,
          rule.key
        )
          ? snapshots[rule.key]
          : currentSnapshot
      );

      remember(
        rule,
        current,
        persistentPrevious !== undefined
      );
    });

    writeWatchState(saved);
    writeSnapshotState(snapshots);

    const check = () => {
      STORAGE_RULES.forEach(rule => {
        let current = null;

        try {
          current =
            localStorage.getItem(rule.key);
        } catch (_) {}

        remember(
          rule,
          current,
          true
        );
      });

      writeWatchState(saved);
      writeSnapshotState(snapshots);
    };

    window.setInterval(check, 1600);

    window.addEventListener(
      'storage',
      event => {
        const rule =
          STORAGE_RULES.find(
            item => item.key === event.key
          );

        if (!rule) return;

        remember(
          rule,
          event.newValue,
          true
        );

        writeWatchState(saved);
        writeSnapshotState(snapshots);
      }
    );
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

  function migrateSmartNotificationStore() {
    const rows = cleanStore(readStore());

    const filtered = rows.filter(row => {
      const title = String(
        row?.title || ''
      ).toLowerCase();

      const message = String(
        row?.message || ''
      ).toLowerCase();

      if (title === 'finance history updated') {
        return false;
      }

      if (
        /broker funding/.test(title)
        && (
          /£0(?:\.00)?\b/.test(message)
          || /value\s*£0/.test(message)
        )
      ) {
        return false;
      }

      return true;
    });

    return writeStore(
      filtered,
      'smart-notification-migration'
    );
  }

  function seedInstallNotice() {
    try {
      if (localStorage.getItem(INSTALL_KEY)) return;
      localStorage.setItem(INSTALL_KEY, VERSION);
      add({
        department: 'Aurora HQ',
        page: 'AuroraCityFC_ManagerDashboard.html',
        title: 'Shared notifications connected',
        message: 'The GameShell can now retain live alerts and department updates while you move between Aurora pages.',
        priority: 'normal',
        icon: '🔔',
        dedupeKey: 'aurora-notifications-installed-v1',
        ttlDays: 7
      });
    } catch (_) {}
  }

  function attachCurrentChildDocument() {
    const frame =
      document.getElementById('clubFrame');

    if (!frame) return false;

    try {
      const childWindow =
        frame.contentWindow;

      const childDocument =
        frame.contentDocument;

      if (childWindow) {
        childWindow.AuroraNotifications =
          window.AuroraNotifications;
      }

      return attachDocument(
        childDocument
      );
    } catch (_) {
      return false;
    }
  }


  function attachDocument(documentObject = document) {
    if (!documentObject) return false;

    const isOwnerDocument =
      documentObject.defaultView === window;

    const hasShellOwner = Boolean(
      document.getElementById(
        'auroraShellNotificationButton'
      )
    );

    const managerAttached =
      isOwnerDocument && !hasShellOwner
        ? attachManagerDashboard(documentObject)
        : false;

    const bridgeAttached =
      installDepartmentBridge(documentObject);

    return Boolean(
      managerAttached || bridgeAttached
    );
  }

  function start() {
    installUniversalShellUI(
      window.AuroraNotifications
    );

    clearExpired();
    migrateSmartNotificationStore();
    applyPreferencesToStore();
    seedInstallNotice();
    initialiseStorageWatchers();
    window.setTimeout(
      syncTransferLifecycleNotification,
      350
    );
    attachDocument(document);

    const frame =
      document.getElementById('clubFrame');

    frame?.addEventListener(
      'load',
      () => {
        window.setTimeout(
          attachCurrentChildDocument,
          0
        );
      }
    );

    window.setTimeout(
      attachCurrentChildDocument,
      300
    );

    window.setTimeout(
      attachCurrentChildDocument,
      1200
    );
  }

  window.AuroraNotifications = Object.freeze({
    version:VERSION,
    add,
    notify:add,
    notifyCurrent,
    replaceLive,
    list,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    clear,
    clearExpired,
    subscribe,
    test,
    attachDocument,
    currentPage:detectPage,
    getPreferences:readPreferences,
    getPreference,
    setPreference,
    notificationGroupFor,
    syncTransferLifecycle:
      syncTransferLifecycleNotification,
    openPanel:() =>
      window.AuroraNotificationsShellUI
        ?.open?.(),
    closePanel:() =>
      window.AuroraNotificationsShellUI
        ?.close?.(),
    togglePanel:() =>
      window.AuroraNotificationsShellUI
        ?.toggle?.()
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

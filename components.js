/**
 * shared/components.js
 * ═══════════════════════════════════════════════════════════
 * Shared UI components injected into every page at runtime.
 *
 * HOW IT WORKS:
 *  Each HTML page has placeholder divs:
 *    <div id="sidebar-placeholder"></div>
 *    <div id="header-placeholder"></div>
 *    <div id="modal-placeholder"></div>
 *
 *  This script builds the HTML as a template string, injects it,
 *  then highlights the active nav item based on the current URL.
 *
 * HOW TO ADD A NAV ITEM:
 *  1. Add an entry to NAV_ITEMS array below.
 *  2. Create the page folder + 3 files.
 *  Done.
 * ═══════════════════════════════════════════════════════════
 */

window.FT_COMPONENTS = (() => {

  /* ── Navigation item definitions ────────────────────────
     href is relative to the repo root on Netlify.
     Each page lives at: /{folder}/{File}.html
  ────────────────────────────────────────────────────── */
  const NAV_ITEMS = [
    { section: 'Overview' },
    { label: 'Dashboard',   icon: '⬡', href: '/dashboard/Dashboard.html',     match: 'dashboard'    },

    { section: 'Trading' },
    { label: 'F&O Trades',  icon: '📈', href: '/fo/FO.html',                   match: 'fo'           },
    { label: 'Trade Log',   icon: '📋', href: '/log/Log.html',                  match: 'log'          },
    { label: 'Analytics',   icon: '◉',  href: '/analytics/Analytics.html',      match: 'analytics'    },

    { section: 'Portfolio' },
    { label: 'Holdings',    icon: '🏦', href: '/holdings/Holdings.html',        match: 'holdings'     },
    { label: 'Investments', icon: '💼', href: '/investments/Investments.html',  match: 'investments'  },
    { label: 'IPO',         icon: '🚀', href: '/ipo/IPO.html',                  match: 'ipo'          },
    { label: 'Demat 2',     icon: '🗂', href: '/demat2/Demat2.html',            match: 'demat2'       },

    { section: 'Research' },
    { label: 'Fundamentals',icon: '🔬', href: '/fa/FA.html',                    match: 'fa'           },
  ];

  /* ── Build sidebar HTML ──────────────────────────────── */
  function buildSidebar(activePage) {
    const items = NAV_ITEMS.map(item => {
      if (item.section) {
        return `<div class="nav-section-label">${item.section}</div>`;
      }
      const isActive = activePage === item.match;
      return `
        <a class="nav-item${isActive ? ' active' : ''}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>`;
    }).join('\n');

    return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="brand-icon">◈</span>
        <div>
          <div class="brand-name">FTracker</div>
          <div class="brand-version">v2.0 · Vanilla</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${items}
      </nav>

      <div class="sidebar-footer">
        Data: Google Sheets<br/>
        UI: HTML/CSS/JS
      </div>
    </aside>`;
  }

  /* ── Build page header HTML ──────────────────────────── */
  function buildHeader(title, subtitle) {
    return `
    <header class="page-header">
      <div class="header-left">
        <div class="page-title">${title}</div>
        <div class="page-subtitle" id="lastUpdated">Loading…</div>
      </div>

      <div class="header-right">
        <!-- Sync status pill -->
        <div class="sync-pill">
          <div class="sync-dot" id="syncDot"></div>
          <span id="syncLabel">Connecting</span>
        </div>

        <!-- Mobile menu toggle (hidden on desktop) -->
        <button class="icon-btn" id="menuBtn" title="Menu" style="display:none">☰</button>

        <!-- Refresh button -->
        <button class="icon-btn" id="refreshBtn" title="Refresh data">⟳</button>

        <!-- Settings button -->
        <button class="icon-btn" id="settingsBtn" title="Settings">⚙</button>
      </div>
    </header>`;
  }

  /* ── Build settings modal HTML ───────────────────────── */
  function buildSettingsModal() {
    return `
    <div class="modal-overlay" id="settingsModal">
      <div class="modal">
        <div class="modal-header">
          <h3>⚙ Settings</h3>
          <button class="modal-close" id="closeSettings">✕</button>
        </div>

        <div class="modal-body">

          <div class="setting-group">
            <label class="setting-label">Apps Script Web App URL</label>
            <input
              type="text"
              class="input-text"
              id="urlInput"
              placeholder="https://script.google.com/macros/s/…/exec"
              style="width:100%"
            />
            <p class="setting-hint">
              Your Google Apps Script URL. Changes take effect after Save.
            </p>
          </div>

          <div class="setting-group">
            <label class="setting-label">Auto-Refresh</label>
            <select class="input-select" id="refreshSelect" style="width:100%">
              <option value="0">Disabled</option>
              <option value="300000">Every 5 minutes</option>
              <option value="600000">Every 10 minutes</option>
              <option value="1800000">Every 30 minutes</option>
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">Cache</label>
            <button class="btn-ghost" id="clearCacheBtn" style="width:100%;text-align:left">
              🗑 Clear data cache (force fresh fetch)
            </button>
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-ghost"    id="cancelSettings">Cancel</button>
          <button class="btn-primary"  id="saveSettings">Save & Reload</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Determine active page from URL ──────────────────── */
  function getActivePage() {
    const path = window.location.pathname.toLowerCase();
    for (const item of NAV_ITEMS) {
      if (item.match && path.includes(item.match)) return item.match;
    }
    return 'dashboard';
  }

  /* ── Get page title for header ───────────────────────── */
  function getPageTitle(activePage) {
    const item = NAV_ITEMS.find(i => i.match === activePage);
    return item ? item.label : 'Dashboard';
  }

  /* ── Wire settings modal events ──────────────────────── */
  function wireSettings() {
    const modal      = document.getElementById('settingsModal');
    const urlInput   = document.getElementById('urlInput');
    const refSelect  = document.getElementById('refreshSelect');
    const openBtn    = document.getElementById('settingsBtn');
    const closeBtn   = document.getElementById('closeSettings');
    const cancelBtn  = document.getElementById('cancelSettings');
    const saveBtn    = document.getElementById('saveSettings');
    const clearBtn   = document.getElementById('clearCacheBtn');

    // Pre-fill with current values
    function open() {
      urlInput.value   = localStorage.getItem('ft_url') || window.FT_CONFIG.APPS_SCRIPT_URL;
      refSelect.value  = localStorage.getItem('ft_refresh') || '0';
      modal.classList.add('open');
    }

    function close() { modal.classList.remove('open'); }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    saveBtn.addEventListener('click', () => {
      localStorage.setItem('ft_url',     urlInput.value.trim());
      localStorage.setItem('ft_refresh', refSelect.value);
      window.FT_SHEETS.clearCache();
      close();
      window.location.reload();
    });

    clearBtn.addEventListener('click', () => {
      window.FT_SHEETS.clearCache();
      clearBtn.textContent = '✅ Cache cleared';
      setTimeout(() => { clearBtn.textContent = '🗑 Clear data cache (force fresh fetch)'; }, 2000);
    });
  }

  /* ── Wire mobile menu ────────────────────────────────── */
  function wireMobile() {
    const menuBtn  = document.getElementById('menuBtn');
    const sidebar  = document.getElementById('sidebar');

    if (!menuBtn || !sidebar) return;

    // Show menu button on small screens
    const mq = window.matchMedia('(max-width: 900px)');
    function onResize(e) { menuBtn.style.display = e.matches ? '' : 'none'; }
    mq.addListener(onResize);
    onResize(mq);

    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => sidebar.classList.remove('open'));
    });
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: inject()
     Call this from every page's JS, before loading data.
     ══════════════════════════════════════════════════════════ */
  function inject() {
    const activePage  = getActivePage();
    const title       = getPageTitle(activePage);

    // Sidebar
    const sidebarEl = document.getElementById('sidebar-placeholder');
    if (sidebarEl) sidebarEl.outerHTML = buildSidebar(activePage);

    // Header
    const headerEl = document.getElementById('header-placeholder');
    if (headerEl) headerEl.outerHTML = buildHeader(title, '');

    // Modal
    const modalEl = document.getElementById('modal-placeholder');
    if (modalEl) modalEl.outerHTML = buildSettingsModal();

    // Wire events
    wireSettings();
    wireMobile();
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: setStatus(state, text)
     Updates the sync pill in the header.
     state: 'loading' | 'live' | 'error'
     ══════════════════════════════════════════════════════════ */
  function setStatus(state, text) {
    const dot   = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    const tsEl  = document.getElementById('lastUpdated');

    if (!dot || !label) return;

    dot.className = 'sync-dot';

    if (state === 'live') {
      dot.classList.add('live');
      label.textContent = text || 'Live';
      if (tsEl) tsEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN');
    } else if (state === 'error') {
      dot.classList.add('error');
      label.textContent = text || 'Error';
      if (tsEl) tsEl.textContent = 'Failed to load';
    } else {
      label.textContent = text || 'Loading…';
      if (tsEl) tsEl.textContent = 'Fetching…';
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC: wireRefreshBtn(loadFn)
     Wires the refresh button to re-run the page's load function.
     ══════════════════════════════════════════════════════════ */
  function wireRefreshBtn(loadFn) {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (btn.dataset.loading) return;
      btn.dataset.loading = '1';
      btn.style.transform  = 'rotate(360deg)';
      btn.style.transition = 'transform .5s';

      window.FT_SHEETS.clearCache();
      await loadFn();

      setTimeout(() => {
        btn.style.transform  = '';
        btn.style.transition = '';
        delete btn.dataset.loading;
      }, 500);
    });
  }

  return { inject, setStatus, wireRefreshBtn };

})();

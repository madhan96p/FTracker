/**
 * fa/FA.js — Fundamental Analysis page
 * ═══════════════════════════════════════════════════════════
 * Renders the FA table with:
 *   - Health Score visual pips (0–8)
 *   - Final Action badge (STRONG BUY / WATCHLIST / AVOID)
 *   - Graham Number vs LTP intrinsic gap %
 *   - Column group toggles (Valuation / Quality / Financials / Graham)
 *   - Sort on any column
 *   - Search + filter by action
 *
 * HEALTH SCORE (from sheet formula):
 *   +2 if ROE > 20%
 *   +2 if D/E < 1
 *   +2 if P/E < 20 (PEG via V<1)
 *   +2 if Promoter > 50%
 *   Max = 8
 *
 * FINAL ACTION:
 *   Health ≥ 6  → STRONG BUY
 *   Health ≥ 4  → WATCHLIST
 *   Health < 4  → AVOID
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;

  let _rows = [];
  let _sort = { col: 'healthScore', dir: -1 };
  let _hiddenGroups = new Set();

  /* ── Health score visual pips ───────────────────────────── */
  function healthPips(score) {
    const s    = parseFloat(score) || 0;
    const max  = 8;
    const cls  = s >= 6 ? 'filled-profit' : s >= 4 ? 'filled-gold' : 'filled-loss';
    const pips = Array.from({ length: max }, (_, i) =>
      `<div class="health-pip ${i < s ? cls : ''}"></div>`
    ).join('');
    return `
      <div style="display:flex;align-items:center;gap:.35rem">
        <div class="health-bar">${pips}</div>
        <span class="mono ${U.healthScoreClass(s)}" style="font-size:11px">${s}/8</span>
      </div>`;
  }

  /* ── Intrinsic gap colour ───────────────────────────────── */
  function gapClass(gap) {
    /* gap = (Graham - LTP) / LTP * 100
       Positive = undervalued (green), Negative = overvalued (red) */
    return parseFloat(gap) > 0 ? 'profit' : 'loss';
  }

  /* ── Render ─────────────────────────────────────────────── */
  function render(rows) {
    const tbody = document.getElementById('faTbody');

    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="22">No data</td></tr>';
      document.getElementById('faFooter').innerHTML = '';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <!-- Always visible -->
        <td class="mono"><strong>${r.ticker}</strong></td>
        <td>${r.companyName}</td>
        <td class="mono">${U.₹(r.ltp, 2)}</td>
        <td>${healthPips(r.healthScore)}</td>
        <td><span class="badge ${U.faBadgeClass(r.finalAction)}">${r.finalAction || '—'}</span></td>

        <!-- Valuation -->
        <td class="col-group-valuation mono">${r.pe   ? r.pe.toFixed(2)   : '—'}</td>
        <td class="col-group-valuation mono">${r.pb   ? r.pb.toFixed(2)   : '—'}</td>
        <td class="col-group-valuation mono">${r.peg  ? r.peg.toFixed(2)  : '—'}</td>
        <td class="col-group-valuation mono">${r.mktCap ? U.compact(r.mktCap * 1e7) : '—'}</td>

        <!-- Quality -->
        <td class="col-group-quality mono ${r.roe >= 20 ? 'profit' : ''}">${r.roe ? r.roe.toFixed(1) + '%' : '—'}</td>
        <td class="col-group-quality mono ${r.roce >= 15 ? 'profit' : ''}">${r.roce ? r.roce.toFixed(1) + '%' : '—'}</td>
        <td class="col-group-quality mono">${r.eps ? r.eps.toFixed(2) : '—'}</td>
        <td class="col-group-quality mono ${r.promoterPct >= 50 ? 'profit' : ''}">${r.promoterPct ? r.promoterPct.toFixed(1) + '%' : '—'}</td>

        <!-- Financials -->
        <td class="col-group-financials mono ${r.de < 1 ? 'profit' : 'loss'}">${r.de ? r.de.toFixed(2) : '—'}</td>
        <td class="col-group-financials mono">${r.currentRatio ? r.currentRatio.toFixed(2) : '—'}</td>
        <td class="col-group-financials mono ${r.salesGr > 0 ? 'profit' : 'loss'}">${r.salesGr ? r.salesGr.toFixed(1) + '%' : '—'}</td>
        <td class="col-group-financials mono ${r.profitGr > 0 ? 'profit' : 'loss'}">${r.profitGr ? r.profitGr.toFixed(1) + '%' : '—'}</td>
        <td class="col-group-financials mono">${r.divYield ? r.divYield.toFixed(2) + '%' : '—'}</td>

        <!-- Graham -->
        <td class="col-group-graham mono">${U.₹(r.grahamNumber, 2)}</td>
        <td class="col-group-graham mono ${gapClass(r.intrinsicGap)}">${r.intrinsicGap ? (r.intrinsicGap * 100).toFixed(1) + '%' : '—'}</td>
        <td class="col-group-graham" style="font-size:11px">${r.yieldQuality || '—'}</td>
        <td class="col-group-graham" style="font-size:11px;color:var(--text-secondary);max-width:150px;white-space:normal">${r.notes || '—'}</td>
      </tr>`).join('');

    document.getElementById('faFooter').innerHTML = `
      <span>${rows.length} stocks</span>
      <span>Strong Buy: <strong class="profit">${rows.filter(r => r.finalAction === 'STRONG BUY').length}</strong></span>
      <span>Watchlist: <strong class="gold">${rows.filter(r => r.finalAction === 'WATCHLIST').length}</strong></span>
      <span>Avoid: <strong class="loss">${rows.filter(r => r.finalAction === 'AVOID').length}</strong></span>`;

    applyColumnVisibility();
  }

  /* ── Column group visibility ────────────────────────────── */
  function applyColumnVisibility() {
    ['valuation', 'quality', 'financials', 'graham'].forEach(group => {
      const hidden = _hiddenGroups.has(group);
      document.querySelectorAll(`.col-group-${group}`).forEach(el => {
        el.style.display = hidden ? 'none' : '';
      });
    });
  }

  /* ── Filters + sort ─────────────────────────────────────── */
  function applyFilters() {
    const q = (document.getElementById('faSearch').value || '').toLowerCase();
    const f = document.getElementById('faFilter').value;

    let rows = _rows.filter(r => {
      if (q && !r.ticker.toLowerCase().includes(q) && !r.companyName.toLowerCase().includes(q)) return false;
      if (f !== 'all' && r.finalAction !== f) return false;
      return true;
    });

    const col = _sort.col;
    rows = [...rows].sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') av = av.toLowerCase();
      return av < bv ? _sort.dir : av > bv ? -_sort.dir : 0;
    });

    render(rows);
  }

  function bindSort() {
    document.querySelectorAll('#faTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = -1; }
        document.querySelectorAll('#faTable th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });
  }

  function bindColumnToggles() {
    document.querySelectorAll('.col-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        if (_hiddenGroups.has(group)) {
          _hiddenGroups.delete(group);
          btn.classList.add('active');
          btn.style.opacity = '';
        } else {
          _hiddenGroups.add(group);
          btn.classList.remove('active');
          btn.style.opacity = '.4';
        }
        applyColumnVisibility();
      });
    });
  }

  /* ── Load ───────────────────────────────────────────────── */
  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.fa;
      applyFilters();
      C.setStatus('live');
    } catch (err) {
      console.error('[FA]', err);
      C.setStatus('error');
      document.getElementById('faTbody').innerHTML =
        `<tr class="empty-row"><td colspan="22">Error: ${err.message}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    bindColumnToggles();
    document.getElementById('faSearch').addEventListener('input', applyFilters);
    document.getElementById('faFilter').addEventListener('change', applyFilters);
    load();
  });

})();

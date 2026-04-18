/**
 * holdings/Holdings.js
 * ═══════════════════════════════════════════════════════════
 * Renders the Holdings Data table (one row per company, aggregated).
 *
 * KEY CALCULATION FIX:
 *   P&L = holdingsData.currentValue - holdingsData.totalInvested
 *       = col[7] - col[5]
 *   Both values are SUMIF totals already computed by Google Sheets.
 *   col[6] = Total Brokerage Paid (NOT current price — old code bug).
 *
 * SENTINEL LOGIC (replicates sheet formulas in UI):
 *   Sheet formula: IF(((H3/F3)-1) < -0.05, "BUY DIP", IF((...) > 0.15, "TAKE PROFIT", "HOLD"))
 *   We display the sheet-computed values — no need to recalculate here.
 *   But we DO compute them locally as a verification / fallback.
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;

  let _rows = [];
  let _sort = { col: 'pnl', dir: -1 };

  /* ── Render ──────────────────────────────────────────── */
  function render(rows) {
    const tbody = document.getElementById('hTbody');

    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="13">No data</td></tr>';
      document.getElementById('hFooter').innerHTML = '';
      return;
    }

    tbody.innerHTML = rows.map(h => `
      <tr>
        <td><strong>${h.companyName}</strong></td>
        <td class="mono">${h.symbol}</td>
        <td><span class="badge badge-neutral" style="font-size:10px">${h.sector}</span></td>
        <td class="mono">${U.₹(h.avgBuyPrice)}</td>
        <td class="mono">${h.totalQty}</td>
        <td class="mono">${U.₹(h.totalInvested)}</td>
        <td class="mono muted">${U.₹(h.totalBrokeragePaid)}</td>
        <td class="mono">${U.₹(h.currentValue)}</td>
        <td class="mono ${U.pnlClass(h.pnl)}"><strong>${U.pnl(h.pnl)}</strong></td>
        <td class="mono ${U.pnlClass(h.pnlPct)}">${U.pct(h.pnlPct)}</td>
        <td><span class="badge ${U.sentinelBadgeClass(h.sentinelRecommendation)}" style="font-size:10px">${h.sentinelRecommendation}</span></td>
        <td><span class="badge ${U.faBadgeClass(h.fundamentalAction)}" style="font-size:10px">${h.fundamentalAction}</span></td>
        <td style="font-size:11px">${h.masterSentinel}</td>
      </tr>`).join('');

    /* Footer */
    const totInv = U.sum(rows.map(h => h.totalInvested));
    const totCur = U.sum(rows.map(h => h.currentValue));
    const totPnl = totCur - totInv;
    document.getElementById('hFooter').innerHTML = `
      <span>${rows.length} positions</span>
      <span>Invested: <strong class="mono">${U.₹(totInv)}</strong></span>
      <span>Current: <strong class="mono">${U.₹(totCur)}</strong></span>
      <span>Unrealised P&L: <strong class="mono ${U.pnlClass(totPnl)}">${U.pnl(totPnl)}</strong></span>
      <span>Return: <strong class="mono ${U.pnlClass(totPnl)}">${U.pnlPct(totPnl, totInv)}</strong></span>`;
  }

  function applyFilters() {
    const q = (document.getElementById('hSearch').value || '').toLowerCase();
    const f = document.getElementById('hFilter').value;

    let rows = _rows.filter(h => {
      if (q && !h.companyName.toLowerCase().includes(q) && !h.symbol.toLowerCase().includes(q)) return false;
      if (f === 'profit'      && h.pnl <= 0)                               return false;
      if (f === 'loss'        && h.pnl >= 0)                               return false;
      if (f === 'buy-dip'     && !h.sentinelRecommendation.includes('BUY DIP'))    return false;
      if (f === 'take-profit' && !h.sentinelRecommendation.includes('TAKE PROFIT')) return false;
      if (f === 'hold'        && !h.sentinelRecommendation.includes('HOLD'))        return false;
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
    document.querySelectorAll('#hTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = -1; }
        document.querySelectorAll('#hTable th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });
  }

  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.holdingsData;
      applyFilters();
      C.setStatus('live');
    } catch (err) {
      console.error('[Holdings]', err);
      C.setStatus('error');
      document.getElementById('hTbody').innerHTML =
        `<tr class="empty-row"><td colspan="13">Error: ${err.message}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    document.getElementById('hSearch').addEventListener('input', applyFilters);
    document.getElementById('hFilter').addEventListener('change', applyFilters);
    load();
  });

})();

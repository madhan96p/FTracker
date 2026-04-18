/**
 * investments/Investments.js
 * Individual buy transactions from Investments > Holdings table.
 * Each row = one purchase order (not aggregated by company).
 */
(function () {
  'use strict';
  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;
  let _rows = [];

  function render(rows) {
    const tbody = document.getElementById('invTbody');
    if (!rows.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No data</td></tr>'; return; }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${r.companyName}</strong></td>
        <td class="mono">${r.ticker}</td>
        <td class="mono">${U.shortDate(r.date)}</td>
        <td class="mono">${U.₹(r.orderPrice)}</td>
        <td class="mono">${r.filledQty}</td>
        <td class="mono">${U.₹(r.currentPrice)}</td>
        <td class="mono muted">${r.buyingBrokerage ? U.₹(r.buyingBrokerage) : '—'}</td>
        <td class="mono">${U.₹(r.invested)}</td>
        <td class="mono">${U.₹(r.current)}</td>
        <td class="mono ${U.pnlClass(r.netPnl)}"><strong>${U.pnl(r.netPnl)}</strong></td>
        <td class="mono ${U.pnlClass(r.grossPnl)}">${U.pnl(r.grossPnl)}</td>
        <td class="mono ${U.pnlClass(r.pnlPct)}">${U.pct(r.pnlPct)}</td>
      </tr>`).join('');

    const totInv = U.sum(rows.map(r => r.invested));
    const totCur = U.sum(rows.map(r => r.current));
    const totNet = U.sum(rows.map(r => r.netPnl));
    document.getElementById('invFooter').innerHTML = `
      <span>${rows.length} transactions</span>
      <span>Invested: <strong class="mono">${U.₹(totInv)}</strong></span>
      <span>Current: <strong class="mono">${U.₹(totCur)}</strong></span>
      <span>Net P&L: <strong class="mono ${U.pnlClass(totNet)}">${U.pnl(totNet)}</strong></span>`;
  }

  function applySearch() {
    const q = (document.getElementById('invSearch').value || '').toLowerCase();
    render(_rows.filter(r => !q || r.companyName.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)));
  }

  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.investments.holdings;
      applySearch();
      C.setStatus('live');
    } catch (err) { C.setStatus('error'); console.error(err); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject(); C.wireRefreshBtn(load);
    document.getElementById('invSearch').addEventListener('input', applySearch);
    load();
  });
})();

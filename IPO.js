/**
 * ipo/IPO.js
 * IPO Investments page.
 * Data source: Investments sheet → IPOs table
 * Same column structure as Holdings transactions.
 *
 * STATUS BADGE:
 *   Current > Order Price  → "GAIN"  (profit)
 *   Current < Order Price  → "LOSS"
 *   Current = Order Price  → "BREAK-EVEN"
 */

(function () {
  'use strict';

  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;

  let _rows = [];
  let _sort = { col: 'date', dir: -1 };

  /* ── Status badge ──────────────────────────────────────── */
  function statusBadge(row) {
    const diff = row.currentPrice - row.orderPrice;
    if (diff > 0)  return '<span class="badge badge-profit">GAIN</span>';
    if (diff < 0)  return '<span class="badge badge-loss">LOSS</span>';
    return '<span class="badge badge-neutral">FLAT</span>';
  }

  /* ── Summary strip ─────────────────────────────────────── */
  function renderSummary(rows) {
    const totInv  = U.sum(rows.map(r => r.invested));
    const totCur  = U.sum(rows.map(r => r.current));
    const totNet  = U.sum(rows.map(r => r.netPnl));
    const gains   = rows.filter(r => r.netPnl > 0).length;
    const losses  = rows.filter(r => r.netPnl < 0).length;

    document.getElementById('ipoSummary').innerHTML = [
      { lbl: 'IPOs Applied',  val: rows.length,             cls: ''                   },
      { lbl: 'Gains',         val: gains,                   cls: 'profit'             },
      { lbl: 'Losses',        val: losses,                  cls: 'loss'               },
      { lbl: 'Total Invested',val: U.₹(totInv),             cls: ''                   },
      { lbl: 'Current Value', val: U.₹(totCur),             cls: ''                   },
      { lbl: 'Net P&L',       val: U.pnl(totNet),           cls: U.pnlClass(totNet)   },
    ].map(i => `
      <div class="ipo-stat">
        <div class="lbl">${i.lbl}</div>
        <div class="val ${i.cls}">${i.val}</div>
      </div>`).join('');
  }

  /* ── Table render ──────────────────────────────────────── */
  function render(rows) {
    renderSummary(rows);

    const tbody = document.getElementById('ipoTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="13">No IPO data</td></tr>';
      document.getElementById('ipoFooter').innerHTML = '';
      return;
    }

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
        <td>${statusBadge(r)}</td>
      </tr>`).join('');

    const totInv = U.sum(rows.map(r => r.invested));
    const totCur = U.sum(rows.map(r => r.current));
    const totNet = U.sum(rows.map(r => r.netPnl));
    document.getElementById('ipoFooter').innerHTML = `
      <span>${rows.length} IPOs</span>
      <span>Invested: <strong class="mono">${U.₹(totInv)}</strong></span>
      <span>Current: <strong class="mono">${U.₹(totCur)}</strong></span>
      <span>Net P&L: <strong class="mono ${U.pnlClass(totNet)}">${U.pnl(totNet)}</strong></span>`;
  }

  /* ── Filter + sort ─────────────────────────────────────── */
  function applyFilters() {
    const q = (document.getElementById('ipoSearch').value || '').toLowerCase();

    let rows = _rows.filter(r =>
      !q || r.companyName.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)
    );

    const col = _sort.col;
    rows = [...rows].sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') av = av.toLowerCase();
      return av < bv ? _sort.dir : av > bv ? -_sort.dir : 0;
    });

    render(rows);
  }

  function bindSort() {
    document.querySelectorAll('#ipoTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = -1; }
        document.querySelectorAll('#ipoTable th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });
  }

  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.investments.ipos;
      applyFilters();
      C.setStatus('live');
    } catch (err) {
      console.error('[IPO]', err);
      C.setStatus('error');
      document.getElementById('ipoTbody').innerHTML =
        `<tr class="empty-row"><td colspan="13">Error: ${err.message}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    document.getElementById('ipoSearch').addEventListener('input', applyFilters);
    load();
  });

})();

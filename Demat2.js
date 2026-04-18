/**
 * demat2/Demat2.js — Demat Account 2 (76k) page
 * Same table structure as Investments > Holdings.
 * Source: "Demat 2 76k" sheet → "Demat 2 investments" table.
 */

(function () {
  'use strict';

  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;

  let _rows = [];
  let _sort = { col: 'netPnl', dir: -1 };

  function renderStats(rows) {
    const totInv = U.sum(rows.map(r => r.invested));
    const totCur = U.sum(rows.map(r => r.current));
    const totNet = U.sum(rows.map(r => r.netPnl));
    const gains  = rows.filter(r => r.netPnl > 0).length;
    const losses = rows.filter(r => r.netPnl < 0).length;

    document.getElementById('d2Stats').innerHTML = [
      { label: 'Total Invested', value: U.₹(totInv),     sub: `${rows.length} positions`,   accent: 'gold-accent'  },
      { label: 'Current Value',  value: U.₹(totCur),     sub: '',                            accent: ''             },
      { label: 'Net P&L',       value: U.pnl(totNet),    sub: U.pnlPct(totNet, totInv),      accent: totNet >= 0 ? 'profit-accent' : 'loss-accent', valCls: U.pnlClass(totNet) },
      { label: 'Gainers / Losers', value: `${gains}G · ${losses}L`, sub: '', accent: '' },
    ].map(s => `
      <div class="stat-card ${s.accent}">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value mono ${s.valCls || ''}">${s.value}</div>
        <div class="stat-sub">${s.sub}</div>
      </div>`).join('');
  }

  function render(rows) {
    renderStats(_rows);  // always show totals from full dataset

    const tbody = document.getElementById('d2Tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No data</td></tr>';
      document.getElementById('d2Footer').innerHTML = '';
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
      </tr>`).join('');

    const totInv = U.sum(rows.map(r => r.invested));
    const totCur = U.sum(rows.map(r => r.current));
    const totNet = U.sum(rows.map(r => r.netPnl));
    document.getElementById('d2Footer').innerHTML = `
      <span>${rows.length} rows</span>
      <span>Invested: <strong class="mono">${U.₹(totInv)}</strong></span>
      <span>Current: <strong class="mono">${U.₹(totCur)}</strong></span>
      <span>Net P&L: <strong class="mono ${U.pnlClass(totNet)}">${U.pnl(totNet)}</strong></span>`;
  }

  function applyFilters() {
    const q = (document.getElementById('d2Search').value || '').toLowerCase();
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
    document.querySelectorAll('#d2Table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = -1; }
        document.querySelectorAll('#d2Table th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });
  }

  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.demat2;
      applyFilters();
      C.setStatus('live');
    } catch (err) {
      console.error('[Demat2]', err);
      C.setStatus('error');
      document.getElementById('d2Tbody').innerHTML =
        `<tr class="empty-row"><td colspan="12">Error: ${err.message}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    document.getElementById('d2Search').addEventListener('input', applyFilters);
    load();
  });

})();

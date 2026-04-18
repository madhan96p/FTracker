/**
 * fo/FO.js — F&O Trades page
 * ═══════════════════════════════════════════════════════════
 * Renders the full F&O trade table with:
 *  - Search by instrument name
 *  - Filter: All / Trades Only / Wins / Losses
 *  - Click-to-sort on any column
 *  - Summary strip (Net P&L, Mail P&L, Tax Leakage, Win Rate)
 *  - Transfer rows shown with dimmed style
 *  - Footer with aggregate totals for visible rows
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U = window.FT_UTILS;
  const C = window.FT_COMPONENTS;

  /* State */
  let _allRows = [];
  let _sort = { col: 'date', dir: -1 };  // -1=desc, 1=asc

  /* ── Render summary strip ──────────────────────────────── */
  function renderSummary(rows) {
    const trades = rows.filter(r => !r.isTransfer);
    const wins   = trades.filter(r => r.netPnl > 0);
    const netPnl = U.sum(trades.map(r => r.netPnl));
    const mailPnl= U.sum(trades.map(r => r.mailData));
    const leak   = netPnl - mailPnl;

    document.getElementById('foSummary').innerHTML = [
      { lbl: 'Net P&L',    val: U.pnl(netPnl),  cls: U.pnlClass(netPnl)  },
      { lbl: 'Mail P&L',   val: U.pnl(mailPnl), cls: U.pnlClass(mailPnl) },
      { lbl: 'Tax Leakage',val: U.pnl(leak),    cls: U.pnlClass(leak)    },
      { lbl: 'Trades',     val: trades.length,  cls: ''                   },
      { lbl: 'Win Rate',   val: trades.length ? (wins.length/trades.length*100).toFixed(1)+'%' : '—', cls: '' },
    ].map(i => `
      <div class="fo-summary-item">
        <div class="lbl">${i.lbl}</div>
        <div class="val ${i.cls}">${i.val}</div>
      </div>`).join('');
  }

  /* ── Render table ──────────────────────────────────────── */
  function renderTable(rows) {
    const tbody = document.getElementById('foTbody');

    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No rows match</td></tr>';
      document.getElementById('foFooter').innerHTML = '';
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const trClass = r.isTransfer ? 'row-transfer' : '';
      return `
        <tr class="${trClass}">
          <td class="mono">${U.shortDate(r.date)}</td>
          <td><strong>${r.instrument}</strong></td>
          <td class="mono">${r.qty || '—'}</td>
          <td class="mono">${r.entryPrice ? U.₹(r.entryPrice) : '—'}</td>
          <td class="mono">${r.exitPrice  ? U.₹(r.exitPrice)  : '—'}</td>
          <td class="mono ${U.pnlClass(r.grossPnl)}">${U.pnl(r.grossPnl)}</td>
          <td class="mono">${U.₹(r.charges)}</td>
          <td class="mono ${U.pnlClass(r.netPnl)}"><strong>${U.pnl(r.netPnl)}</strong></td>
          <td class="mono ${U.pnlClass(r.mailData)}">${r.isTransfer ? '—' : U.pnl(r.mailData)}</td>
          <td>${r.slippageAudit || '—'}</td>
          <td class="mono">${U.formatTime(r.timeIn)}</td>
          <td class="mono">${r.duration || '—'}</td>
        </tr>`;
    }).join('');

    /* Footer totals */
    const trades = rows.filter(r => !r.isTransfer);
    const totNet  = U.sum(trades.map(r => r.netPnl));
    const totMail = U.sum(trades.map(r => r.mailData));
    const totChg  = U.sum(trades.map(r => r.charges));
    document.getElementById('foFooter').innerHTML = `
      <span>${rows.length} rows (${trades.length} trades)</span>
      <span>Net P&L: <strong class="mono ${U.pnlClass(totNet)}">${U.pnl(totNet)}</strong></span>
      <span>Mail P&L: <strong class="mono ${U.pnlClass(totMail)}">${U.pnl(totMail)}</strong></span>
      <span>Charges: <strong class="mono">${U.₹(totChg)}</strong></span>`;
  }

  /* ── Filter + Sort → render ────────────────────────────── */
  function applyFilters() {
    const q      = (document.getElementById('foSearch').value || '').toLowerCase();
    const filter = document.getElementById('foFilter').value;

    let rows = _allRows.filter(r => {
      if (q && !r.instrument.toLowerCase().includes(q)) return false;
      if (filter === 'trades' && r.isTransfer)           return false;
      if (filter === 'win'    && (r.isTransfer || r.netPnl <= 0)) return false;
      if (filter === 'loss'   && (r.isTransfer || r.netPnl >= 0)) return false;
      return true;
    });

    /* Sort */
    const col = _sort.col;
    rows = [...rows].sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? _sort.dir : av > bv ? -_sort.dir : 0;
    });

    renderSummary(rows);
    renderTable(rows);
  }

  /* ── Sort header click ─────────────────────────────────── */
  function bindSort() {
    document.querySelectorAll('#foTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = -1; }
        // Update arrow indicators
        document.querySelectorAll('#foTable th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applyFilters();
      });
    });
  }

  /* ── Main load ─────────────────────────────────────────── */
  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _allRows = data.fo;
      applyFilters();
      C.setStatus('live');
    } catch (err) {
      console.error('[FO]', err);
      C.setStatus('error');
      document.getElementById('foTbody').innerHTML =
        `<tr class="empty-row"><td colspan="12">Error: ${err.message}</td></tr>`;
    }
  }

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    document.getElementById('foSearch').addEventListener('input', applyFilters);
    document.getElementById('foFilter').addEventListener('change', applyFilters);
    load();
  });

})();

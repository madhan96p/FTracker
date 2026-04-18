/**
 * log/Log.js — Trade Transaction Log page
 * ═══════════════════════════════════════════════════════════
 * Data: Investments sheet → Trade_Transaction_Log table
 *
 * Each row = one TRADING DAY (aggregated by Apps Script formulas):
 *   Date         = unique dates from Table1[Date]
 *   Avg Entry    = AVERAGEIFS across all trades on that date
 *   Avg Exit     = AVERAGEIFS across all trades on that date
 *   Total Qty    = SUMIFS(Table1[Qty], date matches)
 *   Total In     = Total Qty × Avg Entry
 *   Total Out    = Total Qty × Avg Exit
 *   Gross P&L    = Total Out − Total In
 *   Net P&L      = SUMIFS(Table1[Net P&L], date matches)
 *   Total        = Running balance (starts ₹25,000)
 *
 * IMPORTANT:
 *   Gross P&L = (Exit − Entry) × Qty  → raw movement
 *   Net P&L   = after charges          → broker-verified
 *   Difference between Gross and Net = charges/taxes for that day
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U   = window.FT_UTILS;
  const C   = window.FT_COMPONENTS;
  const CFG = window.FT_CONFIG;

  Chart.defaults.color       = '#7b8fa1';
  Chart.defaults.font.family = "'Sora', sans-serif";

  let _balanceChart = null;

  /* ── Summary strip ─────────────────────────────────────── */
  function renderSummary(rows) {
    if (!rows.length) return;

    const totNet  = U.sum(rows.map(r => r.netPnl));
    const totGross= U.sum(rows.map(r => r.grossPnl));
    const charges = totGross - totNet;           // implied charges = Gross - Net
    const wins    = rows.filter(r => r.netPnl > 0).length;
    const latest  = rows[rows.length - 1].total;
    const gain    = latest - CFG.FO_STARTING_CAPITAL;

    document.getElementById('logSummary').innerHTML = [
      { lbl: 'Trading Days',   val: rows.length,     cls: ''                },
      { lbl: 'Win Days',       val: wins,             cls: 'profit'          },
      { lbl: 'Loss Days',      val: rows.length-wins, cls: 'loss'           },
      { lbl: 'Total Net P&L',  val: U.pnl(totNet),   cls: U.pnlClass(totNet)},
      { lbl: 'Total Gross P&L',val: U.pnl(totGross), cls: U.pnlClass(totGross)},
      { lbl: 'Implied Charges',val: U.₹(charges),    cls: 'loss'            },
      { lbl: 'Current Balance',val: U.₹(latest),     cls: ''                },
      { lbl: 'Total Gain',     val: U.pnl(gain),     cls: U.pnlClass(gain)  },
    ].map(i => `
      <div class="log-stat">
        <div class="lbl">${i.lbl}</div>
        <div class="val ${i.cls}">${i.val}</div>
      </div>`).join('');
  }

  /* ── Running balance chart ─────────────────────────────── */
  function renderBalanceChart(rows) {
    if (_balanceChart) { _balanceChart.destroy(); _balanceChart = null; }
    const ctx = document.getElementById('balanceChart');
    if (!ctx || !rows.length) return;

    const labels = rows.map(r => U.shortDate(r.date));
    const values = rows.map(r => r.total);
    const latest = values[values.length - 1];
    const color  = latest >= CFG.FO_STARTING_CAPITAL ? '#00c896' : '#ff4757';

    _balanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label:           'Demat Balance',
            data:            values,
            borderColor:     color,
            backgroundColor: color === '#00c896' ? 'rgba(0,200,150,.08)' : 'rgba(255,71,87,.08)',
            fill:            true,
            tension:         .35,
            pointRadius:     4,
            pointBackgroundColor: color,
            borderWidth:     2.5,
          },
          {
            /* Starting capital reference line */
            label: 'Starting Capital',
            data:  values.map(() => CFG.FO_STARTING_CAPITAL),
            borderColor:     'rgba(72,149,239,.4)',
            borderDash:      [5, 5],
            borderWidth:     1.5,
            pointRadius:     0,
            fill:            false,
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend:  { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.₹(c.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#4a5d6e' } },
          y: {
            grid:  { color: 'rgba(30,45,64,.5)' },
            ticks: { color: '#4a5d6e', callback: v => U.compact(v) }
          }
        }
      }
    });
  }

  /* ── Table ─────────────────────────────────────────────── */
  function renderTable(rows) {
    const tbody = document.getElementById('logTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No trade log data</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td class="mono muted">${r.slNo || i + 1}</td>
        <td class="mono"><strong>${U.shortDate(r.date)}</strong></td>
        <td class="mono">${U.₹(r.entryPrice)}</td>
        <td class="mono">${U.₹(r.exitPrice)}</td>
        <td class="mono">${r.qty}</td>
        <td class="mono">${U.₹(r.totalIn)}</td>
        <td class="mono">${U.₹(r.totalOut)}</td>
        <td class="mono ${U.pnlClass(r.grossPnl)}">${U.pnl(r.grossPnl)}</td>
        <td class="mono ${U.pnlClass(r.netPnl)}"><strong>${U.pnl(r.netPnl)}</strong></td>
        <td class="mono ${r.total >= CFG.FO_STARTING_CAPITAL ? 'profit' : 'loss'}">
          <strong>${U.₹(r.total)}</strong>
        </td>
      </tr>`).join('');

    /* Footer */
    const totNet  = U.sum(rows.map(r => r.netPnl));
    const totGross= U.sum(rows.map(r => r.grossPnl));
    document.getElementById('logFooter').innerHTML = `
      <span>${rows.length} trading days</span>
      <span>Total Gross: <strong class="mono ${U.pnlClass(totGross)}">${U.pnl(totGross)}</strong></span>
      <span>Total Net: <strong class="mono ${U.pnlClass(totNet)}">${U.pnl(totNet)}</strong></span>
      <span>Implied Charges: <strong class="mono loss">${U.₹(totGross - totNet)}</strong></span>`;
  }

  /* ── Sort ──────────────────────────────────────────────── */
  let _rows = [];
  let _sort = { col: 'date', dir: 1 };

  function applySort() {
    const col = _sort.col;
    const sorted = [..._rows].sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') av = av.toLowerCase();
      return av < bv ? _sort.dir : av > bv ? -_sort.dir : 0;
    });
    renderTable(sorted);
  }

  function bindSort() {
    document.querySelectorAll('#logTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sort.col === col) _sort.dir *= -1;
        else { _sort.col = col; _sort.dir = 1; }
        document.querySelectorAll('#logTable th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(_sort.dir === 1 ? 'sort-asc' : 'sort-desc');
        applySort();
      });
    });
  }

  /* ── Load ──────────────────────────────────────────────── */
  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      _rows = data.investments.tradeLog;

      renderSummary(_rows);
      renderBalanceChart(_rows);
      renderTable(_rows);

      C.setStatus('live');
    } catch (err) {
      console.error('[Log]', err);
      C.setStatus('error');
      document.getElementById('logTbody').innerHTML =
        `<tr class="empty-row"><td colspan="10">Error: ${err.message}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    bindSort();
    load();
  });

})();

/**
 * dashboard/Dashboard.js
 * ═══════════════════════════════════════════════════════════
 * Dashboard page logic.
 *
 * WHAT THIS FILE DOES:
 *  1. Calls FT_COMPONENTS.inject() → puts sidebar + header in DOM
 *  2. Calls FT_SHEETS.load()       → fetches + parses all data
 *  3. Renders KPI stat cards
 *  4. Renders F&O breakdown section
 *  5. Renders 4 mini charts (win/loss, cumulative P&L, allocation, sector)
 *  6. Renders recent F&O trades table (last 8)
 *  7. Renders top holdings table (sorted by P&L)
 *
 * READING THE CODE:
 *  - U  = window.FT_UTILS    (formatters)
 *  - CFG = window.FT_CONFIG  (constants)
 *  - C  = window.FT_COMPONENTS (nav/status)
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U   = window.FT_UTILS;
  const CFG = window.FT_CONFIG;
  const C   = window.FT_COMPONENTS;

  /* ── Chart.js shared theme defaults ────────────────────── */
  Chart.defaults.color       = '#7b8fa1';
  Chart.defaults.font.family = "'Sora', sans-serif";
  Chart.defaults.font.size   = 11;

  const COLORS = {
    profit:  '#00c896',
    loss:    '#ff4757',
    neutral: '#4895ef',
    gold:    '#ffd23f',
    purple:  '#9b5de5',
    grid:    'rgba(30,45,64,.5)',
  };

  /* Active Chart.js instances — destroyed before re-render */
  const _charts = {};

  function destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
  }

  /* ══════════════════════════════════════════════════════════
     KPI CARDS
     ══════════════════════════════════════════════════════════ */
  function renderKPIs(summary) {
    const cards = [
      {
        label:   'F&O Net P&L',
        value:   U.pnl(summary.foNetPnl),
        sub:     `Mail: ${U.pnl(summary.foMailPnl)}`,
        accent:  summary.foNetPnl >= 0 ? 'profit-accent' : 'loss-accent',
        valCls:  U.pnlClass(summary.foNetPnl),
      },
      {
        label:   'Holdings P&L',
        value:   U.pnl(summary.holdingsPnl),
        sub:     `Invested: ${U.₹(summary.holdingsTotalInvested)}`,
        accent:  summary.holdingsPnl >= 0 ? 'profit-accent' : 'loss-accent',
        valCls:  U.pnlClass(summary.holdingsPnl),
      },
      {
        label:   'Overall P&L',
        value:   U.pnl(summary.overallPnl),
        sub:     'F&O + Holdings + IPO',
        accent:  summary.overallPnl >= 0 ? 'profit-accent' : 'loss-accent',
        valCls:  U.pnlClass(summary.overallPnl),
      },
      {
        label:   'Win Rate',
        value:   summary.winRate.toFixed(1) + '%',
        sub:     `${summary.winCount}W / ${summary.lossCount}L from ${summary.tradeCount} trades`,
        accent:  'purple-accent',
        valCls:  '',
      },
      {
        label:   'In Demat',
        value:   U.₹(summary.inDemat),
        sub:     `Balance: ${U.₹(summary.latestBalance)}`,
        accent:  'gold-accent',
        valCls:  'gold',
      },
      {
        label:   'Tax Leakage',
        value:   U.pnl(summary.taxLeakage),
        sub:     'My Calc vs Broker Mail',
        accent:  summary.taxLeakage >= 0 ? '' : 'loss-accent',
        valCls:  U.pnlClass(summary.taxLeakage),
      },
    ];

    document.getElementById('kpiGrid').innerHTML = cards.map(c => `
      <div class="stat-card ${c.accent}">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value mono ${c.valCls}">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════════════════════════
     F&O BREAKDOWN SECTION
     Mirrors the Investments sheet summary formulas exactly.
     ══════════════════════════════════════════════════════════ */
  function renderFOBreakdown(summary) {
    const wf = summary.winFactor !== null
      ? summary.winFactor.toFixed(2) + 'x'
      : 'N/A';

    document.getElementById('foBreakdown').innerHTML = `
      <div class="breakdown-item">
        <div class="breakdown-label">My Calc Net P&L</div>
        <div class="breakdown-value ${U.pnlClass(summary.foNetPnl)}">${U.pnl(summary.foNetPnl)}</div>
        <div class="breakdown-hint">SUM(Table1[Net P&L])</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Actual Mail P&L</div>
        <div class="breakdown-value ${U.pnlClass(summary.foMailPnl)}">${U.pnl(summary.foMailPnl)}</div>
        <div class="breakdown-hint">SUM(Table1[Mail Data])</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Tax Leakage</div>
        <div class="breakdown-value ${U.pnlClass(summary.taxLeakage)}">${U.pnl(summary.taxLeakage)}</div>
        <div class="breakdown-hint">Net - Mail</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Win Factor</div>
        <div class="breakdown-value gold">${wf}</div>
        <div class="breakdown-hint">|Wins / Losses|</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Gross Wins</div>
        <div class="breakdown-value profit">${U.₹(summary.grossWins)}</div>
        <div class="breakdown-hint">SUMIF(Mail Data, >0)</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Gross Losses</div>
        <div class="breakdown-value loss">${U.₹(Math.abs(summary.grossLosses))}</div>
        <div class="breakdown-hint">SUMIF(Mail Data, <0)</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Total Capital In</div>
        <div class="breakdown-value">${U.₹(summary.totalCapIn)}</div>
        <div class="breakdown-hint">SUMPRODUCT(Entry × Qty)</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Total Capital Out</div>
        <div class="breakdown-value">${U.₹(summary.totalCapOut)}</div>
        <div class="breakdown-hint">SUMPRODUCT(Exit × Qty)</div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     CHARTS
     ══════════════════════════════════════════════════════════ */

  /* Win / Loss Donut */
  function renderWinLossChart(summary) {
    destroyChart('winLoss');
    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;

    _charts.winLoss = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          data:            [summary.winCount, summary.lossCount],
          backgroundColor: [COLORS.profit, COLORS.loss],
          borderColor:     '#111827',
          borderWidth:     3,
          hoverOffset:     6,
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} trades`,
            }
          }
        }
      }
    });
  }

  /* Cumulative P&L Line (from Trade Log running total) */
  function renderCumulativePnlChart(tradeLog) {
    destroyChart('cumulativePnl');
    const ctx = document.getElementById('cumulativePnlChart');
    if (!ctx || !tradeLog.length) return;

    const labels = tradeLog.map(r => U.shortDate(r.date));
    const values = tradeLog.map(r => r.total);
    const latest = values[values.length - 1] || 0;
    const color  = latest >= CFG.FO_STARTING_CAPITAL ? COLORS.profit : COLORS.loss;

    _charts.cumulativePnl = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:           'Demat Balance',
          data:            values,
          borderColor:     color,
          backgroundColor: color === COLORS.profit ? 'rgba(0,200,150,.08)' : 'rgba(255,71,87,.08)',
          fill:            true,
          tension:         .4,
          pointRadius:     3,
          pointBackgroundColor: color,
          borderWidth:     2,
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` Balance: ${U.₹(c.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#4a5d6e' } },
          y: {
            grid: { color: COLORS.grid },
            ticks: { color: '#4a5d6e', callback: v => U.compact(v) }
          }
        }
      }
    });
  }

  /* Portfolio Allocation Donut (F&O Capital + Holdings + IPO) */
  function renderAllocationChart(summary) {
    destroyChart('allocation');
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;

    _charts.allocation = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Holdings Invested', 'IPO Invested', 'F&O Capital In'],
        datasets: [{
          data: [
            summary.holdingsTotalInvested,
            summary.ipoInvested,
            summary.totalCapIn,
          ],
          backgroundColor: [COLORS.neutral, COLORS.gold, COLORS.purple],
          borderColor:     '#111827',
          borderWidth:     3,
          hoverOffset:     4,
        }]
      },
      options: {
        responsive: true,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${U.₹(c.raw)}` } }
        }
      }
    });
  }

  /* Sector Distribution Donut (from Holdings Data) */
  function renderSectorChart(holdingsData) {
    destroyChart('sector');
    const ctx = document.getElementById('sectorChart');
    if (!ctx || !holdingsData.length) return;

    // Group by sector
    const bySector = {};
    holdingsData.forEach(h => {
      bySector[h.sector] = (bySector[h.sector] || 0) + h.currentValue;
    });

    const palette = [COLORS.profit, COLORS.neutral, COLORS.gold, COLORS.purple, COLORS.loss,
                     '#e040fb', '#ff9f1c', '#2ec4b6', '#cbf3f0'];
    const labels  = Object.keys(bySector);
    const values  = labels.map(s => bySector[s]);

    _charts.sector = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderColor:     '#111827',
          borderWidth:     2,
          hoverOffset:     4,
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${U.₹(c.raw)}` } }
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     RECENT F&O TRADES TABLE  (last 8 non-transfer rows)
     ══════════════════════════════════════════════════════════ */
  function renderRecentFO(fo) {
    const recent = fo
      .filter(r => !r.isTransfer)
      .slice(-8)
      .reverse();

    const tbody = document.getElementById('recentFoTbody');

    if (!recent.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No trades yet</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(r => `
      <tr>
        <td class="mono">${U.shortDate(r.date)}</td>
        <td><strong>${r.instrument}</strong></td>
        <td class="mono">${r.qty}</td>
        <td class="mono">${U.₹(r.entryPrice)}</td>
        <td class="mono">${U.₹(r.exitPrice)}</td>
        <td class="mono ${U.pnlClass(r.netPnl)}"><strong>${U.pnl(r.netPnl)}</strong></td>
        <td class="mono ${U.pnlClass(r.mailData)}">${U.pnl(r.mailData)}</td>
        <td style="font-size:11px;color:var(--text-secondary)">${r.slippageAudit || '—'}</td>
      </tr>`).join('');
  }

  /* ══════════════════════════════════════════════════════════
     TOP HOLDINGS TABLE  (sorted by absolute P&L desc)
     ══════════════════════════════════════════════════════════ */
  function renderTopHoldings(holdingsData) {
    const sorted = [...holdingsData]
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 6);

    const tbody = document.getElementById('topHoldingsTbody');

    if (!sorted.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No holdings data</td></tr>';
      return;
    }

    tbody.innerHTML = sorted.map(h => `
      <tr>
        <td><strong>${h.companyName}</strong><br/><span class="mono muted">${h.symbol}</span></td>
        <td><span class="badge badge-neutral" style="font-size:10px">${h.sector}</span></td>
        <td class="mono">${U.₹(h.totalInvested)}</td>
        <td class="mono">${U.₹(h.currentValue)}</td>
        <td class="mono ${U.pnlClass(h.pnl)}"><strong>${U.pnl(h.pnl)}</strong></td>
        <td class="mono ${U.pnlClass(h.pnlPct)}">${U.pct(h.pnlPct)}</td>
        <td>
          <span class="badge ${U.sentinelBadgeClass(h.masterSentinel)}" style="font-size:10px">
            ${h.masterSentinel}
          </span>
        </td>
      </tr>`).join('');
  }

  /* ══════════════════════════════════════════════════════════
     MAIN LOAD FUNCTION
     ══════════════════════════════════════════════════════════ */
  async function load() {
    C.setStatus('loading', 'Loading…');

    try {
      const data = await window.FT_SHEETS.load();
      const { fo, holdingsData, investments, summary } = data;

      renderKPIs(summary);
      renderFOBreakdown(summary);
      renderWinLossChart(summary);
      renderCumulativePnlChart(investments.tradeLog);
      renderAllocationChart(summary);
      renderSectorChart(holdingsData);
      renderRecentFO(fo);
      renderTopHoldings(holdingsData);

      C.setStatus('live', 'Live');
    } catch (err) {
      console.error('[Dashboard]', err);
      C.setStatus('error', 'Error');
      document.getElementById('kpiGrid').innerHTML = `
        <div class="stat-card loss-accent" style="grid-column:1/-1;text-align:center;padding:2rem">
          <div class="stat-label">Connection Error</div>
          <div class="stat-value" style="font-size:14px;color:var(--loss)">${err.message}</div>
          <div class="stat-sub" style="margin-top:.5rem">Open ⚙ Settings and verify your Apps Script URL</div>
        </div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════
     INIT  (runs when DOM is ready)
     ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject shared sidebar + header + settings modal
    C.inject();

    // 2. Wire refresh button
    C.wireRefreshBtn(load);

    // 3. Load data
    load();

    // 4. Auto-refresh if configured
    if (CFG.REFRESH_INTERVAL > 0) {
      setInterval(load, CFG.REFRESH_INTERVAL);
    }
  });

})();

/**
 * analytics/Analytics.js
 * ═══════════════════════════════════════════════════════════
 * Renders all 7 analytics charts.
 *
 * DATA SOURCES:
 *   fo            → F&O raw trade rows
 *   tradeLog      → Daily aggregated log (for cumulative balance line)
 *   holdingsData  → Aggregated holdings (for sector + distribution)
 *
 * CHART INVENTORY:
 *   1. cumulativePnlChart  — Running demat balance line (from tradeLog.total)
 *   2. winLossChart        — Win/Loss count donut
 *   3. dailyPnlChart       — Net P&L per day bar
 *   4. mailVsCalcChart     — My Calc vs Broker Mail grouped bar (per day)
 *   5. sectorChart         — Holdings sector donut
 *   6. capitalChart        — Capital deployed per day bar
 *   7. holdingsDistChart   — Holdings current value donut
 * ═══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const U   = window.FT_UTILS;
  const C   = window.FT_COMPONENTS;
  const CFG = window.FT_CONFIG;

  /* ── Chart.js defaults ──────────────────────────────────── */
  Chart.defaults.color       = '#7b8fa1';
  Chart.defaults.font.family = "'Sora', sans-serif";
  Chart.defaults.font.size   = 11;

  const CLR = {
    profit:  '#00c896',
    loss:    '#ff4757',
    neutral: '#4895ef',
    gold:    '#ffd23f',
    purple:  '#9b5de5',
    grid:    'rgba(30,45,64,.5)',
    muted:   '#4a5d6e',
  };

  const PALETTE = [CLR.profit, CLR.neutral, CLR.gold, CLR.purple, CLR.loss,
                   '#e040fb', '#ff9f1c', '#2ec4b6', '#cbf3f0', '#ff6b6b'];

  const _charts = {};
  function destroy(id) { if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; } }

  /* Shared scale factories */
  const xScale  = () => ({ grid: { display: false }, ticks: { color: CLR.muted } });
  const yScaleINR = () => ({
    grid:  { color: CLR.grid },
    ticks: { color: CLR.muted, callback: v => U.compact(v) }
  });

  /* ══════════════════════════════════════════════════════════
     1. CUMULATIVE P&L LINE
        Source: tradeLog.total  (running demat balance from ₹25k)
  ══════════════════════════════════════════════════════════ */
  function renderCumulativePnl(tradeLog) {
    destroy('cumulativePnl');
    const ctx = document.getElementById('cumulativePnlChart');
    if (!ctx || !tradeLog.length) return;

    const labels  = tradeLog.map(r => U.shortDate(r.date));
    const values  = tradeLog.map(r => r.total);
    const latest  = values[values.length - 1];
    const color   = latest >= CFG.FO_STARTING_CAPITAL ? CLR.profit : CLR.loss;

    _charts.cumulativePnl = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Demat Balance',
            data:  values,
            borderColor: color,
            backgroundColor: color === CLR.profit ? 'rgba(0,200,150,.08)' : 'rgba(255,71,87,.08)',
            fill: true, tension: .4, borderWidth: 2.5,
            pointRadius: 4, pointBackgroundColor: color,
          },
          {
            label: 'Starting Capital (₹25K)',
            data:  values.map(() => CFG.FO_STARTING_CAPITAL),
            borderColor: 'rgba(72,149,239,.35)',
            borderDash: [6, 4], borderWidth: 1.5,
            pointRadius: 0, fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.₹(c.raw)}` } }
        },
        scales: { x: xScale(), y: yScaleINR() }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     2. WIN / LOSS DONUT
        Source: fo (trade rows only)
  ══════════════════════════════════════════════════════════ */
  function renderWinLoss(fo) {
    destroy('winLoss');
    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;

    const trades = fo.filter(r => !r.isTransfer);
    const wins   = trades.filter(r => r.netPnl > 0).length;
    const losses = trades.filter(r => r.netPnl < 0).length;
    const flat   = trades.filter(r => r.netPnl === 0).length;

    const grossWins   = U.sum(trades.filter(r => r.mailData > 0).map(r => r.mailData));
    const grossLosses = U.sum(trades.filter(r => r.mailData < 0).map(r => r.mailData));

    _charts.winLoss = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses', 'Flat'],
        datasets: [{
          data:            [wins, losses, flat],
          backgroundColor: [CLR.profit, CLR.loss, CLR.muted],
          borderColor:     '#111827', borderWidth: 3, hoverOffset: 6,
        }]
      },
      options: {
        responsive: true, cutout: '65%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: c => {
                const pnl = c.label === 'Wins' ? grossWins : c.label === 'Losses' ? grossLosses : 0;
                return ` ${c.raw} trades ${pnl !== 0 ? '· ' + U.pnl(pnl) : ''}`;
              }
            }
          }
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. DAILY NET P&L BARS
        Source: tradeLog (grouped by date)
  ══════════════════════════════════════════════════════════ */
  function renderDailyPnl(tradeLog) {
    destroy('dailyPnl');
    const ctx = document.getElementById('dailyPnlChart');
    if (!ctx || !tradeLog.length) return;

    const labels = tradeLog.map(r => U.shortDate(r.date));
    const values = tradeLog.map(r => r.netPnl);

    _charts.dailyPnl = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Net P&L',
          data:  values,
          backgroundColor: values.map(v => v >= 0 ? 'rgba(0,200,150,.7)' : 'rgba(255,71,87,.7)'),
          borderColor:     values.map(v => v >= 0 ? CLR.profit : CLR.loss),
          borderWidth: 1, borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` Net P&L: ${U.pnl(c.raw)}` } }
        },
        scales: { x: xScale(), y: yScaleINR() }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     4. MY CALC vs BROKER MAIL — grouped bar
        Source: tradeLog for Net P&L + fo grouped by date for Mail P&L
  ══════════════════════════════════════════════════════════ */
  function renderMailVsCalc(tradeLog, fo) {
    destroy('mailVsCalc');
    const ctx = document.getElementById('mailVsCalcChart');
    if (!ctx || !tradeLog.length) return;

    /* Group Mail Data by date from fo rows */
    const mailByDate = {};
    fo.filter(r => !r.isTransfer).forEach(r => {
      const d = r.date;
      mailByDate[d] = (mailByDate[d] || 0) + r.mailData;
    });

    const labels   = tradeLog.map(r => U.shortDate(r.date));
    const calcVals = tradeLog.map(r => r.netPnl);
    const mailVals = tradeLog.map(r => mailByDate[r.date] || 0);

    _charts.mailVsCalc = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'My Calc Net P&L',
            data:  calcVals,
            backgroundColor: 'rgba(72,149,239,.7)',
            borderColor:     CLR.neutral,
            borderWidth: 1, borderRadius: 3,
          },
          {
            label: 'Broker Mail P&L',
            data:  mailVals,
            backgroundColor: 'rgba(0,200,150,.5)',
            borderColor:     CLR.profit,
            borderWidth: 1, borderRadius: 3,
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.pnl(c.raw)}` } }
        },
        scales: { x: xScale(), y: yScaleINR() }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     5. HOLDINGS SECTOR DONUT
        Source: holdingsData
  ══════════════════════════════════════════════════════════ */
  function renderSector(holdingsData) {
    destroy('sector');
    const ctx = document.getElementById('sectorChart');
    if (!ctx || !holdingsData.length) return;

    const bySector = {};
    holdingsData.forEach(h => {
      bySector[h.sector] = (bySector[h.sector] || 0) + h.currentValue;
    });

    const labels = Object.keys(bySector);
    const values = labels.map(s => bySector[s]);

    _charts.sector = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor:     '#111827', borderWidth: 2, hoverOffset: 4,
        }]
      },
      options: {
        responsive: true, cutout: '60%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${U.₹(c.raw)}` } }
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     6. CAPITAL DEPLOYED PER DAY
        Source: tradeLog.totalIn  (Total Qty × Avg Entry)
  ══════════════════════════════════════════════════════════ */
  function renderCapital(tradeLog) {
    destroy('capital');
    const ctx = document.getElementById('capitalChart');
    if (!ctx || !tradeLog.length) return;

    const labels = tradeLog.map(r => U.shortDate(r.date));
    const values = tradeLog.map(r => r.totalIn);

    _charts.capital = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Capital In (₹)',
          data:  values,
          backgroundColor: 'rgba(155,93,229,.6)',
          borderColor:     CLR.purple,
          borderWidth: 1, borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` Capital: ${U.₹(c.raw)}` } }
        },
        scales: { x: xScale(), y: yScaleINR() }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     7. HOLDINGS DISTRIBUTION DONUT
        Source: holdingsData by company
  ══════════════════════════════════════════════════════════ */
  function renderHoldingsDist(holdingsData) {
    destroy('holdingsDist');
    const ctx = document.getElementById('holdingsDistChart');
    if (!ctx || !holdingsData.length) return;

    const labels = holdingsData.map(h => h.symbol);
    const values = holdingsData.map(h => h.currentValue);

    _charts.holdingsDist = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor:     '#111827', borderWidth: 2, hoverOffset: 4,
        }]
      },
      options: {
        responsive: true, cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${U.₹(c.raw)}` } }
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MAIN LOAD
  ══════════════════════════════════════════════════════════ */
  async function load() {
    C.setStatus('loading');
    try {
      const data = await window.FT_SHEETS.load();
      const { fo, holdingsData, investments } = data;
      const { tradeLog } = investments;

      renderCumulativePnl(tradeLog);
      renderWinLoss(fo);
      renderDailyPnl(tradeLog);
      renderMailVsCalc(tradeLog, fo);
      renderSector(holdingsData);
      renderCapital(tradeLog);
      renderHoldingsDist(holdingsData);

      C.setStatus('live');
    } catch (err) {
      console.error('[Analytics]', err);
      C.setStatus('error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    C.inject();
    C.wireRefreshBtn(load);
    load();
  });

})();

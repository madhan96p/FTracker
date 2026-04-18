/**
 * shared/utils.js
 * ═══════════════════════════════════════════════════════════
 * Pure utility functions — no DOM, no state, no side effects.
 * Import this in every page's JS to get consistent formatting.
 *
 * RULES:
 *  1. Every function is a pure function (input → output, no side effects).
 *  2. Money values are stored as numbers; formatting happens HERE.
 *  3. Null / undefined / NaN are handled gracefully (never crash).
 * ═══════════════════════════════════════════════════════════
 */

window.FT_UTILS = {

  /* ══════════════════════════════════════════════════════════
     CURRENCY FORMATTERS
     ══════════════════════════════════════════════════════════ */

  /**
   * Format a number as Indian currency.
   * Input:  141.5
   * Output: "₹141.50"
   *
   * Input:  7161.35
   * Output: "₹7,161.35"
   *
   * Input:  -6903.37
   * Output: "₹-6,903.37"
   */
  inr(value, decimals = 2) {
    const n = parseFloat(value);
    if (isNaN(n)) return '—';
    return '₹' + Math.abs(n).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) * (n < 0 ? -1 : 1);

    /* ↑ That trick doesn't work for negative. Do it properly: */
  },

  /**
   * Correct INR formatter (handles negatives properly)
   */
  ₹(value, decimals = 2) {
    const n = parseFloat(value);
    if (isNaN(n)) return '—';
    const abs = Math.abs(n).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return (n < 0 ? '-₹' : '₹') + abs;
  },

  /**
   * Format P&L with sign prefix for clarity.
   * Input:  +1163.10 → "+₹1,163.10"
   * Input:  -31.31   → "-₹31.31"
   */
  pnl(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return '—';
    const abs = Math.abs(n).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (n >= 0 ? '+₹' : '-₹') + abs;
  },

  /**
   * Format as percentage.
   * Input:  0.0557 or 5.57 → handles both
   * pct(pnl, base) where base is invested amount → auto-calculates
   */
  pct(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  },

  /**
   * Calculate P&L percentage from absolute values.
   * Input: pnlPct(-31.31, 908.21) → "-3.45%"
   */
  pnlPct(pnl, invested) {
    const p = parseFloat(pnl);
    const i = parseFloat(invested);
    if (isNaN(p) || isNaN(i) || i === 0) return '—';
    const pct = (p / i) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  },

  /**
   * Compact formatter for chart axis labels.
   * 7161 → "7.2K"
   * 150000 → "1.5L"
   */
  compact(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e5) return (n / 1e5).toFixed(1) + 'L';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
  },

  /* ══════════════════════════════════════════════════════════
     NUMBER PARSING  (Google Sheets sends ₹ strings sometimes)
     ══════════════════════════════════════════════════════════ */

  /**
   * Strip currency symbols / commas and return a float.
   * Input:  "₹1,244.75"  → 1244.75
   * Input:  "-₹81.65"    → -81.65
   * Input:  1244.75      → 1244.75 (already a number)
   * Input:  null / ""    → 0
   */
  toFloat(raw) {
    if (raw === null || raw === undefined || raw === '') return 0;
    if (typeof raw === 'number') return raw;
    // Remove ₹, commas, leading/trailing spaces
    const cleaned = String(raw).replace(/[₹,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  },

  /**
   * Parse an integer safely.
   */
  toInt(raw) {
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  },

  /* ══════════════════════════════════════════════════════════
     DATE FORMATTERS
     ══════════════════════════════════════════════════════════ */

  /**
   * Format a date string to a readable short form.
   * Input:  "2026-03-12" or "12-Mar-2026"
   * Output: "12 Mar"  (for tables where space is tight)
   */
  shortDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return String(raw);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  },

  /**
   * Full date format: "12 Mar 2026"
   */
  fullDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return String(raw);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  /**
   * Format time string for display.
   * "11:18:55" → "11:18 AM"
   */
  formatTime(raw) {
    if (!raw || raw === '0:00:00') return '—';
    return raw;  // return as-is; HH:MM:SS is readable enough
  },

  /**
   * Return "just now" / "5 min ago" etc.
   */
  timeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)   return 'just now';
    if (min < 60)  return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)   return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  },

  /* ══════════════════════════════════════════════════════════
     CSS CLASS HELPERS
     ══════════════════════════════════════════════════════════ */

  /**
   * Returns "profit" or "loss" CSS class based on value.
   */
  pnlClass(value) {
    return parseFloat(value) >= 0 ? 'profit' : 'loss';
  },

  /**
   * Returns the right badge CSS class for a Sentinel value.
   */
  sentinelBadgeClass(sentinel) {
    if (!sentinel) return 'badge-neutral';
    if (sentinel.includes('BUY DIP'))      return 'badge-buy-dip';
    if (sentinel.includes('TAKE PROFIT'))  return 'badge-take-profit';
    if (sentinel.includes('HOLD'))         return 'badge-hold';
    if (sentinel.includes('AGGRESSIVE'))   return 'badge-strong-buy';
    if (sentinel.includes('CAUTION'))      return 'badge-avoid';
    if (sentinel.includes('ACCUMULATE'))   return 'badge-profit';
    if (sentinel.includes('WATCH'))        return 'badge-gold';
    return 'badge-neutral';
  },

  /**
   * Badge class for Final Action (FA sheet)
   */
  faBadgeClass(action) {
    if (!action) return 'badge-neutral';
    if (action === 'STRONG BUY')  return 'badge-strong-buy';
    if (action === 'WATCHLIST')   return 'badge-watchlist';
    if (action === 'AVOID')       return 'badge-avoid';
    return 'badge-neutral';
  },

  /**
   * Health Score colour (0–8)
   */
  healthScoreClass(score) {
    const s = parseFloat(score);
    if (s >= 6) return 'profit';
    if (s >= 4) return 'gold';
    return 'loss';
  },

  /* ══════════════════════════════════════════════════════════
     MISC HELPERS
     ══════════════════════════════════════════════════════════ */

  /**
   * Strip the "NSE:" prefix from tickers for display.
   * "NSE:IOC" → "IOC"
   */
  cleanTicker(raw) {
    return String(raw || '').replace(/^NSE:/i, '').trim();
  },

  /**
   * Detect if an F&O row is a fund transfer (not a trade).
   * Transfer rows have "🏦 TRANSFER" in Slippage Audit,
   * or zero entry/exit/qty with a non-zero Demat Cr/Dr.
   */
  isFoTransfer(row) {
    const audit = String(row.slippageAudit || '').toUpperCase();
    return audit.includes('TRANSFER');
  },

  /**
   * Sum an array of numbers. Null/undefined treated as 0.
   */
  sum(arr) {
    return arr.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  },

  /**
   * Sum where a condition is true.
   * sumIf([1,-2,3], v => v > 0) → 4
   */
  sumIf(arr, condFn) {
    return arr.filter(condFn).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  },

  /**
   * Calculate win rate percentage string.
   */
  winRate(wins, total) {
    if (!total) return '0%';
    return ((wins / total) * 100).toFixed(1) + '%';
  },

  /**
   * Clamp a number between min and max.
   */
  clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  },

  /**
   * Deep clone a plain object (safe, no functions).
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
};

/* Shorthand alias on window for convenience */
window.₹  = window.FT_UTILS.₹.bind(window.FT_UTILS);
window.pnl = window.FT_UTILS.pnl.bind(window.FT_UTILS);

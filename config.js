/**
 * shared/config.js
 * ═══════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH for all configuration constants.
 *
 * HOW TO USE:
 *  1. Paste your Apps Script URL into APPS_SCRIPT_URL below.
 *  2. If your Google Sheet column order changes, update COLS here.
 *     Nothing else needs changing — all parsers read from COLS.
 *
 * EVERYTHING in this file is on the global window.FT_CONFIG object
 * so any page's JS can access it after loading this script.
 * ═══════════════════════════════════════════════════════════
 */

window.FT_CONFIG = {

  /* ── Apps Script Web App URL ─────────────────────────────
     Set this once — all pages use it.
     The URL is also stored in localStorage so the Settings
     modal can update it without editing this file.
  ──────────────────────────────────────────────────────── */
  get APPS_SCRIPT_URL() {
    return localStorage.getItem('ft_url') ||
      'https://script.google.com/macros/s/AKfycbydjBAQ5A5-edLdq7QIm1R2rybNDOVkMh7VyucjMVkzd9azxP78GfPfwcTR7GSawFdwPg/exec';
  },

  /* ── Cache settings ────────────────────────────────────── */
  CACHE_KEY: 'ft_data_cache',
  CACHE_TTL:  5 * 60 * 1000,   // 5 minutes in milliseconds

  /* ── Auto-refresh interval ─────────────────────────────── */
  get REFRESH_INTERVAL() {
    return parseInt(localStorage.getItem('ft_refresh') || '0', 10);
  },

  /* ── Starting capital for F&O account ─────────────────────
     Used in "In Demat" formula: 50000 + F&O P&L - Invested
  ──────────────────────────────────────────────────────── */
  FO_STARTING_CAPITAL: 50000,

  /* ── Sheet names (as returned by Apps Script) ─────────────
     The parser finds each sheet by matching these names.
  ──────────────────────────────────────────────────────── */
  SHEET_NAMES: {
    fo:           'F&O',
    holdingsData: 'Holdings Data',
    investments:  'Investments',
    fa:           'Fundamental Analysis',
    demat2:       'Demat 2 76k',
  },

  /* ── Table names inside the Investments sheet ─────────────
     The Investments sheet has 3 tables — identified by table_name.
  ──────────────────────────────────────────────────────── */
  INV_TABLE_NAMES: {
    ipos:     'IPOs',
    holdings: 'Holdings',
    tradeLog: 'Trade_Transaction_Log',
  },

  /* ══════════════════════════════════════════════════════════
     COLUMN INDEX MAPS
     ══════════════════════════════════════════════════════════
     These are 0-based indices matching the "headers" array
     from the Apps Script JSON response.

     WHY THIS MATTERS:
     If a column is in position 3, cols.fo.grossPnl = 3 means:
       row[3] === the Gross P&L value for that trade row.

     IMPORTANT — "Holdings Data" bug fix:
       Old code treated col 7 (Current Value) as "current price per share".
       Actual col 7 = SUMIF of Holdings[Current] = TOTAL portfolio value.
       col 6 = Total Brokerage Paid (was being read as current value).
       Correct P&L = col[7] - col[5]  (Current Value - Total Invested)
  ══════════════════════════════════════════════════════════ */

  COLS: {

    /* ── F&O Sheet ─────────────────────────────────────────
       Source: "F&O" sheet → Table1
    ────────────────────────────────────────────────────── */
    fo: {
      date:           0,   // "12-Mar-2026"
      instrument:     1,   // "NIFTY 17 MAR 2026 23600 PE"
      entryPrice:     2,   // 200.1
      exitPrice:      3,   // 219.25
      qty:            4,   // 65
      orders:         5,   // ""
      grossPnl:       6,   // "₹1,244.75"  → strip ₹ and parse
      charges:        7,   // "₹81.65"
      netPnl:         8,   // "₹1,163.10"
      dematCrDr:      9,   // "₹25,000.00"
      openingBal:     10,  // "₹0.00"
      closingBal:     11,  // "₹26,163.10"
      mailData:       12,  // "₹1,174.72"  ← broker email confirmation
      timeIn:         13,  // "11:18:55"   ← trade entry clock time
      timeOut:        14,  // "0:19:48"    ← trade DURATION (not exit time)
      totalTime:      15,  // ""
      slippageAudit:  16,  // "✅ MATCH (₹-11.62)" or "🏦 TRANSFER"
      timestamp:      17,  // ""
    },

    /* ── Holdings Data Sheet ───────────────────────────────
       Source: "Holdings Data" sheet → Holding table
       NOTE: This is the AGGREGATED view (one row per company).
       Formulas use SUMIF/AVERAGEIF over the Investments[Holdings] table.
    ────────────────────────────────────────────────────── */
    holdingsData: {
      companyName:           0,   // "Indian Oil Corporation Ltd"
      symbol:                1,   // "IOC"
      sector:                2,   // "Refineries" (fetched from finology via IMPORTXML)
      avgBuyPrice:           3,   // 141.1583333 (AVERAGEIF of order prices)
      totalQty:              4,   // 49
      totalInvested:         5,   // 7049.36 (SUMIF of Invested)
      totalBrokeragePaid:    6,   // 145.99  ← WAS WRONGLY TREATED AS CURRENT PRICE
      currentValue:          7,   // 7161.35 (SUMIF of Current) ← ACTUAL total portfolio value
      sentinelRecommendation:8,   // "💎 HOLD"
      fundamentalAction:     9,   // "STRONG BUY" (VLOOKUP from FA sheet)
      masterSentinel:        10,  // "📈 HOLD & ACCUMULATE"
    },

    /* ── Investments > Holdings table ──────────────────────
       Source: "Investments" sheet → Holdings table
       Each row = one individual buy transaction.
    ────────────────────────────────────────────────────── */
    invHoldings: {
      companyName:     0,
      ticker:          1,
      date:            2,
      orderPrice:      3,
      filledQty:       4,
      currentPrice:    5,
      buyingBrokerage: 6,
      invested:        7,
      current:         8,
      netPnl:          9,
      grossPnl:        10,
    },

    /* ── Investments > IPOs table ──────────────────────────
       Same column structure as Holdings
    ────────────────────────────────────────────────────── */
    ipos: {
      companyName:     0,
      ticker:          1,
      date:            2,
      orderPrice:      3,
      filledQty:       4,
      currentPrice:    5,
      buyingBrokerage: 6,
      invested:        7,
      current:         8,
      netPnl:          9,
      grossPnl:        10,
    },

    /* ── Investments > Trade_Transaction_Log ───────────────
       Daily aggregation of F&O trades.
       Total = running demat balance (starts at ₹25,000).
    ────────────────────────────────────────────────────── */
    tradeLog: {
      slNo:     0,
      date:     1,
      entryPrice: 2,
      exitPrice:  3,
      qty:      4,
      totalIn:  5,
      totalOut: 6,
      grossPnl: 7,
      netPnl:   8,
      total:    9,   // Running demat balance
    },

    /* ── Fundamental Analysis ──────────────────────────────
       Source: "Fundamental Analysis" sheet → FA table
    ────────────────────────────────────────────────────── */
    fa: {
      ticker:       0,
      companyName:  1,
      mktCap:       2,
      entValue:     3,
      shares:       4,
      faceValue:    5,
      bookValue:    6,
      cash:         7,
      debt:         8,
      promoterPct:  9,
      eps:          10,
      roe:          11,
      roce:         12,
      salesGr:      13,
      profitGr:     14,
      pe:           15,
      pb:           16,
      divYield:     17,
      ltp:          18,
      grahamNumber: 19,
      intrinsicGap: 20,
      peg:          21,
      mktCap2:      22,  // duplicate column in sheet
      de:           23,
      currentRatio: 24,
      divPayoutMos: 25,
      payoutRatio:  26,
      healthScore:  27,
      finalAction:  28,
      yieldQuality: 29,
      notes:        30,
    },

    /* ── Demat 2 76k ───────────────────────────────────────
       Same structure as invHoldings (same table format)
    ────────────────────────────────────────────────────── */
    demat2: {
      companyName:     0,
      ticker:          1,
      date:            2,
      orderPrice:      3,
      filledQty:       4,
      currentPrice:    5,
      buyingBrokerage: 6,
      invested:        7,
      current:         8,
      netPnl:          9,
      grossPnl:        10,
    },
  },

};

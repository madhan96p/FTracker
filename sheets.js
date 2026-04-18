/**
 * shared/sheets.js
 * ═══════════════════════════════════════════════════════════
 * THE DATA LAYER.  The only file that talks to Google Sheets.
 *
 * RESPONSIBILITIES:
 *  1. Fetch the Apps Script Web App URL → get raw JSON
 *  2. Cache the result in sessionStorage (5 min TTL)
 *  3. Parse each sheet/table into clean typed JS objects
 *  4. Expose one public API: FT_SHEETS.load()
 *
 * RETURNED DATA SHAPE:
 * {
 *   fo:           FoTrade[]         ← F&O trades
 *   holdingsData: HoldingData[]     ← Aggregated holdings (per company)
 *   investments: {
 *     holdings:  InvHolding[]       ← Individual buy transactions
 *     ipos:      Ipo[]              ← IPO investments
 *     tradeLog:  TradeLogRow[]      ← Daily F&O aggregate + running balance
 *   },
 *   fa:           FaRow[]           ← Fundamental analysis
 *   demat2:       Demat2Row[]       ← Second demat account
 *   summary:      SummaryStats      ← Pre-computed KPIs for Dashboard
 * }
 *
 * KEY BUG FIX — Holdings P&L:
 *   Old code: P&L = holdingsData.currentValue - holdingsData.totalBrokeragePaid
 *   ↑ Wrong! col[6] is brokerage, col[7] is current value.
 *
 *   Correct:  P&L = holdingsData.currentValue - holdingsData.totalInvested
 *             P&L = col[7] - col[5]
 *   Col[7] = SUMIF(Holdings[Company Name], A3, Holdings[Current])
 *          = TOTAL portfolio value for this company (already computed by sheet)
 * ═══════════════════════════════════════════════════════════
 */

window.FT_SHEETS = (() => {

  const CFG = window.FT_CONFIG;
  const U   = window.FT_UTILS;

  /* ══════════════════════════════════════════════════════════
     STEP 1 — FETCH + CACHE
     ══════════════════════════════════════════════════════════ */

  async function fetchRaw() {
    const url = CFG.APPS_SCRIPT_URL;
    if (!url) throw new Error('No Apps Script URL configured. Open ⚙ Settings.');

    // Try cache first
    try {
      const cached = sessionStorage.getItem(CFG.CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CFG.CACHE_TTL) {
          console.log('[FTracker] Serving from cache');
          return data;
        }
      }
    } catch (_) { /* corrupt cache, ignore */ }

    // Cache miss → fetch
    console.log('[FTracker] Fetching from Apps Script…');
    const resp = await fetch(url + '?_=' + Date.now());

    if (!resp.ok) throw new Error(`HTTP ${resp.status} from Apps Script`);
    const json = await resp.json();

    // The Apps Script returns { sheets: [...] }
    // Store raw json in cache
    try {
      sessionStorage.setItem(CFG.CACHE_KEY, JSON.stringify({
        data: json,
        ts:   Date.now(),
      }));
    } catch (_) { /* sessionStorage full, skip */ }

    return json;
  }

  /**
   * Clear the cache and force a fresh fetch on next load().
   */
  function clearCache() {
    sessionStorage.removeItem(CFG.CACHE_KEY);
  }

  /* ══════════════════════════════════════════════════════════
     STEP 2 — FIND SHEETS  (navigate the JSON structure)
     ══════════════════════════════════════════════════════════ */

  /**
   * Find a sheet entry by its sheet_name.
   * Handles both single-table and multi-table sheets.
   */
  function findSheet(sheetsArray, sheetName) {
    return sheetsArray.find(s => s.sheet_name === sheetName) || null;
  }

  /**
   * Find a table inside the Investments sheet (which has 3 tables).
   */
  function findInvTable(invSheet, tableName) {
    if (!invSheet || !Array.isArray(invSheet.tables)) return null;
    return invSheet.tables.find(t => t.table_name === tableName) || null;
  }

  /* ══════════════════════════════════════════════════════════
     STEP 3 — PARSERS  (one per table)
     Each parser: rows[] → typed object[]
     ══════════════════════════════════════════════════════════ */

  /* ── F&O Parser ──────────────────────────────────────────
     Each row = one trade OR a fund transfer.
     Transfer rows: instrument "From Bank", slippageAudit contains "TRANSFER"
  ────────────────────────────────────────────────────── */
  function parseFO(table) {
    if (!table || !table.rows) return [];

    return table.rows.map(row => {
      const isTransfer = U.isFoTransfer(row);

      return {
        date:           row['Date']           || '',
        instrument:     row['Instrument']     || '',
        entryPrice:     U.toFloat(row['Entry Price']),
        exitPrice:      U.toFloat(row['Exit Price']),
        qty:            U.toFloat(row['Qty']),
        orders:         row['Orders']         || '',
        grossPnl:       U.toFloat(row['Gross P&L']),
        charges:        U.toFloat(row['Charges']),
        netPnl:         U.toFloat(row['Net P&L']),
        dematCrDr:      U.toFloat(row['Demat Cr/Dr']),
        openingBal:     U.toFloat(row['Opening Balance']),
        closingBal:     U.toFloat(row['Closing Balance']),
        mailData:       U.toFloat(row['Mail Data']),
        timeIn:         row['Time In']        || '',
        // timeOut is DURATION (e.g. "0:19:48"), NOT a clock time
        duration:       row['Time Out']       || '',
        totalTime:      row['Total Time']     || '',
        slippageAudit:  row['Slippage Audit'] || '',
        timestamp:      row['Time stamp']     || '',
        isTransfer,
      };
    });
  }

  /* ── Holdings Data Parser ────────────────────────────────
     Aggregated holdings: one row per company.

     CORRECT P&L FORMULA:
       P&L     = currentValue    - totalInvested
       P&L%    = P&L / totalInvested * 100
       where:
         currentValue  = SUMIF(Holdings[Company Name], A3, Holdings[Current])
         totalInvested = SUMIF(Holdings[Company Name], A3, Holdings[Invested])

     This is already computed by Google Sheets formulas —
     we just need to read the right columns (6=brokerage, 7=currentValue).
  ────────────────────────────────────────────────────── */
  function parseHoldingsData(table) {
    if (!table || !table.rows) return [];

    return table.rows.map(row => {
      const totalInvested  = U.toFloat(row['Total Invested']);
      const currentValue   = U.toFloat(row['Current Value']);  // col 7 — total portfolio value
      const pnl            = currentValue - totalInvested;
      const pnlPct         = totalInvested !== 0 ? (pnl / totalInvested) * 100 : 0;

      return {
        companyName:            row['Company Name']            || '',
        symbol:                 row['Symbol']                  || row['Symble'] || '',
        sector:                 row['Sector']                  || 'Unknown',
        avgBuyPrice:            U.toFloat(row['Avg Buy Price']),
        totalQty:               U.toFloat(row['Total Qty']),
        totalInvested,
        totalBrokeragePaid:     U.toFloat(row['Total Brokerage Paid']),  // col 6
        currentValue,                                                       // col 7
        pnl,           // ← derived here (was the bug — sheet already has correct values)
        pnlPct,        // ← derived
        sentinelRecommendation: row['Sentinel Recommendation'] || '—',
        fundamentalAction:      row['Fundamental Action']      || '—',
        masterSentinel:         row['Master Sentinel']         || '—',
      };
    });
  }

  /* ── Investments > Holdings Parser ──────────────────────
     Individual buy transactions (one row per purchase order).
  ────────────────────────────────────────────────────── */
  function parseInvHoldings(table) {
    if (!table || !table.rows) return [];

    return table.rows.map(row => {
      const invested = U.toFloat(row['Invested']);
      const current  = U.toFloat(row['Current']);
      const netPnl   = U.toFloat(row['Net P&L']);

      return {
        companyName:     row['Company Name'] || '',
        ticker:          U.cleanTicker(row['Ticker']),
        rawTicker:       row['Ticker'] || '',
        date:            row['Date']   || '',
        orderPrice:      U.toFloat(row['Order Price']),
        filledQty:       U.toFloat(row['Filled Qty']),
        currentPrice:    U.toFloat(row['Current Price']),
        buyingBrokerage: U.toFloat(row['Buying Brokerage']),
        invested,
        current,
        netPnl,
        grossPnl:        U.toFloat(row['Gross P&L']),
        pnlPct:          invested !== 0 ? (netPnl / invested) * 100 : 0,
      };
    });
  }

  /* ── IPO Parser (same structure as invHoldings) ─────────*/
  function parseIPOs(table) {
    return parseInvHoldings(table);  // identical column structure
  }

  /* ── Trade Transaction Log Parser ───────────────────────
     Daily aggregation of F&O trades.
     Total = running demat balance starting at ₹25,000.
  ────────────────────────────────────────────────────── */
  function parseTradeLog(table) {
    if (!table || !table.rows) return [];

    return table.rows.map(row => ({
      slNo:       U.toInt(row['Sl. No']),
      date:       row['Date']       || '',
      entryPrice: U.toFloat(row['Entry Price']),
      exitPrice:  U.toFloat(row['Exit Price']),
      qty:        U.toFloat(row['Qty']),
      totalIn:    U.toFloat(row['Total In']),
      totalOut:   U.toFloat(row['Total Out']),
      grossPnl:   U.toFloat(row['Gross P&L']),
      netPnl:     U.toFloat(row['Net P&L']),
      total:      U.toFloat(row['Total']),  // running demat balance
    }));
  }

  /* ── Fundamental Analysis Parser ────────────────────────*/
  function parseFA(table) {
    if (!table || !table.rows) return [];

    return table.rows.map(row => ({
      ticker:       row['Ticker (Input)'] || '',
      companyName:  row['Company Name']   || '',
      mktCap:       U.toFloat(row['Mkt Cap (Cr)']),
      entValue:     U.toFloat(row['Ent. Value (Cr)']),
      shares:       U.toFloat(row['Shares (Cr)']),
      faceValue:    U.toFloat(row['Face Value']),
      bookValue:    U.toFloat(row['Book Value']),
      cash:         U.toFloat(row['Cash (Cr)']),
      debt:         U.toFloat(row['Debt (Cr)']),
      promoterPct:  U.toFloat(row['Promoter %']),
      eps:          U.toFloat(row['EPS (TTM)']),
      roe:          U.toFloat(row['ROE %']),
      roce:         U.toFloat(row['ROCE %']),
      salesGr:      U.toFloat(row['Sales Gr. %']),
      profitGr:     U.toFloat(row['Profit Gr. %']),
      pe:           U.toFloat(row['P/E Ratio']),
      pb:           U.toFloat(row['P/B Ratio']),
      divYield:     U.toFloat(row['Div Yield %']),
      ltp:          U.toFloat(row['LTP (Live Price)']),
      grahamNumber: U.toFloat(row['Graham Number']),
      intrinsicGap: U.toFloat(row['Intrinsic Gap %']),
      peg:          U.toFloat(row['PEG Ratio']),
      de:           U.toFloat(row['D/E Ratio']),
      currentRatio: U.toFloat(row['Current Ratio']),
      payoutRatio:  U.toFloat(row['Payout Ratio %']),
      healthScore:  U.toFloat(row['Health Score']),
      finalAction:  row['Final Action']   || '',
      yieldQuality: row['Yield Quality']  || '',
      notes:        row['Notes']          || '',
    }));
  }

  /* ── Demat 2 Parser (same as invHoldings) ───────────────*/
  function parseDemat2(table) {
    return parseInvHoldings(table);
  }

  /* ══════════════════════════════════════════════════════════
     STEP 4 — COMPUTE SUMMARY STATS
     These are the KPIs shown on the Dashboard.
     Mirrors the exact Google Sheets formulas.
     ══════════════════════════════════════════════════════════ */
  function computeSummary(fo, holdingsData, invHoldings, ipos, tradeLog) {
    /* ── F&O stats ─────────────────────────────────────── */
    const trades = fo.filter(r => !r.isTransfer);

    const foNetPnl  = U.sum(trades.map(r => r.netPnl));
    const foMailPnl = U.sum(trades.map(r => r.mailData));
    const taxLeakage = foNetPnl - foMailPnl;

    const wins    = trades.filter(r => r.netPnl > 0);
    const losses  = trades.filter(r => r.netPnl < 0);

    // Gross wins / losses from Mail Data (broker-confirmed amounts)
    const grossWins   = U.sum(trades.filter(r => r.mailData > 0).map(r => r.mailData));
    const grossLosses = U.sum(trades.filter(r => r.mailData < 0).map(r => r.mailData));
    const winFactor   = grossLosses !== 0
      ? Math.abs(grossWins / grossLosses)
      : null;

    // Capital deployed in F&O (Entry Price × Qty)
    const totalCapIn  = U.sum(trades.map(r => r.entryPrice * r.qty));
    const totalCapOut = U.sum(trades.map(r => r.exitPrice  * r.qty));

    /* ── Holdings stats ───────────────────────────────── */
    const holdingsTotalInvested = U.sum(holdingsData.map(h => h.totalInvested));
    const holdingsTotalCurrent  = U.sum(holdingsData.map(h => h.currentValue));
    const holdingsPnl           = holdingsTotalCurrent - holdingsTotalInvested;

    /* ── Investments stats ────────────────────────────── */
    const invInvested = U.sum(invHoldings.map(h => h.invested));
    const invCurrent  = U.sum(invHoldings.map(h => h.current));
    const invPnl      = U.sum(invHoldings.map(h => h.netPnl));

    /* ── IPO stats ────────────────────────────────────── */
    const ipoPnl      = U.sum(ipos.map(i => i.netPnl));
    const ipoInvested = U.sum(ipos.map(i => i.invested));

    /* ── Running demat balance ────────────────────────── */
    const latestBalance = tradeLog.length > 0
      ? tradeLog[tradeLog.length - 1].total
      : CFG.FO_STARTING_CAPITAL + foNetPnl;

    /* ── In Demat formula ─────────────────────────────── */
    // "In Demat: " & TEXT(50000+A7-B7-1000)
    // A7 = F&O Net P&L, B7 = Investments total invested + brokerage
    const totalInvBrokerage = U.sum(invHoldings.map(h => h.buyingBrokerage));
    const inDemat = CFG.FO_STARTING_CAPITAL + foNetPnl - (invInvested + totalInvBrokerage) - 1000;

    /* ── Overall P&L ──────────────────────────────────── */
    const overallPnl = holdingsPnl + invPnl + ipoPnl + foNetPnl;

    return {
      // F&O
      foNetPnl,
      foMailPnl,
      taxLeakage,
      tradeCount:    trades.length,
      winCount:      wins.length,
      lossCount:     losses.length,
      winRate:       trades.length ? (wins.length / trades.length) * 100 : 0,
      grossWins,
      grossLosses,
      winFactor,
      totalCapIn,
      totalCapOut,
      latestBalance,
      inDemat,

      // Holdings
      holdingsTotalInvested,
      holdingsTotalCurrent,
      holdingsPnl,

      // Investments
      invInvested,
      invCurrent,
      invPnl,

      // IPO
      ipoPnl,
      ipoInvested,

      // Overall
      overallPnl,
    };
  }

  /* ══════════════════════════════════════════════════════════
     STEP 5 — PUBLIC API: load()
     ══════════════════════════════════════════════════════════ */

  async function load() {
    const raw      = await fetchRaw();
    const sheets   = raw.sheets || [];

    // ── Locate each sheet ──
    const foSheet   = findSheet(sheets, CFG.SHEET_NAMES.fo);
    const hdSheet   = findSheet(sheets, CFG.SHEET_NAMES.holdingsData);
    const invSheet  = findSheet(sheets, CFG.SHEET_NAMES.investments);
    const faSheet   = findSheet(sheets, CFG.SHEET_NAMES.fa);
    const d2Sheet   = findSheet(sheets, CFG.SHEET_NAMES.demat2);

    // ── Locate tables inside Investments sheet ──
    const invHoldingsTable = findInvTable(invSheet, CFG.INV_TABLE_NAMES.holdings);
    const ipoTable         = findInvTable(invSheet, CFG.INV_TABLE_NAMES.ipos);
    const tradeLogTable    = findInvTable(invSheet, CFG.INV_TABLE_NAMES.tradeLog);

    // ── Parse all tables ──
    const fo           = parseFO(foSheet);
    const holdingsData = parseHoldingsData(hdSheet);
    const invHoldings  = parseInvHoldings(invHoldingsTable);
    const ipos         = parseIPOs(ipoTable);
    const tradeLog     = parseTradeLog(tradeLogTable);
    const fa           = parseFA(faSheet);
    const demat2       = parseDemat2(d2Sheet);

    // ── Compute summary stats ──
    const summary = computeSummary(fo, holdingsData, invHoldings, ipos, tradeLog);

    return {
      fo,
      holdingsData,
      investments: { holdings: invHoldings, ipos, tradeLog },
      fa,
      demat2,
      summary,
    };
  }

  /* ── Public ─────────────────────────────────────────────*/
  return { load, clearCache };

})();

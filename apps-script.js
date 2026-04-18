/**
 * apps-script.js
 * ═══════════════════════════════════════════════════════════
 * PASTE THIS ENTIRE FILE into your Google Apps Script editor.
 *
 * HOW TO DEPLOY:
 *   1. Open your Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this entire file (replace any existing code)
 *   4. Click Deploy → New Deployment
 *   5. Type: Web app
 *   6. Execute as: Me
 *   7. Who has access: Anyone
 *   8. Deploy → Copy the URL
 *   9. Paste that URL in FTracker ⚙ Settings
 *
 * WHAT THIS RETURNS:
 *   JSON with shape: { sheets: [ { sheet_name, table_name, headers, rows }, ... ] }
 *   One entry per table. The Investments sheet returns 3 table entries.
 *
 * IMPORTANT — Column order:
 *   This script returns rows as OBJECTS (key: column header, value: cell value).
 *   The JS parser in sheets.js reads by key name, not column index.
 *   So reordering sheet columns will NOT break anything.
 *
 * ─────────────────────────────────────────────────────────
 * DATA CLEANING applied here (at source):
 *   • Currency strings like "₹1,244.75" → numbers (25000.00)
 *   • Empty cells → null
 *   • Date serials → ISO strings "2026-03-12"
 * ═══════════════════════════════════════════════════════════
 */


/* ═══════════════════════════════════════════════════════════
   MAIN ENTRY POINT
   Called by Netlify frontend via fetch(url).
   Returns JSON with CORS headers.
═══════════════════════════════════════════════════════════ */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = { sheets: [] };

    // ── F&O Sheet ─────────────────────────────────────────
    const foSheet = ss.getSheetByName('F&O');
    if (foSheet) {
      result.sheets.push(
        readNamedTable(foSheet, 'F&O', 'Table1')
      );
    }

    // ── Holdings Data Sheet ───────────────────────────────
    const hdSheet = ss.getSheetByName('Holdings Data');
    if (hdSheet) {
      result.sheets.push(
        readNamedTable(hdSheet, 'Holdings Data', 'Holding')
      );
    }

    // ── Investments Sheet (3 tables) ──────────────────────
    // CRITICAL: This sheet has 3 separate named tables.
    // We locate each by its header row and read only that table's data.
    const invSheet = ss.getSheetByName('Investments');
    if (invSheet) {
      result.sheets.push({
        sheet_name: 'Investments',
        tables: [
          readNamedTable(invSheet, 'Investments', 'Holdings'),
          readNamedTable(invSheet, 'Investments', 'IPOs'),
          readNamedTable(invSheet, 'Investments', 'Trade_Transaction_Log'),
        ].filter(Boolean)
      });
    }

    // ── Fundamental Analysis Sheet ────────────────────────
    const faSheet = ss.getSheetByName('Fundamental Analysis');
    if (faSheet) {
      result.sheets.push(
        readNamedTable(faSheet, 'Fundamental Analysis', 'FA')
      );
    }

    // ── Demat 2 76k Sheet ─────────────────────────────────
    const d2Sheet = ss.getSheetByName('Demat 2 76k');
    if (d2Sheet) {
      result.sheets.push(
        readNamedTable(d2Sheet, 'Demat 2 76k', 'Demat 2 investments')
      );
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const error = { error: err.message, stack: err.stack };
    return ContentService
      .createTextOutput(JSON.stringify(error))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/* ═══════════════════════════════════════════════════════════
   readNamedTable(sheet, sheetName, tableName)
   ───────────────────────────────────────────────────────────
   Reads a named table from a sheet.

   HOW IT FINDS TABLES:
   Google Sheets Named Tables (Insert → Table) store their range
   in the spreadsheet's named ranges as "tableName".
   We use sheet.getNamedRanges() to find them.

   FALLBACK:
   If the table isn't a formal Named Table, we scan rows looking
   for the header row matching expected column names.

   RETURNS:
   {
     sheet_name: "F&O",
     table_name: "Table1",
     headers:    ["Date", "Instrument", ...],
     rows:       [{ Date: "12-Mar-2026", Instrument: "NIFTY...", ... }, ...]
   }
═══════════════════════════════════════════════════════════ */
function readNamedTable(sheet, sheetName, tableName) {
  try {
    // ── Try Google Sheets Named Table first ──
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const namedRanges = ss.getNamedRanges();

    let range = null;
    for (const nr of namedRanges) {
      if (nr.getName() === tableName && nr.getRange().getSheet().getName() === sheet.getName()) {
        range = nr.getRange();
        break;
      }
    }

    // ── Fallback: scan for header row ──
    if (!range) {
      range = findTableByHeaderScan(sheet, tableName);
    }

    if (!range) {
      return {
        sheet_name: sheetName,
        table_name: tableName,
        headers:    [],
        rows:       [],
        error:      `Table "${tableName}" not found in sheet "${sheetName}"`
      };
    }

    return parseRange(range, sheetName, tableName);

  } catch (err) {
    return {
      sheet_name: sheetName,
      table_name: tableName,
      headers:    [],
      rows:       [],
      error:      err.message
    };
  }
}


/* ═══════════════════════════════════════════════════════════
   findTableByHeaderScan(sheet, tableName)
   ───────────────────────────────────────────────────────────
   Scans the sheet's first 200 rows looking for a header row
   that contains columns matching the expected table headers.

   This is the fallback when Named Tables aren't used.
   Returns the Range from that header row to last data row.
═══════════════════════════════════════════════════════════ */

// Known header signatures per table name
const TABLE_HEADERS = {
  'Table1': ['Date', 'Instrument', 'Entry Price', 'Exit Price'],
  'Holding': ['Company Name', 'Symbol', 'Sector', 'Avg Buy Price'],
  'Holdings': ['Company Name', 'Ticker', 'Date', 'Order Price', 'Filled Qty', 'Current Price'],
  'IPOs': ['Company Name', 'Ticker', 'Date', 'Order Price', 'Filled Qty', 'Current Price'],
  'Trade_Transaction_Log': ['Sl. No', 'Date', 'Entry Price', 'Exit Price', 'Qty'],
  'FA': ['Ticker (Input)', 'Company Name', 'Mkt Cap (Cr)'],
  'Demat 2 investments': ['Company Name', 'Ticker', 'Date', 'Order Price'],
};

function findTableByHeaderScan(sheet, tableName) {
  const expectedHeaders = TABLE_HEADERS[tableName];
  if (!expectedHeaders) return null;

  const maxScanRow = 200;
  const lastCol    = sheet.getLastColumn();
  const lastRow    = sheet.getLastRow();
  if (lastCol < 1 || lastRow < 1) return null;

  const allValues  = sheet.getRange(1, 1, Math.min(maxScanRow, lastRow), lastCol).getValues();

  for (let r = 0; r < allValues.length; r++) {
    const row = allValues[r].map(c => String(c).trim());
    // Check if this row contains all expected header columns
    const matches = expectedHeaders.every(h => row.includes(h));
    if (matches) {
      const headerRowNum = r + 1;

      // Find where data ends (first fully empty row after header)
      let dataEndRow = headerRowNum + 1;
      for (let dr = r + 1; dr < allValues.length; dr++) {
        if (allValues[dr].every(c => c === '' || c === null)) break;
        dataEndRow = dr + 1;
      }

      // Return from header row to last data row
      return sheet.getRange(headerRowNum, 1, dataEndRow - headerRowNum + 1, lastCol);
    }
  }

  return null;
}


/* ═══════════════════════════════════════════════════════════
   parseRange(range, sheetName, tableName)
   ───────────────────────────────────────────────────────────
   Converts a Range into { headers, rows[] } objects.
   Row 0 = headers, rows 1+ = data.

   DATA CLEANING:
     - ₹ strings → numbers
     - Date serials → ISO string
     - Empty → null
     - Emojis in signal columns → kept as-is
═══════════════════════════════════════════════════════════ */
function parseRange(range, sheetName, tableName) {
  const values = range.getValues();
  if (values.length < 2) {
    return { sheet_name: sheetName, table_name: tableName, headers: values[0] || [], rows: [] };
  }

  const headers  = values[0].map(h => String(h).trim()).filter(h => h !== '');
  const dataRows = values.slice(1);
  const rows     = [];

  for (const raw of dataRows) {
    // Skip fully empty rows
    if (raw.every(c => c === '' || c === null || c === undefined)) continue;

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cleanCell(raw[i], h);
    });
    rows.push(obj);
  }

  return { sheet_name: sheetName, table_name: tableName, headers, rows };
}


/* ═══════════════════════════════════════════════════════════
   cleanCell(value, columnHeader)
   ───────────────────────────────────────────────────────────
   Normalizes a cell value based on its column.
   This runs AT SOURCE so the frontend gets clean data.
═══════════════════════════════════════════════════════════ */
function cleanCell(value, header) {
  if (value === '' || value === null || value === undefined) return null;

  // Date columns — return ISO string
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  // Number already — return as-is
  if (typeof value === 'number') return value;

  const str = String(value).trim();

  // Currency string "₹1,244.75" or "-₹81.65" → number
  if (/^-?₹[\d,]+(\.\d+)?$/.test(str)) {
    const n = parseFloat(str.replace(/[₹,]/g, ''));
    return isNaN(n) ? null : n;
  }

  // Pure number string
  if (/^-?[\d,]+(\.\d+)?$/.test(str)) {
    const n = parseFloat(str.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  // Everything else (company names, instrument names, emojis, etc.) → string
  return str;
}

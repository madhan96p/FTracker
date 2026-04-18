# FTracker v2.0 — Vanilla HTML/CSS/JS

F&O Trading Dashboard connected to Google Sheets, deployed on Netlify.
Zero build step. Zero frameworks.

## Key Bug Fixed

**Holdings P&L was wrong** because the old code read column 6 (Total Brokerage Paid)
as if it were "Current Value". The correct column is 7 (Current Value = SUMIF total).

Correct: P&L = col[7] - col[5] = Current Value - Total Invested

IOC example:
  Total Invested  = ₹7,049.36
  Current Value   = ₹7,161.35  (SUMIF of Holdings[Current])
  P&L             = +₹111.99   (PROFIT, not -₹6,903 as shown before)

## File Structure

shared/common.css      — all design tokens + shared styles
shared/config.js       — Apps Script URL, column maps
shared/utils.js        — formatters: ₹(), pnl(), pct()
shared/sheets.js       — fetch + parse all sheet data
shared/components.js   — sidebar, header, settings modal

dashboard/             — KPI cards, charts, recent tables
fo/                    — Full F&O table with search/filter/sort
holdings/              — Aggregated holdings, fixed P&L
investments/           — Individual buy transactions
ipo/                   — IPO investments
log/                   — Trade log + running balance chart
analytics/             — 7 Chart.js charts
fa/                    — Fundamental analysis with health scores
demat2/                — Demat 2 (76k) account

## Deploy

1. Paste apps-script.js into Google Apps Script → Deploy as Web App
2. Copy URL → Open FTracker ⚙ Settings → Paste URL → Save
3. Push to GitHub → Connect to Netlify → Build command: empty, Publish dir: .

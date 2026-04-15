# Trading Dashboard

A comprehensive portfolio management UI for tracking F&O trades, stock holdings, investments, IPOs, and transaction logs with interactive analytics charts.

## Features

- **Dashboard Overview**: Summary cards showing total invested, P&L, win rate, and trade statistics
- **F&O Trades**: Complete table view of all Futures & Options trades with search and filter
- **Stock Holdings**: Track your stock portfolio with P&L calculations and recommendations
- **Individual Investments**: Detailed view of each investment transaction
- **IPO Tracking**: Monitor your IPO investments
- **Transaction Log**: Historical trade transaction records
- **Analytics Charts**:
  - Cumulative P&L over time
  - Daily P&L bar chart
  - Win/Loss distribution pie chart
  - Holdings distribution
  - Daily trade volume

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Recharts for data visualization
- Responsive design for mobile and desktop

## Google Sheets Integration

To connect this dashboard to your Google Sheets data:

### Option 1: Google Sheets API (Recommended)

1. Create a Google Cloud Project and enable the Google Sheets API
2. Create API credentials (API Key or OAuth 2.0)
3. Share your Google Sheet with the service account email (for OAuth)
4. Update the `sheetsService.ts` file with your API credentials
5. Replace `getMockData()` with actual API calls

### Option 2: Google Apps Script Web App

1. Open your Google Sheet
2. Go to Extensions > Apps Script
3. Create a new script to expose your data as JSON:

```javascript
  function doGet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const foData = sheet.getSheetByName('F&O').getDataRange().getValues();
    const holdingsData = sheet.getSheetByName('Holdings Data').getDataRange().getValues();
    
    return ContentService.createTextOutput(JSON.stringify({
      foTrades: foData,
      holdings: holdingsData
    })).setMimeType(ContentService.MimeType.JSON);
  }
```

4. Deploy as a web app
5. Update the fetch URL in `sheetsService.ts`

### Option 3: CSV Export

1. Export your Google Sheets as CSV files
2. Host them on a static file server or CDN
3. Use `PapaParse` to parse the CSV files in the browser

## Deployment

This project is configured for Netlify deployment:

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Build settings are pre-configured in `netlify.toml`
4. Auto-deploy on every push to main branch

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── SummaryCards.tsx      # Dashboard summary cards
│   ├── FOTradesTable.tsx     # F&O trades table
│   ├── HoldingsTable.tsx     # Stock holdings table
│   ├── InvestmentsTable.tsx  # Individual investments
│   ├── TransactionLogTable.tsx # Transaction log
│   ├── IPOTable.tsx          # IPO investments
│   └── AnalyticsCharts.tsx   # Charts and visualizations
├── services/
│   └── sheetsService.ts      # Data parsing and Google Sheets integration
├── types/
│   └── trading.ts            # TypeScript type definitions
├── App.tsx                   # Main application component
└── App.css                   # Custom styles
```

## Data Format

The dashboard expects data in the following format:

### F&O Trades
- Date, Instrument, Entry Price, Exit Price, Qty, Gross P&L, Charges, Net P&L, etc.

### Holdings
- Company Name, Symbol, Sector, Avg Buy Price, Total Qty, Total Invested, Current Value, etc.

### Investments
- Company Name, Ticker, Date, Order Price, Filled Qty, Current Price, Invested, Current, P&L

## License

MIT

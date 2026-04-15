// F&O Trade Types
export interface FOTrade {
  id: string;
  date: string;
  instrument: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  orders?: number;
  grossPL: number;
  charges: number;
  netPL: number;
  dematCrDr: number;
  openingBalance: number;
  closingBalance: number;
  mailData: number;
  timeIn: string;
  timeOut: string;
  totalTime: string;
  slippageAudit: string;
  timestamp: string;
  isTransfer?: boolean;
}

// Holdings Types
export interface Holding {
  companyName: string;
  symbol: string;
  sector: string;
  avgBuyPrice: number;
  totalQty: number;
  totalInvested: number;
  totalBrokeragePaid: number;
  currentValue: number;
  sentinelRecommendation: string;
  fundamentalAction: string;
  masterSentinel: string;
  livePrice?: number;
  dayChange?: number;
  dayChangePercent?: number;
}

// Investment Types
export interface Investment {
  companyName: string;
  ticker: string;
  date: string;
  orderPrice: number;
  filledQty: number;
  currentPrice: number;
  buyingBrokerage: number;
  invested: number;
  current: number;
  netPL: number;
  grossPL: number;
  dematSource?: 'Demat 1' | 'Demat 2';
}

// IPO Types
export interface IPO {
  companyName: string;
  ticker: string;
  date: string;
  orderPrice: number;
  filledQty: number;
  currentPrice: number;
  buyingBrokerage: number;
  invested: number;
  current: number;
  netPL: number;
  grossPL: number;
  dematSource?: 'Demat 1' | 'Demat 2';
}

// Transaction Log Types
export interface TransactionLog {
  slNo: number;
  date: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  totalIn: number;
  totalOut: number;
  grossPL: number;
  netPL: number;
  total: number;
}

// Demat Investment Types
export interface DematInvestment {
  companyName: string;
  ticker: string;
  date: string;
  orderPrice: number;
  filledQty: number;
  currentPrice: number;
  buyingBrokerage: number;
  invested: number;
  current: number;
  netPL: number;
  grossPL: number;
}

// Fundamental Analysis Types
export interface FundamentalAnalysis {
  ticker: string;
  companyName: string;
  mktCap: number;
  entValue: number;
  shares: number;
  faceValue: number;
  bookValue: number;
  cash: number;
  debt: number;
  promoterPercent: number;
  epsTTM: number;
  roe: number;
  roce: number;
  salesGrowth: number;
  profitGrowth: number;
  peRatio: number;
  pbRatio: number;
  divYield: number;
  ltp: number;
  grahamNumber: number;
  intrinsicGap: number;
  pegRatio: number;
  deRatio: number;
  currentRatio: number;
  divPayoutMos: number;
  payoutRatio: number;
  healthScore: number;
  finalAction: string;
  yieldQuality: string;
  notes: string;
}

// Streak Types
export interface StreakStats {
  currentStreak: number;
  currentStreakType: 'positive' | 'negative' | 'neutral';
  longestPositiveStreak: number;
  longestNegativeStreak: number;
  totalPositiveTrades: number;
  totalNegativeTrades: number;
}

// Time Filter Types
export type TimeFilter = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'FY2425' | 'FY2526';

// Dashboard Summary Types
export interface DashboardSummary {
  // Overall Portfolio
  totalInvested: number;
  currentValue: number;
  totalPL: number;
  totalPLPercent: number;
  
  // Breakdown by source
  demat1Invested: number;
  demat1Current: number;
  demat1PL: number;
  demat2Invested: number;
  demat2Current: number;
  demat2PL: number;
  
  // F&O Trading
  foTotalTrades: number;
  foWinningTrades: number;
  foLosingTrades: number;
  foWinRate: number;
  foTotalPL: number;
  foCharges: number;
  foNetPL: number;
  
  // Holdings
  holdingsCount: number;
  holdingsInvested: number;
  holdingsCurrent: number;
  holdingsPL: number;
  
  // IPOs
  ipoCount: number;
  ipoInvested: number;
  ipoCurrent: number;
  ipoPL: number;
  
  // Cash Flow
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
}

// Sheet Data Types
export interface SheetData {
  foTrades: FOTrade[];
  holdings: Holding[];
  investments: Investment[];
  ipos: IPO[];
  transactionLog: TransactionLog[];
  dematInvestments: DematInvestment[];
  fundamentalAnalysis: FundamentalAnalysis[];
}

// Filtered Data Types
export interface FilteredData {
  foTrades: FOTrade[];
  investments: Investment[];
  ipos: IPO[];
  startDate: Date;
  endDate: Date;
}

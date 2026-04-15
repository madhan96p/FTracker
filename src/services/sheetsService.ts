import type { 
  FOTrade, 
  Holding, 
  Investment, 
  IPO, 
  TransactionLog, 
  DematInvestment,
  FundamentalAnalysis,
  DashboardSummary,
  StreakStats,
  TimeFilter,
  FilteredData,
  SheetData
} from '@/types/trading';

// Parse currency string to number
export const parseCurrency = (value: string): number => {
  if (!value || value.trim() === '' || value === '₹0.00') return 0;
  const cleaned = value.replace(/[₹,\s]/g, '').replace(/−/g, '-');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Parse number from string
export const parseNumber = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/,/g, '').replace(/−/g, '-');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Parse date string to Date object
export const parseDate = (value: string): Date => {
  if (!value || value.trim() === '') return new Date();
  // Handle formats like "12-Mar-2026" or "3/18/2026"
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  if (value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = months[parts[1]] || parts[1];
      const year = parts[2];
      return new Date(`${year}-${month}-${day}`);
    }
  }
  
  return new Date(value);
};

// Format date for display
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Generate unique ID (used when creating new records)
export const generateId = (prefix: string, index: number): string => {
  return `${prefix}-${index}`;
};

// Check if date is within time filter
export const isWithinTimeFilter = (date: Date, filter: TimeFilter): boolean => {
  const now = new Date();
  const tradeDate = new Date(date);
  
  switch (filter) {
    case '1D':
      return tradeDate.toDateString() === now.toDateString();
    case '1W':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return tradeDate >= weekAgo;
    case '1M':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return tradeDate >= monthAgo;
    case '3M':
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return tradeDate >= threeMonthsAgo;
    case '6M':
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      return tradeDate >= sixMonthsAgo;
    case '1Y':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return tradeDate >= yearAgo;
    case 'FY2425':
      // Financial Year 2024-25: April 2024 - March 2025
      const fy2425Start = new Date('2024-04-01');
      const fy2425End = new Date('2025-03-31');
      return tradeDate >= fy2425Start && tradeDate <= fy2425End;
    case 'FY2526':
      // Financial Year 2025-26: April 2025 - March 2026
      const fy2526Start = new Date('2025-04-01');
      const fy2526End = new Date('2026-03-31');
      return tradeDate >= fy2526Start && tradeDate <= fy2526End;
    case 'ALL':
    default:
      return true;
  }
};

// Filter data by time period
export const filterDataByTime = (
  foTrades: FOTrade[],
  investments: Investment[],
  ipos: IPO[],
  filter: TimeFilter
): FilteredData => {
  const filteredFOTrades = foTrades.filter(t => 
    !t.isTransfer && isWithinTimeFilter(parseDate(t.date), filter)
  );
  const filteredInvestments = investments.filter(i => 
    isWithinTimeFilter(parseDate(i.date), filter)
  );
  const filteredIPOs = ipos.filter(i => 
    isWithinTimeFilter(parseDate(i.date), filter)
  );
  
  // Calculate date range
  const allDates = [
    ...filteredFOTrades.map(t => parseDate(t.date)),
    ...filteredInvestments.map(i => parseDate(i.date)),
    ...filteredIPOs.map(i => parseDate(i.date))
  ].filter(d => !isNaN(d.getTime()));
  
  const startDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const endDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  
  return {
    foTrades: filteredFOTrades,
    investments: filteredInvestments,
    ipos: filteredIPOs,
    startDate,
    endDate
  };
};

// Calculate streaks
export const calculateStreaks = (trades: FOTrade[]): StreakStats => {
  // Filter out transfers and sort by date
  const validTrades = trades
    .filter(t => !t.isTransfer && t.netPL !== 0)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  
  if (validTrades.length === 0) {
    return {
      currentStreak: 0,
      currentStreakType: 'neutral',
      longestPositiveStreak: 0,
      longestNegativeStreak: 0,
      totalPositiveTrades: 0,
      totalNegativeTrades: 0
    };
  }
  
  let currentStreak = 0;
  let currentStreakType: 'positive' | 'negative' | 'neutral' = 'neutral';
  let longestPositiveStreak = 0;
  let longestNegativeStreak = 0;
  let totalPositiveTrades = 0;
  let totalNegativeTrades = 0;
  
  let tempPositiveStreak = 0;
  let tempNegativeStreak = 0;
  
  validTrades.forEach((trade, index) => {
    if (trade.netPL > 0) {
      totalPositiveTrades++;
      tempPositiveStreak++;
      tempNegativeStreak = 0;
      
      if (tempPositiveStreak > longestPositiveStreak) {
        longestPositiveStreak = tempPositiveStreak;
      }
      
      // Update current streak if this is the last trade
      if (index === validTrades.length - 1) {
        currentStreak = tempPositiveStreak;
        currentStreakType = 'positive';
      }
    } else if (trade.netPL < 0) {
      totalNegativeTrades++;
      tempNegativeStreak++;
      tempPositiveStreak = 0;
      
      if (tempNegativeStreak > longestNegativeStreak) {
        longestNegativeStreak = tempNegativeStreak;
      }
      
      // Update current streak if this is the last trade
      if (index === validTrades.length - 1) {
        currentStreak = tempNegativeStreak;
        currentStreakType = 'negative';
      }
    }
  });
  
  return {
    currentStreak,
    currentStreakType,
    longestPositiveStreak,
    longestNegativeStreak,
    totalPositiveTrades,
    totalNegativeTrades
  };
};

// Calculate dashboard summary with proper breakdown
export const calculateSummary = (
  foTrades: FOTrade[],
  holdings: Holding[],
  _investments: Investment[],
  ipos: IPO[],
  dematInvestments: DematInvestment[]
): DashboardSummary => {
  // Separate transfers from actual trades
  const transfers = foTrades.filter(t => t.isTransfer || t.instrument.includes('Bank'));
  const actualTrades = foTrades.filter(t => !t.isTransfer && !t.instrument.includes('Bank'));
  
  // Cash flow calculations
  const totalDeposits = transfers
    .filter(t => t.dematCrDr > 0)
    .reduce((sum, t) => sum + t.dematCrDr, 0);
  const totalWithdrawals = transfers
    .filter(t => t.dematCrDr < 0)
    .reduce((sum, t) => sum + Math.abs(t.dematCrDr), 0);
  
  // F&O Trading stats
  const foWinningTrades = actualTrades.filter(t => t.netPL > 0).length;
  const foLosingTrades = actualTrades.filter(t => t.netPL < 0).length;
  const foTotalTrades = actualTrades.length;
  const foWinRate = foTotalTrades > 0 ? (foWinningTrades / foTotalTrades) * 100 : 0;
  const foTotalPL = actualTrades.reduce((sum, t) => sum + t.grossPL, 0);
  const foCharges = actualTrades.reduce((sum, t) => sum + t.charges, 0);
  const foNetPL = actualTrades.reduce((sum, t) => sum + t.netPL, 0);
  
  // Holdings (from Holdings Data sheet)
  const holdingsInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const holdingsCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const holdingsPL = holdingsCurrent - holdingsInvested;
  
  // IPOs
  const ipoInvested = ipos.reduce((sum, i) => sum + i.invested, 0);
  const ipoCurrent = ipos.reduce((sum, i) => sum + i.current, 0);
  const ipoPL = ipoCurrent - ipoInvested;
  
  // Demat 2 investments
  const demat2Invested = dematInvestments.reduce((sum, d) => sum + d.invested, 0);
  const demat2Current = dematInvestments.reduce((sum, d) => sum + d.current, 0);
  const demat2PL = demat2Current - demat2Invested;
  
  // Total calculations
  const totalInvested = holdingsInvested + ipoInvested + demat2Invested;
  const currentValue = holdingsCurrent + ipoCurrent + demat2Current;
  const totalPL = currentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  
  return {
    totalInvested,
    currentValue,
    totalPL,
    totalPLPercent,
    demat1Invested: holdingsInvested + ipoInvested,
    demat1Current: holdingsCurrent + ipoCurrent,
    demat1PL: holdingsPL + ipoPL,
    demat2Invested,
    demat2Current,
    demat2PL,
    foTotalTrades,
    foWinningTrades,
    foLosingTrades,
    foWinRate,
    foTotalPL,
    foCharges,
    foNetPL,
    holdingsCount: holdings.length,
    holdingsInvested,
    holdingsCurrent,
    holdingsPL,
    ipoCount: ipos.length,
    ipoInvested,
    ipoCurrent,
    ipoPL,
    totalDeposits,
    totalWithdrawals,
    netCashFlow: totalDeposits - totalWithdrawals
  };
};

// Format currency for display
export const formatCurrency = (value: number): string => {
  if (value === 0) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format large numbers (K, L, Cr)
export const formatCompactCurrency = (value: number): string => {
  if (value === 0) return '₹0';
  const absValue = Math.abs(value);
  if (absValue >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (absValue >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  } else if (absValue >= 1000) {
    return `₹${(value / 1000).toFixed(2)}K`;
  }
  return formatCurrency(value);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Mock data for development
export const getMockData = (): SheetData => {
  // F&O Trades mock data
  const foTrades: FOTrade[] = [
    {
      id: 'fo-0',
      date: '12-Mar-2026',
      instrument: 'From Bank',
      entryPrice: 0,
      exitPrice: 0,
      qty: 0,
      grossPL: 0,
      charges: 0,
      netPL: 0,
      dematCrDr: 25000,
      openingBalance: 0,
      closingBalance: 25000,
      mailData: 0.10,
      timeIn: '',
      timeOut: '',
      totalTime: '0:00:00',
      slippageAudit: '🏦 TRANSFER',
      timestamp: '',
      isTransfer: true,
    },
    {
      id: 'fo-1',
      date: '12-Mar-2026',
      instrument: 'NIFTY 17 MAR 2026 23600 PE',
      entryPrice: 200.1,
      exitPrice: 219.25,
      qty: 65,
      grossPL: 1244.75,
      charges: 81.65,
      netPL: 1163.10,
      dematCrDr: 0,
      openingBalance: 25000,
      closingBalance: 26163.10,
      mailData: 1174.72,
      timeIn: '0.46',
      timeOut: '11:18:55',
      totalTime: '0:19:48',
      slippageAudit: '✅ MATCH (₹-11.62)',
      timestamp: '',
    },
    {
      id: 'fo-2',
      date: '13-Mar-2026',
      instrument: 'NIFTY 17 MAR 2026 23400 PE',
      entryPrice: 244.9,
      exitPrice: 275.5,
      qty: 65,
      grossPL: 1989.00,
      charges: 90.62,
      netPL: 1898.38,
      dematCrDr: 0,
      openingBalance: 26163.10,
      closingBalance: 28061.48,
      mailData: 1909.10,
      timeIn: '0.46',
      timeOut: '11:15:10',
      totalTime: '0:15:30',
      slippageAudit: '✅ MATCH (₹-10.72)',
      timestamp: '',
    },
    {
      id: 'fo-3',
      date: '17-Mar-2026',
      instrument: 'NIFTY -17 MAR2026-PE-23200.',
      entryPrice: 262.2,
      exitPrice: 119.4,
      qty: 65,
      grossPL: -9282.00,
      charges: 72.17,
      netPL: -9354.17,
      dematCrDr: 0,
      openingBalance: 28061.48,
      closingBalance: 18707.31,
      mailData: -9347.91,
      timeIn: '0.44',
      timeOut: '14:24:12',
      totalTime: '3:53:54',
      slippageAudit: '✅ MATCH (₹-6.26)',
      timestamp: '',
    },
    {
      id: 'fo-4',
      date: '18-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23600.00 PE',
      entryPrice: 169.8,
      exitPrice: 201.66,
      qty: 65,
      grossPL: 2070.90,
      charges: 78.77,
      netPL: 1992.13,
      dematCrDr: 0,
      openingBalance: 18707.31,
      closingBalance: 20699.44,
      mailData: 1999.40,
      timeIn: '0.39',
      timeOut: '10:02:44',
      totalTime: '0:43:12',
      slippageAudit: '✅ MATCH (₹-7.27)',
      timestamp: '',
    },
    {
      id: 'fo-5',
      date: '19-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23150.00 CE',
      entryPrice: 266.8,
      exitPrice: 284.1,
      qty: 65,
      grossPL: 1124.50,
      charges: 92.81,
      netPL: 1031.69,
      dematCrDr: 0,
      openingBalance: 20699.44,
      closingBalance: 21731.13,
      mailData: 1043.26,
      timeIn: '0.47',
      timeOut: '11:34:56',
      totalTime: '0:17:21',
      slippageAudit: '✅ MATCH (₹-11.57)',
      timestamp: '',
    },
    {
      id: 'fo-6',
      date: '20-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23150.00 PE',
      entryPrice: 202.5,
      exitPrice: 224.45,
      qty: 65,
      grossPL: 1426.75,
      charges: 82.95,
      netPL: 1343.80,
      dematCrDr: 0,
      openingBalance: 21731.13,
      closingBalance: 23074.93,
      mailData: 1352.92,
      timeIn: '0.41',
      timeOut: '10:19:37',
      totalTime: '0:35:59',
      slippageAudit: '✅ MATCH (₹-9.12)',
      timestamp: '',
    },
    {
      id: 'fo-7',
      date: '23-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 22600.00 CE',
      entryPrice: 268.85,
      exitPrice: 298.7,
      qty: 65,
      grossPL: 1940.25,
      charges: 94.47,
      netPL: 1845.78,
      dematCrDr: 0,
      openingBalance: 23074.93,
      closingBalance: 24920.71,
      mailData: 1857.60,
      timeIn: '0.39',
      timeOut: '9:37:00',
      totalTime: '0:19:57',
      slippageAudit: '✅ MATCH (₹-11.82)',
      timestamp: '',
    },
    {
      id: 'fo-8',
      date: '24-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 22700.00 CE',
      entryPrice: 87.85,
      exitPrice: 90.7,
      qty: 65,
      grossPL: 185.25,
      charges: 62.20,
      netPL: 123.05,
      dematCrDr: 0,
      openingBalance: 24920.71,
      closingBalance: 25043.76,
      mailData: 127.90,
      timeIn: '0.44',
      timeOut: '11:17:38',
      totalTime: '0:44:51',
      slippageAudit: '✅ MATCH (₹-4.85)',
      timestamp: '',
    },
    {
      id: 'fo-9',
      date: '24-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 22700.00 PE',
      entryPrice: 73.65,
      exitPrice: 12.2,
      qty: 65,
      grossPL: -3994.25,
      charges: 51.57,
      netPL: -4045.82,
      dematCrDr: 0,
      openingBalance: 25043.76,
      closingBalance: 20997.94,
      mailData: -4044.72,
      timeIn: '0.47',
      timeOut: '12:40:39',
      totalTime: '1:21:23',
      slippageAudit: '✅ MATCH (₹-1.10)',
      timestamp: '',
    },
    {
      id: 'fo-10',
      date: '24-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23000.00 PE',
      entryPrice: 86.45,
      exitPrice: 93.58,
      qty: 130,
      grossPL: 926.90,
      charges: 77.33,
      netPL: 849.57,
      dematCrDr: 0,
      openingBalance: 20997.94,
      closingBalance: 21847.52,
      mailData: 809.50,
      timeIn: '0.55',
      timeOut: '13:15:47',
      totalTime: '0:01:31',
      slippageAudit: '✅ MATCH (₹40.07)',
      timestamp: '',
    },
    {
      id: 'fo-11',
      date: '24-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23000.00 PE',
      entryPrice: 84.9,
      exitPrice: 84,
      qty: 65,
      grossPL: -58.50,
      charges: 60.83,
      netPL: -119.33,
      dematCrDr: 0,
      openingBalance: 21847.52,
      closingBalance: 21728.19,
      mailData: -127.33,
      timeIn: '0.55',
      timeOut: '13:25:23',
      totalTime: '0:06:56',
      slippageAudit: '✅ MATCH (₹8.00)',
      timestamp: '',
    },
    {
      id: 'fo-12',
      date: '24-Mar-2026',
      instrument: 'NIFTY 24 MAR 2026 23150.00 PE',
      entryPrice: 201.2,
      exitPrice: 217.3,
      qty: 65,
      grossPL: 1046.50,
      charges: 81.62,
      netPL: 964.88,
      dematCrDr: 0,
      openingBalance: 21728.19,
      closingBalance: 22693.07,
      mailData: 973.36,
      timeIn: '0.54',
      timeOut: '13:02:16',
      totalTime: '0:04:11',
      slippageAudit: '✅ MATCH (₹-8.48)',
      timestamp: '',
    },
    {
      id: 'fo-13',
      date: '25-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 PE',
      entryPrice: 201.85,
      exitPrice: 181.9,
      qty: 65,
      grossPL: -1296.75,
      charges: 77.25,
      netPL: -1374.00,
      dematCrDr: 0,
      openingBalance: 22693.07,
      closingBalance: 21319.07,
      mailData: -1470.73,
      timeIn: '0.44',
      timeOut: '11:08:04',
      totalTime: '0:29:29',
      slippageAudit: '⚠️ LEAK: ₹96.73',
      timestamp: '',
    },
    {
      id: 'fo-14',
      date: '25-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 PE',
      entryPrice: 178.9,
      exitPrice: 155.7,
      qty: 65,
      grossPL: -1508.00,
      charges: 73.33,
      netPL: -1581.33,
      dematCrDr: 0,
      openingBalance: 21319.07,
      closingBalance: 19737.74,
      mailData: -1470.73,
      timeIn: '0.40',
      timeOut: '10:32:19',
      totalTime: '0:56:56',
      slippageAudit: '⚠️ LEAK: ₹-110.60',
      timestamp: '',
    },
    {
      id: 'fo-15',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 CE',
      entryPrice: 251.2,
      exitPrice: 269.5,
      qty: 65,
      grossPL: 1189.50,
      charges: 89.63,
      netPL: 1099.87,
      dematCrDr: 0,
      openingBalance: 19737.74,
      closingBalance: 20837.62,
      mailData: -38.38,
      timeIn: '0.41',
      timeOut: '10:03:45',
      totalTime: '0:06:41',
      slippageAudit: '⚠️ LEAK: ₹1138.25',
      timestamp: '',
    },
    {
      id: 'fo-16',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 PE',
      entryPrice: 240.7,
      exitPrice: 249,
      qty: 65,
      grossPL: 539.50,
      charges: 87.41,
      netPL: 452.09,
      dematCrDr: 0,
      openingBalance: 20837.62,
      closingBalance: 21289.70,
      mailData: 758.09,
      timeIn: '0.42',
      timeOut: '10:12:24',
      totalTime: '0:07:20',
      slippageAudit: '⚠️ LEAK: ₹-306.00',
      timestamp: '',
    },
    {
      id: 'fo-17',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 CE',
      entryPrice: 250.75,
      exitPrice: 260.34,
      qty: 65,
      grossPL: 623.35,
      charges: 89.25,
      netPL: 534.10,
      dematCrDr: 0,
      openingBalance: 21289.70,
      closingBalance: 21823.80,
      mailData: -38.38,
      timeIn: '0.43',
      timeOut: '10:31:05',
      totalTime: '0:17:49',
      slippageAudit: '⚠️ LEAK: ₹572.48',
      timestamp: '',
    },
    {
      id: 'fo-18',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 PE',
      entryPrice: 229.7,
      exitPrice: 240.3,
      qty: 65,
      grossPL: 689.00,
      charges: 85.64,
      netPL: 603.36,
      dematCrDr: 0,
      openingBalance: 21823.80,
      closingBalance: 22427.17,
      mailData: 758.09,
      timeIn: '0.44',
      timeOut: '10:42:19',
      totalTime: '0:10:57',
      slippageAudit: '⚠️ LEAK: ₹-154.73',
      timestamp: '',
    },
    {
      id: 'fo-19',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 CE',
      entryPrice: 244,
      exitPrice: 215.65,
      qty: 65,
      grossPL: -1842.75,
      charges: 83.23,
      netPL: -1925.98,
      dematCrDr: 0,
      openingBalance: 22427.17,
      closingBalance: 20501.18,
      mailData: -38.38,
      timeIn: '0.45',
      timeOut: '11:25:11',
      totalTime: '0:39:32',
      slippageAudit: '⚠️ LEAK: ₹-1887.60',
      timestamp: '',
    },
    {
      id: 'fo-20',
      date: '27-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 23000.00 PE',
      entryPrice: 260.55,
      exitPrice: 268.3,
      qty: 65,
      grossPL: 503.75,
      charges: 89.95,
      netPL: 413.80,
      dematCrDr: 0,
      openingBalance: 20501.18,
      closingBalance: 20914.99,
      mailData: 758.09,
      timeIn: '0.48',
      timeOut: '11:28:21',
      totalTime: '0:02:55',
      slippageAudit: '⚠️ LEAK: ₹-344.29',
      timestamp: '',
    },
    {
      id: 'fo-21',
      date: '30-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 22550.00 PE',
      entryPrice: 146,
      exitPrice: 137.65,
      qty: 65,
      grossPL: -542.75,
      charges: 70.33,
      netPL: -613.08,
      dematCrDr: 0,
      openingBalance: 20914.99,
      closingBalance: 20301.91,
      mailData: 1480.93,
      timeIn: '0.39',
      timeOut: '11:10:09',
      totalTime: '1:54:36',
      slippageAudit: '⚠️ LEAK: ₹-2094.01',
      timestamp: '',
    },
    {
      id: 'fo-22',
      date: '30-Mar-2026',
      instrument: 'NIFTY 30 MAR 2026 22550.00 PE',
      entryPrice: 82.15,
      exitPrice: 137.65,
      qty: 65,
      grossPL: 3607.50,
      charges: 67.82,
      netPL: 3539.68,
      dematCrDr: 0,
      openingBalance: 20301.91,
      closingBalance: 23841.59,
      mailData: 1480.93,
      timeIn: '0.42',
      timeOut: '11:10:09',
      totalTime: '1:03:45',
      slippageAudit: '⚠️ LEAK: ₹2058.75',
      timestamp: '',
    },
    {
      id: 'fo-23',
      date: '1-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 23300.00 CE',
      entryPrice: 158.45,
      exitPrice: 52.7,
      qty: 65,
      grossPL: -6873.75,
      charges: 60.48,
      netPL: -6934.23,
      dematCrDr: 0,
      openingBalance: 23841.59,
      closingBalance: 16907.35,
      mailData: -7321.29,
      timeIn: '0.00',
      timeOut: '23:59:00',
      totalTime: '23:59:00',
      slippageAudit: '⚠️ LEAK: ₹387.06',
      timestamp: '',
    },
    {
      id: 'fo-24',
      date: '1-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 23600.00 CE',
      entryPrice: 66,
      exitPrice: 21.55,
      qty: 65,
      grossPL: -2889.25,
      charges: 52.63,
      netPL: -2941.88,
      dematCrDr: 0,
      openingBalance: 16907.35,
      closingBalance: 13965.47,
      mailData: -7321.29,
      timeIn: '0.00',
      timeOut: '23:59:00',
      totalTime: '23:59:00',
      slippageAudit: '⚠️ LEAK: ₹4379.41',
      timestamp: '',
    },
    {
      id: 'fo-25',
      date: '2-Apr-2026',
      instrument: 'From Bank',
      entryPrice: 0,
      exitPrice: 0,
      qty: 0,
      grossPL: 0,
      charges: 0,
      netPL: 0,
      dematCrDr: 25000,
      openingBalance: 13965.47,
      closingBalance: 38965.47,
      mailData: 0.10,
      timeIn: '',
      timeOut: '',
      totalTime: '0:00:00',
      slippageAudit: '🏦 TRANSFER',
      timestamp: '',
      isTransfer: true,
    },
    {
      id: 'fo-26',
      date: '2-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22300.00 CE',
      entryPrice: 277.25,
      exitPrice: 479.95,
      qty: 65,
      grossPL: 13175.50,
      charges: 115.91,
      netPL: 13059.59,
      dematCrDr: 0,
      openingBalance: 38965.47,
      closingBalance: 52025.06,
      mailData: 4162.65,
      timeIn: '0.41',
      timeOut: '10:03:45',
      totalTime: '0:06:41',
      slippageAudit: '⚠️ LEAK: ₹8896.94',
      timestamp: '',
    },
    {
      id: 'fo-27',
      date: '2-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22700.00 CE',
      entryPrice: 274.95,
      exitPrice: 287.65,
      qty: 65,
      grossPL: 825.50,
      charges: 93.27,
      netPL: 732.23,
      dematCrDr: 0,
      openingBalance: 52025.06,
      closingBalance: 52757.29,
      mailData: 4162.65,
      timeIn: '0.42',
      timeOut: '10:12:24',
      totalTime: '0:07:20',
      slippageAudit: '⚠️ LEAK: ₹-3430.42',
      timestamp: '',
    },
    {
      id: 'fo-28',
      date: '2-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 23600.00 CE',
      entryPrice: 13.65,
      exitPrice: 21.55,
      qty: 65,
      grossPL: 513.50,
      charges: 50.58,
      netPL: 462.92,
      dematCrDr: 0,
      openingBalance: 52757.29,
      closingBalance: 53220.21,
      mailData: 4162.65,
      timeIn: '0.44',
      timeOut: '10:42:19',
      totalTime: '0:10:57',
      slippageAudit: '⚠️ LEAK: ₹-3699.73',
      timestamp: '',
    },
    {
      id: 'fo-29',
      date: '2-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 23700.00 CE',
      entryPrice: 25.95,
      exitPrice: 52.7,
      qty: 65,
      grossPL: 1738.75,
      charges: 55.29,
      netPL: 1683.46,
      dematCrDr: 0,
      openingBalance: 53220.21,
      closingBalance: 54903.68,
      mailData: 4162.65,
      timeIn: '0.43',
      timeOut: '10:31:05',
      totalTime: '0:17:49',
      slippageAudit: '⚠️ LEAK: ₹-2479.19',
      timestamp: '',
    },
    {
      id: 'fo-30',
      date: '6-Apr-2026',
      instrument: 'To Bank',
      entryPrice: 0,
      exitPrice: 0,
      qty: 0,
      grossPL: 0,
      charges: 0,
      netPL: 0,
      dematCrDr: -26000,
      openingBalance: 54903.68,
      closingBalance: 28903.68,
      mailData: 0.10,
      timeIn: '',
      timeOut: '',
      totalTime: '0:00:00',
      slippageAudit: '🏦 TRANSFER',
      timestamp: '',
      isTransfer: true,
    },
    {
      id: 'fo-31',
      date: '6-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22700.00 CE',
      entryPrice: 170.95,
      exitPrice: 190,
      qty: 65,
      grossPL: 1238.25,
      charges: 77.36,
      netPL: 1160.89,
      dematCrDr: 0,
      openingBalance: 28903.68,
      closingBalance: 30064.57,
      mailData: 1165.58,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-4.69)',
      timestamp: '',
    },
    {
      id: 'fo-32',
      date: '6-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22700.00 PE',
      entryPrice: 174.28,
      exitPrice: 70,
      qty: 130,
      grossPL: -13556.40,
      charges: 78.37,
      netPL: -13634.77,
      dematCrDr: 0,
      openingBalance: 30064.57,
      closingBalance: 16429.80,
      mailData: -13654.22,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹19.45)',
      timestamp: '',
    },
    {
      id: 'fo-33',
      date: '6-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22750.00 CE',
      entryPrice: 158.45,
      exitPrice: 182.05,
      qty: 130,
      grossPL: 3068.00,
      charges: 103.92,
      netPL: 2964.08,
      dematCrDr: 0,
      openingBalance: 16429.80,
      closingBalance: 19393.88,
      mailData: 2942.48,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹21.60)',
      timestamp: '',
    },
    {
      id: 'fo-34',
      date: '7-Apr-2026',
      instrument: 'NIFTY 07 APR 2026 22850.00 CE',
      entryPrice: 96.33,
      exitPrice: 103.1,
      qty: 260,
      grossPL: 1760.20,
      charges: 112.49,
      netPL: 1647.71,
      dematCrDr: 0,
      openingBalance: 19393.88,
      closingBalance: 21041.59,
      mailData: 1509.92,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '⚠️ LEAK: ₹137.79',
      timestamp: '',
    },
    {
      id: 'fo-35',
      date: '7-Apr-2026',
      instrument: 'From Bank',
      entryPrice: 0,
      exitPrice: 0,
      qty: 0,
      grossPL: 0,
      charges: 0,
      netPL: 0,
      dematCrDr: 25000,
      openingBalance: 21041.59,
      closingBalance: 46041.59,
      mailData: 0.10,
      timeIn: '',
      timeOut: '',
      totalTime: '0:00:00',
      slippageAudit: '🏦 TRANSFER',
      timestamp: '',
      isTransfer: true,
    },
    {
      id: 'fo-36',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22700.00 CE',
      entryPrice: 416.25,
      exitPrice: 466.05,
      qty: 65,
      grossPL: 3237.00,
      charges: 119.81,
      netPL: 3117.19,
      dematCrDr: 0,
      openingBalance: 46041.59,
      closingBalance: 49158.78,
      mailData: 3119.43,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-2.24)',
      timestamp: '',
    },
    {
      id: 'fo-37',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22850.00 CE',
      entryPrice: 373.6,
      exitPrice: 380,
      qty: 65,
      grossPL: 416.00,
      charges: 107.76,
      netPL: 308.24,
      dematCrDr: 0,
      openingBalance: 49158.78,
      closingBalance: 49467.01,
      mailData: 310.44,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-2.20)',
      timestamp: '',
    },
    {
      id: 'fo-38',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22850.00 PE',
      entryPrice: 32.8,
      exitPrice: 36.9,
      qty: 130,
      grossPL: 533.00,
      charges: 58.67,
      netPL: 474.33,
      dematCrDr: 0,
      openingBalance: 49467.01,
      closingBalance: 49941.34,
      mailData: 427.49,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹46.84)',
      timestamp: '',
    },
    {
      id: 'fo-39',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22900.00 CE',
      entryPrice: 65.65,
      exitPrice: 67.83,
      qty: 130,
      grossPL: 283.40,
      charges: 69.67,
      netPL: 213.73,
      dematCrDr: 0,
      openingBalance: 49941.34,
      closingBalance: 50155.07,
      mailData: 167.61,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹46.12)',
      timestamp: '',
    },
    {
      id: 'fo-40',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22900.00 CE',
      entryPrice: 368.23,
      exitPrice: 379.57,
      qty: 195,
      grossPL: 2211.30,
      charges: 228.21,
      netPL: 1983.09,
      dematCrDr: 0,
      openingBalance: 50155.07,
      closingBalance: 52138.16,
      mailData: 1893.97,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '⚠️ LEAK: ₹89.12',
      timestamp: '',
    },
    {
      id: 'fo-41',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22900.00 PE',
      entryPrice: 118.75,
      exitPrice: 62.4,
      qty: 65,
      grossPL: -3662.75,
      charges: 60.31,
      netPL: -3723.06,
      dematCrDr: 0,
      openingBalance: 52138.16,
      closingBalance: 48415.11,
      mailData: -3721.20,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.86)',
      timestamp: '',
    },
    {
      id: 'fo-42',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22950.00 CE',
      entryPrice: 55,
      exitPrice: 63,
      qty: 65,
      grossPL: 520.00,
      charges: 57.83,
      netPL: 462.17,
      dematCrDr: 0,
      openingBalance: 48415.11,
      closingBalance: 48877.28,
      mailData: 463.34,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.17)',
      timestamp: '',
    },
    {
      id: 'fo-43',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 22950.00 PE',
      entryPrice: 68.74,
      exitPrice: 73.49,
      qty: 455,
      grossPL: 2161.25,
      charges: 128.26,
      netPL: 2032.99,
      dematCrDr: 0,
      openingBalance: 48877.28,
      closingBalance: 50910.27,
      mailData: 1799.76,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '⚠️ LEAK: ₹233.23',
      timestamp: '',
    },
    {
      id: 'fo-44',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23000.00 CE',
      entryPrice: 89.95,
      exitPrice: 95.3,
      qty: 65,
      grossPL: 347.75,
      charges: 62.47,
      netPL: 285.28,
      dematCrDr: 0,
      openingBalance: 50910.27,
      closingBalance: 51195.55,
      mailData: 286.01,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-0.73)',
      timestamp: '',
    },
    {
      id: 'fo-45',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23000.00 PE',
      entryPrice: 65.44,
      exitPrice: 48.34,
      qty: 325,
      grossPL: -5557.50,
      charges: 89.52,
      netPL: -5647.02,
      dematCrDr: 0,
      openingBalance: 51195.55,
      closingBalance: 45548.53,
      mailData: -5762.42,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '⚠️ LEAK: ₹115.40',
      timestamp: '',
    },
    {
      id: 'fo-46',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23050.00 CE',
      entryPrice: 53.7,
      exitPrice: 38.25,
      qty: 65,
      grossPL: -1004.25,
      charges: 54.81,
      netPL: -1059.06,
      dematCrDr: 0,
      openingBalance: 45548.53,
      closingBalance: 44489.48,
      mailData: -1057.78,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.28)',
      timestamp: '',
    },
    {
      id: 'fo-47',
      date: '7-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23050.00 PE',
      entryPrice: 346.8,
      exitPrice: 34.8,
      qty: 65,
      grossPL: -20280.00,
      charges: 65.17,
      netPL: -20345.17,
      dematCrDr: 0,
      openingBalance: 44489.48,
      closingBalance: 24144.31,
      mailData: -22575.75,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '⚠️ LEAK: ₹2230.58',
      timestamp: '',
    },
    {
      id: 'fo-48',
      date: '8-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23750.00 PE',
      entryPrice: 192.35,
      exitPrice: 157.8,
      qty: 65,
      grossPL: -2245.75,
      charges: 73.94,
      netPL: -2319.69,
      dematCrDr: 0,
      openingBalance: 24144.31,
      closingBalance: 21824.62,
      mailData: -2318.28,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.41)',
      timestamp: '',
    },
    {
      id: 'fo-49',
      date: '8-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23500.00 PE',
      entryPrice: 170,
      exitPrice: 179.4,
      qty: 65,
      grossPL: 611.00,
      charges: 75.91,
      netPL: 535.09,
      dematCrDr: 0,
      openingBalance: 21824.62,
      closingBalance: 22359.71,
      mailData: 536.43,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.34)',
      timestamp: '',
    },
    {
      id: 'fo-50',
      date: '9-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23700.00 PE',
      entryPrice: 142.6,
      exitPrice: 145.7,
      qty: 65,
      grossPL: 201.50,
      charges: 70.51,
      netPL: 130.99,
      dematCrDr: 0,
      openingBalance: 22359.71,
      closingBalance: 22490.70,
      mailData: 131.95,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-0.96)',
      timestamp: '',
    },
    {
      id: 'fo-51',
      date: '9-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23750.00 PE',
      entryPrice: 166.25,
      exitPrice: 167.15,
      qty: 65,
      grossPL: 58.50,
      charges: 74.28,
      netPL: -15.78,
      dematCrDr: 0,
      openingBalance: 22490.70,
      closingBalance: 22474.92,
      mailData: -14.42,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.36)',
      timestamp: '',
    },
    {
      id: 'fo-52',
      date: '9-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23300.00 PE',
      entryPrice: 173.35,
      exitPrice: 185,
      qty: 65,
      grossPL: 757.25,
      charges: 77.26,
      netPL: 679.99,
      dematCrDr: 0,
      openingBalance: 22474.92,
      closingBalance: 23154.92,
      mailData: 681.89,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-1.90)',
      timestamp: '',
    },
    {
      id: 'fo-53',
      date: '10-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 23950.00 CE',
      entryPrice: 177.6,
      exitPrice: 184.8,
      qty: 195,
      orders: 6,
      grossPL: 1404.00,
      charges: 230.25,
      netPL: 1173.75,
      dematCrDr: 0,
      openingBalance: 23154.92,
      closingBalance: 24328.66,
      mailData: 1177.64,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-3.89)',
      timestamp: '',
    },
    {
      id: 'fo-54',
      date: '10-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 24000.00 PE',
      entryPrice: 142.37,
      exitPrice: 142.58,
      qty: 195,
      orders: 6,
      grossPL: 40.95,
      charges: 210.14,
      netPL: -169.19,
      dematCrDr: 0,
      openingBalance: 24328.66,
      closingBalance: 24159.48,
      mailData: -165.24,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-3.95)',
      timestamp: '',
    },
    {
      id: 'fo-55',
      date: '10-Apr-2026',
      instrument: 'NIFTY 13 APR 2026 24050.00 PE',
      entryPrice: 168.12,
      exitPrice: 173.37,
      qty: 195,
      orders: 6,
      grossPL: 1023.75,
      charges: 224.79,
      netPL: 798.96,
      dematCrDr: 0,
      openingBalance: 24159.48,
      closingBalance: 24958.44,
      mailData: 802.46,
      timeIn: '',
      timeOut: '',
      totalTime: '',
      slippageAudit: '✅ MATCH (₹-3.50)',
      timestamp: '',
    },
  ];

  // Holdings mock data with live price simulation
  const holdings: Holding[] = [
    {
      companyName: 'Indian Oil Corporation Ltd',
      symbol: 'IOC',
      sector: 'Refineries',
      avgBuyPrice: 140.5025,
      totalQty: 29,
      totalInvested: 4151.96,
      totalBrokeragePaid: 96.59,
      currentValue: 4147,
      sentinelRecommendation: '💎 HOLD',
      fundamentalAction: 'STRONG BUY',
      masterSentinel: '📈 HOLD & ACCUMULATE',
      livePrice: 143.00,
      dayChange: 1.25,
      dayChangePercent: 0.88,
    },
    {
      companyName: 'GOLDBEES',
      symbol: 'GOLDBEES',
      sector: 'ETF - Gold',
      avgBuyPrice: 123.83,
      totalQty: 14,
      totalInvested: 1781.61,
      totalBrokeragePaid: 48.59,
      currentValue: 1730.4,
      sentinelRecommendation: '💎 HOLD',
      fundamentalAction: 'HOLD',
      masterSentinel: '👀 WATCH CLOSELY',
      livePrice: 123.60,
      dayChange: -0.15,
      dayChangePercent: -0.12,
    },
    {
      companyName: 'South Indian Bank Ltd',
      symbol: 'SOUTHBANK',
      sector: 'Bank - Private',
      avgBuyPrice: 35.72,
      totalQty: 18,
      totalInvested: 667.36,
      totalBrokeragePaid: 24.4,
      currentValue: 698.04,
      sentinelRecommendation: '💎 HOLD',
      fundamentalAction: 'STRONG BUY',
      masterSentinel: '📈 HOLD & ACCUMULATE',
      livePrice: 38.78,
      dayChange: 0.45,
      dayChangePercent: 1.17,
    },
    {
      companyName: 'IDFC First Bank Limited',
      symbol: 'IDFCFIRSTB',
      sector: 'Bank - Private',
      avgBuyPrice: 59.85,
      totalQty: 70,
      totalInvested: 4214.5,
      totalBrokeragePaid: 25,
      currentValue: 4641,
      sentinelRecommendation: '💎 HOLD',
      fundamentalAction: 'STRONG BUY',
      masterSentinel: '📈 HOLD & ACCUMULATE',
      livePrice: 66.30,
      dayChange: 1.20,
      dayChangePercent: 1.84,
    },
    {
      companyName: 'Indian Railway Finance Corporation',
      symbol: 'IRFC',
      sector: 'Finance Term Lending',
      avgBuyPrice: 98.14,
      totalQty: 20,
      totalInvested: 1987.8,
      totalBrokeragePaid: 25,
      currentValue: 2007.8,
      sentinelRecommendation: '💎 HOLD',
      fundamentalAction: 'STRONG BUY',
      masterSentinel: '📈 HOLD & ACCUMULATE',
      livePrice: 100.39,
      dayChange: 0.85,
      dayChangePercent: 0.85,
    },
  ];

  // Investments mock data
  const investments: Investment[] = [
    {
      companyName: 'Indian Oil Corporation Ltd',
      ticker: 'NSE:IOC',
      date: '3/18/2026',
      orderPrice: 147.08,
      filledQty: 6,
      currentPrice: 143,
      buyingBrokerage: 24.65,
      invested: 907.13,
      current: 858,
      netPL: -49.13,
      grossPL: -24.48,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'GOLDBEES',
      ticker: 'NSE:GOLDBEES',
      date: '3/19/2026',
      orderPrice: 123.93,
      filledQty: 4,
      currentPrice: 123.6,
      buyingBrokerage: 24.19,
      invested: 519.91,
      current: 494.4,
      netPL: -25.51,
      grossPL: -1.32,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'South Indian Bank Ltd',
      ticker: 'SOUTHBANK',
      date: '3/20/2026',
      orderPrice: 35.72,
      filledQty: 18,
      currentPrice: 38.78,
      buyingBrokerage: 24.4,
      invested: 667.36,
      current: 698.04,
      netPL: 30.68,
      grossPL: 55.08,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'Indian Oil Corporation Ltd',
      ticker: 'NSE:IOC',
      date: '3/23/2026',
      orderPrice: 139.8,
      filledQty: 6,
      currentPrice: 143,
      buyingBrokerage: 23.77,
      invested: 862.57,
      current: 858,
      netPL: -4.57,
      grossPL: 19.2,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'Indian Oil Corporation Ltd',
      ticker: 'NSE:IOC',
      date: '3/27/2026',
      orderPrice: 139.07,
      filledQty: 7,
      currentPrice: 143,
      buyingBrokerage: 23.77,
      invested: 997.26,
      current: 1001,
      netPL: 3.74,
      grossPL: 27.51,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'Indian Oil Corporation Ltd',
      ticker: 'NSE:IOC',
      date: '3/30/2026',
      orderPrice: 136.06,
      filledQty: 10,
      currentPrice: 143,
      buyingBrokerage: 24.4,
      invested: 1385,
      current: 1430,
      netPL: 45,
      grossPL: 69.4,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'IDFC First Bank Limited',
      ticker: 'NSE:IDFCFIRSTB',
      date: '4/2/2026',
      orderPrice: 59.85,
      filledQty: 70,
      currentPrice: 66.3,
      buyingBrokerage: 25,
      invested: 4214.5,
      current: 4641,
      netPL: 426.5,
      grossPL: 451.5,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'GOLDBEES',
      ticker: 'NSE:GOLDBEES',
      date: '4/10/2026',
      orderPrice: 123.73,
      filledQty: 10,
      currentPrice: 123.6,
      buyingBrokerage: 24.4,
      invested: 1261.7,
      current: 1236,
      netPL: -25.7,
      grossPL: -1.3,
      dematSource: 'Demat 1',
    },
    {
      companyName: 'Indian Railway Finance Corporation',
      ticker: 'IRFC',
      date: '4/8/2026',
      orderPrice: 98.14,
      filledQty: 20,
      currentPrice: 100.39,
      buyingBrokerage: 25,
      invested: 1987.8,
      current: 2007.8,
      netPL: 20,
      grossPL: 45,
      dematSource: 'Demat 1',
    },
  ];

  // IPOs mock data
  const ipos: IPO[] = [
    {
      companyName: 'CMPDI IPO',
      ticker: 'NSE:CMPDI',
      date: '3/20/2026',
      orderPrice: 172,
      filledQty: 80,
      currentPrice: 166.58,
      buyingBrokerage: 0,
      invested: 13760,
      current: 13326.4,
      netPL: -433.6,
      grossPL: -433.6,
      dematSource: 'Demat 1',
    },
  ];

  // Transaction Log mock data
  const transactionLog: TransactionLog[] = [
    { slNo: 1, date: '12-Mar-2026', entryPrice: 100.05, exitPrice: 109.625, qty: 65, totalIn: 6503.25, totalOut: 7125.625, grossPL: 622.375, netPL: 1163.10, total: 26163.10 },
    { slNo: 2, date: '13-Mar-2026', entryPrice: 244.9, exitPrice: 275.5, qty: 65, totalIn: 15918.5, totalOut: 17907.5, grossPL: 1989, netPL: 1898.38, total: 28061.48 },
    { slNo: 3, date: '17-Mar-2026', entryPrice: 262.2, exitPrice: 119.4, qty: 65, totalIn: 17043, totalOut: 7761, grossPL: -9282, netPL: -9354.17, total: 18707.31 },
    { slNo: 4, date: '18-Mar-2026', entryPrice: 169.8, exitPrice: 201.66, qty: 65, totalIn: 11037, totalOut: 13107.9, grossPL: 2070.9, netPL: 1992.13, total: 20699.44 },
    { slNo: 5, date: '19-Mar-2026', entryPrice: 266.8, exitPrice: 284.1, qty: 65, totalIn: 17342, totalOut: 18466.5, grossPL: 1124.5, netPL: 1031.69, total: 21731.13 },
    { slNo: 6, date: '20-Mar-2026', entryPrice: 202.5, exitPrice: 224.45, qty: 65, totalIn: 13162.5, totalOut: 14589.25, grossPL: 1426.75, netPL: 1343.80, total: 23074.93 },
    { slNo: 7, date: '23-Mar-2026', entryPrice: 268.85, exitPrice: 298.7, qty: 65, totalIn: 17475.25, totalOut: 19415.5, grossPL: 1940.25, netPL: 1845.78, total: 24920.71 },
    { slNo: 8, date: '24-Mar-2026', entryPrice: 106.81, exitPrice: 99.556, qty: 390, totalIn: 41655.9, totalOut: 38826.84, grossPL: -2829.06, netPL: -2227.64, total: 22693.07 },
    { slNo: 9, date: '25-Mar-2026', entryPrice: 190.375, exitPrice: 168.8, qty: 130, totalIn: 24748.75, totalOut: 21944, grossPL: -2804.75, netPL: -2955.33, total: 19737.74 },
    { slNo: 10, date: '27-Mar-2026', entryPrice: 246.15, exitPrice: 250.515, qty: 390, totalIn: 95998.5, totalOut: 97700.85, grossPL: 1702.35, netPL: 1177.24, total: 20914.99 },
    { slNo: 11, date: '30-Mar-2026', entryPrice: 114.075, exitPrice: 137.65, qty: 130, totalIn: 14829.75, totalOut: 17894.5, grossPL: 3064.75, netPL: 2926.60, total: 23841.59 },
    { slNo: 12, date: '1-Apr-2026', entryPrice: 112.225, exitPrice: 37.125, qty: 130, totalIn: 14589.25, totalOut: 4826.25, grossPL: -9763, netPL: -9876.12, total: 13965.47 },
    { slNo: 13, date: '2-Apr-2026', entryPrice: 118.36, exitPrice: 168.37, qty: 260, totalIn: 30773.6, totalOut: 43776.2, grossPL: 13002.6, netPL: 15938.21, total: 29903.68 },
    { slNo: 14, date: '6-Apr-2026', entryPrice: 125.92, exitPrice: 110.5125, qty: 325, totalIn: 40924, totalOut: 35916.5625, grossPL: -5007.4375, netPL: -9509.79, total: 20393.88 },
    { slNo: 15, date: '7-Apr-2026', entryPrice: 153.66, exitPrice: 132.0735714, qty: 1950, totalIn: 299637, totalOut: 257543.4643, grossPL: -42093.53571, netPL: -20249.58, total: 144.31 },
    { slNo: 16, date: '8-Apr-2026', entryPrice: 181.175, exitPrice: 168.6, qty: 130, totalIn: 23552.75, totalOut: 21918, grossPL: -1634.75, netPL: -1784.59, total: -1640.29 },
    { slNo: 17, date: '9-Apr-2026', entryPrice: 160.7333333, exitPrice: 165.95, qty: 195, totalIn: 31343, totalOut: 32360.25, grossPL: 1017.25, netPL: 795.20, total: -845.08 },
    { slNo: 18, date: '10-Apr-2026', entryPrice: 162.6966667, exitPrice: 166.9166667, qty: 585, totalIn: 95177.55, totalOut: 97646.25, grossPL: 2468.7, netPL: 1803.52, total: 958.44 },
  ];

  // Demat 2 investments (empty as per user data)
  const dematInvestments: DematInvestment[] = [];

  // Fundamental Analysis mock data
  const fundamentalAnalysis: FundamentalAnalysis[] = [
    {
      ticker: 'IOC',
      companyName: 'Indian Oil Corporation Ltd',
      mktCap: 134567,
      entValue: 145678,
      shares: 941.5,
      faceValue: 10,
      bookValue: 189.45,
      cash: 23456,
      debt: 45678,
      promoterPercent: 51.5,
      epsTTM: 18.45,
      roe: 12.8,
      roce: 10.5,
      salesGrowth: 8.5,
      profitGrowth: 15.2,
      peRatio: 7.75,
      pbRatio: 0.76,
      divYield: 8.5,
      ltp: 143.00,
      grahamNumber: 185.60,
      intrinsicGap: 29.8,
      pegRatio: 0.51,
      deRatio: 0.34,
      currentRatio: 1.25,
      divPayoutMos: 45,
      payoutRatio: 48.5,
      healthScore: 78,
      finalAction: 'STRONG BUY',
      yieldQuality: 'High',
      notes: 'Undervalued PSU with strong dividend yield',
    },
    {
      ticker: 'IDFCFIRSTB',
      companyName: 'IDFC First Bank Limited',
      mktCap: 45678,
      entValue: 52345,
      shares: 687.5,
      faceValue: 10,
      bookValue: 45.80,
      cash: 5678,
      debt: 12345,
      promoterPercent: 36.5,
      epsTTM: 3.85,
      roe: 8.4,
      roce: 7.2,
      salesGrowth: 22.5,
      profitGrowth: 45.8,
      peRatio: 17.22,
      pbRatio: 1.45,
      divYield: 0,
      ltp: 66.30,
      grahamNumber: 52.80,
      intrinsicGap: -20.4,
      pegRatio: 0.38,
      deRatio: 0.22,
      currentRatio: 1.15,
      divPayoutMos: 0,
      payoutRatio: 0,
      healthScore: 72,
      finalAction: 'BUY',
      yieldQuality: 'Medium',
      notes: 'Growing private bank with improving ROE',
    },
  ];

  return {
    foTrades,
    holdings,
    investments,
    ipos,
    transactionLog,
    dematInvestments,
    fundamentalAnalysis,
  };
};

// This will use the Netlify variable in production 
// and can use a fallback for local development
const GOOGLE_SHEET_URL = import.meta.env.VITE_SHEETS_API_URL;

export const fetchSheetData = async () => {
  const response = await fetch(GOOGLE_SHEET_URL);
  return response.json();
};
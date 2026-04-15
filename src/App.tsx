import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  PieChart, 
  FileText, 
  RefreshCw,
  Database
} from 'lucide-react';
import { SummaryCards } from '@/components/SummaryCards';
import { FOTradesTable } from '@/components/FOTradesTable';
import { HoldingsTable } from '@/components/HoldingsTable';
import { InvestmentsTable } from '@/components/InvestmentsTable';
import { TransactionLogTable } from '@/components/TransactionLogTable';
import { IPOTable } from '@/components/IPOTable';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { TimeFilterComponent } from '@/components/TimeFilter';
import { DataManager } from '@/components/DataManager';
import { getMockData, calculateSummary, calculateStreaks, filterDataByTime } from '@/services/sheetsService';
import type { SheetData, DashboardSummary, StreakStats, TimeFilter } from '@/types/trading';
import './App.css';

function App() {
  const [data, setData] = useState<SheetData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [streaks, setStreaks] = useState<StreakStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadData = async () => {
    setLoading(true);
    // Simulate API call - in production, this would fetch from Google Sheets
    const mockData = getMockData();
    setData(mockData);
    
    // Calculate summary with all data
    const summaryData = calculateSummary(
      mockData.foTrades, 
      mockData.holdings, 
      mockData.investments, 
      mockData.ipos,
      mockData.dematInvestments
    );
    setSummary(summaryData);
    
    // Calculate streaks
    const streakData = calculateStreaks(mockData.foTrades);
    setStreaks(streakData);
    
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered data based on time filter
  const filteredData = useMemo(() => {
    if (!data) return null;
    return filterDataByTime(data.foTrades, data.investments, data.ipos, timeFilter);
  }, [data, timeFilter]);

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    if (!data || !filteredData) return null;
    return calculateSummary(
      filteredData.foTrades,
      data.holdings,
      filteredData.investments,
      filteredData.ipos,
      data.dematInvestments
    );
  }, [data, filteredData]);

  // Calculate filtered streaks
  const filteredStreaks = useMemo(() => {
    if (!filteredData) return null;
    return calculateStreaks(filteredData.foTrades);
  }, [filteredData]);

  const getTimeRangeLabel = () => {
    switch (timeFilter) {
      case '1D': return 'Last 1 Day';
      case '1W': return 'Last 1 Week';
      case '1M': return 'Last 1 Month';
      case '3M': return 'Last 3 Months';
      case '6M': return 'Last 6 Months';
      case '1Y': return 'Last 1 Year';
      case 'FY2425': return 'FY 2024-25';
      case 'FY2526': return 'FY 2025-26';
      case 'ALL': return 'All Time';
      default: return 'All Time';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading trading data...</p>
        </div>
      </div>
    );
  }

  if (!data || !summary || !streaks || !filteredSummary || !filteredStreaks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load data</p>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TradeTracker Pro</h1>
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TimeFilterComponent value={timeFilter} onChange={setTimeFilter} />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={loadData}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-3xl mx-auto">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">F&O</span>
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Holdings</span>
            </TabsTrigger>
            <TabsTrigger value="investments" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Investments</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <SummaryCards 
              summary={filteredSummary} 
              streaks={filteredStreaks}
              timeRange={getTimeRangeLabel()}
            />
            <AnalyticsCharts 
              foTrades={filteredData?.foTrades || []} 
              holdings={data.holdings} 
              investments={filteredData?.investments || []} 
            />
          </TabsContent>

          {/* F&O Trades Tab */}
          <TabsContent value="trades">
            <FOTradesTable trades={filteredData?.foTrades || []} />
          </TabsContent>

          {/* Holdings Tab */}
          <TabsContent value="holdings">
            <HoldingsTable holdings={data.holdings} />
          </TabsContent>

          {/* Investments Tab */}
          <TabsContent value="investments">
            <InvestmentsTable investments={data.investments} />
            <div className="mt-6">
              <IPOTable ipos={data.ipos} />
            </div>
          </TabsContent>

          {/* Transaction Log Tab */}
          <TabsContent value="transactions">
            <TransactionLogTable transactions={data.transactionLog} />
          </TabsContent>

          {/* Data Manager Tab */}
          <TabsContent value="data">
            <DataManager 
              foTrades={data.foTrades}
              holdings={data.holdings}
              investments={data.investments}
              ipos={data.ipos}
              onDataChange={loadData}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>TradeTracker Pro • Portfolio Management Dashboard</p>
          <p className="mt-1">Data sourced from Google Sheets • Built with React + Tailwind</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

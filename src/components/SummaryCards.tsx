import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Target, Activity, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatPercentage } from '@/services/sheetsService';
import type { DashboardSummary, StreakStats } from '@/types/trading';

interface SummaryCardsProps {
  summary: DashboardSummary;
  streaks: StreakStats;
  timeRange: string;
}

export function SummaryCards({ summary, streaks, timeRange }: SummaryCardsProps) {
  const isProfit = summary.totalPL >= 0;
  const foIsProfit = summary.foNetPL >= 0;
  
  return (
    <div className="space-y-4">
      {/* Main Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Portfolio Value */}
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{formatCurrency(summary.currentValue)}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Invested:</span>
              <span className="text-sm font-medium">{formatCurrency(summary.totalInvested)}</span>
            </div>
            <div className={`flex items-center gap-1 mt-2 text-lg font-semibold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {isProfit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {formatCurrency(summary.totalPL)}
              <span className="text-sm">({formatPercentage(summary.totalPLPercent)})</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{timeRange}</div>
          </CardContent>
        </Card>

        {/* F&O Trading Summary */}
        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              F&O Trading P&L
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-3xl font-bold ${foIsProfit ? 'text-green-500' : 'text-red-500'}`}>
              {foIsProfit ? '+' : ''}{formatCurrency(summary.foNetPL)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Gross:</span>
              <span className={`text-sm font-medium ${summary.foTotalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.foTotalPL)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Charges:</span>
              <span className="text-sm font-medium text-amber-600">{formatCurrency(summary.foCharges)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {summary.foTotalTrades} trades • {summary.foWinningTrades}W/{summary.foLosingTrades}L
            </div>
          </CardContent>
        </Card>

        {/* Win Rate & Streaks */}
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate & Streaks
            </CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{summary.foWinRate.toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Current Streak:</span>
              <span className={`text-sm font-medium flex items-center gap-1 ${streaks.currentStreakType === 'positive' ? 'text-green-600' : streaks.currentStreakType === 'negative' ? 'text-red-600' : 'text-gray-600'}`}>
                <Flame className="h-3 w-3" />
                {streaks.currentStreak} {streaks.currentStreakType === 'positive' ? '🔥' : streaks.currentStreakType === 'negative' ? '❄️' : ''}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-green-600">Best: +{streaks.longestPositiveStreak}</span>
              <span className="text-red-600">Worst: -{streaks.longestNegativeStreak}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Demat 1 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Demat 1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCompactCurrency(summary.demat1Current)}</div>
            <div className={`text-xs ${summary.demat1PL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.demat1PL >= 0 ? '+' : ''}{formatCompactCurrency(summary.demat1PL)}
            </div>
          </CardContent>
        </Card>

        {/* Demat 2 */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Demat 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCompactCurrency(summary.demat2Current)}</div>
            <div className={`text-xs ${summary.demat2PL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.demat2PL >= 0 ? '+' : ''}{formatCompactCurrency(summary.demat2PL)}
            </div>
          </CardContent>
        </Card>

        {/* Holdings */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Holdings ({summary.holdingsCount})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCompactCurrency(summary.holdingsCurrent)}</div>
            <div className={`text-xs ${summary.holdingsPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.holdingsPL >= 0 ? '+' : ''}{formatCompactCurrency(summary.holdingsPL)}
            </div>
          </CardContent>
        </Card>

        {/* IPOs */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">IPOs ({summary.ipoCount})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCompactCurrency(summary.ipoCurrent)}</div>
            <div className={`text-xs ${summary.ipoPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.ipoPL >= 0 ? '+' : ''}{formatCompactCurrency(summary.ipoPL)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow */}
      <Card className="bg-gradient-to-r from-green-500/5 via-transparent to-red-500/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-muted-foreground">Total Deposits</div>
                <div className="text-lg font-semibold text-green-600">+{formatCurrency(summary.totalDeposits)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Withdrawals</div>
                <div className="text-lg font-semibold text-red-600">-{formatCurrency(summary.totalWithdrawals)}</div>
              </div>
              <div className="border-l pl-6">
                <div className="text-xs text-muted-foreground">Net Cash Flow</div>
                <div className={`text-lg font-semibold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

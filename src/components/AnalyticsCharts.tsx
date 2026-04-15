import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import type { FOTrade, Holding, Investment } from '@/types/trading';

interface AnalyticsChartsProps {
  foTrades: FOTrade[];
  holdings: Holding[];
  investments: Investment[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export function AnalyticsCharts({ foTrades, holdings, investments: _investments }: AnalyticsChartsProps) {
  // Prepare P&L data by date for line chart
  const plByDate = foTrades
    .filter(t => t.netPL !== 0 && !t.instrument.includes('Bank'))
    .reduce((acc, trade) => {
      const date = trade.date;
      if (!acc[date]) acc[date] = { date, netPL: 0, grossPL: 0 };
      acc[date].netPL += trade.netPL;
      acc[date].grossPL += trade.grossPL;
      return acc;
    }, {} as Record<string, { date: string; netPL: number; grossPL: number }>);

  const plChartData = Object.values(plByDate).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Cumulative P&L data
  let cumulative = 0;
  const cumulativeData = plChartData.map(d => {
    cumulative += d.netPL;
    return { date: d.date, cumulativePL: cumulative };
  });

  // Win/Loss distribution
  const winningTrades = foTrades.filter(t => t.netPL > 0 && !t.instrument.includes('Bank')).length;
  const losingTrades = foTrades.filter(t => t.netPL < 0 && !t.instrument.includes('Bank')).length;
  const winLossData = [
    { name: 'Winning Trades', value: winningTrades, color: '#10b981' },
    { name: 'Losing Trades', value: losingTrades, color: '#ef4444' },
  ];

  // Holdings distribution
  const holdingsData = holdings.map(h => ({
    name: h.symbol,
    value: h.currentValue,
    color: COLORS[holdings.indexOf(h) % COLORS.length],
  }));

  // Daily trade volume
  const tradeVolumeByDate = foTrades
    .filter(t => !t.instrument.includes('Bank'))
    .reduce((acc, trade) => {
      const date = trade.date;
      if (!acc[date]) acc[date] = { date, count: 0 };
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { date: string; count: number }>);

  const volumeData = Object.values(tradeVolumeByDate).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Cumulative P&L Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <CardTitle>Cumulative P&L Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativePL" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily P&L Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <CardTitle>Daily P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Net P&L']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="netPL" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {plChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.netPL >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Win/Loss Pie Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-purple-500" />
          <CardTitle>Win/Loss Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-amber-500" />
          <CardTitle>Holdings Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={holdingsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {holdingsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trade Volume */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="h-5 w-5 text-pink-500" />
          <CardTitle>Daily Trade Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

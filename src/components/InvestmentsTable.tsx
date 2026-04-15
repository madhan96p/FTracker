import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/services/sheetsService';
import type { Investment } from '@/types/trading';

interface InvestmentsTableProps {
  investments: Investment[];
}

export function InvestmentsTable({ investments }: InvestmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvestments = investments.filter((inv) =>
    inv.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary
  const summary = useMemo(() => {
    const totalInvested = filteredInvestments.reduce((sum, inv) => sum + inv.invested, 0);
    const totalCurrent = filteredInvestments.reduce((sum, inv) => sum + inv.current, 0);
    const totalPL = totalCurrent - totalInvested;
    const totalBrokerage = filteredInvestments.reduce((sum, inv) => sum + inv.buyingBrokerage, 0);
    return { totalInvested, totalCurrent, totalPL, totalBrokerage };
  }, [filteredInvestments]);

  const exportToCSV = () => {
    const headers = ['Company', 'Ticker', 'Date', 'Order Price', 'Qty', 'Current Price', 'Invested', 'Current', 'Net P&L'];
    const rows = filteredInvestments.map(inv => [
      inv.companyName,
      inv.ticker,
      inv.date,
      inv.orderPrice,
      inv.filledQty,
      inv.currentPrice,
      inv.invested,
      inv.current,
      inv.netPL
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investments.csv';
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Individual Investments</CardTitle>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Invested: <span className="font-medium">{formatCurrency(summary.totalInvested)}</span>
            </span>
            <span className="text-muted-foreground">
              Current: <span className="font-medium">{formatCurrency(summary.totalCurrent)}</span>
            </span>
            <span className="text-muted-foreground">
              P&L: <span className={summary.totalPL >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {summary.totalPL >= 0 ? '+' : ''}{formatCurrency(summary.totalPL)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Brokerage: <span className="text-amber-600">{formatCurrency(summary.totalBrokerage)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search investments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-48"
            />
          </div>
          <Button variant="outline" size="icon" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Company</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Order Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Net P&L</TableHead>
                <TableHead className="text-right">Gross P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestments.map((inv, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{inv.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{inv.ticker}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3" />
                      {inv.date}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₹{inv.orderPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{inv.filledQty}</TableCell>
                  <TableCell className="text-right">₹{inv.currentPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(inv.invested)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.current)}</TableCell>
                  <TableCell className={`text-right font-semibold ${inv.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {inv.netPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatCurrency(inv.netPL)}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right ${inv.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(inv.grossPL)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

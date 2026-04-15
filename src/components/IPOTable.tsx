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
import type { IPO } from '@/types/trading';

interface IPOTableProps {
  ipos: IPO[];
}

export function IPOTable({ ipos }: IPOTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIPOs = ipos.filter((ipo) =>
    ipo.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ipo.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary
  const summary = useMemo(() => {
    const totalInvested = filteredIPOs.reduce((sum, ipo) => sum + ipo.invested, 0);
    const totalCurrent = filteredIPOs.reduce((sum, ipo) => sum + ipo.current, 0);
    const totalPL = totalCurrent - totalInvested;
    return { totalInvested, totalCurrent, totalPL };
  }, [filteredIPOs]);

  const exportToCSV = () => {
    const headers = ['Company', 'Ticker', 'Date', 'Order Price', 'Qty', 'Current Price', 'Invested', 'Current', 'Net P&L'];
    const rows = filteredIPOs.map(ipo => [
      ipo.companyName,
      ipo.ticker,
      ipo.date,
      ipo.orderPrice,
      ipo.filledQty,
      ipo.currentPrice,
      ipo.invested,
      ipo.current,
      ipo.netPL
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipos.csv';
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">IPO Investments</CardTitle>
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search IPOs..."
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
              {filteredIPOs.map((ipo, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{ipo.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{ipo.ticker}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3" />
                      {ipo.date}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₹{ipo.orderPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{ipo.filledQty}</TableCell>
                  <TableCell className="text-right">₹{ipo.currentPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(ipo.invested)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ipo.current)}</TableCell>
                  <TableCell className={`text-right font-semibold ${ipo.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {ipo.netPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatCurrency(ipo.netPL)}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right ${ipo.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(ipo.grossPL)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredIPOs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No IPO investments found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/services/sheetsService';
import type { FOTrade } from '@/types/trading';

interface FOTradesTableProps {
  trades: FOTrade[];
}

export function FOTradesTable({ trades }: FOTradesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'profit' | 'loss'>('all');

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = trade.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trade.date.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'profit') return matchesSearch && trade.netPL > 0;
    if (filter === 'loss') return matchesSearch && trade.netPL < 0;
    return matchesSearch;
  });

  // Calculate summary
  const summary = useMemo(() => {
    const totalGross = filteredTrades.reduce((sum, t) => sum + t.grossPL, 0);
    const totalCharges = filteredTrades.reduce((sum, t) => sum + t.charges, 0);
    const totalNet = filteredTrades.reduce((sum, t) => sum + t.netPL, 0);
    const winning = filteredTrades.filter(t => t.netPL > 0).length;
    const losing = filteredTrades.filter(t => t.netPL < 0).length;
    return { totalGross, totalCharges, totalNet, winning, losing };
  }, [filteredTrades]);

  const exportToCSV = () => {
    const headers = ['Date', 'Instrument', 'Entry', 'Exit', 'Qty', 'Gross P&L', 'Charges', 'Net P&L', 'Status'];
    const rows = filteredTrades.map(t => [
      t.date,
      t.instrument,
      t.entryPrice,
      t.exitPrice,
      t.qty,
      t.grossPL,
      t.charges,
      t.netPL,
      t.slippageAudit
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fo-trades.csv';
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">F&O Trades</CardTitle>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Gross: <span className={summary.totalGross >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(summary.totalGross)}</span>
            </span>
            <span className="text-muted-foreground">
              Charges: <span className="text-amber-600">{formatCurrency(summary.totalCharges)}</span>
            </span>
            <span className="text-muted-foreground">
              Net: <span className={summary.totalNet >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{formatCurrency(summary.totalNet)}</span>
            </span>
            <span className="text-muted-foreground">
              {summary.winning}W / {summary.losing}L
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-48"
            />
          </div>
          <Button
            variant={filter === 'profit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(filter === 'profit' ? 'all' : 'profit')}
            className="text-green-600"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Profit
          </Button>
          <Button
            variant={filter === 'loss' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(filter === 'loss' ? 'all' : 'loss')}
            className="text-red-600"
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            Loss
          </Button>
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
                <TableHead>Date</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Gross P&L</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Net P&L</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium whitespace-nowrap">{trade.date}</TableCell>
                  <TableCell className="max-w-xs truncate" title={trade.instrument}>
                    {trade.instrument}
                  </TableCell>
                  <TableCell className="text-right">{trade.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{trade.exitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{trade.qty}</TableCell>
                  <TableCell className={`text-right ${trade.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(trade.grossPL)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(trade.charges)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${trade.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(trade.netPL)}
                  </TableCell>
                  <TableCell>
                    {trade.slippageAudit.includes('✅') ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                        Match
                      </Badge>
                    ) : trade.slippageAudit.includes('⚠️') ? (
                      <Badge variant="default" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/30">
                        Leak
                      </Badge>
                    ) : trade.slippageAudit.includes('🏦') ? (
                      <Badge variant="default" className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/30">
                        Transfer
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{trade.slippageAudit}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredTrades.length} of {trades.length} trades
        </div>
      </CardContent>
    </Card>
  );
}

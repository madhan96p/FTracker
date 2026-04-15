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
import type { TransactionLog } from '@/types/trading';

interface TransactionLogTableProps {
  transactions: TransactionLog[];
}

export function TransactionLogTable({ transactions }: TransactionLogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter((txn) =>
    txn.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary
  const summary = useMemo(() => {
    const totalIn = filteredTransactions.reduce((sum, txn) => sum + txn.totalIn, 0);
    const totalOut = filteredTransactions.reduce((sum, txn) => sum + txn.totalOut, 0);
    const totalGrossPL = filteredTransactions.reduce((sum, txn) => sum + txn.grossPL, 0);
    const totalNetPL = filteredTransactions.reduce((sum, txn) => sum + txn.netPL, 0);
    const winningTrades = filteredTransactions.filter(t => t.grossPL > 0).length;
    const losingTrades = filteredTransactions.filter(t => t.grossPL < 0).length;
    return { totalIn, totalOut, totalGrossPL, totalNetPL, winningTrades, losingTrades };
  }, [filteredTransactions]);

  const exportToCSV = () => {
    const headers = ['Sl.No', 'Date', 'Entry', 'Exit', 'Qty', 'Total In', 'Total Out', 'Gross P&L', 'Net P&L', 'Total'];
    const rows = filteredTransactions.map(t => [
      t.slNo,
      t.date,
      t.entryPrice,
      t.exitPrice,
      t.qty,
      t.totalIn,
      t.totalOut,
      t.grossPL,
      t.netPL,
      t.total
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction-log.csv';
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Trade Transaction Log</CardTitle>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Total In: <span className="font-medium">{formatCurrency(summary.totalIn)}</span>
            </span>
            <span className="text-muted-foreground">
              Total Out: <span className="font-medium">{formatCurrency(summary.totalOut)}</span>
            </span>
            <span className="text-muted-foreground">
              Gross P&L: <span className={summary.totalGrossPL >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {formatCurrency(summary.totalGrossPL)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Net P&L: <span className={summary.totalNetPL >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {formatCurrency(summary.totalNetPL)}
              </span>
            </span>
            <span className="text-muted-foreground">
              {summary.winningTrades}W / {summary.losingTrades}L
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
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
                <TableHead className="w-16">Sl.No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Entry Price</TableHead>
                <TableHead className="text-right">Exit Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total In</TableHead>
                <TableHead className="text-right">Total Out</TableHead>
                <TableHead className="text-right">Gross P&L</TableHead>
                <TableHead className="text-right">Net P&L</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((txn) => (
                <TableRow key={txn.slNo} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{txn.slNo}</TableCell>
                  <TableCell>{txn.date}</TableCell>
                  <TableCell className="text-right">{txn.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{txn.exitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{txn.qty}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(txn.totalIn)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(txn.totalOut)}</TableCell>
                  <TableCell className={`text-right font-semibold ${txn.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {txn.grossPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatCurrency(txn.grossPL)}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${txn.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(txn.netPL)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Badge variant="outline" className={txn.total >= 0 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                      {formatCurrency(txn.total)}
                    </Badge>
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

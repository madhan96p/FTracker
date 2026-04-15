import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercentage } from '@/services/sheetsService';
import type { Holding } from '@/types/trading';

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHoldings = holdings.filter((holding) =>
    holding.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holding.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary
  const summary = useMemo(() => {
    const totalInvested = filteredHoldings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalCurrent = filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPL = totalCurrent - totalInvested;
    const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const dayChange = filteredHoldings.reduce((sum, h) => sum + (h.dayChange || 0) * h.totalQty, 0);
    return { totalInvested, totalCurrent, totalPL, plPercent, dayChange };
  }, [filteredHoldings]);

  const exportToCSV = () => {
    const headers = ['Company', 'Symbol', 'Sector', 'Avg Price', 'Qty', 'Invested', 'Current', 'P&L', 'Recommendation'];
    const rows = filteredHoldings.map(h => [
      h.companyName,
      h.symbol,
      h.sector,
      h.avgBuyPrice,
      h.totalQty,
      h.totalInvested,
      h.currentValue,
      h.currentValue - h.totalInvested,
      h.sentinelRecommendation
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'holdings.csv';
    a.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Stock Holdings</CardTitle>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Invested: <span className="font-medium">{formatCurrency(summary.totalInvested)}</span>
            </span>
            <span className="text-muted-foreground">
              Current: <span className="font-medium">{formatCurrency(summary.totalCurrent)}</span>
            </span>
            <span className="text-muted-foreground">
              P&L: <span className={summary.totalPL >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {summary.totalPL >= 0 ? '+' : ''}{formatCurrency(summary.totalPL)} ({formatPercentage(summary.plPercent)})
              </span>
            </span>
            <span className="text-muted-foreground">
              Day: <span className={summary.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.dayChange >= 0 ? '+' : ''}{formatCurrency(summary.dayChange)}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search holdings..."
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
                <TableHead>Symbol</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">LTP</TableHead>
                <TableHead className="text-right">Day Change</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHoldings.map((holding, index) => {
                const pl = holding.currentValue - holding.totalInvested;
                const plPercent = (pl / holding.totalInvested) * 100;
                
                return (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{holding.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{holding.symbol}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{holding.sector}</TableCell>
                    <TableCell className="text-right">₹{holding.avgBuyPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{holding.totalQty}</TableCell>
                    <TableCell className="text-right font-medium">₹{holding.livePrice?.toFixed(2) || holding.avgBuyPrice.toFixed(2)}</TableCell>
                    <TableCell className={`text-right text-sm ${(holding.dayChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {(holding.dayChange || 0) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {holding.dayChangePercent?.toFixed(2)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(holding.totalInvested)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(holding.currentValue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(pl)}</span>
                        <span className="text-xs">({plPercent.toFixed(1)}%)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant="default" 
                          className="w-fit text-xs bg-blue-500/20 text-blue-700 hover:bg-blue-500/30"
                        >
                          {holding.sentinelRecommendation}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`w-fit text-xs ${
                            holding.fundamentalAction === 'STRONG BUY' ? 'border-green-500 text-green-600' : 
                            holding.fundamentalAction === 'BUY' ? 'border-blue-500 text-blue-600' :
                            holding.fundamentalAction === 'AVOID' ? 'border-red-500 text-red-600' : ''
                          }`}
                        >
                          {holding.fundamentalAction}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Edit, RefreshCw, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import type { FOTrade, Holding, Investment, IPO } from '@/types/trading';

interface DataManagerProps {
  foTrades: FOTrade[];
  holdings: Holding[];
  investments: Investment[];
  ipos: IPO[];
  onDataChange: () => void;
}

// Google Sheets configuration
const GOOGLE_SHEETS_CONFIG = {
  // Replace with your actual Google Sheet ID
  sheetId: 'YOUR_GOOGLE_SHEET_ID',
  // Replace with your Google Apps Script Web App URL
  scriptUrl: 'YOUR_GOOGLE_APPS_SCRIPT_URL',
};

export function DataManager({ foTrades, holdings, investments, ipos, onDataChange }: DataManagerProps) {
  const [activeTab, setActiveTab] = useState('fo');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [_editingTrade, setEditingTrade] = useState<FOTrade | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // New trade form state
  const [newTrade, setNewTrade] = useState<Partial<FOTrade>>({
    date: new Date().toISOString().split('T')[0],
    instrument: '',
    entryPrice: 0,
    exitPrice: 0,
    qty: 0,
    grossPL: 0,
    charges: 0,
    netPL: 0,
  });

  const syncToGoogleSheets = async () => {
    setSyncStatus('syncing');
    try {
      // In production, this would call your Google Apps Script
      // const response = await fetch(GOOGLE_SHEETS_CONFIG.scriptUrl, {
      //   method: 'POST',
      //   body: JSON.stringify({ foTrades, holdings, investments, ipos }),
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleAddTrade = () => {
    // In production, this would add to Google Sheets
    console.log('Adding trade:', newTrade);
    setIsAddDialogOpen(false);
    onDataChange();
  };

  const handleDeleteTrade = (id: string) => {
    // In production, this would delete from Google Sheets
    console.log('Deleting trade:', id);
    onDataChange();
  };

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Manager</h2>
          <p className="text-muted-foreground">Add, edit, or delete trading data</p>
        </div>
        <Button 
          onClick={syncToGoogleSheets} 
          disabled={syncStatus === 'syncing'}
          className="gap-2"
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : syncStatus === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync to Google Sheets'}
        </Button>
      </div>

      {/* Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="fo">F&O Trades</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="ipos">IPOs</TabsTrigger>
        </TabsList>

        {/* F&O Trades Tab */}
        <TabsContent value="fo" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">F&O Trades ({foTrades.length})</h3>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Trade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New F&O Trade</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={newTrade.date}
                      onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instrument</Label>
                    <Input 
                      placeholder="e.g., NIFTY 24 MAR 2026 23000 CE"
                      value={newTrade.instrument}
                      onChange={(e) => setNewTrade({...newTrade, instrument: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input 
                      type="number"
                      value={newTrade.entryPrice}
                      onChange={(e) => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Price</Label>
                    <Input 
                      type="number"
                      value={newTrade.exitPrice}
                      onChange={(e) => setNewTrade({...newTrade, exitPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number"
                      value={newTrade.qty}
                      onChange={(e) => setNewTrade({...newTrade, qty: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Charges</Label>
                    <Input 
                      type="number"
                      value={newTrade.charges}
                      onChange={(e) => setNewTrade({...newTrade, charges: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTrade}>Add Trade</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-2">
            {foTrades.slice(0, 10).map((trade) => (
              <Card key={trade.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{trade.instrument}</div>
                      <div className="text-sm text-muted-foreground">{trade.date}</div>
                    </div>
                    <Badge variant={trade.netPL >= 0 ? 'default' : 'destructive'} className={trade.netPL >= 0 ? 'bg-green-500/20 text-green-700' : ''}>
                      {trade.netPL >= 0 ? '+' : ''}₹{trade.netPL.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTrade(trade)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTrade(trade.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Stock Holdings ({holdings.length})</h3>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Holding
            </Button>
          </div>
          <div className="grid gap-2">
            {holdings.map((holding, index) => (
              <Card key={index} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{holding.companyName}</div>
                      <div className="text-sm text-muted-foreground">{holding.symbol} • {holding.sector}</div>
                    </div>
                    <Badge variant="outline">{holding.sentinelRecommendation}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{holding.totalQty} shares</div>
                      <div className={`text-sm ${holding.currentValue - holding.totalInvested >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        P&L: ₹{(holding.currentValue - holding.totalInvested).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Individual Investments ({investments.length})</h3>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Investment
            </Button>
          </div>
          <div className="grid gap-2">
            {investments.map((inv, index) => (
              <Card key={index} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{inv.companyName}</div>
                      <div className="text-sm text-muted-foreground">{inv.date} • {inv.filledQty} shares @ ₹{inv.orderPrice}</div>
                    </div>
                    <Badge variant="outline">{inv.dematSource}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-medium ${inv.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.netPL >= 0 ? '+' : ''}₹{inv.netPL.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* IPOs Tab */}
        <TabsContent value="ipos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">IPO Investments ({ipos.length})</h3>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add IPO
            </Button>
          </div>
          <div className="grid gap-2">
            {ipos.map((ipo, index) => (
              <Card key={index} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{ipo.companyName}</div>
                      <div className="text-sm text-muted-foreground">{ipo.ticker} • {ipo.filledQty} shares</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-medium ${ipo.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ipo.netPL >= 0 ? '+' : ''}₹{ipo.netPL.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Google Sheets Integration Info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Google Sheets Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To enable live sync with Google Sheets, update the configuration in the code:
          </p>
          <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1">
            <div>Sheet ID: {GOOGLE_SHEETS_CONFIG.sheetId}</div>
            <div>Script URL: {GOOGLE_SHEETS_CONFIG.scriptUrl}</div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium">Setup Instructions:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Create a Google Apps Script project</li>
              <li>Add the google-spreadsheet library</li>
              <li>Deploy as a web app</li>
              <li>Update the configuration above</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

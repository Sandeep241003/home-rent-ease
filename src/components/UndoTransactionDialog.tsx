import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Banknote, Home, Zap, Gift } from 'lucide-react';
import { UndoableTransaction, TransactionType } from '@/hooks/useUndoTransaction';

interface UndoTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: UndoableTransaction[];
  onConfirm: (transaction: UndoableTransaction, reason: string) => void;
  isLoading: boolean;
}

const typeIcons: Record<TransactionType, React.ReactNode> = {
  PAYMENT: <Banknote className="h-4 w-4 text-green-600" />,
  RENT: <Home className="h-4 w-4 text-blue-600" />,
  ELECTRICITY: <Zap className="h-4 w-4 text-yellow-600" />,
  CONCESSION: <Gift className="h-4 w-4 text-purple-600" />,
};

const typeLabels: Record<TransactionType, string> = {
  PAYMENT: 'Payment',
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  CONCESSION: 'Concession',
};

const typeBadgeVariants: Record<TransactionType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PAYMENT: 'default',
  RENT: 'secondary',
  ELECTRICITY: 'outline',
  CONCESSION: 'secondary',
};

export function UndoTransactionDialog({
  open,
  onOpenChange,
  transactions,
  onConfirm,
  isLoading,
}: UndoTransactionDialogProps) {
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [undoReason, setUndoReason] = useState('');

  const selectedTransaction = transactions.find(
    t => t.id === selectedTransactionId && t.type === selectedType
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getAmountIndicator = (type: TransactionType) => {
    // Payment adds money (reduces pending), others add to pending
    return type === 'PAYMENT' ? '+' : '−';
  };

  const handleClose = () => {
    setStep('select');
    setSelectedTransactionId(null);
    setSelectedType(null);
    setUndoReason('');
    onOpenChange(false);
  };

  const handleSelect = (transaction: UndoableTransaction) => {
    setSelectedTransactionId(transaction.id);
    setSelectedType(transaction.type);
  };

  const handleProceed = () => {
    if (selectedTransaction) {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (selectedTransaction && undoReason.trim()) {
      onConfirm(selectedTransaction, undoReason.trim());
      handleClose();
    }
  };

  const handleBack = () => {
    setStep('select');
    setUndoReason('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Undo Transaction</DialogTitle>
              <DialogDescription>
                Select a transaction to undo. This will reverse its financial impact.
              </DialogDescription>
            </DialogHeader>

            {transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No transactions available to undo
              </div>
            ) : (
              <ScrollArea className="max-h-[400px] pr-4">
                <RadioGroup
                  value={selectedTransaction ? `${selectedType}-${selectedTransactionId}` : ''}
                  onValueChange={(val) => {
                    const [type, ...idParts] = val.split('-');
                    const id = idParts.join('-');
                    const t = transactions.find(t => t.id === id && t.type === type);
                    if (t) handleSelect(t);
                  }}
                  className="space-y-3"
                >
                  {transactions.map((transaction) => {
                    const key = `${transaction.type}-${transaction.id}`;
                    const isSelected = selectedTransactionId === transaction.id && selectedType === transaction.type;
                    
                    return (
                      <div
                        key={key}
                        className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'border-primary bg-muted/30' : ''
                        }`}
                        onClick={() => handleSelect(transaction)}
                      >
                        <RadioGroupItem value={key} id={key} className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {typeIcons[transaction.type]}
                              <Badge variant={typeBadgeVariants[transaction.type]} className="text-xs">
                                {typeLabels[transaction.type]}
                              </Badge>
                            </div>
                            <span className={`font-mono font-medium text-sm ${
                              transaction.type === 'PAYMENT' ? 'text-green-600' : 'text-destructive'
                            }`}>
                              {getAmountIndicator(transaction.type)}₹{transaction.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {transaction.tenant_name} (Room {transaction.room_number})
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(transaction.created_at)}</span>
                            {transaction.details && (
                              <>
                                <span>•</span>
                                <span>{transaction.details}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProceed} disabled={!selectedTransaction}>
                Proceed
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Undo
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please review carefully.
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-2">
                      {typeIcons[selectedTransaction.type]}
                      <Badge variant={typeBadgeVariants[selectedTransaction.type]}>
                        {typeLabels[selectedTransaction.type]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tenant:</span>
                    <span className="font-medium text-sm">
                      {selectedTransaction.tenant_name} (Room {selectedTransaction.room_number})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className={`font-medium text-sm font-mono ${
                      selectedTransaction.type === 'PAYMENT' ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {getAmountIndicator(selectedTransaction.type)}₹{selectedTransaction.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm">{formatDate(selectedTransaction.created_at)}</span>
                  </div>
                  {selectedTransaction.details && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Details:</span>
                      <span className="text-sm">{selectedTransaction.details}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-1">
                  <p>• This will undo the selected transaction</p>
                  <p>• Financial balances will be reverted</p>
                  <p>• The transaction will be hidden from history</p>
                  <p className="font-medium">• This action cannot be undone</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Reason for Undo <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for undoing this transaction..."
                    value={undoReason}
                    onChange={(e) => setUndoReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!undoReason.trim() || isLoading}
              >
                {isLoading ? 'Undoing...' : 'Confirm Undo'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

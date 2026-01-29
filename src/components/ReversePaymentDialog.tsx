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
import { AlertTriangle } from 'lucide-react';
import { Payment } from '@/hooks/usePayments';

interface Tenant {
  id: string;
  name: string;
  room_number: string;
}

interface ReversePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: Payment[];
  tenants: Tenant[];
  onConfirm: (paymentId: string, reason: string) => void;
  isLoading: boolean;
}

export function ReversePaymentDialog({
  open,
  onOpenChange,
  payments,
  tenants,
  onConfirm,
  isLoading,
}: ReversePaymentDialogProps) {
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Filter to only non-reversed payments
  const reversiblePayments = payments.filter(p => !p.is_reversed);

  const selectedPayment = reversiblePayments.find(p => p.id === selectedPaymentId);

  const getTenantInfo = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.name} (Room ${tenant.room_number})` : 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleClose = () => {
    setStep('select');
    setSelectedPaymentId(null);
    setReversalReason('');
    onOpenChange(false);
  };

  const handleProceed = () => {
    if (selectedPaymentId) {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (selectedPaymentId && reversalReason.trim()) {
      onConfirm(selectedPaymentId, reversalReason.trim());
      handleClose();
    }
  };

  const handleBack = () => {
    setStep('select');
    setReversalReason('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Reverse Payment</DialogTitle>
              <DialogDescription>
                Select a payment to reverse. This will undo the payment and restore balances.
              </DialogDescription>
            </DialogHeader>

            {reversiblePayments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No payments available to reverse
              </div>
            ) : (
              <ScrollArea className="max-h-[400px] pr-4">
                <RadioGroup
                  value={selectedPaymentId || ''}
                  onValueChange={setSelectedPaymentId}
                  className="space-y-3"
                >
                  {reversiblePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                        selectedPaymentId === payment.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => setSelectedPaymentId(payment.id)}
                    >
                      <RadioGroupItem value={payment.id} id={payment.id} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {getTenantInfo(payment.tenant_id)}
                          </span>
                          <Badge variant="secondary" className="font-mono">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(payment.payment_date)}</span>
                          <span>•</span>
                          <span>{payment.payment_mode}</span>
                          {payment.paid_by && (
                            <>
                              <span>•</span>
                              <span>by {payment.paid_by}</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.payment_reason}
                          {payment.reason_notes && ` – ${payment.reason_notes}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProceed} disabled={!selectedPaymentId}>
                Proceed
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Reversal
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please review carefully.
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tenant:</span>
                    <span className="font-medium text-sm">
                      {getTenantInfo(selectedPayment.tenant_id)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="font-medium text-sm font-mono">
                      ₹{selectedPayment.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm">{formatDate(selectedPayment.payment_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mode:</span>
                    <span className="text-sm">{selectedPayment.payment_mode}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-1">
                  <p>• This will undo the selected payment</p>
                  <p>• Balances will be restored to pre-payment state</p>
                  <p>• The payment will be hidden from history</p>
                  <p className="font-medium">• This action cannot be undone</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Reversal Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for reversing this payment..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
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
                disabled={!reversalReason.trim() || isLoading}
              >
                {isLoading ? 'Reversing...' : 'Confirm Reversal'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

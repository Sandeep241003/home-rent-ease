import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePayments } from '@/hooks/usePayments';

interface MonthlyCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlyCollectionDialog({ open, onOpenChange }: MonthlyCollectionDialogProps) {
  const { payments } = usePayments();

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, { month: number; year: number; total: number }>();
    for (const p of payments) {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += p.amount;
      } else {
        map.set(key, { month: d.getMonth(), year: d.getFullYear(), total: p.amount });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [payments]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Monthly Collection History</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {monthlyTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2 pr-3">
              {monthlyTotals.map((entry) => {
                const isCurrent = entry.month === currentMonth && entry.year === currentYear;
                return (
                  <div
                    key={`${entry.year}-${entry.month}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                      isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                      {monthNames[entry.month]} {entry.year}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-primary/70">(Current)</span>
                      )}
                    </span>
                    <span className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                      ₹{entry.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

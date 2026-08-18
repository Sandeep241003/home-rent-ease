import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { useMonthlyHistoryData } from '@/hooks/useMonthlyHistoryData';
import { downloadMonthlyHistoryPdf } from '@/lib/monthlyHistoryPdf';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlyHistoryPdfDialog({ open, onOpenChange }: Props) {
  const { tenants, events, months, isLoading } = useMonthlyHistoryData();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const handleDownload = (month: number, year: number, label: string) => {
    if (busy) return;
    setBusy(label);
    try {
      const fileName = downloadMonthlyHistoryPdf({ tenants, events, month, year });
      toast({ title: 'PDF downloaded', description: fileName });
    } catch (error) {
      toast({
        title: 'Could not generate PDF',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Download Monthly History
          </DialogTitle>
          <DialogDescription>
            Select a month to download its financial history report as a PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading months...
            </div>
          ) : months.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No financial history available yet
            </p>
          ) : (
            months.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="font-medium">{m.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => handleDownload(m.month, m.year, m.label)}
                >
                  {busy === m.label ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

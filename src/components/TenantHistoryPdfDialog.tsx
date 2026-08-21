import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { useMonthlyHistoryData } from '@/hooks/useMonthlyHistoryData';
import { downloadTenantHistoryPdf } from '@/lib/monthlyHistoryPdf';
import { MONTH_NAMES, monthLabel } from '@/lib/monthlyHistoryData';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  /** Tenant's joining/start date (YYYY-MM-DD) — first selectable month. */
  joiningDate?: string | null;
}

/** Months from the tenant's joining month through the current month (newest first). */
function buildMonthOptions(joiningDate?: string | null) {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let startYear = endYear;
  let startMonth = endMonth;
  if (joiningDate) {
    const parts = String(joiningDate).slice(0, 10).split('-').map(Number);
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      startYear = parts[0];
      startMonth = parts[1];
    }
  }
  // Never start after the current month.
  if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
    startYear = endYear;
    startMonth = endMonth;
  }

  const options: { value: string; label: string; month: number; year: number }[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    options.push({ value: `${year}-${month}`, label: monthLabel(month, year), month, year });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return options.reverse();
}

export function TenantHistoryPdfDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  roomNumber,
  joiningDate,
}: Props) {
  const { tenants, events, isLoading } = useMonthlyHistoryData(open ? tenantId : undefined);
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const options = useMemo(() => buildMonthOptions(joiningDate), [joiningDate]);
  const defaultValue = options[0]?.value ?? `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
  const [from, setFrom] = useState(defaultValue);
  const [to, setTo] = useState(defaultValue);

  // Keep selections inside the tenant's available range.
  useEffect(() => {
    if (!options.some((o) => o.value === from)) setFrom(defaultValue);
    if (!options.some((o) => o.value === to)) setTo(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);


  const parse = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    return { year, month };
  };

  const fromKey = parse(from);
  const toKey = parse(to);
  const invalid =
    fromKey.year > toKey.year ||
    (fromKey.year === toKey.year && fromKey.month > toKey.month);

  const handleDownload = () => {
    if (invalid || generating || isLoading) return;
    setGenerating(true);
    try {
      const tenant = tenants.find((t) => t.id === tenantId) ?? {
        id: tenantId,
        name: tenantName,
        room: roomNumber,
        memberCount: 1,
      };
      const fileName = downloadTenantHistoryPdf({
        tenant,
        events,
        fromMonth: fromKey.month,
        fromYear: fromKey.year,
        toMonth: toKey.month,
        toYear: toKey.year,
      });
      toast({ title: 'PDF downloaded', description: fileName });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Could not generate PDF',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Tenant History</DialogTitle>
          <DialogDescription>
            Choose a month range to export this tenant's history as a PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border px-3 py-2">
            <p className="font-medium">{tenantName}</p>
            <p className="text-sm text-muted-foreground">Room {roomNumber}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From Month</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To Month</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {invalid && (
            <p className="text-sm text-destructive">
              From Month cannot be after To Month. Please fix the range.
            </p>
          )}
          {!invalid && (
            <p className="text-xs text-muted-foreground">
              {MONTH_NAMES[fromKey.month - 1]} {fromKey.year} to{' '}
              {MONTH_NAMES[toKey.month - 1]} {toKey.year} (inclusive)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={invalid || generating || isLoading}>
            {generating || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generating ? 'Generating PDF...' : 'Loading...'}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

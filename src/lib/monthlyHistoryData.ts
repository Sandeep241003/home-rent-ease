// Pure helpers to reconstruct the chronological financial history used by the
// Monthly History PDF export. Read-only: mirrors the arithmetic already used by
// usePayments / useTenants / useUndoTransaction, it never writes anything.

export type FinancialEventKind =
  | 'RENT'
  | 'ELECTRICITY'
  | 'CONCESSION'
  | 'EXTRA'
  | 'PAYMENT';

export interface FinancialEvent {
  tenantId: string;
  kind: FinancialEventKind;
  /** ISO timestamp of when the event actually happened */
  date: string;
  /** Always positive; the sign is implied by `kind` */
  amount: number;
  /** Signed effect on the tenant balance (positive = increases what is owed) */
  delta: number;
  reason?: string;
  paymentMode?: string;
  paymentReason?: string;
  paidBy?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  room: string;
}

export interface MonthKey {
  month: number; // 1-12
  year: number;
  label: string;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Extracts the human reason stored at the end of a concession / extra-charge log line. */
export function extractReason(description: string): string {
  const match = description.match(/Room\s+[^:]*:\s*(.+)$/);
  if (match) return match[1].trim();
  const idx = description.indexOf(': ');
  return idx >= 0 ? description.slice(idx + 2).trim() : description.trim();
}

export function sortEvents(events: FinancialEvent[]): FinancialEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** Distinct months (newest first) that contain at least one financial event. */
export function availableMonths(events: FinancialEvent[]): MonthKey[] {
  const seen = new Map<string, MonthKey>();
  events.forEach((e) => {
    const d = new Date(e.date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const key = `${year}-${month}`;
    if (!seen.has(key)) {
      seen.set(key, { month, year, label: monthLabel(month, year) });
    }
  });
  return Array.from(seen.values()).sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month,
  );
}

export interface TenantMonthRow {
  before: number;
  after: number;
  event: FinancialEvent;
}

export interface TenantMonthHistory {
  tenant: TenantInfo;
  opening: number;
  closing: number;
  rows: TenantMonthRow[];
}

/**
 * Balance is a single signed number:
 *   > 0 -> pending amount owed
 *   < 0 -> advance / extra balance available
 * Charges increase it, payments and concessions reduce it — exactly the netting
 * the app already performs on pending_amount / extra_balance.
 */
export function buildTenantMonthHistory(
  tenant: TenantInfo,
  allEvents: FinancialEvent[],
  month: number,
  year: number,
): TenantMonthHistory {
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();

  const tenantEvents = sortEvents(allEvents.filter((e) => e.tenantId === tenant.id));

  let balance = 0;
  const rows: TenantMonthRow[] = [];

  tenantEvents.forEach((event) => {
    const time = new Date(event.date).getTime();
    if (time < start) {
      balance += event.delta;
      return;
    }
    if (time >= end) return;
    const before = balance;
    balance += event.delta;
    rows.push({ before, after: balance, event });
  });

  const opening = rows.length > 0 ? rows[0].before : balance;

  return { tenant, opening, closing: balance, rows };
}

export interface MonthSummary {
  received: number;
  pending: number;
  rent: number;
  electricity: number;
  concession: number;
  extra: number;
}

export function buildMonthSummary(histories: TenantMonthHistory[]): MonthSummary {
  const summary: MonthSummary = {
    received: 0, pending: 0, rent: 0, electricity: 0, concession: 0, extra: 0,
  };
  histories.forEach((h) => {
    h.rows.forEach(({ event }) => {
      if (event.kind === 'PAYMENT') summary.received += event.amount;
      if (event.kind === 'RENT') summary.rent += event.amount;
      if (event.kind === 'ELECTRICITY') summary.electricity += event.amount;
      if (event.kind === 'CONCESSION') summary.concession += event.amount;
      if (event.kind === 'EXTRA') summary.extra += event.amount;
    });
    if (h.closing > 0) summary.pending += h.closing;
  });
  return summary;
}

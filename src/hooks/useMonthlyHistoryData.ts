import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FinancialEvent,
  TenantInfo,
  availableMonths,
  extractReason,
  sortEvents,
} from '@/lib/monthlyHistoryData';

/**
 * Read-only aggregation of the existing financial tables for the Monthly
 * History PDF export. Applies the same reversal-exclusion rules the app
 * already uses so undone transactions never show up as completed ones.
 */
export function useMonthlyHistoryData(tenantId?: string) {
  const query = useQuery({
    queryKey: ['monthly-history-data', tenantId ?? 'all'],
    queryFn: async () => {
      // Scope every query to a single tenant when requested (data isolation).
      const scope = <T extends { eq: (col: string, val: string) => T }>(q: T): T =>
        tenantId ? q.eq('tenant_id', tenantId) : q;
      const [
        tenantsRes,
        rentRes,
        elecRes,
        paymentsRes,
        concessionRes,
        concessionReversedRes,
        extraRes,
        extraReversedRes,
      ] = await Promise.all([
        (() => {
          const q = supabase.from('tenants').select('id, name, room_number, members');
          return tenantId ? q.eq('id', tenantId) : q;
        })(),
        scope(
          supabase.from('monthly_rent_entries').select('*').eq('is_reversed', false),
        ),
        scope(
          supabase.from('electricity_readings').select('*').eq('is_reversed', false),
        ),
        scope(supabase.from('payments').select('*').eq('is_reversed', false)),
        scope(
          supabase
            .from('activity_log')
            .select('*')
            .eq('event_type', 'CONCESSION_APPLIED')
            .order('created_at', { ascending: false }),
        ),
        scope(
          supabase.from('activity_log').select('tenant_id, amount').eq('event_type', 'CONCESSION_REVERSED'),
        ),
        scope(
          supabase
            .from('activity_log')
            .select('*')
            .eq('event_type', 'EXTRA_CHARGE_ADDED')
            .order('created_at', { ascending: false }),
        ),
        scope(
          supabase.from('activity_log').select('tenant_id, amount').eq('event_type', 'EXTRA_CHARGE_REVERSED'),
        ),
      ]);

      const firstError =
        tenantsRes.error || rentRes.error || elecRes.error || paymentsRes.error;
      if (firstError) throw firstError;

      const tenants: TenantInfo[] = (tenantsRes.data ?? []).map((t) => {
        const raw = t.members;
        const parsed = Array.isArray(raw)
          ? raw
          : typeof raw === 'string'
            ? (() => {
                try {
                  return JSON.parse(raw);
                } catch {
                  return [];
                }
              })()
            : [];
        const activeMembers = (parsed as { is_active?: boolean }[]).filter(
          (m) => m && m.is_active !== false,
        );
        return {
          id: t.id,
          name: t.name,
          room: t.room_number,
          memberCount: activeMembers.length || 1,
        };
      });

      const events: FinancialEvent[] = [];

      (rentRes.data ?? []).forEach((r) => {
        events.push({
          tenantId: r.tenant_id,
          kind: 'RENT',
          date: r.created_at ?? new Date(r.year, r.month - 1, 1).toISOString(),
          amount: Number(r.rent_amount),
          delta: Number(r.rent_amount),
        });
      });

      (elecRes.data ?? []).forEach((e) => {
        events.push({
          tenantId: e.tenant_id,
          kind: 'ELECTRICITY',
          date: e.created_at ?? `${e.reading_date}T00:00:00.000Z`,
          amount: Number(e.bill_amount),
          delta: Number(e.bill_amount),
          previousReading:
            e.previous_reading === null || e.previous_reading === undefined
              ? undefined
              : Number(e.previous_reading),
          currentReading:
            e.current_reading === null || e.current_reading === undefined
              ? undefined
              : Number(e.current_reading),
        });
      });

      (paymentsRes.data ?? []).forEach((p) => {
        events.push({
          tenantId: p.tenant_id,
          kind: 'PAYMENT',
          date: p.payment_date ?? p.created_at ?? new Date().toISOString(),
          amount: Number(p.amount),
          delta: -Number(p.amount),
          paymentMode: p.payment_mode,
          paymentReason:
            p.payment_reason === 'Other' && p.reason_notes
              ? p.reason_notes
              : p.payment_reason,
          paidBy: p.paid_by ?? undefined,
        });
      });

      // Concessions / extra charges live in the activity log; a reversal is a
      // matching *_REVERSED entry (same pairing rule as useUndoTransaction).
      const consumeReversal = (
        reversals: { tenant_id: string; amount: number | null }[] | null,
      ) => {
        const keys = new Set(
          (reversals ?? []).map(
            (r) => `${r.tenant_id}|${Math.abs(Number(r.amount) || 0)}`,
          ),
        );
        return (tenantId: string, amount: number) => {
          const key = `${tenantId}|${Math.abs(amount)}`;
          if (keys.has(key)) {
            keys.delete(key);
            return true;
          }
          return false;
        };
      };

      const isConcessionReversed = consumeReversal(concessionReversedRes.data);
      (concessionRes.data ?? []).forEach((c) => {
        const amount = Math.abs(Number(c.amount) || 0);
        if (isConcessionReversed(c.tenant_id, amount)) return;
        events.push({
          tenantId: c.tenant_id,
          kind: 'CONCESSION',
          date: c.created_at,
          amount,
          delta: -amount,
          reason: extractReason(c.description),
        });
      });

      const isExtraReversed = consumeReversal(extraReversedRes.data);
      (extraRes.data ?? []).forEach((e) => {
        const amount = Math.abs(Number(e.amount) || 0);
        if (isExtraReversed(e.tenant_id, amount)) return;
        events.push({
          tenantId: e.tenant_id,
          kind: 'EXTRA',
          date: e.created_at,
          amount,
          delta: amount,
          reason: extractReason(e.description),
        });
      });

      const sorted = sortEvents(events);
      return {
        tenants,
        events: sorted,
        months: availableMonths(sorted),
      };
    },
  });

  return {
    tenants: query.data?.tenants ?? [],
    events: query.data?.events ?? [],
    months: query.data?.months ?? [],
    isLoading: query.isLoading,
  };
}

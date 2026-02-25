import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TransactionType = 'PAYMENT' | 'RENT' | 'ELECTRICITY' | 'CONCESSION';

export interface UndoableTransaction {
  id: string;
  type: TransactionType;
  tenant_id: string;
  amount: number;
  description: string;
  created_at: string;
  tenant_name?: string;
  room_number?: string;
  details?: string;
}

export function useUndoTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const transactionsQuery = useQuery({
    queryKey: ['undoable-transactions'],
    queryFn: async () => {
      const transactions: UndoableTransaction[] = [];

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, room_number');
      
      const tenantMap = new Map(tenants?.map(t => [t.id, { name: t.name, room: t.room_number }]) ?? []);

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });

      payments?.forEach(p => {
        const tenant = tenantMap.get(p.tenant_id);
        transactions.push({
          id: p.id,
          type: 'PAYMENT',
          tenant_id: p.tenant_id,
          amount: p.amount,
          description: `Payment received: ₹${p.amount.toLocaleString('en-IN')} via ${p.payment_mode}`,
          created_at: p.payment_date || p.created_at,
          tenant_name: tenant?.name,
          room_number: tenant?.room,
          details: p.payment_reason + (p.reason_notes ? ` – ${p.reason_notes}` : ''),
        });
      });

      const { data: rentEntries } = await supabase
        .from('monthly_rent_entries')
        .select('*')
        .eq('is_reversed', false)
        .order('created_at', { ascending: false });

      rentEntries?.forEach(r => {
        const tenant = tenantMap.get(r.tenant_id);
        const monthName = new Date(r.year, r.month - 1).toLocaleString('en-IN', { month: 'long' });
        transactions.push({
          id: r.id,
          type: 'RENT',
          tenant_id: r.tenant_id,
          amount: r.rent_amount,
          description: `Monthly rent added for ${monthName} ${r.year}: ₹${r.rent_amount.toLocaleString('en-IN')}`,
          created_at: r.created_at || '',
          tenant_name: tenant?.name,
          room_number: tenant?.room,
          details: `${monthName} ${r.year}`,
        });
      });

      const { data: electricityReadings } = await supabase
        .from('electricity_readings')
        .select('*')
        .eq('is_reversed', false)
        .order('created_at', { ascending: false });

      electricityReadings?.forEach(e => {
        const tenant = tenantMap.get(e.tenant_id);
        const monthName = new Date(e.year, e.month - 1).toLocaleString('en-IN', { month: 'long' });
        transactions.push({
          id: e.id,
          type: 'ELECTRICITY',
          tenant_id: e.tenant_id,
          amount: e.bill_amount,
          description: `Electricity bill for ${monthName} ${e.year}: ₹${e.bill_amount.toLocaleString('en-IN')}`,
          created_at: e.created_at || '',
          tenant_name: tenant?.name,
          room_number: tenant?.room,
          details: `${e.units_consumed} units @ ₹${e.rate_per_unit}/unit`,
        });
      });

      const { data: concessionLogs } = await supabase
        .from('activity_log')
        .select('*')
        .eq('event_type', 'CONCESSION_APPLIED')
        .order('created_at', { ascending: false });

      concessionLogs?.forEach(c => {
        const tenant = tenantMap.get(c.tenant_id);
        transactions.push({
          id: c.id,
          type: 'CONCESSION',
          tenant_id: c.tenant_id,
          amount: Math.abs(c.amount || 0),
          description: c.description,
          created_at: c.created_at,
          tenant_name: tenant?.name,
          room_number: tenant?.room,
          details: 'Concession applied',
        });
      });

      return transactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const undoTransaction = useMutation({
    mutationFn: async ({
      transaction,
      reason,
    }: {
      transaction: UndoableTransaction;
      reason: string;
    }) => {
      const { type, id, tenant_id, amount } = transaction;

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('pending_amount, total_paid, extra_balance, name, room_number')
        .eq('id', tenant_id)
        .single();

      if (tenantError) throw tenantError;

      const currentPending = tenant.pending_amount || 0;
      const currentTotalPaid = tenant.total_paid || 0;
      const currentExtraBalance = tenant.extra_balance || 0;

      let newPending = currentPending;
      let newTotalPaid = currentTotalPaid;
      let newExtraBalance = currentExtraBalance;
      let eventType = 'TRANSACTION_UNDONE';
      let logDescription = '';

      switch (type) {
        case 'PAYMENT': {
          newTotalPaid = currentTotalPaid - amount;

          if (currentExtraBalance > 0) {
            const extraReduction = Math.min(currentExtraBalance, amount);
            newExtraBalance = currentExtraBalance - extraReduction;
            const remainingToRestore = amount - extraReduction;
            newPending = currentPending + remainingToRestore;
          } else {
            newPending = currentPending + amount;
          }

          const { error: paymentUpdateError } = await supabase
            .from('payments')
            .update({
              is_reversed: true,
              reversed_at: new Date().toISOString(),
              reversal_reason: reason,
            })
            .eq('id', id);

          if (paymentUpdateError) throw paymentUpdateError;

          eventType = 'PAYMENT_REVERSED';
          logDescription = `Payment reversed: ₹${amount.toLocaleString('en-IN')} – ${reason}`;
          break;
        }

        case 'RENT': {
          newPending = Math.max(0, currentPending - amount);
          
          const { error: rentUpdateError } = await supabase
            .from('monthly_rent_entries')
            .update({
              is_reversed: true,
              reversed_at: new Date().toISOString(),
              reversal_reason: reason,
            })
            .eq('id', id);

          if (rentUpdateError) throw rentUpdateError;

          eventType = 'RENT_REVERSED';
          logDescription = `Monthly rent undone: ₹${amount.toLocaleString('en-IN')} – ${reason}`;
          break;
        }

        case 'ELECTRICITY': {
          newPending = Math.max(0, currentPending - amount);

          const { error: electricityUpdateError } = await supabase
            .from('electricity_readings')
            .update({
              is_reversed: true,
              reversed_at: new Date().toISOString(),
              reversal_reason: reason,
            })
            .eq('id', id);

          if (electricityUpdateError) throw electricityUpdateError;

          eventType = 'ELECTRICITY_REVERSED';
          logDescription = `Electricity bill undone: ₹${amount.toLocaleString('en-IN')} – ${reason}`;
          break;
        }

        case 'CONCESSION': {
          newPending = currentPending + amount;
          eventType = 'CONCESSION_REVERSED';
          logDescription = `Concession undone: ₹${amount.toLocaleString('en-IN')} – ${reason}`;
          break;
        }
      }

      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({
          pending_amount: newPending,
          total_paid: newTotalPaid,
          extra_balance: newExtraBalance,
        })
        .eq('id', tenant_id);

      if (updateTenantError) throw updateTenantError;

      await supabase.from('activity_log').insert({
        tenant_id: tenant_id,
        event_type: eventType,
        description: logDescription,
        amount: -amount,
      });

      return { type, amount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['undoable-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-entries'] });
      queryClient.invalidateQueries({ queryKey: ['electricity'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ 
        title: 'Transaction undone successfully',
        description: `${data.type} of ₹${data.amount.toLocaleString('en-IN')} has been reversed.`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error undoing transaction', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    transactions: transactionsQuery.data ?? [],
    isLoading: transactionsQuery.isLoading,
    undoTransaction,
    refetch: transactionsQuery.refetch,
  };
}

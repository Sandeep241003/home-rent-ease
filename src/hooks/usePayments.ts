import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_mode: 'Cash' | 'UPI' | 'Bank';
  payment_date: string;
  payment_reason: string;
  reason_notes: string | null;
  notes: string | null;
  paid_by: string | null;
  created_at: string;
  is_reversed: boolean;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export function usePayments(tenantId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const paymentsQuery = useQuery({
    queryKey: ['payments', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });

  const allPaymentsQuery = useQuery({
    queryKey: ['all-payments', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });

  const addPayment = useMutation({
    mutationFn: async ({ 
      tenantId, 
      amount, 
      paymentMode,
      paymentReason,
      reasonNotes,
      paymentDate,
      paidBy,
    }: { 
      tenantId: string; 
      amount: number; 
      paymentMode: 'Cash' | 'UPI' | 'Bank';
      paymentReason: string;
      reasonNotes?: string;
      paymentDate: string;
      paidBy?: string;
    }) => {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('pending_amount, total_paid, extra_balance, name, room_number')
        .eq('id', tenantId)
        .single();
      
      if (tenantError) throw tenantError;

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenantId,
          amount,
          payment_mode: paymentMode,
          payment_reason: paymentReason,
          reason_notes: reasonNotes || null,
          payment_date: paymentDate,
          paid_by: paidBy || null,
        });
      
      if (paymentError) throw paymentError;

      const currentPending = tenant.pending_amount || 0;
      const currentExtraBalance = tenant.extra_balance || 0;
      const newTotalPaid = (tenant.total_paid || 0) + amount;

      let newPending = currentPending;
      let newExtraBalance = currentExtraBalance;
      let extraAdded = 0;

      if (amount >= currentPending) {
        newPending = 0;
        extraAdded = amount - currentPending;
        newExtraBalance = currentExtraBalance + extraAdded;
      } else {
        newPending = currentPending - amount;
      }

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          pending_amount: newPending,
          total_paid: newTotalPaid,
          extra_balance: newExtraBalance,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      const formattedDate = new Date(paymentDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const reasonText = paymentReason === 'Other' && reasonNotes 
        ? reasonNotes 
        : paymentReason;
      
      const paidByText = paidBy ? ` by ${paidBy}` : '';
      
      await supabase.from('activity_log').insert({
        tenant_id: tenantId,
        event_type: 'PAYMENT_RECEIVED',
        description: `Payment received${paidByText}: ₹${amount.toLocaleString('en-IN')} via ${paymentMode} for ${reasonText} (Date: ${formattedDate})`,
        amount,
      });

      if (extraAdded > 0) {
        await supabase.from('activity_log').insert({
          tenant_id: tenantId,
          event_type: 'EXTRA_ADDED',
          description: `Extra/Advance balance added: ₹${extraAdded.toLocaleString('en-IN')} (Payment exceeded pending by ₹${extraAdded.toLocaleString('en-IN')})`,
          amount: extraAdded,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ title: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });

  const reversePayment = useMutation({
    mutationFn: async ({
      paymentId,
      reversalReason,
    }: {
      paymentId: string;
      reversalReason: string;
    }) => {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) throw paymentError;
      if (!payment) throw new Error('Payment not found');
      if (payment.is_reversed) throw new Error('Payment already reversed');

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('pending_amount, total_paid, extra_balance, name, room_number')
        .eq('id', payment.tenant_id)
        .single();
      
      if (tenantError) throw tenantError;

      const paymentAmount = payment.amount;
      const currentPending = tenant.pending_amount || 0;
      const currentExtraBalance = tenant.extra_balance || 0;
      const currentTotalPaid = tenant.total_paid || 0;

      let newPending = currentPending;
      let newExtraBalance = currentExtraBalance;
      const newTotalPaid = currentTotalPaid - paymentAmount;

      if (currentExtraBalance > 0) {
        const extraReduction = Math.min(currentExtraBalance, paymentAmount);
        newExtraBalance = currentExtraBalance - extraReduction;
        const remainingToRestore = paymentAmount - extraReduction;
        newPending = currentPending + remainingToRestore;
      } else {
        newPending = currentPending + paymentAmount;
      }

      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          is_reversed: true,
          reversed_at: new Date().toISOString(),
          reversal_reason: reversalReason,
        })
        .eq('id', paymentId);

      if (updatePaymentError) throw updatePaymentError;

      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({
          pending_amount: newPending,
          total_paid: newTotalPaid,
          extra_balance: newExtraBalance,
        })
        .eq('id', payment.tenant_id);

      if (updateTenantError) throw updateTenantError;

      await supabase.from('activity_log').insert({
        tenant_id: payment.tenant_id,
        event_type: 'PAYMENT_REVERSED',
        description: `Payment reversed: ₹${paymentAmount.toLocaleString('en-IN')} – ${reversalReason}`,
        amount: -paymentAmount,
      });

      return { payment, tenant };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ title: 'Payment reversed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reversing payment', description: error.message, variant: 'destructive' });
    },
  });

  return {
    payments: paymentsQuery.data ?? [],
    allPayments: allPaymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    addPayment,
    reversePayment,
    refetch: paymentsQuery.refetch,
  };
}

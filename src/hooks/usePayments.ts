import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_mode: 'Cash' | 'UPI' | 'Bank';
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export function usePayments(tenantId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const paymentsQuery = useQuery({
    queryKey: ['payments', tenantId],
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
    enabled: !!user,
  });

  const addPayment = useMutation({
    mutationFn: async ({ 
      tenantId, 
      amount, 
      paymentMode 
    }: { 
      tenantId: string; 
      amount: number; 
      paymentMode: 'Cash' | 'UPI' | 'Bank';
    }) => {
      // Get current tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('pending_amount, total_paid')
        .eq('id', tenantId)
        .single();
      
      if (tenantError) throw tenantError;

      // Insert payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenantId,
          amount,
          payment_mode: paymentMode,
        });
      
      if (paymentError) throw paymentError;

      // Update tenant balance
      const newPending = Math.max(0, (tenant.pending_amount || 0) - amount);
      const newTotalPaid = (tenant.total_paid || 0) + amount;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          pending_amount: newPending,
          total_paid: newTotalPaid,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    addPayment,
    refetch: paymentsQuery.refetch,
  };
}

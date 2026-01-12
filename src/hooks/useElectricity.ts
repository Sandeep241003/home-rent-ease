import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ElectricityReading {
  id: string;
  tenant_id: string;
  previous_reading: number;
  current_reading: number;
  units_consumed: number;
  rate_per_unit: number;
  bill_amount: number;
  month: number;
  year: number;
  reading_date: string;
  created_at: string;
}

export function useElectricity(tenantId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const readingsQuery = useQuery({
    queryKey: ['electricity', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('electricity_readings')
        .select('*')
        .order('reading_date', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ElectricityReading[];
    },
    enabled: !!user,
  });

  const addReading = useMutation({
    mutationFn: async ({
      tenantId,
      currentReading,
    }: {
      tenantId: string;
      currentReading: number;
    }) => {
      // Get current tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('current_meter_reading, electricity_rate, pending_amount, extra_balance, name')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      const previousReading = tenant.current_meter_reading;
      const unitsConsumed = currentReading - previousReading;
      
      if (unitsConsumed < 0) {
        throw new Error('Current reading cannot be less than previous reading');
      }

      const billAmount = unitsConsumed * tenant.electricity_rate;

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Insert reading
      const { error: readingError } = await supabase
        .from('electricity_readings')
        .insert({
          tenant_id: tenantId,
          previous_reading: previousReading,
          current_reading: currentReading,
          units_consumed: unitsConsumed,
          rate_per_unit: tenant.electricity_rate,
          bill_amount: billAmount,
          month,
          year,
        });

      if (readingError) throw readingError;

      // Calculate new pending with extra balance consideration
      const currentPending = tenant.pending_amount || 0;
      const extraBalance = tenant.extra_balance || 0;

      let newPending = currentPending;
      let newExtraBalance = extraBalance;
      let adjustedFromExtra = 0;

      if (extraBalance >= billAmount) {
        // Extra balance covers full electricity bill
        newExtraBalance = extraBalance - billAmount;
        adjustedFromExtra = billAmount;
      } else if (extraBalance > 0) {
        // Partial coverage from extra balance
        adjustedFromExtra = extraBalance;
        newPending = currentPending + (billAmount - extraBalance);
        newExtraBalance = 0;
      } else {
        // No extra balance
        newPending = currentPending + billAmount;
      }

      // Update tenant
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          current_meter_reading: currentReading,
          pending_amount: newPending,
          extra_balance: newExtraBalance,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      // Log electricity added
      const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
      await supabase.from('activity_log').insert({
        tenant_id: tenantId,
        event_type: 'ELECTRICITY_ADDED',
        description: `Electricity bill for ${monthName} ${year}: ${unitsConsumed.toFixed(2)} units × ₹${tenant.electricity_rate} = ₹${billAmount.toLocaleString('en-IN')}`,
        amount: billAmount,
      });

      // Log extra balance adjustment if any
      if (adjustedFromExtra > 0) {
        await supabase.from('activity_log').insert({
          tenant_id: tenantId,
          event_type: 'EXTRA_ADJUSTED',
          description: `Extra balance used for electricity: ₹${adjustedFromExtra.toLocaleString('en-IN')} deducted from advance`,
          amount: -adjustedFromExtra,
        });
      }

      return { unitsConsumed, billAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['electricity'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ 
        title: 'Electricity bill recorded', 
        description: `${data.unitsConsumed} units = ₹${data.billAmount.toFixed(2)}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording reading', description: error.message, variant: 'destructive' });
    },
  });

  return {
    readings: readingsQuery.data ?? [],
    isLoading: readingsQuery.isLoading,
    addReading,
    refetch: readingsQuery.refetch,
  };
}

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
  reading_date: string;
  month: number;
  year: number;
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
      currentReading 
    }: { 
      tenantId: string; 
      currentReading: number;
    }) => {
      // Get current tenant data
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('current_meter_reading, electricity_rate, pending_amount')
        .eq('id', tenantId)
        .single();
      
      if (tenantError) throw tenantError;

      const previousReading = tenant.current_meter_reading || 0;
      const unitsConsumed = currentReading - previousReading;
      
      if (unitsConsumed < 0) {
        throw new Error('Current reading cannot be less than previous reading');
      }

      const billAmount = unitsConsumed * (tenant.electricity_rate || 0);
      const now = new Date();

      // Insert electricity reading
      const { error: readingError } = await supabase
        .from('electricity_readings')
        .insert({
          tenant_id: tenantId,
          previous_reading: previousReading,
          current_reading: currentReading,
          units_consumed: unitsConsumed,
          rate_per_unit: tenant.electricity_rate,
          bill_amount: billAmount,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
      
      if (readingError) throw readingError;

      // Update tenant's current meter reading and pending amount
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          current_meter_reading: currentReading,
          pending_amount: (tenant.pending_amount || 0) + billAmount,
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      return { unitsConsumed, billAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['electricity'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
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

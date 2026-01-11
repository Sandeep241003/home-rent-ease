import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Tenant {
  id: string;
  landlord_id: string;
  name: string;
  phone: string;
  room_number: string;
  monthly_rent: number;
  electricity_rate: number;
  initial_meter_reading: number;
  current_meter_reading: number;
  joining_date: string;
  is_active: boolean;
  pending_amount: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
}

export interface TenantFormData {
  name: string;
  phone: string;
  room_number: string;
  monthly_rent: number;
  electricity_rate: number;
  initial_meter_reading: number;
  joining_date: string;
}

export function useTenants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('room_number', { ascending: true });
      
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!user,
  });

  const addTenant = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { error } = await supabase.from('tenants').insert({
        landlord_id: user!.id,
        ...data,
        current_meter_reading: data.initial_meter_reading,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding tenant', description: error.message, variant: 'destructive' });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TenantFormData & { is_active: boolean }> }) => {
      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Tenant updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating tenant', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tenants: tenantsQuery.data ?? [],
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    addTenant,
    updateTenant,
    refetch: tenantsQuery.refetch,
  };
}

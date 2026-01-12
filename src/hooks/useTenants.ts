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
  extra_balance: number;
  gender: string | null;
  occupation: string | null;
  aadhaar_image_url: string | null;
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
  gender?: string;
  occupation?: string;
  aadhaar_image_url?: string;
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
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const joiningDate = new Date(data.joining_date);
      const joinedMonth = joiningDate.getMonth() + 1;
      const joinedYear = joiningDate.getFullYear();

      // Determine if first month rent should be added
      const shouldAddFirstRent = 
        joinedYear < currentYear || 
        (joinedYear === currentYear && joinedMonth <= currentMonth);

      const initialPending = shouldAddFirstRent ? data.monthly_rent : 0;

      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          landlord_id: user!.id,
          ...data,
          current_meter_reading: data.initial_meter_reading,
          pending_amount: initialPending,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Log tenant created
      await supabase.from('activity_log').insert({
        tenant_id: newTenant.id,
        event_type: 'TENANT_CREATED',
        description: `Tenant "${data.name}" added to Room ${data.room_number}`,
        amount: null,
      });

      // Add first month rent entry if applicable
      if (shouldAddFirstRent) {
        await supabase.from('monthly_rent_entries').insert({
          tenant_id: newTenant.id,
          month: currentMonth,
          year: currentYear,
          rent_amount: data.monthly_rent,
        });

        const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-IN', { month: 'long' });
        await supabase.from('activity_log').insert({
          tenant_id: newTenant.id,
          event_type: 'RENT_ADDED',
          description: `First month rent added for ${monthName} ${currentYear}: ₹${data.monthly_rent.toLocaleString('en-IN')}`,
          amount: data.monthly_rent,
        });
      }

      return newTenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ title: 'Tenant added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding tenant', description: error.message, variant: 'destructive' });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TenantFormData & { is_active: boolean }> }) => {
      // Get current tenant for logging
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('is_active, name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;

      // Log deactivation/reactivation
      if (currentTenant && data.is_active !== undefined && data.is_active !== currentTenant.is_active) {
        const eventType = data.is_active ? 'TENANT_REACTIVATED' : 'TENANT_DEACTIVATED';
        const description = data.is_active 
          ? `Tenant "${currentTenant.name}" reactivated`
          : `Tenant "${currentTenant.name}" deactivated`;
        
        await supabase.from('activity_log').insert({
          tenant_id: id,
          event_type: eventType,
          description,
          amount: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
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

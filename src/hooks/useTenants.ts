import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Member {
  name: string;
  phone: string;
  gender: string;
  occupation: string;
  aadhaar_pdf_url?: string;
  is_active?: boolean;
}

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
  aadhaar_back_image_url: string | null;
  members: Member[];
  discontinued_reason: string | null;
  discontinued_at: string | null;
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
  aadhaar_back_image_url?: string;
  members?: Member[];
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
      
      return (data || []).map(tenant => ({
        ...tenant,
        members: Array.isArray(tenant.members) ? tenant.members : 
                 (typeof tenant.members === 'string' ? JSON.parse(tenant.members) : [])
      })) as Tenant[];
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

      const shouldAddFirstRent = 
        joinedYear < currentYear || 
        (joinedYear === currentYear && joinedMonth <= currentMonth);

      const initialPending = shouldAddFirstRent ? data.monthly_rent : 0;

      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          landlord_id: user!.id,
          name: data.name,
          phone: data.phone,
          room_number: data.room_number,
          monthly_rent: data.monthly_rent,
          electricity_rate: data.electricity_rate,
          initial_meter_reading: data.initial_meter_reading,
          joining_date: data.joining_date,
          gender: data.gender,
          occupation: data.occupation,
          aadhaar_image_url: data.aadhaar_image_url,
          aadhaar_back_image_url: data.aadhaar_back_image_url,
          members: JSON.parse(JSON.stringify(data.members || [])),
          current_meter_reading: data.initial_meter_reading,
          pending_amount: initialPending,
        })
        .select()
        .single();
      
      if (error) throw error;

      const memberCount = data.members?.length || 0;
      const memberNames = data.members?.map(m => m.name).join(', ') || data.name;
      
      await supabase.from('activity_log').insert({
        tenant_id: newTenant.id,
        event_type: 'TENANT_CREATED',
        description: `Room ${data.room_number} created with ${memberCount > 0 ? memberCount : 1} member(s): ${memberNames}`,
        amount: null,
      });

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
      toast({ title: 'Room added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding room', description: error.message, variant: 'destructive' });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{
      name: string;
      phone: string;
      room_number: string;
      monthly_rent: number;
      electricity_rate: number;
      gender: string;
      occupation: string;
      is_active: boolean;
      discontinued_reason: string;
      discontinued_at: string;
    }> }) => {
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('is_active, name, room_number')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;

      if (currentTenant && data.is_active !== undefined && data.is_active !== currentTenant.is_active) {
        const eventType = data.is_active ? 'TENANT_REACTIVATED' : 'TENANT_DEACTIVATED';
        const description = data.is_active 
          ? `Room ${currentTenant.room_number} reactivated`
          : `Room ${currentTenant.room_number} vacated/discontinued${data.discontinued_reason ? ': ' + data.discontinued_reason : ''}`;
        
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
      toast({ title: 'Room updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating room', description: error.message, variant: 'destructive' });
    },
  });

  const updateMembers = useMutation({
    mutationFn: async ({ tenantId, members, action, memberName }: { 
      tenantId: string; 
      members: Member[];
      action: 'add' | 'edit' | 'discontinue';
      memberName: string;
    }) => {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('room_number, name')
        .eq('id', tenantId)
        .single();

      const activeMembers = members.filter(m => m.is_active !== false);
      const newName = activeMembers.map(m => m.name).join(' & ');

      const { error } = await supabase
        .from('tenants')
        .update({ 
          members: JSON.parse(JSON.stringify(members)),
          name: newName,
        })
        .eq('id', tenantId);
      
      if (error) throw error;

      let eventType = 'MEMBER_UPDATED';
      let description = '';

      if (action === 'add') {
        eventType = 'MEMBER_ADDED';
        description = `New member added to Room ${tenant?.room_number}: ${memberName}`;
      } else if (action === 'discontinue') {
        eventType = 'MEMBER_DISCONTINUED';
        description = `Member discontinued from Room ${tenant?.room_number}: ${memberName}`;
      } else {
        eventType = 'MEMBER_UPDATED';
        description = `Member details updated in Room ${tenant?.room_number}: ${memberName}`;
      }

      await supabase.from('activity_log').insert({
        tenant_id: tenantId,
        event_type: eventType,
        description,
        amount: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ title: 'Member updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating member', description: error.message, variant: 'destructive' });
    },
  });

  const applyConcession = useMutation({
    mutationFn: async ({ tenantId, amount, reason }: { 
      tenantId: string; 
      amount: number;
      reason: string;
    }) => {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('room_number, pending_amount')
        .eq('id', tenantId)
        .single();

      if (!tenant) throw new Error('Tenant not found');
      if (amount > tenant.pending_amount) throw new Error('Concession cannot exceed pending amount');

      const newPending = tenant.pending_amount - amount;

      const { error } = await supabase
        .from('tenants')
        .update({ pending_amount: newPending })
        .eq('id', tenantId);
      
      if (error) throw error;

      await supabase.from('activity_log').insert({
        tenant_id: tenantId,
        event_type: 'CONCESSION_APPLIED',
        description: `Concession of ₹${amount.toLocaleString('en-IN')} applied to Room ${tenant.room_number}: ${reason}`,
        amount: -amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast({ title: 'Concession applied successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error applying concession', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tenants: tenantsQuery.data ?? [],
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    addTenant,
    updateTenant,
    updateMembers,
    applyConcession,
    refetch: tenantsQuery.refetch,
  };
}

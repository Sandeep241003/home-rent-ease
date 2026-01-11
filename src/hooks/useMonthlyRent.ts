import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function useMonthlyRentSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const syncMonthlyRent = async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get all active tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, monthly_rent, pending_amount, joining_date')
        .eq('is_active', true);

      if (tenantsError || !tenants) return;

      for (const tenant of tenants) {
        // Check if tenant joined in current month or before
        const joiningDate = new Date(tenant.joining_date);
        const tenantJoinedThisMonth = 
          joiningDate.getFullYear() === currentYear && 
          joiningDate.getMonth() + 1 === currentMonth;
        const tenantJoinedBefore = joiningDate < new Date(currentYear, currentMonth - 1, 1);

        if (!tenantJoinedThisMonth && !tenantJoinedBefore) continue;

        // Check if rent already added for this month
        const { data: existingEntry } = await supabase
          .from('monthly_rent_entries')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (existingEntry) continue; // Already added

        // Add rent for this month
        const { error: insertError } = await supabase
          .from('monthly_rent_entries')
          .insert({
            tenant_id: tenant.id,
            month: currentMonth,
            year: currentYear,
            rent_amount: tenant.monthly_rent,
          });

        if (insertError) continue;

        // Update tenant pending amount
        await supabase
          .from('tenants')
          .update({
            pending_amount: (tenant.pending_amount || 0) + tenant.monthly_rent,
          })
          .eq('id', tenant.id);
      }

      // Refresh tenants data
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    };

    syncMonthlyRent();
  }, [user, queryClient]);
}

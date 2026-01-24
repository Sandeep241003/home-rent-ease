import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface Tenant {
  id: string;
  monthly_rent: number;
  pending_amount: number;
  extra_balance: number;
  joining_date: string;
  name: string;
}

export function useMonthlyRentSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const syncMonthlyRent = async () => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Normalize today to date only (midnight)
      const today = new Date(currentYear, now.getMonth(), currentDay);

      // Get all active tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, monthly_rent, pending_amount, extra_balance, joining_date, name')
        .eq('is_active', true);

      if (tenantsError || !tenants) return;

      for (const tenant of tenants as Tenant[]) {
        const joiningDate = new Date(tenant.joining_date);
        const joiningDay = joiningDate.getDate();
        const joiningMonth = joiningDate.getMonth() + 1;
        const joiningYear = joiningDate.getFullYear();
        
        // Normalize joining date to date only (midnight)
        const joiningDateNormalized = new Date(joiningYear, joiningDate.getMonth(), joiningDay);
        
        // If joining date is in the future, skip entirely
        if (joiningDateNormalized > today) {
          continue;
        }
        
        // Build list of all months that need rent entries (backfill logic)
        const monthsToProcess: { month: number; year: number }[] = [];
        
        let checkYear = joiningYear;
        let checkMonth = joiningMonth;

        while (
          checkYear < currentYear ||
          (checkYear === currentYear && checkMonth <= currentMonth)
        ) {
          // Handle months with fewer days (e.g., joining on 31st, but Feb has 28 days)
          const lastDayOfCheckMonth = new Date(checkYear, checkMonth, 0).getDate();
          const rentDayThisMonth = Math.min(joiningDay, lastDayOfCheckMonth);

          let shouldConsiderThisMonth = false;

          if (checkYear === joiningYear && checkMonth === joiningMonth) {
            // Joining month: only if we're past the joining date
            if (today >= joiningDateNormalized) {
              shouldConsiderThisMonth = true;
            }
          } else if (checkYear < currentYear || (checkYear === currentYear && checkMonth < currentMonth)) {
            // Past months: always consider (backfill)
            shouldConsiderThisMonth = true;
          } else if (checkYear === currentYear && checkMonth === currentMonth) {
            // Current month: only if today >= rent day
            if (currentDay >= rentDayThisMonth) {
              shouldConsiderThisMonth = true;
            }
          }

          if (shouldConsiderThisMonth) {
            monthsToProcess.push({ month: checkMonth, year: checkYear });
          }

          // Move to next month
          checkMonth++;
          if (checkMonth > 12) {
            checkMonth = 1;
            checkYear++;
          }
        }
        
        // Process each month that needs a rent entry
        for (const { month, year } of monthsToProcess) {
          // Check if rent already added for this month
          const { data: existingEntry } = await supabase
            .from('monthly_rent_entries')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('month', month)
            .eq('year', year)
            .maybeSingle();

          if (existingEntry) continue; // Already added

          // Get current tenant balances (may have changed from previous iterations)
          const { data: currentTenantData } = await supabase
            .from('tenants')
            .select('pending_amount, extra_balance')
            .eq('id', tenant.id)
            .single();

          if (!currentTenantData) continue;

          const monthlyRent = tenant.monthly_rent;
          const extraBalance = currentTenantData.extra_balance || 0;
          const currentPending = currentTenantData.pending_amount || 0;

          let newPending = currentPending;
          let newExtraBalance = extraBalance;
          let adjustedFromExtra = 0;

          // Apply extra balance first
          if (extraBalance >= monthlyRent) {
            // Extra balance covers full rent
            newExtraBalance = extraBalance - monthlyRent;
            adjustedFromExtra = monthlyRent;
          } else if (extraBalance > 0) {
            // Partial coverage from extra balance
            adjustedFromExtra = extraBalance;
            newPending = currentPending + (monthlyRent - extraBalance);
            newExtraBalance = 0;
          } else {
            // No extra balance, add full rent to pending
            newPending = currentPending + monthlyRent;
          }

          // Add rent entry
          const { error: insertError } = await supabase
            .from('monthly_rent_entries')
            .insert({
              tenant_id: tenant.id,
              month: month,
              year: year,
              rent_amount: monthlyRent,
            });

          if (insertError) continue;

          // Update tenant balances
          await supabase
            .from('tenants')
            .update({
              pending_amount: newPending,
              extra_balance: newExtraBalance,
            })
            .eq('id', tenant.id);

          // Log rent added
          const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
          await supabase.from('activity_log').insert({
            tenant_id: tenant.id,
            event_type: 'RENT_ADDED',
            description: `Monthly rent added for ${monthName} ${year}: ₹${monthlyRent.toLocaleString('en-IN')}`,
            amount: monthlyRent,
          });

          // Log extra balance adjustment if any
          if (adjustedFromExtra > 0) {
            await supabase.from('activity_log').insert({
              tenant_id: tenant.id,
              event_type: 'EXTRA_ADJUSTED',
              description: `Extra balance used for ${monthName} rent: ₹${adjustedFromExtra.toLocaleString('en-IN')} deducted from advance`,
              amount: -adjustedFromExtra,
            });
          }
        }
      }

      // Refresh tenants data
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    };

    syncMonthlyRent();
  }, [user, queryClient]);
}

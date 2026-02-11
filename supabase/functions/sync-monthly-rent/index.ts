import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Tenant {
  id: string;
  monthly_rent: number;
  pending_amount: number;
  extra_balance: number;
  joining_date: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log(`sync-monthly-rent invoked at ${new Date().toISOString()}`);
    
    // Use service role key for database operations (bypasses RLS for batch processing)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentDay = now.getUTCDate();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, monthly_rent, pending_amount, extra_balance, joining_date, name")
      .eq("is_active", true);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      return new Response(
        JSON.stringify({ error: tenantsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active tenants found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;
    const results: { tenantId: string; name: string; action: string }[] = [];

    for (const tenant of tenants as Tenant[]) {
      const joiningDate = new Date(tenant.joining_date);
      const joiningDay = joiningDate.getUTCDate();
      const joiningMonth = joiningDate.getUTCMonth() + 1;
      const joiningYear = joiningDate.getUTCFullYear();

      // Calculate which months need rent entries (backfill logic)
      const monthsToProcess: { month: number; year: number }[] = [];
      
      // Start from joining month/year
      let checkYear = joiningYear;
      let checkMonth = joiningMonth;

      while (
        checkYear < currentYear ||
        (checkYear === currentYear && checkMonth <= currentMonth)
      ) {
        // For the joining month, only add if today >= joining day
        // For subsequent months, check if we've reached the rent day
        const lastDayOfCheckMonth = new Date(checkYear, checkMonth, 0).getUTCDate();
        const rentDayThisMonth = Math.min(joiningDay, lastDayOfCheckMonth);

        let shouldConsiderThisMonth = false;

        if (checkYear === joiningYear && checkMonth === joiningMonth) {
          // Joining month: only if we're past the joining date
          if (
            currentYear > joiningYear ||
            (currentYear === joiningYear && currentMonth > joiningMonth) ||
            (currentYear === joiningYear && currentMonth === joiningMonth && currentDay >= joiningDay)
          ) {
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
        // Check if rent already exists for this month
        const { data: existingEntry } = await supabase
          .from("monthly_rent_entries")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();

        if (existingEntry) continue; // Already exists, skip

        // Get current tenant balances (may have changed from previous iterations)
        const { data: currentTenant } = await supabase
          .from("tenants")
          .select("pending_amount, extra_balance")
          .eq("id", tenant.id)
          .single();

        if (!currentTenant) continue;

        const monthlyRent = tenant.monthly_rent;
        const extraBalance = currentTenant.extra_balance || 0;
        const currentPending = currentTenant.pending_amount || 0;

        let newPending = currentPending;
        let newExtraBalance = extraBalance;
        let adjustedFromExtra = 0;

        // Apply extra balance first
        if (extraBalance >= monthlyRent) {
          newExtraBalance = extraBalance - monthlyRent;
          adjustedFromExtra = monthlyRent;
        } else if (extraBalance > 0) {
          adjustedFromExtra = extraBalance;
          newPending = currentPending + (monthlyRent - extraBalance);
          newExtraBalance = 0;
        } else {
          newPending = currentPending + monthlyRent;
        }

        // Insert rent entry
        const { error: insertError } = await supabase
          .from("monthly_rent_entries")
          .insert({
            tenant_id: tenant.id,
            month: month,
            year: year,
            rent_amount: monthlyRent,
          });

        if (insertError) {
          console.error(`Error inserting rent for tenant ${tenant.id}:`, insertError);
          continue;
        }

        // Update tenant balances
        await supabase
          .from("tenants")
          .update({
            pending_amount: newPending,
            extra_balance: newExtraBalance,
          })
          .eq("id", tenant.id);

        // Log rent added
        const monthName = new Date(year, month - 1).toLocaleString("en-IN", { month: "long" });
        await supabase.from("activity_log").insert({
          tenant_id: tenant.id,
          event_type: "RENT_ADDED",
          description: `Monthly rent added for ${monthName} ${year}: ₹${monthlyRent.toLocaleString("en-IN")}`,
          amount: monthlyRent,
        });

        // Log extra balance adjustment if any
        if (adjustedFromExtra > 0) {
          await supabase.from("activity_log").insert({
            tenant_id: tenant.id,
            event_type: "EXTRA_ADJUSTED",
            description: `Extra balance used for ${monthName} rent: ₹${adjustedFromExtra.toLocaleString("en-IN")} deducted from advance`,
            amount: -adjustedFromExtra,
          });
        }

        processedCount++;
        results.push({
          tenantId: tenant.id,
          name: tenant.name,
          action: `Rent added for ${monthName} ${year}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} rent entries`,
        processed: processedCount,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sync-monthly-rent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

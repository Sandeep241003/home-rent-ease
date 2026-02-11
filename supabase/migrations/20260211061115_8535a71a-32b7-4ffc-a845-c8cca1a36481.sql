-- Add unique constraint on monthly_rent_entries to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_tenant_month_year'
  ) THEN
    ALTER TABLE public.monthly_rent_entries 
    ADD CONSTRAINT unique_tenant_month_year UNIQUE (tenant_id, month, year);
  END IF;
END $$;

-- Enable pg_cron and pg_net extensions for scheduled function calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
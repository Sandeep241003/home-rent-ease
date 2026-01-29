-- Add reversal columns to monthly_rent_entries table
ALTER TABLE public.monthly_rent_entries 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Add reversal columns to electricity_readings table
ALTER TABLE public.electricity_readings 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Add index for efficient filtering of non-reversed entries
CREATE INDEX IF NOT EXISTS idx_monthly_rent_entries_not_reversed 
ON public.monthly_rent_entries (is_reversed) WHERE is_reversed = false;

CREATE INDEX IF NOT EXISTS idx_electricity_readings_not_reversed 
ON public.electricity_readings (is_reversed) WHERE is_reversed = false;
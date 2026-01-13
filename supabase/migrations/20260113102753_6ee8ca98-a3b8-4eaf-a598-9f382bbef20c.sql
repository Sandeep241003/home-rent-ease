-- Add members JSONB column for storing 1-2 members per room
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb;

-- Add aadhaar back image URL (front is already aadhaar_image_url)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS aadhaar_back_image_url text;

-- Add payment reason and custom payment date to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_reason text NOT NULL DEFAULT 'Rent';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reason_notes text;

-- Add discontinued reason to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS discontinued_reason text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS discontinued_at timestamp with time zone;
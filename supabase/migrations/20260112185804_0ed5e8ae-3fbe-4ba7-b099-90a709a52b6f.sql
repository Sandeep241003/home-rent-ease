-- Add extra_balance to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS extra_balance numeric NOT NULL DEFAULT 0;

-- Add gender, occupation, aadhaar_image_url to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS aadhaar_image_url text;

-- Create activity_log table for complete history
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  amount numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_log
CREATE POLICY "Landlord can view activity logs"
ON public.activity_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = activity_log.tenant_id
  AND tenants.landlord_id = auth.uid()
));

CREATE POLICY "Landlord can insert activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = activity_log.tenant_id
  AND tenants.landlord_id = auth.uid()
));

-- Create storage bucket for aadhaar images
INSERT INTO storage.buckets (id, name, public) VALUES ('aadhaar-images', 'aadhaar-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for aadhaar images (landlord only)
CREATE POLICY "Landlord can upload aadhaar images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'aadhaar-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Landlord can view aadhaar images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'aadhaar-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Landlord can delete aadhaar images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'aadhaar-images' AND auth.uid()::text = (storage.foldername(name))[1]);
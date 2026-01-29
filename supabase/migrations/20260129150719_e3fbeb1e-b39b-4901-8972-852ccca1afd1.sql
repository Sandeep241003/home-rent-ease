-- Add reversal tracking columns to payments table
ALTER TABLE public.payments 
ADD COLUMN is_reversed boolean NOT NULL DEFAULT false,
ADD COLUMN reversed_at timestamp with time zone,
ADD COLUMN reversal_reason text;

-- Add index for filtering reversed payments
CREATE INDEX idx_payments_is_reversed ON public.payments(is_reversed);
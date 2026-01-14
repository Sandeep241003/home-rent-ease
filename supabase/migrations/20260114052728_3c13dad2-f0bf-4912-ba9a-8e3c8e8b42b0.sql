-- Add paid_by column to payments table for tracking which member paid
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.payments.paid_by IS 'Name of the member who made the payment';
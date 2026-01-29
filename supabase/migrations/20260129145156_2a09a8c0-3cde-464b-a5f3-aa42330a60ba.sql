-- Add UPDATE and DELETE RLS policies for payments table
CREATE POLICY "Landlord can update payments"
ON public.payments
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = payments.tenant_id 
  AND tenants.landlord_id = auth.uid()
));

CREATE POLICY "Landlord can delete payments"
ON public.payments
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = payments.tenant_id 
  AND tenants.landlord_id = auth.uid()
));

-- Add UPDATE and DELETE RLS policies for electricity_readings table
CREATE POLICY "Landlord can update electricity readings"
ON public.electricity_readings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = electricity_readings.tenant_id 
  AND tenants.landlord_id = auth.uid()
));

CREATE POLICY "Landlord can delete electricity readings"
ON public.electricity_readings
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tenants
  WHERE tenants.id = electricity_readings.tenant_id 
  AND tenants.landlord_id = auth.uid()
));
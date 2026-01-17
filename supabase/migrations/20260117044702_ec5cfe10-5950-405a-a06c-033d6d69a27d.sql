-- Add missing UPDATE and DELETE policies for monthly_rent_entries
CREATE POLICY "Landlord can update rent entries" 
ON public.monthly_rent_entries 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM tenants
  WHERE ((tenants.id = monthly_rent_entries.tenant_id) AND (tenants.landlord_id = auth.uid()))));

CREATE POLICY "Landlord can delete rent entries" 
ON public.monthly_rent_entries 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM tenants
  WHERE ((tenants.id = monthly_rent_entries.tenant_id) AND (tenants.landlord_id = auth.uid()))));
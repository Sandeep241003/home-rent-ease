
-- Drop ALL existing policies (they are RESTRICTIVE which blocks access)

-- tenants
DROP POLICY IF EXISTS "Allow all select on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all insert on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all update on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all delete on tenants" ON public.tenants;

-- payments
DROP POLICY IF EXISTS "Allow all select on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all insert on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all update on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all delete on payments" ON public.payments;

-- activity_log
DROP POLICY IF EXISTS "Allow all select on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all insert on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all update on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all delete on activity_log" ON public.activity_log;

-- monthly_rent_entries
DROP POLICY IF EXISTS "Allow all select on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all insert on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all update on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all delete on monthly_rent_entries" ON public.monthly_rent_entries;

-- electricity_readings
DROP POLICY IF EXISTS "Allow all select on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all insert on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all update on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all delete on electricity_readings" ON public.electricity_readings;

-- profiles
DROP POLICY IF EXISTS "Allow all select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all update on profiles" ON public.profiles;

-- Recreate as PERMISSIVE with auth requirement

-- tenants: landlord must be authenticated and own the data
CREATE POLICY "Authenticated users can select tenants" ON public.tenants FOR SELECT USING (auth.uid() = landlord_id);
CREATE POLICY "Authenticated users can insert tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Authenticated users can update tenants" ON public.tenants FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Authenticated users can delete tenants" ON public.tenants FOR DELETE USING (auth.uid() = landlord_id);

-- payments: auth required, linked through tenant ownership
CREATE POLICY "Authenticated select payments" ON public.payments FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated insert payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated update payments" ON public.payments FOR UPDATE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated delete payments" ON public.payments FOR DELETE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid()));

-- activity_log
CREATE POLICY "Authenticated select activity_log" ON public.activity_log FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = activity_log.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated insert activity_log" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = activity_log.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated update activity_log" ON public.activity_log FOR UPDATE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = activity_log.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated delete activity_log" ON public.activity_log FOR DELETE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = activity_log.tenant_id AND tenants.landlord_id = auth.uid()));

-- monthly_rent_entries
CREATE POLICY "Authenticated select monthly_rent_entries" ON public.monthly_rent_entries FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated insert monthly_rent_entries" ON public.monthly_rent_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated update monthly_rent_entries" ON public.monthly_rent_entries FOR UPDATE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated delete monthly_rent_entries" ON public.monthly_rent_entries FOR DELETE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid()));

-- electricity_readings
CREATE POLICY "Authenticated select electricity_readings" ON public.electricity_readings FOR SELECT USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated insert electricity_readings" ON public.electricity_readings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated update electricity_readings" ON public.electricity_readings FOR UPDATE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid()));
CREATE POLICY "Authenticated delete electricity_readings" ON public.electricity_readings FOR DELETE USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid()));

-- profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Ensure the trigger for auto-creating profiles on signup exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

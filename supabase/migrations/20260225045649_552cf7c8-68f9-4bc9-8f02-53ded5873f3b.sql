
-- Drop all existing RLS policies and replace with open access policies
-- TENANTS
DROP POLICY IF EXISTS "Landlord can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Landlord can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Landlord can update own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Landlord can delete own tenants" ON public.tenants;

CREATE POLICY "Allow all select on tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Allow all insert on tenants" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on tenants" ON public.tenants FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on tenants" ON public.tenants FOR DELETE USING (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Landlord can view payments" ON public.payments;
DROP POLICY IF EXISTS "Landlord can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Landlord can update payments" ON public.payments;
DROP POLICY IF EXISTS "Landlord can delete payments" ON public.payments;

CREATE POLICY "Allow all select on payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow all insert on payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on payments" ON public.payments FOR DELETE USING (true);

-- MONTHLY_RENT_ENTRIES
DROP POLICY IF EXISTS "Landlord can view rent entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Landlord can insert rent entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Landlord can update rent entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Landlord can delete rent entries" ON public.monthly_rent_entries;

CREATE POLICY "Allow all select on monthly_rent_entries" ON public.monthly_rent_entries FOR SELECT USING (true);
CREATE POLICY "Allow all insert on monthly_rent_entries" ON public.monthly_rent_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on monthly_rent_entries" ON public.monthly_rent_entries FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on monthly_rent_entries" ON public.monthly_rent_entries FOR DELETE USING (true);

-- ELECTRICITY_READINGS
DROP POLICY IF EXISTS "Landlord can view electricity readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Landlord can insert electricity readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Landlord can update electricity readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Landlord can delete electricity readings" ON public.electricity_readings;

CREATE POLICY "Allow all select on electricity_readings" ON public.electricity_readings FOR SELECT USING (true);
CREATE POLICY "Allow all insert on electricity_readings" ON public.electricity_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on electricity_readings" ON public.electricity_readings FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on electricity_readings" ON public.electricity_readings FOR DELETE USING (true);

-- ACTIVITY_LOG
DROP POLICY IF EXISTS "Landlord can view activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Landlord can insert activity logs" ON public.activity_log;

CREATE POLICY "Allow all select on activity_log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Allow all insert on activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on activity_log" ON public.activity_log FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on activity_log" ON public.activity_log FOR DELETE USING (true);

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Allow all select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on profiles" ON public.profiles FOR UPDATE USING (true);

-- STORAGE: Update aadhaar-images bucket policies
DROP POLICY IF EXISTS "Landlord can upload aadhaar images" ON storage.objects;
DROP POLICY IF EXISTS "Landlord can view aadhaar images" ON storage.objects;
DROP POLICY IF EXISTS "Landlord can delete aadhaar images" ON storage.objects;
DROP POLICY IF EXISTS "Landlord can update aadhaar images" ON storage.objects;

CREATE POLICY "Allow all access to aadhaar images" ON storage.objects FOR ALL USING (bucket_id = 'aadhaar-images') WITH CHECK (bucket_id = 'aadhaar-images');

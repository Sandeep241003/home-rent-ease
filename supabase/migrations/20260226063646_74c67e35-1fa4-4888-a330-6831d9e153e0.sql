
-- Drop all restrictive policies and recreate as permissive

-- tenants
DROP POLICY IF EXISTS "Allow all select on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all insert on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all update on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all delete on tenants" ON public.tenants;

CREATE POLICY "Allow all select on tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Allow all insert on tenants" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on tenants" ON public.tenants FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on tenants" ON public.tenants FOR DELETE USING (true);

-- payments
DROP POLICY IF EXISTS "Allow all select on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all insert on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all update on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all delete on payments" ON public.payments;

CREATE POLICY "Allow all select on payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow all insert on payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on payments" ON public.payments FOR DELETE USING (true);

-- activity_log
DROP POLICY IF EXISTS "Allow all select on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all insert on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all update on activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all delete on activity_log" ON public.activity_log;

CREATE POLICY "Allow all select on activity_log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Allow all insert on activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on activity_log" ON public.activity_log FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on activity_log" ON public.activity_log FOR DELETE USING (true);

-- monthly_rent_entries
DROP POLICY IF EXISTS "Allow all select on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all insert on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all update on monthly_rent_entries" ON public.monthly_rent_entries;
DROP POLICY IF EXISTS "Allow all delete on monthly_rent_entries" ON public.monthly_rent_entries;

CREATE POLICY "Allow all select on monthly_rent_entries" ON public.monthly_rent_entries FOR SELECT USING (true);
CREATE POLICY "Allow all insert on monthly_rent_entries" ON public.monthly_rent_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on monthly_rent_entries" ON public.monthly_rent_entries FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on monthly_rent_entries" ON public.monthly_rent_entries FOR DELETE USING (true);

-- electricity_readings
DROP POLICY IF EXISTS "Allow all select on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all insert on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all update on electricity_readings" ON public.electricity_readings;
DROP POLICY IF EXISTS "Allow all delete on electricity_readings" ON public.electricity_readings;

CREATE POLICY "Allow all select on electricity_readings" ON public.electricity_readings FOR SELECT USING (true);
CREATE POLICY "Allow all insert on electricity_readings" ON public.electricity_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on electricity_readings" ON public.electricity_readings FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on electricity_readings" ON public.electricity_readings FOR DELETE USING (true);

-- profiles
DROP POLICY IF EXISTS "Allow all select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all update on profiles" ON public.profiles;

CREATE POLICY "Allow all select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on profiles" ON public.profiles FOR UPDATE USING (true);

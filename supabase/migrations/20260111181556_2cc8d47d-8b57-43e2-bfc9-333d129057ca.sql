-- Create profiles table for landlord
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_landlord BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  room_number TEXT NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL DEFAULT 0,
  electricity_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  initial_meter_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_meter_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create monthly rent entries table (to prevent duplicate rent per month)
CREATE TABLE public.monthly_rent_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, month, year)
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank')),
  payment_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create electricity readings table
CREATE TABLE public.electricity_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  previous_reading DECIMAL(10,2) NOT NULL,
  current_reading DECIMAL(10,2) NOT NULL,
  units_consumed DECIMAL(10,2) NOT NULL,
  rate_per_unit DECIMAL(10,2) NOT NULL,
  bill_amount DECIMAL(10,2) NOT NULL,
  reading_date DATE DEFAULT CURRENT_DATE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rent_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (landlord can only see own profile)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for tenants (landlord can manage their tenants)
CREATE POLICY "Landlord can view own tenants" ON public.tenants
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlord can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlord can update own tenants" ON public.tenants
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Landlord can delete own tenants" ON public.tenants
  FOR DELETE USING (auth.uid() = landlord_id);

-- RLS Policies for monthly_rent_entries
CREATE POLICY "Landlord can view rent entries" ON public.monthly_rent_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid())
  );

CREATE POLICY "Landlord can insert rent entries" ON public.monthly_rent_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = monthly_rent_entries.tenant_id AND tenants.landlord_id = auth.uid())
  );

-- RLS Policies for payments
CREATE POLICY "Landlord can view payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid())
  );

CREATE POLICY "Landlord can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = payments.tenant_id AND tenants.landlord_id = auth.uid())
  );

-- RLS Policies for electricity_readings
CREATE POLICY "Landlord can view electricity readings" ON public.electricity_readings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid())
  );

CREATE POLICY "Landlord can insert electricity readings" ON public.electricity_readings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = electricity_readings.tenant_id AND tenants.landlord_id = auth.uid())
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on tenants
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
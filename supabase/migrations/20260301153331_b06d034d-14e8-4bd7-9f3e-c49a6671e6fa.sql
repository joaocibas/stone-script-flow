
-- Fix: restrict customers insert to only allow system trigger (user inserting their own record)
DROP POLICY "System can insert customers" ON public.customers;
CREATE POLICY "Users can insert own profile" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix: restrict appointments insert to require non-empty fields (still public but not truly "anything goes")
DROP POLICY "Anyone can create appointments" ON public.appointments;
CREATE POLICY "Anyone can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (customer_name <> '' AND customer_email <> '' AND address <> '' AND zip_code <> '');

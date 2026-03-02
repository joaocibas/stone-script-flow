
-- 1. Add soft delete and notes columns to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Update customers RLS: replace admin SELECT-only with full ALL
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;

CREATE POLICY "Admins full access to customers"
ON public.customers FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Sales can view all customers
CREATE POLICY "Sales can view all customers"
ON public.customers FOR SELECT
USING (has_role(auth.uid(), 'sales'));

-- 4. Sales can insert customers
CREATE POLICY "Sales can insert customers"
ON public.customers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'sales'));

-- 5. Sales can update customers
CREATE POLICY "Sales can update customers"
ON public.customers FOR UPDATE
USING (has_role(auth.uid(), 'sales'));

-- 6. Sales policies for related tables
CREATE POLICY "Sales can manage quotes"
ON public.quotes FOR ALL
USING (has_role(auth.uid(), 'sales'))
WITH CHECK (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can manage appointments"
ON public.appointments FOR ALL
USING (has_role(auth.uid(), 'sales'))
WITH CHECK (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can view orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can view materials"
ON public.materials FOR SELECT
USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can view slabs"
ON public.slabs FOR SELECT
USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can view reservations"
ON public.reservations FOR SELECT
USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can view availability"
ON public.admin_availability FOR SELECT
USING (has_role(auth.uid(), 'sales'));

-- 7. Default existing users without roles to 'customer'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT DO NOTHING;

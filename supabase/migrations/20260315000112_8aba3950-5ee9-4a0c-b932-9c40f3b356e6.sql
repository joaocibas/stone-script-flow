
-- Estimates table
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  estimate_number text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,
  customer_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  billing_address text,
  project_address text,
  material text,
  color text,
  finish text,
  edge_profile text,
  scope_of_work text,
  measurements_sqft numeric,
  labor_cost numeric DEFAULT 0,
  material_cost numeric DEFAULT 0,
  addons_cost numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  deposit_required numeric DEFAULT 0,
  notes text,
  terms_conditions text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment orders table
CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  payment_order_number text NOT NULL DEFAULT '',
  estimate_total numeric DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  remaining_balance numeric DEFAULT 0,
  customer_name text NOT NULL DEFAULT '',
  customer_email text,
  payment_method text,
  payment_link text,
  due_date date,
  payment_notes text,
  internal_notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payments table (for recording individual payments / deposits)
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  payment_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  transaction_reference text,
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Receipts table (partial and final)
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  payment_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  receipt_number text NOT NULL DEFAULT '',
  receipt_type text NOT NULL DEFAULT 'partial',
  date date NOT NULL DEFAULT CURRENT_DATE,
  received_from text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  transaction_reference text,
  remaining_balance numeric DEFAULT 0,
  description text,
  notes text,
  company_info text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
CREATE POLICY "Admins can manage estimates" ON public.estimates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales can view estimates" ON public.estimates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));
CREATE POLICY "Sales can manage estimates" ON public.estimates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'sales'));
CREATE POLICY "Sales can update estimates" ON public.estimates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Admins can manage payment_orders" ON public.payment_orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales can view payment_orders" ON public.payment_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales can view payments" ON public.payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Admins can manage receipts" ON public.receipts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sales can view receipts" ON public.receipts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

-- Update triggers
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON public.payment_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

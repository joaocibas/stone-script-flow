
-- Create leads table for estimator lead capture
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  city text NOT NULL,
  project_type text NOT NULL,
  company_name text,
  timeline text,
  preferred_contact_method text,
  notes text,
  status text NOT NULL DEFAULT 'new_lead',
  quote_id uuid REFERENCES public.quotes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a lead (public form)
CREATE POLICY "Anyone can create leads" ON public.leads
  FOR INSERT TO public
  WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins full access to leads" ON public.leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Sales can view and update leads
CREATE POLICY "Sales can view leads" ON public.leads
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'sales'));

CREATE POLICY "Sales can update leads" ON public.leads
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'sales'));

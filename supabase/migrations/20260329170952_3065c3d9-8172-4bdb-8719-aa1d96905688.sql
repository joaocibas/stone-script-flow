
-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Other',
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Only admins can manage expenses
CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add payment_method and confirmation columns to payments if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='confirmed_by') THEN
    ALTER TABLE public.payments ADD COLUMN confirmed_by TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='paid_at') THEN
    ALTER TABLE public.payments ADD COLUMN paid_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Create receipt-uploads storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-uploads', 'receipt-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for receipt-uploads bucket: only admins
CREATE POLICY "Admins can upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipt-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipt-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipt-uploads' AND public.has_role(auth.uid(), 'admin'));

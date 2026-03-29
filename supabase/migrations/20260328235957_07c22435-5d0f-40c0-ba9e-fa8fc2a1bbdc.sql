
CREATE TABLE public.stripe_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'custom',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stripe_payments"
  ON public.stripe_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view own stripe_payments"
  ON public.stripe_payments FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

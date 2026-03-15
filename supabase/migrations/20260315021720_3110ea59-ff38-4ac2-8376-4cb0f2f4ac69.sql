
-- Allow customers to view estimates linked to their orders
CREATE POLICY "Customers can view own estimates"
ON public.estimates FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE c.user_id = auth.uid()
  )
);

-- Allow customers to view receipts linked to their orders
CREATE POLICY "Customers can view own receipts"
ON public.receipts FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE c.user_id = auth.uid()
  )
);

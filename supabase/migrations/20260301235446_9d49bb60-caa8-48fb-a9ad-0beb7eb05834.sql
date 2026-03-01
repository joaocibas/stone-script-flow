
ALTER TABLE public.slabs
ADD COLUMN purchase_value numeric DEFAULT 0,
ADD COLUMN sales_value numeric DEFAULT 0;

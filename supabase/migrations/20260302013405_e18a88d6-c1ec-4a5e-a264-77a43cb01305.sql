
-- Pivot table: which services are assigned to each slab
CREATE TABLE public.slab_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slab_id UUID NOT NULL REFERENCES public.slabs(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.service_items(id) ON DELETE CASCADE,
  override_cost NUMERIC NULL,
  override_multiplier NUMERIC NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slab_id, service_id)
);

-- Enable RLS
ALTER TABLE public.slab_services ENABLE ROW LEVEL SECURITY;

-- Only admins can manage slab service assignments
CREATE POLICY "Only admins can manage slab_services"
  ON public.slab_services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

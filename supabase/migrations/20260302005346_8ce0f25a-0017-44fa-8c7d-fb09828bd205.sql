
-- Create enum for pricing unit types
CREATE TYPE public.pricing_unit AS ENUM (
  'fixed',
  'per_sqft',
  'per_linear_ft',
  'per_cutout',
  'per_project'
);

-- Create enum for service categories
CREATE TYPE public.service_category AS ENUM (
  'labor',
  'edge_profile',
  'cutout',
  'fabrication',
  'addon'
);

-- Create service_items table
CREATE TABLE public.service_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category service_category NOT NULL,
  pricing_unit pricing_unit NOT NULL DEFAULT 'fixed',
  cost_value NUMERIC NOT NULL DEFAULT 0,
  min_value NUMERIC NULL,
  max_value NUMERIC NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

-- Admin-only access (internal pricing data)
CREATE POLICY "Only admins can manage service items"
  ON public.service_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_service_items_updated_at
  BEFORE UPDATE ON public.service_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

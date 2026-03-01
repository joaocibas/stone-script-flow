
-- Storage bucket for customer layout uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('layout-uploads', 'layout-uploads', false);

-- Allow authenticated users to upload their own layouts
CREATE POLICY "Users can upload layouts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'layout-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own uploads
CREATE POLICY "Users can view own layouts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'layout-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all layouts
CREATE POLICY "Admins can view all layouts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'layout-uploads' AND public.has_role(auth.uid(), 'admin'));

-- Users can delete own layouts
CREATE POLICY "Users can delete own layouts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'layout-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Estimator engine settings (admin-only internal pricing)
INSERT INTO public.business_settings (key, value, description) VALUES
  ('internal_price_per_sqft', '45', 'Internal cost per square foot (admin-only, never exposed)'),
  ('estimated_fabrication_avg', '500', 'Estimated average fabrication cost (admin-only)'),
  ('estimated_addon_avg', '300', 'Estimated average add-on cost (admin-only)'),
  ('lower_buffer_pct', '8', 'Lower buffer % for conservative smart range'),
  ('upper_buffer_pct', '18', 'Upper buffer % for conservative smart range'),
  ('slab_standard_max_sqft', '45', 'Max sq ft for Standard slab category'),
  ('slab_jumbo_max_sqft', '55', 'Max sq ft for Jumbo slab category'),
  ('slab_super_jumbo_max_sqft', '65', 'Max sq ft for Super Jumbo slab category')
ON CONFLICT (key) DO NOTHING;

-- Add unique constraint on business_settings.key if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_settings_key_unique'
  ) THEN
    ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- Add layout_url column to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS layout_url text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS reference_measurement_inches numeric;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS calculated_sqft numeric;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS slabs_needed integer;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS slab_category text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS range_min numeric;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS range_max numeric;

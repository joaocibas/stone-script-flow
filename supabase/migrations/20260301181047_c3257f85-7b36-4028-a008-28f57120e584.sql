
-- Create storage bucket for slab images
INSERT INTO storage.buckets (id, name, public) VALUES ('slab-images', 'slab-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view slab images (public bucket)
CREATE POLICY "Public can view slab images"
ON storage.objects FOR SELECT
USING (bucket_id = 'slab-images');

-- Allow admins to upload slab images
CREATE POLICY "Admins can upload slab images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slab-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update slab images
CREATE POLICY "Admins can update slab images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'slab-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete slab images
CREATE POLICY "Admins can delete slab images"
ON storage.objects FOR DELETE
USING (bucket_id = 'slab-images' AND public.has_role(auth.uid(), 'admin'));

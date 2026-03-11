ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS gallery_image_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;
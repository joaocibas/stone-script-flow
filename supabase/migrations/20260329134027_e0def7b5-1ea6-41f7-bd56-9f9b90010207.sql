
-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'kitchen',
  material TEXT NOT NULL DEFAULT 'quartz',
  color_style TEXT,
  city TEXT NOT NULL DEFAULT 'Sarasota',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  schema_data JSONB DEFAULT '{}'::jsonb,
  social_posted_fb BOOLEAN DEFAULT false,
  social_posted_ig BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project images table
CREATE TABLE public.project_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  image_title TEXT,
  caption TEXT,
  is_before BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- RLS: Admins manage projects
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Anyone can view published projects
CREATE POLICY "Anyone can view published projects" ON public.projects FOR SELECT TO public
  USING (status = 'published');

-- RLS: Admins manage project_images
CREATE POLICY "Admins can manage project_images" ON public.project_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Anyone can view images of published projects
CREATE POLICY "Anyone can view published project images" ON public.project_images FOR SELECT TO public
  USING (project_id IN (SELECT id FROM public.projects WHERE status = 'published'));

-- Storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- Storage RLS: Admins can upload
CREATE POLICY "Admins can upload portfolio images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS: Anyone can view
CREATE POLICY "Anyone can view portfolio images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'portfolio-images');

-- Storage RLS: Admins can delete
CREATE POLICY "Admins can delete portfolio images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio-images' AND public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

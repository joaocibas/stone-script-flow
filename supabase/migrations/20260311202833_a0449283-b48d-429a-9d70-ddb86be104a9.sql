
-- Replace overly permissive insert policy with validated one
DROP POLICY "Anyone can create leads" ON public.leads;
CREATE POLICY "Anyone can create leads with valid data" ON public.leads
  FOR INSERT TO public
  WITH CHECK (
    full_name <> '' AND phone <> '' AND email <> '' AND city <> '' AND project_type <> ''
  );

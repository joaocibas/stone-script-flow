CREATE POLICY "Anon can create leads"
ON public.leads FOR INSERT
TO anon
WITH CHECK (
  full_name <> '' AND phone <> '' AND email <> '' AND city <> '' AND project_type <> ''
);
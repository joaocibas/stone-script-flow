
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legal documents"
  ON public.legal_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view legal documents"
  ON public.legal_documents FOR SELECT
  TO public
  USING (true);

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 6 document types
INSERT INTO public.legal_documents (type, title) VALUES
  ('terms_conditions', 'Terms and Conditions'),
  ('privacy_policy', 'Privacy Policy'),
  ('installation_agreement', 'Installation Agreement'),
  ('warranty_policy', 'Warranty Policy'),
  ('cancellation_refund', 'Cancellation and Refund Policy'),
  ('lien_waiver', 'Lien Waiver');

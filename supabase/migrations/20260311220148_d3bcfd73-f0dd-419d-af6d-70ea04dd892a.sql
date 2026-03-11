
-- Table to store per-lead and per-appointment AI analysis results
CREATE TABLE public.lead_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  analysis_type text NOT NULL DEFAULT 'lead_qualification',
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_ref CHECK (lead_id IS NOT NULL OR appointment_id IS NOT NULL)
);

ALTER TABLE public.lead_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage lead analyses"
  ON public.lead_ai_analyses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sales can view lead analyses"
  ON public.lead_ai_analyses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'sales'));

-- Add AI analysis settings
INSERT INTO public.business_settings (key, value, description) VALUES
  ('feature_ai_lead_analysis', 'true', 'Enable AI analysis for leads and appointments'),
  ('ai_auto_analyze_leads', 'false', 'Automatically run AI analysis when a new lead is created'),
  ('ai_auto_analyze_appointments', 'false', 'Automatically run AI analysis when an appointment is scheduled')
ON CONFLICT (key) DO NOTHING;


-- Admin availability table
CREATE TABLE public.admin_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  specific_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability"
  ON public.admin_availability FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view availability"
  ON public.admin_availability FOR SELECT
  USING (is_available = true);

-- SLA events table
CREATE TABLE public.sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sla_events"
  ON public.sla_events FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- SLA alerts table
CREATE TABLE public.sla_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  breach_type text NOT NULL,
  breached_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz
);

ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sla_alerts"
  ON public.sla_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add reservation_id to appointments
ALTER TABLE public.appointments
  ADD COLUMN reservation_id uuid REFERENCES public.reservations(id);

-- Seed default weekly availability (Mon-Fri 9am-5pm)
INSERT INTO public.admin_availability (day_of_week, start_time, end_time, is_available) VALUES
  (1, '09:00', '17:00', true),
  (2, '09:00', '17:00', true),
  (3, '09:00', '17:00', true),
  (4, '09:00', '17:00', true),
  (5, '09:00', '17:00', true),
  (0, '09:00', '17:00', false),
  (6, '09:00', '17:00', false);
